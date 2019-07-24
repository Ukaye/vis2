const
    _ = require('lodash'),
    axios = require('axios'),
    async = require('async'),
    moment = require('moment'),
    db = require('../../../db'),
    express = require('express'),
    router = express.Router(),
    enums = require('../../../enums'),
    helperFunctions = require('../../../helper-functions'),
    notificationsService = require('../../notifications-service');

router.post('/bulk_upload/validate', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = {},
        query = 'SELECT * FROM collection_bulk_upload_history WHERE status = 1 AND collection_bankID = ? AND ' +
            '(TIMESTAMP(?) BETWEEN TIMESTAMP(start) AND TIMESTAMP(end) OR TIMESTAMP(?) BETWEEN TIMESTAMP(start) AND TIMESTAMP(end))',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;

    data.collection_bankID = req.body.account;
    data.start = req.body.start;
    data.end = req.body.end;
    db.query(query, [data.collection_bankID,data.start,data.end], function (error, history_obj, fields) {
        if(history_obj && history_obj[0]) {
            res.send({
                "status": 500,
                "error": "Similar statement already uploaded!",
                "response": history_obj
            });
        } else {
            return res.send({
                status: 200,
                error: null,
                response: `Statement is valid.`
            });
        }
    });
});

router.post('/bulk_upload', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let count = 0,
        data = {},
        statement = req.body.statement,
        query = 'INSERT INTO collection_bulk_uploads Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;

    data.collection_bankID = req.body.account;
    data.start = req.body.start;
    data.end = req.body.end;
    data.created_by = req.body.created_by;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.getConnection(function(err, connection) {
        if (err) throw err;

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
    })
});

router.get('/bulk_upload', function(req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let	filter = req.query.history,
        escrow = 'SELECT SUM(e.amount) FROM escrow e WHERE e.collection_bulk_uploadID = c.ID',
        escrow_ = `CASE WHEN (${escrow}) IS NULL THEN 0 ELSE (${escrow}) END`,
        allocated = `SELECT SUM(h.payment_amount + h.interest_amount + h.fees_amount + h.penalty_amount + ${escrow_}) 
            FROM schedule_history h WHERE h.collection_bulk_uploadID = c.ID`,
        allocated_ = `CASE WHEN (${allocated}) IS NULL THEN 0 ELSE (${allocated}) END`,
        query = `SELECT c.*, ${allocated_} allocated, (c.credit - ${allocated_}) unallocated FROM collection_bulk_uploads c WHERE 
            (c.status = ${enums.COLLECTION_BULK_UPLOAD.STATUS.NO_PAYMENT} OR c.status = ${enums.COLLECTION_BULK_UPLOAD.STATUS.PART_PAYMENT})`,
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

router.delete('/bulk_upload/records', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let count = 0,
        payload = {},
        records = req.body.records;
    payload.status = enums.COLLECTION_BULK_UPLOAD.STATUS.INACTIVE;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(records, function (record, callback) {
            let query =  `UPDATE collection_bulk_uploads Set ? WHERE ID = ${record.ID}`;
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

router.post('/bulk_upload/confirm-payment', function(req, res, next) {
    let count = 0,
        escrow = req.body.escrow,
        invoices = req.body.invoices,
        payments = req.body.payments,
        created_by = req.body.created_by,
        overpayment = req.body.overpayment;

    overpaymentCheck(invoices[0]['clientID'], payments[0]['ID'], overpayment, escrow, function () {
        db.getConnection(function(err, connection) {
            if (err) throw err;

            let payment_history = {
              index: 0,
              balance: payments[0]['unallocated']
            };
            async.forEach(invoices, function (invoice, callback) {
                let records = [],
                    invoice_amount = invoice.payment_amount;
                do {
                    let amount = 0,
                        record = {},
                        update = {
                            actual_payment_amount: '0',
                            actual_interest_amount: '0',
                            actual_fees_amount: '0',
                            actual_penalty_amount: '0',
                            payment_status: 1
                        };
                    if (payment_history.index >= payments.length) break;
                    let payment = payments[payment_history['index']];
                    if (invoice_amount >= payment_history.balance) {
                        amount = payment_history.balance;
                        invoice_amount -= amount;
                        record.status = 'full';
                        payment_history.balance = payments[payment_history['index']]['unallocated'];
                        payment_history.index = payment_history.index + 1;
                    } else {
                        amount = invoice_amount;
                        invoice_amount = 0;
                        payment_history.balance -= amount;
                        record.status = 'part';
                    }
                    if (invoice.type === 'Principal') update.actual_payment_amount = amount;
                    if (invoice.type === 'Interest') update.actual_interest_amount = amount;
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
                    records.push({record: record, update: update});
                }
                while (invoice_amount > 0);
                postPayment(records, connection, req, escrow, overpayment, function (response) {
                    count += response;
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

function overpaymentCheck(clientID, paymentID, amount, escrow, callback) {
    if (amount > 0 && escrow) {
        let data = {};
        data.amount = amount;
        data.clientID = clientID;
        data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        data.collection_bulk_uploadID = paymentID;
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

function postPayment(records, connection, req, escrow, overpayment, callback) {
    let count = 0;
    async.forEach(records, function (record_, callback_) {
        let record = record_.record;
        connection.query(`UPDATE application_schedules SET ? WHERE ID = ${record.invoiceID}`, record_.update, function (error, result, fields) {
            if (error) {
                console.log(error);
                callback_();
            } else {
                let status = record.status;
                delete record.status;
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
                        payload.affected = record.applicationID;
                        notificationsService.log(req, payload);

                        let update2 = {};
                        update2.status = (!escrow && overpayment > 0 && status === 'part')?
                            enums.COLLECTION_BULK_UPLOAD.STATUS.PART_PAYMENT : enums.COLLECTION_BULK_UPLOAD.STATUS.FULL_PAYMENT;
                        update2.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                        connection.query(`UPDATE collection_bulk_uploads Set ? WHERE ID = ${record.collection_bulk_uploadID}`, update2, function (error, response2) {
                            if (error)
                                console.log(error);
                            callback_();
                        });
                    }
                });
            }
        });
    }, function (data) {
        callback(count);
    })
}

router.get('/bulk_upload/history', function(req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let	query = `SELECT h.*, b.name FROM collection_bulk_upload_history h, collection_banks b WHERE h.collection_bankID = b.ID AND h.status = 1`,
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
        "s.applicationID, s.status, s.payment_collect_date, s.payment_status, 'Principal' AS 'type', " +
        "(payment_amount - (SELECT COALESCE(SUM(p.payment_amount),0) FROM schedule_history p WHERE p.invoiceID = s.ID AND p.status = 1)) payment_amount FROM application_schedules AS s, clients c " +
        "WHERE s.status = 1 AND ((payment_amount - (SELECT COALESCE(SUM(p.payment_amount),0) FROM schedule_history p WHERE p.invoiceID = s.ID AND p.status = 1)) > 0) = 1 AND c.ID = (select userID from applications a where a.ID = s.applicationID) " +
        "AND (select close_status from applications a where a.ID = s.applicationID) = 0 AND s.payment_amount > 0 AND TIMESTAMP(payment_collect_date) <= TIMESTAMP('"+today+"') ORDER BY ID desc";

    db.query(query, function (error, results, fields) {
        if(error) {
            res.send({"status": 500, "error": error, "response": null});
        } else {
            query = "SELECT s.ID,c.fullname AS client, c.phone, c.first_name, c.middle_name, c.last_name, c.ID AS clientID, " +
                "s.applicationID, s.status, s.interest_collect_date as payment_collect_date, s.payment_status, 'Interest' AS 'type', " +
                "(interest_amount - (SELECT COALESCE(SUM(p.interest_amount),0) FROM schedule_history p WHERE p.invoiceID = s.ID AND p.status = 1)) payment_amount FROM application_schedules AS s, clients c " +
                "WHERE s.status = 1 AND ((interest_amount - (SELECT COALESCE(SUM(p.interest_amount),0) FROM schedule_history p WHERE p.invoiceID = s.ID AND p.status = 1)) > 0) = 1 AND c.ID = (select userID from applications a where a.ID = s.applicationID) " +
                "AND (select close_status from applications a where a.ID = s.applicationID) = 0 AND s.interest_amount > 0 AND TIMESTAMP(interest_collect_date) <= TIMESTAMP('"+today+"') ORDER BY ID desc";
            let results_principal = results;
            db.query(query, function (error, results2, fields) {
                if(error) {
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results_interest = results2,
                        results = results_principal.concat(results_interest);
                    return res.send({
                        status: 200,
                        message: "Due invoices fetched successfully!",
                        response: _.orderBy(results, ['ID'], ['desc'])
                    });
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
    db.query('SELECT * FROM collection_banks WHERE (name = ? OR account = ?) AND status = 1', [data.name, data.account],
        function (error, collection_banks, fields) {
        if (collection_banks && collection_banks[0]) {
            res.send({
                "status": 500,
                "error": `${data.name} (${data.account}) has already been added!`,
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