const express = require('express');
const axios = require('axios');
const moment = require('moment');
const router = express.Router();
var isAfter = require('date-fns/is_after');
var differenceInCalendarDays = require('date-fns/difference_in_calendar_days');
let fs = require('fs');


router.post('/create', function (req, res, next) {
    let _date = new Date();
    const HOST = `${req.protocol}://${req.get('host')}`;
    var data = req.body
    const is_after = isAfter(new Date(data.investment_mature_date.toString()), new Date(data.investment_start_date.toString()))
    if (is_after || data.investment_start_date === '' || data.investment_mature_date === '') {
        data.status = 1;
        let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        data.date_created = dt;
        let _code = moment().utcOffset('+0100').format('YY/MMDDhmm');
        data.code = `${data.code}/${_code}`;
        if (data.selectedProduct.interest_disbursement_time === 'Monthly') {
            data.interestAt = new Date(_date.getUTCFullYear(), _date.getUTCMonth() + 1, _date.getDate());
            data.nextInterestAt = new Date(_date.getUTCFullYear(), _date.getUTCMonth() + 2, _date.getDate());
        } else if (data.selectedProduct.interest_disbursement_time.toString().toLowerCase() === 'Up-Front') {
            data.isInterestCleared = 1;
        } else if (data.selectedProduct.interest_disbursement_time.toString().toLowerCase() === 'End of Tenure') {

        }

        let query = `INSERT INTO investments SET ?`;
        let endpoint = `/core-service/post?query=${query}`;
        let url = `${HOST}${endpoint}`;
        let dt_ = moment().utcOffset('+0100').format('x');
        let _data = JSON.parse(JSON.stringify(data));
        delete _data.selectedProduct;
        axios.post(url, _data)
            .then(function (response) {
                let inv_txn = {
                    txn_date: dt,
                    description: "Opening Capital",
                    amount: parseFloat(data.amount.split(',').join('')),
                    is_credit: 1,
                    created_date: dt,
                    balance: 0,
                    isDeposit: 1,
                    is_capital: 1,
                    createdBy: data.createdBy,
                    ref_no: dt_,
                    investmentId: response.data.insertId
                };

                query = `INSERT INTO investment_txns SET ?`;
                endpoint = `/core-service/post?query=${query}`;
                url = `${HOST}${endpoint}`;
                axios.post(url, inv_txn)
                    .then(function (response_) {
                        query = `SELECT * FROM investment_product_requirements
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
                                            investmentId: response.data.insertId,
                                            operationId: 1,
                                            roleId: role,
                                            isAllRoles: result.isAllRoles,
                                            createdAt: dt,
                                            updatedAt: dt,
                                            createdBy: data.createdBy,
                                            txnId: response_.data.insertId,
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
                                        investmentId: response.data.insertId,
                                        operationId: 1,
                                        roleId: '',
                                        createdAt: dt,
                                        updatedAt: dt,
                                        createdBy: data.createdBy,
                                        txnId: response_.data.insertId,
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
                                            investmentId: response.data.insertId,
                                            operationId: 1,
                                            roleId: role,
                                            isAllRoles: result.isAllRoles,
                                            createdAt: dt,
                                            updatedAt: dt,
                                            createdBy: data.createdBy,
                                            txnId: response_.data.insertId,
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
                                        investmentId: response.data.insertId,
                                        operationId: 1,
                                        roleId: '',
                                        createdAt: dt,
                                        updatedAt: dt,
                                        createdBy: data.createdBy,
                                        txnId: response_.data.insertId,
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
                                            investmentId: response.data.insertId,
                                            operationId: 1,
                                            roleId: role,
                                            isAllRoles: result.isAllRoles,
                                            createdAt: dt,
                                            updatedAt: dt,
                                            createdBy: data.createdBy,
                                            txnId: response_.data.insertId,
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
                                        investmentId: response.data.insertId,
                                        operationId: 1,
                                        roleId: '',
                                        createdAt: dt,
                                        updatedAt: dt,
                                        createdBy: data.createdBy,
                                        txnId: response_.data.insertId,
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

                        setDocRequirement(HOST, data, response_.data.insertId);
                        if (data.selectedProduct.interest_disbursement_time.toString() === 'Up-Front') {
                            dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                            refId = moment().utcOffset('+0100').format('x');
                            query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance FROM investments t 
                            left join investment_products p on p.ID = t.productId
                            left join investment_txns v on v.investmentId = t.ID
                            WHERE t.ID = ${response.data.insertId} AND p.status = 1`;
                            endpoint = `/core-service/get`;
                            url = `${HOST}${endpoint}`;
                            axios.get(url, {
                                params: {
                                    query: query
                                }
                            }).then(response_product => {
                                //Charge for deposit
                                if (response_product.data.length > 0) {
                                    let computeInterest = response_product.data[0];
                                    let T = differenceInCalendarDays(
                                        new Date(computeInterest.investment_mature_date.toString()),
                                        new Date(computeInterest.investment_start_date.toString())
                                    );

                                    let interestInDays = T / 365;


                                    let SI = (parseFloat(computeInterest.txnAmount.split(',').join('')) * parseFloat(computeInterest.interest_rate.split(',').join('')) * interestInDays) / 100;

                                    let total = parseFloat(computeInterest.txnBalance.split(',').join(''))
                                    let _inv_txn = {
                                        txn_date: dt,
                                        description: 'Total Up-Front interest',
                                        amount: SI,
                                        is_credit: 1,
                                        isInterestCharge: 1,
                                        created_date: dt,
                                        balance: total,
                                        is_capital: 0,
                                        ref_no: refId,
                                        updated_date: dt,
                                        investmentId: response.data.insertId,
                                        createdBy: data.createdBy
                                    };

                                    query = `INSERT INTO investment_txns SET ?`;
                                    endpoint = `/core-service/post?query=${query}`;
                                    let url = `${HOST}${endpoint}`;
                                    axios.post(url, _inv_txn)
                                        .then(function (_payload_) {
                                            query = `SELECT * FROM investment_product_requirements
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
                                                                investmentId: response.data.insertId,
                                                                operationId: 1,
                                                                roleId: role,
                                                                isAllRoles: result.isAllRoles,
                                                                createdAt: dt,
                                                                updatedAt: dt,
                                                                createdBy: data.createdBy,
                                                                txnId: _payload_.data.insertId,
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
                                                            investmentId: response.data.insertId,
                                                            operationId: 1,
                                                            roleId: '',
                                                            createdAt: dt,
                                                            updatedAt: dt,
                                                            createdBy: data.createdBy,
                                                            txnId: _payload_.data.insertId,
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
                                                                investmentId: response.data.insertId,
                                                                operationId: 1,
                                                                roleId: role,
                                                                isAllRoles: result.isAllRoles,
                                                                createdAt: dt,
                                                                updatedAt: dt,
                                                                createdBy: data.createdBy,
                                                                txnId: _payload_.data.insertId,
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
                                                            investmentId: response.data.insertId,
                                                            operationId: 1,
                                                            roleId: '',
                                                            createdAt: dt,
                                                            updatedAt: dt,
                                                            createdBy: data.createdBy,
                                                            txnId: _payload_.data.insertId,
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
                                                                investmentId: response.data.insertId,
                                                                operationId: 1,
                                                                roleId: role,
                                                                isAllRoles: result.isAllRoles,
                                                                createdAt: dt,
                                                                updatedAt: dt,
                                                                createdBy: data.createdBy,
                                                                txnId: _payload_.data.insertId,
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
                                                            investmentId: response.data.insertId,
                                                            operationId: 1,
                                                            roleId: '',
                                                            createdAt: dt,
                                                            updatedAt: dt,
                                                            createdBy: data.createdBy,
                                                            txnId: _payload_.data.insertId,
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
                                        }, err => {});
                                }
                            }, err => {});
                        }
                        res.send({});
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
        res.send({
            status: 500,
            error: {
                message: "Start date can not be greater than the end date"
            },
            response: null
        });
    }

});

function setDocRequirement(HOST, data, txnId) {
    let query = `SELECT * FROM investment_doc_requirement
                WHERE productId = ${data.productId} AND operationId = ${1}`;
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
                        axios.post(url, doc).then(p => {});
                    } catch (error) {}
                })
            }
        })
        .catch(function (error) {});
}


router.get('/get-investments', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT v.ID,v.code,p.name AS investment,c.fullname AS client,amount, investment_start_date, investment_mature_date
    FROM investments v left join investment_products p on
    v.productId = p.ID left join clients c on
    v.clientId = c.ID WHERE upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%" 
    OR upper(c.fullname) LIKE "${search_string}%" ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    var data = [];
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM investments v 
                    left join investment_products p on v.productId = p.ID left join clients c on
                    v.clientId = c.ID WHERE upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%" 
                    OR upper(c.fullname) LIKE "${search_string}%") as recordsFiltered FROM investments`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            res.send({
                draw: draw,
                recordsTotal: payload.data[0].recordsTotal,
                recordsFiltered: payload.data[0].recordsFiltered,
                data: (response.data === undefined) ? [] : response.data
            });
        });
    });
});

router.get('/get-investments/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT v.ID,clientId,p.name AS investment, amount, investment_start_date, investment_mature_date
    FROM investments v left join investment_products p on v.productId = p.ID WHERE clientId = ${req.params.id}
    AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    var data = [];
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) as recordsFiltered FROM investments v 
                    left join investment_products p on v.productId = p.ID
                    WHERE v.clientId = ${req.params.id} AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%")`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            query = `SELECT count(*) as recordsTotal FROM investments WHERE clientId = ${req.params.id}`;
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

router.get('/client-investments/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT 
    (Select balance from investment_txns WHERE isWallet = 0 AND investmentId = ${req.params.id} ORDER BY ID DESC LIMIT 1) as balance,
    v.ID,v.ref_no,c.fullname,v.description,v.amount,v.balance as txnBalance,v.txn_date,p.ID as productId,u.fullname as createdByName,
    v.approvalDone,v.reviewDone,v.created_date,v.postDone,p.code,p.name,i.investment_start_date, v.ref_no, v.isApproved,v.is_credit,
    i.clientId,v.isMoveFundTransfer,v.isWallet,v.isWithdrawal,isDeposit,v.isDocUploaded,p.canTerminate,i.isPaymentMadeByWallet,p.acct_allows_withdrawal,
    v.is_capital,v.investmentId,i.isTerminated, i.isMatured, v.isReversedTxn,v.isInvestmentTerminated,v.expectedTerminationDate,
    i.code as acctNo, v.isTransfer, v.beneficialInvestmentId FROM investment_txns v
    left join investments i on v.investmentId = i.ID
    left join clients c on i.clientId = c.ID
    left join users u on u.ID = v.createdBy
    left join investment_products p on i.productId = p.ID
    WHERE v.isWallet = 0 AND v.investmentId = ${req.params.id} 
    AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%") LIMIT ${limit} OFFSET ${offset}`;

    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    var data = [];
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        console.log(response.data);
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
        query = `SELECT count(*) as recordsFiltered FROM investment_txns v 
    left join investments i on v.investmentId = i.ID
    left join clients c on i.clientId = c.ID 
    left join investment_products p on i.productId = p.ID
    WHERE v.isWallet = 0 AND v.investmentId = ${req.params.id}
    AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%")`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            query = `SELECT count(*) as recordsTotal FROM investment_txns WHERE isWallet = 0 AND investmentId = ${req.params.id}`;
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
                    data: (uniqueTxns === undefined) ? [] : uniqueTxns
                });
            });
        });
    });
});

router.post('/create-configs', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `INSERT INTO investment_config SET ?`;
    let endpoint = `/core-service/post?query=${query}`;
    let url = `${HOST}${endpoint}`;
    let data = req.body;
    data.createdAt = dt;
    axios.post(url, data)
        .then(function (response2) {
            res.send(response2.data);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        });
});



router.post('/create-mandates', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `INSERT INTO investment_mandate SET ?`;
    let endpoint = `/core-service/post?query=${query}`;
    let url = `${HOST}${endpoint}`;
    let data = req.body;
    data.createdAt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    axios.post(url, data)
        .then(function (response2) {
            res.send(response2.data);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        });

});

router.get('/get-mandates/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT * FROM investment_mandate 
    WHERE investmentId = ${req.params.id} AND status = 1`;

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

router.get('/remove-mandates/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `UPDATE investment_mandate SET status = 0 WHERE id = ${req.params.id}`;

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

router.get('/get-configs', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT c.*, p.min_days_termination FROM investment_config c
                left join investment_products p
                on p.ID > 1 ORDER BY ID DESC LIMIT 1`;

    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send(response.data[0]);
    }, err => {
        res.send({
            status: 500,
            error: err,
            response: null
        });
    })
});


router.post('/upload-file/:id/:item/:sub', function (req, res) {
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params) return res.status(400).send('');
    let sampleFile = req.files.file,
        name = sampleFile.name,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1],
        fileName = name + '.' + extension;
    extension = extension.toLowerCase();
    fs.stat(`files/${req.params.item}/`, function (err) {
        if (!err) {} else if (err.code === 'ENOENT') {
            try {
                fs.mkdirSync(`./files/${req.params.item}/`);
            } catch (error) {}

        }
        fs.stat(`files/${req.params.item}/${req.params.sub}/`, function (err_) {
            if (!err_) {} else if (err_.code === 'ENOENT') {
                try {
                    fs.mkdirSync(`./files/${req.params.item}/${req.params.sub}/`);
                } catch (error_) {}

            }
            fs.stat(`files/${req.params.item}/${req.params.sub}/${req.params.id}.${extension}`, function (err) {
                if (err) {
                    sampleFile.mv(`files/${req.params.item}/${req.params.sub}/${req.params.id}.${extension}`, function (err) {
                        if (err) {
                            return res.status(500).send(err);
                        }
                        res.send('File uploaded!');
                    });
                } else {
                    fs.unlink(`files/${req.params.item}/${req.params.sub}/${req.params.id}.${extension}`, function (err) {
                        if (err) {
                            res.send('Unable to delete file!');
                        } else {
                            sampleFile.mv(`files/${req.params.item}/${req.params.sub}/${req.params.id}.${extension}`, function (err) {
                                if (err) {
                                    return res.status(500).send(err);
                                }
                                res.send('File uploaded!');
                            });
                        }
                    });
                }
            });
        });
    });



});




module.exports = router;