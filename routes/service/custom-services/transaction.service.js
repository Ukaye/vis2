const express = require('express');
const axios = require('axios');
const moment = require('moment');
const router = express.Router();

router.get('/get-txn-user-roles/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT t.ID,t.txn_date,t.description,t.amount,u.fullname,
    t.is_credit,t.ref_no,a.ID as approvalId,a.*,r.role_name,re.role_name as review_role_name,po.role_name as post_role_name,
    a.ID as txnApprovadId FROM investment_txns t
    left join investment_op_approvals a on a.txnId = t.ID
    left join user_roles r on a.roleId = r.id
    left join user_roles re on a.roleId = re.id
    left join user_roles po on a.roleId = po.id
    left join users u on u.ID = a.approvedBy
    WHERE a.txnId = ${req.params.id}`;
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
    let query = `SELECT v.ID as investmentId, v.amount,p.* FROM test.investments v
    left join test.investment_products p on p.ID = v.productId
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
    let dt_ = moment().utcOffset('+0100').format('YYMMDDhmmss');
    let refId = dt_;
    let query = `SELECT amount FROM investment_txns WHERE investmentId = ${data.investmentId} AND isApproved = 1`;
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
                    let _x = x.amount.split(',').join('');
                    total += parseFloat(_x);
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
                        (Select Count(*) as total_approved from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND isApproved = 1) as total_approved,
                        (Select Count(*) as isOptional from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND isAllRoles = 0) as isOptional,
                        (Select Count(*) as priorityTotal from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND priority IS NOT NULL) as priorityTotal,
                        (Select Count(*) as priorityItemTotal from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL' AND priority = approvedBy) as priorityItemTotal,
                        (Select Count(*) as total_approvedBy from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'APPROVAL') as total_approvedBy`;
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
                        (Select Count(*) as total_reviewed from test.investment_op_approvals where txnId = ${data.txnId} AND isReviewed = 1 AND method = 'REVIEW') as total_reviewed,
                        (Select Count(*) as isOptional from test.investment_op_approvals where txnId = ${data.txnId} AND isAllRoles = 0 AND method = 'REVIEW') as isOptional,
                        (Select Count(*) as priorityTotal from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW' AND priority IS NOT NULL) as priorityTotal,
                        (Select Count(*) as priorityItemTotal from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW' AND priority = reviewedBy) as priorityItemTotal,
                        (Select Count(*) as total_reviewedBy from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'REVIEW') as total_reviewedBy`;
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
                (Select Count(*) as total_posted from test.investment_op_approvals where txnId = ${data.txnId} AND isPosted = 1 AND method = 'POST') as total_posted,
                (Select Count(*) as isOptional from test.investment_op_approvals where txnId = ${data.txnId} AND isAllRoles = 0 AND method = 'POST') as isOptional,
                (Select Count(*) as priorityTotal from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'POST' AND priority IS NOT NULL) as priorityTotal,
                (Select Count(*) as priorityItemTotal from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'POST' AND priority = postedBy) as priorityItemTotal,
                (Select Count(*) as total_postedBy from test.investment_op_approvals where txnId = ${data.txnId} AND method = 'POST') as total_postedBy`;
                endpoint = '/core-service/get';
                url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                }).then(counter => {
                    if ((counter.data[0].total_postedBy === counter.data[0].total_posted) || (counter.data[0].isOptional > 0) ||
                        (counter.data[0].priorityTotal !== 0 && counter.data[0].priorityTotal === counter.data[0].priorityItemTotal)) {
                        let bal = (data.isCredit.toString() === '1') ? (parseFloat(data.balance.split(',').join('')) + parseFloat(data.amount.split(',').join(''))) :
                            (parseFloat(data.balance.split(',').join('')) - parseFloat(data.amount.split(',').join('')))

                        query = `UPDATE investment_txns SET isApproved = ${data.status}, updated_date ='${dt.toString()}', createdBy = ${data.userId},
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
                    } else {
                        let bal = 0;
                        if (data.isCredit === 1) {
                            bal = (data.status === 0) ? (parseFloat(data.balance.split(',').join('')) - parseFloat(data.amount.split(',').join(''))) : parseFloat(data.balance.split(',').join(''));
                        } else {
                            bal = (data.status === 0) ? (parseFloat(data.balance.split(',').join('')) + parseFloat(data.amount.split(',').join(''))) : parseFloat(data.balance.split(',').join(''));
                        }

                        query = `UPDATE investment_txns SET isApproved = ${0}, updated_date ='${dt.toString()}', 
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

module.exports = router;