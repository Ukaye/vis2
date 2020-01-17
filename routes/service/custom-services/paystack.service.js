const
    async = require('async'),
    axios = require('./axios'),
    moment = require('moment'),
    db = require('../../../db'),
    express = require('express'),
    router = express.Router(),
    enums = require('../../../enums'),
    helperFunctions = require('../../../helper-functions');

router.post('/payment/create', (req, res) => {
    let invoice = req.body,
        payload = {},
        payment = {
            email: invoice.email,
            amount: invoice.amount,
            authorization_code: invoice.authorization_code
        },
        date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    invoice.payment_amount = invoice.amount;
    helperFunctions.chargePaymentMethod(payment, payment_response => {
        payload.total_amount = payment_response.amount / 100;
        payload.fee = payment_response.fee;
        payload.amount = invoice.amount;
        payload.authorization_code = payment.authorization_code;
        payload.reference = payment_response.data.reference;
        payload.date_created = date;
        payload.created_by = invoice.created_by;
        payload.applicationID = invoice.applicationID;
        payload.clientID = invoice.clientID;
        invoice.fee = payload.fee;
        invoice.date_created = date;
        invoice.reference = payload.reference;
        invoice.total_amount = payload.total_amount;
        invoice.authorization_code = payload.authorization_code;
        invoice.response = JSON.stringify(payment_response);
        delete invoice.email;
        db.query('INSERT INTO paystack_debits_log Set ?', invoice, (error, response) => {
            if (payment_response && payment_response.data.status === 'success') {
                db.query('INSERT INTO paystack_payments Set ?', payload, (error, response) => {
                    if(error) {
                        res.send({status: 500, error: error, response: null});
                    } else {
                        res.send(response);
                    }
                });
            } else {
                res.send({status: 500, error: payment_response.data.gateway_response || payment_response.message, response: null});
            }
        });
    });
});

router.post('/payments/create', (req, res) => {
    let count = 0,
        invoices = req.body.invoices,
        created_by = req.body.created_by,
        date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.getConnection((err, connection) => {
        if (err) throw err;

        async.forEach(invoices, (invoice, callback) => {
            invoice.invoiceID = invoice.ID;
            invoice.amount = invoice.payment_amount;
            invoice.payment_status = invoice.status;
            invoice.created_by = created_by;
            invoice.date_created = date;
            delete invoice.ID;
            delete invoice.status;
            let payload = {},
                payment = {
                    email: invoice.email,
                    amount: invoice.amount,
                    authorization_code: invoice.authorization_code
                };
            invoice.payment_amount = invoice.amount;
            helperFunctions.chargePaymentMethod(payment, payment_response => {
                payload.total_amount = payment_response.amount / 100;
                payload.fee = payment_response.fee;
                payload.amount = invoice.amount;
                payload.authorization_code = payment.authorization_code;
                payload.reference = payment_response.data.reference;
                payload.date_created = date;
                payload.created_by = invoice.created_by;
                payload.invoiceID = invoice.invoiceID;
                payload.applicationID = invoice.applicationID;
                payload.clientID = invoice.clientID;
                invoice.fee = payload.fee;
                invoice.date_created = date;
                invoice.reference = payload.reference;
                invoice.total_amount = payload.total_amount;
                invoice.authorization_code = payload.authorization_code;
                invoice.response = JSON.stringify(payment_response);
                delete invoice.email;
                connection.query('INSERT INTO paystack_debits_log Set ?', invoice, (error, response) => {
                    if (payment_response && payment_response.data.status === 'success') {
                        connection.query('INSERT INTO paystack_payments Set ?', payload, (error, response) => {
                            if(!error) count++;
                            callback();
                        });
                    } else {
                        callback();
                    }
                });
            });
        }, data => {
            connection.release();
            return res.send({
                status: 200,
                error: null,
                response: `${count} payments(s) requested successfully.`
            });
        })
    })
});

router.get('/payments/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let start = req.query.start, end = req.query.end,
        query =  `SELECT * FROM paystack_payments WHERE status = 1`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    if (start && end)
        query = query.concat(` AND TIMESTAMP(date_created) BETWEEN TIMESTAMP('${start}') AND TIMESTAMP('${end}')`);
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send({status: 200, error: null, response: response.data});
    });
});

router.get('/collection/payments/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let start = req.query.start, end = req.query.end,
        query =  `SELECT ID, '0' balance, amount credit, '0' debit, CONCAT('Payment reference ', reference) description, date_created posting_date, 
            date_created value_date, 1 status, created_by, date_created, date_modified, '0' allocated, amount unallocated, applicationID, clientID  
            FROM paystack_payments WHERE status = 1`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    if (start && end)
        query = query.concat(` AND TIMESTAMP(date_created) BETWEEN TIMESTAMP('${start}') AND TIMESTAMP('${end}')`);
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send({status: 200, error: null, response: response.data});
    });
});

router.delete('/collection/payment/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.id,
        query =  `UPDATE paystack_payments Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = enums.COLLECTION_BULK_UPLOAD.STATUS.INACTIVE;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, function (error, response) {
        if (error)
            return res.send({status: 500, error: error, response: null});
        return res.send({status: 200, error: null, response: response});
    });
});

router.delete('/collection/payments', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let count = 0,
        payload = {},
        records = req.body.records;
    payload.status = enums.PAYSTACK_PAYMENT.STATUS.INACTIVE;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(records, function (record, callback) {
            let query =  `UPDATE paystack_payments Set ? WHERE ID = ${record.ID}`;
            connection.query(query, payload, function (error, response) {
                if (error){
                    console.log(error);
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            connection.release();
            return res.send({status: 200, error: null, response: `${count} record(s) removed successfully!`});
        })
    });
});

router.get('/payments/get/:applicationID', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let start = req.query.start, end = req.query.end,
        query =  `SELECT * FROM paystack_payments WHERE applicationID = ${req.params.applicationID} AND status <> 0`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    if (start && end) query = query.concat(` AND TIMESTAMP(date_created) BETWEEN TIMESTAMP('${start}') AND TIMESTAMP('${end}')`);
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send({status: 200, error: null, response: response.data});
    });
});

router.get('/payment/status/get/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query =  `SELECT reference FROM paystack_debits_log WHERE ID = ${req.params.id}`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let payment = response.data[0];
        if (payment) {
            helperFunctions.paymentChargeStatus(payment.reference, response => {
                if (response && response.data) {
                    res.send({status: 200, error: null, response: response.data.status});
                } else {
                    res.send({status: 500, error: response.message, response: null});
                }
            });
        } else {
            res.send({status: 500, error: 'There is no card setup for this application', response: null});
        }
    });
});

router.get('/logs/get', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let end = req.query.end;
    let draw = req.query.draw;
    let start = req.query.start;
    let limit = req.query.limit;
    let order = req.query.order;
    let offset = req.query.offset;
    let search_string = req.query.search_string.toUpperCase();
    let query_condition = `FROM paystack_debits_log l, users u WHERE l.status = 1 AND l.created_by = u.ID 
        AND (upper(u.fullname) LIKE "${search_string}%" OR upper(l.amount) LIKE "${search_string}%" OR upper(l.reference) LIKE "${search_string}%") `;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    if (start && end)
        query_condition = query_condition.concat(`AND TIMESTAMP(l.date_created) BETWEEN TIMESTAMP('${start}') AND TIMESTAMP('${end}') `);
    let query = `SELECT l.*, u.fullname initiator ${query_condition} ${order} LIMIT ${limit} OFFSET ${offset}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) ${query_condition}) as recordsFiltered 
            FROM paystack_debits_log WHERE status = 1`;
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

router.get('/logs/get/:applicationID', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query =  `SELECT l.*, u.fullname initiator FROM paystack_debits_log l, users u
                WHERE l.applicationID = ${req.params.applicationID} AND l.status = 1 AND l.created_by = u.ID`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send({status: 200, error: null, response: response.data});
    });
});

router.delete('/invoices/disable', function (req, res, next) {
    let count = 0,
        payload = {},
        records = req.body.invoices;
    payload.enable_paystack = enums.ENABLE_PAYSTACK.STATUS.INACTIVE;

    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(records, function (record, callback) {
            let query =  `UPDATE application_schedules Set ? WHERE ID = ${record.ID}`;
            connection.query(query, payload, function (error, response) {
                if (error){
                    console.log(error);
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            connection.release();
            return res.send({status: 200, error: null, response: `${count} invoice(s) removed successfully!`});
        })
    });
});

router.get('/payment-methods/get/:userID', function (req, res) {
    db.query(`SELECT * FROM client_payment_methods WHERE userID = ${req.params.userID} 
        AND status = 1 AND payment_channel = 'paystack'`,
        (error, payment_methods) => {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
            return res.send({
                "status": 200,
                "error": null,
                "response": payment_methods
            });
        });
});

module.exports = router;