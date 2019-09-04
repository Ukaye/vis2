const fs = require('fs'),
    async = require('async'),
    axios = require('axios'),
    moment = require('moment'),
    db = require('../../../db'),
    bcrypt = require('bcryptjs'),
    express = require('express'),
    router = express.Router(),
    jwt = require('jsonwebtoken'),
    enums = require('../../../enums'),
    helperFunctions = require('../../../helper-functions'),
    notificationsService = require('../../notifications-service'),
    emailService = require('../../service/custom-services/email.service');

//Get Investment Product
router.get('/all', function (req, res) {
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

router.post('/mandate/setup', function (req, res) {
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

router.get('/mandate/stop/:applicationID', function (req, res) {
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

router.post('/corporate/create', function (req, res) {
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

router.get('/corporates/get', function (req, res) {
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

router.get('/corporate/get/:id', function (req, res) {
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

router.post('/corporate/disable/:id', function (req, res) {
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

router.post('/corporate/enable/:id', function (req, res) {
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

router.post('/bad_cheque', function (req, res) {
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

router.get('/bad_cheque/:clientID', function (req, res) {
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

router.delete('/bad_cheque/:id', function (req, res) {
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

router.get('/corporates-v2/get', function(req, res) {
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
router.post('/create', function(req, res) {
    let id;
    let postData = req.body,
        query =  'INSERT INTO clients Set ?',
        query2 = 'select * from clients where username = ? or email = ? or phone = ?';
    postData.status = enums.CLIENT.STATUS.ACTIVE;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    if (!postData.username || !postData.password || !postData.first_name || !postData.last_name || !postData.phone || !postData.email
        || !postData.bvn || !postData.loan_officer || !postData.branch)
        return res.send({"status": 200, "error": null, "response": null, "message": "Required parameter(s) not sent!"});

    postData.fullname = `${postData.first_name} ${(postData.middle_name || '')} ${postData.last_name}`;
    postData.password = bcrypt.hashSync(postData.password, parseInt(process.env.SALT_ROUNDS));
    postData.images_folder = postData.email;
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
                                    connection.query('INSERT into wallets Set ?', {client_id: id}, function(er, r) {
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
                                connection.query('INSERT into wallets Set ?', {client_id: id}, function(er, r) {
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

router.post('/login', function (req, res) {
    let username = req.body.username,
        password = req.body.password;

    db.query('SELECT * FROM clients WHERE username = ?', username, function (err, client) {
        if (err)
            return res.send({
                "status": 500,
                "error": err,
                "response": "Connection Error!"
            });

        if (!client[0])
            return res.send({
                "status": 500,
                "error": null,
                "response": "Incorrect Username/Password!"
            });

        if (client[0]['status'] === "0")
            return res.send({
                "status": 500,
                "error": null,
                "response": "User Disabled!"
            });

        let user = client[0];
        if (bcrypt.compareSync(password, user.password)) {
            user.token = jwt.sign({
                    ID: user.ID,
                    username: user.username,
                    fullname: user.fullname,
                    email: user.email,
                    phone: user.phone
                },
                process.env.SECRET_KEY,
                {
                    expiresIn: 60 * 60 * 24
                });
            user.tenant = process.env.TENANT;
            user.environment = process.env.STATUS;
            let payload = {};
            payload.category = 'Authentication';
            payload.userid = user.ID;
            payload.description = 'New User Login';
            payload.affected = user.ID;
            notificationsService.log(req, payload);
            res.send({
                "status": 200,
                "error": null,
                "response": user
            });
        } else {
            res.send({
                "status": 500,
                "error": null,
                "response": "Password is incorrect!"
            });
        }
    });
});

router.put('/update/:id', helperFunctions.verifyJWT, function(req, res) {
    let postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `Update clients SET ? where ID = ${req.params.id}`;
    delete postData.ID;
    delete postData.username;
    delete postData.password;
    delete postData.email;
    db.query(query, postData, function (error, results) {
        if(error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        let payload = {};
        payload.category = 'Clients';
        payload.userid = req.cookies.timeout;
        payload.description = 'Client details updated.';
        payload.affected = req.params.id;
        notificationsService.log(req, payload);
        res.send({
            "status": 200,
            "error": null,
            "response": "Client Details Updated"
        });
    });
});

router.get('/enable/:id', helperFunctions.verifyJWT, function(req, res) {
    let postData = req.body;
    postData.status = enums.CLIENT.STATUS.ACTIVE;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `Update clients SET ? where ID = ${req.params.id}`;
    db.query(query, postData, function (error, results) {
        if(error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        res.send({
            "status": 200,
            "error": null,
            "response": "Client Reactivated!"
        });
    });
});

router.delete('/disable/:id', helperFunctions.verifyJWT, function(req, res) {
    let postData = req.body;
    postData.status = enums.CLIENT.STATUS.INACTIVE;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `Update clients SET ? where ID = ${req.params.id}`;
    db.query(query, postData, function (error, results) {
        if(error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        res.send({
            "status": 200,
            "error": null,
            "response": "Client Disabled!"
        });
    });
});

router.get('/get/:id', helperFunctions.verifyJWT, function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT * FROM clients WHERE ID = ${req.params.id}`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let result = (response.data === undefined) ? {} : response.data[0];
        if (!result) return res.send({
            "status": 500,
            "error": 'User does not exist!',
            "response": null
        });
        res.send({
            "status": 200,
            "error": null,
            "response": result
        });
    });
});

router.get('/products', helperFunctions.verifyJWT, function(req, res) {
    let query = 'SELECT w.*, a.loan_requested_min, a.loan_requested_max, a.tenor_min, a.tenor_max, a.interest_rate_min, a.interest_rate_max, ' +
        '(SELECT GROUP_CONCAT(s.document) FROM workflow_stages s WHERE w.ID = s.workflowID) document ' +
        'FROM workflows w, application_settings a WHERE w.status <> 0 AND a.ID = (SELECT MAX(ID) FROM application_settings) ORDER BY w.ID desc';
    db.query(query, function (error, results) {
        if(error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        res.send({
            "status": 200,
            "error": null,
            "response": results
        });
    });
});

//File Upload - New Client (Image and Signature)
router.post('/upload/:id/:item', helperFunctions.verifyJWT, function(req, res) {
    if (!req.files) return res.status(500).send('No file was found!');
    if (!req.params.id || !req.params.item) return res.status(500).send('Required parameter(s) not sent!');

    db.query(`SELECT * FROM clients WHERE ID = ${req.params.id}`, function (error, client) {
        if(error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        if(!client[0])
            return res.send({
                "status": 500,
                "error": null,
                "response": 'User does not exist!'
            });

        let user = client[0],
            item = req.params.item,
            sampleFile = req.files.file,
            extArray = sampleFile.name.split("."),
            extension = extArray[extArray.length - 1],
            folder = user.images_folder || `${user.fullname}_${user.email}`;
        if (extension) extension = extension.toLowerCase();
        const folder_url = `files/users/${folder}/`,
            file_url = `${folder_url}${folder}_${item}.${extension}`;
        switch (item) {
            case '1': {
                item ="Image";
                break;
            }
            case '2': {
                item ="Signature";
                break;
            }
            case '3': {
                item ="ID Card";
                break;
            }
        }
        fs.stat(folder_url, function(err) {
            if (!err) {
                console.log('file or directory exists');
            } else if (err.code === 'ENOENT') {
                fs.mkdirSync(`files/users/${folder}/`);
            }
        });

        fs.stat(file_url, function (err) {
            if (err) {
                sampleFile.mv(file_url, function(err) {
                    if (err) return res.send({
                        "status": 500,
                        "error": err,
                        "response": null
                    });
                    res.send({
                        "status": 200,
                        "error": null,
                        "message": 'File uploaded!',
                        "response": `${req.HOST}/${encodeURI(file_url)}`
                    });
                });
            } else {
                fs.unlink(file_url,function(err){
                    if(err) return res.send({
                        "status": 500,
                        "error": err,
                        "response": null
                    });

                    sampleFile.mv(file_url, function(err) {
                        if (err) return res.send({
                            "status": 500,
                            "error": err,
                            "response": null
                        });

                        res.send({
                            "status": 200,
                            "error": null,
                            "message": 'File uploaded!',
                            "response": `${req.HOST}/${encodeURI(file_url)}`
                        });
                    });
                });
            }
        });
    });
});

router.post('/application/create/:id', helperFunctions.verifyJWT, function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let postData = req.body,
        query =  'INSERT INTO client_applications Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    postData.userID = req.user.ID;
    postData.name = req.user.fullname;
    postData.rate = 120;
    postData.created_by = req.user.ID;
    postData.status = enums.CLIENT_APPLICATION.STATUS.ACTIVE;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, postData, function (error, results) {
        if(error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        query = `SELECT * from client_applications WHERE ID = (SELECT MAX(ID) from client_applications)`;
        endpoint = `/core-service/get`;
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response_ => {
            res.send({status: 200, error: null, response: response_['data'][0]});
        }, err => {
            res.send({status: 500, error: err, response: null});
        })
            .catch(error => {
                res.send({status: 500, error: error, response: null});
            });
    });
});

router.get('/applications/get/:id', helperFunctions.verifyJWT, function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let id = req.params.id;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT p.*, c.fullname, c.phone, a.ID loanID, a.status loan_status FROM clients c, client_applications p LEFT JOIN applications a ON p.ID = a.preapplicationID AND a.userID = ${id} 
                 WHERE p.userID = ${id} AND p.userID = c.ID AND (upper(p.name) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
                 OR upper(p.ID) LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM client_applications p 
                 WHERE p.userID = ${id} AND (upper(p.name) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
                 OR upper(p.ID) LIKE "${search_string}%")) as recordsFiltered FROM client_applications WHERE userID = ${id}`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            res.send({
                "status": 200,
                "error": null,
                "response": {
                    draw: draw,
                    recordsTotal: payload.data[0].recordsTotal,
                    recordsFiltered: payload.data[0].recordsFiltered,
                    data: (response.data === undefined) ? [] : response.data
                }
            });
        });
    });
});

router.get('/application/get/:id/:application_id', helperFunctions.verifyJWT, function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`,
        path = `files/client_application-${req.params.application_id}/`;
    let query = `SELECT p.*, c.fullname, c.email, c.phone FROM client_applications p 
                INNER JOIN clients c ON p.userID = c.ID WHERE p.ID = ${req.params.application_id} AND p.userID = ${req.params.id}`,
        query2 = `SELECT u.ID userID, u.fullname, u.phone, u.email, u.address, cast(u.loan_officer as unsigned) loan_officer,
            a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.workflowID, a.interest_rate, a.repayment_date,
            a.reschedule_amount, a.loanCirrusID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.duration, a.client_type,
            (SELECT l.supervisor FROM users l WHERE l.ID = u.loan_officer) AS supervisor,
            (SELECT sum(amount) FROM escrow WHERE clientID=u.ID AND status=1) AS escrow,
            r.payerBankCode, r.payerAccount, r.requestId, r.mandateId, r.remitaTransRef
            FROM clients AS u INNER JOIN applications AS a ON u.ID = a.userID LEFT JOIN remita_mandates r 
            ON (r.applicationID = a.ID AND r.status = 1) WHERE a.preapplicationID = ${req.params.application_id} AND a.userID = ${req.params.id}`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let result = (response.data === undefined) ? {} : response.data[0];
        if (!result) return res.send({
            "status": 500,
            "error": 'Application does not exist!',
            "response": null
        });
        axios.get(url, {
            params: {
                query: query2
            }
        }).then(response => {
            let obj = {},
                result2 = (response.data === undefined) ? {} : response.data[0];
            if (result2) result.loanID = result2.ID;
            if (result2) result.loan_status = result2.status;
            delete result2.ID;
            delete result2.status;
            result = Object.assign({}, result, result2);
            if (!fs.existsSync(path)) {
                result.files = {};
                res.send(result);
            } else {
                fs.readdir(path, function (err, files){
                    async.forEach(files, function (file, callback){
                        let filename = file.split('.')[0].split('_');
                        filename.shift();
                        obj[filename.join('_')] = path+file;
                        callback();
                    }, function(data){
                        result.files = obj;
                        res.send({
                            "status": 200,
                            "error": null,
                            "response": result
                        });
                    });
                });
            }
        });
    });
});

router.get('/application/accept/:id/:application_id', helperFunctions.verifyJWT, function (req, res) {
    let payload = {},
        id = req.params.id,
        application_id = req.params.application_id,
        query =  `UPDATE client_applications Set ? WHERE ID = ${application_id} AND userID = ${id}`;
    payload.status = enums.CLIENT_APPLICATION.STATUS.ACCEPTED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(`SELECT * FROM client_applications WHERE ID = ${application_id} AND userID = ${id}`, function (err, application) {
        if (err) return res.send({
                "status": 500,
                "error": err,
                "response": null
            });

        if (!application[0]) return res.send({
            "status": 500,
            "error": null,
            "response": 'Application does not exist!'
        });

        if (application[0]['status'] !== enums.CLIENT_APPLICATION.STATUS.APPROVED)
            return res.send({
                "status": 500,
                "error": null,
                "response": 'Application needs to be approved!'
            });

        db.query(query, payload, function (error, response) {
            if (error)
                return res.send({status: 500, error: error, response: null});
            return res.send({status: 200, error: null, response: 'Loan offer accepted successfully!'});
        });
    });
});

router.get('/application/decline/:id/:application_id', helperFunctions.verifyJWT, function (req, res) {
    let payload = {},
        id = req.params.id,
        application_id = req.params.application_id,
        query =  `UPDATE client_applications Set ? WHERE ID = ${application_id} AND userID = ${id}`;
    payload.status = enums.CLIENT_APPLICATION.STATUS.DECLINED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(`SELECT * FROM client_applications WHERE ID = ${application_id} AND userID = ${id}`, function (err, application) {
        if (err) return res.send({
            "status": 500,
            "error": err,
            "response": null
        });

        if (!application[0]) return res.send({
            "status": 500,
            "error": null,
            "response": 'Application does not exist!'
        });

        if (application[0]['status'] !== enums.CLIENT_APPLICATION.STATUS.APPROVED)
            return res.send({
                "status": 500,
                "error": null,
                "response": 'Application needs to be approved!'
            });

        db.query(query, payload, function (error, response) {
            if (error)
                return res.send({status: 500, error: error, response: null});
            return res.send({status: 200, error: null, response: 'Loan offer declined successfully!'});
        });
    });
});

router.post('/application/upload/:id/:application_id/:name', helperFunctions.verifyJWT, function(req, res) {
    let	id = req.params.id,
        name = req.params.name,
        sampleFile = req.files.file,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1],
        application_id = req.params.application_id,
        query = `SELECT * FROM client_applications WHERE ID = ${application_id} AND userID = ${id}`,
        endpoint = '/core-service/get',
        url = `${req.HOST}${endpoint}`;
    if (extension) extension = extension.toLowerCase();
    if (!req.files) return res.status(500).send('No files were uploaded.');
    if (!req.params || !application_id || !name) return res.status(500).send('Required parameter(s) not sent!');

    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let client_application = response.data;
        if (!client_application || !client_application[0]) {
            return res.send({
                "status": 500,
                "error": "Application does not exist",
                "response": null
            });
        } else {
            const file_folder = `files/client_application-${application_id}/`;
            fs.stat(file_folder, function(err) {
                if (err && (err.code === 'ENOENT'))
                    fs.mkdirSync(file_folder);

                const file_url = `${file_folder}${application_id}_${name}.${extension}`;
                fs.stat(file_url, function (err) {
                    if (err) {
                        sampleFile.mv(file_url, function(err) {
                            if (err) return res.status(500).send(err);
                            res.send({
                                "status": 200,
                                "error": null,
                                "message": 'File uploaded!',
                                "response": `${req.HOST}/${encodeURI(file_url)}`
                            });
                        });
                    } else {
                        fs.unlink(file_url,function(err){
                            if(err){
                                return console.log(err);
                            } else {
                                sampleFile.mv(file_url, function(err) {
                                    if (err)
                                        return res.status(500).send(err);
                                    res.send({
                                        "status": 200,
                                        "error": null,
                                        "message": 'File uploaded!',
                                        "response": `${req.HOST}/${encodeURI(file_url)}`
                                    });
                                });
                            }
                        });
                    }
                });
            });
        }
    });
});

router.get('/loans/get/:id', helperFunctions.verifyJWT, function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let id = req.params.id;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT p.*, c.fullname, c.phone FROM applications p, clients c 
                 WHERE p.userID = ${id} AND p.userID = c.ID AND p.status in (1,2) AND (upper(p.userID) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
                 OR upper(p.ID) LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM applications p 
                 WHERE p.userID = ${id} AND p.status in (1,2) AND (upper(p.userID) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
                 OR upper(p.ID) LIKE "${search_string}%")) as recordsFiltered FROM applications WHERE userID = ${id} AND status in (1,2)`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            res.send({
                "status": 200,
                "error": null,
                "response": {
                    draw: draw,
                    recordsTotal: payload.data[0].recordsTotal,
                    recordsFiltered: payload.data[0].recordsFiltered,
                    data: (response.data === undefined) ? [] : response.data
                }
            });
        });
    });
});

router.get('/loan/get/:id/:application_id', helperFunctions.verifyJWT, function (req, res) {
    let obj = {},
        id = req.params.id,
        application_id = req.params.application_id,
        path = 'files/application-'+application_id+'/',
        query = 'SELECT u.ID userID, u.fullname, u.phone, u.email, u.address, cast(u.loan_officer as unsigned) loan_officer, ' +
            'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.workflowID, a.interest_rate, a.repayment_date, ' +
            'a.reschedule_amount, a.loanCirrusID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.duration, a.client_type, ' +
            '(SELECT l.supervisor FROM users l WHERE l.ID = u.loan_officer) AS supervisor, ' +
            '(SELECT sum(amount) FROM escrow WHERE clientID=u.ID AND status=1) AS escrow, ' +
            'r.payerBankCode, r.payerAccount, r.requestId, r.mandateId, r.remitaTransRef ' +
            'FROM clients AS u INNER JOIN applications AS a ON u.ID = a.userID LEFT JOIN remita_mandates r ' +
            'ON (r.applicationID = a.ID AND r.status = 1) WHERE a.ID = ? AND a.userID = ?',
        query2 = 'SELECT u.ID userID, c.ID contactID, u.name fullname, u.phone, u.email, u.address, cast(c.loan_officer as unsigned) loan_officer, ' +
            'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.workflowID, a.interest_rate, a.repayment_date, ' +
            'a.reschedule_amount, a.loanCirrusID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.duration, a.client_type, ' +
            '(SELECT l.supervisor FROM users l WHERE l.ID = c.loan_officer) AS supervisor, ' +
            '(SELECT sum(amount) FROM escrow WHERE clientID=u.ID AND status=1) AS escrow, ' +
            'r.payerBankCode, r.payerAccount, r.requestId, r.mandateId, r.remitaTransRef ' +
            'FROM corporates AS u INNER JOIN applications AS a ON u.ID = a.userID INNER JOIN clients AS c ON u.clientID=c.ID LEFT JOIN remita_mandates r ' +
            'ON (r.applicationID = a.ID AND r.status = 1) WHERE a.ID = ? AND a.userID = ?';
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query('SELECT client_type FROM applications WHERE ID = ? AND userID = ?', [application_id, id], function (error, app, fields) {
            if (error || !app[0]) {
                res.send({"status": 500, "error": error, "response": null});
            } else {
                if (app[0]['client_type'] === 'corporate')
                    query = query2;
                connection.query(query, [application_id, id], function (error, result, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        result = (result[0])? result[0] : {};
                        if (!fs.existsSync(path)){
                            result.files = {};
                            connection.query('SELECT * FROM application_schedules WHERE applicationID=?', [application_id], function (error, schedule, fields) {
                                if (error) {
                                    res.send({"status": 500, "error": error, "response": null});
                                } else {
                                    result.schedule = schedule;
                                    connection.query('SELECT * FROM schedule_history WHERE applicationID=? AND status=1 ORDER BY ID desc', [application_id], function (error, payment_history, fields) {
                                        connection.release();
                                        if (error) {
                                            res.send({"status": 500, "error": error, "response": null});
                                        } else {
                                            result.payment_history = payment_history;
                                            return res.send({"status": 200, "message": "User applications fetched successfully!", "response": result});
                                        }
                                    });
                                }
                            });
                        } else {
                            fs.readdir(path, function (err, files){
                                async.forEach(files, function (file, callback){
                                    let filename = file.split('.')[0].split('_');
                                    filename.shift();
                                    obj[filename.join('_')] = path+file;
                                    callback();
                                }, function(data){
                                    result.files = obj;
                                    connection.query('SELECT * FROM application_schedules WHERE applicationID=?', [application_id], function (error, schedule, fields) {
                                        if (error) {
                                            res.send({"status": 500, "error": error, "response": null});
                                        } else {
                                            result.schedule = schedule;
                                            connection.query('SELECT * FROM schedule_history WHERE applicationID=? AND status=1 ORDER BY ID desc', [application_id], function (error, payment_history, fields) {
                                                connection.release();
                                                if (error) {
                                                    res.send({"status": 500, "error": error, "response": null});
                                                } else {
                                                    result.payment_history = payment_history;
                                                    return res.send({"status": 200, "message": "User applications fetched successfully!", "response": result});
                                                }
                                            });
                                        }
                                    });
                                });
                            });
                        }
                    }
                });
            }
        });
    });
});

router.post('/application/createV2', function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let postData = req.body,
        query =  'INSERT INTO client_applications Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    postData.status = enums.CLIENT_APPLICATION.STATUS.ACTIVE;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, postData, function (error, results) {
        if(error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        query = `SELECT * from client_applications WHERE ID = (SELECT MAX(ID) from client_applications)`;
        endpoint = `/core-service/get`;
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response_ => {
            res.send({status: 200, error: null, response: response_['data'][0]});
        }, err => {
            res.send({status: 500, error: err, response: null});
        })
            .catch(error => {
                res.send({status: 500, error: error, response: null});
            });
    });
});

router.get('/applications/get', function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let id = req.params.id;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query_status = `(${enums.CLIENT_APPLICATION.STATUS.ACTIVE},${enums.CLIENT_APPLICATION.STATUS.APPROVED},
    ${enums.CLIENT_APPLICATION.STATUS.ACCEPTED},${enums.CLIENT_APPLICATION.STATUS.DECLINED})`;
    let query = `SELECT p.*, c.fullname, c.phone FROM client_applications p, clients c WHERE p.userID = c.ID AND p.status in 
    ${query_status} AND (upper(p.name) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
     OR upper(p.ID) LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM client_applications p WHERE p.status in 
        ${query_status} AND (upper(p.name) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
         OR upper(p.ID) LIKE "${search_string}%")) as recordsFiltered FROM client_applications WHERE status in ${query_status}`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            res.send({
                "status": 200,
                "error": null,
                "response": {
                    draw: draw,
                    recordsTotal: payload.data[0].recordsTotal,
                    recordsFiltered: payload.data[0].recordsFiltered,
                    data: (response.data === undefined) ? [] : response.data
                }
            });
        });
    });
});

router.get('/application/getV2/:application_id', function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`,
        path = `files/client_application-${req.params.application_id}/`;
    let query = `SELECT p.*, c.fullname, c.email, c.phone FROM client_applications p 
                INNER JOIN clients c ON p.userID = c.ID WHERE p.ID = ${req.params.application_id}`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let obj = {},
            result = (response.data === undefined) ? {} : response.data[0];
        if (!result) return res.send({
            "status": 500,
            "error": 'Application does not exist!',
            "response": null
        });
        if (!fs.existsSync(path)) {
            result.files = {};
            res.send(result);
        } else {
            fs.readdir(path, function (err, files){
                async.forEach(files, function (file, callback){
                    let filename = file.split('.')[0].split('_');
                    filename.shift();
                    obj[filename.join('_')] = path+file;
                    callback();
                }, function(data){
                    result.files = obj;
                    res.send({
                        "status": 200,
                        "error": null,
                        "response": result
                    });
                });
            });
        }
    });
});

router.get('/application/complete/:application_id', function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.application_id,
        query =  `UPDATE client_applications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = enums.CLIENT_APPLICATION.STATUS.COMPLETED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, function (error, response) {
        if (error)
            return res.send({status: 500, error: error, response: null});
        return res.send({status: 200, error: null, response: response});
    });
});

router.post('/application/approve/:application_id', function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = req.body,
        id = req.params.application_id,
        query =  `UPDATE client_applications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = enums.CLIENT_APPLICATION.STATUS.APPROVED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, function (error, response) {
        if (error)
            return res.send({status: 500, error: error, response: null});
        return res.send({status: 200, error: null, response: response});
    });
});

router.get('/application/reject/:application_id', function (req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.application_id,
        query =  `UPDATE client_applications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = enums.CLIENT_APPLICATION.STATUS.REJECTED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, function (error, response) {
        if (error)
            return res.send({status: 500, error: error, response: null});
        return res.send({status: 200, error: null, response: response});
    });
});

router.put('/change-password/:id', helperFunctions.verifyJWT, function(req, res) {
    let payload = {},
        query = `UPDATE clients SET ? WHERE ID = ${req.params.id}`;
    payload.password = bcrypt.hashSync(req.body.password, parseInt(process.env.SALT_ROUNDS));
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, payload, function (error, results, fields) {
        if(error) {
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Client password updated!"});
        }
    });
});

router.get('/ownerships', function (req, res) {
    return res.send({
        "status": 200,
        "error": null,
        "response": enums.OWNERSHIP
    });
});

module.exports = router;