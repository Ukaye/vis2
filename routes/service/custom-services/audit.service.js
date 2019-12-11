const
    fs = require('fs'),
    axios = require('./axios'),
    moment = require('moment'),
    db = require('../../../db'),
    express = require('express'),
    router = express.Router();

router.get('/get/:module', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let end = req.query.end;
    let type = req.query.type;
    let draw = req.query.draw;
    let start = req.query.start;
    let limit = req.query.limit;
    let order = req.query.order;
    let offset = req.query.offset;
    let module = req.params.module;
    let search_string = req.query.search_string.toUpperCase();
    let query_condition = `FROM audit_logs a, clients c 
        WHERE a.clientID = c.ID AND a.module = "${module}" AND (upper(c.fullname) LIKE "${search_string}%" OR upper(a.amount) LIKE "${search_string}%" 
        OR upper(a.loanID) LIKE "${search_string}%" OR upper(a.bank) LIKE "${search_string}%") `;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    if (type) query_condition = query_condition.concat(`AND a.status = ${type} `);
    if (start && end)
        query_condition = query_condition.concat(`AND TIMESTAMP(a.payment_date) < TIMESTAMP('${end}') AND TIMESTAMP(a.payment_date) >= TIMESTAMP('${start}') `);
    let query = `SELECT a.*, c.fullname client ${query_condition} ${order} LIMIT ${limit} OFFSET ${offset}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) ${query_condition}) as recordsFiltered FROM audit_logs WHERE module = "${module}"`;
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

router.post('/confirm/:id', function (req, res, next) {
    let payload = req.body,
        id = req.params.id,
        query =  `UPDATE audit_logs Set ? WHERE ID = ${id}`;
    payload.status = 0;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, function (error, response) {
        if (error)
            return res.send({status: 500, error: error, response: null});
        return res.send({status: 200, error: null, response: response});
    });
});

module.exports = router;