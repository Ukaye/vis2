const express = require('express');
const moment = require('moment');
const db = require('../db');
const router = express.Router();

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


module.exports = router;