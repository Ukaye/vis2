const
    async = require('async'),
    axios = require('axios'),
    moment = require('moment'),
    db = require('../../../db'),
    bcrypt = require('bcryptjs'),
    express = require('express'),
    router = express.Router(),
    SHA512 = require('js-sha512'),
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
    let payload = {},
        payment = req.body;
    payload.created_by = payment.created_by;
    delete payment.created_by;
    helperFunctions.sendDebitInstruction(payment, function (payment_response) {
        if (payment_response && payment_response.statuscode === '069') {
            const HOST = `${req.protocol}://${req.get('host')}`;
            let query =  `INSERT INTO remita_payments Set ?`,
                endpoint = `/core-service/post?query=${query}`,
                url = `${HOST}${endpoint}`;
            payload.fundingAccount = payment.fundingAccount;
            payload.fundingBankCode = payment.fundingBankCode;
            payload.totalAmount = payment.totalAmount;
            payload.RRR = payment_response.RRR;
            payload.requestId = payment_response.requestId;
            payload.mandateId = payment_response.mandateId;
            payload.transactionRef = payment_response.transactionRef;
            payload.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
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
});

router.post('/payments/create', function (req, res, next) {
    let count = 0,
        invoices = req.body.invoices,
        created_by = req.body.created_by;
    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(invoices, function (invoice, callback) {
            let payload = {},
                payment = invoice;
            payload.created_by = created_by;
            delete payment.created_by;
            helperFunctions.sendDebitInstruction(payment, function (payment_response) {
                if (payment_response && payment_response.statuscode === '069') {
                    const HOST = `${req.protocol}://${req.get('host')}`;
                    let query =  `INSERT INTO remita_payments Set ?`,
                        endpoint = `/core-service/post?query=${query}`,
                        url = `${HOST}${endpoint}`;
                    payload.fundingAccount = payment.fundingAccount;
                    payload.fundingBankCode = payment.fundingBankCode;
                    payload.totalAmount = payment.totalAmount;
                    payload.RRR = payment_response.RRR;
                    payload.requestId = payment_response.requestId;
                    payload.mandateId = payment_response.mandateId;
                    payload.transactionRef = payment_response.transactionRef;
                    payload.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    connection.query(query, payload, function (error, response) {
                        if(error) {
                            console.log(error)
                        } else {
                            count++;
                        }
                        callback();
                    });
                } else {
                    console.log(payment_response);
                }
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

router.get('/payments/get/:applicationID', function (req, res, next) {
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

module.exports = router;