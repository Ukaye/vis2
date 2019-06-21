const
    axios = require('axios'),
    async = require('async'),
    moment = require('moment'),
    db = require('../../../db'),
    express = require('express'),
    router = express.Router(),
    notificationsService = require('../../notifications-service');

router.post('/bulk_upload', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let count = 0,
        statement = req.body.statement,
        query =  'INSERT INTO collection_bulk_uploads Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;

    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(statement, function (record, callback) {
            record.created_by = req.body.created_by;
            record.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            connection.query(query, record, function (error, response) {
                if (error) {
                    console.log(error);
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            connection.release();
            return res.send({
                status: 200,
                error: null,
                response: `Statement with ${count} record(s) saved successfully.`
            });
        })
    })
});

router.get('/bulk_upload', function(req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let	query = `SELECT * FROM collection_bulk_uploads WHERE status = 1`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;

    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        return res.send({
            status: 200,
            error: null,
            response: response.data
        });
    });
});

router.delete('/bulk_upload/record/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.id,
        query =  `UPDATE collection_bulk_uploads Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = 0;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, function (error, response) {
        if (error)
            return res.send({status: 500, error: error, response: null});
        return res.send({status: 200, error: null, response: response});
    });
});

router.post('/bulk_upload/confirm-payment', function(req, res, next) {
    let count = 0,
        invoices = req.body.invoices,
        payments = req.body.payments,
        created_by = req.body.created_by,
        overpayment = req.body.overpayment;

    overpaymentCheck(invoices[0]['clientID'], overpayment, function () {
        db.getConnection(function(err, connection) {
            if (err) throw err;

            async.forEach(invoices, function (invoice, callback) {
                async.forEach(payments, function (payment, callback_) {
                    let update = {
                        actual_payment_amount: '0',
                        actual_interest_amount: '0',
                        actual_fees_amount: '0',
                        actual_penalty_amount: '0',
                        payment_status: 1
                    };
                    if (invoice.type === 'Principal')
                        update.actual_payment_amount = parseFloat(invoice.payment_amount);
                    if (invoice.type === 'Interest')
                        update.actual_interest_amount = parseFloat(invoice.payment_amount);
                    connection.query('UPDATE application_schedules SET ? WHERE ID = ' + invoice.ID, update, function (error, result, fields) {
                        if (error) {
                            console.log(error);
                            callback_();
                        } else {
                            let record = {};
                            record.invoiceID = invoice.ID;
                            record.agentID = created_by;
                            record.applicationID = invoice.applicationID;
                            record.payment_amount = update.actual_payment_amount;
                            record.interest_amount = update.actual_interest_amount;
                            record.fees_amount = update.actual_fees_amount;
                            record.penalty_amount = update.actual_penalty_amount;
                            record.payment_source = 'cash';
                            record.payment_date = payment.value_date;
                            record.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                            connection.query('INSERT INTO schedule_history SET ?', record, function (error, response, fields) {
                                if (error) {
                                    console.log(error);
                                    callback_();
                                } else {
                                    count++;
                                    let payload = {};
                                    payload.category = 'Application';
                                    payload.userid = req.cookies.timeout;
                                    payload.description = 'Loan Application Payment Confirmed';
                                    payload.affected = invoice.applicationID;
                                    notificationsService.log(req, payload);

                                    let update2 = {};
                                    update2.status = 0;
                                    update2.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                    db.query(`UPDATE collection_bulk_uploads Set ? WHERE ID = ${payment.ID}`, update2, function (error, response2) {
                                        if (error)
                                            console.log(error);
                                        callback_();
                                    });
                                }
                            });
                        }
                    });
                }, function (data) {
                    callback();
                });
            }, function (data) {
                connection.release();
                return res.send({
                    status: 200,
                    error: null,
                    response: `${count} payment(s) posted successfully.`
                });
            });
        });
    });
});

function overpaymentCheck(clientID, amount, callback) {
    if (amount > 0) {
        let data = {};
        data.amount = amount;
        data.clientID = clientID;
        data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        db.query('INSERT INTO escrow SET ?', data, function (error, result, fields) {
            if(error){
                console.log(error);
            }
            callback();
        });
    } else {
        callback();
    }
}

module.exports = router;