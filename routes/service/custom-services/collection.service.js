const
    axios = require('axios'),
    async = require('async'),
    moment = require('moment'),
    db = require('../../../db'),
    express = require('express'),
    router = express.Router(),
    enums = require('../../../enums'),
    notificationsService = require('../../notifications-service');

router.post('/bulk_upload', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let count = 0,
        data = {},
        statement = req.body.statement,
        query =  'INSERT INTO collection_bulk_uploads Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;

    data.collection_bankID = req.body.account;
    data.start = req.body.start;
    data.end = req.body.end;
    data.created_by = req.body.created_by;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query("SELECT * FROM collection_bulk_upload_history WHERE status = 1 AND collection_bankID = ? AND " +
            "(TIMESTAMP(?) BETWEEN TIMESTAMP(start) AND TIMESTAMP(end) OR TIMESTAMP(?) BETWEEN TIMESTAMP(start) AND TIMESTAMP(end))",
            [data.collection_bankID,data.start,data.end], function (error, history_obj, fields) {
            if(history_obj && history_obj[0]) {
                res.send({
                    "status": 500,
                    "error": "Similar statement already uploaded!",
                    "response": history_obj
                });
            } else {
                connection.query('INSERT INTO collection_bulk_upload_history SET ?', data, function (error, result, fields) {
                    if (error) {
                        res.send({
                            "status": 500,
                            "error": error,
                            "response": null
                        });
                    } else {
                        connection.query('SELECT MAX(ID) AS ID from collection_bulk_upload_history', function (err, history_id, fields) {
                            if (error) {
                                res.send({
                                    "status": 500,
                                    "error": error,
                                    "response": null
                                });
                            } else {
                                async.forEach(statement, function (record, callback) {
                                    record.bulk_upload_historyID = history_id[0]['ID'];
                                    record.created_by = req.body.created_by;
                                    record.status = enums.COLLECTION_BULK_UPLOAD.STATUS.NO_PAYMENT;
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
                            }
                        });
                    }
                });
            }
        });
    })
});

router.get('/bulk_upload', function(req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let	filter = req.query.history,
        allocated = 'SELECT SUM(h.payment_amount + h.interest_amount + h.fees_amount + h.penalty_amount) ' +
            'FROM schedule_history h WHERE h.collection_bulk_uploadID = ID',
        allocated_ = `CASE WHEN (${allocated}) IS NULL THEN 0 ELSE (${allocated}) END`,
        query = `SELECT *, ${allocated_} allocated, (credit - ${allocated_}) unallocated FROM collection_bulk_uploads WHERE 
            (status = ${enums.COLLECTION_BULK_UPLOAD.STATUS.NO_PAYMENT} OR status = ${enums.COLLECTION_BULK_UPLOAD.STATUS.PART_PAYMENT})`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    if (filter) query = query.concat(` AND bulk_upload_historyID = ${filter}`);

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
    payload.status = enums.COLLECTION_BULK_UPLOAD.STATUS.INACTIVE;
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

    // overpaymentCheck(invoices[0]['clientID'], overpayment, function () {
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
                        record.collection_bulk_uploadID = payment.ID;
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
                                update2.status = (overpayment > 0)? enums.COLLECTION_BULK_UPLOAD.STATUS.PART_PAYMENT : enums.COLLECTION_BULK_UPLOAD.STATUS.FULL_PAYMENT;
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
    // });
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

router.get('/bulk_upload/history', function(req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let	query = `SELECT h.*, b.account FROM collection_bulk_upload_history h, collection_banks b WHERE h.collection_bankID = b.ID AND h.status = 1`,
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

router.get('/invoices/due', function(req, res, next) {
    let today = moment().utcOffset('+0100').format('YYYY-MM-DD'),
        query = "SELECT s.ID,c.fullname AS client, c.phone, c.first_name, c.middle_name, c.last_name, c.ID AS clientID, " +
        "s.applicationID, s.status, s.payment_amount, s.payment_collect_date, s.payment_status, 'Principal' AS 'type' FROM application_schedules AS s, clients c " +
        "WHERE s.status = 1 AND s.payment_status = 0 AND (select status from applications a where a.ID = s.applicationID) = 2 AND c.ID = (select userID from applications a where a.ID = s.applicationID) " +
        "AND (select close_status from applications a where a.ID = s.applicationID) = 0 AND s.payment_amount > 0 AND TIMESTAMP(payment_collect_date) <= TIMESTAMP('"+today+"') ORDER BY ID desc";

    db.query(query, function (error, results, fields) {
        if(error) {
            res.send({"status": 500, "error": error, "response": null});
        } else {
            query = "SELECT s.ID,c.fullname AS client, c.phone, c.first_name, c.middle_name, c.last_name, c.ID AS clientID, " +
                "s.applicationID, s.status, s.interest_amount as payment_amount, s.interest_collect_date as payment_collect_date, s.payment_status, 'Interest' AS 'type' FROM application_schedules AS s, clients c " +
                "WHERE s.status = 1 AND s.payment_status = 0 AND (select status from applications a where a.ID = s.applicationID) = 2 AND c.ID = (select userID from applications a where a.ID = s.applicationID) " +
                "AND (select close_status from applications a where a.ID = s.applicationID) = 0 AND s.interest_amount > 0 AND TIMESTAMP(payment_collect_date) <= TIMESTAMP('"+today+"') ORDER BY ID desc";
            let results_principal = results;
            db.query(query, function (error, results2, fields) {
                if(error) {
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results_interest = results2,
                        results = results_principal.concat(results_interest);
                    return res.send({"status": 200, "message": "Due invoices fetched successfully!", "response": results});
                }
            });
        }
    });
});

router.delete('/bulk_upload/records/debit', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        query =  `UPDATE collection_bulk_uploads Set ? WHERE (credit - debit) < 0`,
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

router.post('/collection_bank', function (req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM collection_banks WHERE account = ? AND status = 1', [data.account], function (error, collection_banks, fields) {
        if (collection_banks && collection_banks[0]) {
            res.send({
                "status": 500,
                "error": data.account+" has already been added!",
                "response": collection_banks[0]
            });
        } else {
            db.query('INSERT INTO collection_banks SET ?', data, function (error, result, fields) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    db.query("SELECT * FROM collection_banks WHERE status = 1", function (error, results, fields) {
                        if (error) {
                            res.send({
                                "status": 500,
                                "error": error,
                                "response": null
                            });
                        } else {
                            res.send({
                                "status": 200,
                                "message": "Collection bank saved successfully!",
                                "response": results
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/collection_bank', function (req, res, next) {
    db.query("SELECT * FROM collection_banks WHERE status = 1", function (error, results, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Collection banks fetched successfully!",
                "response": results
            });
        }
    });
});

router.delete('/collection_bank/:id', function (req, res, next) {
    let query = "UPDATE collection_banks SET status = 0, date_modified = ? WHERE ID = ? AND status = 1",
        date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, [date_modified, req.params.id], function (error, results, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            db.query("SELECT * FROM collection_banks WHERE status = 1", function (error, results, fields) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    res.send({
                        "status": 200,
                        "message": "Collection bank deleted successfully!",
                        "response": results
                    });
                }
            });
        }
    });
});

module.exports = router;