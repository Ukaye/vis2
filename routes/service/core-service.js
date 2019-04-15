const express = require('express');
const moment = require('moment');
const db = require('../../db');
const router = express.Router();

router.get('/get', function (req, res, next) {
    let query = req.query.query;
    db.query(query, function (error, results, fields) {
        if (error && error !== null) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send(results);
        }
    });
});

router.post('/post', function (req, res, next) {
    let data = req.body;
    let query = req.query.query;
    db.query(query, data, function (error, results, fields) {
        if (error && error !== null) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send(results);
        }
    });
});



module.exports = router;