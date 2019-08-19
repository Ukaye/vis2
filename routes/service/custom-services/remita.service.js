const
    async = require('async'),
    axios = require('axios'),
    moment = require('moment'),
    db = require('../../../db'),
    bcrypt = require('bcryptjs'),
    express = require('express'),
    router = express.Router(),
    SHA512 = require('js-sha512'),
    enums = require('../../../enums'),
    nodemailer = require('nodemailer'),
    helperFunctions = require('../../../helper-functions'),
    hbs = require('nodemailer-express-handlebars'),
    smtpTransport = require('nodemailer-smtp-transport'),
    smtpConfig = smtpTransport({
        service: 'Mailjet',
        auth: {
            user: process.env.MAILJET_KEY,
            pass: process.env.MAILJET_SECRET
        }
    }),
    options = {
        viewPath: 'views/email',
        extName: '.hbs'
    };
transporter = nodemailer.createTransport(smtpConfig);
transporter.use('compile', hbs(options));

router.post('/payment/create', function (req, res, next) {
    let invoice = req.body,
        payload = {},
        payment = {
            mandateId: invoice.mandateId,
            fundingAccount: invoice.fundingAccount,
            fundingBankCode: invoice.fundingBankCode,
            totalAmount: invoice.totalAmount
        },
        date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    invoice.payment_amount = invoice.totalAmount;
    helperFunctions.sendDebitInstruction(payment, function (payment_response) {
        payload.fundingAccount = payment.fundingAccount;
        payload.fundingBankCode = payment.fundingBankCode;
        payload.totalAmount = payment.totalAmount;
        payload.RRR = payment_response.RRR;
        payload.requestId = payment_response.requestId;
        payload.mandateId = payment_response.mandateId;
        payload.transactionRef = payment_response.transactionRef;
        payload.date_created = date;
        payload.created_by = invoice.created_by;
        payload.applicationID = invoice.applicationID;
        payload.clientID = invoice.clientID;
        invoice.date_created = date;
        invoice.RRR = payload.RRR;
        invoice.requestId = payload.requestId;
        invoice.transactionRef = payload.transactionRef;
        invoice.response = JSON.stringify(payment_response);
        db.query('INSERT INTO remita_debits_log Set ?', invoice, function (error, response) {
            if (payment_response && payment_response.statuscode === '069') {
                db.query('INSERT INTO remita_payments Set ?', payload, function (error, response) {
                    if(error) {
                        res.send({status: 500, error: error, response: null});
                    } else {
                        res.send(response);
                    }
                });
            } else {
                res.send({status: 500, error: payment_response, response: null});
            }
        });
    });
});

router.post('/payments/create', function (req, res, next) {
    let count = 0,
        invoices = req.body.invoices,
        created_by = req.body.created_by,
        date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(invoices, function (invoice, callback) {
            invoice.invoiceID = invoice.ID;
            invoice.totalAmount = invoice.payment_amount;
            invoice.payment_status = invoice.status;
            invoice.created_by = created_by;
            invoice.date_created = date;
            delete invoice.ID;
            delete invoice.status;
            let payload = {},
                payment = {
                    mandateId: invoice.mandateId,
                    fundingAccount: invoice.fundingAccount,
                    fundingBankCode: invoice.fundingBankCode,
                    totalAmount: invoice.totalAmount
                };
            helperFunctions.sendDebitInstruction(payment, function (payment_response) {
                payload.fundingAccount = payment.fundingAccount;
                payload.fundingBankCode = payment.fundingBankCode;
                payload.totalAmount = payment.totalAmount;
                payload.RRR = payment_response.RRR;
                payload.requestId = payment_response.requestId;
                payload.mandateId = payment_response.mandateId;
                payload.transactionRef = payment_response.transactionRef;
                payload.date_created = date;
                payload.created_by = invoice.created_by;
                payload.invoiceID = invoice.invoiceID;
                payload.applicationID = invoice.applicationID;
                payload.clientID = invoice.clientID;
                invoice.RRR = payload.RRR;
                invoice.requestId = payload.requestId;
                invoice.transactionRef = payload.transactionRef;
                invoice.response = JSON.stringify(payment_response);
                connection.query('INSERT INTO remita_debits_log Set ?', invoice, function (error, response) {
                    if (payment_response && payment_response.statuscode === '069') {
                        connection.query('INSERT INTO remita_payments Set ?', payload, function (error, response) {
                            if(!error) count++;
                            callback();
                        });
                    } else {
                        callback();
                    }
                });
            });
        }, function (data) {
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
        query =  `SELECT * FROM remita_payments WHERE status = 1`,
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

router.get('/collection/payments/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let start = req.query.start, end = req.query.end,
        query =  `SELECT ID, '0' balance, totalAmount credit, '0' debit, CONCAT('Remita RRR ', RRR) description, date_created posting_date, 
            date_created value_date, 1 status, created_by, date_created, date_modified, '0' allocated, totalAmount unallocated, applicationID, clientID  
            FROM remita_payments WHERE status = 1`,
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

router.delete('/collection/payment/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.id,
        query =  `UPDATE remita_payments Set ? WHERE ID = ${id}`,
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
    payload.status = enums.REMITA_PAYMENT.STATUS.INACTIVE;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(records, function (record, callback) {
            let query =  `UPDATE remita_payments Set ? WHERE ID = ${record.ID}`;
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
        query =  `SELECT * FROM remita_payments WHERE applicationID = ${req.params.applicationID} AND status <> 0`,
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

router.get('/payments/status/get/:applicationID', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query =  `SELECT mandateId, requestId FROM remita_mandates WHERE applicationID = ${req.params.applicationID} AND status = 1`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let remita_mandate = response.data[0];
        if (remita_mandate) {
            helperFunctions.mandatePaymentHistory({
                mandateId: remita_mandate.mandateId,
                requestId: remita_mandate.requestId
            }, function (history_response) {
                if (history_response && (history_response.statuscode === '00' ||  history_response.statuscode === '074')) {
                    let result = history_response.data.data;
                    result.mandateId = history_response.mandateId;
                    result.requestId = history_response.requestId;
                    res.send({status: 200, error: null, response: result});
                } else {
                    res.send({status: 500, error: history_response, response: null});
                }
            })
        } else {
            res.send({status: 500, error: 'There is no remita mandate setup for this application', response: null});
        }
    });
});

router.get('/logs/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let start = req.query.start, end = req.query.end,
        query =  `SELECT l.*, u.fullname initiator FROM remita_debits_log l, users u WHERE l.status = 1 AND l.created_by = u.ID`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    if (start && end) query = query.concat(` AND TIMESTAMP(l.date_created) BETWEEN TIMESTAMP('${start}') AND TIMESTAMP('${end}')`);
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send({status: 200, error: null, response: response.data});
    });
});

router.get('/logs/get/:applicationID', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query =  `SELECT l.*, u.fullname initiator FROM remita_debits_log l, users u
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

router.post('/payment/cancel', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payment = req.body,
        query = `SELECT mandateId, requestId FROM remita_payments WHERE transactionRef = ${payment.transactionRef} AND status = 1`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let remita_mandate = response.data[0];
        if (remita_mandate) {
            payment.mandateId = remita_mandate.mandateId;
            payment.requestId = remita_mandate.requestId;
            helperFunctions.cancelDebitInstruction(payment, function (payment_response) {
                if (payment_response && payment_response.statuscode === '00') {
                    let payload = {
                        status: 0,
                        date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
                    };
                    query =  `UPDATE remita_payments Set ? WHERE transactionRef = ${payment.transactionRef}`;
                    endpoint = `/core-service/post?query=${query}`;
                    url = `${HOST}${endpoint}`;
                    db.query(query, payload, function (error, response) {
                        if(error) {
                            res.send({status: 500, error: error, response: null});
                        } else {
                            res.send(response);
                        }
                    });
                } else {
                    res.send({status: 500, error: payment_response, response: null});
                }
            });
        } else {
            res.send({status: 500, error: 'There is no remita mandate setup for this application', response: null});
        }
    });
});

router.get('/mandate/get/:applicationID', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT mandateId, requestId FROM remita_mandates WHERE applicationID = ${req.params.applicationID} AND status = 1`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let remita_mandate = response.data[0];
        if (remita_mandate) {
            const status_payload = {
                mandateId: remita_mandate.mandateId,
                requestId: remita_mandate.requestId
            };
            helperFunctions.mandateStatus(status_payload, function (remita_mandate_status) {
                res.send({
                    data: remita_mandate_status
                });
            });
        } else {
            res.send({
                status: 500,
                error: 'Oops! Your direct debit mandate cannot be verified at the moment',
                data: {
                    statuscode: '022',
                    status: 'Oops! Your direct debit mandate cannot be verified at the moment'}
            });
        }
    });
});

router.post('/notification/push', function (req, res, next) {
    let payload = req.body;
    if (payload && payload.constructor === Object && Object.keys(payload).length !== 0) {
        res.send({
            status: 200,
            response: 'Success! Notification received successfully',
            data: payload
        });
    } else {
        res.send({
            status: 500,
            response: 'Error! No payload found',
            data: payload
        });
    }
});

router.delete('/invoices/disable', function (req, res, next) {
    let count = 0,
        payload = {},
        records = req.body.invoices;
    payload.enable_remita = enums.ENABLE_REMITA.STATUS.INACTIVE;

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

module.exports = router;