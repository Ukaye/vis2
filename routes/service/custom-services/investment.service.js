const express = require('express');
const moment = require('moment');
const router = express.Router();
var isAfter = require('date-fns/is_after');
var differenceInCalendarDays = require('date-fns/difference_in_calendar_days');
let fs = require('fs');
const sRequest = require('../s_request');
const editableProductData = [
    "freq_withdrawal",
    "saving_fees",
    "saving_charge_opt",
    "minimum_bal_charges",
    "minimum_bal_charges_opt",
    "acct_allows_withdrawal",
    "inv_moves_wallet",
    "interest_moves_wallet",
    "chkEnforceCount",
    "withdrawal_freq_duration",
    "withdrawal_fees",
    "withdrawal_freq_fees_opt",
    "canTerminate", 
    "min_days_termination",
    "min_days_termination_charge", 
    "opt_on_min_days_termination",
    "minimum_bal",
    "interest_disbursement_time",
    "interest_rate",
    "premature_interest_rate"
]

/** End point to create investment/savings account **/
router.post('/create', function (req, res, next) {
    let _date = new Date();
    let data = JSON.parse(JSON.stringify(req.body));
    const is_after = isAfter(new Date(data.investment_mature_date.toString()), new Date(data.investment_start_date.toString()))
    if (is_after || data.investment_start_date === '' || data.investment_mature_date === '') {
        editedProductOps(data).then(payld => {
            data = payld;
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
            let dt_ = moment().utcOffset('+0100').format('x');
            let _data = JSON.parse(JSON.stringify(data));
            for(let editable of editableProductData){
                delete _data[editable]
            }
            delete _data.selectedProduct;
            // delete _data.interest_rate;
            // delete _data.premature_interest_rate;
            sRequest.post(query, _data)
                .then(function (response) {
                    let inv_txn = {
                        txn_date: _data.investment_start_date,
                        description: "Opening Capital",
                        amount: parseFloat(data.amount.split(',').join('')),
                        is_credit: 1,
                        created_date: dt,
                        balance: 0,
                        isDeposit: 1,
                        is_capital: 1,
                        createdBy: data.createdBy,
                        ref_no: dt_,
                        investmentId: response.insertId,
                        isPaymentMadeByWallet: data.isPaymentMadeByWallet
                    };

                    query = `INSERT INTO investment_txns SET ?`;
                    sRequest.post(query, inv_txn)
                        .then(function (response_) {

                            query = `SELECT * FROM investment_product_reviews
                                WHERE productId = ${data.productId} AND operationId = ${1} AND status = 1`;
                            sRequest.get(query)
                                .then(function (response2) {
                                    if (response2.length > 0) {
                                        let result = response2[0];
                                        let pasrsedData = JSON.parse(result.roleId);
                                        pasrsedData.map((role) => {
                                            let invOps = {
                                                investmentId: response.insertId,
                                                operationId: 1,
                                                roleId: role,
                                                isAllRoles: result.isAllRoles,
                                                createdAt: dt,
                                                updatedAt: dt,
                                                createdBy: data.createdBy,
                                                txnId: response_.insertId,
                                                priority: result.priority,
                                                method: 'REVIEW'
                                            };

                                            if (invOps.priority === '[]') {
                                                delete invOps.priority;
                                            }

                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                            try {
                                                sRequest.post(query, invOps);
                                            } catch (error) { }

                                        });
                                    } else {
                                        let invOps = {
                                            investmentId: response.insertId,
                                            operationId: 1,
                                            roleId: '',
                                            createdAt: dt,
                                            updatedAt: dt,
                                            createdBy: data.createdBy,
                                            txnId: response_.insertId,
                                            method: 'REVIEW'
                                        };
                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                        try {
                                            sRequest.post(query, invOps);
                                        } catch (error) { }
                                    }
                                })
                                .catch(function (error) { });


                            query = `SELECT * FROM investment_product_requirements
                                WHERE productId = ${data.productId} AND operationId = ${1} AND status = 1`;
                            sRequest.get(query, {
                                params: {
                                    query: query
                                }
                            })
                                .then(function (response2) {
                                    if (response2.length > 0) {
                                        let result = response2[0];
                                        let pasrsedData = JSON.parse(result.roleId);
                                        pasrsedData.map(role => {
                                            let invOps = {
                                                investmentId: response.insertId,
                                                operationId: 1,
                                                roleId: role,
                                                isAllRoles: result.isAllRoles,
                                                createdAt: dt,
                                                updatedAt: dt,
                                                createdBy: data.createdBy,
                                                txnId: response_.insertId,
                                                priority: result.priority,
                                                method: 'APPROVAL'
                                            };

                                            if (invOps.priority === '[]') {
                                                delete invOps.priority;
                                            }

                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                            try {
                                                sRequest.post(query, invOps);
                                            } catch (error) { }

                                        });
                                    } else {
                                        let invOps = {
                                            investmentId: response.insertId,
                                            operationId: 1,
                                            roleId: '',
                                            createdAt: dt,
                                            updatedAt: dt,
                                            createdBy: data.createdBy,
                                            txnId: response_.insertId,
                                            method: 'APPROVAL'
                                        };
                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                        try {
                                            sRequest.post(query, invOps);
                                        } catch (error) { }
                                    }
                                })
                                .catch(function (error) { });

                            query = `SELECT * FROM investment_product_posts
                                WHERE productId = ${data.productId} AND operationId = ${1} AND status = 1`;
                            sRequest.get(query)
                                .then(function (response2) {
                                    if (response2.length > 0) {
                                        let result = response2[0];
                                        let pasrsedData = JSON.parse(result.roleId);
                                        pasrsedData.map(role => {
                                            let invOps = {
                                                investmentId: response.insertId,
                                                operationId: 1,
                                                roleId: role,
                                                isAllRoles: result.isAllRoles,
                                                createdAt: dt,
                                                updatedAt: dt,
                                                createdBy: data.createdBy,
                                                txnId: response_.insertId,
                                                priority: result.priority,
                                                method: 'POST'
                                            };


                                            if (invOps.priority === '[]') {
                                                delete invOps.priority;
                                            }

                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                            try {
                                                sRequest.post(query, invOps);
                                            } catch (error) { }
                                        });
                                    } else {
                                        let invOps = {
                                            investmentId: response.insertId,
                                            operationId: 1,
                                            roleId: '',
                                            createdAt: dt,
                                            updatedAt: dt,
                                            createdBy: data.createdBy,
                                            txnId: response_.insertId,
                                            method: 'POST'
                                        };
                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                        try {
                                            sRequest.post(query, invOps);
                                        } catch (error) { }
                                    }
                                })
                                .catch(function (error) { });

                            setDocRequirement(data.productId, response_.insertId);
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

function getProductItem(id) {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM investment_products WHERE id = ${id}`;
        sRequest.get(query)
            .then(function (response2) {
                resolve(response2[0]);
            })
    });
}

function cloneProductItem(item) {

    return new Promise((resolve, reject) => {
        let query = `INSERT INTO investment_products SET ?`;
        const _item = JSON.parse(JSON.stringify(item));
        delete _item.ID;
        _item.status = 0;
        sRequest.post(query, _item)
            .then(function (response2) {
                resolve(response2.insertId);
            })
            .catch(error => { reject(error) });
    });

}

async function editedProductOps(data) {
    let customProduct = false
    // const interest_rate = data.interest_rate.toString();
    // const premature_interest_rate = data.premature_interest_rate.toString();

   


    for (let editable in editableProductData) {
        if (data[editableProductData[editable]] !== data.selectedProduct[editableProductData[editable]]) {
            customProduct = true
            editable = editableProductData.length - 1
        }
    }


    if (customProduct === true) {
        let product = await getProductItem(data.productId);
        for(let editable of editableProductData){
            product[editable] = data[editable]                                                                                                                                                                                                                                                           
        }
        const clonedProductId = await cloneProductItem(product);
        await productCloneOps(data.productId, clonedProductId);

        let _data = {
            clientId: data.clientId,
            productId: clonedProductId,
            amount: data.amount,
            investment_start_date: data.investment_start_date,
            investment_mature_date: data.investment_mature_date,
            code: data.code,
            selectedProduct: data.selectedProduct,
            createdBy: data.createdBy,
            isPaymentMadeByWallet: data.isPaymentMadeByWallet
        };
        return _data;
    } else {
        data.status = 1;
        return data;
    }
}


// I commented this part
// async function editedProductOps(data) {
//     if (data.interest_rate.toString() !== data.selectedProduct.interest_rate.toString() ||
//         data.premature_interest_rate.toString() !== data.selectedProduct.premature_interest_rate.toString()) {
//         let product = await getProductItem(data.productId);
//         product.interest_rate = data.interest_rate
//         const clonedProductId = await cloneProductItem(product);
//         await productCloneOps(data.productId, clonedProductId);

//         let _data = {
//             clientId: data.clientId,
//             productId: clonedProductId,
//             amount: data.amount,
//             investment_start_date: data.investment_start_date,
//             investment_mature_date: data.investment_mature_date,
//             code: data.code,
//             selectedProduct: data.selectedProduct,
//             createdBy: data.createdBy,
//             isPaymentMadeByWallet: data.isPaymentMadeByWallet
//         };
//         return _data;
//     } else {
//         data.status = 1;
//         return data;
//     }
// }

async function productCloneOps(originalProductId, newProductId) {
    let tableNames = [{ name: 'investment_product_reviews', isDoc: false },
    { name: 'investment_product_posts', isDoc: false },
    { name: 'investment_product_requirements', isDoc: false },
    { name: 'investment_doc_requirement', isDoc: true }];
    let results = [];
    for (let index = 0; index < tableNames.length; index++) {
        const table = tableNames[index];
        const data = await getOriginalProductRequirement(originalProductId, table.name);
        if (data.length > 0) {
            const clonedProduct = await createClonedProductRequirement(data, table.isDoc, newProductId, table.name);
            results.push(clonedProduct);
        }
    }
    return results;
}

function getOriginalProductRequirement(productId, table) {
    return new Promise((resolve, reject) => {
        let query = `Select * from ${table} 
        WHERE productId = ${productId} AND status = 1`;
        sRequest.get(query).then(response_prdt_ => {
            resolve(response_prdt_);
        }, err => {
            resolve([]);
        });
    });
}

/** Function use to create investment/savings product requirement **/
function createClonedProductRequirement(values, isDoc, newProductId, table) {
    return new Promise((resolve, reject) => {
        let baseQuery = (!isDoc) ? `INSERT INTO
        ${table}(
            roleId,
            operationId,
            productId,
            createdDate,
            updatedDate,
            createdBy,
            status,
            isAllRoles,
            priority
        )VALUES ` : `INSERT INTO
        ${table}(
            productId,
            name,
            createdBy,
            createdAt,
            operationId,
            status
        )VALUES `;
        let bodyQuery = '';
        for (let i = 0; i < values.length; i++) {
            const item = values[i];
            const dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            if (!isDoc)
                bodyQuery += `('${item.roleId}',${item.operationId},${newProductId},'${item.createdDate}','${dt}',${item.createdBy},${1},'${item.isAllRoles}','${item.priority}')`;
            else
                bodyQuery += `(${newProductId},'${item.name}',${item.createdBy},'${dt}',${item.operationId},${1})`;

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

/** Function to set document requirement for investment/savings account **/
function setDocRequirement(productId, txnId) {
    let query = `SELECT * FROM investment_doc_requirement
                WHERE productId = ${productId} AND operationId = ${1} AND status = 1`;
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
                        sRequest.post(query, doc).then(p => {
                        });
                    } catch (error) { }
                })
            }
        })
        .catch(function (error) { });
}

/** End point to get investment/savings accounts **/
router.get('/get-investments', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    const date = new Date();
    const formatedDate = `${date.getUTCFullYear()}-${date.getMonth() + 1}-${date.getUTCDate()}`;
    let query = `SELECT v.ID,v.code,p.name AS investment,c.fullname AS client,amount, investment_start_date,p.interest_moves_wallet,
    investment_mature_date,v.isMatured FROM investments v left join investment_products p on
    v.productId = p.ID left join clients c on
    v.clientId = c.ID WHERE (v.investment_mature_date = '' OR STR_TO_DATE(v.investment_mature_date, '%Y-%m-%d') > '${formatedDate}') AND v.isMatured = 0 AND v.isClosed = 0 AND (upper(v.code) LIKE "${search_string}%" OR upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%" 
    OR upper(c.fullname) LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    sRequest.get(query).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM investments v 
                    left join investment_products p on v.productId = p.ID left join clients c on
                    v.clientId = c.ID WHERE (v.investment_mature_date = '' OR STR_TO_DATE(v.investment_mature_date, '%Y-%m-%d') > '${formatedDate}') AND v.isMatured = 0 AND v.isClosed = 0 AND upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%" 
                    OR upper(c.fullname) LIKE "${search_string}%") as recordsFiltered FROM investments`;
        sRequest.get(query).then(payload => {
            res.send({
                draw: draw,
                recordsTotal: payload[0].recordsTotal,
                recordsFiltered: payload[0].recordsFiltered,
                data: (response === undefined) ? [] : response
            });
        });
    });
});

/** End point to get mature investment/savings accounts **/
router.get('/get-mature-investments', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    const date = new Date();
    const formatedDate = `${date.getUTCFullYear()}-${date.getMonth() + 1}-${date.getUTCDate()}`;
    let query = `SELECT v.ID,v.code,v.productId,v.clientId,p.interest_rate,p.name AS investment,
    v.isMatured,p.interest_moves_wallet,p.interest_disbursement_time,
    c.fullname AS client,amount, investment_start_date, investment_mature_date FROM investments v 
    left join investment_products p on v.productId = p.ID 
    left join clients c on v.clientId = c.ID 
    WHERE v.isMatured = 1 OR v.isClosed = 0 AND v.investment_mature_date <> '' AND 
    STR_TO_DATE(v.investment_mature_date, '%Y-%m-%d') <= '${formatedDate}' 
    AND (upper(v.code) LIKE "${search_string}%" OR upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%" 
    OR upper(c.fullname) LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    sRequest.get(query).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM investments v 
                    left join investment_products p on v.productId = p.ID 
                    left join clients c on v.clientId = c.ID 
                    WHERE v.isMatured = 1 OR v.isClosed = 0 AND v.investment_mature_date <> '' 
                    AND STR_TO_DATE(investment_mature_date, '%Y-%m-%d') <= '${formatedDate}' AND
                    (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%" 
                    OR upper(c.fullname) LIKE "${search_string}%")) as recordsFiltered FROM investments
                    WHERE isMatured = 0 AND isClosed = 0 AND investment_mature_date <> '' AND STR_TO_DATE(investment_mature_date, '%Y-%m-%d') <= '${formatedDate}'`;
        sRequest.get(query).then(payload => {
            res.send({
                draw: draw,
                recordsTotal: payload[0].recordsTotal,
                recordsFiltered: payload[0].recordsFiltered,
                data: (response === undefined) ? [] : response
            });
        });
    });
});

/** End point to get transactions of an investment/savings accounts **/
router.get('/get-investments/:id', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT v.ID,clientId,p.name AS investment, amount, investment_start_date, investment_mature_date
    FROM investments v left join investment_products p on v.productId = p.ID WHERE clientId = ${req.params.id}
    AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    sRequest.get(query).then(response => {
        query = `SELECT count(*) as recordsFiltered FROM investments v 
                    left join investment_products p on v.productId = p.ID
                    WHERE v.clientId = ${req.params.id} AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%")`;
        sRequest.get(query).then(payload => {
            query = `SELECT count(*) as recordsTotal FROM investments WHERE clientId = ${req.params.id}`;
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


router.get('/client-investments/:id', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT 
    v.ID,v.ref_no,c.fullname,v.description,v.amount,v.balance as txnBalance,v.txn_date,p.ID as productId,u.fullname as createdByName, v.isDeny,
    v.approvalDone,v.reviewDone,v.created_date,v.postDone,p.code,p.name,i.investment_start_date, v.ref_no, v.isApproved,v.is_credit,v.updated_date,p.chkEnforceCount,
    i.clientId,v.isMoveFundTransfer,v.isWallet,u2.fullname as invCreator,i.date_created as invCreatedAt, v.isWithdrawal,isDeposit,v.isDocUploaded,p.canTerminate,i.isPaymentMadeByWallet,p.acct_allows_withdrawal,p.min_days_termination,
    v.is_capital,v.investmentId,i.isTerminated,i.isMatured,v.isForceTerminate,v.isReversedTxn,v.isInvestmentTerminated,v.expectedTerminationDate,p.inv_moves_wallet,
    v.isPaymentMadeByWallet,p.interest_disbursement_time,p.interest_moves_wallet,i.investment_mature_date,p.interest_rate,v.isInvestmentMatured,i.isClosed,p.premature_interest_rate,
    i.code as acctNo, v.isTransfer, v.beneficialInvestmentId FROM investment_txns v
    left join investments i on v.investmentId = i.ID
    left join clients c on i.clientId = c.ID
    left join users u on u.ID = v.createdBy
    left join users u2 on u2.ID = i.createdBy
    left join investment_products p on i.productId = p.ID
    WHERE v.isWallet = 0 AND v.investmentId = ${req.params.id} 
    AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%") LIMIT ${limit} OFFSET ${offset}`;
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
        query = `SELECT count(*) as recordsFiltered FROM investment_txns v 
    left join investments i on v.investmentId = i.ID
    left join clients c on i.clientId = c.ID 
    left join investment_products p on i.productId = p.ID
    WHERE v.isWallet = 0 AND v.investmentId = ${req.params.id}
    AND (upper(p.code) LIKE "${search_string}%" OR upper(p.name) LIKE "${search_string}%")`;
        sRequest.get(query).then(payload => {
            investmentBalanceWithInterest(req.params.id, 0).then(txnCurrentBalanceWithoutInterest => {
                investmentBalanceWithInterest(req.params.id, 1).then(txnCurrentBalance => {
                    query = `Select 
                        (SELECT count(*) as recordsTotal FROM investment_txns WHERE isWallet = 0 AND investmentId = ${req.params.id}) as recordsTotal,
                        (SELECT count(*) as maturedInventmentTxn FROM investment_txns WHERE isWallet = 0 AND investmentId = ${req.params.id} AND isInvestmentMatured = 1) as maturedInventmentTxn`;

                    sRequest.get(query).then(payload2 => {
                        if (uniqueTxns.length > 0) {
                            const currentDate = new Date();
                            const maturityDate = new Date(uniqueTxns[0].investment_mature_date);
                            if (maturityDate <= currentDate) {
                                query = `UPDATE investments SET isMatured = 1 WHERE ID = ${req.params.id}`;
                                sRequest.get(query).then(respons_e => {

                                    res.send({
                                        draw: draw,
                                        maturityDays: true,
                                        txnCurrentBalance: txnCurrentBalance,
                                        txnCurrentBalanceWithoutInterest: txnCurrentBalanceWithoutInterest,
                                        isLastMaturedTxnExist: (payload2[0].maturedInventmentTxn > 0) ? 1 : 0,
                                        recordsTotal: payload2[0].recordsTotal,
                                        recordsFiltered: payload[0].recordsFiltered,
                                        data: (uniqueTxns === undefined) ? [] : uniqueTxns
                                    });
                                }, err => {
                                })
                            } else {
                                res.send({
                                    draw: draw,
                                    maturityDays: false,
                                    txnCurrentBalance: txnCurrentBalance,
                                    txnCurrentBalanceWithoutInterest: txnCurrentBalanceWithoutInterest,
                                    isLastMaturedTxnExist: (payload2[0].maturedInventmentTxn > 0) ? 1 : 0,
                                    recordsTotal: payload2[0].recordsTotal,
                                    recordsFiltered: payload[0].recordsFiltered,
                                    data: (uniqueTxns === undefined) ? [] : uniqueTxns
                                });
                            }
                        } else {
                            res.send({
                                draw: draw,
                                maturityDays: false,
                                txnCurrentBalance: txnCurrentBalance,
                                txnCurrentBalanceWithoutInterest: txnCurrentBalanceWithoutInterest,
                                recordsTotal: payload2[0].recordsTotal,
                                recordsFiltered: payload[0].recordsFiltered,
                                data: (uniqueTxns === undefined) ? [] : uniqueTxns
                            });
                        }
                    });
                });
            });
        });
    });
});

/** End point to create organisation configuration **/
router.post('/create-configs', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `INSERT INTO investment_config SET ?`;
    let data = req.body;
    data.createdAt = dt;
    sRequest.post(query, data)
        .then(function (response2) {
            res.send(response2);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        });
});

/** Function to return investment balance with interest **/
function investmentBalanceWithInterest(investmentId, isInterest) {
    return new Promise((resolve, reject) => {
        let conditionalQuery = (isInterest === 0) ? ' AND isInterest = 0' : '';
        let query = `Select amount, is_credit from investment_txns WHERE isWallet = 0 
        AND investmentId = ${investmentId} 
        AND isApproved = 1 AND postDone = 1 ${conditionalQuery}`;
        sRequest.get(query).then(function (payload) {
            let totalBalance = 0;

            if (payload.length === 0)
                resolve(totalBalance);

            for (let index = 0; index < payload.length; index++) {
                const element = payload[index];
                if (element.is_credit === 1)
                    totalBalance += parseFloat(element.amount);
                else
                    totalBalance -= parseFloat(element.amount);
            }
            resolve(totalBalance);
        });
    });
}

function investmentStatus(investmentId) {
    return new Promise((resolve, reject) => {
        let query = `Select count(ID) from investments 
        WHERE (isTerminated = 1 OR isMatured = 1)
        AND id = ${investmentId}`;
        sRequest.get(query).then(function (payload) {
            if (payload.length > 0)
                resolve(0);
            else
                resolve(1);
        });
    });
}

/** End point to create investment/savings mandate **/
router.post('/create-mandates', function (req, res, next) {
    let query = `INSERT INTO investment_mandate SET ?`;
    let data = req.body;
    data.createdAt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    sRequest.post(query, data)
        .then(function (response2) {
            res.send(response2);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        });

});

/** End point to get investment/savings mandate **/
router.get('/get-mandates/:id', function (req, res, next) {
    let query = `SELECT * FROM investment_mandate 
    WHERE investmentId = ${req.params.id} AND status = 1`;

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

/** End point to get investment/savings withdrawal status **/
router.get('/get-investment-withdrawal-status/:id', function (req, res, next) {
    let query = `SELECT canWithdraw FROM investments 
    WHERE ID = ${req.params.id}`;

    sRequest.get(query).then(response => {
        res.send(response[0]);
    }, err => {
        res.send({
            status: 500,
            error: err,
            response: null
        });
    });
});

/** End point to get investment/savings remove mandates **/
router.get('/remove-mandates/:id', function (req, res, next) {
    let query = `UPDATE investment_mandate SET status = 0 WHERE id = ${req.params.id}`;

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

/** End point to get organisation configuration **/
router.get('/get-configs', function (req, res, next) {
    let query = `SELECT c.*, p.min_days_termination, p.name as productName, p.code FROM investment_config c
                left join investment_products p on p.ID = c.walletProductId ORDER BY ID DESC LIMIT 1`;
    sRequest.get(query).then(response => {
        res.send(response[0]);
    }, err => {
        res.send({
            status: 500,
            error: err,
            response: null
        });
    })
});

/** End point to upload document **/
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
        if (!err) { } else if (err.code === 'ENOENT') {
            try {
                fs.mkdirSync(`./files/${req.params.item}/`);
            } catch (error) { }

        }
        fs.stat(`files/${req.params.item}/${req.params.sub}/`, function (err_) {
            if (!err_) { } else if (err_.code === 'ENOENT') {
                try {
                    fs.mkdirSync(`./files/${req.params.item}/${req.params.sub}/`);
                } catch (error_) { }

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