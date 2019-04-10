const
    axios = require('axios'),
    moment = require('moment'),
    express = require('express'),
    router = express.Router();

router.post('/create', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let postData = req.body,
        query =  'INSERT INTO preapplications Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    axios.post(url, postData)
        .then(response => {
            query = `SELECT * from preapplications WHERE ID = (SELECT MAX(ID) from preapplications)`;
            endpoint = `/core-service/get`;
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(response_ => {
                return res.send(response_['data'][0]);
            }, err => {
                res.send({status: 500, error: error, response: null});
            })
            .catch(error => {
                res.send({status: 500, error: error, response: null});
            });
        }, err => {
            res.send({status: 500, error: error, response: null});
        })
        .catch(error => {
            res.send({status: 500, error: error, response: null});
        });
});

router.get('/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT * FROM preapplications p 
                 WHERE p.status = 1 AND (upper(p.name) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
                 OR upper(p.ID) LIKE "${search_string}%" ${order}) LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM preapplications p 
                 WHERE p.status = 1 AND (upper(p.name) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
                 OR upper(p.ID) LIKE "${search_string}%")) as recordsFiltered FROM preapproved_loans AND status = 1`;
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

router.get('/get/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT p.*, c.fullname, c.email, c.phone FROM preapplications p 
                INNER JOIN clients c ON p.userID = c.ID WHERE p.ID = ${req.params.id} AND p.status = 1`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send({
            data: response.data
        });
    });
});

router.post('/approve/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.id,
        query =  `UPDATE preapplications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = 2;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    axios.post(url, payload)
        .then(response => {
            res.send(response.data);
        }, err => {
            res.send({status: 500, error: error, response: null});
        })
        .catch(error => {
            res.send({status: 500, error: error, response: null});
        });
});

router.get('/reject/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.id,
        query =  `UPDATE preapplications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = 0;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    axios.post(url, payload)
        .then(function (response) {
            res.send(response.data);
        }, err => {
            res.send({status: 500, error: error, response: null});
        })
        .catch(function (error) {
            res.send({status: 500, error: error, response: null});
        });
});

module.exports = router;