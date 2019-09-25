const express = require('express');
const axios = require('axios');
const router = express.Router();
const moment = require('moment');
const sRequest = require('../s_request');

//Get Investment Product
router.get('/compute', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let page = ((req.query.page - 1) * 10 < 0) ? 0 : (req.query.page - 1) * 10;
    let search_string = (req.query.search_string === undefined) ? "" : req.query.search_string.toUpperCase();
    let query = `SELECT ID,name,code,investment_max,investment_min,min_term,max_term,interest_disbursement_time FROM investment_products WHERE status = 1 AND (upper(code) LIKE "${search_string}%" OR upper(name) LIKE "${search_string}%") ORDER BY ID desc LIMIT ${limit} OFFSET ${page}`;
    const endpoint = "/core-service/get";
    const url = `${HOST}${endpoint}`;
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

module.exports = router;