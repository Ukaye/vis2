const express = require('express');
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
var isLastDayOfMonth = require('date-fns/is_last_day_of_month');

/**End Point returns list of roles assign to a specific user **/
router.get('/get-txn-user-roles/:id', function (req, res, next) {
    let query = `SELECT t.ID,t.txn_date,t.description,t.amount,u.fullname, t.isDeny,
    t.is_credit,t.ref_no,a.ID as approvalId,a.*,r.role_name, r.id as roleId,ut.user_role as userViewRole,
    a.ID as txnApprovadId FROM investment_txns t
    left join investments i on i.ID = t.investmentId
    left join investment_op_approvals a on a.txnId = t.ID
    left join user_roles r on a.roleId = r.id
    left join users u on u.ID = a.approvedBy
    left join users ut on ut.ID = ${req.query.userId}
    WHERE a.txnId = ${req.params.id} AND a.method = ${req.query.method}`;
    sRequest.get(query).then(response => {
        res.send(response);
    }, err => {
        res.send({
            status: 500,
            error: err,
            response: null
        });
    })
});

/**End point returns the details of a specific product **/
router.get('/get-product-configs/:id', function (req, res, next) {
    let query = `SELECT v.ID as investmentId, v.amount,p.* FROM investments v
    left join investment_products p on p.ID = v.productId
    WHERE v.ID =${req.params.id}`;
    sRequest.get(query).then(response => {
        res.send(response);
    }, err => {
        res.send({
            status: 500,
            error: err,
            response: null
        });
    })
});

/**Function returns organisation info and settings **/
function organisationSettings() {
    return new Promise((resolve, reject) => {
        let query = `SELECT c.*, p.min_days_termination,p.name as productName, p.code FROM investment_config c
                    left join investment_products p on p.ID = c.walletProductId ORDER BY ID DESC LIMIT 1`;
        sRequest.get(query).then(response => {
            resolve(response[0].walletProductId);
        }, err => {
            resolve(0);
        })
    });
}

/**End point to create investment/savings transaction and it also enforces product requirement on the transaction **/
router.post('/create', function (req, res, next) {
    var data = req.body
    const dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let refId = moment().utcOffset('+0100').format('x');
    organisationSettings().then(config => {
        data.productId = (data.isWallet === '1') ? config : data.productId;
        computeAccountBalanceIncludeInterest(data.investmentId).then(balanceIncludingInterest => {
            computeTotalBalance(data.clientId, data.investmentId).then(totalBalance_ => {
                let total = (data.isWallet.toString() === '1') ? totalBalance_.currentWalletBalance : balanceIncludingInterest;
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
                    isReversedTxn: (data.isReversedTxn !== undefined) ? data.isReversedTxn : 0,
                    investmentId: data.investmentId,
                    createdBy: data.createdBy,
                    clientId: data.clientId,
                    isMoveFundTransfer: (data.isMoveFundTransfer !== undefined) ? data.isMoveFundTransfer : 0,
                    isWithdrawal: (data.isWithdrawal !== undefined) ? data.isWithdrawal : 0,
                    isDeposit: (data.isDeposit !== undefined) ? data.isDeposit : 0,
                    isTransfer: (data.isTransfer !== undefined) ? data.isTransfer : 0,
                    beneficialInvestmentId: data.beneficialInvestmentId,
                    isInvestmentTerminated: (data.isInvestmentTerminated !== undefined) ? data.isInvestmentTerminated : 0,
                    isForceTerminate: (data.isForceTerminate !== undefined) ? data.isForceTerminate : 0,
                    expectedTerminationDate: data.expectedTerminationDate,
                    isWallet: (data.isWallet !== undefined) ? data.isWallet : 0,
                    isPaymentMadeByWallet: (data.isWallet === '1') ? 0 : ((data.isPaymentMadeByWallet === '' || data.isPaymentMadeByWallet === undefined) ? 0 : data.isPaymentMadeByWallet),
                    isInvestmentMatured: (data.isInvestmentMatured === undefined) ? 0 : data.isInvestmentMatured
                };
                let query = `INSERT INTO investment_txns SET ?`;
                sRequest.post(query, inv_txn)
                    .then(function (_response) {
                        // If insert succeeds, .status won't be part of _response object, thereby _response.status will be undefined
                        if (_response.status === undefined) {


                            query = `SELECT * FROM investment_product_reviews
                                    WHERE productId = ${(data.productId) ? data.productId : 0} AND operationId = ${data.operationId} AND status = 1`;
                            sRequest.get(query)
                                .then(function (response2) {
                                    if (response2.length > 0) {
                                        let result = response2[0];
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
                                                txnId: _response.insertId,
                                                method: 'REVIEW'
                                            };
                                            if (jsonPriority.length > 0) {
                                                const check = jsonPriority.filter(x => x.id.toString() === role.toString());
                                                if (check.length > 0) {
                                                    invOps.priority = JSON.stringify(check);
                                                }
                                            }
                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                            sRequest.post(query, invOps).then(p => { }, er22 => {
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
                                            txnId: _response.insertId,
                                            method: 'REVIEW'
                                        };

                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                        sRequest.post(query, invOps).then(p => { }, er22 => {
                                        });
                                    }
                                })
                                .catch(function (error) {
                                });


                            query = `SELECT * FROM investment_product_requirements
                                    WHERE productId = ${(data.productId) ? data.productId : 0} AND operationId = ${data.operationId} AND status = 1`;
                            sRequest.get(query)
                                .then(function (response2) {
                                    if (response2.length > 0) {
                                        let result = response2[0];
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
                                                txnId: _response.insertId,
                                                method: 'APPROVAL'
                                            };
                                            if (jsonPriority.length > 0) {
                                                const check = jsonPriority.filter(x => x.id.toString() === role.toString());
                                                if (check.length > 0) {
                                                    invOps.priority = JSON.stringify(check);
                                                }
                                            }

                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                            sRequest.post(query, invOps).then(p => {
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
                                            txnId: _response.insertId,
                                            method: 'APPROVAL'
                                        };
                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                        sRequest.post(query, invOps).then(p => {
                                        }, er22 => { });
                                    }
                                })
                                .catch(function (error) {
                                });




                            query = `SELECT * FROM investment_product_posts
                                    WHERE productId = ${(data.productId) ? data.productId : 0} AND operationId = ${data.operationId} AND status = 1`;
                            sRequest.get(query)
                                .then(function (response2) {
                                    if (response2.length > 0) {
                                        let result = response2[0];
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
                                                txnId: _response.insertId,
                                                method: 'POST'
                                            };

                                            if (jsonPriority.length > 0) {
                                                const check = jsonPriority.filter(x => x.id.toString() === role.toString());
                                                if (check.length > 0) {
                                                    invOps.priority = JSON.stringify(check);
                                                }
                                            }

                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                            sRequest.post(query, invOps).then(p => { }, er22 => {
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
                                            txnId: _response.insertId,
                                            method: 'POST'
                                        };

                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                        sRequest.post(query, invOps).then(p => { }, er22 => {
                                        });
                                    }
                                })
                                .catch(function (error) {
                                });

                            setDocRequirement(data, _response.insertId);
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

/**Function call to create investment/savings transaction document requirement **/
function setDocRequirement(data, txnId) {
    let query = `SELECT * FROM investment_doc_requirement
                WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
    sRequest.get(query)
        .then(function (response2) {
            if (response2.length > 0) {
                response2.map((item, index) => {
                    let doc = {
                        docRequirementId: item.Id,
                        txnId: txnId,
                        createdAt: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
                    }
                    query = `INSERT INTO investment_txn_doc_requirements SET ?`;
                    try {
                        sRequest.post(query, doc);
                    } catch (error) { }
                })
            }
        })
        .catch(function (error) { });
}

/**End point to verify the number of uploaded investment/savings transaction document **/
router.get('/verify-doc-uploads', function (req, res, next) {
    let data = req.query;
    let query = `Select 
    (Select Count(*) as total_doc_required from investment_doc_requirement where productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1) as total_doc_required,
    (Select Count(*) as total_uploaded from investment_txn_doc_requirements where txnId = ${data.txnId} AND isReplaced = 0 AND status = 1) as total_uploaded`;
    sRequest.get(query)
        .then(function (response) {
            if (response.status === undefined) {
                res.send(response);
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


/**End point to create transfer **/
router.post('/create-transfers', function (req, res, next) {
    var data = req.body
    const dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let refId = moment().utcOffset('+0100').format('x');
    let query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE clientId = ${data.debitedClientId} AND isApproved = 1`;
    sRequest.get(query)
        .then(function (response) {
            if (response.length > 0) {
                let total = 0;
                response.map(x => {
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
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                sRequest.post(query, inv_txn)
                    .then(function (_response) {
                        if (_response.status === undefined) {
                            let queryString = (data.investmentId === '') ? `clientId = ${data.creditedClientId}` : `investmentId = ${data.investmentId}`;
                            query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE ${queryString} AND isApproved = 1`;
                            sRequest.get(query)
                                .then(function (response2) {
                                    total = 0;
                                    if (response2.length > 0) {
                                        response2.map(x => {
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
                                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                                    sRequest.post(query, inv_txn)
                                        .then(function (_response2) {
                                            if (_response2.status === undefined) {
                                                res.send(_response);
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

/**End point to approve an investment/savings transaction **/
router.post('/approves', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let data = req.body
    let query = `UPDATE investment_op_approvals SET isApproved = ${data.status},isCompleted = ${1}, approvedBy=${data.userId}, updatedAt ='${dt.toString()}' WHERE ID =${data.id}`;
    sRequest.get(query)
        .then(function (response) {
            if (response.status === undefined) {
                query = `Select 
                        (Select Count(*) as total_approved from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND (isApproved = 1 && isCompleted =1)) as total_approved,
                        (Select Count(*) as isOptional from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND isAllRoles = 0) as isOptional,
                        (Select Count(*) as priorityTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND priority IS NOT NULL) as priorityTotal,
                        (Select Count(*) as priorityItemTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND priority = '${data.priority}') as priorityItemTotal,
                        (Select Count(*) as total_approvedBy from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL') as total_approvedBy`;
                sRequest.get(query).then(counter => {
                    if (((counter[0].total_approvedBy === counter[0].total_approved) || (counter[0].isOptional > 0) ||
                        (counter[0].priorityTotal !== 0 && counter[0].priorityTotal === counter[0].priorityItemTotal)) && data.status === '1') {
                        query = `UPDATE investment_txns SET approvalDone = ${1} WHERE ID =${data.txnId}`;
                        sRequest.get(query)
                            .then(function (response_) {
                                res.send(response);
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
                        sRequest.get(query)
                            .then(function (response_) {
                                res.send(response);
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

/**End point to reviews an investment/savings transaction **/
router.post('/reviews', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let data = req.body
    let query = `UPDATE investment_op_approvals SET isReviewed = ${data.status}, reviewedBy=${data.userId},isCompleted = ${1}, updatedAt ='${dt.toString()}' WHERE ID =${data.id}`;
    sRequest.get(query)
        .then(function (response) {
            if (response.status === undefined) {
                query = `Select 
                        (Select Count(*) as total_reviewed from investment_op_approvals where txnId = ${data.txnId} AND (isReviewed = 1 || isCompleted = 1) AND method = 'REVIEW') as total_reviewed,
                        (Select Count(*) as isOptional from investment_op_approvals where txnId = ${data.txnId} AND isAllRoles = 0 AND method = 'REVIEW') as isOptional,
                        (Select Count(*) as priorityTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW' AND priority IS NOT NULL) as priorityTotal,
                        (Select Count(*) as priorityItemTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW' AND priority = '${data.priority}') as priorityItemTotal,
                        (Select Count(*) as total_reviewedBy from investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW') as total_reviewedBy`;
                sRequest.get(query).then(counter => {
                    if (((counter[0].total_reviewedBy === counter[0].total_reviewed) || (counter[0].isOptional > 0) ||
                        (counter[0].priorityTotal !== 0 && counter[0].priorityTotal === counter[0].priorityItemTotal)) && data.status === '1') {
                        query = `UPDATE investment_txns SET reviewDone = ${1} WHERE ID =${data.txnId}`;
                        sRequest.get(query)
                            .then(function (response_) {
                                res.send(response);
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
                        sRequest.get(query)
                            .then(function (response_) {
                                res.send(response);
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

/**End point to post an investment/savings transaction **/
router.post('/posts', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let data = req.body
    let query = `UPDATE investment_op_approvals SET isPosted = ${data.status}, postedBy=${data.userId},isCompleted = ${1}, updatedAt ='${dt.toString()}' WHERE ID =${data.id}`;
    sRequest.get(query).then(function (response) {
        if (response.status === undefined) {
            query = `Select 
                (Select Count(*) as total_posted from investment_op_approvals where txnId = ${data.txnId} AND (isPosted = 1 || isCompleted = 1) AND method = 'POST') as total_posted,
                (Select Count(*) as isOptional from investment_op_approvals where txnId = ${data.txnId} AND isAllRoles = 0 AND method = 'POST') as isOptional,
                (Select Count(*) as priorityTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'POST' AND priority IS NOT NULL) as priorityTotal,
                (Select Count(*) as priorityItemTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'POST' AND priority = '${data.priority}') as priorityItemTotal,
                (Select Count(*) as total_postedBy from investment_op_approvals where txnId = ${data.txnId} AND method = 'POST') as total_postedBy`;
            sRequest.get(query).then(counter => {
                if (((counter[0].total_postedBy === counter[0].total_posted) || (counter[0].isOptional > 0) ||
                    (counter[0].priorityTotal !== 0 && counter[0].priorityTotal === counter[0].priorityItemTotal)) && data.status === '1') {
                    let total_bal = 0;


                    computeTotalAccountBalance(data.clientId, data.investmentId).then(totalBalance_ => {
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
                            const updateDate = (data.useTxnDateAsPostDate.toString() === '0') ?
                                moment().utcOffset('+0100').format('YYYY-MM-DD') : data.txn_date;
                            query = `UPDATE investment_txns SET isApproved = ${data.status}, 
                                        updated_date ='${updateDate}', createdBy = ${data.userId},postDone = ${data.status},
                                        amount = ${_amountTxn} , balance ='${Number(bal).toFixed(2)}'
                                        WHERE ID =${data.txnId}`;
                            const _id_ = (data.isWallet.toString() === '0') ? data.investmentId : data.clientId;
                            sRequest.UpdateAndAlert(query, _id_, data.isWallet)
                                .then(function (response_) {
                                    if (data.isReversedTxn === '0') {
                                        debitWalletTxns(data).then(payld => {
                                            setcharges(data, false).then(payload => {
                                                upFrontInterest(data).then(payld2 => {
                                                    res.send(response);
                                                }, __err => {
                                                });
                                            }, err => {
                                            });
                                        }, errrr => {
                                        });
                                    } else {
                                        res.send(response_);
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
                            fundBeneficialAccount(data).then(_payload_2 => {
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
                        sRequest.get(query)
                            .then(function (response_) {
                                fundBeneficialAccount(data).then(payloadf => {
                                    res.send(response);
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
                        fundBeneficialAccount(data).then(_payload_2 => {
                            res.send(_payload_2);
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
    const data = req.body;
    moveFundWallet(data).then(payload => {
        return payload;
    }, err_2 => {
        return {};
    });
});

/**Function call to fund to client wallet and investment/savings account **/
async function fundBeneficialAccount(data) {
    if (data.isTransfer === '1') {
        return new Promise((resolve, reject) => {
            computeAccountBalanceIncludeInterest(data.beneficialInvestmentId).then(balanceIncludingInterest => {
                computeTotalBalance(data.clientId, data.beneficialInvestmentId).then(computedBalanceAmt => {
                    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    let refId = moment().utcOffset('+0100').format('x');
                    let total_bal = (data.isMoveFundTransfer.toString() === '1')
                        ? computedBalanceAmt.currentWalletBalance : balanceIncludingInterest;
                    let sumTotal = total_bal + parseFloat(data.amount.toString().split(',').join(''));
                    let inv_txn = {
                        txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                    sRequest.post(query, inv_txn)
                        .then(function (payload) {
                            if (payload.status === undefined) {
                                //Charge for Transfer
                                deductTransferCharge(data, data.amount).then(result => {
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
        const bal2CalTerminationChrg = await chargeForceTerminate(data);
        let result = await reverseEarlierInterest(data, bal2CalTerminationChrg);
        return result;
    }
}

/** Function call to compute the current investment/savings account balance with interest **/
function computeAccountBalanceIncludeInterest(investmentId) {
    return new Promise((resolve, reject) => {
        let query = `Select amount, is_credit from investment_txns 
        WHERE isWallet = 0 AND investmentId = ${investmentId} 
        AND isApproved = 1 AND postDone = 1`;
        sRequest.get(query).then(response_prdt_ => {
            let total = 0;
            if (response_prdt_.status === undefined) {
                response_prdt_.map(x => {
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

/** Function call to compute the current investment/savings account balance without interest **/
function computeCurrentBalance(investmentId) {
    return new Promise((resolve, reject) => {
        let query = `Select amount, is_credit from investment_txns WHERE isWallet = 0  
        AND investmentId = ${investmentId} AND isApproved = 1 AND postDone = 1`;
        sRequest.get(query).then(response_prdt_ => {
            let total = 0;
            response_prdt_.map(x => {
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

function currentBalanceForInterestCalculation(investmentId) {
    return new Promise((resolve, reject) => {
        computeCurrentBalance(investmentId).then(balance => {
            resolve(balance);
        });
    });
}

/** Function call to compute the current investment/savings account and client wallet balance **/
async function computeTotalBalance(clientId, investmentId) {
    let currentAcctBalance = 0;
    let walletBalance = 0;
    if (investmentId !== '' && investmentId !== undefined && investmentId !== null) {
        currentAcctBalance = await computeCurrentBalance(investmentId);
    }
    walletBalance = await computeWalletBalance(clientId);
    return { currentAcctBalance: currentAcctBalance, currentWalletBalance: walletBalance.currentWalletBalance };
}

/** Function call to compute the current investment/savings account and client wallet balance (With interest txns) **/
async function computeTotalAccountBalance(clientId, investmentId) {
    let currentAcctBalance = 0;
    let walletBalance = 0;
    if (investmentId !== '' && investmentId !== undefined && investmentId !== null) {
        currentAcctBalance = await computeAccountBalanceIncludeInterest(investmentId);
    }
    walletBalance = await computeWalletBalance(clientId);
    return { currentAcctBalance: currentAcctBalance, currentWalletBalance: walletBalance.currentWalletBalance };
}

/** Function call to compute current client wallet balance **/
function computeWalletBalance(clientId) {
    return new Promise((resolve, reject) => {
        let query = `Select amount, is_credit from investment_txns WHERE isWallet = 1 AND clientId = ${clientId} 
        AND isApproved = 1 AND postDone = 1`;
        sRequest.get(query).then(payload2 => {
            let total = 0;
            payload2.map(x => {
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


function getInvestmentDetails(investmentId) {
    return new Promise((resolve, reject) => {
        let query = `Select i.code, p.name as investmentName from investments i 
        left join investment_products p on i.productId = p.ID
        WHERE i.ID = ${investmentId}`;
        sRequest.get(query).then(response_prdt_ => {
            if (response_prdt_[0] !== undefined)
                resolve(response_prdt_[0]);
            else
                resolve({});
        }, err => {
            resolve({});
        });
    });
}


function getTerminatedOrMaturedInvestment(investmentId) {
    return new Promise((resolve, reject) => {
        let query = `Select investmentId,isInvestmentMatured from investment_txns where investmentId = ${(investmentId === '' || investmentId === undefined || investmentId === null) ? 0 : investmentId} AND (isInvestmentMatured = 1 or isInvestmentTerminated = 1) Limit 1`;
        sRequest.get(query).then(payload2 => {
            if (payload2.length > 0) {
                resolve(payload2[0]);
            } else {
                resolve({});
            }
        }, err => {
            resolve({});
        });
    });
}

function updateTerminatedOrMaturedInvestment(investmentId, isInvestmentMatured) {
    return new Promise((resolve, reject) => {
        if (investmentId !== undefined && investmentId !== null && investmentId !== ''
            && isInvestmentMatured !== undefined && isInvestmentMatured !== null && isInvestmentMatured !== '') {
            let query = `UPDATE investments SET isClosed = 1, isMatured = 1 WHERE ID = ${investmentId}`;
            sRequest.get(query).then(payload2 => {
                if (payload2.length > 0) {
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

/** Function call to compute investment up-front interest **/
async function upFrontInterest(data) {
    if (data.interest_disbursement_time.toString() === 'Up-Front' && data.is_capital.toString() === '1') {
        return new Promise((resolve, reject) => {
            computeAccountBalanceIncludeInterest(data.investmentId).then(balanceWithInterest => {
                computeTotalBalance(data.clientId, data.investmentId).then(totalAmt => {
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
                        txn_date: data.txn_date,
                        description: 'Total Up-Front interest',
                        amount: Number(SI).toFixed(2),
                        is_credit: 1,
                        created_date: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
                        balance: Number(total).toFixed(2),
                        is_capital: 0,
                        ref_no: moment().utcOffset('+0100').format('x'),
                        updated_date: data.txn_date,
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
                    sRequest.post(query, _inv_txn)
                        .then(function (_payload_) {
                            _inv_txn.ID = _payload_.insertId;
                            deductWithHoldingTax(data, _inv_txn.amount, 0, _inv_txn.balance, data.clientId, data.interest_moves_wallet, _inv_txn)
                                .then(p__ => {
                                    resolve({});
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

/** Function call to compute and deduct transfer charge **/
async function deductTransferCharge(data, amount) {
    return new Promise((resolve, reject) => {
        if (data.isInvestmentMatured.toString() === '0') {
            computeAccountBalanceIncludeInterest(data.investmentId).then(currentBalance => {
                let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                let query = `SELECT * FROM investment_config ORDER BY ID DESC LIMIT 1`;
                sRequest.get(query).then(response => {
                    if (response.status === undefined) {
                        let configData = response[0];

                        let _charge = (configData.transferValue === undefined ||
                            configData.transferValue === null ||
                            configData.transferValue === '') ? 0 : parseFloat(configData.transferValue.toString());


                        let configAmount = (configData.transferChargeMethod == 'Fixed') ? _charge : (_charge * parseFloat(Number(amount).toFixed(2))) / 100;
                        let _refId = moment().utcOffset('+0100').format('x');
                        let balTransfer = currentBalance - configAmount;
                        let inv_txn = {
                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                        setInvestmentTxns(inv_txn).then(payload => {
                            deductVatTax(data, configAmount, inv_txn, inv_txn.balance).then(payload_1 => {
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

function fundWallet(value) {
    return new Promise((resolve, reject) => {
        setInvestmentTxns(value).then(payload => {
            resolve(payload);
        }, err => {
            reject(0);
        });
    });
}

/** Function call to close an investment account after maturity or termination operation **/
function closeInvestmentWallet(investmentId) {
    return new Promise((resolve, reject) => {
        let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let query = `UPDATE investments SET
        date_modified = '${dt}',
        isTerminated = 1,
        isInterestCleared = 1,
        isMatured = 1,
        isClosed = 1
        WHERE ID = ${investmentId}`;
        sRequest.get(query).then(response_prdt_ => {
            resolve(response_prdt_);
        }, err => {
            resolve({});
        });
    });
}


/** Function call to compute and charge for force termination of investment **/
function chargeForceTerminate(data) {
    return new Promise((resolve, reject) => {
        if (data.isInvestmentTerminated.toString() === '1' && data.isForceTerminate.toString() === '1') {
            computeAccountBalanceIncludeInterest(data.investmentId).then(balanceIncludingInterest => {
                computeCurrentBalance(data.investmentId).then(balance => {
                    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    let _refId = moment().utcOffset('+0100').format('x');
                    let query = `SELECT t.*,p.*,v.description,v.amount as txnAmount,
                    v.balance as txnBalance,v.isApproved,v.isInterestCharged,v.is_credit FROM investments t 
                    left join investment_products p on p.ID = t.productId
                    left join investment_txns v on v.investmentId = t.ID
                    WHERE v.investmentId = ${data.investmentId} AND v.isApproved = 1 ORDER BY v.ID DESC LIMIT 1`;
                    sRequest.get(query).then(response => {
                        if (response.status === undefined) {
                            let configData = response[0];
                            let _charge = (configData.min_days_termination_charge === undefined ||
                                configData.min_days_termination_charge === null ||
                                configData.min_days_termination_charge === '') ? 0 : parseFloat(configData.min_days_termination_charge.toString());
                            let configAmount = (configData.opt_on_min_days_termination === 'Fixed')
                                ? _charge : ((_charge * balance) / 100);
                            let sumTotalBalance = balanceIncludingInterest - configAmount;
                            let inv_txn = {
                                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                description: `MINIMUM NOTICE DAYS TERMINATION CHARGE`,
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
                                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                createdBy: data.createdBy,
                                isTerminationCharge: 1
                            };
                            query = `INSERT INTO investment_txns SET ?`;
                            try {
                                sRequest.post(query, inv_txn).then(response__ => {
                                    deductVatTax(data, configAmount, inv_txn, inv_txn.balance).then(payload___ => {
                                        resolve(balance);
                                    }, err => {
                                        resolve(balance);
                                    });
                                }, err__ => {
                                    resolve({});
                                });

                            } catch (error) {
                                resolve(balance);
                            }
                        }
                    }, err => {
                        resolve(balance);
                    })
                });
            });
        } else {
            computeCurrentBalance(data.investmentId).then(balance => {
                resolve(balance);
            });
        }
    });
}

/** Function call to compute all existing interest on an account **/
function getExistingInterests(data) {
    return new Promise((resolve, reject) => {
        let query = `SELECT v.ID,v.isWithHoldings, v.description,v.is_credit,v.amount as txnAmount,v.balance as txnBalance,v.isApproved,
        v.isInterest,v.isInterestCharged,v.is_credit,p.premature_interest_rate FROM investment_txns v
        LEFT JOIN investments i on i.ID = v.investmentId
        left join investment_products p on p.ID = i.productId
        WHERE (v.isInterest = 1 OR v.isWithHoldings = 1) AND investmentId = ${data.investmentId} AND isApproved = 1`;
        sRequest.get(query).then(payload => {
            const result = (payload.length === 0) ? [{ premature_interest_rate: 0 }] : payload;
            resolve(result);
        });
    });
}

function getProductConfigInterests(data) {
    return new Promise((resolve, reject) => {
        let query = `SELECT t.*,p.*,c.ID as clientId FROM investments t 
        left join investment_products p on p.ID = t.productId
        left join clients c on c.ID = t.clientId
        WHERE t.ID = ${data.investmentId}`;
        sRequest.get(query).then(payload => {
            resolve(payload[0]);
        });
    });
}

/** Function call to compute interest when investment mature or after termination **/
async function getInterestEndOfTenure(data) {
    const matureMonths = await getValidInvestmentMatureMonths(data.investmentId, 0);
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
                interest_rate: data.interest_rate,
                interest_disbursement_time: data.interest_disbursement_time,
                isInvestmentTerminated: data.isInvestmentTerminated
            }
            await computeInterestTxns2(_data);
        }
        return {};
    } catch (error) {
        return error;
    }

}

/** Function call to compute and update investment account after termination **/
function updateTerminatedInterest(data) {
    return new Promise((resolve, reject) => {
        let query = `UPDATE investment_interests SET isTerminated = 1 
        WHERE id <> 0 AND investmentId = ${data.investmentId}`;

        sRequest.get(query).then(axio_callback => {
            getDatedTxns(data).then(datedTxns => {
                updateDatedTxns(datedTxns, 0).then(updatedDates => {
                    resolve({});
                });
            });
        });
    });
}

/** Function call to compute and reverse investment interest after termination **/
async function reverseEarlierInterest(data, bal2CalTerminationChrg) {
    const _getExistingInterests = await getExistingInterests(data);
    const _getProductConfigInterests = await getProductConfigInterests(data);
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
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
            const balanceIncludingInterest = await computeAccountBalanceIncludeInterest(data.investmentId);
            let refId = moment().utcOffset('+0100').format('x');
            let sumTotalBalance = balanceIncludingInterest - parseFloat(Number(totalInterestAmount).toFixed(2));
            let inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                investmentId: data.investmentId,
                createdBy: data.createdBy
            };

            let query = `INSERT INTO investment_txns SET ?`;
            await sRequest.post(query, inv_txn);
            const nextBalance = parseFloat(Number(sumTotalBalance).toFixed(2)) + parseFloat(Number(totalInterestAmountWHT).toFixed(2));
            inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                investmentId: data.investmentId,
                createdBy: data.createdBy
            };
            await setInvestmentTxns(inv_txn);
            let mdata = {
                investmentId: data.investmentId,
                endDate: data.investment_mature_date,
                startDate: data.investment_start_date
            }
            await updateTerminatedInterest(mdata);

            refId = moment().utcOffset('+0100').format('x');
            dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            let configData = _getProductConfigInterests;

            let _charge = (configData.interest_forfeit_charge === undefined ||
                configData.interest_forfeit_charge === null ||
                configData.interest_forfeit_charge === '') ? 0 : parseFloat(configData.interest_forfeit_charge.toString());
            let configAmount = (configData.interest_forfeit_charge_opt == 'Fixed') ? _charge : (_charge * bal2CalTerminationChrg) / 100;//_payload_3.balance;
            const invSumBalance = await computeAccountBalanceIncludeInterest(data.investmentId);
            let sumBalance = invSumBalance - configAmount; //(totalInvestedAmount + interestAmount) - configAmount;
            inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                description: `CHARGE ON PREMATURE INVESTMENT`,
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
                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                createdBy: data.createdBy,
                isTerminationCharge: 1
            };
            await setInvestmentTxns(inv_txn);
            await deductVatTax(data, configAmount, inv_txn, inv_txn.balance);
            dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            const ids = await getInvestmentInterestIDs(data.investmentId);
            await updateInvestmentInterestIDs(ids);
            const matureMonths = await getValidInvestmentMatureMonths(data.investmentId, 0);
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
                    interest_rate: reduceInterestRateApplied[0].premature_interest_rate,
                    interest_disbursement_time: data.interest_disbursement_time,
                    isInvestmentTerminated: data.isInvestmentTerminated
                }
                await computeInterestTxns2(_data);
            }
            query = `DELETE FROM investment_txns WHERE ID=${data.txnId}`;
            const _res_ = await sRequest.get(query);
            if (_res_.status === undefined) {
                const currentBal = await computeAccountBalanceIncludeInterest(data.investmentId);
                inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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

                await setInvestmentTxns(inv_txn);
                const __balance = await computeWalletBalance(data.clientId);

                refId = moment().utcOffset('+0100').format('x');
                let wBalance = __balance.currentWalletBalance;
                let _totalBalance = wBalance + currentBal;
                inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                    createdBy: data.createdBy,
                    isWallet: 1,
                    clientId: _getProductConfigInterests.clientId
                };
                await fundWallet(inv_txn);
                await closeInvestmentWallet(data.investmentId);
            }

        } else {
            const _currentBalance = await computeAccountBalanceIncludeInterest(data.investmentId);
            let refId = moment().utcOffset('+0100').format('x');
            let configData = _getProductConfigInterests;

            let _charge = (configData.interest_forfeit_charge === undefined ||
                configData.interest_forfeit_charge === null ||
                configData.interest_forfeit_charge === '') ? 0 : parseFloat(configData.interest_forfeit_charge.toString());
            configData.interest_forfeit_charge = (configData.interest_forfeit_charge !== null && configData.interest_forfeit_charge !== '') ? parseFloat(configData.interest_forfeit_charge.toString()) : 0;
            let configAmount = (configData.interest_forfeit_charge_opt === 'Fixed') ? _charge : (_charge * bal2CalTerminationChrg) / 100;
            let sumBalance2 = _currentBalance - configAmount;
            let inv_txn = {
                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                description: `CHARGE ON PREMATURE INVESTMENT`,
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
                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                createdBy: data.createdBy,
                isTerminationCharge: 1
            };
            await setInvestmentTxns(inv_txn);

            await deductVatTax(data, configAmount, inv_txn, inv_txn.balance);

            let query = `DELETE FROM investment_txns WHERE ID = ${data.txnId}`;
            const _res_ = await sRequest.get(query);

            await getInterestEndOfTenure(data);
            if (_res_.status === undefined) {
                refId = moment().utcOffset('+0100').format('x');
                const mBalance = await computeAccountBalanceIncludeInterest(data.investmentId);
                inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                    createdBy: data.createdBy
                };
                const __balance = await computeWalletBalance(data.clientId);
                let wBalance = __balance.currentWalletBalance;
                let _totalBalance = wBalance + mBalance;
                await setInvestmentTxns(inv_txn);
                inv_txn = {
                    txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                    updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                    createdBy: data.createdBy,
                    isWallet: 1,
                    clientId: configData.clientId
                };
                await fundWallet(inv_txn);
                await closeInvestmentWallet(data.investmentId);
            }

        }
    } catch (error) {
        return error;
    }
    return {};
}

/** Function call to raise a debit transaction on client wallet **/
function debitWalletTxns(data) {
    return new Promise((resolve, reject) => {
        if (data.isPaymentMadeByWallet.toString() === '1') {
            computeWalletBalance(data.clientId).then(walletBal => {
                let walletAmt = parseFloat(data.amount.toString());
                let walletCurrentBal = walletBal.currentWalletBalance - walletAmt;
                let inv_txn = {
                    txn_date: data.txn_date,
                    description: `Investment/Savings Fund`,
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
                    updated_date: data.txn_date,
                    investmentId: data.investmentId,
                    isWallet: 1,
                    clientId: data.clientId,
                    createdBy: data.createdBy
                };
                query = `INSERT INTO investment_txns SET ?`;
                sRequest.post(query, inv_txn)
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

/** Function call to compute and post any form of charge related to a transaction **/
async function setcharges(data, isReversal) {
    return new Promise((resolve, reject) => {
        if (data.isInvestmentTerminated === '1' || data.isTransfer === '1') {
            fundBeneficialAccount(data).then(fundBene => {
                resolve(fundBene);
            }, err => {
                resolve({});
            });
        } else {
            computeAccountBalanceIncludeInterest(data.investmentId).then(balanceIncludingInterest_ => {
                computeTotalBalance(data.clientId, data.investmentId).then(computedTotalBalance => {
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
                        sRequest.get(query).then(response_product => {
                            if (response_product[0].isInterest.toString() === '0') {
                                if (data.isCredit.toString() === '1') {

                                    let chargeForDeposit = response_product.filter(x => x.saving_fees !== '0' && x.saving_fees !== '');
                                    if (chargeForDeposit.length > 0) {
                                        let total = _total;
                                        let _charge = (chargeForDeposit[0].saving_fees === undefined ||
                                            chargeForDeposit[0].saving_fees === null ||
                                            chargeForDeposit[0].saving_fees === '') ? 0 : parseFloat(chargeForDeposit[0].saving_fees.toString());
                                        //let total = parseFloat(chargeForDeposit[chargeForDeposit.length - 1].txnBalance.split(',').join(''))
                                        const chargedCost = (chargeForDeposit[0].saving_charge_opt === 'Fixed') ? _charge : ((_charge / 100) * parseFloat(data.amount.split(',').join('')));
                                        let inv_txn = {
                                            txn_date: (isReversal === false) ? data.txn_date : moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                                            updated_date: (isReversal === false) ? data.txn_date : moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                            investmentId: data.investmentId,
                                            createdBy: data.createdBy
                                        };
                                        query = `INSERT INTO investment_txns SET ?`;
                                        sRequest.post(query, inv_txn)
                                            .then(function (payload) {
                                                if (payload.status === undefined) {
                                                    if (isReversal === false) {
                                                        let txnAmount2 = Number(chargedCost).toFixed(2);
                                                        deductVatTax(data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
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
                                    let getInvestBalance = response_product[response_product.length - 1];
                                    // getInvestBalance.minimum_bal_charges = (getInvestBalance.minimum_bal_charges === '') ? '0' : getInvestBalance.minimum_bal_charges;

                                    let _charge = (getInvestBalance.minimum_bal_charges === undefined ||
                                        getInvestBalance.minimum_bal_charges === null ||
                                        getInvestBalance.minimum_bal_charges === '') ? 0 : parseFloat(getInvestBalance.minimum_bal_charges.toString());


                                    let chargedCostMinBal = (getInvestBalance.minimum_bal_charges_opt === 'Fixed')
                                        ? _charge
                                        : ((_charge / 100) * parseFloat(_total.toString()));
                                    if ((parseFloat(_total.toString()) - parseFloat(data.amount.toString())) < parseFloat(getInvestBalance.minimum_bal.split(',').join(''))) {

                                        refId = moment().utcOffset('+0100').format('x');
                                        const sumBal_ = acctSumBalance - chargedCostMinBal;
                                        let inv_txn = {
                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                            investmentId: data.investmentId,
                                            createdBy: data.createdBy
                                        };
                                        query = `INSERT INTO investment_txns SET ?`;
                                        sRequest.post(query, inv_txn)
                                            .then(function (payload) {
                                                if (payload.status === undefined) {
                                                    let txnAmount2 = Number(chargedCostMinBal).toFixed(2);
                                                    deductVatTax(data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
                                                        resolve(result);
                                                    }, err => {
                                                        resolve({});
                                                    });
                                                }
                                            }, err => { });
                                    }

                                    computeAccountBalanceIncludeInterest(data.investmentId).then(balanceIncludingInterest_2 => {
                                        computeTotalBalance(data.clientId, data.investmentId).then(computedTotalBalance2 => {
                                            _total = (data.isWallet.toString() === '1') ? computedTotalBalance2.currentWalletBalance : computedTotalBalance.currentAcctBalance;
                                            const sum_Total = _total = (data.isWallet.toString() === '1') ? computedTotalBalance2.currentWalletBalance : balanceIncludingInterest_2;
                                            let currentDate = new Date();
                                            let formatedDate = `${currentDate.getUTCFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
                                            if (response_product[0].withdrawal_freq_duration === 'Daily') {
                                                query = `SELECT * FROM investment_txns WHERE 
                                                STR_TO_DATE(updated_date, '%Y-%m-%d') = '${formatedDate}' 
                                                AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                                sRequest.get(query).then(response_product_ => {
                                                    if (response_product_.length === parseInt(response_product[0].freq_withdrawal)
                                                        && response_product[0].chkEnforceCount === 1) {
                                                        query = `UPDATE investments SET canWithdraw = 0 WHERE ID =${data.investmentId}`;
                                                        sRequest.get(query);
                                                    }

                                                    if (response_product_.length > parseInt(response_product[0].freq_withdrawal)
                                                        && parseInt(response_product[0].freq_withdrawal) !== 0) {
                                                        let _getInvestBalance = response_product[response_product.length - 1];
                                                        _getInvestBalance.withdrawal_fees = (_getInvestBalance.withdrawal_fees === '') ? '0' : _getInvestBalance.withdrawal_fees;
                                                        let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                            parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                            ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                                parseFloat(data.amount.toString()));
                                                        refId = moment().utcOffset('+0100').format('x');
                                                        const sumBal_1 = sum_Total - _chargedCostMinBal;
                                                        let inv_txn = {
                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                                                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                            investmentId: data.investmentId,
                                                            createdBy: data.createdBy
                                                        };

                                                        query = `INSERT INTO investment_txns SET ?`;
                                                        sRequest.post(query, inv_txn)
                                                            .then(function (payload) {
                                                                if (payload.status === undefined) {
                                                                    let txnAmount2 = Number(_chargedCostMinBal).toFixed(2);
                                                                    deductVatTax(data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
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
                                            } else if (response_product[0].withdrawal_freq_duration === 'Weekly') {
                                                let weekStartDate = startOfWeek(new Date());
                                                let endOfTheWeek = endOfWeek(new Date());
                                                const weekStartDateFormat = `${weekStartDate.getFullYear()}-${weekStartDate.getMonth() + 1}-${weekStartDate.getDate()}`;
                                                const endOfTheWeekFormat = `${endOfTheWeek.getFullYear()}-${endOfTheWeek.getMonth() + 1}-${endOfTheWeek.getDate()}`;

                                                query = `SELECT * FROM investment_txns WHERE 
                                                STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${weekStartDateFormat}' 
                                                AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheWeekFormat}' 
                                                AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                                sRequest.get(query).then(response_product_ => {

                                                    if (response_product_.length === parseInt(response_product[0].freq_withdrawal)
                                                        && response_product[0].chkEnforceCount === 1) {
                                                        query = `UPDATE investments SET canWithdraw = 0 WHERE ID =${data.investmentId}`;
                                                        sRequest.get(query);
                                                    }

                                                    if (response_product_.length > parseInt(response_product[0].freq_withdrawal)
                                                        && parseInt(response_product[0].freq_withdrawal) !== 0) {
                                                        let _getInvestBalance = response_product[response_product.length - 1];
                                                        _getInvestBalance.withdrawal_fees = (_getInvestBalance.withdrawal_fees === '') ? '0' : _getInvestBalance.withdrawal_fees;
                                                        let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                            parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                            ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                                parseFloat(data.amount.toString()));
                                                        refId = moment().utcOffset('+0100').format('x');
                                                        const sumBal_1 = sum_Total - _chargedCostMinBal;
                                                        let inv_txn = {
                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                                                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                            investmentId: data.investmentId,
                                                            createdBy: data.createdBy
                                                        };

                                                        query = `INSERT INTO investment_txns SET ?`;
                                                        sRequest.post(query, inv_txn)
                                                            .then(function (payload) {
                                                                if (payload.status === undefined) {
                                                                    let txnAmount2 = Number(_chargedCostMinBal).toFixed(2);
                                                                    deductVatTax(data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
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
                                            } else if (response_product[0].withdrawal_freq_duration === 'Monthly') {
                                                let monthStartDate = startOfMonth(new Date());
                                                let endOfTheMonth = endOfMonth(new Date());

                                                const monthStartDateFormat = `${monthStartDate.getFullYear()}-${monthStartDate.getMonth() + 1}-${1}`;
                                                const endOfTheMonthFormat = `${endOfTheMonth.getFullYear()}-${endOfTheMonth.getMonth() + 1}-${endOfTheMonth.getDate()}`;

                                                query = `SELECT * FROM investment_txns v WHERE 
                                                STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${monthStartDateFormat}' 
                                                AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheMonthFormat}' 
                                                AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                                sRequest.get(query).then(response_product_ => {

                                                    if (response_product_.length === parseInt(response_product[0].freq_withdrawal)
                                                        && response_product[0].chkEnforceCount === 1) {
                                                        query = `UPDATE investments SET canWithdraw = 0 WHERE ID =${data.investmentId}`;
                                                        sRequest.get(query);
                                                    }

                                                    if (response_product_.length > parseInt(response_product[0].freq_withdrawal)
                                                        && parseInt(response_product[0].freq_withdrawal) !== 0) {
                                                        let _getInvestBalance = response_product[response_product.length - 1];
                                                        _getInvestBalance.withdrawal_fees = (_getInvestBalance.withdrawal_fees === '') ? '0' : _getInvestBalance.withdrawal_fees;
                                                        let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                            parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                            ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                                parseFloat(data.amount.toString()));
                                                        refId = moment().utcOffset('+0100').format('x');
                                                        const sumBal_1 = sum_Total - _chargedCostMinBal;
                                                        let inv_txn = {
                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                                                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                            investmentId: data.investmentId,
                                                            createdBy: data.createdBy
                                                        };

                                                        query = `INSERT INTO investment_txns SET ?`;
                                                        sRequest.post(query, inv_txn)
                                                            .then(function (payload) {
                                                                if (payload.status === undefined) {
                                                                    let txnAmount2 = Number(_chargedCostMinBal).toFixed(2);
                                                                    let txnBal = Number(parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal).toFixed(2);
                                                                    deductVatTax(data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
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
                                            } else if (response_product[0].withdrawal_freq_duration === 'Quaterly') {
                                                let quaterStartDate = startOfQuarter(new Date())
                                                let quaterEndDate = endOfQuarter(new Date());

                                                const quaterStartDateFormat = `${quaterStartDate.getFullYear()}-${quaterStartDate.getMonth() + 1}-${1}`;
                                                const quaterEndDateFormat = `${quaterEndDate.getFullYear()}-${quaterEndDate.getMonth() + 1}-${quaterEndDate.getDate()}`;


                                                query = `SELECT * FROM investment_txns v WHERE 
                                                STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${quaterStartDateFormat}' 
                                                AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${quaterEndDateFormat}' 
                                                AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                                sRequest.get(query).then(response_product_ => {

                                                    if (response_product_.length === parseInt(response_product[0].freq_withdrawal)
                                                        && response_product[0].chkEnforceCount === 1) {
                                                        query = `UPDATE investments SET canWithdraw = 0 WHERE ID =${data.investmentId}`;
                                                        sRequest.get(query);
                                                    }

                                                    if (response_product_.length > parseInt(response_product[0].freq_withdrawal)
                                                        && parseInt(response_product[0].freq_withdrawal) !== 0) {
                                                        let _getInvestBalance = response_product[response_product.length - 1];
                                                        _getInvestBalance.withdrawal_fees = (_getInvestBalance.withdrawal_fees === '') ? '0' : _getInvestBalance.withdrawal_fees;
                                                        let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                            parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                            ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                                parseFloat(data.amount.toString()));
                                                        refId = moment().utcOffset('+0100').format('x');
                                                        const sumBal_1 = sum_Total - _chargedCostMinBal;
                                                        let inv_txn = {
                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                                                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                            investmentId: data.investmentId,
                                                            createdBy: data.createdBy
                                                        };

                                                        query = `INSERT INTO investment_txns SET ?`;
                                                        sRequest.post(query, inv_txn)
                                                            .then(function (payload) {
                                                                if (payload.status === undefined) {
                                                                    let txnAmount2 = Number(_chargedCostMinBal).toFixed(2);
                                                                    deductVatTax(data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
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

                                            } else if (response_product[0].withdrawal_freq_duration === 'Yearly') {
                                                let beginOfTheYear = new Date();

                                                const yearStartDateFormat = `${beginOfTheYear.getFullYear()}-${1}-${1}`;
                                                const yearEndDateFormat = `${beginOfTheYear.getFullYear()}-${12}-${31}`;


                                                query = `SELECT * FROM investment_txns WHERE 
                                                STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${yearStartDateFormat}' 
                                                AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${yearEndDateFormat}' 
                                                AND investmentId = ${data.investmentId} AND isWithdrawal = 1 AND isApproved = 1 AND is_credit = 0`;
                                                sRequest.get(query).then(response_product_ => {
                                                    if (response_product_.length === parseInt(response_product[0].freq_withdrawal)
                                                        && response_product[0].chkEnforceCount === 1) {
                                                        query = `UPDATE investments SET canWithdraw = 0 WHERE ID =${data.investmentId}`;
                                                        sRequest.get(query);
                                                    }

                                                    if (response_product_.length > parseInt(response_product[0].freq_withdrawal)
                                                        && parseInt(response_product[0].freq_withdrawal) !== 0) {
                                                        let _getInvestBalance = response_product[response_product.length - 1];
                                                        _getInvestBalance.withdrawal_fees = (_getInvestBalance.withdrawal_fees === '') ? '0' : _getInvestBalance.withdrawal_fees;
                                                        let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                                            parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                                            ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                                                parseFloat(data.amount.toString()));
                                                        refId = moment().utcOffset('+0100').format('x');
                                                        const sumBal_1 = sum_Total - _chargedCostMinBal;
                                                        let inv_txn = {
                                                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                                                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                                            investmentId: data.investmentId,
                                                            createdBy: data.createdBy
                                                        };

                                                        query = `INSERT INTO investment_txns SET ?`;
                                                        sRequest.post(query, inv_txn)
                                                            .then(function (payload) {
                                                                if (payload.status === undefined) {
                                                                    let txnAmount2 = Number(_chargedCostMinBal).toFixed(2);
                                                                    deductVatTax(data, txnAmount2, inv_txn, inv_txn.balance).then(result => {
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

/** Function call to compute and post VAT **/
function deductVatTax(data, _amount, txn, balance) {
    return new Promise((resolve, reject) => {
        if (data.isInvestmentMatured.toString() === '0') {
            let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            let query = `SELECT * FROM investment_config ORDER BY ID DESC LIMIT 1`;
            sRequest.get(query).then(response => {
                if (response.status === undefined) {
                    let configData = response[0];

                    let _charge = (configData.vat === undefined ||
                        configData.vat === null ||
                        configData.vat === '') ? 0 : parseFloat(configData.vat.toString());


                    let configAmount = (configData.vatChargeMethod === 'Fixed') ? _charge : (_charge * parseFloat(_amount.toString())) / 100;
                    let _refId = moment().utcOffset('+0100').format('x');
                    let _mBalance = Number(parseFloat(balance)).toFixed(2) - parseFloat(configAmount);
                    let inv_txn = {
                        txn_date: data.txn_date,
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
                        updated_date: data.txn_date,
                        createdBy: data.createdBy,
                        isVat: 1,
                        isTerminationCharge: (txn.isTerminationCharge === 1) ? 1 : 0
                    };
                    setInvestmentTxns(inv_txn).then(result => {
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

/** End point to compute interest **/
router.post('/compute-interest', function (req, res, next) {
    let data = req.body;
    computeInterestTxns2(data).then(payload => {
        res.send(payload);
    }, err => {
        res.send(err);
    });
});

/** End point to return fully mature months in an investment account**/
router.get('/mature-interest-months/:id', function (req, res, next) {
    computeCurrentBalance(req.params.id).then(_bal => {
        if (_bal > 0) {
            getValidInvestmentMatureMonths(req.params.id, 1).then(payload => {
                const result = payload.filter(x => isLastDayOfMonth(x.endDate));
                res.send(result);
            });
        } else {
            res.send([]);
        }
    });
});

/** End point to return an investment daily list of interest **/
router.get('/client-interests/:id', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT * FROM investment_interests 
    WHERE isTerminated = 0 AND investmentId = ${req.params.id} 
    AND amount LIKE "${search_string}%" ${order} LIMIT ${limit} OFFSET ${offset}`;

    sRequest.get(query).then(response => {
        query = `SELECT count(*) as recordsFiltered FROM investment_interests 
        WHERE investmentId = ${req.params.id}
        AND amount LIKE "${search_string}%"`;
        sRequest.get(query).then(payload => {
            query = `SELECT count(*) as recordsTotal FROM investment_interests WHERE investmentId = ${req.params.id}`;
            sRequest.get(query).then(payload2 => {
                res.send({
                    draw: draw,
                    recordsTotal: payload2[0].recordsTotal,
                    recordsFiltered: payload[0].recordsFiltered,
                    data: (response === undefined) ? [] : response
                });
            });
        });
    });
});

/** End point to return an investment transactions within a date range **/
router.get('/investment-statements/:id', function (req, res, next) {
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

    sRequest.get(query).then(response => {
        query = `SELECT count(*) as recordsFiltered FROM investment_txns v 
    left join investments i on v.investmentId = i.ID
    left join clients c on i.clientId = c.ID 
    left join investment_products p on i.productId = p.ID
    WHERE v.investmentId = ${req.params.id} AND STR_TO_DATE(v.updated_date, '%Y-%m-%d')>= '${req.query.startDate}' 
    AND STR_TO_DATE(v.updated_date, '%Y-%m-%d')<= '${req.query.endDate}'
    AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%")`;
        sRequest.get(query).then(payload => {
            query = `SELECT count(*) as recordsTotal FROM investment_txns WHERE investmentId = ${req.params.id} 
            AND STR_TO_DATE(updated_date, '%Y-%m-%d')>= '${req.query.startDate}' AND STR_TO_DATE(updated_date, '%Y-%m-%d')<= '${req.query.endDate}'`;
            sRequest.get(query).then(payload2 => {
                res.send({
                    draw: draw,
                    recordsTotal: payload2[0].recordsTotal,
                    recordsFiltered: payload[0].recordsFiltered,
                    data: (response === undefined) ? [] : response
                });
            });
        });
    }, err => { });
});


//Functions
async function monthlyMaturedInvestmentDate(investmentId) {
    let query = `SELECT DAY(updated_date) as day, MONTH(updated_date) AS month, YEAR(updated_date) AS year
    FROM investment_txns WHERE investmentId = ${investmentId} AND isApproved = 1 AND isInterestCharged = 0 AND isInterest = 0
    GROUP BY MONTH(updated_date), YEAR(updated_date)`;
    try {
        const months = await sRequest.get(query);
        return months;
    } catch (err) {
        return err;
    }
}

/** Function call to return number of mature months and investment start date **/
function investmentMonths(investmentId) {
    return new Promise((resolve, reject) => {
        let query = `SELECT investment_start_date, investment_mature_date FROM investments WHERE ID = ${investmentId}`;
        const currentDate = new Date();
        let currentDt = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
        sRequest.get(query).then(payload => {
            var result = differenceInCalendarMonths(
                new Date((payload[0].investment_mature_date !== '') ? payload[0].investment_mature_date : currentDt),
                new Date(payload[0].investment_start_date)
            )
            resolve({ months: result, investment_start_date: payload[0].investment_start_date });
        }, err => {
            reject(err);
        });
    });
}

/** Function call to return the date of the first day and the last day of every mature months **/
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


async function dailyMaturedInvestmentTxns(investmentId, firstDate, date) {
    let query = `SELECT t.*,a.investment_mature_date,a.investment_start_date, a.clientId,
    p.interest_rate, p.ID as productId, p.interest_moves_wallet FROM investment_txns t
    left join investments a on a.ID = t.investmentId
    left join investment_products p on p.ID = a.productId
    WHERE t.isWallet = 0 AND t.investmentId = ${investmentId} AND STR_TO_DATE(t.updated_date, '%Y-%m-%d') <= '${date}' 
    AND t.isApproved = 1 ORDER BY t.ID DESC LIMIT 1`;

    try {
        const result = await sRequest.get(query);
        return result;
    } catch (err) {
        return err;
    }
}

async function sumUpInvestmentInterest(investmentId, isPosted, isTerminated) {
    return new Promise((resolve, reject) => {
        let query = `SELECT SUM(amount) as total FROM investment_interests
    WHERE investmentId = ${investmentId} AND isPosted = ${isPosted} AND isTerminated = ${isTerminated}`;
        sRequest.get(query).then(result => {
            if (result[0] === undefined) {
                resolve('0');
            } else {
                resolve(result[0].total);
            }
        }, err => {
            reject(err);
        });
    });
}

async function sumInvestmentInterestRange(investmentId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        let query = `SELECT SUM(amount) as total FROM investment_interests
        WHERE investmentId = ${investmentId} AND isPosted = 0 
        AND STR_TO_DATE(interestDate, '%Y-%m-%d') >='${startDate}'
        AND STR_TO_DATE(interestDate, '%Y-%m-%d') <='${endDate}'`;
        sRequest.get(query).then(result => {
            resolve(result[0].total);
        }, err => {
            reject(err);
        });
    });
}

/** Function call to return all IDs of an investment daily computed interests**/
function getInvestmentInterestIDs(investmentId) {
    return new Promise((resolve, reject) => {
        let query = `SELECT ID FROM investment_interests
        WHERE investmentId = ${investmentId}`;
        sRequest.get(query).then(result => {
            resolve(result);
        }, err => {
            reject(err);
        });
    });
}

/** Function call to update all previously computed interests during investment termination**/
function updateInvestmentInterestIDs(ids) {
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

        sRequest.get(query).then(result => {
            resolve(result);
        }, err => {
            reject(err);
        });
    });
}

/** Function call to compute and return daily last balance without considering interest**/
function sumInvestmentInterestPerDayRange(investmentId, inStartDate, startDate, date) {
    return new Promise((resolve, reject) => {
        let query = `SELECT amount, is_credit, balance FROM investment_txns
        WHERE investmentId = ${investmentId} AND isApproved = 1 AND postDone = 1 AND isTerminationCharge = 0 
        AND isWallet = 0 AND (STR_TO_DATE(updated_date, '%Y-%m-%d') >='${inStartDate}'
        OR STR_TO_DATE(updated_date, '%Y-%m-%d') >='${startDate}')
        AND STR_TO_DATE(updated_date, '%Y-%m-%d') <='${date}'`;
        sRequest.get(query).then(result => {
            let total = 0;
            // I added variable dailyBalance to mirror variable total Segun implemented
            let dailyBalance = 0;
            if (result.length > 0) {
                // Variable dailyBalance here gets the last balance each day
               dailyBalance = Number(result[result.length-1].balance).toFixed(2);
                result.map(x => {
                    if (x.is_credit === 1) {
                        total += parseFloat(x.amount.toString());
                    } else {
                        total -= parseFloat(x.amount.toString());
                    }
                });
            }
            // let dailyBalance = parseFloat(Number(dailyBalance).toFixed(2));
            let _result = parseFloat(Number(total).toFixed(2));
            resolve({_result, dailyBalance});
        }, err => {
            reject(err);
        });
    });
}



// I commented this part
/** Function call to compute and return daily last balance without considering interest**/
// function sumInvestmentInterestPerDayRange(investmentId, inStartDate, startDate, date) {
//     return new Promise((resolve, reject) => {
//         let query = `SELECT amount, is_credit FROM investment_txns
//         WHERE investmentId = ${investmentId} AND isApproved = 1 AND postDone = 1 AND isTerminationCharge = 0 
//         AND isWallet = 0 AND (STR_TO_DATE(updated_date, '%Y-%m-%d') >='${inStartDate}'
//         OR STR_TO_DATE(updated_date, '%Y-%m-%d') >='${startDate}')
//         AND STR_TO_DATE(updated_date, '%Y-%m-%d') <='${date}'`;
//         sRequest.get(query).then(result => {
//             let total = 0;
//             if (result.length > 0) {
//                 result.map(x => {
//                     if (x.is_credit === 1) {
//                         total += parseFloat(x.amount.toString());
//                     } else {
//                         total -= parseFloat(x.amount.toString());
//                     }
//                 });
//             }
//             let _result = parseFloat(Number(total).toFixed(2));
//             resolve(_result);
//         }, err => {
//             reject(err);
//         });
//     });
// }




/** Function call to compute and return daily last balance without considering interest**/
function setInvestmentInterestPerDay(values) {
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
            interestDate,
            dailyBalanceAmount
        )
        VALUES `;
        let bodyQuery = '';
        for (let i = 0; i < values.length; i++) {
            const item = values[i];
            bodyQuery += `(${item.amount},${item.clientId},${item.investmentId},'${item.createdAt}',${item.month},${item.year},${item.balance},'${item.date}', ${item.dailyBalanceAmount})`;
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




// I commented this part
/** Function call to compute and return daily last balance without considering interest**/
// function setInvestmentInterestPerDay(values) {
//     return new Promise((resolve, reject) => {
//         let baseQuery = `INSERT INTO
//         investment_interests(
//             amount,
//             clientId,
//             investmentId,
//             createdAt,
//             month,
//             year,
//             balance,
//             interestDate
//         )
//         VALUES `;
//         let bodyQuery = '';
//         for (let i = 0; i < values.length; i++) {
//             const item = values[i];
//             bodyQuery += `(${item.amount},${item.clientId},${item.investmentId},'${item.createdAt}',${item.month},${item.year},${item.balance},'${item.date}')`;
//             if (values.length !== i + 1) {
//                 bodyQuery += ',';
//             }
//         }

//         let query = baseQuery + bodyQuery;
//         sRequest.get(query).then(result => {
//             resolve(result);
//         }, err => {
//             reject(err);
//         });
//     });
// }



/** Function call to return the maturity date for an investment account **/
function getInvestmentMaturityDate(investmentId) {
    return new Promise((resolve, reject) => {
        let query = `SELECT investment_mature_date FROM investments WHERE ID = ${investmentId}`;
        sRequest.get(query).then(payload => {
            resolve(payload[0]);
        }, err => {
            resolve(false);
        });
    });
}

/** Function call to return date(days) within two dates of an investment account **/
function getInvestmentMonthDatesRange(startDate, maturityDate, investmentId) {
    return new Promise((resolve, reject) => {
        getInvestmentMaturityDate(investmentId).then(iv_maturityDate => {
            let daysInInvestmentDuration = differenceInCalendarDays(
                new Date(maturityDate),
                new Date(startDate)
            );
            let daysInInvestment = [];
            for (let index = 0; index <= daysInInvestmentDuration; index++) {
                const dt = addDays(new Date(startDate), index);
                daysInInvestment.push(`${dt.getUTCFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`);
            }
            const result = daysInInvestment.filter(x => {
                if (
                    isAfter(new Date(x),
                        new Date(iv_maturityDate.investment_mature_date)) === false) {
                    return x;
                }

            });
            resolve(result);
        });
    });
}

/** Function call to compute and return investment daily interest **/
async function getInvestmentDailyBalance(data) {
    let dailyBalances = [];
    const payload = await getInvestmentMonthDatesRange(data.startDate, data.maturityDate, data.investmentId);
    let daysInYear = 365;
    if (isLeapYear(new Date())) {
        daysInYear = 366;
    }
    let totalInterestAmount = 0;
    let monthlyOpeningBalance = 0;
    // I added daily balance
    let dailyBalanceAmount = 0
    let isLocked = false;
    for (let index = 0; index < payload.length; index++) {
        const x = payload[index];
        const balance = await sumInvestmentInterestPerDayRange(data.investmentId, data.investment_start_date, data.startDate, x)
        let totalInvestedAmount = parseFloat(balance._result.toString());
        monthlyOpeningBalance = (monthlyOpeningBalance === 0) ? totalInvestedAmount : monthlyOpeningBalance;
        dailyBalanceAmount = balance.dailyBalance; 

        const _interest_rate = (data.interest_rate === '' ||
            data.interest_rate === undefined ||
            data.interest_rate === null) ? 0 : data.interest_rate;
        let interestInDays = parseFloat(_interest_rate.toString()) / 100;
        let SI = (totalInvestedAmount * interestInDays * (1 / daysInYear));
        totalInterestAmount += SI;
        monthlyOpeningBalance += SI;
        dailyBalances.push({
            dailyBalanceAmount,
            date: x,
            balance: Number(monthlyOpeningBalance).toFixed(2),
            amount: Number(SI).toFixed(2),
            clientId: data.clientId,
            investmentId: data.investmentId,
            createdAt: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
            month: x.split('-')[1],
            year: x.split('-')[0]
        });
    }
    return ({ dailyBalances: dailyBalances, totalInterestAmount: totalInterestAmount });
}


// I commented this part
/** Function call to compute and return investment daily interest **/
// async function getInvestmentDailyBalance(data) {
//     let dailyBalances = [];
//     const payload = await getInvestmentMonthDatesRange(data.startDate, data.maturityDate, data.investmentId);
//     let daysInYear = 365;
//     if (isLeapYear(new Date())) {
//         daysInYear = 366;
//     }
//     let totalInterestAmount = 0;
//     let monthlyOpeningBalance = 0;
//     let isLocked = false;
//     for (let index = 0; index < payload.length; index++) {
//         const x = payload[index];
//         const balance = await sumInvestmentInterestPerDayRange(data.investmentId, data.investment_start_date, data.startDate, x)
//         let totalInvestedAmount = parseFloat(balance.toString());
//         monthlyOpeningBalance = (monthlyOpeningBalance === 0) ? totalInvestedAmount : monthlyOpeningBalance;
//         const _interest_rate = (data.interest_rate === '' ||
//             data.interest_rate === undefined ||
//             data.interest_rate === null) ? 0 : data.interest_rate;
//         let interestInDays = parseFloat(_interest_rate.toString()) / 100;
//         let SI = (totalInvestedAmount * interestInDays * (1 / daysInYear));
//         totalInterestAmount += SI;
//         monthlyOpeningBalance += SI;
//         dailyBalances.push({
//             date: x,
//             balance: Number(monthlyOpeningBalance).toFixed(2),
//             amount: Number(SI).toFixed(2),
//             clientId: data.clientId,
//             investmentId: data.investmentId,
//             createdAt: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
//             month: x.split('-')[1],
//             year: x.split('-')[0]
//         });
//     }
//     return ({ dailyBalances: dailyBalances, totalInterestAmount: totalInterestAmount });
// }




/** End point to return list of an investment maturity months and date(Written for TEST purpose) **/
router.post('/investment-durations', function (req, res, next) {
    const data = req.body;
    getValidInvestmentMatureMonths(data.investmentId, 0).then(payload => {
        res.send(payload);
    });
});

/** Function call to only return mature month and date that interest has not been computed on **/
async function getValidInvestmentMatureMonths(investmentId, isMonthly) {
    let results = [];
    const payload = await investmentMonths(investmentId);
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
        const validate = await monthlyValidMaturedInvestmentDate(investmentId, dt[1], dt[0]);
        if (validate) {
            results.push(element);
        }
    }
    return results;
}

/** Sub Function in getValidInvestmentMatureMonths(investmentId, isMonthly) **/
function monthlyValidMaturedInvestmentDate(investmentId, month, year) {
    return new Promise((resolve, reject) => {
        let query = `SELECT count(id) as counter FROM investment_interests WHERE investmentId = ${investmentId} 
        AND isPosted = 1 AND isTerminated = 0 AND month = ${month} AND year = ${year}`;
        sRequest.get(query).then(payload => {
            if (payload[0].counter === 0) {
                resolve(true);
            } else {
                resolve(false);
            }
        }, err => {
            resolve(false);
        });
    });
}


async function setInvestmentInterest(value) {
    let query = `INSERT INTO investment_interests SET ?`;
    try {
        const result = await sRequest.post(query, value);
        return result;
    } catch (err) {
        return err;
    }
}

/** Function call to return the total sum of amount in a client wallet **/
async function sumAllWalletInvestmentTxns(clientId) {
    return new Promise((resolve, reject) => {
        let query = `SELECT amount, is_credit FROM investment_txns
        WHERE clientId = ${clientId} AND isWallet = ${1} AND isApproved = 1 AND postDone =1`;
        sRequest.get(query).then(result => {
            let total = 0;
            result.map(x => {
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

/** Function call to save transaction **/
function setInvestmentTxns(value) {
    return new Promise((resolve, reject) => {
        if (value.amount > 0) {
            let query = `INSERT INTO investment_txns SET ?`;
            sRequest.post(query, value).then(payload => {
                resolve(payload);
            }, err => {
                resolve({});
            });
        } else {
            resolve(0);
        }
    });
}

/** Function call to get all investment/savings transaction within date range **/
function getDatedTxns(data) {
    return new Promise((resolve, reject) => {
        let query = `SELECT ID FROM investment_txns
WHERE investmentId = ${data.investmentId} 
AND STR_TO_DATE(updated_date, '%Y-%m-%d') >='${data.startDate}'
AND STR_TO_DATE(updated_date, '%Y-%m-%d') <='${data.endDate}'`;

        sRequest.get(query).then(payload => {
            resolve(payload);
        }, err => {
            reject(err);
        })
    });
}

/** Function call to update each transactions from getDatedTxns(data) **/
async function updateDatedTxns(value, isInterestCharged) {
    return new Promise((resolve, reject) => {
        if (value.length === 0) {
            resolve({});
        }
        let baseQuery = `UPDATE investment_txns SET isInterestCharged = ${isInterestCharged} WHERE `;
        let subQuery = '';
        for (let index = 0; index < value.length; index++) {
            const element = value[index];
            subQuery += `ID = ${element.ID}`;
            if (index + 1 !== value.length && value.length > 1)
                subQuery += ' OR ';
        }
        let query = baseQuery + subQuery;
        sRequest.get(query).then(payload => {
            resolve(payload);
        }, err => {
            reject(err);
        });
    });
}

/** Function call that houses all of the functions related to computing and posting of interest **/
async function computeInterestTxns2(data) {
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
        getInvestmentDailyBalance(_data).then(payload => {
            setInvestmentInterestPerDay(payload.dailyBalances).then(interestValues => {
                if (data.interest_moves_wallet.toString() === '1') {
                    sumAllWalletInvestmentTxns(data.clientId).then(walletBalance_ => {
                        let amountValue = (data.interest_disbursement_time === "Up-Front" && (data.isInvestmentTerminated === '0' || data.isInvestmentTerminated === undefined))
                            ? 0 : payload.totalInterestAmount;
                        let bal_ = walletBalance_ + amountValue;
                        let inv_txn = {
                            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
                            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                            investmentId: data.investmentId,
                            createdBy: data.createdBy,
                            clientId: data.clientId,
                            isWallet: 1,
                            isInterest: 1
                        };

                        setInvestmentTxns(inv_txn).then(setInv => {
                            inv_txn.ID = setInv.insertId;
                            deductWithHoldingTax(data, inv_txn.amount, 0, inv_txn.balance, data.clientId, 1, inv_txn).then(deductWithHoldingTax_ => {
                                let query = `UPDATE investment_interests SET isPosted = 1 
                                                            WHERE id <> 0 AND investmentId = ${data.investmentId} 
                                                            AND month = ${monthNyear[1]} 
                                                            AND year = ${monthNyear[0]}`;

                                sRequest.get(query).then(axio_callback => {
                                    getDatedTxns(data).then(datedTxns => {
                                        updateDatedTxns(datedTxns, 1).then(updatedDates => {
                                            resolve({});
                                        });
                                    });
                                });
                            });
                        });
                    });
                } else {
                    computeAccountBalanceIncludeInterest(data.investmentId).then(balanceIncludingInterestm => {
                        getInvestmentDetails(data.investmentId).then(invDetails => {
                            const _status = (data.isInvestmentTerminated === '0' || data.isInvestmentTerminated === undefined) ? 0 : 1;
                            let _amt = (data.interest_disbursement_time === "Up-Front" && _status === 0) ? 0 : payload.totalInterestAmount;
                            let sumTotalBalance = balanceIncludingInterestm + _amt;

                            let inv_txn = {
                                txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                description: `${invDetails.code}(${invDetails.investmentName}) Investment interest@ ${data.endDate}`,
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
                                updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                                investmentId: data.investmentId,
                                createdBy: data.createdBy,
                                isInterest: 1
                            };
                            setInvestmentTxns(inv_txn).then(getTxnValue => {
                                inv_txn.ID = getTxnValue.insertId;
                                deductWithHoldingTax(data, inv_txn.amount, 0, inv_txn.balance, '', 0, inv_txn).then(deductWithHoldingTax_ => {
                                    let query = `UPDATE investment_interests SET isPosted = 1 
                                                        WHERE id <> 0 AND investmentId = ${data.investmentId} 
                                                        AND month = ${monthNyear[1]} 
                                                        AND year = ${monthNyear[0]}`;
                                    sRequest.get(query).then(axio_callback => {
                                        getDatedTxns(data).then(datedTxns => {
                                            updateDatedTxns(datedTxns, 1).then(updatedDates => {
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

/** Function call to compute and post With-Holding Tax **/
function deductWithHoldingTax(data, _amount, total, bal_, clientId, isWallet, txn) {
    return new Promise((resolve, reject) => {
        if (parseInt(_amount.toString()) === 0) {
            resolve({});
        } else {
            let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            let query = `SELECT * FROM investment_config ORDER BY ID DESC LIMIT 1`;
            sRequest.get(query).then(response => {
                if (response.status === undefined) {
                    let configData = response[0];
                    let _charge = (configData.withHoldingTax === undefined ||
                        configData.withHoldingTax === null ||
                        configData.withHoldingTax === '') ? 0 : parseFloat(configData.withHoldingTax.toString());
                    let configAmount = (configData.withHoldingTaxChargeMethod == 'Fixed') ? _charge
                        : (_charge * (total + parseFloat(Number(_amount).toFixed(2)))) / 100;
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
                        parentTxnId: txn.ID,
                        postDone: 1,
                        reviewDone: 1,
                        approvalDone: 1,
                        ref_no: refId,
                        updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
                        investmentId: data.investmentId,
                        createdBy: data.createdBy,
                        clientId: clientId,
                        isWallet: isWallet
                    };
                    setInvestmentTxns(inv_txn).then(result => {
                        result.balance = inv_txn.balance;
                        resolve(result);
                    }, err => {
                        resolve({});
                    });
                }
            }, err => {
                resolve({});
            })
        }
    });
}

/** End point to get client wallet transactions **/
router.get('/client-wallets/:id', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    //ORDER BY STR_TO_DATE(v.created_date, '%Y-%m-%d') ${aoData[2].value[0].dir}
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT 
    v.ID,v.ref_no,c.fullname,v.description,v.created_date,v.amount,v.balance as txnBalance,v.txn_date,p.ID as productId,u.fullname as createdByName,
    v.isDeny,v.isPaymentMadeByWallet,v.isReversedTxn,v.isTransfer,v.isMoveFundTransfer,v.beneficialInvestmentId,p.interest_disbursement_time,p.interest_moves_wallet,
    v.approvalDone,v.reviewDone,v.postDone,p.code,p.name,i.investment_start_date, v.ref_no,v.isWithdrawal,isDeposit,v.isDocUploaded,v.isApproved,v.is_credit,v.isInvestmentTerminated,
    p.acct_allows_withdrawal,i.investment_mature_date,p.interest_rate,v.isForceTerminate,v.isInvestmentMatured,p.inv_moves_wallet,p.chkEnforceCount,p.premature_interest_rate,
    i.clientId,p.canTerminate,v.is_capital,v.investmentId,i.isTerminated,v.isWallet, v.updated_date, i.isMatured FROM investment_txns v 
    left join investments i on v.investmentId = i.ID 
    left join clients c on i.clientId = c.ID
    left join users u on u.ID = v.createdBy
    left join investment_products p on p.ID = i.productId
    WHERE v.isWallet = 1 AND v.clientId = ${req.params.id} ORDER BY ID LIMIT ${limit} OFFSET ${offset}`;
    sRequest.get(query).then(response => {
        let uniqueTxns = [];
        response.map(d => {
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
        sRequest.get(query).then(payload => {
            computeWalletBalance(req.params.id).then(txnCurrentBalance => {
                query = `SELECT count(*) as recordsTotal FROM investment_txns WHERE isWallet = 1 AND clientId = ${req.params.id}`;
                sRequest.get(query).then(payload2 => {
                    uniqueTxns.map(x => {
                        x.balance = txnCurrentBalance.currentWalletBalance;
                    });
                    organisationSettings().then(settingsProductId => {
                        uniqueTxns.map(x => {
                            x.productId = settingsProductId;
                        });
                        res.send({
                            draw: draw,
                            txnCurrentBalance: txnCurrentBalance.currentWalletBalance,
                            recordsTotal: payload2[0].recordsTotal,
                            recordsFiltered: payload[0].recordsFiltered,
                            data: (uniqueTxns === undefined) ? [] : uniqueTxns
                        });
                    });
                }, err => {
                });
            });
        });
    });
});

/** End point to get client wallet balance **/
router.get('/client-wallet-balance/:id', function (req, res, next) {
    computeWalletBalance(req.params.id).then(balance => {
        res.send(balance);
    });
});


router.get('/transaction-timelines/:id', function (req, res, next) {
    let query = `SELECT o.*, isDeny, u.fullname as reviewedByName, a.fullname as approvedByName, p.fullname as postedByName, i.description FROM investment_op_approvals o 
    left join users u on u.ID = o.reviewedBy
    left join users a on a.ID = o.approvedBy 
    left join users p on p.ID = o.postedBy
    left join investment_txns i on i.ID = o.txnId 
    WHERE o.investmentId = ${req.params.id}
    ORDER BY ID DESC`;
    sRequest.get(query).then(response => {
        res.send(response);
    });
});


// router.get('/transaction-timelines/:id', function (req, res, next) {
//     let query = `SELECT o.*, u.fullname as createdByName, i.description FROM investment_op_approvals o 
//     left join users u on u.ID = o.createdBy 
//     left join investment_txns i on i.ID = o.txnId 
//     WHERE o.investmentId = ${req.params.id}`;
//     sRequest.get(query).then(response => {
//         res.send(response);
//     });
// });

router.get('/investment-accounts/:id', function (req, res, next) {
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
    sRequest.get(query)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send(err);
        })
        .catch(function (error) {
            res.send(error);
        });
});

/** End point to return an investment/savings transaction statement **/
router.get('/inv-statements/:id', function (req, res, next) {
    let data = req.query;
    let query = `SELECT v.ID,v.ref_no,c.fullname,v.description,v.amount,v.created_date,v.txn_date,p.ID as productId,u.fullname as createdByName,
    v.approvalDone,v.reviewDone,v.postDone,p.code,p.name,i.investment_start_date,i.investment_mature_date, v.ref_no, v.isApproved,v.is_credit,i.clientId,
    v.balance,v.is_capital,v.investmentId,i.isTerminated, i.isMatured FROM investment_txns v 
    left join investments i on v.investmentId = i.ID
    left join clients c on i.clientId = c.ID
    left join users u on u.ID = v.createdBy
    left join investment_products p on i.productId = p.ID
    WHERE v.isWallet = 0 AND v.investmentId = ${req.params.id} AND STR_TO_DATE(v.txn_date, '%Y-%m-%d') >= '${data.startDate}' AND STR_TO_DATE(v.txn_date, '%Y-%m-%d') <= '${data.endDate}' AND v.isApproved = 1 AND v.postDone = 1 ORDER BY v.ID`;
    sRequest.get(query).then(response => {
        if (response.status === undefined) {
            res.send(response);
        } else {
            res.send(response);
        }
    }, err => {
        res.send(err);
    });
});

/** End point to return organisation details and configuration **/
router.get('/get-organisation-configs', function (req, res, next) {
    let query = `SELECT * FROM investment_config ORDER BY ID DESC LIMIT 1`;
    sRequest.get(query).then(response => {
        if (response.status === undefined) {
            res.send(response);
        } else {
            res.send(response);
        }
    }, err => {
        res.send(err);
    });
});

/** End point to return all tax transactions **/
router.get('/get-organisation-taxes', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT * FROM investment_txns 
    WHERE isCharge = 1 || isVat = 1 || isWithHoldings = 1
    AND (upper(description) LIKE "${search_string}%" OR upper(amount) LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;

    sRequest.get(query).then(response => {
        query = `SELECT count(*) as recordsFiltered 
        FROM investment_txns 
        WHERE isCharge = 1 || isVat = 1 || isWithHoldings = 1
        AND (upper(description) LIKE "${search_string}%" OR upper(amount) LIKE "${search_string}%")`;
        sRequest.get(query).then(payload => {
            query = `SELECT count(*) as recordsTotal 
            FROM investment_txns 
            WHERE isCharge = 1 || isVat = 1 || isWithHoldings = 1`;
            sRequest.get(query).then(payload2 => {
                res.send({
                    draw: draw,
                    recordsTotal: payload2[0].recordsTotal,
                    recordsFiltered: payload[0].recordsFiltered,
                    data: response
                });
            });
        });
    });
});

/** End point to return sum of every form of charge transactions **/
router.get('/get-sum-charges', function (req, res, next) {
    let query = `SELECT * FROM investment_txns 
    WHERE isCharge = 1 || isVat = 1 || isWithHoldings = 1`;
    sRequest.get(query).then(response => {
        if (response.status === undefined) {
            let chargeTotal = 0;
            let vatTotal = 0;
            let withHoldingTaxTotal = 0;
            if (response.length > 0) {
                response.map(x => {
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
            res.send(response);
        }
    }, err => {
        res.send(err);
    });
});

/** End point to return the status of a reversed transaction **/
router.get('/check-reverse-txns/:id', function (req, res, next) {
    let query = `SELECT isApproved FROM investment_txns 
    WHERE isReversedTxn = 1 AND parentTxnId = ${req.params.id}`;
    sRequest.get(query).then(response => {
        if (response.status === undefined) {
            res.send(response[0]);
        } else {
            res.send(response);
        }
    }, err => {
        res.send(err);
    });
});

/** Function call to close an account after completing maturity opertion **/
async function closeMatureInvestmentAccount(data) {
    for (let index1 = 0; index1 < data.value.length; index1++) {
        const element1 = data.value[index1];
        const matureMonths = await getValidInvestmentMatureMonths(element1.ID, 0);
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
                interest_rate: element1.interest_rate,
                interest_disbursement_time: element1.interest_disbursement_time,
                isInvestmentTerminated: element1.isInvestmentTerminated
            }
            await computeInterestTxns2(_data);
        }
        const totalSumAmount = await computeAccountBalanceIncludeInterest(element1.ID);
        const walletBal = await computeWalletBalance(element1.clientId)
        const balTotal = parseFloat(walletBal.currentWalletBalance.toString()) + parseFloat(totalSumAmount.toString());
        let inv_txn = {
            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD')
        };
        await setInvestmentTxns(inv_txn);

        let inv_txn2 = {
            txn_date: moment().utcOffset('+0100').format('YYYY-MM-DD'),
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
            updated_date: moment().utcOffset('+0100').format('YYYY-MM-DD')
        };
        await setInvestmentTxns(inv_txn2);
        await closeInvestmentWallet(element1.ID);
    }

    return {};
}

/** End point to close an account **/
router.post('/close-mature-investments', function (req, res, next) {
    const data = req.body;
    closeMatureInvestmentAccount(data).then(payld => {
        res.send(payld);
    });
});

/** End point that houses functions around maturity operation **/
router.post('/compute-mature-investment', function (req, res, next) {
    const data = req.body;
    computeInterestBalance(data).then(payload => {
        res.send({});
    });
});

/** function that houses functions around maturity operation **/
async function computeInterestBalance(data) {
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
                interest_moves_wallet: data.interest_moves_wallet,
                interest_disbursement_time: data.interest_disbursement_time
            }]
        };
        const payld = await closeMatureInvestmentAccount(items);
        return payld;
    } else {
        return {};
    }
};

module.exports = router;