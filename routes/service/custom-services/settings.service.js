const async = require('async');
const moment = require('moment');
const db = require('../../../db');
const express = require('express');
const router = express.Router();
const xeroFunctions = require('../../xero');

router.post('/application', function (req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO application_settings SET ?', data, function (error, result, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Application settings saved successfully!"
            });
        }
    });
});

router.get('/application', function (req, res, next) {
    let query = "SELECT * FROM application_settings WHERE ID = (SELECT MAX(ID) FROM application_settings)";
    db.query(query, function (error, results, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Application settings fetched successfully!",
                "response": results[0]
            });
        }
    });
});

router.post('/application/loan_purpose', function (req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM loan_purpose_settings WHERE title = ? AND status = 1', [data.title], function (error, loan_purposes, fields) {
        if (loan_purposes && loan_purposes[0]) {
            res.send({
                "status": 500,
                "error": data.title+" has already been added!",
                "response": loan_purposes[0]
            });
        } else {
            db.query('INSERT INTO loan_purpose_settings SET ?', data, function (error, result, fields) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    db.query("SELECT * FROM loan_purpose_settings WHERE status = 1", function (error, results, fields) {
                        if (error) {
                            res.send({
                                "status": 500,
                                "error": error,
                                "response": null
                            });
                        } else {
                            res.send({
                                "status": 200,
                                "message": "Loan purpose saved successfully!",
                                "response": results
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/application/loan_purpose', function (req, res, next) {
    db.query("SELECT * FROM loan_purpose_settings WHERE status = 1", function (error, results, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Loan purposes fetched successfully!",
                "response": results
            });
        }
    });
});

router.delete('/application/loan_purpose/:id', function (req, res, next) {
    let query = "UPDATE loan_purpose_settings SET status = 0, date_modified = ? WHERE ID = ? AND status = 1",
        date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, [date_modified, req.params.id], function (error, results, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            db.query("SELECT * FROM loan_purpose_settings WHERE status = 1", function (error, results, fields) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    res.send({
                        "status": 200,
                        "message": "Loan purpose deleted successfully!",
                        "response": results
                    });
                }
            });
        }
    });
});

router.post('/application/business', function (req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM business_settings WHERE name = ? AND status = 1', [data.name], function (error, businesses, fields) {
        if (businesses && businesses[0]) {
            res.send({
                "status": 500,
                "error": data.name+" has already been added!",
                "response": businesses[0]
            });
        } else {
            db.query('INSERT INTO business_settings SET ?', data, function (error, result, fields) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    db.query("SELECT * FROM business_settings WHERE status = 1", function (error, results, fields) {
                        if (error) {
                            res.send({
                                "status": 500,
                                "error": error,
                                "response": null
                            });
                        } else {
                            res.send({
                                "status": 200,
                                "message": "Loan purpose saved successfully!",
                                "response": results
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/application/business', function (req, res, next) {
    db.query("SELECT * FROM business_settings WHERE status = 1", function (error, results, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Loan purposes fetched successfully!",
                "response": results
            });
        }
    });
});

router.delete('/application/business/:id', function (req, res, next) {
    let query = "UPDATE business_settings SET status = 0, date_modified = ? WHERE ID = ? AND status = 1",
        date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, [date_modified, req.params.id], function (error, results, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            db.query("SELECT * FROM business_settings WHERE status = 1", function (error, results, fields) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    res.send({
                        "status": 200,
                        "message": "Loan purpose deleted successfully!",
                        "response": results
                    });
                }
            });
        }
    });
});

router.post('/fees', function (req, res, next) {
    let data = req.body,
        grades = Object.assign({}, req.body.grades);
    delete data.grades;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO fee_settings SET ?', data, function (error, result, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            let query = "SELECT * FROM fee_settings WHERE ID = (SELECT MAX(ID) FROM fee_settings)";
            db.query(query, function (error, results, fields) {
                if (results && results[0]) {
                    db.getConnection(function(err, connection) {
                        if (err) throw err;

                        async.forEach(grades, function (grade, callback) {
                            grade.feeSettingsID = results[0]['ID'];
                            connection.query('INSERT INTO fee_grades SET ?', grade, function (error, result, fields) {
                                if (error) {
                                }
                                callback();
                            });
                        }, function (data) {
                            connection.release();
                            res.send({
                                "status": 200,
                                "message": "Fee settings saved successfully!"
                            });
                        });
                    });
                } else {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                }
            });
        }
    });
});

router.get('/fees', function (req, res, next) {
    let query = "SELECT * FROM fee_settings WHERE ID = (SELECT MAX(ID) FROM fee_settings)";
    db.query(query, function (error, results, fields) {
        if (results && results[0]) {
            query = `SELECT * FROM fee_grades WHERE feeSettingsID = ${results[0]['ID']}`;
            db.query(query, function (error, results_, fields) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    let result = results[0];
                    result.grades = results_;
                    res.send({
                        "status": 200,
                        "message": "Fee settings fetched successfully!",
                        "response": result
                    });
                }
            });
        } else {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        }
    });
});

router.post('/application/bad_cheque_reason', function (req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM bad_cheque_reason_settings WHERE title = ? AND status = 1', [data.title], function (error, bad_cheque_reasons, fields) {
        if (bad_cheque_reasons && bad_cheque_reasons[0]) {
            res.send({
                "status": 500,
                "error": data.title+" has already been added!",
                "response": bad_cheque_reasons[0]
            });
        } else {
            db.query('INSERT INTO bad_cheque_reason_settings SET ?', data, function (error, result, fields) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    db.query("SELECT * FROM bad_cheque_reason_settings WHERE status = 1", function (error, results, fields) {
                        if (error) {
                            res.send({
                                "status": 500,
                                "error": error,
                                "response": null
                            });
                        } else {
                            res.send({
                                "status": 200,
                                "message": "Bad cheque reason saved successfully!",
                                "response": results
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/application/bad_cheque_reason', function (req, res, next) {
    db.query("SELECT * FROM bad_cheque_reason_settings WHERE status = 1", function (error, results, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Bad cheque reasons fetched successfully!",
                "response": results
            });
        }
    });
});

router.delete('/application/bad_cheque_reason/:id', function (req, res, next) {
    let query = "UPDATE bad_cheque_reason_settings SET status = 0, date_modified = ? WHERE ID = ? AND status = 1",
        date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, [date_modified, req.params.id], function (error, results, fields) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            db.query("SELECT * FROM bad_cheque_reason_settings WHERE status = 1", function (error, results, fields) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    res.send({
                        "status": 200,
                        "message": "Bad cheque reason deleted successfully!",
                        "response": results
                    });
                }
            });
        }
    });
});

router.get('/application/funding_source', function (req, res) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient) => {
        let xeroAccounts = [];
        if (xeroClient) {
            let xeroAccounts_ = await xeroClient.accounts.get();
            xeroAccounts = xeroAccounts_.Accounts.filter(e => {return e.Class === 'CURRENT'});
        }
        return res.send({
            "status": 200,
            "message": "Funding sources fetched successfully!",
            "response": xeroAccounts
        });
    });
});

router.get('/collection_bank', function (req, res) {
    xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async (xeroClient) => {
        let xeroAccounts = [];
        if (xeroClient) {
            let xeroAccounts_ = await xeroClient.accounts.get();
            xeroAccounts = xeroAccounts_.Accounts.filter(e => {return e.Type === 'BANK'});
        }
        return res.send({
            "status": 200,
            "message": "Collection banks fetched successfully!",
            "response": xeroAccounts
        });
    });
});

router.get('/accounts', function (req, res) {
    xeroFunctions.authorizedOperation(req, res, null, async (xeroClient) => {
        let xeroAccounts = [];
        if (xeroClient) {
            let xeroAccounts_ = await xeroClient.accounts.get();
            xeroAccounts = xeroAccounts_.Accounts;
        }
        return res.send({
            "status": 200,
            "message": "Accounts fetched successfully!",
            "response": xeroAccounts
        });
    });
});

router.post('/xero', function (req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO integrations SET ?', data, function (error, result) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Xero configuration saved successfully!",
                "response": result
            });
        }
    });
});

router.get('/xero', function (req, res, next) {
    db.query("SELECT * FROM integrations WHERE ID = (SELECT MAX(ID) FROM integrations)", function (error, results) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Xero configuration fetched successfully!",
                "response": results[0]
            });
        }
    });
});

router.get('/contacts', function (req, res) {
    xeroFunctions.authorizedOperation(req, res, null, async (xeroClient) => {
        let xeroContacts = [];
        if (xeroClient) {
            let xeroContacts_ = await xeroClient.contacts.get();
            xeroContacts = xeroContacts_.Contacts;
        }
        return res.send({
            "status": 200,
            "message": "Contacts fetched successfully!",
            "response": xeroContacts
        });
    });
});

module.exports = router;