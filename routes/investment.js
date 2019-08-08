const express = require('express');
const moment = require('moment');
const db = require('../db');
const router = express.Router();

router.post('/products', function (req, res, next) {
    let data = req.body;
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
            res.send({
                "status": 200,
                "message": "Investment product saved successfully!"
            });
        }
    });
});

//Get Investment Product
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

router.post('/products/:id', function (req, res, next) {
    var dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    data = req.body;
    data.histories[data.histories.length - 1].date_created = dt;
    data.date_modified = dt;
    data.histories = JSON.stringify(data.histories);
    const productId = data.ID;
    delete data.ID;
    db.query('UPDATE investment_products SET ? WHERE ID = ' + req.params.id, data, function (error, result, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            if (data.chkEnforceCount === 0) {
                query = `UPDATE investments SET canWithdraw = 1 WHERE ID <> 0 AND productId = ${productId}`;
                endpoint = `/core-service/get`;
                url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                });
            }
            res.send({
                "status": 200,
                "message": "Investment product updated successfully",
                "response": result
            });
        }
    });
});

router.post('/products-status/:id', function (req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE investment_products SET status = ?, date_modified = ? WHERE ID = ?', [req.body.status, date, req.params.id], function (error, result, fields) {
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