const express = require('express');
const moment = require('moment');
const db = require('../db');
const router = express.Router();
const axios = require('axios');
const sRequest = require('./service/s_request');
/** End point use to create investment/savings product **/
router.post('/products', function (req, res, next) {
    let data = req.body;
    data.status = 1;
    data.isDeactivated = 0;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO investment_products SET ?', data, function (error, result, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Investment product saved successfully!"
            });
        }
    });
});

/** End point use to get investment/savings product **/
router.get('/products', function (req, res, next) {
    const limit = req.query.limit;
    const offset = req.query.offset;

    let query = `SELECT SQL_CALC_FOUND_ROWS * FROM investment_products ORDER BY name LIMIT ${limit} OFFSET ${offset}`;
    db.query(query, function (error, results, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            query = 'SELECT COUNT(*) as total FROM investment_products';
            db.query(query, function (error, response, fields) {
                if (error) {
                    res.send({
                        status: 500,
                        error: error,
                        total: 0,
                        data: results
                    });
                } else {
                    res.send({
                        total: response[0].total,
                        data: results
                    });
                }
            });
        }
    });
});

/** End point use to get investment/savings product **/
router.get('/products/:id', function (req, res, next) {
    let query = 'SELECT * FROM investment_products where id = ?';
    db.query(query, req.params.id, function (error, results, fields) {
        if (error) {
            res.send(JSON.stringify({
                "status": 500,
                "error": error,
                "response": null
            }));
        } else {
            res.send(results);
        }
    });
});

/** End point use to update investment/savings product **/
router.post('/products/:id', function (req, res, next) {
    var dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    data = req.body;
    data.date_modified = dt;
    delete data.ID;
    db.query(`UPDATE investment_products SET status = 0 WHERE ID = ${req.params.id}`, function (error, result, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            data.status = 1;
            data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            db.query('INSERT INTO investment_products SET ?', data, function (error, result, fields) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    productCloneOps(req.params.id, result.insertId).then(payload => {
                        res.send({
                            "status": 200,
                            "message": "Investment product saved successfully!"
                        });
                    });
                }
            });
        }
    });
});

/** Function use to get investment/savings product requirement **/
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

/** Function housing both getOriginalProductRequirement(productId, table) and createClonedProductRequirement(values, isDoc, newProductId, table) **/
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

/** End point use to activate and deactivate investment/savings product **/
router.post('/products-status/:id', function (req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE investment_products SET isDeactivated = ?, date_modified = ? WHERE ID = ?', [req.body.isDeactivated, date, req.params.id], function (error, result, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Investment product updated successfully",
                "response": result
            });
        }
    });
});

module.exports = router;