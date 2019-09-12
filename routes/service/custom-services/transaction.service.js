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
const addDays = require('date-fns/add_days');
const isSameMonth = require('date-fns/is_same_month');
var differenceInCalendarDays = require('date-fns/difference_in_calendar_days');
const sRequest = require('../s_request');
const isAfter = require('date-fns/is_after');
var isLastDayOfMonth = require('date-fns/is_last_day_Of_month');

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

function organisationSettings(HOST) {
    return new Promise((resolve, reject) => {
        let query = `SELECT c.*, p.min_days_termination, p.name as productName, p.code FROM investment_config c
                    left join investment_products p on p.ID = c.walletProductId ORDER BY ID DESC LIMIT 1`;
        let endpoint = '/core-service/get';
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response => {
            resolve(response.data[0].walletProductId);
        }, err => {
            resolve(0);
        })
    });
}


router.post('/create', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    var data = req.body
    const dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let refId = moment().utcOffset('+0100').format('x');
    organisationSettings(HOST).then(config => {
        data.productId = (data.isWallet === '1') ? config : data.productId;
        computeAccountBalanceIncludeInterest(data.investmentId, HOST).then(balanceIncludingInterest => {
            computeTotalBalance(data.clientId, data.investmentId, HOST).then(totalBalance_ => {
                let total = (data.isWallet.toString() === '1') ? totalBalance_.currentWalletBalance : balanceIncludingInterest;
                let inv_txn = {
                    txn_date: (data.txn_date !== undefined) ? data.txn_date : moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
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
                                    WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
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
            }).catch(function (error) {
                res.send({
                    status: 500,
                    error: error,
                    response: null
                });
            });
        });
    }, err => { });
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
                let sumTotalBalance = parseFloat(Number(total).toFixed(2)) - parseFloat(Number(data.amount.toString().split(',').join('')).toFixed(2));
                let inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                    description: `TRANSFER BETWEEN ${(data.creditedClientId !== '') ? 'CLIENTS WALLET' : 'CLIENT AND INVESTMENT ACCOUNT'} Transfer from : ${data.debitedClientName} to ${data.creditedClientName}`,
                    amount: Number(data.amount).toFixed(2),
                    is_credit: 0,
                    created_date: dt,
                    balance: Number(sumTotalBalance).toFixed(2),
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
                                    let _sumTotalBalance = parseFloat(Number(total).toFixed(2)) + parseFloat(Number(data.amount.toString().split(',').join('')).toFixed(2));
                                    let inv_txn = {
                                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                        description: `TRANSFER BETWEEN ${(data.creditedClientId !== '') ? 'CLIENTS WALLET' : 'CLIENT AND INVESTMENT ACCOUNT'} Transfer from : ${data.debitedClientName} to ${data.creditedClientName}`,
                                        amount: Number(data.amount).toFixed(2),
                                        is_credit: 1,
                                        created_date: dt,
                                        balance: Number(_sumTotalBalance).toFixed(2),
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
                        total_bal = (data.isWallet.toString() === '1') ?
                            totalBalance_.currentWalletBalance : totalBalance_.currentAcctBalance;
                        let bal = (data.isCredit.toString() === '1') ? (total_bal + parseFloat(data.amount.split(',').join(''))) :
                            (total_bal - parseFloat(data.amount.split(',').join('')));
                        let _amountTxn = Number(data.amount.split(',').join('')).toFixed(2);
                        // if (data.isInvestmentMatured.toString() === '1') {
                        //     bal = '0.00';
                        //     _amountTxn = interest_payload.balance
                        // }
                        if (data.isInvestmentTerminated.toString() === '0') {
                            const updateDate = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                            query = `UPDATE investment_txns SET isApproved = ${data.status}, 
                                        updated_date ='${updateDate}', createdBy = ${data.userId},postDone = ${data.status},
                                        amount = ${_amountTxn} , balance ='${Number(bal).toFixed(2)}'
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
                                            setcharges(data, HOST, false).then(payload => {
                                                upFrontInterest(data, HOST).then(payld2 => {
                                                    res.send(response.data);
                                                }, __err => {
                                                });
                                            }, err => {
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
                    });
                } else {
                    if (data.isInvestmentTerminated.toString() === '0') {
                        const updateDate_ = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                        query = `UPDATE investment_txns SET isApproved = ${0}, updated_date ='${updateDate_}', postDone = ${0}, isDeny = ${data.isDeny},
                            amount = ${Number(data.amount.split(',').join('')).toFixed(2)} , balance ='${Number(data.amount.split(',').join('')).toFixed(2)}'
                            WHERE ID =${data.txnId}`;
                        endpoint = `/core-service/get`;
                        url = `${HOST}${endpoint}`;
                        axios.get(url, {
                            params: {
                                query: query
                            }
                        })
                            .then(function (response_) {
                                fundBeneficialAccount(data, HOST).then(payloadf => {
                                    res.send(response.data);
                                });
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

async function fundBeneficialAccount(data, HOST) {
    if (data.isTransfer === '1') {
        return new Promise((resolve, reject) => {
            computeAccountBalanceIncludeInterest(data.beneficialInvestmentId, HOST).then(balanceIncludingInterest => {
                computeTotalBalance(data.clientId, data.beneficialInvestmentId, HOST).then(computedBalanceAmt => {
                    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    let refId = moment().utcOffset('+0100').format('x');
                    let total_bal = (data.isMoveFundTransfer.toString() === '1')
                        ? computedBalanceAmt.currentWalletBalance : balanceIncludingInterest;
                    let sumTotal = total_bal + parseFloat(data.amount.toString().split(',').join(''));
                    let inv_txn = {
                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                        description: data.description,
                        amount: Number(parseFloat(data.amount.toString())).toFixed(2),
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
        });
    } else if (data.isInvestmentTerminated === '1') {
        await chargeForceTerminate(data, HOST);
        let result = await reverseEarlierInterest(data, HOST);
        return result;
    }
}

function computeAccountBalanceIncludeInterest(investmentId, HOST) {
    return new Promise((resolve, reject) => {
        let query = `Select amount, is_credit from investment_txns 
        WHERE isWallet = 0 AND investmentId = ${investmentId} 
        AND isApproved = 1 AND postDone = 1`;
        let endpoint = `/core-service/get`;
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response_prdt_ => {
            let total = 0;
            if (response_prdt_.data.status === undefined) {
                response_prdt_.data.map(x => {
                    if (x.is_credit === 1) {
                        total += parseFloat(x.amount.toString());
                    } else {
                        total -= parseFloat(x.amount.toString());
                    }
                });
            }
            let result = parseFloat(Number(total).toFixed(2));
            resolve(result);
        }, err => {
            resolve(0);
        });
    });
}

function computeCurrentBalance(investmentId, HOST) {
    return new Promise((resolve, reject) => {
        let query = `Select amount, is_credit from investment_txns WHERE isWallet = 0 AND isInterest = 0 AND investmentId = ${investmentId} 
        AND isApproved = 1 AND postDone = 1`;
        let endpoint = `/core-service/get`;
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response_prdt_ => {
            let total = 0;
            response_prdt_.data.map(x => {
                if (x.is_credit === 1) {
                    total += parseFloat(x.amount.toString());
                } else {
                    total -= parseFloat(x.amount.toString());
                }
            });
            let result = parseFloat(Number(total).toFixed(2));
            resolve(result);
        }, err => {
            resolve(0);
        });
    });
}

function currentBalanceForInterestCalculation(investmentId, HOST) {
    return new Promise((resolve, reject) => {
        computeCurrentBalance(investmentId, HOST).then(balance => {
            resolve(balance);
        });
    });
}

async function computeTotalBalance(clientId, investmentId, HOST) {
    let currentAcctBalance = 0;
    let walletBalance = 0;
    if (investmentId !== '' && investmentId !== undefined && investmentId !== null) {
        currentAcctBalance = await computeCurrentBalance(investmentId, HOST);
    }
    walletBalance = await computeWalletBalance(clientId, HOST);
    return { currentAcctBalance: currentAcctBalance, currentWalletBalance: walletBalance.currentWalletBalance };
}

function computeWalletBalance(clientId, HOST) {
    return new Promise((resolve, reject) => {
        let query = `Select amount, is_credit from investment_txns WHERE isWallet = 1 AND clientId = ${clientId} 
        AND isApproved = 1 AND postDone = 1`;
        let endpoint = '/core-service/get';
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload2 => {
            let total = 0;
            payload2.data.map(x => {
                if (x.is_credit === 1) {
                    total += parseFloat(x.amount.toString());
                } else {
                    total -= parseFloat(x.amount.toString());
                }
            });
            let result = parseFloat(Number(total).toFixed(2));
            resolve({ currentWalletBalance: result });
        }, err => {
            resolve({ currentWalletBalance: 0 });
        });
    });
}

function getTerminatedOrMaturedInvestment(investmentId, HOST) {
    return new Promise((resolve, reject) => {
        let query = `Select investmentId,isInvestmentMatured from investment_txns where investmentId = ${(investmentId === '' || investmentId === undefined || investmentId === null) ? 0 : investmentId} AND (isInvestmentMatured = 1 or isInvestmentTerminated = 1) Limit 1`;
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

function updateTerminatedOrMaturedInvestment(investmentId, HOST, isInvestmentMatured) {
    return new Promise((resolve, reject) => {
        if (investmentId !== undefined && investmentId !== null && investmentId !== ''
            && isInvestmentMatured !== undefined && isInvestmentMatured !== null && isInvestmentMatured !== '') {
            let query = `UPDATE investments SET isClosed = 1, isMatured = 1 WHERE ID = ${investmentId}`;
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
        return new Promise((resolve, reject) => {
            computeAccountBalanceIncludeInterest(data.investmentId, HOST).then(balanceWithInterest => {
                computeTotalBalance(data.clientId, data.investmentId, HOST).then(totalAmt => {
                    let T = differenceInCalendarDays(
                        new Date(data.investment_mature_date.toString()),
                        new Date(data.investment_start_date.toString())
                    );
                    T = T + 1;
                    let daysInYear = 365;
                    if (isLeapYear(new Date())) {
                        daysInYear = 366;
                    }
                    let _time_ = 1 / daysInYear;
                    let SI = T * (totalAmt.currentAcctBalance * parseFloat(data.interest_rate.split(',').join('')) * _time_) / 100;
                    let total = 0;
                    if (data.interest_moves_wallet.toString() === '1') {
                        total = totalAmt.currentWalletBalance + SI;
                    } else {
                        total = balanceWithInterest + SI;
                    }
                    let _inv_txn = {
                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
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
                            computeTotalBalance(data.clientId, data.investmentId, HOST).then(totalAmt2 => {
                                _inv_txn.ID = _payload_.data.insertId;
                                deductWithHoldingTax(HOST, data, _inv_txn.amount, 0, totalAmt2.currentAcctBalance, data.clientId, data.isWallet, _inv_txn)
                                    .then(p__ => {
                                        resolve({});
                                    });
                            });
                        }, err => {
                            reject(err);
                        });
                });
            });
        });
    } else {
        return {};
    }
}


async function deductTransferCharge(data, HOST, amount) {
    return new Promise((resolve, reject) => {
        if (data.isInvestmentMatured.toString() === '0') {
            computeAccountBalanceIncludeInterest(data.investmentId, HOST).then(currentBalance => {
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
                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                            description: `FUND TRANSFER CHARGE ON REF.: <strong>${data.refId}</strong>`,
                            amount: Number(configAmount).toFixed(2),
                            is_credit: 0,
                            created_date: dt,
                            balance: Number(balTransfer).toFixed(2),
                            is_capital: 0,
                            isCharge: 1,
                            parentTxnId: data.ID,
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
                            deductVatTax(HOST, data, configAmount, inv_txn, inv_txn.balance).then(payload_1 => {
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
        isInterestCleared = 1,
        isMatured = 1,
        isClosed = 1
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
            computeAccountBalanceIncludeInterest(data.investmentId, HOST).then(balanceIncludingInterest => {
                computeCurrentBalance(data.investmentId, HOST).then(balance => {
                    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    let _refId = moment().utcOffset('+0100').format('x');
                    let query = `SELECT t.*,p.*,v.description,v.amount as txnAmount,
                    v.balance as txnBalance,v.isApproved,v.isInterestCharged,v.is_credit FROM investments t 
                    left join investment_products p on p.ID = t.productId
                    left join investment_txns v on v.investmentId = t.ID
                    WHERE v.investmentId = ${data.investmentId} AND v.isApproved = 1 ORDER BY v.ID DESC LIMIT 1`;
                    let endpoint = '/core-service/get';
                    let url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    }).then(response => {
                        if (response.data.status === undefined) {
                            let configData = response.data[0];
                            let _charge = (configData.min_days_termination_charge === null || configData.min_days_termination_charge === '') ? 0 : parseFloat(configData.min_days_termination_charge.toString());
                            let configAmount = (configData.opt_on_min_days_termination === 'Fixed')
                                ? _charge : ((_charge * balance) / 100);
                            let sumTotalBalance = balanceIncludingInterest - configAmount;
                            let inv_txn = {
                                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                description: `CHARGE ON INVESTMENT TERMINATION`,
                                amount: Number(configAmount).toFixed(2),
                                is_credit: 0,
                                created_date: dt,
                                balance: Number(sumTotalBalance).toFixed(2),
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
                                    deductVatTax(HOST, data, configAmount, inv_txn, inv_txn.balance).then(payload___ => {
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
            });
        } else {
            resolve({});
        }
    });
}



function getExistingInterests(data, HOST) {
    return new Promise((resolve, reject) => {
        let query = `SELECT v.ID,v.isWithHoldings, v.description,v.is_credit,v.amount as txnAmount,v.balance as txnBalance,v.isApproved,
        v.isInterest,v.isInterestCharged,v.is_credit,p.premature_interest_rate FROM investment_txns v
        LEFT JOIN investments i on i.ID = v.investmentId
        left join investment_products p on p.ID = i.productId
        WHERE (v.isInterest = 1 OR v.isWithHoldings = 1) AND investmentId = ${data.investmentId} AND isApproved = 1`;
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

async function getInterestEndOfTenure(HOST, data, _getProductConfigInterests) {
    const matureMonths = await getValidInvestmentMatureMonths(HOST, data.investmentId, 0);
    try {
        for (let index = 0; index < matureMonths.length; index++) {
            const element = matureMonths[index];
            let _data = {
                interest_moves_wallet: data.interest_moves_wallet,
                clientId: data.clientId,
                investmentId: data.investmentId,
                investment_start_date: data.investment_start_date,
                createdBy: data.createdBy,
                productId: data.productId,
                startDate: element.startDate,
                endDate: element.endDate,
                interest_rate: _getProductConfigInterests.interest_rate
            }
            await computeInterestTxns2(HOST, _data);
        }
        return {};
    } catch (error) {
        return error;
    }

}

function updateTerminatedInterest(HOST, data) {
    return new Promise((resolve, reject) => {
        let query = `UPDATE investment_interests SET isTerminated = 1 
        WHERE id <> 0 AND investmentId = ${data.investmentId}`;

        let endpoint = '/core-service/get';
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(axio_callback => {
            getDatedTxns(HOST, data).then(datedTxns => {
                updateDatedTxns(HOST, datedTxns, 0).then(updatedDates => {
                    resolve({});
                });
            });
        });
    });
}

async function reverseEarlierInterest(data, HOST) {
    const _getExistingInterests = await getExistingInterests(data, HOST);
    const _getProductConfigInterests = await getProductConfigInterests(data, HOST);
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD');
    let totalInterestAmount = 0;
    let totalInterestAmountWHT = 0;
    let reduceInterestRateApplied = _getExistingInterests.filter(x => x.premature_interest_rate !== '' && x.premature_interest_rate !== undefined && parseFloat(x.premature_interest_rate.toString()) > 0);
    try {
        if (reduceInterestRateApplied.length > 0) {
            _getExistingInterests.map(item => {
                if (item.isWithHoldings.toString() === '1') {
                    totalInterestAmountWHT += parseFloat(item.txnAmount.toString().split(',').join(''));
                }
                if (item.isInterest.toString() === '1') {
                    if (item.is_credit.toString() === '1') {
                        totalInterestAmount += parseFloat(item.txnAmount.toString().split(',').join(''));
                    } else {
                        totalInterestAmount -= parseFloat(item.txnAmount.toString().split(',').join(''));
                    }
                }
            });
            const totalBal = await computeCurrentBalance(data.investmentId, HOST);
            const balanceIncludingInterest = await computeAccountBalanceIncludeInterest(data.investmentId, HOST);
            let total = totalBal;
            let refId = moment().utcOffset('+0100').format('x');
            let sumTotalBalance = balanceIncludingInterest - parseFloat(Number(totalInterestAmount).toFixed(2));
            let inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                description: 'Reverse: ' + 'Interest on investment',
                amount: Number(totalInterestAmount).toFixed(2),
                is_credit: 0,
                isCharge: 0,
                created_date: dt,
                balance: Number(sumTotalBalance).toFixed(2),
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

            let query = `INSERT INTO investment_txns SET ?`;
            let endpoint = `/core-service/post?query=${query}`;
            let url = `${HOST}${endpoint}`;
            await axios.post(url, inv_txn);
            const nextBalance = parseFloat(Number(sumTotalBalance).toFixed(2)) + parseFloat(Number(totalInterestAmountWHT).toFixed(2));
            inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                description: `REVERSE WITHHOLDING TAX ON INTEREST`,
                amount: Number(totalInterestAmountWHT).toFixed(2),
                is_credit: 1,
                isCharge: 0,
                created_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                balance: Number(nextBalance).toFixed(2),
                is_capital: 0,
                isApproved: 1,
                postDone: 1,
                reviewDone: 1,
                approvalDone: 1,
                ref_no: `${moment().utcOffset('+0100').format('x')}-R`,
                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                investmentId: data.investmentId,
                createdBy: data.createdBy
            };
            await setInvestmentTxns(HOST, inv_txn);
            let mdata = {
                investmentId: data.investmentId,
                endDate: data.investment_mature_date,
                startDate: data.investment_start_date
            }
            await updateTerminatedInterest(HOST, mdata);
            const totalInvestedAmount = await computeCurrentBalance(data.investmentId, HOST);
            refId = moment().utcOffset('+0100').format('x');
            dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            let configData = _getProductConfigInterests;
            let configAmount = (configData.interest_forfeit_charge_opt == 'Fixed') ? configData.interest_forfeit_charge : (configData.interest_forfeit_charge * totalInvestedAmount) / 100;//_payload_3.balance;
            const invSumBalance = await computeAccountBalanceIncludeInterest(data.investmentId, HOST);
            let sumBalance = invSumBalance - configAmount; //(totalInvestedAmount + interestAmount) - configAmount;
            inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                description: `CHARGE ON TERMINATION OF INVESTMENT`,
                amount: Number(configAmount).toFixed(2),
                is_credit: 0,
                created_date: dt,
                balance: Number(sumBalance).toFixed(2),
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
            await setInvestmentTxns(HOST, inv_txn);
            await deductVatTax(HOST, data, configAmount, inv_txn, inv_txn.balance);
            dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            const ids = await getInvestmentInterestIDs(HOST, data.investmentId);
            await updateInvestmentInterestIDs(HOST, ids);
            const matureMonths = await getValidInvestmentMatureMonths(HOST, data.investmentId, 0);
            for (let index = 0; index < matureMonths.length; index++) {
                const element = matureMonths[index];
                let _data = {
                    interest_moves_wallet: data.interest_moves_wallet,
                    clientId: data.clientId,
                    investmentId: data.investmentId,
                    investment_start_date: data.investment_start_date,
                    createdBy: data.createdBy,
                    productId: data.productId,
                    startDate: element.startDate,
                    endDate: element.endDate,
                    interest_rate: reduceInterestRateApplied[0].premature_interest_rate
                }
                await computeInterestTxns2(HOST, _data);
            }
            query = `DELETE FROM investment_txns WHERE ID=${data.txnId}`;
            endpoint = `/core-service/get`;
            url = `${HOST}${endpoint}`;
            const _res_ = await axios.get(url, {
                params: {
                    query: query
                }
            });
            if (_res_.data.status === undefined) {
                const currentBal = await computeAccountBalanceIncludeInterest(data.investmentId, HOST);
                inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                    description: `TERMINATE INVESTMENT`,
                    amount: Number(currentBal).toFixed(2),
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

                await setInvestmentTxns(HOST, inv_txn);
                const __balance = await computeWalletBalance(data.clientId, HOST);

                refId = moment().utcOffset('+0100').format('x');
                let wBalance = __balance.currentWalletBalance;
                let _totalBalance = wBalance + currentBal;
                inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                    description: `WALLET FUNDED BY TERMINATING INVESTMENT`,
                    amount: Number(currentBal).toFixed(2),
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
                await fundWallet(inv_txn, HOST);
                await closeInvestmentWallet(data.investmentId, HOST);
            }

        } else {
            const _computeCurrentBalance = await currentBalanceForInterestCalculation(data.investmentId, HOST);
            const _currentBalance = await computeAccountBalanceIncludeInterest(data.investmentId, HOST);
            let refId = moment().utcOffset('+0100').format('x');
            let configData = _getProductConfigInterests;
            configData.interest_forfeit_charge = (configData.interest_forfeit_charge !== null && configData.interest_forfeit_charge !== '') ? parseFloat(configData.interest_forfeit_charge.toString()) : 0;
            let configAmount = (configData.interest_forfeit_charge_opt === 'Fixed') ? configData.interest_forfeit_charge : (configData.interest_forfeit_charge * _computeCurrentBalance) / 100;
            let sumBalance2 = _currentBalance - configAmount;
            let inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                description: `CHARGE ON TERMINATION OF INVESTMENT`,
                amount: Number(configAmount).toFixed(2),
                is_credit: 0,
                created_date: dt,
                balance: Number(sumBalance2).toFixed(2),
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
            await setInvestmentTxns(HOST, inv_txn);
            await deductVatTax(HOST, data, configAmount, inv_txn, inv_txn.balance);
            let query = `DELETE FROM investment_txns WHERE ID = ${data.txnId}`;
            let endpoint = `/core-service/get`;
            let url = `${HOST}${endpoint}`;
            const _res_ = await axios.get(url, {
                params: {
                    query: query
                }
            });
            await getInterestEndOfTenure(HOST, data, _getProductConfigInterests);
            if (_res_.data.status === undefined) {
                refId = moment().utcOffset('+0100').format('x');
                const mBalance = await computeAccountBalanceIncludeInterest(data.investmentId, HOST);
                inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                    description: `TERMINATE INVESTMENT`,
                    amount: Number(mBalance).toFixed(2),
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
                const __balance = await computeWalletBalance(data.clientId, HOST);
                let wBalance = __balance.currentWalletBalance;
                let _totalBalance = wBalance + mBalance;
                await setInvestmentTxns(HOST, inv_txn);
                inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                    description: `WALLET FUNDED BY TERMINATING INVESTMENT`,
                    amount: Number(mBalance).toFixed(2),
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
                    ref_no: moment().utcOffset('+0100').format('x'),
                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                    createdBy: data.createdBy,
                    isWallet: 1,
                    clientId: configData.clientId
                };
                await fundWallet(inv_txn, HOST);
                await closeInvestmentWallet(data.investmentId, HOST);
            }

        }
    } catch (error) {
        return error;
    }
    return {};
}


function debitWalletTxns(HOST, data) {
    return new Promise((resolve, reject) => {
        if (data.isPaymentMadeByWallet.toString() === '1') {
            computeWalletBalance(data.clientId, HOST).then(walletBal => {
                let walletAmt = parseFloat(data.amount.toString());
                let walletCurrentBal = walletBal.currentWalletBalance - walletAmt;
                let inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
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
            });
        } else {
            resolve({});
        }
    });
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
            computeAccountBalanceIncludeInterest(data.investmentId, HOST).then(balanceIncludingInterest_ => {
                computeTotalBalance(data.clientId, data.investmentId, HOST).then(computedTotalBalance => {
                    let _total = (data.isWallet.toString() === '1') ? computedTotalBalance.currentWalletBalance : computedTotalBalance.currentAcctBalance;
                    let acctSumBalance = (data.isWallet.toString() === '1') ? computedTotalBalance.currentWalletBalance : balanceIncludingInterest_;
                    data.amount = data.amount.split(',').join('');
                    if (data.isInvestmentMatured.toString() === '0' && data.investmentId !== '') {
                        let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                        let refId = moment().utcOffset('+0100').format('x');
                        let query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance, v.is_credit,
                        v.isInterest,p.freq_withdrawal, p.withdrawal_freq_duration, p.withdrawal_fees, p.withdrawal_freq_fees_opt
                        FROM investments t left join investment_products p on p.ID = t.productId
                        left join investment_txns v on v.investmentId = t.ID
                        WHERE t.ID = ${data.investmentId} AND v.ID = ${data.txnId}`;
                        let endpoint = `/core-service/get`;
                        let url = `${HOST}${endpoint}`;
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
                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                            description: (isReversal === false) ? 'Charge: ' + chargeForDeposit[0].description : `Reverse: ${chargeForDeposit[0].description}`,
                                            amount: Number(chargedCost).toFixed(2),
                                            is_credit: 0,
                                            isCharge: 1,
                                            created_date: dt,
                                            balance: (isReversal === false) ? Number(acctSumBalance - chargedCost).toFixed(2) : Number(acctSumBalance + chargedCost).toFixed(2),
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
                                                        deductVatTax(HOST, data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
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
                                        : ((parseFloat(getInvestBalance.minimum_bal_charges.split(',').join('')) / 100) * parseFloat(_total.toString()));
                                    if ((parseFloat(_total.toString()) - parseFloat(data.amount.toString())) < parseFloat(getInvestBalance.minimum_bal.split(',').join(''))) {

                                        refId = moment().utcOffset('+0100').format('x');
                                        const sumBal_ = acctSumBalance - chargedCostMinBal;
                                        let inv_txn = {
                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                            description: 'Charge: ' + getInvestBalance.description,
                                            amount: Number(chargedCostMinBal).toFixed(2),
                                            is_credit: 0,
                                            created_date: dt,
                                            balance: Number(sumBal_).toFixed(2),
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
                                                    deductVatTax(HOST, data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
                                                        resolve(result);
                                                    }, err => {
                                                        resolve({});
                                                    });
                                                }
                                            }, err => { });
                                    }

                                    computeAccountBalanceIncludeInterest(data.investmentId, HOST).then(balanceIncludingInterest_2 => {
                                        computeTotalBalance(data.clientId, data.investmentId, HOST).then(computedTotalBalance2 => {
                                            _total = (data.isWallet.toString() === '1') ? computedTotalBalance2.currentWalletBalance : computedTotalBalance.currentAcctBalance;
                                            const sum_Total = _total = (data.isWallet.toString() === '1') ? computedTotalBalance2.currentWalletBalance : balanceIncludingInterest_2;
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
                                                    if (response_product_.data.length === parseInt(response_product.data[0].freq_withdrawal)
                                                        && response_product.data[0].chkEnforceCount === 1) {
                                                        query = `UPDATE investments SET canWithdraw = 0 WHERE ID =${data.investmentId}`;
                                                        endpoint = `/core-service/get`;
                                                        url = `${HOST}${endpoint}`;
                                                        axios.get(url, {
                                                            params: {
                                                                query: query
                                                            }
                                                        });
                                                    }

                                                    if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal)
                                                        && parseInt(response_product.data[0].freq_withdrawal) !== 0) {
                                                        let _getInvestBalance = response_product.data[response_product.data.length - 1];
                                                        _getInvestBalance.withdrawal_fees = (_getInvestBalance.withdrawal_fees === '') ? '0' : _getInvestBalance.withdrawal_fees;
                                                        let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                            parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                            ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                                parseFloat(data.amount.toString()));
                                                        refId = moment().utcOffset('+0100').format('x');
                                                        const sumBal_1 = sum_Total - _chargedCostMinBal;
                                                        let inv_txn = {
                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                            description: 'Charge: Exceeding the total number of daily withdrawal',
                                                            amount: Number(_chargedCostMinBal).toFixed(2),
                                                            is_credit: 0,
                                                            created_date: dt,
                                                            balance: Number(sumBal_1).toFixed(2),
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
                                                                    deductVatTax(HOST, data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
                                                                        resolve(result);
                                                                    }, err => {
                                                                        resolve({});
                                                                    });
                                                                }
                                                            }, err => { });
                                                    } else {
                                                        resolve({});
                                                    }
                                                });
                                            } else if (response_product.data[0].withdrawal_freq_duration === 'Weekly') {
                                                let weekStartDate = startOfWeek(new Date());
                                                let endOfTheWeek = endOfWeek(new Date());
                                                const weekStartDateFormat = `${weekStartDate.getFullYear()}-${weekStartDate.getMonth() + 1}-${weekStartDate.getDate()}`;
                                                const endOfTheWeekFormat = `${endOfTheWeek.getFullYear()}-${endOfTheWeek.getMonth() + 1}-${endOfTheWeek.getDate()}`;

                                                query = `SELECT * FROM investment_txns WHERE 
                                                STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${weekStartDateFormat}' 
                                                AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheWeekFormat}' 
                                                AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                                axios.get(url, {
                                                    params: {
                                                        query: query
                                                    }
                                                }).then(response_product_ => {

                                                    if (response_product_.data.length === parseInt(response_product.data[0].freq_withdrawal)
                                                        && response_product.data[0].chkEnforceCount === 1) {
                                                        query = `UPDATE investments SET canWithdraw = 0 WHERE ID =${data.investmentId}`;
                                                        endpoint = `/core-service/get`;
                                                        url = `${HOST}${endpoint}`;
                                                        axios.get(url, {
                                                            params: {
                                                                query: query
                                                            }
                                                        });
                                                    }

                                                    if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal)
                                                        && parseInt(response_product.data[0].freq_withdrawal) !== 0) {
                                                        let _getInvestBalance = response_product.data[response_product.data.length - 1];
                                                        _getInvestBalance.withdrawal_fees = (_getInvestBalance.withdrawal_fees === '') ? '0' : _getInvestBalance.withdrawal_fees;
                                                        let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                            parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                            ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                                parseFloat(data.amount.toString()));
                                                        refId = moment().utcOffset('+0100').format('x');
                                                        const sumBal_1 = sum_Total - _chargedCostMinBal;
                                                        let inv_txn = {
                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                            description: 'Charge: Exceeding the total number of weekly withdrawal',
                                                            amount: Number(_chargedCostMinBal).toFixed(2),
                                                            is_credit: 0,
                                                            created_date: dt,
                                                            balance: Number(sumBal_1).toFixed(2),
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
                                                                    deductVatTax(HOST, data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
                                                                        resolve(result);
                                                                    }, err => {
                                                                        resolve({});
                                                                    });
                                                                }
                                                            }, err => { });
                                                    } else {
                                                        resolve({});
                                                    }
                                                });
                                            } else if (response_product.data[0].withdrawal_freq_duration === 'Monthly') {
                                                let monthStartDate = startOfMonth(new Date());
                                                let endOfTheMonth = endOfMonth(new Date());

                                                const monthStartDateFormat = `${monthStartDate.getFullYear()}-${monthStartDate.getMonth() + 1}-${1}`;
                                                const endOfTheMonthFormat = `${endOfTheMonth.getFullYear()}-${endOfTheMonth.getMonth() + 1}-${endOfTheMonth.getDate()}`;

                                                query = `SELECT * FROM investment_txns v WHERE 
                                                STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${monthStartDateFormat}' 
                                                AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheMonthFormat}' 
                                                AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                                let endpoint = `/core-service/get`;
                                                url = `${HOST}${endpoint}`;
                                                axios.get(url, {
                                                    params: {
                                                        query: query
                                                    }
                                                }).then(response_product_ => {

                                                    if (response_product_.data.length === parseInt(response_product.data[0].freq_withdrawal)
                                                        && response_product.data[0].chkEnforceCount === 1) {
                                                        query = `UPDATE investments SET canWithdraw = 0 WHERE ID =${data.investmentId}`;
                                                        endpoint = `/core-service/get`;
                                                        url = `${HOST}${endpoint}`;
                                                        axios.get(url, {
                                                            params: {
                                                                query: query
                                                            }
                                                        });
                                                    }

                                                    if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal)
                                                        && parseInt(response_product.data[0].freq_withdrawal) !== 0) {
                                                        let _getInvestBalance = response_product.data[response_product.data.length - 1];
                                                        _getInvestBalance.withdrawal_fees = (_getInvestBalance.withdrawal_fees === '') ? '0' : _getInvestBalance.withdrawal_fees;
                                                        let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                            parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                            ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                                parseFloat(data.amount.toString()));
                                                        refId = moment().utcOffset('+0100').format('x');
                                                        const sumBal_1 = sum_Total - _chargedCostMinBal;
                                                        let inv_txn = {
                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                            description: 'Charge: Exceeding the total number of monthly withdrawal',
                                                            amount: Number(_chargedCostMinBal).toFixed(2),
                                                            is_credit: 0,
                                                            created_date: dt,
                                                            balance: Number(sumBal_1).toFixed(2),
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
                                                                    deductVatTax(HOST, data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
                                                                        resolve(result);
                                                                    }, err => {
                                                                        resolve({});
                                                                    });
                                                                }
                                                            }, err => { });
                                                    } else {
                                                        resolve({});
                                                    }
                                                });
                                            } else if (response_product.data[0].withdrawal_freq_duration === 'Quaterly') {
                                                let quaterStartDate = startOfQuarter(new Date())
                                                let quaterEndDate = endOfQuarter(new Date());

                                                const quaterStartDateFormat = `${quaterStartDate.getFullYear()}-${quaterStartDate.getMonth() + 1}-${1}`;
                                                const quaterEndDateFormat = `${quaterEndDate.getFullYear()}-${quaterEndDate.getMonth() + 1}-${quaterEndDate.getDate()}`;


                                                query = `SELECT * FROM investment_txns v WHERE 
                                                STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${quaterStartDateFormat}' 
                                                AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${quaterEndDateFormat}' 
                                                AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                                let endpoint = `/core-service/get`;
                                                url = `${HOST}${endpoint}`;
                                                axios.get(url, {
                                                    params: {
                                                        query: query
                                                    }
                                                }).then(response_product_ => {

                                                    if (response_product_.data.length === parseInt(response_product.data[0].freq_withdrawal)
                                                        && response_product.data[0].chkEnforceCount === 1) {
                                                        query = `UPDATE investments SET canWithdraw = 0 WHERE ID =${data.investmentId}`;
                                                        endpoint = `/core-service/get`;
                                                        url = `${HOST}${endpoint}`;
                                                        axios.get(url, {
                                                            params: {
                                                                query: query
                                                            }
                                                        });
                                                    }

                                                    if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal)
                                                        && parseInt(response_product.data[0].freq_withdrawal) !== 0) {
                                                        let _getInvestBalance = response_product.data[response_product.data.length - 1];
                                                        _getInvestBalance.withdrawal_fees = (_getInvestBalance.withdrawal_fees === '') ? '0' : _getInvestBalance.withdrawal_fees;
                                                        let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                            parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                            ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                                parseFloat(data.amount.toString()));
                                                        refId = moment().utcOffset('+0100').format('x');
                                                        const sumBal_1 = sum_Total - _chargedCostMinBal;
                                                        let inv_txn = {
                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                            description: 'Charge: Exceeding the total number of quaterly withdrawal',
                                                            amount: Number(_chargedCostMinBal).toFixed(2),
                                                            is_credit: 0,
                                                            created_date: dt,
                                                            balance: Number(sumBal_1).toFixed(2),
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
                                                                    deductVatTax(HOST, data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
                                                                        resolve(result);
                                                                    }, err => {
                                                                        resolve({});
                                                                    });
                                                                }
                                                            }, err => { });
                                                    } else {
                                                        resolve({});
                                                    }
                                                });

                                            } else if (response_product.data[0].withdrawal_freq_duration === 'Yearly') {
                                                let beginOfTheYear = new Date();

                                                const yearStartDateFormat = `${beginOfTheYear.getFullYear()}-${1}-${1}`;
                                                const yearEndDateFormat = `${beginOfTheYear.getFullYear()}-${12}-${31}`;


                                                query = `SELECT * FROM investment_txns WHERE 
                                                STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${yearStartDateFormat}' 
                                                AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${yearEndDateFormat}' 
                                                AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                                let endpoint = `/core-service/get`;
                                                url = `${HOST}${endpoint}`;
                                                axios.get(url, {
                                                    params: {
                                                        query: query
                                                    }
                                                }).then(response_product_ => {
                                                    if (response_product_.data.length === parseInt(response_product.data[0].freq_withdrawal)
                                                        && response_product.data[0].chkEnforceCount === 1) {
                                                        query = `UPDATE investments SET canWithdraw = 0 WHERE ID =${data.investmentId}`;
                                                        endpoint = `/core-service/get`;
                                                        url = `${HOST}${endpoint}`;
                                                        axios.get(url, {
                                                            params: {
                                                                query: query
                                                            }
                                                        });
                                                    }

                                                    if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal)
                                                        && parseInt(response_product.data[0].freq_withdrawal) !== 0) {
                                                        let _getInvestBalance = response_product.data[response_product.data.length - 1];
                                                        _getInvestBalance.withdrawal_fees = (_getInvestBalance.withdrawal_fees === '') ? '0' : _getInvestBalance.withdrawal_fees;
                                                        let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                            parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                            ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                                parseFloat(data.amount.toString()));
                                                        refId = moment().utcOffset('+0100').format('x');
                                                        const sumBal_1 = sum_Total - _chargedCostMinBal;
                                                        let inv_txn = {
                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                                            description: 'CHARGE: EXCEEDING THE TOTAL NUMBER OF WITHDRAWAL',
                                                            amount: Number(_chargedCostMinBal).toFixed(2),
                                                            is_credit: 0,
                                                            created_date: dt,
                                                            balance: Number(sumBal_1).toFixed(2),
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
                                                                    deductVatTax(HOST, data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
                                                                        resolve(result);
                                                                    }, err => {
                                                                        resolve({});
                                                                    });
                                                                }
                                                            }, err => { });
                                                    } else {
                                                        resolve({});
                                                    }
                                                });
                                            }
                                        });
                                    });
                                }
                            } else {
                                resolve({});
                            }
                        }, err => { });
                    } else {
                        resolve({});
                    }
                });
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
                    let configAmount = (configData.vatChargeMethod === 'Fixed') ? configData.vat : (parseFloat(configData.vat.toString()) * parseFloat(_amount.toString())) / 100;
                    let _refId = moment().utcOffset('+0100').format('x');
                    let _mBalance = Number(parseFloat(balance)).toFixed(2) - parseFloat(configAmount);
                    let inv_txn = {
                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                        description: `VAT ON CHARGE TRANSACTION WITH REF.: <strong>${txn.ref_no}</strong>`,
                        amount: Number(parseFloat(configAmount)).toFixed(2),
                        is_credit: 0,
                        created_date: dt,
                        balance: Number(parseFloat(_mBalance)).toFixed(2),
                        is_capital: 0,
                        parentTxnId: txn.ID,
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
    computeInterestTxns2(HOST, data).then(payload => {
        res.send(payload.data);
    }, err => {
        res.send(err);
    });
});

router.get('/mature-interest-months/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    // monthlyMaturedInvestmentDate(HOST, req.params.id).then(payload => {
    //     const data = payload.data.filter(x => isPast(endOfMonth(`${x.year}-${x.month}`)));
    //     res.send(data);
    // }, err => {
    //     res.send(err);
    // });
    getValidInvestmentMatureMonths(HOST, req.params.id, 1).then(payload => {
        const result = payload.filter(x => isLastDayOfMonth(x.endDate));
        res.send(result);
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

function investmentMonths(host, investmentId) {
    return new Promise((resolve, reject) => {
        let query = `SELECT investment_start_date, investment_mature_date FROM investments WHERE ID = ${investmentId}`;
        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            var result = differenceInCalendarMonths(
                new Date(payload.data[0].investment_mature_date),
                new Date(payload.data[0].investment_start_date)
            )
            resolve({ months: result, investment_start_date: payload.data[0].investment_start_date });
        }, err => {
            reject(err);
        });
    });
}
function investmentStartAndEndOfMonths(diffInCalendarMonths, investment_start_date) {
    return new Promise((resolve, reject) => {
        let invStartAndEndOfMonths = [];
        let endDate = '';
        for (let index = 0; index <= diffInCalendarMonths; index++) {

            if (index === 0) {
                let date = lastDayOfMonth(new Date(investment_start_date));
                let currentDate = new Date();
                let mCurrentDate = `${currentDate.getUTCFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
                endDate = `${date.getUTCFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                invStartAndEndOfMonths.push({
                    startDate: investment_start_date,
                    endDate: (isPast(endDate)) ? endDate : mCurrentDate
                });
            } else {
                let _date = addDays(new Date(endDate), 1);
                let date = lastDayOfMonth(new Date(_date))

                invStartAndEndOfMonths.push({
                    startDate: `${_date.getUTCFullYear()}-${_date.getMonth() + 1}-${_date.getDate()}`,
                    endDate: `${date.getUTCFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
                });
                endDate = date
            }
        }
        resolve(invStartAndEndOfMonths);
    });
}



async function dailyMaturedInvestmentTxns(host, investmentId, firstDate, date) {
    let query = `SELECT t.*,a.investment_mature_date,a.investment_start_date, a.clientId,
    p.interest_rate, p.ID as productId, p.interest_moves_wallet FROM investment_txns t
    left join investments a on a.ID = t.investmentId
    left join investment_products p on p.ID = a.productId
    WHERE t.isWallet = 0 AND t.investmentId = ${investmentId} AND STR_TO_DATE(t.updated_date, '%Y-%m-%d') <= '${date}' 
    AND t.isApproved = 1 ORDER BY t.ID DESC LIMIT 1`;

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

async function sumUpInvestmentInterest(host, investmentId, isPosted, isTerminated) {
    return new Promise((resolve, reject) => {
        let query = `SELECT SUM(amount) as total FROM investment_interests
    WHERE investmentId = ${investmentId} AND isPosted = ${isPosted} AND isTerminated = ${isTerminated}`;
        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(result => {
            if (result.data[0] === undefined) {
                resolve('0');
            } else {
                resolve(result.data[0].total);
            }
        }, err => {
            reject(err);
        });
    });
}

async function sumInvestmentInterestRange(host, investmentId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        let query = `SELECT SUM(amount) as total FROM investment_interests
        WHERE investmentId = ${investmentId} AND isPosted = 0 
        AND STR_TO_DATE(interestDate, '%Y-%m-%d') >='${startDate}'
        AND STR_TO_DATE(interestDate, '%Y-%m-%d') <='${endDate}'`;
        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(result => {
            resolve(result.data[0].total);
        }, err => {
            reject(err);
        });
    });
}

function getInvestmentInterestIDs(host, investmentId) {
    return new Promise((resolve, reject) => {
        let query = `SELECT ID FROM investment_interests
        WHERE investmentId = ${investmentId}`;
        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(result => {
            resolve(result.data);
        }, err => {
            reject(err);
        });
    });
}

function updateInvestmentInterestIDs(host, ids) {
    return new Promise((resolve, reject) => {
        let baseQuery = `UPDATE investment_txns SET isTerminated = 1 WHERE`;
        let bodyQuery = '';
        for (let index = 0; index < ids.length; index++) {
            const element = ids[index];
            bodyQuery += ` ID= ${element}`;
            if (index < ids.length - 1)
                bodyQuery += ','
        }
        let query = baseQuery + bodyQuery;

        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(result => {
            resolve(result.data);
        }, err => {
            reject(err);
        });
    });
}

function sumInvestmentInterestPerDayRange(host, investmentId, inStartDate, startDate, date) {
    return new Promise((resolve, reject) => {
        let query = `SELECT amount, is_credit FROM investment_txns
        WHERE investmentId = ${investmentId} AND isApproved = 1 AND postDone = 1 
        AND isInterest = 0 AND isWallet = 0 AND (STR_TO_DATE(updated_date, '%Y-%m-%d') >='${inStartDate}'
        OR STR_TO_DATE(updated_date, '%Y-%m-%d') >='${startDate}')
        AND STR_TO_DATE(updated_date, '%Y-%m-%d') <='${date}'`;
        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(result => {
            let total = 0;
            result.data.map(x => {
                if (x.is_credit === 1) {
                    total += parseFloat(x.amount.toString());
                } else {
                    total -= parseFloat(x.amount.toString());
                }
            });
            let _result = parseFloat(Number(total).toFixed(2));
            resolve(_result);
        }, err => {
            reject(err);
        });
    });
}

function setInvestmentInterestPerDay(host, values) {
    return new Promise((resolve, reject) => {
        let baseQuery = `INSERT INTO
        investment_interests(
            amount,
            clientId,
            investmentId,
            createdAt,
            month,
            year,
            balance,
            interestDate
        )
        VALUES `;
        let bodyQuery = '';
        for (let i = 0; i < values.length; i++) {
            const item = values[i];
            bodyQuery += `(${item.amount},${item.clientId},${item.investmentId},'${item.createdAt}',${item.month},${item.year},${item.balance},'${item.date}')`;
            if (values.length !== i + 1) {
                bodyQuery += ',';
            }
        }

        let query = baseQuery + bodyQuery;
        sRequest.get(query).then(result => {
            resolve(result);
        }, err => {
            reject(err);
        });
    });
}

function getInvestmentMonthDatesRange(startDate, maturityDate) {
    return new Promise((resolve, reject) => {
        let daysInInvestmentDuration = differenceInCalendarDays(
            new Date(maturityDate),
            new Date(startDate)
        );
        let daysInInvestment = [];
        for (let index = 0; index <= daysInInvestmentDuration; index++) {
            const dt = addDays(new Date(startDate), index);
            daysInInvestment.push(`${dt.getUTCFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`);
        }

        resolve(daysInInvestment);
    });
}

async function getInvestmentDailyBalance(HOST, data) {
    let dailyBalances = [];
    const payload = await getInvestmentMonthDatesRange(data.startDate, data.maturityDate)
    let daysInYear = 365;
    if (isLeapYear(new Date())) {
        daysInYear = 366;
    }
    let totalInterestAmount = 0;
    let monthlyOpeningBalance = 0;
    let isLocked = false;
    for (let index = 0; index < payload.length; index++) {
        const x = payload[index];
        const balance = await sumInvestmentInterestPerDayRange(HOST, data.investmentId, data.investment_start_date, data.startDate, x)
        let totalInvestedAmount = parseFloat(balance.toString());
        monthlyOpeningBalance = (monthlyOpeningBalance === 0) ? totalInvestedAmount : monthlyOpeningBalance;
        let interestInDays = parseFloat(data.interest_rate) / 100;
        let SI = (totalInvestedAmount * interestInDays * (1 / daysInYear));
        totalInterestAmount += SI;
        monthlyOpeningBalance += SI;
        dailyBalances.push({
            date: x,
            balance: Number(monthlyOpeningBalance).toFixed(2),
            amount: Number(SI).toFixed(2),
            clientId: data.clientId,
            investmentId: data.investmentId,
            createdAt: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
            month: x.split('-')[1],
            year: x.split('-')[0],
        });
    }
    return ({ dailyBalances: dailyBalances, totalInterestAmount: totalInterestAmount });
}

router.post('/investment-durations', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    const data = req.body;
    // getInvestmentDailyBalance(HOST, data).then(payload => {
    //     setInvestmentInterestPerDay(HOST, payload.dailyBalances).then(interestValues => {
    //         let result = {
    //             dailyInterest: payload.dailyBalances,
    //             totalInterestAmount: payload.totalInterestAmount,
    //             insertIds: interestValues
    //         }
    //         res.send(result);
    //     })
    // });

    // monthlyMaturedInvestmentDate(HOST, data.investmentId).then(payload => {
    //     const data = payload.data.filter(x => isPast(endOfMonth(`${x.year}-${x.month}`)));
    //     res.send(data);
    // }, err => {
    //     res.send(err);
    // });
    getValidInvestmentMatureMonths(HOST, data.investmentId, 0).then(payload => {
        res.send(payload);
    });
});

async function getValidInvestmentMatureMonths(HOST, investmentId, isMonthly) {
    let results = [];
    const payload = await investmentMonths(HOST, investmentId);
    const payload2 = await investmentStartAndEndOfMonths(payload.months, payload.investment_start_date);
    let matureMonths = payload2.filter(x => isPast(new Date(x.endDate)));
    let currentDate = new Date();
    let currentDt = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
    let lastIndexDate = matureMonths[matureMonths.length - 1].endDate;
    const dtIsAfter = isAfter(new Date(currentDt), new Date(lastIndexDate))
    if (isMonthly === 0) {
        if (dtIsAfter) {
            matureMonths.push({
                startDate: `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-1`,
                endDate: currentDt
            });
        }
    }
    for (let index = 0; index < matureMonths.length; index++) {
        const element = matureMonths[index];
        const dt = element.endDate.split('-');
        const validate = await monthlyValidMaturedInvestmentDate(HOST, investmentId, dt[1], dt[0]);
        if (validate) {
            results.push(element);
        }
    }
    return results;
}

function monthlyValidMaturedInvestmentDate(host, investmentId, month, year) {
    return new Promise((resolve, reject) => {
        let query = `SELECT count(id) as counter FROM investment_interests WHERE investmentId = ${investmentId} 
        AND isPosted = 1 AND isTerminated = 0 AND month = ${month} AND year = ${year}`;
        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            if (payload.data[0].counter === 0) {
                resolve(true);
            } else {
                resolve(false);
            }
        }, err => {
            resolve(false);
        });
    });
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
    return new Promise((resolve, reject) => {
        let query = `SELECT amount, is_credit FROM investment_txns
        WHERE clientId = ${clientId} AND isWallet = ${1} AND isApproved = 1 AND postDone =1`;
        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(result => {
            let total = 0;
            result.data.map(x => {
                if (x.is_credit === 1) {
                    total += parseFloat(x.amount.toString());
                } else {
                    total -= parseFloat(x.amount.toString());
                }
            });
            let _result = parseFloat(Number(total).toFixed(2));
            resolve(_result);
        }, err => {
            reject(err);
        });
    });
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

function getDatedTxns(host, data) {
    return new Promise((resolve, reject) => {
        let query = `SELECT ID FROM investment_txns
WHERE investmentId = ${data.investmentId} 
AND STR_TO_DATE(updated_date, '%Y-%m-%d') >='${data.startDate}'
AND STR_TO_DATE(updated_date, '%Y-%m-%d') <='${data.endDate}'`;

        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            resolve(payload.data);
        }, err => {
            reject(err);
        })
    });
}

async function updateDatedTxns(host, value, isInterestCharged) {
    return new Promise((resolve, reject) => {
        let baseQuery = `UPDATE investment_txns SET isInterestCharged = ${isInterestCharged} WHERE `;
        let subQuery = '';
        for (let index = 0; index < value.length; index++) {
            const element = value[index];
            subQuery += `ID = ${element.ID}`;
            if (index + 1 !== value.length && value.length > 1)
                subQuery += ' OR ';
        }
        let query = baseQuery + subQuery;
        let endpoint = '/core-service/get';
        let url = `${host}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            resolve(payload.data);
        }, err => {
            reject(err);
        });
    });
}

async function computeInterestTxns2(HOST, data) {
    return new Promise((resolve, reject) => {
        let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let refId = moment().utcOffset('+0100').format('x');
        const monthNyear = data.endDate.split('-');
        let _data = {
            maturityDate: data.endDate,
            startDate: data.startDate,
            investmentId: data.investmentId,
            interest_rate: data.interest_rate,
            clientId: data.clientId,
            investment_start_date: data.investment_start_date
        }
        getInvestmentDailyBalance(HOST, _data).then(payload => {
            setInvestmentInterestPerDay(HOST, payload.dailyBalances).then(interestValues => {
                if (data.interest_moves_wallet.toString() === '1') {
                    sumAllWalletInvestmentTxns(HOST, data.clientId).then(walletBalance_ => {
                        let bal_ = walletBalance_ + payload.totalInterestAmount;
                        let amountValue = payload.totalInterestAmount;
                        let inv_txn = {
                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                            description: `Balance ${Number(bal_).toFixed(2)} @${data.endDate}`,
                            amount: Number(amountValue).toFixed(2),
                            is_credit: 1,
                            created_date: dt,
                            balance: Number(bal_).toFixed(2),
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
                            clientId: data.clientId,
                            isWallet: 1,
                            isInterest: 1
                        };

                        setInvestmentTxns(HOST, inv_txn).then(setInv => {
                            inv_txn.ID = setInv.insertId;
                            deductWithHoldingTax(HOST, data, inv_txn.amount, 0, inv_txn.balance, data.clientId, 1, inv_txn).then(deductWithHoldingTax_ => {
                                let query = `UPDATE investment_interests SET isPosted = 1 
                                                            WHERE id <> 0 AND investmentId = ${data.investmentId} 
                                                            AND month = ${monthNyear[1]} 
                                                            AND year = ${monthNyear[0]}`;

                                endpoint = '/core-service/get';
                                url = `${HOST}${endpoint}`;
                                axios.get(url, {
                                    params: {
                                        query: query
                                    }
                                }).then(axio_callback => {
                                    getDatedTxns(HOST, data).then(datedTxns => {
                                        updateDatedTxns(HOST, datedTxns, 1).then(updatedDates => {
                                            resolve({});
                                        });
                                    });
                                });
                            });
                        });
                    });
                } else {
                    computeAccountBalanceIncludeInterest(data.investmentId, HOST).then(balanceIncludingInterestm => {
                        computeCurrentBalance(data.investmentId, HOST).then(totalInvestedAmount => {
                            let _amt = payload.totalInterestAmount;
                            let sumTotalBalance = balanceIncludingInterestm + payload.totalInterestAmount;
                            let inv_txn = {
                                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                                description: `Investment interest@ ${data.endDate}`,
                                amount: Number(_amt).toFixed(2),
                                is_credit: 1,
                                created_date: dt,
                                balance: Number(sumTotalBalance).toFixed(2),
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
                            setInvestmentTxns(HOST, inv_txn).then(getTxnValue => {
                                // let bal2 = totalInvestedAmount + (payload1.data[0].total + parseFloat(Number(_amount).toFixed(2)));
                                inv_txn.ID = getTxnValue.insertId;
                                deductWithHoldingTax(HOST, data, inv_txn.amount, 0, inv_txn.balance, '', 0, inv_txn).then(deductWithHoldingTax_ => {
                                    let query = `UPDATE investment_interests SET isPosted = 1 
                                                        WHERE id <> 0 AND investmentId = ${data.investmentId} 
                                                        AND month = ${monthNyear[1]} 
                                                        AND year = ${monthNyear[0]}`;
                                    endpoint = '/core-service/get';
                                    url = `${HOST}${endpoint}`;
                                    axios.get(url, {
                                        params: {
                                            query: query
                                        }
                                    }).then(axio_callback => {
                                        getDatedTxns(HOST, data).then(datedTxns => {
                                            updateDatedTxns(HOST, datedTxns, 1).then(updatedDates => {
                                                resolve({});
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
            })
        });
    });
}

function deductWithHoldingTax(HOST, data, _amount, total, bal_, clientId, isWallet, txn) {
    return new Promise((resolve, reject) => {
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
                let configAmount = (configData.withHoldingTaxChargeMethod == 'Fixed') ? configData.withHoldingTax
                    : (configData.withHoldingTax * (total + parseFloat(Number(_amount).toFixed(2)))) / 100;
                let refId = moment().utcOffset('+0100').format('x');
                let balTotal = bal_ - configAmount;
                let inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                    description: `WITH-HOLDING TAX ON INTEREST TRANSACTION WITH REF.: <strong>${txn.ref_no}</strong>`,
                    amount: Number(configAmount).toFixed(2),
                    is_credit: 0,
                    created_date: dt,
                    balance: Number(balTotal).toFixed(2),
                    is_capital: 0,
                    isCharge: 0,
                    isApproved: 1,
                    isWithHoldings: 1,
                    parentTxnId: txn.ID,
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
                    result.balance = inv_txn.balance;
                    resolve(result);
                }, err => {
                    resolve({});
                });
            }
        }, err => {
            resolve({});
        })
    });
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
    v.ID,v.ref_no,c.fullname,v.description,v.created_date,v.amount,v.balance as txnBalance,v.txn_date,p.ID as productId,u.fullname as createdByName,
    v.isDeny,v.isPaymentMadeByWallet,v.isReversedTxn,v.isTransfer,v.isMoveFundTransfer,v.beneficialInvestmentId,p.interest_disbursement_time,p.interest_moves_wallet,
    v.approvalDone,v.reviewDone,v.postDone,p.code,p.name,i.investment_start_date, v.ref_no, v.isApproved,v.is_credit,v.isInvestmentTerminated,
    p.acct_allows_withdrawal,i.investment_mature_date,p.interest_rate,v.isForceTerminate,v.isInvestmentMatured,p.inv_moves_wallet,p.chkEnforceCount,
    i.clientId,p.canTerminate,v.is_capital,v.investmentId,i.isTerminated,v.isWallet, v.updated_date, i.isMatured FROM investment_txns v 
    left join investments i on v.investmentId = i.ID 
    left join clients c on i.clientId = c.ID
    left join users u on u.ID = v.createdBy
    left join investment_products p on i.productId = p.ID
    WHERE v.isWallet = 1 AND v.clientId = ${req.params.id} LIMIT ${limit} OFFSET ${offset}`;
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
            computeWalletBalance(req.params.id, HOST).then(txnCurrentBalance => {
                query = `SELECT count(*) as recordsTotal FROM investment_txns WHERE isWallet = 1 AND clientId = ${req.params.id}`;
                // query = `SELECT count(*) as recordsTotal FROM investment_txns WHERE clientId = ${req.params.id}`;
                endpoint = '/core-service/get';
                url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                }).then(payload2 => {
                    uniqueTxns.map(x => {
                        x.balance = txnCurrentBalance.currentWalletBalance;
                    });
                    res.send({
                        draw: draw,
                        txnCurrentBalance: txnCurrentBalance.currentWalletBalance,
                        recordsTotal: payload2.data[0].recordsTotal,
                        recordsFiltered: payload.data[0].recordsFiltered,
                        data: (uniqueTxns === undefined) ? [] : uniqueTxns
                    });
                }, err => {
                });
            });
        });
    });
});

router.get('/client-wallet-balance/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    computeWalletBalance(req.params.id, HOST).then(balance => {
        res.send(balance);
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
    WHERE v.isWallet = 0 AND v.investmentId = ${req.params.id} AND STR_TO_DATE(v.txn_date, '%Y-%m-%d') >= '${data.startDate}' AND STR_TO_DATE(v.txn_date, '%Y-%m-%d') <= '${data.endDate}' AND v.isApproved = 1 ORDER BY v.ID`;
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

async function closeMatureInvestmentAccount(HOST, data) {
    for (let index1 = 0; index1 < data.value.length; index1++) {
        const element1 = data.value[index1];
        const matureMonths = await getValidInvestmentMatureMonths(HOST, element1.ID, 0);
        for (let index = 0; index < matureMonths.length; index++) {
            const element = matureMonths[index];
            let _data = {
                interest_moves_wallet: element1.interest_moves_wallet,
                clientId: element1.clientId,
                investmentId: element1.ID,
                investment_start_date: element1.investment_start_date,
                createdBy: element1.createdBy,
                productId: element1.productId,
                startDate: element.startDate,
                endDate: element.endDate,
                interest_rate: element1.interest_rate
            }
            await computeInterestTxns2(HOST, _data);
        }
        // const totalSumInterest = await sumUpInvestmentInterest(HOST, element1.ID, 1, 0);
        const totalSumAmount = await computeAccountBalanceIncludeInterest(element1.ID, HOST);
        const walletBal = await computeWalletBalance(element1.clientId, HOST)
        const balTotal = parseFloat(walletBal.currentWalletBalance.toString()) + parseFloat(totalSumAmount.toString());
        let inv_txn = {
            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
            description: `MOVE ${element1.code} INVESTMENT FUND TO CLIENT'S WALLET`,
            amount: Number(totalSumAmount).toFixed(2),
            is_credit: 1,
            created_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
            balance: Number(balTotal).toFixed(2),
            is_capital: 0,
            ref_no: moment().utcOffset('+0100').format('x'),
            clientId: element1.clientId,
            createdBy: element1.createdBy,
            isWallet: 1,
            isCharge: 0,
            isApproved: 1,
            postDone: 1,
            reviewDone: 1,
            approvalDone: 1,
            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
        };
        await setInvestmentTxns(HOST, inv_txn);

        let inv_txn2 = {
            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
            description: `MOVE INVESTMENT FUND TO CLIENT'S WALLET`,
            amount: Number(totalSumAmount).toFixed(2),
            is_credit: 0,
            created_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
            balance: '0.00',
            is_capital: 0,
            ref_no: moment().utcOffset('+0100').format('x'),
            clientId: element1.clientId,
            createdBy: element1.createdBy,
            investmentId: element1.ID,
            isApproved: 1,
            postDone: 1,
            reviewDone: 1,
            approvalDone: 1,
            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
        };
        await setInvestmentTxns(HOST, inv_txn2);
        await closeInvestmentWallet(element1.ID, HOST);
    }

    return {};
}



router.post('/close-mature-investments', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    const data = req.body;
    closeMatureInvestmentAccount(HOST, data).then(payld => {
        res.send(payld);
    });
});



router.post('/compute-mature-investment', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    const data = req.body;
    computeInterestBalance(data, HOST).then(payload => {
        res.send({});
    });
});


async function computeInterestBalance(data, HOST) {
    if (data.isInvestmentMatured.toString() === '1') {
        let items = {
            value: [{
                ID: data.investmentId,
                clientId: data.clientId,
                code: data.code,
                createdBy: data.createdBy,
                interest_rate: data.interest_rate,
                investment_mature_date: data.investment_mature_date,
                investment_start_date: data.investment_start_date,
                productId: data.productId,
                interest_moves_wallet: data.interest_moves_wallet
            }]
        };
        const payld = await closeMatureInvestmentAccount(HOST, items);
        return payld;
    } else {
        return {};
    }
};

module.exports = router;