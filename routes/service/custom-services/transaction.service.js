const express = require('express');
const axios = require('axios');
const moment = require('moment');
const router = express.Router();
const differenceInMonths = require('date-fns/difference_in_months');
const endOfMonth = require('date-fns/end_of_month');
const endOfWeek = require('date-fns/end_of_Week');
const endOfQuarter = require('date-fns/end_of_quarter');
const endOfYear = require('date-fns/end_of_year');
const startOfWeek = require('date-fns/start_of_week');
const startOfMonth = require('date-fns/start_of_week');
const startOfQuarter = require('date-fns/start_of_quarter');
const differenceInCalendarDays = require('date-fns/difference_in_calendar_days');

//re.role_name as review_role_name,po.role_name as post_role_name,
// left join user_roles re on a.roleId = re.id
//     left join user_roles po on a.roleId = po.id
//     left join users u on u.ID = a.approvedBy

router.get('/get-txn-user-roles/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT t.ID,t.txn_date,t.description,t.amount,u.fullname,
    t.is_credit,t.ref_no,a.ID as approvalId,a.*,r.role_name, r.id as roleId,ut.user_role as userViewRole,
    a.ID as txnApprovadId FROM investment_txns t
    left join investments i on i.ID = t.investmentId
    left join investment_op_approvals a on a.txnId = t.ID
    left join user_roles r on a.roleId = r.id
    left join users u on u.ID = a.approvedBy
    left join users ut on ut.ID = ${req.query.userId}
    WHERE a.txnId = ${req.params.id} AND a.method = ${req.query.method}`;
    console.log('***********************************************************Satrt*******************************************');
    console.log(query);
    console.log('***********************************************************Satrt*******************************************');
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
    let refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
    let query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE investmentId = ${data.investmentId} AND isApproved = 1`;
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
                    txn_date: dt,
                    description: data.description,
                    amount: data.amount,
                    is_credit: data.is_credit,
                    created_date: dt,
                    balance: total,
                    is_capital: 0,
                    ref_no: refId,
                    investmentId: data.investmentId,
                    createdBy: data.createdBy
                };
                query = `INSERT INTO investment_txns SET ?`;
                endpoint = `/core-service/post?query=${query}`;
                url = `${HOST}${endpoint}`;
                axios.post(url, inv_txn)
                    .then(function (_response) {
                        if (_response.data.status === undefined) {
                            query = `SELECT * FROM investment_product_requirements
                            WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
                            console.log('****************************Query*********************************************');
                            console.log(query);
                            console.log('****************************Query End*********************************************');
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
                                                priority: result.priority,
                                                method: 'APPROVAL'
                                            };

                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                            endpoint = `/core-service/post?query=${query}`;
                                            url = `${HOST}${endpoint}`;
                                            try {
                                                axios.post(url, invOps);
                                            } catch (error) {}

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
                                        try {
                                            axios.post(url, invOps);
                                        } catch (error) {}
                                    }
                                })
                                .catch(function (error) {});


                            query = `SELECT * FROM investment_product_reviews
                            WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
                            console.log('****************************Query REVIEW*********************************************');
                            console.log(query);
                            console.log('****************************Query REVIEW End*********************************************');
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
                                                priority: result.priority,
                                                method: 'REVIEW'
                                            };

                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                            endpoint = `/core-service/post?query=${query}`;
                                            url = `${HOST}${endpoint}`;
                                            try {
                                                axios.post(url, invOps);
                                            } catch (error) {}

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
                                        try {
                                            axios.post(url, invOps);
                                        } catch (error) {}
                                    }
                                })
                                .catch(function (error) {});

                            query = `SELECT * FROM investment_product_posts
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
                                                priority: result.priority,
                                                method: 'POST'
                                            };

                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                            endpoint = `/core-service/post?query=${query}`;
                                            url = `${HOST}${endpoint}`;
                                            try {
                                                axios.post(url, invOps);
                                            } catch (error) {}

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
                                        try {
                                            axios.post(url, invOps);
                                        } catch (error) {}
                                    }
                                })
                                .catch(function (error) {});
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
    let query = `UPDATE investment_op_approvals SET isApproved = ${data.status},isCompleted = ${data.status}, approvedBy=${data.userId}, updatedAt ='${dt.toString()}' WHERE ID =${data.id}`;
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
                        (Select Count(*) as total_approved from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND isApproved = 1) as total_approved,
                        (Select Count(*) as isOptional from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND isAllRoles = 0) as isOptional,
                        (Select Count(*) as priorityTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND priority IS NOT NULL) as priorityTotal,
                        (Select Count(*) as priorityItemTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND priority = approvedBy) as priorityItemTotal,
                        (Select Count(*) as total_approvedBy from investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL') as total_approvedBy`;
                endpoint = '/core-service/get';
                url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                }).then(counter => {

                    if ((counter.data[0].total_approvedBy === counter.data[0].total_approved) || (counter.data[0].isOptional > 0) ||
                        (counter.data[0].priorityTotal !== 0 && counter.data[0].priorityTotal === counter.data[0].priorityItemTotal)) {
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
                        query = `UPDATE investment_txns SET approvalDone = ${0} WHERE ID =${data.txnId}`;
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
    let query = `UPDATE investment_op_approvals SET isReviewed = ${data.status}, reviewedBy=${data.userId},isCompleted = ${data.status}, updatedAt ='${dt.toString()}' WHERE ID =${data.id}`;
    let endpoint = `/core-service/get`;
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
            params: {
                query: query
            }
        })
        .then(function (response) {
            res.send(response.data);
            if (response.data.status === undefined) {
                query = `Select 
                        (Select Count(*) as total_reviewed from investment_op_approvals where txnId = ${data.txnId} AND isReviewed = 1 AND method = 'REVIEW') as total_reviewed,
                        (Select Count(*) as isOptional from investment_op_approvals where txnId = ${data.txnId} AND isAllRoles = 0 AND method = 'REVIEW') as isOptional,
                        (Select Count(*) as priorityTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW' AND priority IS NOT NULL) as priorityTotal,
                        (Select Count(*) as priorityItemTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW' AND priority = reviewedBy) as priorityItemTotal,
                        (Select Count(*) as total_reviewedBy from investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW') as total_reviewedBy`;
                endpoint = '/core-service/get';
                url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                }).then(counter => {
                    if ((counter.data[0].total_reviewedBy === counter.data[0].total_reviewed) || (counter.data[0].isOptional > 0) ||
                        (counter.data[0].priorityTotal !== 0 && counter.data[0].priorityTotal === counter.data[0].priorityItemTotal)) {
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
                        query = `UPDATE investment_txns SET reviewDone = ${0} WHERE ID =${data.txnId}`;
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
    let query = `UPDATE investment_op_approvals SET isPosted = ${data.status}, postedBy=${data.userId},isCompleted = ${data.status}, updatedAt ='${dt.toString()}' WHERE ID =${data.id}`;
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
                (Select Count(*) as total_posted from investment_op_approvals where txnId = ${data.txnId} AND isPosted = 1 AND method = 'POST') as total_posted,
                (Select Count(*) as isOptional from investment_op_approvals where txnId = ${data.txnId} AND isAllRoles = 0 AND method = 'POST') as isOptional,
                (Select Count(*) as priorityTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'POST' AND priority IS NOT NULL) as priorityTotal,
                (Select Count(*) as priorityItemTotal from investment_op_approvals where txnId = ${data.txnId} AND method = 'POST' AND priority = postedBy) as priorityItemTotal,
                (Select Count(*) as total_postedBy from investment_op_approvals where txnId = ${data.txnId} AND method = 'POST') as total_postedBy`;
                endpoint = '/core-service/get';
                url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                }).then(counter => {
                    if ((counter.data[0].total_postedBy === counter.data[0].total_posted) || (counter.data[0].isOptional > 0) ||
                        (counter.data[0].priorityTotal !== 0 && counter.data[0].priorityTotal === counter.data[0].priorityItemTotal)) {
                        query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE investmentId = ${data.investmentId}`;
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
                                    let bal = (data.isCredit.toString() === '1') ? (total_bal + parseFloat(data.amount.split(',').join(''))) :
                                        (total_bal - parseFloat(data.amount.split(',').join('')))

                                    query = `UPDATE investment_txns SET isApproved = ${data.status}, updated_date ='${dt.toString()}', createdBy = ${data.userId},postDone = ${data.status},
                                amount = ${data.amount.split(',').join('')} , balance ='${bal}'
                                WHERE ID =${data.txnId}`;
                                    endpoint = `/core-service/get`;
                                    url = `${HOST}${endpoint}`;
                                    axios.get(url, {
                                            params: {
                                                query: query
                                            }
                                        })
                                        .then(function (response_) {
                                            console.log('****************************************Interest status******************************************');
                                            console.log(data);
                                            console.log('****************************************Interest status End******************************************');
                                            setcharges(data, HOST, false);
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
                            });
                    } else {
                        query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE investmentId = ${data.investmentId}`;
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

                                    query = `UPDATE investment_txns SET isApproved = ${0}, updated_date ='${dt.toString()}', postDone = ${0},
                        amount = ${data.amount.split(',').join('')} , balance ='${bal}'
                        WHERE ID =${data.txnId}`;
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


function setcharges(data, HOST, isReversal) {
    console.log(data);
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
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
        console.log(response_product.data);
        //Charge for deposit
        if (response_product.data[0].isInterest.toString() === '1') {
            if (data.isCredit.toString() === '1') {
                let chargeForDeposit = response_product.data.filter(x => x.saving_fees !== '0' && x.saving_fees !== '');
                if (chargeForDeposit.length > 0) {
                    let total = parseFloat(chargeForDeposit[chargeForDeposit.length - 1].txnBalance.split(',').join(''))
                    const chargedCost = (chargeForDeposit[0].saving_charge_opt === 'Fixed') ? parseFloat(chargeForDeposit[0].saving_fees.split(',').join('')) : ((parseFloat(chargeForDeposit[0].saving_fees.split(',').join('')) / 100) * parseFloat(data.amount.split(',').join('')));
                    let inv_txn = {
                        txn_date: dt,
                        description: (isReversal === false) ? 'Charge: ' + chargeForDeposit[0].description : 'Reverse: ' + chargeForDeposit[0].description,
                        amount: chargedCost,
                        is_credit: 0,
                        isCharge: 1,
                        created_date: dt,
                        balance: (isReversal === false) ? (total - chargedCost) : (total + chargedCost),
                        is_capital: 0,
                        isApproved: 1,
                        postDone: 1,
                        reviewDone: 1,
                        approvalDone: 1,
                        ref_no: refId,
                        updated_date: dt,
                        investmentId: data.investmentId,
                        createdBy: data.createdBy
                    };

                    query = `INSERT INTO investment_txns SET ?`;
                    endpoint = `/core-service/post?query=${query}`;
                    let url = `${HOST}${endpoint}`;
                    axios.post(url, inv_txn)
                        .then(function (payload) {}, err => {});
                }
            } else {
                let getInvestBalance = response_product.data[response_product.data.length - 1];
                let chargedCostMinBal = (getInvestBalance.minimum_bal_charges_opt === 'Fixed') ? parseFloat(getInvestBalance.minimum_bal_charges.split(',').join('')) : ((parseFloat(getInvestBalance.minimum_bal_charges.split(',').join('')) / 100) * parseFloat(getInvestBalance.txnBalance.split(',').join('')));
                if (parseFloat(getInvestBalance.txnBalance.split(',').join('')) - parseFloat(getInvestBalance.txnAmount.split(',').join('')) < parseFloat(getInvestBalance.minimum_bal.split(',').join(''))) {
                    refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                    let inv_txn = {
                        txn_date: dt,
                        description: 'Charge: ' + getInvestBalance.description,
                        amount: chargedCostMinBal,
                        is_credit: 0,
                        created_date: dt,
                        balance: getInvestBalance.txnBalance - chargedCostMinBal,
                        is_capital: 0,
                        isCharge: 1,
                        isApproved: 1,
                        postDone: 1,
                        reviewDone: 1,
                        approvalDone: 1,
                        ref_no: refId,
                        updated_date: dt,
                        investmentId: data.investmentId,
                        createdBy: data.createdBy
                    };
                    query = `INSERT INTO investment_txns SET ?`;
                    endpoint = `/core-service/post?query=${query}`;
                    let url = `${HOST}${endpoint}`;
                    axios.post(url, inv_txn)
                        .then(function (payload) {}, err => {});
                }

                let currentDate = new Date();
                let formatedDate = `${currentDate.getUTCFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
                if (response_product.data[0].withdrawal_freq_duration === 'Daily') {
                    query = `SELECT * FROM investment_txns WHERE 
                        STR_TO_DATE(updated_date, '%Y-%m-%d') = '${formatedDate}' 
                        AND investmentId = ${data.investmentId} AND isInterest = 0 AND isCharge = 0 AND isApproved = 1 AND is_credit = 0`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    }).then(response_product_ => {
                        if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal)) {
                            console.log('*******************************************************************************');
                            console.log(response_product.data[0].freq_withdrawal);
                            console.log('*******************************************************************************');
                            let _getInvestBalance = response_product.data[response_product.data.length - 1];
                            console.log('a');
                            let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                    parseFloat(_getInvestBalance.txnAmount.split(',').join('')));
                            console.log('b');
                            console.log(_getInvestBalance);
                            if (parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - parseFloat(_getInvestBalance.txnAmount.split(',').join('')) >
                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join(''))) {
                                refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                let inv_txn = {
                                    txn_date: dt,
                                    description: 'Charge: Exceeding the total number of daily withdrawal',
                                    amount: _chargedCostMinBal,
                                    is_credit: 0,
                                    created_date: dt,
                                    balance: parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal,
                                    is_capital: 0,
                                    isCharge: 1,
                                    isApproved: 1,
                                    postDone: 1,
                                    reviewDone: 1,
                                    approvalDone: 1,
                                    ref_no: refId,
                                    updated_date: dt,
                                    investmentId: data.investmentId,
                                    createdBy: data.createdBy
                                };

                                query = `INSERT INTO investment_txns SET ?`;
                                endpoint = `/core-service/post?query=${query}`;
                                let url = `${HOST}${endpoint}`;
                                axios.post(url, inv_txn)
                                    .then(function (payload) {}, err => {});
                            }
                        }
                    });
                } else if (response_product.data[0].withdrawal_freq_duration === 'Weekly') {

                    let weekStartDate = startOfWeek(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));
                    let endOfTheWeek = endOfWeek(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));
                    query = `SELECT * FROM investment_txns v WHERE 
                        STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${weekStartDate}' 
                        AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheWeek}' 
                        AND investmentId = ${data.investmentId} AND isInterest = 0 AND isCharge = 0 AND isApproved = 1 AND is_credit = 0`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    }).then(response_product_ => {
                        if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal)) {
                            let _getInvestBalance = response_product.data[response_product.data.length - 1];
                            let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                    parseFloat(_getInvestBalance.txnAmount.split(',').join('')));
                            if (parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - parseFloat(_getInvestBalance.txnAmount.split(',').join('')) >
                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join(''))) {
                                refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                let inv_txn = {
                                    txn_date: dt,
                                    description: 'Charge: Exceeding the total number of weekly withdrawal',
                                    amount: _chargedCostMinBal,
                                    is_credit: 0,
                                    created_date: dt,
                                    balance: parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal,
                                    is_capital: 0,
                                    isCharge: 1,
                                    isApproved: 1,
                                    postDone: 1,
                                    reviewDone: 1,
                                    approvalDone: 1,
                                    ref_no: refId,
                                    updated_date: dt,
                                    investmentId: data.investmentId,
                                    createdBy: data.createdBy
                                };

                                query = `INSERT INTO investment_txns SET ?`;
                                endpoint = `/core-service/post?query=${query}`;
                                let url = `${HOST}${endpoint}`;
                                axios.post(url, inv_txn)
                                    .then(function (payload) {}, err => {});
                            }
                        }
                    });
                } else if (response_product.data[0].withdrawal_freq_duration === 'Monthly') {
                    let monthStartDate = startOfMonth(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));
                    let endOfTheMonth = endOfMonth(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));

                    query = `SELECT * FROM investment_txns v WHERE 
                        STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${monthStartDate}' 
                        AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheMonth}' 
                        AND investmentId = ${data.investmentId} AND isInterest = 0 AND isCharge = 0 AND isApproved = 1 AND is_credit = 0`;
                    let endpoint = `/core-service/get`;
                    url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    }).then(response_product_ => {
                        if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal)) {
                            let _getInvestBalance = response_product.data[response_product.data.length - 1];
                            let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                    parseFloat(_getInvestBalance.txnAmount.split(',').join('')));
                            if (parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - parseFloat(_getInvestBalance.txnAmount.split(',').join('')) >
                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join(''))) {
                                refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                let inv_txn = {
                                    txn_date: dt,
                                    description: 'Charge: Exceeding the total number of monthly withdrawal',
                                    amount: _chargedCostMinBal,
                                    is_credit: 0,
                                    created_date: dt,
                                    balance: parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal,
                                    is_capital: 0,
                                    isCharge: 1,
                                    isApproved: 1,
                                    postDone: 1,
                                    reviewDone: 1,
                                    approvalDone: 1,
                                    ref_no: refId,
                                    updated_date: dt,
                                    investmentId: data.investmentId,
                                    createdBy: data.createdBy
                                };

                                query = `INSERT INTO investment_txns SET ?`;
                                endpoint = `/core-service/post?query=${query}`;
                                let url = `${HOST}${endpoint}`;
                                axios.post(url, inv_txn)
                                    .then(function (payload) {}, err => {});
                            }
                        }
                    });
                } else if (response_product.data[0].withdrawal_freq_duration === 'Quaterly') {
                    let quaterStartDate = startOfQuarter(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()))
                    let endOfTheMonth = endOfQuarter(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));

                    query = `SELECT * FROM investment_txns v WHERE 
                        STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${quaterStartDate}' 
                        AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheMonth}' 
                        AND investmentId = ${data.investmentId} AND isInterest = 0 AND isCharge = 0 AND isApproved = 1 AND is_credit = 0`;
                    let endpoint = `/core-service/get`;
                    url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    }).then(response_product_ => {
                        if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal)) {
                            let _getInvestBalance = response_product.data[response_product.data.length - 1];
                            let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                    parseFloat(_getInvestBalance.txnAmount.split(',').join('')));
                            if (parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - parseFloat(_getInvestBalance.txnAmount.split(',').join('')) >
                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join(''))) {
                                refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                let inv_txn = {
                                    txn_date: dt,
                                    description: 'Charge: Exceeding the total number of quaterly withdrawal',
                                    amount: _chargedCostMinBal,
                                    is_credit: 0,
                                    created_date: dt,
                                    balance: parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal,
                                    is_capital: 0,
                                    isCharge: 1,
                                    isApproved: 1,
                                    postDone: 1,
                                    reviewDone: 1,
                                    approvalDone: 1,
                                    ref_no: refId,
                                    updated_date: dt,
                                    investmentId: data.investmentId,
                                    createdBy: data.createdBy
                                };

                                query = `INSERT INTO investment_txns SET ?`;
                                endpoint = `/core-service/post?query=${query}`;
                                let url = `${HOST}${endpoint}`;
                                axios.post(url, inv_txn)
                                    .then(function (payload) {}, err => {});
                            }
                        }
                    });

                } else if (response_product.data[0].withdrawal_freq_duration === 'Yearly') {
                    //endOfYear
                    let beginOfTheMonth = new Date(currentDate.getUTCFullYear(), 1, 1);
                    let endOfTheMonth = endOfYear(new Date(currentDate.getUTCFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));

                    query = `SELECT * FROM investment_txns v WHERE 
                        STR_TO_DATE(updated_date, '%Y-%m-%d') >= '${beginOfTheMonth}' 
                        AND  STR_TO_DATE(updated_date, '%Y-%m-%d') <= '${endOfTheMonth}' 
                        AND investmentId = ${data.investmentId} AND isInterest = 0 AND isCharge = 0 AND isApproved = 1 AND is_credit = 0`;
                    let endpoint = `/core-service/get`;
                    url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    }).then(response_product_ => {
                        if (response_product_.data.length > parseInt(response_product.data[0].freq_withdrawal)) {
                            let _getInvestBalance = response_product.data[response_product.data.length - 1];
                            let _chargedCostMinBal = (_getInvestBalance.withdrawal_freq_fees_opt === 'Fixed') ?
                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) :
                                ((parseFloat(_getInvestBalance.withdrawal_fees.split(',').join('')) / 100) *
                                    parseFloat(_getInvestBalance.txnAmount.split(',').join('')));
                            if (parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - parseFloat(_getInvestBalance.txnAmount.split(',').join('')) >
                                parseFloat(_getInvestBalance.withdrawal_fees.split(',').join(''))) {
                                refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                let inv_txn = {
                                    txn_date: dt,
                                    description: 'Charge: Exceeding the total number of yearly withdrawal',
                                    amount: _chargedCostMinBal,
                                    is_credit: 0,
                                    created_date: dt,
                                    balance: parseFloat(_getInvestBalance.txnBalance.split(',').join('')) - _chargedCostMinBal,
                                    is_capital: 0,
                                    isCharge: 1,
                                    isApproved: 1,
                                    postDone: 1,
                                    reviewDone: 1,
                                    approvalDone: 1,
                                    ref_no: refId,
                                    updated_date: dt,
                                    investmentId: data.investmentId,
                                    createdBy: data.createdBy
                                };

                                query = `INSERT INTO investment_txns SET ?`;
                                endpoint = `/core-service/post?query=${query}`;
                                let url = `${HOST}${endpoint}`;
                                axios.post(url, inv_txn)
                                    .then(function (payload) {}, err => {});
                            }
                        }
                    });
                }
            }
        }
    }, err => {});
}

router.post('/terminate', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = req.body;
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
    let query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance FROM investments t 
    left join investment_products p on p.ID = t.productId
    left join investment_txns v on v.investmentId = t.ID
    WHERE t.ID = ${data.investmentId} AND p.status = 1`;
    let endpoint = `/core-service/get`;
    url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response_product => {

        //Charge for deposit
        let chargeForDeposit = response_product.data.filter(x => x.interest_forfeit_charge !== '0' && x.interest_forfeit_charge !== '');
        if (chargeForDeposit.length > 0) {
            let total = parseFloat(chargeForDeposit[chargeForDeposit.length - 1].txnBalance.split(',').join(''));
            let chargedCost = (chargeForDeposit[0].interest_forfeit_charge_opt === 'Fixed') ? parseFloat(chargeForDeposit[0].interest_forfeit_charge.split(',').join('')) : ((parseFloat(chargeForDeposit[0].interest_forfeit_charge.split(',').join('')) / 100) * total);
            let inv_txn = {
                txn_date: dt,
                description: 'Charge: ' + 'Terminate investment',
                amount: chargedCost,
                is_credit: 0,
                isCharge: 1,
                created_date: dt,
                balance: total - chargedCost,
                is_capital: 0,
                isApproved: 1,
                postDone: 1,
                reviewDone: 1,
                approvalDone: 1,
                ref_no: refId,
                updated_date: dt,
                investmentId: data.investmentId,
                createdBy: data.createdBy
            };

            query = `INSERT INTO investment_txns SET ?`;
            endpoint = `/core-service/post?query=${query}`;
            url = `${HOST}${endpoint}`;
            axios.post(url, inv_txn)
                .then(function (payload) {
                    dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    refId = moment().utcOffset('+0100').format('YYMMDDhmmss'); //date_modified
                    query = `UPDATE investments SET status = ${data.status},isterminated=${data.isterminate}, 
                    date_modified ='${dt.toString()}' WHERE ID =${data.investmentId}`;
                    let endpoint = "/core-service/get";
                    let url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    }).then(function (_response_) {
                        if (_response_.data.status === undefined) {
                            query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE investmentId = ${data.investmentId} AND isApproved = 1`;
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
                                        query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, 
                                                    v.balance as txnBalance,v.isApproved,v.isInterestCharge,v.is_credit FROM investments t 
                                                    left join investment_products p on p.ID = t.productId
                                                    left join investment_txns v on v.investmentId = t.ID
                                                    WHERE t.ID = ${data.investmentId} AND p.status = 1`;
                                        endpoint = `/core-service/get`;
                                        url = `${HOST}${endpoint}`;
                                        axios.get(url, {
                                            params: {
                                                query: query
                                            }
                                        }).then(response_prdt_ => {
                                            let totalInterestAmount = 0;
                                            let reduceInterestRateApplied = response_prdt_.data.filter(x => x.premature_interest_rate !== undefined && x.premature_interest_rate.toString() !== '0');
                                            if (reduceInterestRateApplied.length > 0) {
                                                response_prdt_.data.map(item => {
                                                    if (item.isInterestCharge === 1) {
                                                        totalInterestAmount += parseFloat(item.txnAmount.toString());
                                                    }
                                                });

                                                total = 0;
                                                response_prdt_.data.map(x => {
                                                    if (x.isApproved === 1) {
                                                        let _x = x.txnAmount.split(',').join('');
                                                        if (x.is_credit.toString() === '1') {
                                                            total += parseFloat(_x);
                                                        } else {
                                                            total -= parseFloat(_x);
                                                        }
                                                    }
                                                });
                                                refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                                inv_txn = {
                                                    txn_date: dt,
                                                    description: 'Reverse: ' + 'Interest on investment',
                                                    amount: totalInterestAmount,
                                                    is_credit: 0,
                                                    isCharge: 1,
                                                    created_date: dt,
                                                    balance: total - totalInterestAmount,
                                                    is_capital: 0,
                                                    isApproved: 1,
                                                    postDone: 1,
                                                    reviewDone: 1,
                                                    approvalDone: 1,
                                                    ref_no: refId,
                                                    updated_date: dt,
                                                    investmentId: data.investmentId,
                                                    createdBy: data.createdBy
                                                };

                                                query = `INSERT INTO investment_txns SET ?`;
                                                endpoint = `/core-service/post?query=${query}`;
                                                let url = `${HOST}${endpoint}`;
                                                axios.post(url, inv_txn)
                                                    .then(_payload_interest => {
                                                        query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance,
                                                                    v.isApproved,v.isInterestCharge,v.is_credit FROM investments t 
                                                                    left join investment_products p on p.ID = t.productId
                                                                    left join investment_txns v on v.investmentId = t.ID
                                                                    WHERE t.ID = ${data.investmentId} AND p.status = 1`;
                                                        endpoint = `/core-service/get`;
                                                        url = `${HOST}${endpoint}`;
                                                        axios.get(url, {
                                                            params: {
                                                                query: query
                                                            }
                                                        }).then(response_prdt_2 => {
                                                            let terminatedInterestRate = response_prdt_2.data[0].premature_interest_rate;
                                                            let monthCount = differenceInMonths(
                                                                new Date(response_prdt_2.data[0].investment_mature_date.toString()),
                                                                new Date(response_prdt_2.data[0].investment_start_date.toString())
                                                            );
                                                            totalInterestAmount = 0;
                                                            response_prdt_2.data.map(item => {
                                                                if (item.isInterestCharge === 1 && item.isApproved === 1) {
                                                                    totalInterestAmount += parseFloat(item.txnAmount.toString());
                                                                }
                                                            });

                                                            total = 0;
                                                            response_prdt_2.data.map(x => {
                                                                if (x.isApproved === 1) {
                                                                    let _x = x.txnAmount.split(',').join('');
                                                                    if (x.is_credit.toString() === '1') {
                                                                        total += parseFloat(_x);
                                                                    } else {
                                                                        total -= parseFloat(_x);
                                                                    }
                                                                }
                                                            });
                                                            let SI = (parseFloat(response_prdt_2.data[0].amount.split(',').join('')) * parseFloat(terminatedInterestRate.split(',').join('')) * (monthCount / 12)) / 100;
                                                            let _totalInterestAmount = SI * monthCount;
                                                            refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                                            inv_txn = {
                                                                txn_date: dt,
                                                                description: 'Investment termination interest',
                                                                amount: _totalInterestAmount,
                                                                is_credit: 1,
                                                                isCharge: 1,
                                                                created_date: dt,
                                                                balance: total + _totalInterestAmount,
                                                                is_capital: 0,
                                                                isApproved: 1,
                                                                postDone: 1,
                                                                reviewDone: 1,
                                                                approvalDone: 1,
                                                                ref_no: refId,
                                                                updated_date: dt,
                                                                investmentId: data.investmentId,
                                                                createdBy: data.createdBy
                                                            };

                                                            query = `INSERT INTO investment_txns SET ?`;
                                                            endpoint = `/core-service/post?query=${query}`;
                                                            let url = `${HOST}${endpoint}`;
                                                            axios.post(url, inv_txn)
                                                                .then(_payload_interest_2 => {
                                                                    let inv_txn = {
                                                                        txn_date: dt,
                                                                        description: data.description,
                                                                        amount: total + _totalInterestAmount,
                                                                        is_credit: data.is_credit,
                                                                        created_date: dt,
                                                                        balance: total + _totalInterestAmount,
                                                                        is_capital: 0,
                                                                        ref_no: refId,
                                                                        investmentId: data.investmentId,
                                                                        createdBy: data.createdBy
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
                                                                                    }).then(function (response2) {
                                                                                        if (response2.data.length > 0) {
                                                                                            let result = response2.data[0];
                                                                                            let pasrsedData = JSON.parse(result.roleId);
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
                                                                                                    priority: result.priority,
                                                                                                    method: 'APPROVAL'
                                                                                                };

                                                                                                query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                                endpoint = `/core-service/post?query=${query}`;
                                                                                                url = `${HOST}${endpoint}`;
                                                                                                try {
                                                                                                    axios.post(url, invOps);
                                                                                                } catch (error) {}

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
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}
                                                                                        }
                                                                                    })
                                                                                    .catch(function (error) {});


                                                                                query = `SELECT * FROM investment_product_reviews
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
                                                                                                    priority: result.priority,
                                                                                                    method: 'REVIEW'
                                                                                                };

                                                                                                query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                                endpoint = `/core-service/post?query=${query}`;
                                                                                                url = `${HOST}${endpoint}`;
                                                                                                try {
                                                                                                    axios.post(url, invOps);
                                                                                                } catch (error) {}

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
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}
                                                                                        }
                                                                                    })
                                                                                    .catch(function (error) {});

                                                                                query = `SELECT * FROM investment_product_posts
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
                                                                                                    priority: result.priority,
                                                                                                    method: 'POST'
                                                                                                };

                                                                                                query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                                endpoint = `/core-service/post?query=${query}`;
                                                                                                url = `${HOST}${endpoint}`;
                                                                                                try {
                                                                                                    axios.post(url, invOps);
                                                                                                } catch (error) {}

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
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}
                                                                                        }
                                                                                    })
                                                                                    .catch(function (error) {});
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
                                                                }, err => {});
                                                        }, err => {});
                                                    }, err => {});
                                            }
                                        }, err => {});
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
                        } else {
                            res.send({
                                status: 500,
                                error: error,
                                response: null
                            });
                        }
                    });
                }, err => {});
        } else {

            query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance FROM investments t 
            left join investment_products p on p.ID = t.productId
            left join investment_txns v on v.investmentId = t.ID
            WHERE t.ID = ${data.investmentId} AND p.status = 1`;
            endpoint = `/core-service/get`;
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(response_product_ => {
                chargeForDeposit = response_product_.data.filter(x => x.minimum_bal_charges !== '0' && x.minimum_bal_charges !== '');
                if (chargeForDeposit.length > 0) {
                    total = parseFloat(chargeForDeposit[0].txnBalance.split(',').join(''));
                    chargedCost = (chargeForDeposit[0].minimum_bal_charges_opt === 'Fixed') ? parseFloat(chargeForDeposit[0].minimum_bal_charges_opt.split(',').join('')) : ((parseFloat(chargeForDeposit[0].minimum_bal_charges_opt.split(',').join('')) / 100) * total);


                    inv_txn = {
                        txn_date: dt,
                        description: 'Charge: ' + 'Withdrawal below minimum balance',
                        amount: chargedCost,
                        is_credit: 0,
                        isCharge: 1,
                        created_date: dt,
                        balance: total - chargedCost,
                        is_capital: 0,
                        isApproved: 1,
                        postDone: 1,
                        reviewDone: 1,
                        approvalDone: 1,
                        ref_no: refId,
                        updated_date: dt,
                        investmentId: data.investmentId,
                        createdBy: data.createdBy
                    };

                    query = `INSERT INTO investment_txns SET ?`;
                    endpoint = `/core-service/post?query=${query}`;
                    let url = `${HOST}${endpoint}`;
                    axios.post(url, inv_txn)
                        .then(function (payload_) {
                            query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE investmentId = ${data.investmentId} AND isApproved = 1`;
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
                                        query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance,
                                                    v.isApproved,v.isInterestCharge,v.is_credit FROM investments t 
                                                    left join investment_products p on p.ID = t.productId
                                                    left join investment_txns v on v.investmentId = t.ID
                                                    WHERE t.ID = ${data.investmentId} AND p.status = 1`;
                                        endpoint = `/core-service/get`;
                                        url = `${HOST}${endpoint}`;
                                        axios.get(url, {
                                            params: {
                                                query: query
                                            }
                                        }).then(response_prdt_ => {
                                            let totalInterestAmount = 0;
                                            let reduceInterestRateApplied = response_prdt_.data.filter(x => x.premature_interest_rate !== undefined && x.premature_interest_rate.toString() !== '0');
                                            if (reduceInterestRateApplied.length > 0) {
                                                response_prdt_.data.map(item => {
                                                    if (item.isInterestCharge.toString() === '1') {
                                                        totalInterestAmount += parseFloat(item.txnAmount.toString());
                                                    }
                                                });

                                                total = 0;
                                                response_prdt_.data.map(x => {
                                                    if (x.isApproved === 1) {
                                                        let _x = x.txnAmount.split(',').join('');
                                                        if (x.is_credit.toString() === '1') {
                                                            total += parseFloat(_x);
                                                        } else {
                                                            total -= parseFloat(_x);
                                                        }
                                                    }
                                                });
                                                refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                                inv_txn = {
                                                    txn_date: dt,
                                                    description: 'Reverse: ' + 'Interest on investment',
                                                    amount: totalInterestAmount,
                                                    is_credit: 0,
                                                    isCharge: 1,
                                                    created_date: dt,
                                                    balance: total - totalInterestAmount,
                                                    is_capital: 0,
                                                    isApproved: 1,
                                                    postDone: 1,
                                                    reviewDone: 1,
                                                    approvalDone: 1,
                                                    ref_no: refId,
                                                    updated_date: dt,
                                                    investmentId: data.investmentId,
                                                    createdBy: data.createdBy
                                                };

                                                query = `INSERT INTO investment_txns SET ?`;
                                                endpoint = `/core-service/post?query=${query}`;
                                                let url = `${HOST}${endpoint}`;
                                                axios.post(url, inv_txn)
                                                    .then(_payload_interest => {


                                                        // post new interest

                                                        query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance,
                                                                    v.isApproved, v.isInterestCharge, v.is_credit FROM investments t 
                                                                    left join investment_products p on p.ID = t.productId
                                                                    left join investment_txns v on v.investmentId = t.ID
                                                                    WHERE t.ID = ${data.investmentId} AND p.status = 1`;
                                                        endpoint = `/core-service/get`;
                                                        url = `${HOST}${endpoint}`;
                                                        axios.get(url, {
                                                            params: {
                                                                query: query
                                                            }
                                                        }).then(response_prdt_2 => {
                                                            let terminatedInterestRate = response_prdt_2.data[0].premature_interest_rate;
                                                            let monthCount = differenceInMonths(
                                                                new Date(response_prdt_2.data[0].investment_mature_date.toString()),
                                                                new Date(response_prdt_2.data[0].investment_start_date.toString())
                                                            );


                                                            totalInterestAmount = 0;
                                                            response_prdt_2.data.map(item => {
                                                                if (item.isInterestCharge === 1 && item.isApproved === 1) {
                                                                    totalInterestAmount += parseFloat(item.txnAmount.toString());
                                                                }
                                                            });

                                                            total = 0;
                                                            response_prdt_2.data.map(x => {
                                                                if (x.isApproved === 1) {
                                                                    let _x = x.txnAmount.split(',').join('');
                                                                    if (x.is_credit.toString() === '1') {
                                                                        total += parseFloat(_x);
                                                                    } else {
                                                                        total -= parseFloat(_x);
                                                                    }
                                                                }
                                                            });

                                                            let SI = (parseFloat(response_prdt_2.data[0].amount.split(',').join('')) * parseFloat(terminatedInterestRate.split(',').join('')) * (monthCount / 12)) / 100;
                                                            let _totalInterestAmount = SI * monthCount;


                                                            refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                                            inv_txn = {
                                                                txn_date: dt,
                                                                description: 'Investment termination interest',
                                                                amount: _totalInterestAmount,
                                                                is_credit: 1,
                                                                isCharge: 1,
                                                                created_date: dt,
                                                                balance: total + _totalInterestAmount,
                                                                is_capital: 0,
                                                                isApproved: 1,
                                                                postDone: 1,
                                                                reviewDone: 1,
                                                                approvalDone: 1,
                                                                ref_no: refId,
                                                                updated_date: dt,
                                                                investmentId: data.investmentId,
                                                                createdBy: data.createdBy
                                                            };

                                                            query = `INSERT INTO investment_txns SET ?`;
                                                            endpoint = `/core-service/post?query=${query}`;
                                                            let url = `${HOST}${endpoint}`;
                                                            axios.post(url, inv_txn)
                                                                .then(_payload_interest_2 => {
                                                                    let inv_txn = {
                                                                        txn_date: dt,
                                                                        description: data.description,
                                                                        amount: total + _totalInterestAmount,
                                                                        is_credit: data.is_credit,
                                                                        created_date: dt,
                                                                        balance: total + _totalInterestAmount,
                                                                        is_capital: 0,
                                                                        ref_no: refId,
                                                                        investmentId: data.investmentId,
                                                                        createdBy: data.createdBy
                                                                    };
                                                                    query = `INSERT INTO investment_txns SET ?`;
                                                                    endpoint = `/core-service/post?query=${query}`;
                                                                    url = `${HOST}${endpoint}`;
                                                                    axios.post(url, inv_txn)
                                                                        .then(function (_res_ponse) {
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
                                                                                        pasrsedData.map(role => {
                                                                                            let invOps = {
                                                                                                investmentId: data.investmentId,
                                                                                                operationId: data.operationId,
                                                                                                roleId: role,
                                                                                                isAllRoles: result.isAllRoles,
                                                                                                createdAt: dt,
                                                                                                updatedAt: dt,
                                                                                                createdBy: data.createdBy,
                                                                                                txnId: _res_ponse.data.insertId,
                                                                                                priority: result.priority,
                                                                                                method: 'APPROVAL'
                                                                                            };

                                                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                            endpoint = `/core-service/post?query=${query}`;
                                                                                            url = `${HOST}${endpoint}`;
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}

                                                                                        });
                                                                                    } else {
                                                                                        let invOps = {
                                                                                            investmentId: data.investmentId,
                                                                                            operationId: data.operationId,
                                                                                            roleId: '',
                                                                                            createdAt: dt,
                                                                                            updatedAt: dt,
                                                                                            createdBy: data.createdBy,
                                                                                            txnId: _res_ponse.data.insertId,
                                                                                            method: 'APPROVAL'
                                                                                        };

                                                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                        endpoint = `/core-service/post?query=${query}`;
                                                                                        url = `${HOST}${endpoint}`;
                                                                                        try {
                                                                                            axios.post(url, invOps);
                                                                                        } catch (error) {}
                                                                                    }
                                                                                })
                                                                                .catch(function (error) {});


                                                                            query = `SELECT * FROM investment_product_reviews
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
                                                                                        pasrsedData.map((role) => {
                                                                                            let invOps = {
                                                                                                investmentId: data.investmentId,
                                                                                                operationId: data.operationId,
                                                                                                roleId: role,
                                                                                                isAllRoles: result.isAllRoles,
                                                                                                createdAt: dt,
                                                                                                updatedAt: dt,
                                                                                                createdBy: data.createdBy,
                                                                                                txnId: _res_ponse.data.insertId,
                                                                                                priority: result.priority,
                                                                                                method: 'REVIEW'
                                                                                            };

                                                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                            endpoint = `/core-service/post?query=${query}`;
                                                                                            url = `${HOST}${endpoint}`;
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}

                                                                                        });
                                                                                    } else {
                                                                                        let invOps = {
                                                                                            investmentId: data.investmentId,
                                                                                            operationId: data.operationId,
                                                                                            roleId: '',
                                                                                            createdAt: dt,
                                                                                            updatedAt: dt,
                                                                                            createdBy: data.createdBy,
                                                                                            txnId: _res_ponse.data.insertId,
                                                                                            method: 'REVIEW'
                                                                                        };

                                                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                        endpoint = `/core-service/post?query=${query}`;
                                                                                        url = `${HOST}${endpoint}`;
                                                                                        try {
                                                                                            axios.post(url, invOps);
                                                                                        } catch (error) {}
                                                                                    }
                                                                                })
                                                                                .catch(function (error) {});
                                                                            query = `SELECT * FROM investment_product_posts
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
                                                                                        pasrsedData.map(role => {
                                                                                            let invOps = {
                                                                                                investmentId: data.investmentId,
                                                                                                operationId: data.operationId,
                                                                                                roleId: role,
                                                                                                isAllRoles: result.isAllRoles,
                                                                                                createdAt: dt,
                                                                                                updatedAt: dt,
                                                                                                createdBy: data.createdBy,
                                                                                                txnId: _res_ponse.data.insertId,
                                                                                                priority: result.priority,
                                                                                                method: 'POST'
                                                                                            };

                                                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                            endpoint = `/core-service/post?query=${query}`;
                                                                                            url = `${HOST}${endpoint}`;
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}

                                                                                        });
                                                                                    } else {
                                                                                        let invOps = {
                                                                                            investmentId: data.investmentId,
                                                                                            operationId: data.operationId,
                                                                                            roleId: '',
                                                                                            createdAt: dt,
                                                                                            updatedAt: dt,
                                                                                            createdBy: data.createdBy,
                                                                                            txnId: _res_ponse.data.insertId,
                                                                                            method: 'POST'
                                                                                        };

                                                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                        endpoint = `/core-service/post?query=${query}`;
                                                                                        url = `${HOST}${endpoint}`;
                                                                                        try {
                                                                                            axios.post(url, invOps);
                                                                                        } catch (error) {}
                                                                                    }
                                                                                })
                                                                                .catch(function (error) {});
                                                                            res.send({});

                                                                        }, err => {
                                                                            res.send({
                                                                                status: 500,
                                                                                error: '',
                                                                                response: null
                                                                            });
                                                                        })
                                                                }, err => {});
                                                        }, err => {});
                                                    }, err => {});
                                            }
                                        }, err => {});
                                    }
                                })
                        }, err => {});
                }
            })
        }
    }, err => {});
});

router.post('/compute-interest', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = req.body
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let dt_ = moment().utcOffset('+0100').format('DD/MM/YYYY');
    let refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
    let query = `SELECT * FROM investment_txns
    WHERE investmentId = ${data.investmentId}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        console.log('**************************************compute interes*********************************');
        console.log(response.data);
        console.log('**************************************compute interes End*********************************');
        if (response.data.status === undefined) {
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
            console.log('**************************************Total*********************************');
            console.log(total);
            console.log('**************************************Total End*********************************');
            query = `SELECT amount FROM investment_txns
            WHERE investmentId = ${data.investmentId} AND isInterest = 1 AND isApproved = 1`;
            endpoint = '/core-service/get';
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(response2 => {
                console.log(response2.data);
                if (response2.data.status === undefined && response2.data.length > 0) {
                    console.log('Passing into decision box');
                    let inv_txn = {
                        txn_date: dt,
                        description: 'Reversal: Revert previously computed interest',
                        amount: response2.data[0].amount,
                        is_credit: 0,
                        isInterest: 1,
                        isInterestCharged: 1,
                        isApproved: 1,
                        postDone: 1,
                        reviewDone: 1,
                        approvalDone: 1,
                        updated_date: dt,
                        created_date: dt,
                        balance: total - parseFloat(response2.data[0].amount),
                        is_capital: 0,
                        ref_no: refId,
                        investmentId: data.investmentId,
                        createdBy: data.createdBy
                    };
                    query = `INSERT INTO investment_txns SET ?`;
                    endpoint = `/core-service/post?query=${query}`;
                    url = `${HOST}${endpoint}`;

                    axios.post(url, inv_txn)
                        .then(function (response4) {
                            console.log(response4.data);
                            if (response4.data.status === undefined) {
                                query = `SELECT t.*,a.investment_mature_date,a.investment_start_date, p.interest_rate, p.ID as productId FROM investment_txns t
                                left join investments a on a.ID = t.investmentId
                                left join investment_products p on p.ID = a.productId
                                WHERE investmentId = ${data.investmentId} AND isInterest = 0 AND isApproved = 1`;
                                endpoint = '/core-service/get';
                                url = `${HOST}${endpoint}`;
                                axios.get(url, {
                                    params: {
                                        query: query
                                    }
                                }).then(response3 => {
                                    console.log(response3.data);
                                    if (response3.data.status === undefined) {
                                        let totalInvestedAmount = 0;
                                        response3.data.map(x => {
                                            if (x.isApproved === 1) {
                                                let _x = x.amount.split(',').join('');
                                                if (x.is_credit.toString() === '1') {
                                                    totalInvestedAmount += parseFloat(_x);
                                                } else {
                                                    totalInvestedAmount -= parseFloat(_x);
                                                }
                                            }
                                        });
                                        let interestInDays = 0;
                                        let T = differenceInCalendarDays(
                                            new Date(),
                                            new Date(response3.data[0].investment_start_date.toString())
                                        );
                                        console.log('a');
                                        if (T !== 0) {
                                            console.log('a-----1');
                                            interestInDays = T / 365;
                                            console.log('a---2');
                                            let SI = (totalInvestedAmount * response3.data[0].interest_rate * interestInDays) / 100;
                                            console.log('a-----3');
                                            refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                            console.log('a----4');
                                            inv_txn = {
                                                txn_date: dt,
                                                description: `Investment interest as at ${dt_}`,
                                                amount: SI,
                                                is_credit: 1,
                                                isInterest: 1,
                                                isInterestCharged: 1,
                                                created_date: dt,
                                                balance: totalInvestedAmount,
                                                is_capital: 0,
                                                ref_no: refId,
                                                investmentId: data.investmentId,
                                                createdBy: data.createdBy
                                            };
                                            console.log('a----5');
                                            query = `INSERT INTO investment_txns SET ?`;
                                            endpoint = `/core-service/post?query=${query}`;
                                            url = `${HOST}${endpoint}`;
                                            console.log('a----6');
                                            axios.post(url, inv_txn)
                                                .then(function (response6) {
                                                    console.log('******************Start product req***********************');
                                                    console.log(response6.data);
                                                    console.log('******************End product req***********************');
                                                    if (response6.data.status === undefined) {
                                                        query = `SELECT * FROM investment_product_requirements
                                                        WHERE productId = ${data.productId} AND operationId = ${1} AND status = 1`;
                                                        console.log('****************************Query*********************************************');
                                                        console.log(query);
                                                        console.log(data);
                                                        console.log('****************************Query End*********************************************');
                                                        endpoint = "/core-service/get";
                                                        url = `${HOST}${endpoint}`;
                                                        axios.get(url, {
                                                                params: {
                                                                    query: query
                                                                }
                                                            }).then(function (response2) {
                                                                console.log(response2.data);
                                                                if (response2.data.length > 0) {
                                                                    console.log('a');
                                                                    let result = response2.data[0];
                                                                    console.log('b');
                                                                    console.log(result);
                                                                    let pasrsedData = JSON.parse(result.roleId);
                                                                    console.log('c');
                                                                    console.log('**********************Parsed Data*********************************');
                                                                    console.log(pasrsedData);
                                                                    console.log('**********************Parsed Data-End*********************************');
                                                                    pasrsedData.map(role => {
                                                                        console.log(role);
                                                                        let invOps = {
                                                                            investmentId: data.investmentId,
                                                                            operationId: 1,
                                                                            roleId: role,
                                                                            isAllRoles: result.isAllRoles,
                                                                            createdAt: dt,
                                                                            updatedAt: dt,
                                                                            createdBy: data.createdBy,
                                                                            txnId: response6.data.insertId,
                                                                            priority: result.priority,
                                                                            method: 'APPROVAL'
                                                                        };
                                                                        console.log(invOps);
                                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                                        endpoint = `/core-service/post?query=${query}`;
                                                                        url = `${HOST}${endpoint}`;
                                                                        try {
                                                                            axios.post(url, invOps).then(function (unj) {
                                                                                console.log(unj);
                                                                            });
                                                                        } catch (error) {}

                                                                    });
                                                                } else {
                                                                    let invOps = {
                                                                        investmentId: data.investmentId,
                                                                        operationId: 1,
                                                                        roleId: '',
                                                                        createdAt: dt,
                                                                        updatedAt: dt,
                                                                        createdBy: data.createdBy,
                                                                        txnId: response6.data.insertId,
                                                                        method: 'APPROVAL'
                                                                    };

                                                                    query = `INSERT INTO investment_op_approvals SET ?`;
                                                                    endpoint = `/core-service/post?query=${query}`;
                                                                    url = `${HOST}${endpoint}`;
                                                                    try {
                                                                        axios.post(url, invOps);
                                                                    } catch (error) {}
                                                                }
                                                            })
                                                            .catch(function (error) {});


                                                        query = `SELECT * FROM investment_product_reviews
                                                        WHERE productId = ${data.productId} AND operationId = ${1} AND status = 1`;
                                                        console.log('****************************Query REVIEW*********************************************');
                                                        console.log(query);
                                                        console.log('****************************Query REVIEW End*********************************************');
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
                                                                    pasrsedData.map((role) => {
                                                                        let invOps = {
                                                                            investmentId: data.investmentId,
                                                                            operationId: 1,
                                                                            roleId: role,
                                                                            isAllRoles: result.isAllRoles,
                                                                            createdAt: dt,
                                                                            updatedAt: dt,
                                                                            createdBy: data.createdBy,
                                                                            txnId: response6.data.insertId,
                                                                            priority: result.priority,
                                                                            method: 'REVIEW'
                                                                        };

                                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                                        endpoint = `/core-service/post?query=${query}`;
                                                                        url = `${HOST}${endpoint}`;
                                                                        try {
                                                                            axios.post(url, invOps);
                                                                        } catch (error) {}

                                                                    });
                                                                } else {
                                                                    let invOps = {
                                                                        investmentId: data.investmentId,
                                                                        operationId: 1,
                                                                        roleId: '',
                                                                        createdAt: dt,
                                                                        updatedAt: dt,
                                                                        createdBy: data.createdBy,
                                                                        txnId: response6.data.insertId,
                                                                        method: 'REVIEW'
                                                                    };

                                                                    query = `INSERT INTO investment_op_approvals SET ?`;
                                                                    endpoint = `/core-service/post?query=${query}`;
                                                                    url = `${HOST}${endpoint}`;
                                                                    try {
                                                                        axios.post(url, invOps);
                                                                    } catch (error) {}
                                                                }
                                                            })
                                                            .catch(function (error) {});

                                                        query = `SELECT * FROM investment_product_posts
                                                        WHERE productId = ${data.productId} AND operationId = ${1} AND status = 1`;
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
                                                                    pasrsedData.map(role => {
                                                                        let invOps = {
                                                                            investmentId: data.investmentId,
                                                                            operationId: 1,
                                                                            roleId: role,
                                                                            isAllRoles: result.isAllRoles,
                                                                            createdAt: dt,
                                                                            updatedAt: dt,
                                                                            createdBy: data.createdBy,
                                                                            txnId: response6.data.insertId,
                                                                            priority: result.priority,
                                                                            method: 'POST'
                                                                        };

                                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                                        endpoint = `/core-service/post?query=${query}`;
                                                                        url = `${HOST}${endpoint}`;
                                                                        try {
                                                                            axios.post(url, invOps);
                                                                        } catch (error) {}

                                                                    });
                                                                } else {
                                                                    let invOps = {
                                                                        investmentId: data.investmentId,
                                                                        operationId: 1,
                                                                        roleId: '',
                                                                        createdAt: dt,
                                                                        updatedAt: dt,
                                                                        createdBy: data.createdBy,
                                                                        txnId: response6.data.insertId,
                                                                        method: 'POST'
                                                                    };

                                                                    query = `INSERT INTO investment_op_approvals SET ?`;
                                                                    endpoint = `/core-service/post?query=${query}`;
                                                                    url = `${HOST}${endpoint}`;
                                                                    try {
                                                                        axios.post(url, invOps);
                                                                    } catch (error) {}
                                                                }
                                                            })
                                                            .catch(function (error) {});
                                                    }
                                                    res.send({});
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
                            }
                        })
                } else {
                    query = `SELECT t.*,a.investment_mature_date,a.investment_start_date, p.interest_rate FROM investment_txns t
                                left join investments a on a.ID = t.investmentId
                                left join investment_products p on p.ID = a.productId
                                WHERE investmentId = ${data.investmentId} AND isInterest = 0 AND isApproved = 1`;
                    endpoint = '/core-service/get';
                    url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    }).then(response3 => {
                        console.log(response3.data);
                        if (response3.data.status === undefined) {
                            let totalInvestedAmount = 0;
                            response3.data.map(x => {
                                if (x.isApproved === 1) {
                                    let _x = x.amount.split(',').join('');
                                    if (x.is_credit.toString() === '1') {
                                        totalInvestedAmount += parseFloat(_x);
                                    } else {
                                        totalInvestedAmount -= parseFloat(_x);
                                    }
                                }
                            });

                            let interestInDays = 0;
                            let T = differenceInCalendarDays(
                                new Date(),
                                new Date(response3.data[0].investment_start_date.toString())
                            );
                            console.log('************************Number of Days**************************');
                            console.log(T);
                            console.log('************************Number of Days**************************');
                            if (T !== 0) {
                                interestInDays = T / 365;
                                let SI = (totalInvestedAmount * response3.data[0].interest_rate * interestInDays) / 100;
                                console.log(SI);
                                refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                console.log(refId);
                                inv_txn = {
                                    txn_date: dt,
                                    description: `Investment interest as at ${dt_}`,
                                    amount: SI,
                                    is_credit: 1,
                                    isInterest: 1,
                                    isInterestCharged: 1,
                                    created_date: dt,
                                    balance: totalInvestedAmount,
                                    is_capital: 0,
                                    ref_no: refId,
                                    investmentId: data.investmentId,
                                    createdBy: data.createdBy
                                };
                                console.log(inv_txn);
                                query = `INSERT INTO investment_txns SET ?`;
                                endpoint = `/core-service/post?query=${query}`;
                                url = `${HOST}${endpoint}`;
                                console.log('coming close');
                                axios.post(url, inv_txn)
                                    .then(function (response6) {
                                        console.log(response6.data);

                                        if (response6.data.status === undefined) {
                                            query = `SELECT * FROM investment_product_requirements
                                            WHERE productId = ${data.productId} AND operationId = ${1} AND status = 1`;
                                            console.log('****************************Query*********************************************');
                                            console.log(query);
                                            console.log(data);
                                            console.log('****************************Query End*********************************************');
                                            endpoint = "/core-service/get";
                                            url = `${HOST}${endpoint}`;
                                            axios.get(url, {
                                                    params: {
                                                        query: query
                                                    }
                                                }).then(function (response2) {
                                                    console.log(response2.data);
                                                    if (response2.data.length > 0) {
                                                        console.log('a');
                                                        let result = response2.data[0];
                                                        console.log('b');
                                                        console.log(result);
                                                        let pasrsedData = JSON.parse(result.roleId);
                                                        console.log('c');
                                                        console.log('**********************Parsed Data*********************************');
                                                        console.log(pasrsedData);
                                                        console.log('**********************Parsed Data-End*********************************');
                                                        pasrsedData.map(role => {
                                                            console.log(role);
                                                            let invOps = {
                                                                investmentId: data.investmentId,
                                                                operationId: 1,
                                                                roleId: role,
                                                                isAllRoles: result.isAllRoles,
                                                                createdAt: dt,
                                                                updatedAt: dt,
                                                                createdBy: data.createdBy,
                                                                txnId: response6.data.insertId,
                                                                priority: result.priority,
                                                                method: 'APPROVAL'
                                                            };
                                                            console.log(invOps);
                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                            endpoint = `/core-service/post?query=${query}`;
                                                            url = `${HOST}${endpoint}`;
                                                            try {
                                                                axios.post(url, invOps).then(function (unj) {
                                                                    console.log(unj);
                                                                });
                                                            } catch (error) {}

                                                        });
                                                    } else {
                                                        let invOps = {
                                                            investmentId: data.investmentId,
                                                            operationId: 1,
                                                            roleId: '',
                                                            createdAt: dt,
                                                            updatedAt: dt,
                                                            createdBy: data.createdBy,
                                                            txnId: response6.data.insertId,
                                                            method: 'APPROVAL'
                                                        };

                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                        endpoint = `/core-service/post?query=${query}`;
                                                        url = `${HOST}${endpoint}`;
                                                        try {
                                                            axios.post(url, invOps);
                                                        } catch (error) {}
                                                    }
                                                })
                                                .catch(function (error) {});


                                            query = `SELECT * FROM investment_product_reviews
                                            WHERE productId = ${data.productId} AND operationId = ${1} AND status = 1`;
                                            console.log('****************************Query REVIEW*********************************************');
                                            console.log(query);
                                            console.log('****************************Query REVIEW End*********************************************');
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
                                                        pasrsedData.map((role) => {
                                                            let invOps = {
                                                                investmentId: data.investmentId,
                                                                operationId: 1,
                                                                roleId: role,
                                                                isAllRoles: result.isAllRoles,
                                                                createdAt: dt,
                                                                updatedAt: dt,
                                                                createdBy: data.createdBy,
                                                                txnId: response6.data.insertId,
                                                                priority: result.priority,
                                                                method: 'REVIEW'
                                                            };

                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                            endpoint = `/core-service/post?query=${query}`;
                                                            url = `${HOST}${endpoint}`;
                                                            try {
                                                                axios.post(url, invOps);
                                                            } catch (error) {}

                                                        });
                                                    } else {
                                                        let invOps = {
                                                            investmentId: data.investmentId,
                                                            operationId: 1,
                                                            roleId: '',
                                                            createdAt: dt,
                                                            updatedAt: dt,
                                                            createdBy: data.createdBy,
                                                            txnId: response6.data.insertId,
                                                            method: 'REVIEW'
                                                        };

                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                        endpoint = `/core-service/post?query=${query}`;
                                                        url = `${HOST}${endpoint}`;
                                                        try {
                                                            axios.post(url, invOps);
                                                        } catch (error) {}
                                                    }
                                                })
                                                .catch(function (error) {});

                                            query = `SELECT * FROM investment_product_posts
                                            WHERE productId = ${data.productId} AND operationId = ${1} AND status = 1`;
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
                                                        pasrsedData.map(role => {
                                                            let invOps = {
                                                                investmentId: data.investmentId,
                                                                operationId: 1,
                                                                roleId: role,
                                                                isAllRoles: result.isAllRoles,
                                                                createdAt: dt,
                                                                updatedAt: dt,
                                                                createdBy: data.createdBy,
                                                                txnId: response6.data.insertId,
                                                                priority: result.priority,
                                                                method: 'POST'
                                                            };

                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                            endpoint = `/core-service/post?query=${query}`;
                                                            url = `${HOST}${endpoint}`;
                                                            try {
                                                                axios.post(url, invOps);
                                                            } catch (error) {}

                                                        });
                                                    } else {
                                                        let invOps = {
                                                            investmentId: data.investmentId,
                                                            operationId: 1,
                                                            roleId: '',
                                                            createdAt: dt,
                                                            updatedAt: dt,
                                                            createdBy: data.createdBy,
                                                            txnId: response6.data.insertId,
                                                            method: 'POST'
                                                        };

                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                        endpoint = `/core-service/post?query=${query}`;
                                                        url = `${HOST}${endpoint}`;
                                                        try {
                                                            axios.post(url, invOps);
                                                        } catch (error) {}
                                                    }
                                                })
                                                .catch(function (error) {});
                                        }
                                        res.send({});
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
                }
            }, err => {
                res.send({
                    status: 500,
                    error: err,
                    response: null
                });
            })
        }
    }, err => {
        res.send({
            status: 500,
            error: err,
            response: null
        });
    })
});

module.exports = router;