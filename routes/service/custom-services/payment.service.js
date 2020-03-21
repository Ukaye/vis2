const axios = require('./axios'),
    moment = require('moment'),
    express = require('express'),
    router = express.Router();

router.get('/get/:payment_source', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let end = req.query.end;
    let type = req.query.type;
    let draw = req.query.draw;
    let start = req.query.start;
    let limit = req.query.limit;
    let order = req.query.order;
    let offset = req.query.offset;
    let payment_source = req.params.payment_source;
    let search_string = req.query.search_string.toUpperCase();
    let query_condition = `FROM schedule_history s, clients c 
        WHERE s.clientID = c.ID AND s.payment_source = "${payment_source}" AND (upper(c.fullname) LIKE "%${search_string}%" OR upper(s.actual_amount) LIKE "%${search_string}%" 
        OR upper(s.applicationID) LIKE "%${search_string}%") `;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    if (type) query_condition = query_condition.concat(`AND s.status = ${type} `);
    if (start && end)
        query_condition = query_condition.concat(`AND TIMESTAMP(s.date_created) < TIMESTAMP('${end}') AND TIMESTAMP(s.date_created) >= TIMESTAMP('${start}') `);
    let query = `SELECT s.*, c.fullname client ${query_condition} ${order} LIMIT ${limit} OFFSET ${offset}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) ${query_condition}) as recordsFiltered FROM schedule_history WHERE payment_source = "${payment_source}"`;
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

module.exports = router;