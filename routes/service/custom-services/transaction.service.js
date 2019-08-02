const express = require('express');
const axios = require('axios');
const moment = require('moment');
const router = express.Router();
const differenceInMonths = require('date-fns/difference_in_months');
const endOfMonth = require('date-fns/end_of_month');
const endOfWeek = require('date-fns/end_of_week');
const endOfQuarter = require('date-fns/end_of_quarter');
const endOfYear = require('date-fns/end_of_year');
const startOfWeek = require('date-fns/start_of_week');
const startOfMonth = require('date-fns/start_of_week');
const startOfQuarter = require('date-fns/start_of_quarter');
const differenceInDays = require('date-fns/difference_in_days');
const lastDayOfMonth = require('date-fns/last_day_of_month');
const isPast = require('date-fns/is_past');
const getDaysInMonth = require('date-fns/get_days_in_month');
const isLeapYear = require('date-fns/is_leap_year');
const differenceInCalendarMonths = require('date-fns/difference_in_calendar_months');
const differenceInCalendarYears = require('date-fns/difference_in_calendar_years');
const addMonths = require('date-fns/add_months');
const isSameMonth = require('date-fns/is_same_month');
var differenceInCalendarDays = require('date-fns/difference_in_calendar_days');

//re.role_name as review_role_name,po.role_name as post_role_name,
// left join user_roles re on a.roleId = re.id
//     left join user_roles po on a.roleId = po.id
//     left join users u on u.ID = a.approvedBy

router.get('/get-txn-user-roles/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT t.ID,t.txn_date,t.description,t.amount,u.fullname, t.isDeny,
    t.is_credit,t.ref_no,a.ID as approvalId,a.*,r.role_name, r.id as roleId,ut.user_role as userViewRole,
    a.ID as txnApprovadId FROM investment_txns t
    left join investments i on i.ID = t.investmentId
    left join investment_op_approvals a on a.txnId = t.ID
    left join user_roles r on a.roleId = r.id
    left join users u on u.ID = a.approvedBy
    left join users ut on ut.ID = ${req.query.userId}
    WHERE a.txnId = ${req.params.id} AND a.method = ${req.query.method}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send(response.data);
    }, err => {
        res.send({
            status: 500,
            error: err,
            response: null
        });
    })
});

router.get('/get-product-configs/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT v.ID as investmentId, v.amount,p.* FROM investments v
    left join investment_products p on p.ID = v.productId
    WHERE v.ID =${req.params.id}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send(response.data);
    }, err => {
        res.send({
            status: 500,
            error: err,
            response: null
        });
    })
});

router.post('/create', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    var data = req.body
    const dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let refId = moment().utcOffset('+0100').format('x');
    computeTotalBalance(data.clientId, data.investmentId, HOST).then(totalBalance_ => {
        let total = (data.isWallet.toString() === '1') ? totalBalance_.currentWalletBalance : totalBalance_.currentAcctBalance;
        let inv_txn = {
            txn_date: (data.txn_date !== undefined) ? data.txn_date : moment().utcOffset('+0100').format('YYYY-MM-DD'),
            description: (data.isPaymentMadeByWallet !== undefined && data.isPaymentMadeByWallet === '1' && data.is_capital === '1') ? 'Opening balance from wallet' : data.description,
            amount: Number(data.amount.split(',').join('')).toFixed(2),
            is_credit: data.is_credit,
            created_date: dt,
            balance: Number(total).toFixed(2),
            is_capital: 0,
            ref_no: (data.isReversedTxn === '1') ? `${data.ref_no}-R` : refId,
            parentTxnId: data.parentTxnId,
            isReversedTxn: data.isReversedTxn,
            investmentId: data.investmentId,
            createdBy: data.createdBy,
            clientId: data.clientId,
            isMoveFundTransfer: data.isMoveFundTransfer,
            isWithdrawal: data.isWithdrawal,
            isDeposit: data.isDeposit,
            isTransfer: data.isTransfer,
            beneficialInvestmentId: data.beneficialInvestmentId,
            isInvestmentTerminated: data.isInvestmentTerminated,
            isForceTerminate: data.isForceTerminate,
            expectedTerminationDate: data.expectedTerminationDate,
            isWallet: data.isWallet,
            isPaymentMadeByWallet: (data.isWallet === '1') ? 0 : ((data.isPaymentMadeByWallet === '') ? 0 : data.isPaymentMadeByWallet),
            isInvestmentMatured: (data.isInvestmentMatured === undefined) ? 0 : data.isInvestmentMatured
        };
        query = `INSERT INTO investment_txns SET ?`;
        endpoint = `/core-service/post?query=${query}`;
        url = `${HOST}${endpoint}`;
        axios.post(url, inv_txn)
            .then(function (_response) {
                if (_response.data.status === undefined) {
                    query = `SELECT * FROM investment_product_requirements
                            WHERE productId = ${data.productId} AND operationId = ${(data.isWallet === '0') ? data.operationId : 0} AND status = 1`;
                    endpoint = "/core-service/get";
                    url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    })
                        .then(function (response2) {
                            if (response2.data.length > 0) {
                                let result = response2.data[0];
                                let pasrsedData = JSON.parse(result.roleId);
                                let jsonPriority = JSON.parse(result.priority);
                                jsonPriority = (jsonPriority === null) ? [] : jsonPriority;
                                pasrsedData.map(role => {
                                    let invOps = {
                                        investmentId: data.investmentId,
                                        operationId: data.operationId,
                                        roleId: role,
                                        isAllRoles: result.isAllRoles,
                                        createdAt: dt,
                                        updatedAt: dt,
                                        createdBy: data.createdBy,
                                        txnId: _response.data.insertId,
                                        method: 'APPROVAL'
                                    };
                                    if (jsonPriority.length > 0) {
                                        const check = jsonPriority.filter(x => x.id.toString() === role.toString());
                                        if (check.length > 0) {
                                            invOps.priority = JSON.stringify(check);
                                        }
                                    }

                                    query = `INSERT INTO investment_op_approvals SET ?`;
                                    endpoint = `/core-service/post?query=${query}`;
                                    url = `${HOST}${endpoint}`;
                                    axios.post(url, invOps).then(p => {
                                    }, er22 => { });

                                });
                            } else {
                                let invOps = {
                                    investmentId: data.investmentId,
                                    operationId: data.operationId,
                                    roleId: '',
                                    createdAt: dt,
                                    updatedAt: dt,
                                    createdBy: data.createdBy,
                                    txnId: _response.data.insertId,
                                    method: 'APPROVAL'
                                };

                                query = `INSERT INTO investment_op_approvals SET ?`;
                                endpoint = `/core-service/post?query=${query}`;
                                url = `${HOST}${endpoint}`;
                                axios.post(url, invOps).then(p => {
                                }, er22 => { });
                            }
                        })
                        .catch(function (error) {
                        });


                    query = `SELECT * FROM investment_product_reviews
                            WHERE productId = ${data.productId} AND operationId = ${(data.isWallet === '0') ? data.operationId : 0} AND status = 1`;
                    endpoint = "/core-service/get";
                    url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    })
                        .then(function (response2) {
                            if (response2.data.length > 0) {
                                let result = response2.data[0];
                                let pasrsedData = JSON.parse(result.roleId);
                                let jsonPriority = JSON.parse(result.priority);
                                jsonPriority = (jsonPriority === null) ? [] : jsonPriority;
                                pasrsedData.map((role) => {
                                    let invOps = {
                                        investmentId: data.investmentId,
                                        operationId: data.operationId,
                                        roleId: role,
                                        isAllRoles: result.isAllRoles,
                                        createdAt: dt,
                                        updatedAt: dt,
                                        createdBy: data.createdBy,
                                        txnId: _response.data.insertId,
                                        method: 'REVIEW'
                                    };
                                    if (jsonPriority.length > 0) {
                                        const check = jsonPriority.filter(x => x.id.toString() === role.toString());
                                        if (check.length > 0) {
                                            invOps.priority = JSON.stringify(check);
                                        }
                                    }
                                    query = `INSERT INTO investment_op_approvals SET ?`;
                                    endpoint = `/core-service/post?query=${query}`;
                                    url = `${HOST}${endpoint}`;
                                    axios.post(url, invOps).then(p => { }, er22 => {
                                    });
                                });
                            } else {
                                let invOps = {
                                    investmentId: data.investmentId,
                                    operationId: data.operationId,
                                    roleId: '',
                                    createdAt: dt,
                                    updatedAt: dt,
                                    createdBy: data.createdBy,
                                    txnId: _response.data.insertId,
                                    method: 'REVIEW'
                                };

                                query = `INSERT INTO investment_op_approvals SET ?`;
                                endpoint = `/core-service/post?query=${query}`;
                                url = `${HOST}${endpoint}`;
                                axios.post(url, invOps).then(p => { }, er22 => {
                                });
                            }
                        })
                        .catch(function (error) {
                        });

                    query = `SELECT * FROM investment_product_posts
                            WHERE productId = ${data.productId} AND operationId = ${(data.isWallet === '0') ? data.operationId : 0} AND status = 1`;
                    endpoint = "/core-service/get";
                    url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    })
                        .then(function (response2) {
                            if (response2.data.length > 0) {
                                let result = response2.data[0];
                                let pasrsedData = JSON.parse(result.roleId);
                                let jsonPriority = JSON.parse(result.priority);
                                jsonPriority = (jsonPriority === null) ? [] : jsonPriority;
                                pasrsedData.map(role => {
                                    let invOps = {
                                        investmentId: data.investmentId,
                                        operationId: data.operationId,
                                        roleId: role,
                                        isAllRoles: result.isAllRoles,
                                        createdAt: dt,
                                        updatedAt: dt,
                                        createdBy: data.createdBy,
                                        txnId: _response.data.insertId,
                                        method: 'POST'
                                    };

                                    if (jsonPriority.length > 0) {
                                        const check = jsonPriority.filter(x => x.id.toString() === role.toString());
                                        if (check.length > 0) {
                                            invOps.priority = JSON.stringify(check);
                                        }
                                    }

                                    query = `INSERT INTO investment_op_approvals SET ?`;
                                    endpoint = `/core-service/post?query=${query}`;
                                    url = `${HOST}${endpoint}`;
                                    axios.post(url, invOps).then(p => { }, er22 => {
                                    });
                                });
                            } else {
                                let invOps = {
                                    investmentId: data.investmentId,
                                    operationId: data.operationId,
                                    roleId: '',
                                    createdAt: dt,
                                    updatedAt: dt,
                                    createdBy: data.createdBy,
                                    txnId: _response.data.insertId,
                                    method: 'POST'
                                };

                                query = `INSERT INTO investment_op_approvals SET ?`;
                                endpoint = `/core-service/post?query=${query}`;
                                url = `${HOST}${endpoint}`;
                                axios.post(url, invOps).then(p => { }, er22 => {
                                });
                            }
                        })
                        .catch(function (error) {
                        });

                    setDocRequirement(HOST, data, _response.data.insertId);
                    res.send({});
                } else {
                    res.send({
                        status: 500,
                        error: '',
                        response: null
                    });
                }
            })
            .catch(function (error) {
                res.send({
                    status: 500,
                    error: error,
                    response: null
                });
            });
    })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});


function setDocRequirement(HOST, data, txnId) {
    let query = `SELECT * FROM investment_doc_requirement
                WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
    let endpoint = "/core-service/get";
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    })
        .then(function (response2) {
            if (response2.data.length > 0) {
                response2.data.map((item, index) => {
                    let doc = {
                        docRequirementId: item.Id,
                        txnId: txnId,
                        createdAt: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
                    }
                    query = `INSERT INTO investment_txn_doc_requirements SET ?`;
                    endpoint = `/core-service/post?query=${query}`;
                    url = `${HOST}${endpoint}`;
                    try {
                        axios.post(url, doc);
                    } catch (error) { }
                })
            }
        })
        .catch(function (error) { });
}


router.get('/verify-doc-uploads', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = req.query;
    let query = `Select 
    (Select Count(*) as total_doc_required from investment_doc_requirement where productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1) as total_doc_required,
    (Select Count(*) as total_uploaded from investment_txn_doc_requirements where txnId = ${data.txnId} AND isReplaced = 0 AND status = 1) as total_uploaded`;
    let endpoint = `/core-service/get`;
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    })
        .then(function (response) {
            if (response.data.status === undefined) {
                res.send(response.data);
            }
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});


router.post('/create-transfers', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    var data = req.body
    const dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let refId = moment().utcOffset('+0100').format('x');
    let query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE clientId = ${data.debitedClientId} AND isApproved = 1`;
    let endpoint = "/core-service/get";
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    })
        .then(function (response) {
            if (response.data.length > 0) {
                let total = 0;
                response.data.map(x => {
                    if (x.isApproved === 1) {
                        let _x = x.amount.split(',').join('');
                        if (x.is_credit.toString() === '1') {
                            total += parseFloat(_x);
                        } else {
                            total -= parseFloat(_x);
                        }
                    }
                });
                let inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                    description: `TRANSFER BETWEEN ${(data.creditedClientId !== '') ? 'CLIENTS WALLET' : 'CLIENT AND INVESTMENT ACCOUNT'} Transfer from : ${data.debitedClientName} to ${data.creditedClientName}`,
                    amount: Number(data.amount).toFixed(2),
                    is_credit: 0,
                    created_date: dt,
                    balance: parseFloat(Number(total).toFixed(2)) - parseFloat(Number(data.amount.toString().split(',').join('')).toFixed(2)),
                    is_capital: 0,
                    ref_no: refId,
                    clientId: data.debitedClientId,
                    createdBy: data.createdBy,
                    isWallet: 1,
                    isCharge: 0,
                    isApproved: 1,
                    postDone: 1,
                    reviewDone: 1,
                    approvalDone: 1,
                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
                };
                query = `INSERT INTO investment_txns SET ?`;
                endpoint = `/core-service/post?query=${query}`;
                url = `${HOST}${endpoint}`;
                axios.post(url, inv_txn)
                    .then(function (_response) {
                        if (_response.data.status === undefined) {
                            let queryString = (data.investmentId === '') ? `clientId = ${data.creditedClientId}` : `investmentId = ${data.investmentId}`;
                            query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE ${queryString} AND isApproved = 1`;
                            let endpoint = "/core-service/get";
                            let url = `${HOST}${endpoint}`;
                            axios.get(url, {
                                params: {
                                    query: query
                                }
                            })
                                .then(function (response2) {
                                    total = 0;
                                    if (response2.data.length > 0) {
                                        response2.data.map(x => {
                                            if (x.isApproved === 1) {
                                                let _x = x.amount.split(',').join('');
                                                if (x.is_credit.toString() === '1') {
                                                    total += parseFloat(_x);
                                                } else {
                                                    total -= parseFloat(_x);
                                                }
                                            }
                                        });
                                    }
                                    let inv_txn = {
                                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                        description: `TRANSFER BETWEEN ${(data.creditedClientId !== '') ? 'CLIENTS WALLET' : 'CLIENT AND INVESTMENT ACCOUNT'} Transfer from : ${data.debitedClientName} to ${data.creditedClientName}`,
                                        amount: Number(data.amount).toFixed(2),
                                        is_credit: 1,
                                        created_date: dt,
                                        balance: parseFloat(Number(total).toFixed(2)) + parseFloat(Number(data.amount.toString().split(',').join('')).toFixed(2)),
                                        is_capital: 0,
                                        ref_no: refId,
                                        clientId: data.creditedClientId,
                                        investmentId: data.investmentId,
                                        createdBy: data.createdBy,
                                        isWallet: (data.creditedClientId === '') ? 0 : 1,
                                        isCharge: 0,
                                        isApproved: 1,
                                        postDone: 1,
                                        reviewDone: 1,
                                        approvalDone: 1,
                                        updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
                                    };
                                    query = `INSERT INTO investment_txns SET ?`;
                                    endpoint = `/core-service/post?query=${query}`;
                                    url = `${HOST}${endpoint}`;
                                    axios.post(url, inv_txn)
                                        .then(function (_response2) {
                                            if (_response2.data.status === undefined) {
                                                res.send(_response.data);
                                            } else {
                                                res.send({
                                                    status: 500,
                                                    error: error,
                                                    response: null
                                                });
                                            }

                                        })
                                        .catch(function (error) {
                                            res.send({
                                                status: 500,
                                                error: error,
                                                response: null
                                            });
                                        });

                                })
                                .catch(function (error) {
                                    res.send({
                                        status: 500,
                                        error: error,
                                        response: null
                                    });
                                });
                        } else {
                            res.send({
                                status: 500,
                                error: error,
                                response: null
                            });
                        }

                    })
                    .catch(function (error) {
                        res.send({
                            status: 500,
                            error: error,
                            response: null
                        });
                    });
            } else {
                res.send({
                    status: 500,
                    error: 'Investment has no initial transaction',
                    response: null
                });
            }
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

router.post('/approves', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = req.body
    let query = `UPDATE investment_op_approvals SET isApproved = ${data.status},isCompleted = ${1}, approvedBy=${data.userId}, updatedAt ='${dt.toString()}' WHERE ID =${data.id}`;
    let endpoint = `/core-service/get`;
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    })
        .then(function (response) {
            if (response.data.status === undefined) {
                query = `Select 
                        (Select Count(*) as total_approved from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND (isApproved = 1 && isCompleted =1)) as total_approved,
                        (Select Count(*) as isOptional from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND isAllRoles = 0) as isOptional,
                        (Select Count(*) as priorityTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND priority IS NOT NULL) as priorityTotal,
                        (Select Count(*) as priorityItemTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND priority = '${data.priority}') as priorityItemTotal,
                        (Select Count(*) as total_approvedBy from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL') as total_approvedBy`;
                endpoint = '/core-service/get';
                url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                }).then(counter => {
                    if (((counter.data[0].total_approvedBy === counter.data[0].total_approved) || (counter.data[0].isOptional > 0) ||
                        (counter.data[0].priorityTotal !== 0 && counter.data[0].priorityTotal === counter.data[0].priorityItemTotal)) && data.status === '1') {
                        query = `UPDATE investment_txns SET approvalDone = ${1} WHERE ID =${data.txnId}`;
                        endpoint = `/core-service/get`;
                        url = `${HOST}${endpoint}`;
                        axios.get(url, {
                            params: {
                                query: query
                            }
                        })
                            .then(function (response_) {
                                res.send(response.data);
                            }, err => {
                                res.send({
                                    status: 500,
                                    error: err,
                                    response: null
                                });
                            })
                            .catch(function (error) {
                                res.send({
                                    status: 500,
                                    error: error,
                                    response: null
                                });
                            });
                    } else {
                        query = `UPDATE investment_txns SET approvalDone = ${0}, isDeny = ${data.isDeny} WHERE ID =${data.txnId}`;
                        endpoint = `/core-service/get`;
                        url = `${HOST}${endpoint}`;
                        axios.get(url, {
                            params: {
                                query: query
                            }
                        })
                            .then(function (response_) {
                                res.send(response.data);
                            }, err => {
                                res.send({
                                    status: 500,
                                    error: err,
                                    response: null
                                });
                            })
                            .catch(function (error) {
                                res.send({
                                    status: 500,
                                    error: error,
                                    response: null
                                });
                            });
                    }
                }, err => {
                    res.send({
                        status: 500,
                        error: err,
                        response: null
                    });
                });
            } else {
                res.send({
                    status: 500,
                    error: err,
                    response: null
                });
            }
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

router.post('/reviews', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = req.body
    let query = `UPDATE investment_op_approvals SET isReviewed = ${data.status}, reviewedBy=${data.userId},isCompleted = ${1}, updatedAt ='${dt.toString()}' WHERE ID =${data.id}`;
    let endpoint = `/core-service/get`;
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    })
        .then(function (response) {

            if (response.data.status === undefined) {
                query = `Select 
                        (Select Count(*) as total_reviewed from investment_op_approvals where txnId = ${data.txnId} AND (isReviewed = 1 || isCompleted = 1) AND method = 'REVIEW') as total_reviewed,
                        (Select Count(*) as isOptional from investment_op_approvals where txnId = ${data.txnId} AND isAllRoles = 0 AND method = 'REVIEW') as isOptional,
                        (Select Count(*) as priorityTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW' AND priority IS NOT NULL) as priorityTotal,
                        (Select Count(*) as priorityItemTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW' AND priority = '${data.priority}') as priorityItemTotal,
                        (Select Count(*) as total_reviewedBy from investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW') as total_reviewedBy`;
                endpoint = '/core-service/get';
                url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                }).then(counter => {
                    if (((counter.data[0].total_reviewedBy === counter.data[0].total_reviewed) || (counter.data[0].isOptional > 0) ||
                        (counter.data[0].priorityTotal !== 0 && counter.data[0].priorityTotal === counter.data[0].priorityItemTotal)) && data.status === '1') {
                        query = `UPDATE investment_txns SET reviewDone = ${1} WHERE ID =${data.txnId}`;
                        endpoint = `/core-service/get`;
                        url = `${HOST}${endpoint}`;
                        axios.get(url, {
                            params: {
                                query: query
                            }
                        })
                            .then(function (response_) {
                                res.send(response.data);
                            }, err => {
                                res.send({
                                    status: 500,
                                    error: err,
                                    response: null
                                });
                            })
                            .catch(function (error) {
                                res.send({
                                    status: 500,
                                    error: error,
                                    response: null
                                });
                            });
                    } else {
                        query = `UPDATE investment_txns SET reviewDone = ${0}, isDeny = ${data.isDeny} WHERE ID =${data.txnId}`;
                        endpoint = `/core-service/get`;
                        url = `${HOST}${endpoint}`;
                        axios.get(url, {
                            params: {
                                query: query
                            }
                        })
                            .then(function (response_) {
                                res.send(response.data);
                            }, err => {
                                res.send({
                                    status: 500,
                                    error: err,
                                    response: null
                                });
                            })
                            .catch(function (error) {
                                res.send({
                                    status: 500,
                                    error: error,
                                    response: null
                                });
                            });
                    }
                }, err => {
                    res.send({
                        status: 500,
                        error: err,
                        response: null
                    });
                });
            } else {
                res.send({
                    status: 500,
                    error: err,
                    response: null
                });
            }
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

router.post('/posts', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = req.body
    let query = `UPDATE investment_op_approvals SET isPosted = ${data.status}, postedBy=${data.userId},isCompleted = ${1}, updatedAt ='${dt.toString()}' WHERE ID =${data.id}`;
    let endpoint = `/core-service/get`;
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(function (response) {
        if (response.data.status === undefined) {
            query = `Select 
                (Select Count(*) as total_posted from investment_op_approvals where txnId = ${data.txnId} AND (isPosted = 1 || isCompleted = 1) AND method = 'POST') as total_posted,
                (Select Count(*) as isOptional from investment_op_approvals where txnId = ${data.txnId} AND isAllRoles = 0 AND method = 'POST') as isOptional,
                (Select Count(*) as priorityTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'POST' AND priority IS NOT NULL) as priorityTotal,
                (Select Count(*) as priorityItemTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'POST' AND priority = '${data.priority}') as priorityItemTotal,
                (Select Count(*) as total_postedBy from investment_op_approvals where txnId = ${data.txnId} AND method = 'POST') as total_postedBy`;
            endpoint = '/core-service/get';
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(counter => {
                if (((counter.data[0].total_postedBy === counter.data[0].total_posted) || (counter.data[0].isOptional > 0) ||
                    (counter.data[0].priorityTotal !== 0 && counter.data[0].priorityTotal === counter.data[0].priorityItemTotal)) && data.status === '1') {
                    let total_bal = 0;
                    computeTotalBalance(data.clientId, data.investmentId, HOST).then(totalBalance_ => {
                        getTerminatedOrMaturedInvestment(data.investmentId, HOST).then(invItem => {
                            updateTerminatedOrMaturedInvestment(invItem.investmentId, HOST).then(updated_payload => {
                                total_bal = (data.isWallet.toString() === '1') ? totalBalance_.currentWalletBalance : totalBalance_.currentAcctBalance;
                                let bal = (data.isCredit.toString() === '1') ? (total_bal + parseFloat(data.amount.split(',').join(''))) :
                                    (total_bal - parseFloat(data.amount.split(',').join('')));
                                if (data.isInvestmentTerminated.toString() === '0') {
                                    query = `UPDATE investment_txns SET isApproved = ${data.status}, 
                                    updated_date ='${dt.toString()}', createdBy = ${data.userId},postDone = ${data.status},
                                    amount = ${Number(data.amount.split(',').join('')).toFixed(2)} , balance ='${Number(bal).toFixed(2)}'
                                    WHERE ID =${data.txnId}`;
                                    endpoint = `/core-service/get`;
                                    url = `${HOST}${endpoint}`;
                                    axios.get(url, {
                                        params: {
                                            query: query
                                        }
                                    })
                                        .then(function (response_) {
                                            if (data.isReversedTxn === '0') {
                                                debitWalletTxns(HOST, data).then(payld => {
                                                    upFrontInterest(data, HOST).then(payld2 => {
                                                        setcharges(data, HOST, false).then(payload => {
                                                            res.send(response.data);
                                                        }, err => {
                                                        });
                                                    }, __err => {
                                                    });
                                                }, errrr => {
                                                });
                                            } else {
                                                res.send(response_.data);
                                            }
                                        }, err => {
                                            res.send({
                                                status: 500,
                                                error: err,
                                                response: null
                                            });
                                        }).catch(function (error) {
                                            res.send({
                                                status: 500,
                                                error: error,
                                                response: null
                                            });
                                        });
                                } else if (data.isInvestmentTerminated.toString() === '1') {
                                    fundBeneficialAccount(data, HOST).then(_payload_2 => {
                                        res.send({});
                                    }, err => {
                                        res.send({
                                            status: 500,
                                            error: err,
                                            response: null
                                        });
                                    });
                                }
                            })
                        });



                    });
                } else {
                    query = (data.isWallet.toString() === '0') ?
                        `SELECT amount,is_credit,isApproved FROM investment_txns WHERE investmentId = ${data.investmentId}` :
                        `SELECT amount,is_credit,isApproved FROM investment_txns WHERE clientid = ${data.clientId} AND isWallet = 1`;
                    let endpoint = "/core-service/get";
                    let url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    })
                        .then(function (response_bal) {
                            if (response_bal.data.length > 0) {
                                let total_bal = 0;
                                response_bal.data.map(x => {
                                    if (x.isApproved.toString() === '1') {
                                        let _x = x.amount.split(',').join('');
                                        if (x.is_credit.toString() === '1') {
                                            total_bal += parseFloat(_x);
                                        } else {
                                            total_bal -= parseFloat(_x);
                                        }
                                    }
                                });
                                let bal = 0;
                                if (data.isCredit === 1) {
                                    bal = (data.status === 0) ? (total_bal - parseFloat(data.amount.split(',').join(''))) : total_bal;
                                } else {
                                    bal = (data.status === 0) ? (total_bal + parseFloat(data.amount.split(',').join(''))) : total_bal;
                                }
                                if (data.isInvestmentTerminated.toString() === '0') {
                                    query = `UPDATE investment_txns SET isApproved = ${0}, updated_date ='${dt.toString()}', postDone = ${0}, isDeny = ${data.isDeny},
                                        amount = ${ Number(data.amount.split(',').join('')).toFixed(2)} , balance ='${Number(bal).toFixed(2)}'
                                        WHERE ID =${data.txnId}`;
                                    endpoint = `/core-service/get`;
                                    url = `${HOST}${endpoint}`;
                                    axios.get(url, {
                                        params: {
                                            query: query
                                        }
                                    })
                                        .then(function (response_) {
                                            fundBeneficialAccount(data, HOST);
                                            res.send(response.data);
                                        }, err => {
                                            res.send({
                                                status: 500,
                                                error: err,
                                                response: null
                                            });
                                        })
                                        .catch(function (error) {
                                            res.send({
                                                status: 500,
                                                error: error,
                                                response: null
                                            });
                                        });
                                } else if (data.isInvestmentTerminated.toString() === '1') {
                                    fundBeneficialAccount(data, HOST).then(_payload_2 => {
                                        res.send(_payload_2.data);
                                    }, err => {
                                        res.send({
                                            status: 500,
                                            error: error,
                                            response: null
                                        });
                                    });
                                }
                            }
                        });
                }
            }, err => {
                res.send({
                    status: 500,
                    error: err,
                    response: null
                });
            });
        } else {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        }
    }, err => {
        res.send({
            status: 500,
            error: err,
            response: null
        });
    })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

router.post('/transfer-fund-wallet', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    const data = req.body;
    moveFundWallet(data, HOST).then(payload => {
        return payload;
    }, err_2 => {
        return {};
    });
});

function fundBeneficialAccount(data, HOST) {
    if (data.isTransfer === '1') {
        return new Promise((resolve, reject) => {
            computeTotalBalance(data.clientId, data.beneficialInvestmentId, HOST).then(computedBalanceAmt => {
                let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                let refId = moment().utcOffset('+0100').format('x');
                let total_bal = (data.isMoveFundTransfer.toString() === '1') ? computedBalanceAmt.currentWalletBalance : computedBalanceAmt.currentAcctBalance;
                let sumTotal = total_bal + parseFloat(data.amount.toString().split(',').join(''));
                let inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                    description: data.description,
                    amount: data.amount,
                    is_credit: 1,
                    isCharge: 0,
                    created_date: dt,
                    balance: Number(sumTotal).toFixed(2),
                    is_capital: 0,
                    isApproved: 1,
                    postDone: 1,
                    reviewDone: 1,
                    approvalDone: 1,
                    ref_no: refId,
                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                    clientId: data.clientId,
                    isWallet: data.isMoveFundTransfer,
                    investmentId: data.beneficialInvestmentId,
                    createdBy: data.userId
                };

                let query = `INSERT INTO investment_txns SET ?`;
                let endpoint = `/core-service/post?query=${query}`;
                let url = `${HOST}${endpoint}`;
                axios.post(url, inv_txn)
                    .then(function (payload) {
                        if (payload.data.status === undefined) {
                            //Charge for Transfer
                            deductTransferCharge(data, HOST, data.amount).then(result => {
                                resolve(result);
                            }, err => {
                                resolve({});
                            });
                        }
                    }, err => {
                        resolve({});
                    });
            });
        });
    } else if (data.isInvestmentTerminated === '1') {
        return new Promise((resolve, reject) => {
            chargeForceTerminate(data, HOST).then(payload => {
                reverseEarlierInterest(data, HOST).then(result => {
                    resolve(result);
                });
            });
        });
    }
}

function computeCurrentBalance(investmentId, HOST) {
    return new Promise((resolve, reject) => {
        let query = `Select balance from investment_txns WHERE isWallet = 0 AND investmentId = ${investmentId} 
        AND isApproved = 1 AND postDone = 1 ORDER BY STR_TO_DATE(updated_date, '%Y-%m-%d %l:%i:%s %p') DESC LIMIT 1`;
        let endpoint = `/core-service/get`;
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response_prdt_ => {
            let result = (response_prdt_.data[0] === undefined || response_prdt_.data[0] === null) ? 0 :
                ((response_prdt_.data[0].balance === null) ? 0 : parseFloat(Number(response_prdt_.data[0].balance.toString().split(',').join('')).toFixed(2)));
            resolve(result);
        }, err => {
            resolve(0);
        });
    });
}

function computeTotalBalance(clientId, investmentId, HOST) {
    return new Promise((resolve, reject) => {
        let query = `Select 
        (Select balance from investment_txns WHERE isWallet = 1 AND clientId = ${clientId} 
            AND isApproved = 1 AND postDone = 1 ORDER BY STR_TO_DATE(updated_date, '%Y-%m-%d %l:%i:%s %p') DESC LIMIT 1) as currentWalletBalance,
        (Select balance from investment_txns WHERE isWallet = 0 AND investmentId = ${(investmentId === '' || investmentId === undefined || investmentId === null) ? 0 : investmentId} 
            AND isApproved = 1 AND postDone = 1 ORDER BY STR_TO_DATE(updated_date, '%Y-%m-%d %l:%i:%s %p') DESC LIMIT 1) as currentAcctBalance`;
        let endpoint = '/core-service/get';
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload2 => {
            let result = (payload2.data[0] === undefined || payload2.data[0] === null) ?
                { currentWalletBalance: 0, currentAcctBalance: 0 } :
                {
                    currentWalletBalance:
                        (payload2.data[0].currentWalletBalance === null) ? 0
                            : parseFloat(Number(payload2.data[0].currentWalletBalance.toString().split(',').join('')).toFixed(2)),
                    currentAcctBalance: (payload2.data[0].currentAcctBalance === null) ? 0
                        : parseFloat(Number(payload2.data[0].currentAcctBalance.toString().split(',').join('')).toFixed(2))
                };
            resolve(result);
        }, err => {
            resolve({});
        });
    });
}

function computeWalletBalance(clientId, HOST) {
    return new Promise((resolve, reject) => {
        let query = `Select balance as currentWalletBalance from investment_txns WHERE isWallet = 1 AND clientId = ${clientId} 
        AND isApproved = 1 AND postDone = 1 ORDER BY STR_TO_DATE(updated_date, '%Y-%m-%d %l:%i:%s %p') DESC LIMIT 1`;
        let endpoint = '/core-service/get';
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload2 => {
            let result = (payload2.data[0] === undefined || payload2.data[0] === null) ? { currentWalletBalance: 0 } : {
                currentWalletBalance: (payload2.data[0].currentWalletBalance === null) ? 0 : parseFloat(Number(payload2.data[0].currentWalletBalance.toString().split(',').join('')).toFixed(2))
            };
            resolve(result);
        }, err => {
            resolve({});
        });
    });
}

function getTerminatedOrMaturedInvestment(investmentId, HOST) {
    return new Promise((resolve, reject) => {
        let query = `Select investmentId from investment_txns where investmentId = ${(investmentId === '' || investmentId === undefined || investmentId === null) ? 0 : investmentId} AND (isInvestmentMatured = 1 or isInvestmentTerminated = 1) Limit 1`;
        let endpoint = '/core-service/get';
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload2 => {
            if (payload2.data.length > 0) {
                resolve(payload2.data[0]);
            } else {
                resolve({});
            }
        }, err => {
            resolve({});
        });
    });
}

function updateTerminatedOrMaturedInvestment(investmentId, HOST) {
    return new Promise((resolve, reject) => {
        if (investmentId !== undefined && investmentId !== null && investmentId !== '') {
            let query = `UPDATE investments SET isClosed = 1 WHERE ID = ${investmentId}`;
            let endpoint = '/core-service/get';
            let url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(payload2 => {
                if (payload2.data.length > 0) {
                    resolve({});
                } else {
                    resolve({});
                }
            }, err => {
                resolve({});
            });
        } else {
            resolve({});
        }
    });
}


async function upFrontInterest(data, HOST) {
    if (data.interest_disbursement_time.toString() === 'Up-Front' && data.is_capital.toString() === '1') {
        let totalAmt = await computeTotalBalance(data.clientId, data.investmentId, HOST);
        return new Promise((resolve, reject) => {
            let T = differenceInCalendarDays(
                new Date(data.investment_mature_date.toString()),
                new Date(data.investment_start_date.toString())
            );
            let interestInDays = T / 365;
            let SI = (parseFloat(data.amount.split(',').join('')) * parseFloat(data.interest_rate.split(',').join('')) * interestInDays) / 100;
            let total = 0;
            if (data.interest_moves_wallet.toString() === '1') {
                total = totalAmt.currentWalletBalance + SI;
            } else {
                total = totalAmt.currentAcctBalance + SI;
            }
            let _inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                description: 'Total Up-Front interest',
                amount: Number(SI).toFixed(2),
                is_credit: 1,
                created_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                balance: Number(total).toFixed(2),
                is_capital: 0,
                ref_no: moment().utcOffset('+0100').format('x'),
                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                investmentId: data.investmentId,
                createdBy: data.createdBy,
                clientId: data.clientId,
                isWallet: (data.interest_moves_wallet.toString() === '1') ? 1 : 0,
                isInterest: 1,
                isApproved: 1,
                postDone: 1,
                reviewDone: 1,
                approvalDone: 1,
            };
            let query = `INSERT INTO investment_txns SET ?`;
            let endpoint = `/core-service/post?query=${query}`;
            let url = `${HOST}${endpoint}`;
            axios.post(url, _inv_txn)
                .then(function (_payload_) {
                    resolve({});
                }, err => {
                    reject(err);
                });
        });
    } else {
        return {};
    }
}


async function deductTransferCharge(data, HOST, amount) {
    return new Promise((resolve, reject) => {
        if (data.isInvestmentMatured.toString() === '0') {
            computeCurrentBalance(data.investmentId, HOST).then(currentBalance => {
                let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                let query = `SELECT * FROM investment_config ORDER BY ID DESC LIMIT 1`;
                let endpoint = '/core-service/get';
                let url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                }).then(response => {
                    if (response.data.status === undefined) {
                        let configData = response.data[0];
                        let configAmount = (configData.transferChargeMethod == 'Fixed') ? configData.transferValue : (configData.transferValue * parseFloat(Number(amount).toFixed(2))) / 100;
                        let _refId = moment().utcOffset('+0100').format('x');
                        let balTransfer = currentBalance - configAmount;
                        let inv_txn = {
                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                            description: `FUND TRANSFER CHARGE ON REF.: <strong>${data.refId}</strong>`,
                            amount: configAmount,
                            is_credit: 0,
                            created_date: dt,
                            balance: parseFloat(Number(balTransfer).toFixed(2)),
                            is_capital: 0,
                            isCharge: 1,
                            isApproved: 1,
                            postDone: 1,
                            reviewDone: 1,
                            investmentId: data.investmentId,
                            approvalDone: 1,
                            ref_no: _refId,
                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                            createdBy: data.createdBy
                        };
                        setInvestmentTxns(HOST, inv_txn).then(payload => {
                            deductVatTax(HOST, data, configAmount, inv_txn, balTransfer).then(payload_1 => {
                                resolve({});
                            }, err_1 => {
                                resolve({});
                            });
                        }, err => {
                            resolve({});
                        });
                    } else {
                        resolve({});
                    }
                }, err => {
                    resolve({});
                })
            });
        } else {
            resolve({});
        }
    });
}

function fundWallet(value, HOST) {
    return new Promise((resolve, reject) => {
        setInvestmentTxns(HOST, value).then(payload => {
            resolve(payload.data);
        }, err => {
            reject(0);
        });
    });
}

function closeInvestmentWallet(investmentId, HOST) {
    return new Promise((resolve, reject) => {
        let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let query = `UPDATE investments SET
        date_modified = '${dt}',
        isTerminated = 1,
        isInterestCleared = 1
        WHERE ID = ${investmentId}`;
        let endpoint = `/core-service/get`;
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response_prdt_ => {
            resolve(response_prdt_.data);
        }, err => {
            resolve({});
        });
    });
}

// async function moveFundWallet(data, HOST) {
//     return new Promise((resolve, reject) => {
//         let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
//         let currentBalance = await computeCurrentBalance(investmentId, HOST);
//         data.balance = currentBalance - data.amount;
//         setInvestmentTxns(HOST, data).then(payload => {
//             resolve(payload);
//         }, err => {
//             resolve({});
//         });
//     });
// }


function chargeForceTerminate(data, HOST) {
    return new Promise((resolve, reject) => {
        if (data.isInvestmentTerminated.toString() === '1' && data.isForceTerminate.toString() === '1') {
            computeCurrentBalance(data.investmentId, HOST).then(balance => {
                let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                let _refId = moment().utcOffset('+0100').format('x');
                let query = `SELECT t.*,p.*,v.description,v.amount as txnAmount,
                v.balance as txnBalance,v.isApproved,v.isInterestCharged,v.is_credit FROM investments t 
                left join investment_products p on p.ID = t.productId
                left join investment_txns v on v.investmentId = t.ID
                WHERE v.investmentId = ${data.investmentId} AND p.status = 1 AND v.isApproved = 1 ORDER BY STR_TO_DATE(v.updated_date, '%Y-%m-%d %l:%i:%s %p') DESC LIMIT 1`;
                let endpoint = '/core-service/get';
                let url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                }).then(response => {
                    if (response.data.status === undefined) {
                        let configData = response.data[0];
                        let _charge = (configData.min_days_termination_charge === null) ? 0 : parseFloat(configData.min_days_termination_charge.toString());
                        let configAmount = (configData.opt_on_min_days_termination === 'Fixed') ? _charge : ((_charge * balance) / 100);
                        let inv_txn = {
                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                            description: `CHARGE ON INVESTMENT TERMINATION`,
                            amount: configAmount,
                            is_credit: 0,
                            created_date: dt,
                            balance: balance - configAmount,
                            is_capital: 0,
                            isCharge: 1,
                            isApproved: 1,
                            postDone: 1,
                            reviewDone: 1,
                            investmentId: data.investmentId,
                            approvalDone: 1,
                            ref_no: _refId,
                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                            createdBy: data.createdBy
                        };
                        query = `INSERT INTO investment_txns SET ?`;
                        endpoint = `/core-service/post?query=${query}`;
                        url = `${HOST}${endpoint}`;
                        try {
                            axios.post(url, inv_txn).then(response__ => {
                                deductVatTax(HOST, data, configAmount, inv_txn, balance).then(payload___ => {
                                    resolve(payload___);
                                }, err => {
                                    resolve({});
                                });
                            }, err__ => {
                                resolve({});
                            });

                        } catch (error) {
                            resolve({});
                        }
                    }
                }, err => {
                    resolve({});
                })
            });
        } else {
            resolve({});
        }
    });
}



function getExistingInterests(data, HOST) {
    return new Promise((resolve, reject) => {
        let query = `SELECT description,amount as txnAmount,balance as txnBalance,isApproved,
        isInterest,isInterestCharged,is_credit FROM investment_txns
        WHERE investmentId = ${data.investmentId} AND isApproved = 1 AND isInterest = 1`;
        let endpoint = `/core-service/get`;
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            const result = (payload.data.length === 0) ? [{ premature_interest_rate: 0 }] : payload.data;
            resolve(result);
        });
    });
}

function getProductConfigInterests(data, HOST) {
    return new Promise((resolve, reject) => {
        let query = `SELECT t.*,p.*,c.ID as clientId FROM investments t 
        left join investment_products p on p.ID = t.productId
        left join clients c on c.ID = t.clientId
        WHERE t.ID = ${data.investmentId}`;
        let endpoint = `/core-service/get`;
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            resolve(payload.data[0]);
        });
    });
}


function reverseEarlierInterest(data, HOST) {
    return new Promise((resolve, reject) => {
        getExistingInterests(data, HOST).then(_getExistingInterests => {
            getProductConfigInterests(data, HOST).then(_getProductConfigInterests => {
                let dt = moment().utcOffset('+0100').format('YYYY-MM-DD');
                let totalInterestAmount = 0;
                let reduceInterestRateApplied = _getExistingInterests.filter(x => x.premature_interest_rate !== '' && x.premature_interest_rate !== undefined && x.premature_interest_rate.toString() !== '0');
                if (reduceInterestRateApplied.length > 0) {
                    _getExistingInterests.map(item => {
                        totalInterestAmount += parseFloat(item.txnAmount.toString().split(',').join(''));
                    });
                    computeCurrentBalance(data.investmentId, HOST).then(totalBal => {
                        let total = totalBal;
                        let refId = moment().utcOffset('+0100').format('x');
                        inv_txn = {
                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                            description: 'Reverse: ' + 'Interest on investment',
                            amount: Number(totalInterestAmount).toFixed(2),
                            is_credit: 0,
                            isCharge: 1,
                            created_date: dt,
                            balance: total - parseFloat(Number(totalInterestAmount).toFixed(2)),
                            is_capital: 0,
                            isApproved: 1,
                            postDone: 1,
                            reviewDone: 1,
                            approvalDone: 1,
                            ref_no: `${refId}-R`,
                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                            investmentId: data.investmentId,
                            createdBy: data.createdBy
                        };

                        query = `INSERT INTO investment_txns SET ?`;
                        endpoint = `/core-service/post?query=${query}`;
                        let url = `${HOST}${endpoint}`;
                        axios.post(url, inv_txn)
                            .then(_payload_interest => {
                                dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                let daysInYear = 365;
                                if (isLeapYear(new Date())) {
                                    daysInYear = 366;
                                }
                                let totalInvestedAmount = total - totalInterestAmount;


                                let interestInDays = parseFloat(_getProductConfigInterests.premature_interest_rate) / daysInYear;
                                let SI = (totalInvestedAmount * interestInDays) / 100;
                                let _amount = parseFloat(Number(SI * 100) / 100).toFixed(2);
                                let date = new Date();
                                let diffInDays = differenceInDays(
                                    new Date(),
                                    new Date(_getProductConfigInterests.investment_start_date)
                                );
                                let interestAmount = diffInDays * _amount;
                                refId = moment().utcOffset('+0100').format('x');
                                inv_txn = {
                                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                    description: 'Investment termination interest',
                                    amount: Number(interestAmount).toFixed(2),
                                    is_credit: 1,
                                    isCharge: 1,
                                    created_date: dt,
                                    balance: totalInvestedAmount + interestAmount,
                                    is_capital: 0,
                                    isApproved: 1,
                                    postDone: 1,
                                    reviewDone: 1,
                                    approvalDone: 1,
                                    ref_no: refId,
                                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                    investmentId: data.investmentId,
                                    createdBy: data.createdBy
                                };

                                query = `INSERT INTO investment_txns SET ?`;
                                endpoint = `/core-service/post?query=${query}`;
                                let url = `${HOST}${endpoint}`;
                                axios.post(url, inv_txn)
                                    .then(_payload_interest_2 => {
                                        let refId = moment().utcOffset('+0100').format('x');
                                        dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                        let configData = _getProductConfigInterests;
                                        let configAmount = (configData.interest_forfeit_charge_opt == 'Fixed') ? configData.interest_forfeit_charge : (configData.interest_forfeit_charge * parseFloat(Number(totalInvestedAmount + interestAmount).toFixed(2))) / 100;
                                        let inv_txn = {
                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                            description: `CHARGE ON TERMINATION OF INVESTMENT`,
                                            amount: configAmount,
                                            is_credit: 0,
                                            created_date: dt,
                                            balance: (totalInvestedAmount + interestAmount) - configAmount,
                                            is_capital: 0,
                                            isCharge: 1,
                                            isApproved: 1,
                                            postDone: 1,
                                            reviewDone: 1,
                                            investmentId: data.investmentId,
                                            approvalDone: 1,
                                            ref_no: refId,
                                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                            createdBy: data.createdBy,
                                            isVat: 1
                                        };
                                        setInvestmentTxns(HOST, inv_txn).then(payload => {
                                            deductVatTax(HOST, data, configAmount, inv_txn, ((totalInvestedAmount + interestAmount) - configAmount)).then(result => {
                                                query = `DELETE FROM investment_txns WHERE ID=${data.txnId}`;
                                                endpoint = `/core-service/get`;
                                                url = `${HOST}${endpoint}`;
                                                axios.get(url, {
                                                    params: {
                                                        query: query
                                                    }
                                                })
                                                    .then(function (_res_) {
                                                        if (_res_.data.status === undefined) {
                                                            inv_txn = {
                                                                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                                description: `TERMINATE INVESTMENT`,
                                                                amount: Number(result).toFixed(2),
                                                                is_credit: 0,
                                                                created_date: dt,
                                                                balance: 0.00,
                                                                is_capital: 0,
                                                                isCharge: 0,
                                                                isApproved: 1,
                                                                postDone: 1,
                                                                reviewDone: 1,
                                                                investmentId: data.investmentId,
                                                                approvalDone: 1,
                                                                isInvestmentTerminated: 1,
                                                                ref_no: data.refId,
                                                                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                                createdBy: data.createdBy
                                                            };

                                                            setInvestmentTxns(HOST, inv_txn).then(_res_ponse_ => {

                                                                computeWalletBalance(data.clientId, HOST)
                                                                    .then(__balance => {
                                                                        refId = moment().utcOffset('+0100').format('x');
                                                                        let wBalance = __balance.currentWalletBalance;
                                                                        let wResult = Number(parseFloat(result.toString())).toFixed(2);
                                                                        let _totalBalance = wBalance + parseFloat(wResult.toString());

                                                                        inv_txn = {
                                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                                            description: `WALLET FUNDED BY TERMINATING INVESTMENT`,
                                                                            amount: wResult,
                                                                            is_credit: 1,
                                                                            created_date: dt,
                                                                            balance: Number(_totalBalance).toFixed(2),
                                                                            is_capital: 0,
                                                                            isCharge: 0,
                                                                            isApproved: 1,
                                                                            postDone: 1,
                                                                            reviewDone: 1,
                                                                            investmentId: data.investmentId,
                                                                            approvalDone: 1,
                                                                            ref_no: refId,
                                                                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                                            createdBy: data.createdBy,
                                                                            isWallet: 1,
                                                                            clientId: _getProductConfigInterests.clientId
                                                                        };
                                                                        fundWallet(inv_txn, HOST).then(currentWalletBalance => {
                                                                            closeInvestmentWallet(data.investmentId, HOST).then(closeInvest => {
                                                                                resolve(currentWalletBalance);
                                                                            }, err2 => {
                                                                                resolve({});
                                                                            });
                                                                        }, err => {
                                                                            resolve({});
                                                                        });
                                                                    }, __error__ => {
                                                                        resolve({});
                                                                    });
                                                            }, err => {
                                                                resolve({});
                                                            });
                                                        }
                                                    }, err => {
                                                        resolve({});
                                                    });
                                            }, err => {
                                                resolve({});
                                            });
                                        }, err1 => {
                                            resolve({});
                                        });
                                    }, err => {
                                        resolve({});
                                    });
                            }, err => {
                                resolve({});
                            });
                    }, err => {
                        resolve({});
                    })

                } else {
                    computeCurrentBalance(data.investmentId, HOST).then(_computeCurrentBalance => {
                        refId = moment().utcOffset('+0100').format('x');
                        let configData = _getProductConfigInterests;
                        configData.interest_forfeit_charge = (configData.interest_forfeit_charge !== null && configData.interest_forfeit_charge !== '') ? parseFloat(configData.interest_forfeit_charge.toString()) : 0;
                        let configAmount = (configData.interest_forfeit_charge_opt === 'Fixed') ? configData.interest_forfeit_charge : (configData.interest_forfeit_charge * _computeCurrentBalance) / 100;
                        let inv_txn = {
                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                            description: `CHARGE ON TERMINATION OF INVESTMENT`,
                            amount: configAmount,
                            is_credit: 0,
                            created_date: dt,
                            balance: _computeCurrentBalance - configAmount,
                            is_capital: 0,
                            isCharge: 1,
                            isApproved: 1,
                            postDone: 1,
                            reviewDone: 1,
                            investmentId: data.investmentId,
                            approvalDone: 1,
                            ref_no: refId,
                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                            createdBy: data.createdBy,
                            isVat: 1
                        };
                        setInvestmentTxns(HOST, inv_txn).then(payload_2 => {
                            deductVatTax(HOST, data, configAmount, inv_txn, (_computeCurrentBalance - configAmount)).then(result => {
                                query = `DELETE FROM investment_txns WHERE ID=${data.txnId}`;
                                endpoint = `/core-service/get`;
                                url = `${HOST}${endpoint}`;
                                axios.get(url, {
                                    params: {
                                        query: query
                                    }
                                })
                                    .then(function (_res_) {
                                        if (_res_.data.status === undefined) {
                                            inv_txn = {
                                                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                description: `TERMINATE INVESTMENT`,
                                                amount: result,
                                                is_credit: 0,
                                                created_date: dt,
                                                balance: 0.00,
                                                is_capital: 0,
                                                isCharge: 0,
                                                isApproved: 1,
                                                postDone: 1,
                                                reviewDone: 1,
                                                investmentId: data.investmentId,
                                                approvalDone: 1,
                                                ref_no: data.refId,
                                                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                createdBy: data.createdBy
                                            };
                                            computeWalletBalance(data.clientId, HOST).then(__balance => {
                                                let wBalance = __balance.currentWalletBalance;
                                                let wResult = Number(parseFloat(result.toString())).toFixed(2);
                                                let _totalBalance = wBalance + parseFloat(wResult.toString());
                                                setInvestmentTxns(HOST, inv_txn).then(function (_res_ponse_) {
                                                    const inv_txn = {
                                                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                        description: `WALLET FUNDED BY TERMINATING INVESTMENT`,
                                                        amount: wResult,
                                                        is_credit: 1,
                                                        created_date: dt,
                                                        balance: _totalBalance,
                                                        is_capital: 0,
                                                        isCharge: 0,
                                                        isApproved: 1,
                                                        postDone: 1,
                                                        reviewDone: 1,
                                                        investmentId: data.investmentId,
                                                        approvalDone: 1,
                                                        ref_no: moment().utcOffset('+0100').format('x'),
                                                        updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                        createdBy: data.createdBy,
                                                        isWallet: 1,
                                                        clientId: configData.clientId
                                                    };
                                                    fundWallet(inv_txn, HOST).then(currentWalletBalance => {
                                                        closeInvestmentWallet(data.investmentId, HOST).then(closeInvest => {
                                                            resolve(currentWalletBalance);
                                                        }, err2 => {
                                                            resolve({});
                                                        });

                                                    }, err => {
                                                        resolve({});
                                                    });
                                                }, err => {
                                                    resolve({});
                                                });
                                            });
                                        }
                                    }, err => {
                                        resolve({});
                                    });
                            }, err => {
                                resolve({});
                            });
                        }, err2 => {
                            resolve({});
                        });
                    });
                }
            });
        });
    });
}

function debitWalletTxns(HOST, data) {
    return new Promise((resolve, reject) => {
        if (data.isPaymentMadeByWallet.toString() === '1') {
            let query = `SELECT * FROM investment_txns WHERE clientId = ${data.clientId} AND isWallet = 1 ORDER BY STR_TO_DATE(updated_date, '%Y-%m-%d %l:%i:%s %p') DESC LIMIT 1`;
            let endpoint = `/core-service/get`;
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(response_ => {
                if (response_.data.length === 0) {
                    response_.data.push[{
                        balance: 0
                    }]
                }
                let walletBal = parseFloat(response_.data[0].balance.toString());
                let walletAmt = parseFloat(data.amount.toString());
                let walletCurrentBal = walletBal - walletAmt;
                let inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                    description: `Transfer to investment account`,
                    amount: Number(walletAmt).toFixed(2),
                    is_credit: 0,
                    created_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                    balance: Number(walletCurrentBal).toFixed(2),
                    is_capital: 0,
                    isCharge: 0,
                    isApproved: 1,
                    postDone: 1,
                    reviewDone: 1,
                    approvalDone: 1,
                    ref_no: moment().utcOffset('+0100').format('x'),
                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                    investmentId: data.investmentId,
                    isWallet: 1,
                    clientId: data.clientId,
                    createdBy: data.createdBy
                };
                query = `INSERT INTO investment_txns SET ?`;
                endpoint = `/core-service/post?query=${query}`;
                let url = `${HOST}${endpoint}`;
                axios.post(url, inv_txn)
                    .then(function (__paylod__) {
                        resolve({});
                    }, _err__ => {
                        reject(_err__);
                    });
            }, err => {
                reject(err);
            });
        } else {
            resolve({});
        }
    });
}

function fundDestination(HOST, data) {
    if (data.isFundDestinationWallet === 1) {
        let query = `SELECT * FROM investment_txns WHERE clientId = ${data.clientId} AND isWallet = 1 ORDER BY ID DESC LIMIT 1`;
        let endpoint = `/core-service/get`;
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response_ => {
            if (response_.data.length === 0) {
                response_.data.push[{
                    balance: 0
                }]
            }
            let walletBal = parseFloat(response_.data[0].balance.toString());
            let walletAmt = parseFloat(data.amount.toString());
            let walletCurrentBal = walletBal + walletAmt;
            let inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                description: `Transfer to investment account`,
                amount: Number(walletAmt).toFixed(2),
                is_credit: 1,
                created_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                balance: Number(walletCurrentBal).toFixed(2),
                is_capital: 0,
                isCharge: 0,
                isApproved: 1,
                postDone: 1,
                reviewDone: 1,
                approvalDone: 1,
                ref_no: moment().utcOffset('+0100').format('x'),
                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                investmentId: data.investmentId,
                isWallet: 1,
                clientId: data.clientId,
                createdBy: data.createdBy
            };
            query = `INSERT INTO investment_txns SET ?`;
            endpoint = `/core-service/post?query=${query}`;
            let url = `${HOST}${endpoint}`;
            axios.post(url, inv_txn)
                .then(function (__paylod__) {
                    resolve({});
                }, _err__ => {
                    reject(_err__);
                });
        }, err => {
            reject(err);
        });
    }
}


async function setcharges(data, HOST, isReversal) {
    return new Promise((resolve, reject) => {
        if (data.isInvestmentTerminated === '1' || data.isTransfer === '1') {
            fundBeneficialAccount(data, HOST).then(fundBene => {
                resolve(fundBene);
            }, err => {
                resolve({});
            });
        } else {
            computeTotalBalance(data.clientId, data.investmentId, HOST).then(computedTotalBalance => {
                let _total = (data.isWallet.toString() === '1') ? computedTotalBalance.currentWalletBalance : computedTotalBalance.currentAcctBalance;

                if (data.isInvestmentMatured.toString() === '0' && data.investmentId !== '') {
                    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    let refId = moment().utcOffset('+0100').format('x');
                    query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance, v.is_credit,
                    v.isInterest,p.freq_withdrawal, p.withdrawal_freq_duration, p.withdrawal_fees, p.withdrawal_freq_fees_opt
                    FROM investments t left join investment_products p on p.ID = t.productId
                    left join investment_txns v on v.investmentId = t.ID
                    WHERE t.ID = ${data.investmentId} AND v.ID = ${data.txnId}`;
                    let endpoint = `/core-service/get`;
                    url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    }).then(response_product => {
                        if (response_product.data[0].isInterest.toString() === '0') {
                            if (data.isCredit.toString() === '1') {

                                let chargeForDeposit = response_product.data.filter(x => x.saving_fees !== '0' && x.saving_fees !== '');
                                if (chargeForDeposit.length > 0) {
                                    let total = _total;
                                    //let total = parseFloat(chargeForDeposit[chargeForDeposit.length - 1].txnBalance.split(',').join(''))
                                    const chargedCost = (chargeForDeposit[0].saving_charge_opt === 'Fixed') ? parseFloat(chargeForDeposit[0].saving_fees.split(',').join('')) : ((parseFloat(chargeForDeposit[0].saving_fees.split(',').join('')) / 100) * parseFloat(data.amount.split(',').join('')));
                                    let inv_txn = {
                                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                        description: (isReversal === false) ? 'Charge: ' + chargeForDeposit[0].description : `Reverse: ${chargeForDeposit[0].description}`,
                                        amount: Number(chargedCost).toFixed(2),
                                        is_credit: 0,
                                        isCharge: 1,
                                        created_date: dt,
                                        balance: (isReversal === false) ? Number(total - chargedCost).toFixed(2) : Number(total + chargedCost).toFixed(2),
                                        is_capital: 0,
                                        isApproved: 1,
                                        postDone: 1,
                                        reviewDone: 1,
                                        approvalDone: 1,
                                        ref_no: (isReversal === false) ? refId : `${chargeForDeposit[0].ref_no}-R`,
                                        updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                        investmentId: data.investmentId,
                                        createdBy: data.createdBy
                                    };
                                    query = `INSERT INTO investment_txns SET ?`;
                                    endpoint = `/core-service/post?query=${query}`;
                                    let url = `${HOST}${endpoint}`;
                                    axios.post(url, inv_txn)
                                        .then(function (payload) {
                                            if (payload.data.status === undefined) {
                                                if (isReversal === false) {
                                                    let txnAmount2 = Number(chargedCost).toFixed(2);
                                                    let txnBal = Number(total - chargedCost).toFixed(2);
                                                    deductVatTax(HOST, data, txnAmount2, inv_txn, txnBal).then(result => {
                                                        resolve(result);
                                                    }, err => {
                                                        resolve({});
                                                    });
                                                } else {
                                                    resolve({});
                                                }
                                            }
                                        }, err => {
                                            resolve({});
                                        });
                                } else {
                                    resolve({});
                                }

                            } else {
                                let getInvestBalance = response_product.data[response_product.data.length - 1];
                                getInvestBalance.minimum_bal_charges = (getInvestBalance.minimum_bal_charges === '') ? '0' : getInvestBalance.minimum_bal_charges;
                                let chargedCostMinBal = (getInvestBalance.minimum_bal_charges_opt === 'Fixed')
                                    ? parseFloat(getInvestBalance.minimum_bal_charges.split(',').join(''))
                                    : ((parseFloat(getInvestBalance.minimum_bal_charges.split(',').join('')) / 100) * parseFloat(getInvestBalance.txnBalance.split(',').join('')));
                                if ((parseFloat(getInvestBalance.txnBalance.split(',').join('')) - parseFloat(getInvestBalance.txnAmount.split(',').join(''))) < parseFloat(getInvestBalance.minimum_bal.split(',').join(''))) {
                                    refId = moment().utcOffset('+0100').format('x');
                                    let inv_txn = {
                                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                        description: 'Charge: ' + getInvestBalance.description,
                                        amount: Number(chargedCostMinBal).toFixed(2),
                                        is_credit: 0,
                                        created_date: dt,
                                        balance: Number(getInvestBalance.txnBalance - chargedCostMinBal).toFixed(2),
                                        is_capital: 0,
                                        isCharge: 1,
                                        isApproved: 1,
                                        postDone: 1,
                                        reviewDone: 1,
                                        approvalDone: 1,
                                        ref_no: refId,
                                        updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                        investmentId: data.investmentId,
                                        createdBy: data.createdBy
                                    };
                                    query = `INSERT INTO investment_txns SET ?`;
                                    endpoint = `/core-service/post?query=${query}`;
                                    let url = `${HOST}${endpoint}`;
                                    axios.post(url, inv_txn)
                                        .then(function (payload) {
                                            if (payload.data.status === undefined) {
                                                let txnAmount2 = Number(chargedCostMinBal).toFixed(2);
                                                let txnBal = Number(getInvestBalance.txnBalance - chargedCostMinBal).toFixed(2);
                                                deductVatTax(HOST, data, txnAmount2, inv_txn, txnBal).then(result => {
                                                    resolve(result);
                                                }, err => {
                                                    resolve({});
                                                });
                                            }
                                        }, err => { });
                                }

                                let currentDate = new Date();
                                let formatedDate = `${currentDate.getUTCFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
                                if (response_product.data[0].withdrawal_freq_duration === 'Daily') {
                                    query = `SELECT * FROM investment_txns WHERE 
                                        STR_TO_DATE(updated_date, '%Y-%m-%d') = '${formatedDate}' 
                                        AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                    axios.get(url, {
                                        params: {
                                            query: query
                                        }
                                    }).then(response_product_ => {
                                        if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal) && parseInt(response_product.data[0].freq_withdrawal) !== 0) {
                                            let _getInvestBalance = response_product.data[response_product.data.length - 1];
                                            let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                    parseFloat(_getInvestBalance.txnAmount.split(',').join('')));
                                            if ((parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - parseFloat(_getInvestBalance.txnAmount.split(',').join(''))) >
                                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join(''))) {
                                                refId = moment().utcOffset('+0100').format('x');
                                                let inv_txn = {
                                                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                    description: 'Charge: Exceeding the total number of daily withdrawal',
                                                    amount: Number(_chargedCostMinBal).toFixed(2),
                                                    is_credit: 0,
                                                    created_date: dt,
                                                    balance: Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2),
                                                    is_capital: 0,
                                                    isCharge: 1,
                                                    isApproved: 1,
                                                    postDone: 1,
                                                    reviewDone: 1,
                                                    approvalDone: 1,
                                                    ref_no: refId,
                                                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                    investmentId: data.investmentId,
                                                    createdBy: data.createdBy
                                                };

                                                query = `INSERT INTO investment_txns SET ?`;
                                                endpoint = `/core-service/post?query=${query}`;
                                                let url = `${HOST}${endpoint}`;
                                                axios.post(url, inv_txn)
                                                    .then(function (payload) {
                                                        if (payload.data.status === undefined) {
                                                            let txnAmount2 = Number(_chargedCostMinBal).toFixed(2);
                                                            let txnBal = Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2);
                                                            deductVatTax(HOST, data, txnAmount2, inv_txn, txnBal).then(result => {
                                                                resolve(result);
                                                            }, err => {
                                                                resolve({});
                                                            });
                                                        }
                                                    }, err => { });
                                            } else {
                                                resolve({});
                                            }
                                        } else {
                                            resolve({});
                                        }
                                    });
                                } else if (response_product.data[0].withdrawal_freq_duration === 'Weekly') {

                                    let weekStartDate = startOfWeek(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));
                                    let endOfTheWeek = endOfWeek(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));
                                    query = `SELECT * FROM investment_txns v WHERE 
                                        STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${weekStartDate}' 
                                        AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheWeek}' 
                                        AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                    axios.get(url, {
                                        params: {
                                            query: query
                                        }
                                    }).then(response_product_ => {
                                        if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal) && parseInt(response_product.data[0].freq_withdrawal) !== 0) {
                                            let _getInvestBalance = response_product.data[response_product.data.length - 1];
                                            let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                    parseFloat(_getInvestBalance.txnAmount.split(',').join('')));
                                            if ((parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - parseFloat(_getInvestBalance.txnAmount.split(',').join(''))) >
                                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join(''))) {
                                                refId = moment().utcOffset('+0100').format('x');
                                                let inv_txn = {
                                                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                    description: 'Charge: Exceeding the total number of weekly withdrawal',
                                                    amount: Number(_chargedCostMinBal).toFixed(2),
                                                    is_credit: 0,
                                                    created_date: dt,
                                                    balance: Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2),
                                                    is_capital: 0,
                                                    isCharge: 1,
                                                    isApproved: 1,
                                                    postDone: 1,
                                                    reviewDone: 1,
                                                    approvalDone: 1,
                                                    ref_no: refId,
                                                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                    investmentId: data.investmentId,
                                                    createdBy: data.createdBy
                                                };

                                                query = `INSERT INTO investment_txns SET ?`;
                                                endpoint = `/core-service/post?query=${query}`;
                                                let url = `${HOST}${endpoint}`;
                                                axios.post(url, inv_txn)
                                                    .then(function (payload) {
                                                        if (payload.data.status === undefined) {
                                                            let txnAmount2 = Number(_chargedCostMinBal).toFixed(2);
                                                            let txnBal = Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2);
                                                            deductVatTax(HOST, data, txnAmount2, inv_txn, txnBal).then(result => {
                                                                resolve(result);
                                                            }, err => {
                                                                resolve({});
                                                            });
                                                        }
                                                    }, err => { });
                                            } else {
                                                resolve({});
                                            }
                                        } else {
                                            resolve({});
                                        }
                                    });
                                } else if (response_product.data[0].withdrawal_freq_duration === 'Monthly') {
                                    let monthStartDate = startOfMonth(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));
                                    let endOfTheMonth = endOfMonth(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));

                                    query = `SELECT * FROM investment_txns v WHERE 
                                        STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${monthStartDate}' 
                                        AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheMonth}' 
                                        AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                    let endpoint = `/core-service/get`;
                                    url = `${HOST}${endpoint}`;
                                    axios.get(url, {
                                        params: {
                                            query: query
                                        }
                                    }).then(response_product_ => {
                                        if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal) && parseInt(response_product.data[0].freq_withdrawal) !== 0) {
                                            let _getInvestBalance = response_product.data[response_product.data.length - 1];
                                            let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                    parseFloat(_getInvestBalance.txnAmount.split(',').join('')));
                                            if ((parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - parseFloat(_getInvestBalance.txnAmount.split(',').join(''))) >
                                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join(''))) {
                                                refId = moment().utcOffset('+0100').format('x');
                                                let inv_txn = {
                                                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                    description: 'Charge: Exceeding the total number of monthly withdrawal',
                                                    amount: Number(_chargedCostMinBal).toFixed(2),
                                                    is_credit: 0,
                                                    created_date: dt,
                                                    balance: Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2),
                                                    is_capital: 0,
                                                    isCharge: 1,
                                                    isApproved: 1,
                                                    postDone: 1,
                                                    reviewDone: 1,
                                                    approvalDone: 1,
                                                    ref_no: refId,
                                                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                    investmentId: data.investmentId,
                                                    createdBy: data.createdBy
                                                };

                                                query = `INSERT INTO investment_txns SET ?`;
                                                endpoint = `/core-service/post?query=${query}`;
                                                let url = `${HOST}${endpoint}`;
                                                axios.post(url, inv_txn)
                                                    .then(function (payload) {
                                                        if (payload.data.status === undefined) {
                                                            let txnAmount2 = Number(_chargedCostMinBal).toFixed(2);
                                                            let txnBal = Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2);
                                                            deductVatTax(HOST, data, txnAmount2, inv_txn, txnBal).then(result => {
                                                                resolve(result);
                                                            }, err => {
                                                                resolve({});
                                                            });
                                                        }
                                                    }, err => { });
                                            } else {
                                                resolve({});
                                            }
                                        } else {
                                            resolve({});
                                        }
                                    });
                                } else if (response_product.data[0].withdrawal_freq_duration === 'Quaterly') {
                                    let quaterStartDate = startOfQuarter(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()))
                                    let endOfTheMonth = endOfQuarter(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));

                                    query = `SELECT * FROM investment_txns v WHERE 
                                        STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${quaterStartDate}' 
                                        AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheMonth}' 
                                        AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                    let endpoint = `/core-service/get`;
                                    url = `${HOST}${endpoint}`;
                                    axios.get(url, {
                                        params: {
                                            query: query
                                        }
                                    }).then(response_product_ => {
                                        if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal) && parseInt(response_product.data[0].freq_withdrawal) !== 0) {
                                            let _getInvestBalance = response_product.data[response_product.data.length - 1];
                                            let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                    parseFloat(_getInvestBalance.txnAmount.split(',').join('')));
                                            if ((parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - parseFloat(_getInvestBalance.txnAmount.split(',').join(''))) >
                                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join(''))) {
                                                refId = moment().utcOffset('+0100').format('x');
                                                let inv_txn = {
                                                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                    description: 'Charge: Exceeding the total number of quaterly withdrawal',
                                                    amount: Number(_chargedCostMinBal).toFixed(2),
                                                    is_credit: 0,
                                                    created_date: dt,
                                                    balance: Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2),
                                                    is_capital: 0,
                                                    isCharge: 1,
                                                    isApproved: 1,
                                                    postDone: 1,
                                                    reviewDone: 1,
                                                    approvalDone: 1,
                                                    ref_no: refId,
                                                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                    investmentId: data.investmentId,
                                                    createdBy: data.createdBy
                                                };

                                                query = `INSERT INTO investment_txns SET ?`;
                                                endpoint = `/core-service/post?query=${query}`;
                                                let url = `${HOST}${endpoint}`;
                                                axios.post(url, inv_txn)
                                                    .then(function (payload) {
                                                        if (payload.data.status === undefined) {
                                                            let txnAmount2 = Number(_chargedCostMinBal).toFixed(2);
                                                            let txnBal = Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2);
                                                            deductVatTax(HOST, data, txnAmount2, inv_txn, txnBal).then(result => {
                                                                resolve(result);
                                                            }, err => {
                                                                resolve({});
                                                            });
                                                        }
                                                    }, err => { });
                                            } else {
                                                resolve({});
                                            }
                                        } else {
                                            resolve({});
                                        }
                                    });

                                } else if (response_product.data[0].withdrawal_freq_duration === 'Yearly') {
                                    //endOfYear
                                    let beginOfTheMonth = new Date(currentDate.getUTCFullYear(), 1, 1);
                                    let endOfTheMonth = endOfYear(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));

                                    query = `SELECT * FROM investment_txns v WHERE 
                                        STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${beginOfTheMonth}' 
                                        AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheMonth}' 
                                        AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                    let endpoint = `/core-service/get`;
                                    url = `${HOST}${endpoint}`;
                                    axios.get(url, {
                                        params: {
                                            query: query
                                        }
                                    }).then(response_product_ => {
                                        if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal) && parseInt(response_product.data[0].freq_withdrawal) !== 0) {
                                            let _getInvestBalance = response_product.data[response_product.data.length - 1];
                                            let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                    parseFloat(_getInvestBalance.txnAmount.split(',').join('')));
                                            if ((parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - parseFloat(_getInvestBalance.txnAmount.split(',').join(''))) >
                                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join(''))) {
                                                refId = moment().utcOffset('+0100').format('x');
                                                let inv_txn = {
                                                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                    description: 'CHARGE: EXCEEDING THE TOTAL NUMBER OF WITHDRAWAL',
                                                    amount: Number(_chargedCostMinBal).toFixed(2),
                                                    is_credit: 0,
                                                    created_date: dt,
                                                    balance: Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2),
                                                    is_capital: 0,
                                                    isCharge: 1,
                                                    isApproved: 1,
                                                    postDone: 1,
                                                    reviewDone: 1,
                                                    approvalDone: 1,
                                                    ref_no: refId,
                                                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                    investmentId: data.investmentId,
                                                    createdBy: data.createdBy
                                                };

                                                query = `INSERT INTO investment_txns SET ?`;
                                                endpoint = `/core-service/post?query=${query}`;
                                                let url = `${HOST}${endpoint}`;
                                                axios.post(url, inv_txn)
                                                    .then(function (payload) {
                                                        if (payload.data.status === undefined) {
                                                            let txnAmount2 = Number(_chargedCostMinBal).toFixed(2);
                                                            let txnBal = Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2);
                                                            deductVatTax(HOST, data, txnAmount2, inv_txn, txnBal).then(result => {
                                                                resolve(result);
                                                            }, err => {
                                                                resolve({});
                                                            });
                                                        }
                                                    }, err => { });
                                            } else {
                                                resolve({});
                                            }
                                        } else {
                                            resolve({});
                                        }
                                    });
                                }
                            }
                        } else {
                            resolve({});
                        }
                    }, err => { });
                } else {
                    resolve({});
                }
            });
        }
    });
}

function deductVatTax(HOST, data, _amount, txn, balance) {
    return new Promise((resolve, reject) => {
        if (data.isInvestmentMatured.toString() === '0') {
            let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            let query = `SELECT * FROM investment_config ORDER BY ID DESC LIMIT 1`;
            let endpoint = '/core-service/get';
            let url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(response => {
                if (response.data.status === undefined) {
                    let configData = response.data[0];
                    let configAmount = (configData.vatChargeMethod === 'Fixed') ? configData.withHoldingTax : (parseFloat(configData.withHoldingTax.toString()) * parseFloat(_amount.toString())) / 100;
                    let _refId = moment().utcOffset('+0100').format('x');
                    let _mBalance = Number(parseFloat(balance)).toFixed(2) - parseFloat(configAmount);
                    let inv_txn = {
                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                        description: `VAT ON CHARGE TRANSACTION WITH REF.: <strong>${txn.ref_no}</strong>`,
                        amount: Number(parseFloat(configAmount)).toFixed(2),
                        is_credit: 0,
                        created_date: dt,
                        balance: Number(parseFloat(_mBalance)).toFixed(2),
                        is_capital: 0,
                        isCharge: 1,
                        isApproved: 1,
                        postDone: 1,
                        reviewDone: 1,
                        investmentId: data.investmentId,
                        approvalDone: 1,
                        ref_no: _refId,
                        updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                        createdBy: data.createdBy,
                        isVat: 1
                    };
                    setInvestmentTxns(HOST, inv_txn).then(result => {
                        let result_ = balance - configAmount;
                        resolve(result_);
                    }, err_ => {
                        reject(err_);
                    });
                }
            }, err => {
                reject(err);
            });
        } else {
            resolve({});
        }
    });

}

router.post('/compute-interest', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = req.body;
    computeInterestTxns(HOST, data).then(payload => {
        res.send(payload.data);
    }, err => {
        res.send(err);
    });
});

router.get('/mature-interest-months/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    monthlyMaturedInvestmentDate(HOST, req.params.id).then(payload => {
        const data = payload.data.filter(x => isPast(endOfMonth(`${x.year}-${x.month}`)));
        res.send(data);
    }, err => {
        res.send(err);
    });
});

router.get('/client-interests/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT * FROM investment_interests 
    WHERE investmentId = ${req.params.id} AND amount LIKE "${search_string}%" ${order} LIMIT ${limit} OFFSET ${offset}`;

    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    var data = [];
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) as recordsFiltered FROM investment_interests 
        WHERE investmentId = ${req.params.id}
        AND amount LIKE "${search_string}%"`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            query = `SELECT count(*) as recordsTotal FROM investment_interests WHERE investmentId = ${req.params.id}`;
            endpoint = '/core-service/get';
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(payload2 => {
                res.send({
                    draw: draw,
                    recordsTotal: payload2.data[0].recordsTotal,
                    recordsFiltered: payload.data[0].recordsFiltered,
                    data: (response.data === undefined) ? [] : response.data
                });
            });
        });
    });
});

router.get('/investment-statements/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT v.ID,v.ref_no,c.fullname,v.description,v.amount,v.updated_date,p.ID as productId,u.fullname as createdByName,
    v.approvalDone,v.reviewDone,v.postDone,p.code,p.name,i.investment_start_date, v.ref_no, v.isApproved,v.is_credit,
    v.balance,v.is_capital,v.investmentId,i.isTerminated, i.isMatured FROM investment_txns v 
    left join investments i on v.investmentId = i.ID
    left join clients c on i.clientId = c.ID
    left join users u on u.ID = v.createdBy
    left join investment_products p on i.productId = p.ID
    WHERE v.investmentId = ${req.params.id} AND STR_TO_DATE(v.updated_date, '%Y-%m-%d')>= '${req.query.startDate}' AND STR_TO_DATE(v.updated_date, '%Y-%m-%d')<= '${req.query.endDate}' AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%") LIMIT ${limit} OFFSET ${offset}`;

    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    var data = [];
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) as recordsFiltered FROM investment_txns v 
    left join investments i on v.investmentId = i.ID
    left join clients c on i.clientId = c.ID 
    left join investment_products p on i.productId = p.ID
    WHERE v.investmentId = ${req.params.id} AND STR_TO_DATE(v.updated_date, '%Y-%m-%d')>= '${req.query.startDate}' 
    AND STR_TO_DATE(v.updated_date, '%Y-%m-%d')<= '${req.query.endDate}'
    AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%")`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            query = `SELECT count(*) as recordsTotal FROM investment_txns WHERE investmentId = ${req.params.id} 
            AND STR_TO_DATE(updated_date, '%Y-%m-%d')>= '${req.query.startDate}' AND STR_TO_DATE(updated_date, '%Y-%m-%d')<= '${req.query.endDate}'`;
            endpoint = '/core-service/get';
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(payload2 => {
                res.send({
                    draw: draw,
                    recordsTotal: payload2.data[0].recordsTotal,
                    recordsFiltered: payload.data[0].recordsFiltered,
                    data: (response.data === undefined) ? [] : response.data
                });
            });
        });
    }, err => { });
});


//Functions
async function monthlyMaturedInvestmentDate(host, investmentId) {
    let query = `SELECT DAY(updated_date) as day, MONTH(updated_date) AS month, YEAR(updated_date) AS year
    FROM investment_txns WHERE investmentId = ${investmentId} AND isApproved = 1 AND isInterestCharged = 0 AND isInterest = 0
    GROUP BY MONTH(updated_date), YEAR(updated_date)`;
    let endpoint = '/core-service/get';
    let url = `${host}${endpoint}`;
    try {
        const months = await axios.get(url, {
            params: {
                query: query
            }
        });
        return months;
    } catch (err) {
        return err;
    }
}

async function dailyMaturedInvestmentTxns(host, investmentId, firstDate, date) {
    let query = `SELECT t.*,a.investment_mature_date,a.investment_start_date, a.clientId,
    p.interest_rate, p.ID as productId, p.interest_moves_wallet FROM investment_txns t
    left join investments a on a.ID = t.investmentId
    left join investment_products p on p.ID = a.productId
    WHERE t.isWallet = 0 AND t.investmentId = ${investmentId} AND STR_TO_DATE(t.updated_date, '%Y-%m-%d') <= '${date}' 
    AND t.isApproved = 1 ORDER BY STR_TO_DATE(t.updated_date, '%Y-%m-%d %l:%i:%s %p') DESC LIMIT 1`;

    let endpoint = '/core-service/get';
    let url = `${host}${endpoint}`;
    try {
        const result = await axios.get(url, {
            params: {
                query: query
            }
        });
        return result;
    } catch (err) {
        return err;
    }
}

async function sumUpInvestmentInterest(host, investmentId) {
    let query = `SELECT SUM(amount) as total FROM investment_interests
    WHERE investmentId = ${investmentId} AND isPosted = 0`;
    let endpoint = '/core-service/get';
    let url = `${host}${endpoint}`;
    try {
        const result = await axios.get(url, {
            params: {
                query: query
            }
        });
        return result;
    } catch (err) {
        return err;
    }
}

async function setInvestmentInterest(host, value) {
    let query = `INSERT INTO investment_interests SET ?`;
    let endpoint = `/core-service/post?query=${query}`;
    let url = `${host}${endpoint}`;
    try {
        const result = await axios.post(url, value);
        return result;
    } catch (err) {
        return err;
    }
}

async function sumAllWalletInvestmentTxns(host, clientId) {
    let query = `SELECT SUM(amount) as total FROM investment_txns
            WHERE clientId = ${clientId} AND isWallet = ${1}`;
    let endpoint = '/core-service/get';
    let url = `${host}${endpoint}`;
    try {
        const result = await axios.get(url, {
            params: {
                query: query
            }
        });
        return result;
    } catch (err) {
        return err;
    }
}

function setInvestmentTxns(host, value) {
    return new Promise((resolve, reject) => {
        let query = `INSERT INTO investment_txns SET ?`;
        let endpoint = `/core-service/post?query=${query}`;
        let url = `${host}${endpoint}`;
        axios.post(url, value).then(payload => {
            resolve(payload.data);
        }, err => {
            resolve({});
        });
    });
}

async function getDatedTxns(host, data) {
    let query = `SELECT ID FROM investment_txns 
                 WHERE ID <> 0 AND investmentId = ${data.investmentId} 
                 AND CONCAT(YEAR(updated_date),'-',MONTH(updated_date)) = '${data.year}-${data.month}'`;
    let endpoint = '/core-service/get';
    let url = `${host}${endpoint}`;
    try {
        let result = await axios.get(url, {
            params: {
                query: query
            }
        });
        return result;
    } catch (error) {
        return error;
    }

}

async function updateDatedTxns(host, value) {
    for (let index = 0; index < value.length; index++) {
        const element = value[index];
        let query = `UPDATE investment_txns SET isInterestCharged = 1 
        WHERE ID = ${element.ID}`;
        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        try {
            await axios.get(url, {
                params: {
                    query: query
                }
            });

        } catch (error) { }
    }

}

async function computeInterestTxns(HOST, data) {
    try {
        let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let refId = moment().utcOffset('+0100').format('x');
        let currentDate = new Date();
        let daysInMonth = getDaysInMonth(new Date(currentDate.getUTCFullYear(), data.month));
        for (let index = data.startDay; index <= daysInMonth; index++) {
            let formatedDate = `${data.year}-${data.month}-${index}`;
            let startDate = `${data.year}-${data.month}-${data.startDay}`;
            let payload = await dailyMaturedInvestmentTxns(HOST, data.investmentId, startDate, formatedDate);
            if (payload.data.status === undefined) {
                if (payload.data.length > 0) {
                    let daysInYear = 365;
                    if (isLeapYear(new Date(formatedDate))) {
                        daysInYear = 366;
                    }
                    let totalInvestedAmount = parseFloat(payload.data[0].balance.split(',').join(''));
                    let interestInDays = payload.data[0].interest_rate / daysInYear;
                    let SI = (totalInvestedAmount * interestInDays) / 100;
                    let _amount = parseFloat(parseFloat(Number(SI * 100) / 100).toFixed(2));

                    let payload1 = await sumUpInvestmentInterest(HOST, data.investmentId);
                    // let bal_ = (payload1.data[0].total !== null) ? payload1.data[0].total + parseFloat(Number(_amount).toFixed(2)) : 0 + parseFloat(Number(_amount).toFixed(2));

                    let _bal_ = ((index === data.startDay) ? totalInvestedAmount : (totalInvestedAmount + parseFloat(payload1.data[0].total)));
                    let bal_ = _bal_ + parseFloat(Number(_amount).toFixed(2));

                    let dailyInterest = {
                        clientId: payload.data[0].clientId,
                        investmentId: data.investmentId,
                        createdAt: dt,
                        interestDate: formatedDate,
                        amount: Number(_amount).toFixed(2),
                        year: data.year,
                        month: data.month,
                        balance: Number(bal_).toFixed(2)
                    }
                    let payload2 = await setInvestmentInterest(HOST, dailyInterest);
                    if (index === daysInMonth) {
                        if (payload2.data.status === undefined) {
                            if (payload.data[0].interest_moves_wallet === 1) {
                                let payload3 = await sumAllWalletInvestmentTxns(HOST, payload.data[0].clientId);
                                bal_ = payload3.data[0].total + (payload1.data[0].total + parseFloat(Number(_amount).toFixed(2)));

                                let inv_txn = {
                                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                    description: `Balance ${payload3.data[0].total + (payload1.data[0].total + parseFloat(Number(_amount).toFixed(2)))} @${formatedDate}`,
                                    amount: payload1.data[0].total + parseFloat(Number(_amount).toFixed(2)),
                                    is_credit: 1,
                                    created_date: dt,
                                    balance: bal_,
                                    is_capital: 0,
                                    isCharge: 0,
                                    isApproved: 1,
                                    postDone: 1,
                                    reviewDone: 1,
                                    approvalDone: 1,
                                    ref_no: refId,
                                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                    investmentId: data.investmentId,
                                    createdBy: data.createdBy,
                                    clientId: payload.data[0].clientId,
                                    isWallet: 1,
                                    isInterest: 1
                                };

                                let setInv = await setInvestmentTxns(HOST, inv_txn);
                                deductWithHoldingTax(HOST, data, _amount, payload1.data[0].total, bal_, payload.data[0].clientId, 1, inv_txn);
                                let _formatedDate = new Date(formatedDate);
                                let query = `UPDATE investment_interests SET isPosted = 1 
                                        WHERE id <> 0 AND investmentId = ${data.investmentId} 
                                        AND month = ${_formatedDate.getMonth()} 
                                        AND year = ${_formatedDate.getFullYear()}`;

                                endpoint = '/core-service/get';
                                url = `${HOST}${endpoint}`;
                                axios.get(url, {
                                    params: {
                                        query: query
                                    }
                                });
                                getDatedTxns(HOST, data).then(datedTxns => {
                                    updateDatedTxns(HOST, datedTxns.data).then(updatedDates => { });
                                });
                            } else {
                                let _amt = parseFloat(payload1.data[0].total.toString()) + parseFloat(_amount.toString());
                                let inv_txn = {
                                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                    description: `Investment interest@ ${formatedDate}`,
                                    amount: Number(_amt).toFixed(2),
                                    is_credit: 1,
                                    created_date: dt,
                                    balance: totalInvestedAmount + (payload1.data[0].total + parseFloat(Number(_amount).toFixed(2))),
                                    is_capital: 0,
                                    isCharge: 0,
                                    isApproved: 1,
                                    postDone: 1,
                                    reviewDone: 1,
                                    approvalDone: 1,
                                    ref_no: refId,
                                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                    investmentId: data.investmentId,
                                    createdBy: data.createdBy,
                                    isInterest: 1
                                };
                                await setInvestmentTxns(HOST, inv_txn);
                                let bal2 = totalInvestedAmount + (payload1.data[0].total + parseFloat(Number(_amount).toFixed(2)));
                                await deductWithHoldingTax(HOST, data, _amount, payload1.data[0].total, bal2, '', 0, inv_txn);
                                let _formatedDate = new Date(formatedDate);
                                query = `UPDATE investment_interests SET isPosted = 1 
                                WHERE id <> 0 AND investmentId = ${data.investmentId} 
                                AND month = ${_formatedDate.getMonth()} 
                                AND year = ${_formatedDate.getFullYear()}`;
                                endpoint = '/core-service/get';
                                url = `${HOST}${endpoint}`;
                                axios.get(url, {
                                    params: {
                                        query: query
                                    }
                                });
                                getDatedTxns(HOST, data).then(datedTxns => {
                                    updateDatedTxns(HOST, datedTxns.data).then(updatedDates => { });
                                });
                            }
                        }
                    }
                }
            }
        }
        return {};
    } catch (error) {
        return error;
    }
}

async function deductWithHoldingTax(HOST, data, _amount, total, bal_, clientId, isWallet, txn) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `SELECT * FROM investment_config ORDER BY ID DESC LIMIT 1`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        if (response.data.status === undefined) {
            let configData = response.data[0];
            let configAmount = (configData.withHoldingTaxChargeMethod == 'Fixed') ? configData.vat : (configData.vat * (total + parseFloat(Number(_amount).toFixed(2)))) / 100;
            let refId = moment().utcOffset('+0100').format('x');
            let balTotal = bal_ - configAmount;
            let inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                description: `WITH-HOLDING TAX ON INTEREST TRANSACTION WITH REF.: <strong>${txn.ref_no}</strong>`,
                amount: Number(configAmount).toFixed(2),
                is_credit: 0,
                created_date: dt,
                balance: Number(balTotal).toFixed(2),
                is_capital: 0,
                isCharge: 0,
                isApproved: 1,
                isWithHoldings: 1,
                postDone: 1,
                reviewDone: 1,
                approvalDone: 1,
                ref_no: refId,
                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                investmentId: data.investmentId,
                createdBy: data.createdBy,
                clientId: clientId,
                isWallet: isWallet
            };
            setInvestmentTxns(HOST, inv_txn).then(result => {
                return result;
            }, err => {
                return {};
            });
        }
    }, err => { })
}

router.get('/client-wallets/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    //ORDER BY STR_TO_DATE(v.created_date, '%Y-%m-%d') ${aoData[2].value[0].dir}
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT 
    (Select balance from investment_txns WHERE isWallet = 1 AND clientId = ${req.params.id} ORDER BY STR_TO_DATE(updated_date, '%Y-%m-%d %l:%i:%s %p') DESC LIMIT 1) as balance,
    v.ID,v.ref_no,c.fullname,v.description,v.created_date,v.amount,v.balance as txnBalance,v.txn_date,p.ID as productId,u.fullname as createdByName,
    v.isDeny,v.isPaymentMadeByWallet,v.isReversedTxn,v.isTransfer,v.isMoveFundTransfer,v.beneficialInvestmentId,p.interest_disbursement_time,p.interest_moves_wallet,
    v.approvalDone,v.reviewDone,v.postDone,p.code,p.name,i.investment_start_date, v.ref_no, v.isApproved,v.is_credit,v.isInvestmentTerminated,
    p.acct_allows_withdrawal,i.investment_mature_date,p.interest_rate,v.isForceTerminate,v.isInvestmentMatured,p.inv_moves_wallet,
    i.clientId,p.canTerminate,v.is_capital,v.investmentId,i.isTerminated,v.isWallet, v.updated_date, i.isMatured FROM investment_txns v 
    left join investments i on v.investmentId = i.ID 
    left join clients c on i.clientId = c.ID
    left join users u on u.ID = v.createdBy
    left join investment_products p on i.productId = p.ID
    WHERE v.isWallet = 1 AND v.clientId = ${req.params.id} ORDER BY STR_TO_DATE(v.updated_date, '%Y-%m-%d %l:%i:%s %p') LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    var data = [];
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let uniqueTxns = [];
        response.data.map(d => {
            let chk = uniqueTxns.filter(x => x.ID === d.ID);
            if (chk.length === 0) {
                uniqueTxns.push(d);
                uniqueTxns[uniqueTxns.length - 1].roleIds = [];
                uniqueTxns[uniqueTxns.length - 1].roleIds.push({
                    roles: d.roleId,
                    status: d.status,
                    operationId: d.operationId
                });
                delete uniqueTxns[uniqueTxns.length - 1].roleId;
                delete uniqueTxns[uniqueTxns.length - 1].roleId;
            } else {
                chk[0].roleIds.push({
                    roles: d.roleId,
                    operationId: d.operationId
                });
            }
        });
        query = `SELECT count(*) as recordsFiltered FROM investment_txns 
        WHERE isWallet = 1 AND clientId = ${req.params.id}
        AND (upper(description) LIKE "${search_string}%" OR upper(ref_no) LIKE "${search_string}%")`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            query = `Select 
            (Select balance from investment_txns WHERE isWallet = 1 AND clientId = ${req.params.id} AND isApproved = 1 AND postDone = 1 ORDER BY STR_TO_DATE(updated_date, '%Y-%m-%d %l:%i:%s %p') DESC LIMIT 1) as txnCurrentBalance,
            (SELECT count(*) as recordsTotal FROM investment_txns WHERE isWallet = 1 AND clientId = ${req.params.id}) as recordsTotal`;

            // query = `SELECT count(*) as recordsTotal FROM investment_txns WHERE clientId = ${req.params.id}`;
            endpoint = '/core-service/get';
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(payload2 => {
                res.send({
                    draw: draw,
                    txnCurrentBalance: (payload2.data[0].txnCurrentBalance === '') ? 0 : payload2.data[0].txnCurrentBalance,
                    recordsTotal: payload2.data[0].recordsTotal,
                    recordsFiltered: payload.data[0].recordsFiltered,
                    data: (uniqueTxns === undefined) ? [] : uniqueTxns
                });
            }, err => {
            });
        });
    });
});

router.get('/client-wallet-balance/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `Select balance from investment_txns WHERE isWallet = 1 AND clientId = ${req.params.id} AND isApproved = 1 AND postDone = 1 ORDER BY STR_TO_DATE(updated_date, '%Y-%m-%d %l:%i:%s %p') DESC LIMIT 1`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;

    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        if (response.data.length === 0) {
            response.data = [{ balance: 0.00 }];
        }
        res.send(response.data);
    }, err => {
        res.send(err);
    });
});

//Get Investment Product
router.get('/investment-accounts/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let page = ((req.query.page - 1) * 10 < 0) ? 0 : (req.query.page - 1) * 10;
    let search_string = (req.query.search_string === undefined) ? "" : req.query.search_string.toUpperCase();
    let query = '';
    if (req.params.id.toString() === '0') {
        query = `SELECT v.ID,v.code,v.clientId,c.fullname AS name,v.productId, p.name as productName FROM investments v 
        left join clients c on v.clientId = c.ID 
        left join investment_products p on p.ID = v.productId
        WHERE v.isClosed = 0 AND v.ID != ${parseInt(req.query.excludedItem)} AND c.ID = ${req.query.clientId} AND upper(v.code) LIKE "${search_string}%" AND upper(c.fullname) 
        LIKE "${search_string}%" AND upper(p.name) LIKE "${search_string}%" ORDER BY v.ID desc LIMIT ${limit} OFFSET ${page}`;
    } else {
        query = `SELECT v.ID,v.code,v.clientId,c.fullname AS name,v.productId, p.name as productName FROM investments v 
        left join clients c on v.clientId = c.ID 
        left join investment_products p on p.ID = v.productId
        WHERE v.isClosed = 0 AND c.ID != ${req.query.clientId} AND upper(v.code) LIKE "${search_string}%" AND upper(c.fullname) 
        LIKE "${search_string}%" AND upper(p.name) LIKE "${search_string}%" ORDER BY v.ID desc LIMIT ${limit} OFFSET ${page}`;
    }
    const endpoint = "/core-service/get";
    const url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    })
        .then(function (response) {
            res.send(response.data);
        }, err => {
            res.send(err);
        })
        .catch(function (error) {
            res.send(error);
        });
});


router.get('/inv-statements/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = req.query;
    let query = `SELECT v.ID,v.ref_no,c.fullname,v.description,v.amount,v.txn_date,p.ID as productId,u.fullname as createdByName,
    v.approvalDone,v.reviewDone,v.postDone,p.code,p.name,i.investment_start_date,i.investment_mature_date, v.ref_no, v.isApproved,v.is_credit,i.clientId,
    v.balance,v.is_capital,v.investmentId,i.isTerminated, i.isMatured FROM investment_txns v 
    left join investments i on v.investmentId = i.ID
    left join clients c on i.clientId = c.ID
    left join users u on u.ID = v.createdBy
    left join investment_products p on i.productId = p.ID
    WHERE v.isWallet = 0 AND v.investmentId = ${req.params.id} AND STR_TO_DATE(v.txn_date, '%Y-%m-%d') >= '${data.startDate}' AND STR_TO_DATE(v.txn_date, '%Y-%m-%d') <= '${data.endDate}' AND v.isApproved = 1 ORDER BY STR_TO_DATE(v.updated_date, '%Y-%m-%d %l:%i:%s %p')`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        if (response.data.status === undefined) {
            res.send(response.data);
        } else {
            res.send(response.data);
        }
    }, err => {
        res.send(err);
    });
});

router.get('/get-organisation-configs', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT * FROM investment_config ORDER BY ID DESC LIMIT 1`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        if (response.data.status === undefined) {
            res.send(response.data);
        } else {
            res.send(response.data);
        }
    }, err => {
        res.send(err);
    });
});


router.get('/get-organisation-taxes', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT * FROM investment_txns 
    WHERE isCharge = 1 || isVat = 1 || isWithHoldings = 1
    AND (upper(description) LIKE "${search_string}%" OR upper(amount) LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;

    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) as recordsFiltered 
        FROM investment_txns 
        WHERE isCharge = 1 || isVat = 1 || isWithHoldings = 1
        AND (upper(description) LIKE "${search_string}%" OR upper(amount) LIKE "${search_string}%")`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            query = `SELECT count(*) as recordsTotal 
            FROM investment_txns 
            WHERE isCharge = 1 || isVat = 1 || isWithHoldings = 1`;
            endpoint = '/core-service/get';
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(payload2 => {
                res.send({
                    draw: draw,
                    recordsTotal: payload2.data[0].recordsTotal,
                    recordsFiltered: payload.data[0].recordsFiltered,
                    data: response.data
                });
            });
        });
    });
});

router.get('/get-sum-charges', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT * FROM investment_txns 
    WHERE isCharge = 1 || isVat = 1 || isWithHoldings = 1`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        if (response.data.status === undefined) {
            let chargeTotal = 0;
            let vatTotal = 0;
            let withHoldingTaxTotal = 0;
            if (response.data.length > 0) {
                response.data.map(x => {
                    if (x.isCharge === 1) {
                        chargeTotal += parseFloat(x.amount.toString());
                    } else if (x.isVat === 1) {
                        vatTotal += parseFloat(x.amount.toString());
                    } else if (x.isWithHoldings === 1) {
                        withHoldingTaxTotal += parseFloat(x.amount.toString());
                    }
                });
            }
            res.send({
                chargeTotal: chargeTotal,
                vatTotal: vatTotal,
                withHoldingTaxTotal: withHoldingTaxTotal
            })
        } else {
            res.send(response.data);
        }
    }, err => {
        res.send(err);
    });
});

router.get('/check-reverse-txns/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT isApproved FROM investment_txns 
    WHERE isReversedTxn = 1 AND parentTxnId = ${req.params.id}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        if (response.data.status === undefined) {
            res.send(response.data[0]);
        } else {
            res.send(response.data);
        }
    }, err => {
        res.send(err);
    });
});



module.exports = router;