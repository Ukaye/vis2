const axios = require('axios'),
    moment = require('moment'),
    db = require('../../../db'),
    bcrypt = require('bcryptjs'),
    express = require('express'),
    router = express.Router(),
    enums = require('../../../enums'),
    helperFunctions = require('../../../helper-functions'),
    notificationsService = require('../../notifications-service'),
    emailService = require('../../service/custom-services/email.service');

//Get Investment Product
router.get('/all', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let page = ((req.query.page - 1) * 10 < 0) ? 0 : (req.query.page - 1) * 10;
    let search_string = (req.query.search_string === undefined) ? "" : req.query.search_string.toUpperCase();
    let query = `SELECT ID,fullname FROM clients WHERE status = 1 AND (upper(email) LIKE "${search_string}%" OR upper(fullname) LIKE "${search_string}%") ORDER BY ID desc LIMIT ${limit} OFFSET ${page}`;
    const endpoint = "/core-service/get";
    const url = `${HOST}${endpoint}`;
    axios.get(url, {
            params: {
                query: query
            }
        })
        .then(function (response) {
            res.send(response.data);
        }, err => {
            res.send(err);
        })
        .catch(function (error) {
            res.send(error);
        });
});

router.post('/mandate/setup', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let end = req.body.end,
        bank = req.body.bank,
        email = req.body.email,
        start = req.body.start,
        phone = req.body.phone,
        amount = req.body.amount,
        account = req.body.account,
        fullname = req.body.fullname,
        authorization = req.body.authorization,
        application_id = req.body.application_id,
        date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        query = `INSERT INTO remita_mandates Set ?`;

    helperFunctions.setUpMandate({
        payerName: fullname,
        payerEmail: email,
        payerPhone: phone,
        payerBankCode: bank,
        payerAccount: account,
        amount: amount,
        startDate: start,
        endDate: end,
        mandateType: 'DD',
        maxNoOfDebits: '100'
    }, function (payload, setup_response) {
        if (setup_response && setup_response.mandateId) {
            let authorize_payload = {
                mandateId: setup_response.mandateId,
                requestId: setup_response.requestId
            };
            helperFunctions.authorizeMandate(authorize_payload, authorization, function (authorization_response) {
                if (authorization_response && authorization_response.remitaTransRef) {
                    payload.authParams = JSON.stringify(authorization_response.authParams);
                    payload.remitaTransRef = authorization_response.remitaTransRef;
                    payload.mandateId = setup_response.mandateId;
                    payload.applicationID = application_id;
                    payload.date_created = date;
                    delete payload.merchantId;
                    delete payload.serviceTypeId;
                    axios.get(`${HOST}/core-service/get`, {
                        params: {
                            query: `SELECT * FROM remita_mandates WHERE applicationID = ${application_id}`
                        }
                    }).then(remita_mandate => {
                        if (remita_mandate.data[0]) {
                            query = `UPDATE remita_mandates Set ? WHERE ID = ${remita_mandate.data[0]['ID']}`;
                        }
                        const endpoint = `/core-service/post?query=${query}`,
                            url = `${HOST}${endpoint}`;
                        db.query(query, payload, function (error, remita_response) {
                            if (error) {
                                res.send({
                                    status: 500,
                                    error: error,
                                    response: null
                                });
                            } else {
                                res.send(authorization_response);
                            }
                        });
                    });
                } else {
                    res.send({
                        status: 500,
                        error: authorization_response,
                        response: null
                    });
                }
            })
        } else {
            res.send({
                status: 500,
                error: setup_response,
                response: null
            });
        }
    });
});

router.get('/mandate/stop/:applicationID', function (req, res, next) {
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
            query =  `UPDATE remita_mandates Set ? WHERE applicationID = ${req.params.applicationID} AND status = 1`;
            endpoint = `/core-service/post?query=${query}`;
            url = `${HOST}${endpoint}`;
            axios.post(url, {status : 0})
                .then(function (response_) {
                    helperFunctions.stopMandate({
                        mandateId: remita_mandate.mandateId,
                        requestId: remita_mandate.requestId
                    }, function (mandate_response) {
                        if (mandate_response && mandate_response.statuscode === '00') {
                            res.send({status: 200, error: null, response: mandate_response});
                        } else {
                            res.send({status: 500, error: mandate_response, response: null});
                        }
                    })
                }, err => {
                    res.send({status: 500, error: err, response: null});
                })
                .catch(function (error) {
                    res.send({status: 500, error: error, response: null});
                });
        } else {
            res.send({status: 500, error: 'There is no remita mandate setup for this application', response: null});
        }
    });
});

router.post('/corporate/create', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let postData = req.body,
        query = `SELECT * FROM corporates WHERE name = '${req.body.name}'`,
        endpoint = `/core-service/get`,
        url = `${HOST}${endpoint}`;
    axios.get(url, {
            params: {
                query: query
            }
        }).then(function (response) {
            if (response['data'][0]) {
                res.send({
                    status: 500,
                    error: 'Corporate already exists!',
                    response: response['data']
                });
            } else {
                query = 'INSERT INTO corporates Set ?';
                endpoint = `/core-service/post?query=${query}`;
                url = `${HOST}${endpoint}`;
                postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                db.query(query, postData, function (error, response_) {
                    if (error) {
                        res.send({
                            status: 500,
                            error: error,
                            response: null
                        });
                    } else {
                        return res.send(response_);
                    }
                });
            }
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

router.get('/corporates/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT *, (SELECT fullname FROM clients WHERE ID = p.clientID) client FROM corporates p 
                 WHERE upper(p.name) LIKE "${search_string}%" OR upper(p.business_name) LIKE "${search_string}%" 
                 OR upper(p.ID) LIKE "${search_string}%" ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM corporates p 
                 WHERE upper(p.name) LIKE "${search_string}%" OR upper(p.business_name) LIKE "${search_string}%" 
                 OR upper(p.ID) LIKE "${search_string}%") as recordsFiltered FROM corporates`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            if (!payload.data[0])
                return res.send({
                    draw: draw,
                    recordsTotal: 0,
                    recordsFiltered: 0,
                    data: []
                });
            res.send({
                draw: draw,
                recordsTotal: payload.data[0].recordsTotal,
                recordsFiltered: payload.data[0].recordsFiltered,
                data: (response.data === undefined) ? [] : response.data
            });
        });
    });
});

router.get('/corporate/get/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT *, (SELECT fullname FROM clients WHERE ID = p.clientID) client FROM corporates p WHERE ID = ${req.params.id}`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send({
            data: response['data'][0] || {}
        });
    });
});

router.post('/corporate/disable/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `UPDATE corporates Set ? WHERE ID = ${req.params.id}`;
    let endpoint = `/core-service/post?query=${query}`;
    let url = `${HOST}${endpoint}`;
    let payload = {
        status: 0,
        date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
    };
    db.query(query, payload, function (error, response_) {
        if (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        } else {
            res.send({
                status: 200,
                error: null,
                response: response_
            });
        }
    });
});

router.post('/corporate/enable/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `UPDATE corporates Set ? WHERE ID = ${req.params.id}`;
    let endpoint = `/core-service/post?query=${query}`;
    let url = `${HOST}${endpoint}`;
    let payload = {
        status: 1,
        date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
    };
    db.query(query, payload, function (error, response_) {
        if (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        } else {
            res.send({
                status: 200,
                error: null,
                response: response_
            });
        }
    });
});

router.post('/bad_cheque', function (req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO bad_cheques SET ?', data, function (error, result) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            db.query(`SELECT * FROM bad_cheques WHERE status = 1 AND clientID = ${data.clientID}`, function (error, results) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    res.send({
                        "status": 200,
                        "message": "Bad cheque saved successfully!",
                        "response": results
                    });
                }
            });
        }
    });
});

router.get('/bad_cheque/:clientID', function (req, res, next) {
    db.query(`SELECT * FROM bad_cheques WHERE status = 1 AND clientID = ${req.params.clientID}`, function (error, results) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            res.send({
                "status": 200,
                "message": "Bad cheques fetched successfully!",
                "response": results
            });
        }
    });
});

router.delete('/bad_cheque/:id', function (req, res, next) {
    db.query(`SELECT * FROM bad_cheques WHERE status = 1 AND ID = ${req.params.id}`, function (error, cheque) {
        if (error) {
            res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else if (!cheque[0]) {
            res.send({
                "status": 500,
                "error": 'Cheque does not exist!',
                "response": null
            });
        } else {
            let query = "UPDATE bad_cheques SET status = 0, date_modified = ? WHERE ID = ? AND status = 1",
                date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            db.query(query, [date_modified, req.params.id], function (error, results) {
                if (error) {
                    res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    db.query(`SELECT * FROM bad_cheques WHERE status = 1 AND clientID = ${cheque[0]['clientID']}`, function (error, results) {
                        if (error) {
                            res.send({
                                "status": 500,
                                "error": error,
                                "response": null
                            });
                        } else {
                            res.send({
                                "status": 200,
                                "message": "Bad cheque deleted successfully!",
                                "response": results
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/corporates-v2/get', function(req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT ID, name, email, status, date_created from corporates WHERE status = 1 ORDER BY name asc`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send(response['data'] || []);
    });
});

/* Add New Client */
router.post('/create', function(req, res, next) {
    let id;
    let postData = req.body,
        query =  'INSERT INTO clients Set ?',
        query2 = 'select * from clients where username = ? or email = ? or phone = ?';
    postData.status = enums.CLIENT.STATUS.ACTIVE;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    if (!postData.username || !postData.password || !postData.first_name || !postData.last_name || !postData.phone || !postData.email
        || !postData.bvn || !postData.loan_officer || !postData.branch)
        return res.send({"status": 200, "error": null, "response": null, "message": "Required parameter(s) not sent!"});

    postData.fullname = postData.first_name + postData.middle_name + postData.last_name;
    postData.password = bcrypt.hashSync(postData.password, parseInt(process.env.SALT_ROUNDS));
    db.getConnection(function(err, connection) {
        if (err) throw err;
        connection.query(query2,[postData.username, postData.email, postData.phone], function (error, results) {
            if (results && results[0]){
                return res.send({"status": 200, "error": null, "response": results, "message": "Information in use by existing client!"});
            }
            let bvn = postData.bvn;
            if (bvn.trim() !== ''){
                connection.query('select * from clients where bvn = ? and status = 1 limit 1', [bvn], function (error, rest, foelds){
                    if (rest && rest[0]){
                        return res.send({"status": 200, "error": null, "response": rest, "bvn_exists": "Yes"});
                    }
                    connection.query(query,postData, function (error, re) {
                        if(error){
                            console.log(error);
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            connection.query('SELECT * from clients where ID = LAST_INSERT_ID()', function(err, re) {
                                if (!err){
                                    id = re[0]['ID'];
                                    connection.query('INSERT into wallets Set ?', {clientId: id}, function(er, r) {
                                        connection.release();
                                        if (!er){
                                            let payload = {};
                                            payload.category = 'Clients';
                                            payload.userid = req.cookies.timeout;
                                            payload.description = 'New Client Created';
                                            payload.affected = id;
                                            notificationsService.log(req, payload);
                                            emailService.send({
                                                to: postData.email,
                                                subject: 'Signup Successful!',
                                                template: 'client',
                                                context: postData
                                            });
                                            res.send({"status": 200, "error": null, "response": re});
                                        } else {
                                            res.send({"status": 500, "error": er, "response": "Error creating client wallet!"});
                                        }
                                    });
                                } else {
                                    res.send({"status": 500, "error": err, "response": "Error retrieving client details. Please try a new username!"});
                                }
                            });
                        }
                    });
                });
            }
            else {
                connection.query(query,postData, function (error, re) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        connection.query('SELECT * from clients where ID = LAST_INSERT_ID()', function(err, re) {
                            if (!err){
                                id = re[0]['ID'];
                                connection.query('INSERT into wallets Set ?', {clientId: id}, function(er, r) {
                                    connection.release();
                                    if (!er){
                                        let payload = {};
                                        payload.category = 'Clients';
                                        payload.userid = req.cookies.timeout;
                                        payload.description = 'New Client Created';
                                        payload.affected = id;
                                        notificationsService.log(req, payload);
                                        emailService.send({
                                            to: postData.email,
                                            subject: 'Signup Successful!',
                                            template: 'client',
                                            context: postData
                                        });
                                        res.send({"status": 200, "error": null, "response": re});
                                    } else {
                                        res.send({"status": 500, "error": er, "response": "Error creating client wallet!"});
                                    }
                                });
                            } else {
                                res.send({"status": 500, "error": err, "response": "Error retrieving client details. Please try a new username!"});
                            }
                        });
                    }
                });
            }
        });
    });
});

module.exports = router;