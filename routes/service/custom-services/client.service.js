const fs = require('fs'),
    async = require('async'),
    axios = require('./axios'),
    moment = require('moment'),
    db = require('../../../db'),
    bcrypt = require('bcryptjs'),
    express = require('express'),
    router = express.Router(),
    jwt = require('jsonwebtoken'),
    SHA512 = require('js-sha512'),
    enums = require('../../../enums'),
    helperFunctions = require('../../../helper-functions'),
    notificationsService = require('../../notifications-service'),
    paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY),
    emailService = require('../../service/custom-services/email.service'),
    firebaseService = require('../../service/custom-services/firebase.service');

if (!process.env.HOST) process.env.HOST = 'https://x3l.finratus.com';

router.get('/all', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let page = ((req.query.page - 1) * 10 < 0) ? 0 : (req.query.page - 1) * 10;
    let search_string = (req.query.search_string === undefined) ? "" : req.query.search_string.toUpperCase();
    let query = `SELECT ID,fullname FROM clients WHERE status = 1 AND (upper(email) LIKE "%${search_string}%" OR 
    upper(fullname) LIKE "%${search_string}%") ORDER BY ID desc LIMIT ${limit} OFFSET ${page}`;
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

router.post('/mandate/setup', (req, res) => {
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
                            query: `SELECT * FROM remita_mandates WHERE applicationID = ${application_id} AND status = 1`
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

router.get('/mandate/stop/:applicationID', (req, res) => {
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
            query = `UPDATE remita_mandates Set ? WHERE applicationID = ${req.params.applicationID} AND status = 1`;
            endpoint = `/core-service/post?query=${query}`;
            url = `${HOST}${endpoint}`;
            axios.post(url, { status: 0 })
                .then(function (response_) {
                    helperFunctions.stopMandate({
                        mandateId: remita_mandate.mandateId,
                        requestId: remita_mandate.requestId
                    }, function (mandate_response) {
                        if (mandate_response && mandate_response.statuscode === '00') {
                            res.send({ status: 200, error: null, response: mandate_response });
                        } else {
                            res.send({ status: 500, error: mandate_response, response: null });
                        }
                    })
                }, err => {
                    res.send({ status: 500, error: err, response: null });
                })
                .catch(function (error) {
                    res.send({ status: 500, error: error, response: null });
                });
        } else {
            res.send({ status: 500, error: 'There is no remita mandate setup for this application', response: null });
        }
    });
});

router.post('/corporate/create', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let postData = req.body,
        query = `SELECT * FROM clients WHERE name = '${postData.name}'`,
        endpoint = `/core-service/get`,
        url = `${HOST}${endpoint}`;
    if (postData.email) query = query.concat(` OR email = '${postData.email}'`)
    if (postData.phone) query = query.concat(` OR phone = '${postData.phone}'`)
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
            query = 'INSERT INTO clients Set ?';
            endpoint = `/core-service/post?query=${query}`;
            url = `${HOST}${endpoint}`;
            postData.fullname = postData.username;
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

router.get('/corporates/get', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT *, (SELECT fullname FROM clients WHERE ID = p.clientID) client FROM clients p 
        WHERE p.client_type = 'corporate' AND (upper(p.name) LIKE "%${search_string}%" OR upper(p.business_name) LIKE "%${search_string}%" 
        OR upper(p.ID) LIKE "%${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM clients p 
            WHERE p.client_type = 'corporate' AND (upper(p.name) LIKE "%${search_string}%" OR upper(p.business_name) LIKE "%${search_string}%" 
            OR upper(p.ID) LIKE "%${search_string}%")) as recordsFiltered FROM clients WHERE client_type = 'corporate'`;
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

router.get('/corporate/get/:id', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT *, (SELECT fullname FROM clients WHERE ID = p.clientID) client FROM clients 
        WHERE ID = ${req.params.id} AND client_type = 'corporate'`,
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

router.post('/corporate/disable/:id', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `UPDATE clients Set ? WHERE ID = ${req.params.id} AND client_type = 'corporate'`;
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

router.post('/corporate/enable/:id', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `UPDATE clients Set ? WHERE ID = ${req.params.id} AND client_type = 'corporate'`;
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

router.post('/bad_cheque', (req, res) => {
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
                        "error": null,
                        "response": results
                    });
                }
            });
        }
    });
});

router.get('/bad_cheque/:clientID', (req, res) => {
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
                "error": null,
                "response": results
            });
        }
    });
});

router.delete('/bad_cheque/:id', (req, res) => {
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
                                "error": null,
                                "response": results
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/corporates-v2/get', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT ID, name, email, status, date_created from clients WHERE status = 1 AND client_type = 'corporate' ORDER BY name asc`,
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
router.post('/create', (req, res) => {
    let id;
    let postData = req.body,
        query = 'INSERT INTO clients Set ?',
        query2 = 'select * from clients where username = ? or email = ? or phone = ?';
    postData.status = enums.CLIENT.STATUS.ACTIVE;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    if (!postData.username || !postData.password || !postData.first_name || !postData.last_name
        || !postData.phone || !postData.email || !postData.loan_officer || !postData.branch)
        return res.send({ "status": 500, "error": "Required parameter(s) not sent!", "response": null });

    postData.fullname = `${postData.first_name} ${(postData.middle_name || '')} ${postData.last_name}`;
    postData.password = bcrypt.hashSync(postData.password, parseInt(process.env.SALT_ROUNDS));
    postData.images_folder = postData.email;
    postData.password_reset_status = enums.PASSWORD_RESET.STATUS.TRUE;
    db.getConnection(function (err, connection) {
        if (err) throw err;
        connection.query(query2, [postData.username, postData.email, postData.phone], function (error, results) {
            if (results && results[0]) {
                let duplicates = [];
                if (postData.email == results[0]['email']) duplicates.push('email');
                if (postData.phone == results[0]['phone']) duplicates.push('phone');
                return res.send({ "status": 500, "error": `The ${duplicates[0] || postData.username} is already in use by another user!`, "response": null });
            }
            let bvn = postData.bvn;
            delete postData.bvn;
            if (bvn && bvn.trim() !== '') {
                connection.query('select * from clients where bvn = ? and status = 1 limit 1', [bvn], function (error, rest) {
                    if (rest && rest[0]) {
                        return res.send({ "status": 500, "error": "BVN already exists!", "response": null });
                    }
                    helperFunctions.resolveBVN(bvn, bvn_response => {
                        if (bvn_response.status && helperFunctions.phoneMatch(postData.phone, bvn_response.data.mobile)) {
                            postData.first_name = bvn_response.data.first_name;
                            postData.last_name = bvn_response.data.last_name;
                            postData.dob = bvn_response.data.formatted_dob;
                            postData.phone = bvn_response.data.mobile;
                            postData.bvn = bvn_response.data.bvn;
                            postData.fullname = `${postData.first_name} ${(postData.middle_name || '')} ${postData.last_name}`;
                        }
                        connection.query(query, postData, function (error, re) {
                            if (error) {
                                res.send({ "status": 500, "error": JSON.stringify(error), "response": null });
                            } else {
                                connection.query('SELECT * from clients where ID = (SELECT MAX(ID) FROM clients)', function (err, re) {
                                    if (!err) {
                                        id = re[0]['ID'];
                                        connection.query('INSERT into wallets Set ?', { client_id: id }, function (er, r) {
                                            connection.release();
                                            if (!er) {
                                                let payload = {};
                                                payload.category = 'Clients';
                                                payload.userid = req.cookies.timeout;
                                                payload.description = 'New Client Created';
                                                payload.affected = id;
                                                notificationsService.log(req, payload);
                                                emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
                                                    to: postData.email,
                                                    subject: 'Signup Successful!',
                                                    template: 'myx3-client',
                                                    context: postData
                                                });
                                                let user = re[0];
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
                                                res.send({
                                                    "status": 200,
                                                    "error": null,
                                                    "response": [user]
                                                });
                                            } else {
                                                res.send({ "status": 500, "error": "Error creating client wallet!", "response": null });
                                            }
                                        });
                                    } else {
                                        res.send({ "status": 500, "error": "Error retrieving client details. Please try a new username!", "response": null });
                                    }
                                });
                            }
                        });
                    });
                });
            } else {
                connection.query(query, postData, function (error, re) {
                    if (error) {
                        res.send({ "status": 500, "error": JSON.stringify(error), "response": null });
                    } else {
                        connection.query('SELECT * from clients where ID = (SELECT MAX(ID) FROM clients)', function (err, re) {
                            if (!err) {
                                id = re[0]['ID'];
                                connection.query('INSERT into wallets Set ?', { client_id: id }, function (er, r) {
                                    connection.release();
                                    if (!er) {
                                        let payload = {};
                                        payload.category = 'Clients';
                                        payload.userid = req.cookies.timeout;
                                        payload.description = 'New Client Created';
                                        payload.affected = id;
                                        notificationsService.log(req, payload);
                                        emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
                                            to: postData.email,
                                            subject: 'Signup Successful!',
                                            template: 'myx3-client',
                                            context: postData
                                        });
                                        let user = re[0];
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
                                        res.send({
                                            "status": 200,
                                            "error": null,
                                            "response": [user]
                                        });
                                    } else {
                                        res.send({ "status": 500, "error": JSON.stringify(er), "response": "Error creating client wallet!" });
                                    }
                                });
                            } else {
                                res.send({ "status": 500, "error": JSON.stringify(err), "response": "Error retrieving client details. Please try a new username!" });
                            }
                        });
                    }
                });
            }
        });
    });
});

router.post('/login', (req, res) => {
    let username = req.body.username,
        password = req.body.password;
    if (!username || !password) return res.status(500).send('Required parameter(s) not sent!');

    db.query(`SELECT * FROM clients WHERE username = '${username}' OR email = '${username}' OR phone = '${username}'`, (err, client) => {
        if (err)
            return res.send({
                "status": 500,
                "error": "Connection Error!",
                "response": null
            });

        if (!client || !client[0])
            return res.send({
                "status": 500,
                "error": "Sorry, we can't find this information in our record, please check again or create an account if you are a new user.",
                "response": null
            });

        let user = client[0];
        if (user.status === 0)
            return res.send({
                "status": 500,
                "error": "Your Account Has Been Disabled, Please Contact The Admin",
                "response": null
            });

        if (user.password_reset_status === enums.PASSWORD_RESET.STATUS.FALSE && password.toLowerCase() === 'password')
            return res.send({
                "status": 400,
                "error": `Password has expired! A reset password email will be sent to ${user.email}`,
                "response": null
            });

        if (!user.password)
            return res.send({
                "status": 500,
                "error": "Incorrect Username/Password!",
                "response": null
            });

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
                "error": "Password is incorrect!",
                "response": null
            });
        }
    });
});

router.put('/update/:id', helperFunctions.verifyJWT, (req, res) => {
    let postData = req.body;
    let bvn = postData.bvn;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query;
    let bvn_reset_query = 'SELECT 0';
    let phone_reset_query = 'SELECT 0';
    let bvn_reset_query2 = 'SELECT 0';
    let phone_reset_query2 = 'SELECT 0';
    let payload = {};
    payload.category = 'Clients';
    payload.userid = req.cookies.timeout;
    payload.description = 'Client details updated.';
    payload.affected = req.params.id;

    db.query(`SELECT * FROM clients WHERE ID = ${req.params.id}`, (error, client) => {
        if (client[0]['ID']) delete postData.ID;
        if (client[0]['bvn']) delete postData.bvn;
        if (client[0]['email']) delete postData.email;
        if (client[0]['username']) delete postData.username;
        if (client[0]['password']) delete postData.password;

        if (bvn) {
            query = `SELECT * FROM clients WHERE bvn = ${bvn} AND verify_bvn = 1`;
            db.query(query, (error, bvn_check) => {
                if (error) return res.send({
                    "status": 500,
                    "error": error,
                    "response": null
                });

                if (bvn_check[0]) {
                    if (bvn_check[0]['ID'] == req.params.id) {
                        return res.send({
                            "status": 500,
                            "error": 'You have already verified this BVN!',
                            "response": null
                        });
                    } else {
                        return res.send({
                            "status": 500,
                            "error": 'This BVN is already in use by another user!',
                            "response": null
                        });
                    }
                }

                helperFunctions.resolveBVN(bvn, bvn_response => {
                    if (error) return res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });

                    if (!client[0]) return res.send({
                        "status": 500,
                        "error": 'User does not exist!',
                        "response": null
                    });

                    if (bvn_response.status) {
                        postData.first_name = bvn_response.data.first_name;
                        postData.last_name = bvn_response.data.last_name;
                        postData.dob = bvn_response.data.formatted_dob;
                        if (postData.bvn_otp && postData.bvn_otp === client[0]['bvn_otp']) {
                            postData.bvn = bvn_response.data.bvn;
                            postData.phone = bvn_response.data.mobile;
                            postData.verify_bvn = enums.VERIFY_BVN.STATUS.TRUE;
                            postData.bvn_input = postData.bvn;
                            postData.bvn_phone = postData.phone;
                            bvn_reset_query = `UPDATE clients SET bvn = NULL WHERE bvn = ${postData.bvn}`;
                            phone_reset_query = `UPDATE clients SET phone = NULL WHERE phone = ${postData.phone}`;
                            bvn_reset_query2 = `UPDATE clients SET bvn_input = NULL WHERE bvn_input = ${postData.bvn}`;
                            phone_reset_query2 = `UPDATE clients SET bvn_phone = NULL WHERE bvn_phone = ${postData.phone}`;
                        }
                        postData.fullname = `${postData.first_name} ${(postData.middle_name || '')} ${postData.last_name}`;
                        db.query(bvn_reset_query, () => {
                            db.query(phone_reset_query, () => {
                                db.query(bvn_reset_query2, () => {
                                    db.query(phone_reset_query2, () => {
                                        query = `UPDATE clients SET ? WHERE ID = ${req.params.id}`;
                                        db.query(query, postData, error => {
                                            if (error) return res.send({
                                                "status": 500,
                                                "error": error,
                                                "response": null
                                            });
                                            if (!postData.bvn_otp)
                                                return sendBVNOTP(client[0], bvn, bvn_response.data.mobile, res);
                                            if (postData.bvn_otp !== client[0]['bvn_otp'])
                                                return res.send({
                                                    "status": 500,
                                                    "error": 'OTP is incorrect!',
                                                    "response": null
                                                });
                                            notificationsService.log(req, payload);
                                            res.send({
                                                "status": 200,
                                                "error": null,
                                                "response": "Client Details Updated"
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    } else {
                        return res.send({
                            "status": 500,
                            "error": bvn_response.message || 'Error resolving BVN!',
                            "response": null
                        });
                    }
                });
            });
        } else {
            query = `UPDATE clients SET ? WHERE ID = ${req.params.id}`;
            db.query(query, postData, error => {
                if (error)
                    return res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });

                notificationsService.log(req, payload);
                res.send({
                    "status": 200,
                    "error": null,
                    "response": "Client Details Updated"
                });
            });
        }
    });
});

sendBVNOTP = (client, bvn, phone, res) => {
    if (!phone)
        return res.send({
            "status": 500,
            "error": 'There is no phone number linked to this BVN',
            "response": null
        });

    let otp = helperFunctions.generateOTP();
    let payload = {
        bvn_otp: otp,
        bvn_input: bvn,
        bvn_phone: phone,
        verify_bvn: enums.VERIFY_BVN.STATUS.FALSE,
        date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
    };
    let sms = {
        phone: helperFunctions.formatToNigerianPhone(phone),
        message: `To confirm your BVN on My X3, use this OTP ${otp}`
    }
    helperFunctions.sendSMS(sms, data => {
        if (data.response.status === 'SUCCESS') {
            db.query(`UPDATE clients SET ? WHERE ID = ${client.ID}`, payload, (error, response) => {
                if (error)
                    return res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });

                res.send({
                    "status": 200,
                    "error": null,
                    "response": `An OTP has been sent to ${phone}. Kindly check and input it.`
                });
            });
        } else {
            return res.send({
                "status": 500,
                "error": 'Error validating BVN!',
                "response": null
            });
        }
    });
}

router.get('/enable/:id', helperFunctions.verifyJWT, (req, res) => {
    let postData = req.body;
    postData.status = enums.CLIENT.STATUS.ACTIVE;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `Update clients SET ? where ID = ${req.params.id}`;
    db.query(query, postData, function (error, results) {
        if (error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
            to: req.user.email,
            subject: 'Account Enabled',
            template: 'myx3-default',
            context: {
                name: req.user.fullname,
                message: 'Your account has been enabled successfully!'
            }
        });
        res.send({
            "status": 200,
            "error": null,
            "response": "Client Reactivated!"
        });
    });
});

router.delete('/disable/:id', helperFunctions.verifyJWT, (req, res) => {
    let postData = req.body;
    postData.status = enums.CLIENT.STATUS.INACTIVE;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `Update clients SET ? where ID = ${req.params.id}`;
    db.query(query, postData, function (error, results) {
        if (error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
            to: req.user.email,
            subject: 'Account Disabled',
            template: 'myx3-default',
            context: {
                name: req.user.fullname,
                message: 'Your account has been disabled successfully!'
            }
        });
        res.send({
            "status": 200,
            "error": null,
            "response": "Client Disabled!"
        });
    });
});

router.get('/get/:id', (req, res) => {
    let query = `SELECT *, (select fullname from users u where u.ID = clients.loan_officer) loan_officer,
        (select branch_name from branches b where b.ID = clients.branch) branch, 
        (select count(*) from applications where userID = clients.ID and status = 2) total_active_loan_count, 
        (select sum(loan_amount) from applications where userID = clients.ID and status = 2) total_active_loan_sum, 
        ((select sum(loan_amount) from applications where userID = clients.ID and status = 2) - 
        (select coalesce(sum(payment_amount), 0) from schedule_history where applicationID in 
            (select id from applications where userid = clients.ID and status = 2) and status = 1)) total_active_loan_balance
        FROM clients WHERE ID = ${req.params.id}`;
    db.query(query, async (error, response) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        let obj = {},
            result = response[0];
        if (!result) return res.send({
            "status": 500,
            "error": 'User does not exist!',
            "response": null
        });

        const myxalary = await helperFunctions.getMyXalaryClient(result.ID);
        if (myxalary) result.myxalary = myxalary;

        const path = `files/users/${result.images_folder}/`;
        if (!fs.existsSync(path)) {
            result.files = {};
            return res.send({
                "status": 200,
                "error": null,
                "response": result
            });
        } else {
            fs.readdir(path, function (err, files) {
                files = helperFunctions.removeFileDuplicates(path, files);
                async.forEach(files, function (file, callback) {
                    let filename = file.split('.')[helperFunctions.getClientFilenameIndex(path, file)].split('_');
                    filename.shift();
                    obj[filename.join('_')] = `${process.env.HOST || req.HOST}/${path}${file}`;
                    callback();
                }, function (data) {
                    result.files = obj;
                    return res.send({
                        "status": 200,
                        "error": null,
                        "response": result
                    });
                });
            });
        }
    });
});

router.get('/products', helperFunctions.verifyJWT, (req, res) => {
    let query = 'SELECT w.*, (SELECT GROUP_CONCAT(NULLIF(s.document,"")) FROM workflow_stages s WHERE w.ID = s.workflowID) document ' +
        'FROM workflows w WHERE w.status <> 0 AND w.enable_client_product = 1 ORDER BY w.ID desc';
    db.query(query, function (error, results) {
        if (error)
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
router.post('/upload/:id/:item', helperFunctions.verifyJWT, (req, res) => {
    if (!req.files) return res.status(500).send('No file was found!');
    if (!req.params.id || !req.params.item) return res.status(500).send('Required parameter(s) not sent!');

    db.query(`SELECT * FROM clients WHERE ID = ${req.params.id}`, function (error, client) {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        if (!client[0]) return res.send({
            "status": 500,
            "error": 'User does not exist!',
            "response": null
        });

        let user = client[0],
            item = req.params.item,
            sampleFile = req.files.file,
            extArray = sampleFile.name.split("."),
            extension = extArray[extArray.length - 1],
            folder = user.images_folder || `${user.fullname}_${user.email}`;
        if (extension) extension = extension.toLowerCase();
        const folder_url = `files/users/${folder}/`;
        switch (item) {
            case '1': {
                item = "Image";
                break;
            }
            case '2': {
                item = "Signature";
                break;
            }
            case '3': {
                item = "ID Card";
                break;
            }
        }
        const file_url = `${folder_url}${folder}_${item}.${extension}`;
        fs.stat(folder_url, function (err) {
            if (err && err.code === 'ENOENT') {
                fs.mkdirSync(`files/users/${folder}/`);
            }
        });

        fs.stat(file_url, function (err) {
            if (err) {
                sampleFile.mv(file_url, function (err) {
                    if (err) return res.send({
                        "status": 500,
                        "error": err,
                        "response": null
                    });
                    res.send({
                        "status": 200,
                        "error": null,
                        "response": `${process.env.HOST || req.HOST}/${encodeURI(file_url)}`
                    });
                });
            } else {
                fs.unlink(file_url, function (err) {
                    if (err) return res.send({
                        "status": 500,
                        "error": err,
                        "response": null
                    });

                    sampleFile.mv(file_url, function (err) {
                        if (err) return res.send({
                            "status": 500,
                            "error": err,
                            "response": null
                        });

                        res.send({
                            "status": 200,
                            "error": null,
                            "response": `${process.env.HOST || req.HOST}/${encodeURI(file_url)}`
                        });
                    });
                });
            }
        });
    });
});

router.post('/application/create/:id', helperFunctions.verifyJWT, (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let postData = req.body,
        query = 'INSERT INTO preapplications Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    postData.userID = req.user.ID;
    postData.name = req.user.fullname;
    postData.rate = 120;
    postData.created_by = req.user.ID;
    postData.status = enums.CLIENT_APPLICATION.STATUS.ACTIVE;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    postData.creator_type = 'client';

    db.query(query, postData, function (error, results) {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        query = `SELECT * from preapplications WHERE ID = (SELECT MAX(ID) from preapplications)`;
        endpoint = `/core-service/get`;
        url = `${HOST}${endpoint}`;
        
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response_ => {
            const options = {
                to: req.user.email,
                subject: 'Loan Request',
                template: 'myx3-default',
                context: {
                    name: req.user.fullname,
                    message: `Your loan request of ₦${helperFunctions.numberToCurrencyFormatter(postData.loan_amount)} has been received successfully!. Please note that we typically respond in less than one (1) minute. Check back by logging into your profile for update.`
                }
            }
            emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, options);
            firebaseService.send(options);
            res.send({ status: 200, error: null, response: response_['data'][0] });
        }, err => {
            console.log('err',err)
            res.send({ status: 500, error: err, response: null });
        })
            .catch(error => {
                console.log('error',error)
                res.send({ status: 500, error: error, response: null });
            });
    });
});

router.get('/applications/get/:id', helperFunctions.verifyJWT, (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let id = req.params.id;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT p.*, c.fullname, c.phone, a.ID loanID, a.status loan_status, a.close_status, 
        (CASE
            WHEN s.payment_collect_date > CURDATE() AND s.interest_collect_date > CURDATE() THEN 1
            WHEN s.payment_collect_date = CURDATE() OR s.interest_collect_date = CURDATE() THEN 2
            WHEN s.payment_collect_date < CURDATE() OR s.interest_collect_date < CURDATE() THEN 3
        END) payment_status,
        (CASE 
            WHEN (SELECT COUNT(*) FROM application_information_requests WHERE a.ID = applicationID) > 0 THEN 1
            ELSE 0
        END) information_request_status,
        (SELECT COALESCE(SUM(amount), 0) FROM disbursement_history WHERE loan_id = a.ID) disbursement_amount
        FROM clients c, preapplications p LEFT JOIN applications a ON p.ID = a.preapplicationID AND a.userID = ${id} 
        LEFT JOIN application_schedules s ON s.ID = (SELECT MIN(ID) FROM application_schedules WHERE a.ID = applicationID AND payment_status = 0)
        WHERE p.userID = ${id} AND p.userID = c.ID AND (upper(p.name) LIKE "%${search_string}%" OR upper(p.loan_amount) 
        LIKE "%${search_string}%" OR upper(p.ID) LIKE "%${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM preapplications p 
                 WHERE p.userID = ${id} AND (upper(p.name) LIKE "%${search_string}%" OR upper(p.loan_amount) LIKE "%${search_string}%" 
                 OR upper(p.ID) LIKE "%${search_string}%")) as recordsFiltered FROM preapplications WHERE userID = ${id}`;
        endpoint = '/core-service/get';
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(payload => {
            let applications_ = [],
                applications = (response.data === undefined) ? [] : response.data;
            async.forEach(applications, (application, callback) => {
                application.document_upload_status = 0;
                let folder_path_1 = `files/application-${application.loanID}`,
                    folder_path_2 = `files/client_application-${application.ID}`;
                if (application.loanID && fs.existsSync(folder_path_1))
                    application.document_upload_status = 1;
                if (fs.existsSync(folder_path_2))
                    application.document_upload_status = 1;
                applications_.push(application);
                callback();
            }, (data) => {
                res.send({
                    "status": 200,
                    "error": null,
                    "response": {
                        draw: draw,
                        recordsTotal: payload.data[0].recordsTotal,
                        recordsFiltered: payload.data[0].recordsFiltered,
                        data: applications_
                    }
                });
            });
        });
    });
});

router.get('/application/get/:id/:application_id', helperFunctions.verifyJWT, (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT p.*, c.fullname, c.email, c.phone FROM preapplications p 
                INNER JOIN clients c ON p.userID = c.ID WHERE p.ID = ${req.params.application_id} AND p.userID = ${req.params.id}`,
        query2 = `SELECT u.ID userID, u.fullname, u.phone, u.email, u.address, cast(u.loan_officer as unsigned) loan_officer,
            a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.workflowID, a.interest_rate, a.repayment_date,
            a.reschedule_amount, a.loanCirrusID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.duration, a.client_type,
            (SELECT l.supervisor FROM users l WHERE l.ID = u.loan_officer) AS supervisor,
            (SELECT sum(amount) FROM escrow WHERE clientID=u.ID AND status=1) AS escrow,
            r.payerBankCode, r.payerAccount, r.requestId, r.mandateId, r.remitaTransRef,
            (CASE
                WHEN s.payment_collect_date > CURDATE() AND s.interest_collect_date > CURDATE() THEN 1
                WHEN s.payment_collect_date = CURDATE() OR s.interest_collect_date = CURDATE() THEN 2
                WHEN s.payment_collect_date < CURDATE() OR s.interest_collect_date < CURDATE() THEN 3
            END) payment_status
            FROM clients AS u INNER JOIN applications AS a ON u.ID = a.userID LEFT JOIN remita_mandates r 
            ON (r.applicationID = a.ID AND r.status = 1) LEFT JOIN application_schedules s ON s.ID = 
            (SELECT MIN(ID) FROM application_schedules WHERE a.ID = applicationID AND payment_status = 0)
            WHERE a.preapplicationID = ${req.params.application_id} AND a.userID = ${req.params.id}`,
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
            if (result2) {
                result.loanID = result2.ID;
                result.loan_status = result2.status;
                delete result2.ID;
                delete result2.status;
            }
            result = Object.assign({}, result, result2);
            db.query('SELECT * FROM application_schedules WHERE applicationID=?', [result.loanID], function (error, schedule, fields) {
                if (error) {
                    res.send({ "status": 500, "error": error, "response": null });
                } else {
                    result.schedule = schedule;
                    db.query('SELECT * FROM schedule_history WHERE applicationID=? ORDER BY ID desc',
                        [result.loanID], function (error, payment_history, fields) {
                            if (error) {
                                res.send({ "status": 500, "error": error, "response": null });
                            } else {
                                result.payment_history = payment_history;
                                db.query('SELECT * FROM application_information_requests WHERE applicationID=? ORDER BY ID desc',
                                    [result.loanID], function (error, information_requests, fields) {
                                        if (error) {
                                            res.send({ "status": 500, "error": error, "response": null });
                                        } else {
                                            result.information_requests = information_requests;
                                            result.information_request_status = (information_requests.length > 0) ? 1 : 0;
                                            result.document_upload_status = 0;
                                            let path = `files/client_application-${result.ID}/`,
                                                path2 = `files/application-${result.loanID}/`,
                                                path3 = `files/application_download-${result.loanID}/`,
                                                path4 = `files/workflow_download-${result.workflowID}/`;
                                            if (result.loanID && fs.existsSync(path2))
                                                result.document_upload_status = 1;
                                            if (fs.existsSync(path))
                                                result.document_upload_status = 1;
                                            result.files = {};
                                            result.files_info = {};
                                            result.file_downloads = {};
                                            fs.readdir(path, function (err, files) {
                                                if (err) files = [];
                                                result.files_info = Object.assign({}, result.files_info, helperFunctions.getFilesInformation(path, files));
                                                files = helperFunctions.removeFileDuplicates(path, files);
                                                async.forEach(files, function (file, callback) {
                                                    let filename = file.split('.')[0].split('_');
                                                    filename.shift();
                                                    obj[filename.join('_')] = `${process.env.HOST || req.HOST}/${path}${file}`;
                                                    callback();
                                                }, function (data) {
                                                    result.files = Object.assign({}, result.files, obj);
                                                    obj = {};
                                                    fs.readdir(path2, function (err, files) {
                                                        if (err) files = [];
                                                        files = helperFunctions.removeFileDuplicates(path2, files);
                                                        result.files_info = Object.assign({}, result.files_info, helperFunctions.getFilesInformation(path2, files));
                                                        async.forEach(files, function (file, callback) {
                                                            let filename = file.split('.')[0].split('_');
                                                            filename.shift();
                                                            obj[filename.join('_')] = `${process.env.HOST || req.HOST}/${path2}${file}`;
                                                            callback();
                                                        }, function (data) {
                                                            result.files = Object.assign({}, result.files, obj);
                                                            obj = {};
                                                            fs.readdir(path3, function (err, files) {
                                                                if (err) files = [];
                                                                files = helperFunctions.removeFileDuplicates(path3, files);
                                                                async.forEach(files, function (file, callback) {
                                                                    let filename = file.split('.')[0].split('_');
                                                                    filename.shift();
                                                                    obj[filename.join('_')] = `${process.env.HOST || req.HOST}/${path3}${file}`;
                                                                    callback();
                                                                }, function (data) {
                                                                    result.file_downloads = Object.assign({}, result.file_downloads, obj);
                                                                    obj = {};
                                                                    fs.readdir(path4, function (err, files) {
                                                                        if (err) files = [];
                                                                        files = helperFunctions.removeFileDuplicates(path4, files);
                                                                        async.forEach(files, function (file, callback) {
                                                                            let filename = file.split('.')[0].split('_');
                                                                            filename.shift();
                                                                            obj[filename.join('_')] = `${process.env.HOST || req.HOST}/${path4}${file}`;
                                                                            callback();
                                                                        }, function (data) {
                                                                            result.file_downloads = Object.assign({}, result.file_downloads, obj);
                                                                            return res.send({
                                                                                "status": 200,
                                                                                "error": null,
                                                                                "response": result
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        }
                                    });
                            }
                        });
                }
            });
        });
    });
});

router.get('/application/accept/:id/:application_id', helperFunctions.verifyJWT, (req, res) => {
    let payload = {},
        id = req.params.id,
        application_id = req.params.application_id,
        query = `UPDATE preapplications Set ? WHERE ID = ${application_id} AND userID = ${id}`;
    payload.status = enums.CLIENT_APPLICATION.STATUS.ACCEPTED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(`SELECT * FROM preapplications WHERE ID = ${application_id} AND userID = ${id}`, function (err, application) {
        if (err) return res.send({
            "status": 500,
            "error": err,
            "response": null
        });

        if (!application[0]) return res.send({
            "status": 500,
            "error": 'Application does not exist!',
            "response": null
        });

        if (application[0]['status'] !== enums.CLIENT_APPLICATION.STATUS.COMPLETED)
            return res.send({
                "status": 500,
                "error": null,
                "response": 'Application needs to be approved!'
            });

        db.query(query, payload, function (error, response) {
            if (error)
                return res.send({ status: 500, error: error, response: null });
            const options = {
                to: req.user.email,
                subject: 'Loan Offer Accepted',
                template: 'myx3-default',
                context: {
                    name: req.user.fullname,
                    message: 'Your loan offer acceptance was successful!'
                }
            }
            emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, options);
            firebaseService.send(options);
            return res.send({ status: 200, error: null, response: 'Loan offer accepted successfully!' });
        });
    });
});

router.get('/application/decline/:id/:application_id', helperFunctions.verifyJWT, (req, res) => {
    let payload = {},
        id = req.params.id,
        application_id = req.params.application_id,
        query = `UPDATE preapplications Set ? WHERE ID = ${application_id} AND userID = ${id}`;
    payload.status = enums.CLIENT_APPLICATION.STATUS.DECLINED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(`SELECT * FROM preapplications WHERE ID = ${application_id} AND userID = ${id}`, function (err, application) {
        if (err) return res.send({
            "status": 500,
            "error": err,
            "response": null
        });

        if (!application[0]) return res.send({
            "status": 500,
            "error": 'Application does not exist!',
            "response": null
        });

        if (application[0]['status'] !== enums.CLIENT_APPLICATION.STATUS.COMPLETED)
            return res.send({
                "status": 500,
                "error": null,
                "response": 'Application needs to be approved!'
            });

        db.query(query, payload, function (error, response) {
            if (error)
                return res.send({ status: 500, error: error, response: null });
            emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
                to: req.user.email,
                subject: 'Loan Offer Declined',
                template: 'myx3-default',
                context: {
                    name: req.user.fullname,
                    message: 'Your loan offer rejection was successful!'
                }
            });
            return res.send({ status: 200, error: null, response: 'Loan offer declined successfully!' });
        });
    });
});

router.post('/application/upload/:id/:application_id/:name', helperFunctions.verifyJWT, (req, res) => {
    let id = req.params.id,
        name = req.params.name,
        sampleFile = req.files.file,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1],
        application_id = req.params.application_id,
        query = `SELECT * FROM preapplications WHERE ID = ${application_id} AND userID = ${id}`,
        endpoint = '/core-service/get',
        url = `${process.env.HOST || req.HOST}${endpoint}`;
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
            fs.stat(file_folder, function (err) {
                if (err && (err.code === 'ENOENT'))
                    fs.mkdirSync(file_folder);

                const file_url = `${file_folder}${application_id}_${name.trim().replace(/ /g, '_')}.${extension}`;
                fs.stat(file_url, function (err) {
                    if (err) {
                        sampleFile.mv(file_url, function (err) {
                            if (err) return res.status(500).send(err);
                            res.send({
                                "status": 200,
                                "error": null,
                                "response": `${process.env.HOST || req.HOST}/${encodeURI(file_url)}`
                            });
                        });
                    } else {
                        fs.unlink(file_url, function (err) {
                            if (err) {
                                return console.log(err);
                            } else {
                                sampleFile.mv(file_url, function (err) {
                                    if (err)
                                        return res.status(500).send(err);
                                    res.send({
                                        "status": 200,
                                        "error": null,
                                        "response": `${process.env.HOST || req.HOST}/${encodeURI(file_url)}`
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

router.get('/loans/get/:id', helperFunctions.verifyJWT, (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let id = req.params.id;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT p.*, c.fullname, c.phone FROM applications p, clients c 
                 WHERE p.userID = ${id} AND p.userID = c.ID AND p.status in (1,2) AND (upper(p.userID) 
                 LIKE "%${search_string}%" OR upper(p.loan_amount) LIKE "%${search_string}%" 
                 OR upper(p.ID) LIKE "%${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM applications p 
                 WHERE p.userID = ${id} AND p.status in (1,2) AND (upper(p.userID) LIKE "%${search_string}%" 
                 OR upper(p.loan_amount) LIKE "%${search_string}%" 
                 OR upper(p.ID) LIKE "%${search_string}%")) as recordsFiltered FROM applications 
                 WHERE userID = ${id} AND status in (1,2)`;
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

router.get('/loan/get/:id/:application_id', helperFunctions.verifyJWT, (req, res) => {
    let obj = {},
        id = req.params.id,
        application_id = req.params.application_id,
        path = `files/application-${application_id}/`,
        query = 'SELECT u.ID userID, u.fullname, u.phone, u.email, u.address, cast(u.loan_officer as unsigned) loan_officer, ' +
            'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.workflowID, a.interest_rate, a.repayment_date, ' +
            'a.reschedule_amount, a.loanCirrusID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.duration, a.client_type, ' +
            '(SELECT l.supervisor FROM users l WHERE l.ID = u.loan_officer) AS supervisor, ' +
            '(SELECT sum(amount) FROM escrow WHERE clientID=u.ID AND status=1) AS escrow, ' +
            'r.payerBankCode, r.payerAccount, r.requestId, r.mandateId, r.remitaTransRef ' +
            'FROM clients AS u INNER JOIN applications AS a ON u.ID = a.userID LEFT JOIN remita_mandates r ' +
            'ON (r.applicationID = a.ID AND r.status = 1) WHERE a.ID = ? AND a.userID = ?';
    db.getConnection(function (err, connection) {
        if (err) throw err;

        connection.query(query, [application_id, id], function (error, result, fields) {
            if (error) {
                res.send({ "status": 500, "error": error, "response": null });
            } else {
                result = (result[0]) ? result[0] : {};
                if (!fs.existsSync(path)) {
                    result.files = {};
                    connection.query('SELECT * FROM application_schedules WHERE applicationID=?', [application_id], function (error, schedule, fields) {
                        if (error) {
                            res.send({ "status": 500, "error": error, "response": null });
                        } else {
                            result.schedule = schedule;
                            connection.query('SELECT * FROM schedule_history WHERE applicationID=? AND status=1 ORDER BY ID desc',
                                [application_id], function (error, payment_history, fields) {
                                    connection.release();
                                    if (error) {
                                        res.send({ "status": 500, "error": error, "response": null });
                                    } else {
                                        result.payment_history = payment_history;
                                        return res.send({ "status": 200, "error": null, "response": result });
                                    }
                                });
                        }
                    });
                } else {
                    fs.readdir(path, function (err, files) {
                        files = helperFunctions.removeFileDuplicates(path, files);
                        async.forEach(files, function (file, callback) {
                            let filename = file.split('.')[0].split('_');
                            filename.shift();
                            obj[filename.join('_')] = `${process.env.HOST || req.HOST}/${path}${file}`;
                            callback();
                        }, function (data) {
                            result.files = obj;
                            connection.query('SELECT * FROM application_schedules WHERE applicationID=?', [application_id], function (error, schedule, fields) {
                                if (error) {
                                    res.send({ "status": 500, "error": error, "response": null });
                                } else {
                                    result.schedule = schedule;
                                    connection.query('SELECT * FROM schedule_history WHERE applicationID=? AND status=1 ORDER BY ID desc',
                                        [application_id], function (error, payment_history, fields) {
                                            connection.release();
                                            if (error) {
                                                res.send({ "status": 500, "error": error, "response": null });
                                            } else {
                                                result.payment_history = payment_history;
                                                return res.send({ "status": 200, "error": null, "response": result });
                                            }
                                        });
                                }
                            });
                        });
                    });
                }
            }
        });
    });
});

router.post('/application/createV2', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let postData = req.body,
        query = 'INSERT INTO preapplications Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    postData.status = enums.CLIENT_APPLICATION.STATUS.ACTIVE;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, postData, function (error, results) {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        query = `SELECT * from preapplications WHERE ID = (SELECT MAX(ID) from preapplications)`;
        endpoint = `/core-service/get`;
        url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response_ => {
            res.send({ status: 200, error: null, response: response_['data'][0] });
        }, err => {
            res.send({ status: 500, error: err, response: null });
        })
            .catch(error => {
                res.send({ status: 500, error: error, response: null });
            });
    });
});

router.get('/applications/get', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query_status = `(${enums.CLIENT_APPLICATION.STATUS.REJECTED},${enums.CLIENT_APPLICATION.STATUS.ACTIVE},${enums.CLIENT_APPLICATION.STATUS.APPROVED})`;
    let query = `SELECT p.*, c.fullname, c.phone FROM preapplications p, clients c WHERE p.userID = c.ID AND p.status in 
     ${query_status} AND p.ID NOT IN (SELECT a.preapplicationID FROM applications a WHERE p.ID = a.preapplicationID) AND p.creator_type = "client"
     AND (upper(p.name) LIKE "%${search_string}%" OR upper(p.loan_amount) LIKE "%${search_string}%" 
     OR upper(p.ID) LIKE "%${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM preapplications p WHERE p.status in 
         ${query_status} AND p.ID NOT IN (SELECT a.preapplicationID FROM applications a WHERE p.ID = a.preapplicationID)  AND p.creator_type = "client"
         AND (upper(p.name) LIKE "%${search_string}%" OR upper(p.loan_amount) LIKE "%${search_string}%" 
         OR upper(p.ID) LIKE "%${search_string}%")) as recordsFiltered FROM preapplications p WHERE p.status in ${query_status} 
         AND p.ID NOT IN (SELECT a.preapplicationID FROM applications a WHERE p.ID = a.preapplicationID) AND p.creator_type = "client"`;
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

router.get('/application/getV2/:application_id', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`,
        path = `files/client_application-${req.params.application_id}/`;
    let query = `SELECT p.*, c.fullname, c.email, c.phone FROM preapplications p 
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
            res.send({
                "status": 200,
                "error": null,
                "response": result
            });
        } else {
            fs.readdir(path, function (err, files) {
                files = helperFunctions.removeFileDuplicates(path, files);
                async.forEach(files, function (file, callback) {
                    let filename = file.split('.')[0].split('_');
                    filename.shift();
                    obj[filename.join('_')] = path + file;
                    callback();
                }, function (data) {
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

router.post('/application/complete/:application_id', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.application_id,
        query = `UPDATE preapplications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = enums.CLIENT_APPLICATION.STATUS.COMPLETED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, function (error, response) {
        if (error)
            return res.send({ status: 500, error: error, response: null });
        const options = {
            to: req.body.email,
            subject: 'Loan Request Approved',
            template: 'myx3-default',
            context: {
                name: req.body.fullname,
                message: 'Congratulations! Your loan has been approved, and is pending your acceptance of the agreement.'
            }
        }
        emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, options);
        firebaseService.send(options);
        return res.send({ status: 200, error: null, response: response });
    });
});

router.post('/application/approve/:application_id', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = req.body,
        id = req.params.application_id,
        query = `UPDATE preapplications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = enums.CLIENT_APPLICATION.STATUS.APPROVED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, function (error, response) {
        if (error)
            return res.send({ status: 500, error: error, response: null });
        return res.send({ status: 200, error: null, response: response });
    });
});

router.get('/application/reject/:application_id', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.application_id,
        query = `UPDATE preapplications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = enums.CLIENT_APPLICATION.STATUS.REJECTED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, function (error, response) {
        if (error)
            return res.send({ status: 500, error: error, response: null });
        return res.send({ status: 200, error: null, response: response });
    });
});

router.put('/change-password/:id', helperFunctions.verifyJWT, (req, res) => {
    let payload = {},
        query = `UPDATE clients SET ? WHERE ID = ${req.params.id}`;
    payload.password = bcrypt.hashSync(req.body.password, parseInt(process.env.SALT_ROUNDS));
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    if (req.body.fingerprint_enabled) payload.fingerprint_enabled = req.body.fingerprint_enabled;
    db.query(query, payload, function (error, results, fields) {
        if (error) {
            res.send({ "status": 500, "error": error, "response": null });
        } else {
            res.send({ "status": 200, "error": null, "response": "Client password updated!" });
        }
    });
});

router.get('/ownerships', (req, res) => {
    return res.send({
        "status": 200,
        "error": null,
        "response": enums.OWNERSHIP
    });
});

router.post('/verify/email/:id', helperFunctions.verifyJWT, (req, res) => {
    if (!req.body.callback_url) return res.status(500).send('Required parameter(s) not sent!');
    let data = {};
    const expiry_days = 1,
        token = jwt.sign(
            {
                ID: req.user.ID,
                email: req.user.email,
                phone: req.user.phone
            },
            process.env.SECRET_KEY,
            {
                expiresIn: 60 * 60 * expiry_days
            });
    data.name = req.user.fullname;
    data.date = moment().utcOffset('+0100').format('YYYY-MM-DD');
    data.expiry = moment(data.date).add(expiry_days, 'days').utcOffset('+0100').format('YYYY-MM-DD');
    data.verify_url = `${req.body.callback_url}?token=${token}&module=client`;
    emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
        to: req.user.email,
        subject: 'Email Confirmation',
        template: 'myx3-verify-email',
        context: data
    });
    return res.send({
        "status": 200,
        "error": null,
        "response": `Verification email sent to ${req.user.email} successfully!`
    });
});

router.get('/verify/email/:token', (req, res) => {
    if (!req.params.token) return res.status(500).send('Required parameter(s) not sent!');
    jwt.verify(req.params.token, process.env.SECRET_KEY, function (err, decoded) {
        if (err) return res.send({
            "status": 500,
            "error": err,
            "response": "Failed to authenticate token!"
        });

        let payload = {},
            query = `UPDATE clients Set ? WHERE ID = ${decoded.ID}`;
        payload.verify_email = enums.VERIFY_EMAIL.STATUS.VERIFIED;
        payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

        db.query(query, payload, function (error, response) {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
            return res.send({
                "status": 200,
                "error": null,
                "response": `Email verified successfully!`
            });
        });
    });
});

router.get('/logout', (req, res) => {
    delete req.user;
    delete process.env.HOST || req.HOST;
    return res.send({
        "status": 200,
        "error": null,
        "response": `Client logged out successfully!`
    });
});

router.get('/invoice/payment/:id/:invoice_id', helperFunctions.verifyJWT, (req, res) => {
    return res.send('This api has been deprecated!');
    db.query(`SELECT s.*, a.status app_status, a.close_status, ROUND((s.interest_amount + s.payment_amount), 2) 
        amount FROM application_schedules s, applications a WHERE s.ID = ${req.params.invoice_id} 
        AND s.applicationID = a.ID AND a.userID = ${req.params.id}`, function (error, schedule) {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        if (!schedule[0]) return res.send({
            "status": 500,
            "error": 'Invoice does not exist for this client!',
            "response": null
        });

        const invoice = schedule[0];

        if (invoice.app_status !== 2 || invoice.close_status !== 0)
            return res.send({
                "status": 500,
                "error": null,
                "response": 'Invoice is not active!'
            });

        if (invoice.payment_status !== 0)
            return res.send({
                "status": 500,
                "error": null,
                "response": 'Invoice already has a payment!'
            });

        paystack.transaction.initialize({
            email: req.user.email,
            amount: parseFloat(invoice.amount) * 100
        })
            .then(function (body) {
                if (body.status) {
                    return res.send({
                        "status": 200,
                        "error": null,
                        "response": body.data
                    });
                } else {
                    return res.send({
                        "status": 500,
                        "error": null,
                        "response": body.message
                    });
                }
            })
            .catch(function (error) {
                if (error) return res.send({
                    "status": 500,
                    "error": error,
                    "response": null
                });
            });
    });
});

router.post('/invoice/paymentV2/:id/:invoice_id', helperFunctions.verifyJWT, (req, res) => {
    db.query(`SELECT s.*, a.ID app_id, a.userID, ROUND((s.interest_amount + s.payment_amount), 2) amount, 
    c.loan_officer, c.branch FROM application_schedules s, applications a, clients c WHERE s.ID = ${req.params.invoice_id} 
    AND s.applicationID = a.ID AND a.userID = ${req.params.id} AND a.userID = c.ID`, function (error, schedule) {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        if (!schedule[0]) return res.send({
            "status": 500,
            "error": 'Invoice does not exist!',
            "response": null
        });

        const invoice_ = schedule[0]

        paystack.transaction.verify(req.body.reference)
            .then(function (body) {
                if (body.status) {
                    if (body.data.amount !== parseFloat(invoice_.amount) * 100)
                        return res.send({
                            "status": 500,
                            "error": 'Payment amount does not match the invoice amount!',
                            "response": null
                        });
                    if (body.data.status === 'success') {
                        let data = {
                            actual_payment_amount: invoice_.payment_amount,
                            actual_interest_amount: invoice_.interest_amount,
                            actual_fees_amount: invoice_.fees_amount || 0,
                            actual_penalty_amount: invoice_.penalty_amount || 0,
                            payment_source: 'paystack',
                            payment_date: moment().utcOffset('+0100').format('YYYY-MM-DD')
                        },
                            postData = Object.assign({}, data);
                        delete postData.payment_source;
                        delete postData.payment_date;
                        db.query(`UPDATE application_schedules SET ? WHERE ID = ${req.params.invoice_id}`,
                            postData, function (error, schedule) {
                                if (error) {
                                    res.send({
                                        "status": 500,
                                        "error": error,
                                        "response": null
                                    });
                                } else {
                                    let invoice = {};
                                    invoice.invoiceID = req.params.invoice_id;
                                    invoice.agentID = 1;
                                    invoice.applicationID = invoice_.app_id;
                                    invoice.actual_amount = invoice_.amount;
                                    invoice.payment_amount = data.actual_payment_amount;
                                    invoice.interest_amount = data.actual_interest_amount;
                                    invoice.fees_amount = data.actual_fees_amount;
                                    invoice.penalty_amount = data.actual_penalty_amount;
                                    invoice.payment_source = data.payment_source;
                                    invoice.payment_date = data.payment_date;
                                    invoice.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                    invoice.clientID = invoice_.userID;
                                    invoice.loan_officerID = invoice_.loan_officer;
                                    invoice.branchID = invoice_.branch;
                                    invoice.type = 'multiple';
                                    invoice.status = 2;
                                    db.query('INSERT INTO schedule_history SET ?', invoice, function (error, response) {
                                        if (error) {
                                            res.send({
                                                "status": 500,
                                                "error": error,
                                                "response": null
                                            });
                                        } else {
                                            let payload = {};
                                            payload.category = 'Application';
                                            payload.userid = req.cookies.timeout;
                                            payload.description = 'Loan Application Payment Confirmed';
                                            payload.affected = invoice_.app_id;
                                            notificationsService.log(req, payload);
                                            const options = {
                                                to: req.user.email,
                                                subject: 'Payment Received',
                                                template: 'myx3-default',
                                                context: {
                                                    name: req.user.fullname,
                                                    message: `Your payment of ₦${helperFunctions.numberToCurrencyFormatter(invoice_.amount)} 
                                                        was received successfully!`
                                                }
                                            }
                                            emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, options);
                                            firebaseService.send(options);
                                            return res.send({
                                                "status": 200,
                                                "error": null,
                                                "response": "Invoice payment confirmed successfully!"
                                            });
                                        }
                                    });
                                }
                            });
                    } else {
                        return res.send({
                            "status": 500,
                            "error": null,
                            "response": body.data.gateway_response
                        });
                    }
                } else {
                    return res.send({
                        "status": 500,
                        "error": null,
                        "response": body.message
                    });
                }
            })
            .catch(function (error) {
                if (error) return res.send({
                    "status": 500,
                    "error": error,
                    "response": null
                });
            });
    });
});

router.get('/preapproved-loan/create/:id/:loan_id', helperFunctions.verifyJWT, (req, res) => {
    db.query(`SELECT a.userID, a.workflowID, a.loan_amount, a.interest_rate, a.duration, a.repayment_date, c.fullname client, 
    c.email, (SELECT u.phone FROM users u WHERE u.ID = (SELECT c.loan_officer FROM clients c WHERE c.ID = a.userID)) AS contact 
    FROM applications a, clients c WHERE a.ID = ${req.params.loan_id} AND a.userID = ${req.params.id} AND a.userID = c.ID`, (error, app) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        if (!app[0]) return res.send({
            "status": 500,
            "error": 'Loan does not exist for this client!',
            "response": null
        });

        const HOST = `${req.protocol}://${req.get('host')}`;
        let preapproved_loan = app[0];
        preapproved_loan.average_loan = '';
        preapproved_loan.credit_score = '';
        preapproved_loan.defaults = '';
        preapproved_loan.invoices_due = '';
        preapproved_loan.offer_duration = preapproved_loan.duration;
        preapproved_loan.offer_loan_amount = preapproved_loan.loan_amount;
        preapproved_loan.offer_first_repayment_date = preapproved_loan.repayment_date;
        preapproved_loan.offer_interest_rate = preapproved_loan.interest_rate;
        preapproved_loan.months_left = '';
        preapproved_loan.salary_loan = '';
        preapproved_loan.created_by = req.params.id;

        let data = {},
            email = preapproved_loan.email,
            contact = preapproved_loan.contact,
            date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        delete preapproved_loan.email;
        delete preapproved_loan.contact;
        preapproved_loan.applicationID = req.params.loan_id;
        preapproved_loan.date_created = date_created;
        preapproved_loan.expiry_date = moment().add(5, 'days').utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        preapproved_loan.hash = bcrypt.hashSync(preapproved_loan.userID, parseInt(process.env.SALT_ROUNDS));
        db.query('INSERT INTO preapproved_loans Set ?', preapproved_loan, function (error, response__) {
            if (error) {
                res.send({ status: 500, error: error, response: null });
            } else {
                data.name = preapproved_loan.client;
                data.date = date_created;
                data.expiry = preapproved_loan.expiry_date;
                data.contact = contact;
                data.amount = helperFunctions.numberToCurrencyFormatter(preapproved_loan.loan_amount);
                data.offer_url = `${process.env.HOST || req.HOST}/offer?t=${encodeURIComponent(preapproved_loan.hash)}&i=${req.params.loan_id}`;
                emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
                    to: email,
                    subject: `Mandate Setup`,
                    template: 'myx3-mandate',
                    context: data
                });
                return res.send({
                    "status": 200,
                    "error": null,
                    "response": data.offer_url
                });
            }
        });
    });
});

router.get('/preapproved-loan/get/:id/:loan_id/:key?', helperFunctions.verifyJWT, (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT p.*, c.fullname, c.email, c.salary, c.phone, c.bank, c.account, r.mandateId, r.requestId, 
        r.remitaTransRef, r.authParams FROM preapproved_loans p INNER JOIN clients c ON p.userID = c.ID 
        LEFT JOIN remita_mandates r ON (r.applicationID = p.applicationID AND r.status = 1) 
        WHERE p.userID = ${req.params.id} AND (p.ID = '${decodeURIComponent(req.params.loan_id)}' OR p.hash = '${decodeURIComponent(req.params.loan_id)}')`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    if (req.query.key === 'loanID') {
        query = `SELECT p.*, c.fullname, c.email, c.salary, c.phone, c.bank, c.account, r.mandateId, r.requestId, 
        r.remitaTransRef, r.authParams FROM preapproved_loans p INNER JOIN clients c ON p.userID = c.ID 
        LEFT JOIN remita_mandates r ON (r.applicationID = p.applicationID AND r.status = 1) 
        WHERE p.userID = '${req.params.id}' AND p.applicationID = '${req.params.loan_id}'`;
    }
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        if (response['data'][0]) {
            const status_payload = {
                mandateId: response['data'][0]['mandateId'],
                requestId: response['data'][0]['requestId']
            };
            helperFunctions.mandateStatus(status_payload, function (remita_mandate_status) {
                let preapproved_loan = (response.data === undefined) ? {} : response.data[0];
                preapproved_loan.remita = remita_mandate_status;
                preapproved_loan.merchantId = process.env.REMITA_MERCHANT_ID;
                preapproved_loan.hash = encodeURIComponent(preapproved_loan.hash);
                preapproved_loan.url = `${process.env.HOST || req.HOST}/offer?t=${preapproved_loan.hash}&i=${preapproved_loan.applicationID}`;
                if (response['data'][0]['requestId'])
                    preapproved_loan.remita_hash = SHA512(preapproved_loan.merchantId + process.env.REMITA_API_KEY + response['data'][0]['requestId']);
                return res.send({
                    "status": 200,
                    "error": null,
                    "response": preapproved_loan
                });
            });
        } else {
            return res.send({
                "status": 500,
                "error": 'Remita does not exist!',
                "response": null
            });
        }
    });
});

router.put('/application/update/:id/:application_id', helperFunctions.verifyJWT, (req, res) => {
    db.query(`UPDATE preapplications Set ? WHERE ID = ${req.params.application_id}
        AND userID = ${req.params.id}`, req.body, function (error, response) {
        if (error) {
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        } else {
            return res.send({
                "status": 200,
                "error": null,
                "response": 'Application updated successfully!'
            });
        }
    });
});

router.get('/payment-method/initiate/:id', helperFunctions.verifyJWT, (req, res) => {
    db.query(`SELECT email FROM clients WHERE ID = ${req.params.id}`, (error, client) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        if (!client[0]) return res.send({
            "status": 500,
            "error": 'Client does not exist!',
            "response": null
        });

        paystack.transaction.initialize({
            email: client[0]['email'],
            amount: 5000
        })
            .then(function (body) {
                if (body.status) {
                    return res.send({
                        "status": 200,
                        "error": null,
                        "response": body.data
                    });
                } else {
                    return res.send({
                        "status": 500,
                        "error": null,
                        "response": body.message
                    });
                }
            })
            .catch(function (error) {
                if (error) return res.send({
                    "status": 500,
                    "error": error,
                    "response": null
                });
            });
    });
});

router.post('/payment-method/create/:id', helperFunctions.verifyJWT, (req, res) => {
    paystack.transaction.verify(req.body.reference)
        .then(function (body) {
            if (body.status) {
                if (body.data.status === 'success') {
                    let data = body.data.authorization;
                    delete data['account_name']
                    data.userID = req.params.id;
                    data.reference = body.data.reference;
                    data.payment_channel = 'paystack';
                    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    data.created_by = req.params.id;
                    delete data.bin;

                    db.query(`SELECT * FROM client_payment_methods WHERE payment_channel = 'paystack' AND last4 = '${data.last4}' AND exp_month = '${data.exp_month}' 
                    AND exp_year = '${data.exp_year}' AND channel = '${data.channel}' AND card_type = '${data.card_type}' AND bank = '${data.bank}' AND country_code = '${data.country_code}' 
                    AND brand = '${data.brand}' AND signature = '${data.signature}' AND userID = '${req.params.id}' AND status = 1`, (error, payment_method) => {
                        if (error) return res.send({
                            "status": 500,
                            "error": error,
                            "response": null
                        });
                        if (payment_method[0]) return res.send({
                            "status": 500,
                            "error": null,
                            "response": 'Card already exists!'
                        });

                        db.query('INSERT INTO client_payment_methods SET ?', data, function (error, response) {
                            if (error) {
                                res.send({
                                    "status": 500,
                                    "error": error,
                                    "response": null
                                });
                            } else {
                                return res.send({
                                    "status": 200,
                                    "error": null,
                                    "response": "Payment method added successfully!"
                                });
                            }
                        });
                    });
                } else {
                    return res.send({
                        "status": 500,
                        "error": null,
                        "response": body.data.gateway_response
                    });
                }
            } else {
                return res.send({
                    "status": 500,
                    "error": null,
                    "response": body.message
                });
            }
        })
        .catch(function (error) {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        });
});

router.get('/payment-method/get/:id', helperFunctions.verifyJWT, (req, res) => {
    db.query(`SELECT * FROM client_payment_methods WHERE userID = ${req.params.id} AND status = 1`,
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
router.get('/payment-method/v2/:id',  (req, res) => {
    db.query(`SELECT * FROM client_payment_methods WHERE userID = ${req.params.id} AND status = 1`,
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

router.delete('/payment-method/delete/:id/:payment_method_id', helperFunctions.verifyJWT, (req, res) => {
    db.query(`UPDATE client_payment_methods SET status = 0 
    WHERE ID = ${req.params.payment_method_id} AND userID = ${req.params.id}`,
        (error, response) => {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
            return res.send({
                "status": 200,
                "error": null,
                "response": 'Payment method deleted successfully!'
            });
        });
});

router.post('/invoice/payment/:id/:invoice_id', helperFunctions.verifyJWT, (req, res) => {
    db.query(`SELECT s.*, a.ID app_id, a.userID, ROUND((COALESCE(s.interest_amount, 0) + COALESCE(s.payment_amount, 0)), 2) amount, 
    c.loan_officer, c.branch FROM application_schedules s, applications a, clients c WHERE s.ID = ${req.params.invoice_id} 
    AND s.applicationID = a.ID AND a.userID = ${req.params.id} AND a.userID = c.ID`, function (error, schedule) {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        if (!schedule[0]) return res.send({
            "status": 500,
            "error": 'Invoice does not exist!',
            "response": null
        });

        const invoice_ = schedule[0],
            amount = (parseFloat(invoice_.amount) + helperFunctions.calculatePaystackFee(invoice_.amount)) * 100;

        paystack.transaction.charge({
            authorization_code: req.body.authorization_code,
            email: req.user.email,
            amount: amount.round(2)
        })
            .then(function (body) {
                if (body.status) {
                    if (body.data.status === 'success') {
                        let data = {
                            actual_payment_amount: invoice_.payment_amount,
                            actual_interest_amount: invoice_.interest_amount,
                            actual_fees_amount: invoice_.fees_amount || 0,
                            actual_penalty_amount: invoice_.penalty_amount || 0,
                            payment_source: 'paystack',
                            payment_date: moment().utcOffset('+0100').format('YYYY-MM-DD')
                        },
                            postData = Object.assign({}, data);
                        delete postData.payment_source;
                        delete postData.payment_date;
                        db.query(`UPDATE application_schedules SET ? WHERE ID = ${req.params.invoice_id}`,
                            postData, function (error, schedule) {
                                if (error) {
                                    res.send({
                                        "status": 500,
                                        "error": error,
                                        "response": null
                                    });
                                } else {
                                    let invoice = {};
                                    invoice.invoiceID = req.params.invoice_id;
                                    invoice.agentID = 1;
                                    invoice.applicationID = invoice_.app_id;
                                    invoice.actual_amount = invoice_.amount;
                                    invoice.payment_amount = data.actual_payment_amount;
                                    invoice.interest_amount = data.actual_interest_amount;
                                    invoice.fees_amount = data.actual_fees_amount;
                                    invoice.penalty_amount = data.actual_penalty_amount;
                                    invoice.payment_source = data.payment_source;
                                    invoice.payment_date = data.payment_date;
                                    invoice.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                    invoice.clientID = invoice_.userID;
                                    invoice.loan_officerID = invoice_.loan_officer;
                                    invoice.branchID = invoice_.branch;
                                    invoice.type = 'multiple';
                                    invoice.status = 2;
                                    db.query('INSERT INTO schedule_history SET ?', invoice, function (error, response) {
                                        if (error) {
                                            res.send({
                                                "status": 500,
                                                "error": error,
                                                "response": null
                                            });
                                        } else {
                                            let payload = {};
                                            payload.category = 'Application';
                                            payload.userid = req.cookies.timeout;
                                            payload.description = 'Loan Application Payment Confirmed';
                                            payload.affected = invoice_.app_id;
                                            notificationsService.log(req, payload);
                                            const options = {
                                                to: req.user.email,
                                                subject: 'Payment Received',
                                                template: 'myx3-default',
                                                context: {
                                                    name: req.user.fullname,
                                                    message: `Your payment of ₦${helperFunctions.numberToCurrencyFormatter(invoice_.amount)} 
                                                        was received successfully!`
                                                }
                                            }
                                            emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, options);
                                            firebaseService.send(options);
                                            return res.send({
                                                "status": 200,
                                                "error": null,
                                                "response": "Invoice payment confirmed successfully!"
                                            });
                                        }
                                    });
                                }
                            });
                    } else {
                        return res.send({
                            "status": 500,
                            "error": null,
                            "response": body.data.gateway_response
                        });
                    }
                } else {
                    return res.send({
                        "status": 500,
                        "error": null,
                        "response": body.message
                    });
                }
            })
            .catch(function (error) {
                if (error) return res.send({
                    "status": 500,
                    "error": error,
                    "response": null
                });
            });
    });
});

router.post('/application/comment/:id/:loan_id', helperFunctions.verifyJWT, (req, res) => {
    let payload = {};
    payload.user_type = 'client';
    payload.text = req.body.text;
    payload.userID = req.params.id;
    payload.applicationID = req.params.loan_id;
    payload.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO application_comments SET ?', payload,
        (error, response) => {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
            return res.send({
                "status": 200,
                "error": null,
                "response": "Application commented successfully!"
            });
        });
});

router.get('/application/comment/:id/:loan_id', (req, res) => {
    db.query(`SELECT c.text, c.date_created, (SELECT fullname FROM clients WHERE ID = c.userID) fullname
    FROM application_comments c WHERE c.applicationID = ${req.params.loan_id} AND c.userID = ${req.params.id} 
        AND c.user_type = 'client' ORDER BY c.ID DESC`, (error, comments) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });
        return res.send({
            "status": 200,
            "error": null,
            "response": comments
        });
    });
});

router.get('/application/pay-off/:id/:loan_id', helperFunctions.verifyJWT, (req, res) => {
    let query = `SELECT * FROM applications WHERE ID = ${req.params.loan_id} AND userID = ${req.params.id}`;
    let query1 = `SELECT COALESCE(SUM(payment_amount+interest_amount), 0) amount FROM application_schedules 
        WHERE applicationID = ${req.params.loan_id} AND interest_collect_date <= CURDATE() AND status = 1`;
    let query2 = `SELECT COALESCE(SUM(payment_amount), 0) amount FROM application_schedules 
        WHERE applicationID = ${req.params.loan_id} AND interest_collect_date > CURDATE() AND status = 1`;
    let query3 = `SELECT COALESCE(((interest_amount/30) * (CASE
        WHEN DAY(CURDATE()) > DAY(interest_collect_date) THEN DAY(CURDATE()) - DAY(interest_collect_date)
        WHEN DAY(CURDATE()) < DAY(interest_collect_date) THEN 30 - (DAY(interest_collect_date) - DAY(CURDATE()))
        ElSE 0 END)), 0) amount FROM application_schedules WHERE applicationID = ${req.params.loan_id} AND status = 1 
        AND MONTH(interest_collect_date) = MONTH(CURDATE()) AND YEAR(interest_collect_date) = YEAR(CURDATE())`;
    let query4 = `SELECT COALESCE(SUM(payment_amount+interest_amount), 0) amount FROM schedule_history 
        WHERE applicationID = ${req.params.loan_id} AND clientID = ${req.params.id} AND status = 1 
        AND (SELECT status FROM application_schedules WHERE ID = invoiceID) = 1`;
    db.query(query, (error, application) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });
        if (!application[0]) return res.send({
            "status": 500,
            "error": 'Application does not exist!',
            "response": null
        });
        db.query(query1, (error, response) => {
            let overdue = (response[0]) ? response[0]['amount'] : 0;
            db.query(query2, (error, response) => {
                let not_due = (response[0]) ? response[0]['amount'] : 0;
                db.query(query3, (error, response) => {
                    let due = (response[0]) ? response[0]['amount'] : 0;
                    db.query(query4, (error, response) => {
                        let paid = (response[0]) ? response[0]['amount'] : 0;
                        return res.send({
                            "status": 200,
                            "error": null,
                            "response": overdue + not_due + due - paid
                        });
                    });
                });
            });
        });
    });
});

router.post('/application/pay-off/:id/:loan_id', helperFunctions.verifyJWT, (req, res) => {
    const amount = (parseFloat(req.body.close_amount) + helperFunctions.calculatePaystackFee(req.body.close_amount)) * 100;
    paystack.transaction.charge({
        email: req.user.email,
        authorization_code: req.body.authorization_code,
        amount: amount.round(2)
    })
        .then(function (body) {
            if (body.status) {
                if (body.data.status === 'success') {
                    db.getConnection(function (err, connection) {
                        if (err) throw err;

                        connection.query(`SELECT COALESCE(SUM(interest_amount), 0) amount FROM application_schedules 
                            WHERE applicationID = ${req.params.loan_id} AND payment_status = 0 AND status = 1`, (error, close_interest) => {
                            let data = {
                                close_amount: req.body.close_amount,
                                close_comment: req.body.close_comment
                            };
                            data.close_interest = close_interest[0]['amount'];
                            data.close_date = moment().utcOffset('+0100').format('YYYY-MM-DD');
                            data.close_channel = 'card';
                            data.close_status = 1;

                            connection.query(`UPDATE applications SET ? WHERE ID = ${req.params.loan_id}`, data, (error, result) => {
                                if (error) return res.send({
                                    "status": 500,
                                    "error": error,
                                    "response": null
                                });
                                connection.query(`SELECT s.*, a.userID, c.branch, c.loan_officer FROM application_schedules s, applications a, clients c 
                                    WHERE s.applicationID = ${req.params.loan_id} AND s.status = 1 AND s.payment_status = 0 AND s.applicationID = a.ID AND a.userID = c.ID`, (error, invoices) => {
                                    if (error) return res.send({
                                        "status": 500,
                                        "error": error,
                                        "response": null
                                    });
                                    async.forEach(invoices, function (invoice_obj, callback) {
                                        let invoice = {};
                                        invoice.invoiceID = invoice_obj.ID;
                                        invoice.applicationID = req.params.loan_id;
                                        invoice.payment_amount = invoice_obj.payment_amount;
                                        invoice.interest_amount = (new Date(invoice_obj.interest_collect_date) <= new Date())? invoice_obj.interest_amount : '0';
                                        invoice.fees_amount = invoice_obj.fees_amount;
                                        invoice.penalty_amount = invoice_obj.penalty_amount;
                                        invoice.actual_amount = Number(invoice.payment_amount) + Number(invoice.interest_amount) + 
                                            Number(invoice.fees_amount) + Number(invoice.penalty_amount);
                                        invoice.agentID = 1;
                                        invoice.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                        invoice.payment_date = moment().utcOffset('+0100').format('YYYY-MM-DD');
                                        invoice.payment_source = 'paystack';
                                        invoice.clientID = invoice_obj.userID;
                                        invoice.loan_officerID = invoice_obj.loan_officer;
                                        invoice.branchID = invoice_obj.branch;
                                        invoice.type = 'multiple';
                                        invoice.status = 2;
                                        connection.query(`UPDATE application_schedules SET payment_status = 1 WHERE ID = ${invoice_obj.ID}`, () => {
                                            connection.query('INSERT INTO schedule_history SET ?', invoice, () => {
                                                callback();
                                            });
                                        });
                                    }, data => {
                                        connection.release();
                                        let payload = {}
                                        payload.category = 'Application';
                                        payload.userid = req.cookies.timeout;
                                        payload.description = 'Loan Application Paid Off';
                                        payload.affected = req.params.id;
                                        notificationsService.log(req, payload);
                                        const options = {
                                            to: req.user.email,
                                            subject: 'Loan Paid Off',
                                            template: 'myx3-default',
                                            context: {
                                                name: req.user.fullname,
                                                message: 'Congratulations! Your loan has been paid off.'
                                            }
                                        }
                                        emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, options);
                                        firebaseService.send(options);
                                        res.send({
                                            "status": 200,
                                            "error": null,
                                            "response": "Application pay off successful!"
                                        });
                                    });
                                });
                            });
                        });
                    });
                } else {
                    return res.send({
                        "status": 500,
                        "error": null,
                        "response": body.data.gateway_response
                    });
                }
            } else {
                return res.send({
                    "status": 500,
                    "error": null,
                    "response": body.message
                });
            }
        })
        .catch(function (error) {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        });
});

router.post('/invoice/part-payment/:id/:invoice_id', helperFunctions.verifyJWT, (req, res) => {
    db.query(`SELECT s.*, a.ID app_id, a.userID, ROUND((s.interest_amount + s.payment_amount), 2) amount, 
    c.loan_officer, c.branch, COALESCE(ROUND(SUM(p.interest_amount), 2), 0) interest_paid, COALESCE(ROUND(SUM(p.payment_amount), 2), 0) principal_paid, 
    ROUND((s.interest_amount - COALESCE(ROUND(SUM(p.interest_amount), 2), 0)), 2) interest_owed, ROUND((s.payment_amount - COALESCE(ROUND(SUM(p.payment_amount), 2), 0)), 2) principal_owed 
    FROM application_schedules s, applications a, clients c, schedule_history p WHERE s.ID = ${req.params.invoice_id} 
    AND s.applicationID = a.ID AND a.userID = ${req.params.id} AND a.userID = c.ID AND p.invoiceID = s.ID AND p.status = 1`, (error, schedule) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        if (!schedule[0]) return res.send({
            "status": 500,
            "error": 'Invoice does not exist!',
            "response": null
        });

        const invoice_ = schedule[0],
            interest_amount = (req.body.amount >= invoice_.interest_owed) ? invoice_.interest_owed : req.body.amount,
            principal_amount = (req.body.amount > interest_amount) ? (req.body.amount - interest_amount) : 0;

        if (req.body.amount > (invoice_.interest_owed + invoice_.principal_owed).round(2))
            return res.send({
                "status": 500,
                "error": null,
                "response": 'Amount is more than the repayment due for this invoice!'
            });

        const amount = (parseFloat(req.body.amount) + helperFunctions.calculatePaystackFee(req.body.amount)) * 100;
        paystack.transaction.charge({
            email: req.user.email,
            authorization_code: req.body.authorization_code,
            amount: amount.round(2)
        })
            .then(function (body) {
                if (body.status) {
                    if (body.data.status === 'success') {
                        let data = {
                            actual_payment_amount: principal_amount,
                            actual_interest_amount: interest_amount,
                            actual_fees_amount: 0,
                            actual_penalty_amount: 0,
                            payment_source: 'paystack',
                            payment_date: moment().utcOffset('+0100').format('YYYY-MM-DD')
                        },
                            postData = Object.assign({}, data);
                        delete postData.payment_source;
                        delete postData.payment_date;
                        db.query(`UPDATE application_schedules SET ? WHERE ID = ${req.params.invoice_id}`,
                            postData, function (error, schedule) {
                                if (error) {
                                    res.send({
                                        "status": 500,
                                        "error": error,
                                        "response": null
                                    });
                                } else {
                                    let invoice = {};
                                    invoice.invoiceID = req.params.invoice_id;
                                    invoice.agentID = 1;
                                    invoice.applicationID = invoice_.app_id;
                                    invoice.actual_amount = req.body.amount;
                                    invoice.payment_amount = data.actual_payment_amount;
                                    invoice.interest_amount = data.actual_interest_amount;
                                    invoice.fees_amount = data.actual_fees_amount;
                                    invoice.penalty_amount = data.actual_penalty_amount;
                                    invoice.payment_source = data.payment_source;
                                    invoice.payment_date = data.payment_date;
                                    invoice.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                    invoice.clientID = invoice_.userID;
                                    invoice.loan_officerID = invoice_.loan_officer;
                                    invoice.branchID = invoice_.branch;
                                    invoice.status = 2;
                                    if (invoice.payment_amount > 0 && invoice.interest_amount > 0) {
                                        invoice.type = 'multiple';
                                    } else {
                                        if (invoice.payment_amount > 0) {
                                            invoice.type = 'principal';
                                        } else if (invoice.interest_amount > 0) {
                                            invoice.type = 'interest';
                                        } else if (invoice.fees_amount > 0) {
                                            invoice.type = 'fees';
                                        } else if (invoice.penalty_amount > 0) {
                                            invoice.type = 'penalty';
                                        }
                                    }
                                    db.query('INSERT INTO schedule_history SET ?', invoice, function (error, response) {
                                        if (error) {
                                            res.send({
                                                "status": 500,
                                                "error": error,
                                                "response": null
                                            });
                                        } else {
                                            let payload = {};
                                            payload.category = 'Application';
                                            payload.userid = req.cookies.timeout;
                                            payload.description = 'Loan Application Payment Confirmed';
                                            payload.affected = invoice_.app_id;
                                            notificationsService.log(req, payload);
                                            const options = {
                                                to: req.user.email,
                                                subject: 'Payment Received',
                                                template: 'myx3-default',
                                                context: {
                                                    name: req.user.fullname,
                                                    message: `Your payment of ₦${helperFunctions.numberToCurrencyFormatter(req.body.amount)} 
                                                        was received successfully!`
                                                }
                                            }
                                            emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, options);
                                            firebaseService.send(options);
                                            return res.send({
                                                "status": 200,
                                                "error": null,
                                                "response": "Invoice payment confirmed successfully!"
                                            });
                                        }
                                    });
                                }
                            });
                    } else {
                        return res.send({
                            "status": 500,
                            "error": null,
                            "response": body.data.gateway_response
                        });
                    }
                } else {
                    return res.send({
                        "status": 500,
                        "error": null,
                        "response": body.message
                    });
                }
            })
            .catch(function (error) {
                if (error) return res.send({
                    "status": 500,
                    "error": error,
                    "response": null
                });
            });
    });
});

router.get('/kyc', (req, res) => {
    db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='test'" +
        "AND TABLE_NAME='clients' AND NOT (COLUMN_NAME = 'ID' OR COLUMN_NAME = 'status' " +
        "OR COLUMN_NAME = 'date_created' OR COLUMN_NAME = 'images_folder')", (error, response) => {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
            res.send({
                "status": 200,
                "error": null,
                "response": response
            });
        });
});

router.post('/forgot-password/get', (req, res) => {
    if (!req.body.username || !req.body.callback_url) return res.status(500).send('Required parameter(s) not sent!');
    let data = {},
        query = `SELECT ID, fullname, email, phone, status FROM clients 
            WHERE username = '${req.body.username}' OR email = '${req.body.username}' OR phone = '${req.body.username}'`;
    db.query(query, (error, client_) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });
        if (!client_ || !client_[0]) return res.send({
            "status": 500,
            "error": 'Sorry we can’t find this username in our record, please proceed to sign up!',
            "response": null
        });

        let client = client_[0];
        if (client.status === 0) return res.send({
            "status": 500,
            "error": "Client has been disabled!",
            "response": null
        });

        const expiry_days = 1,
            token = jwt.sign(
                {
                    ID: client.ID,
                    email: client.email,
                    phone: client.phone
                },
                process.env.SECRET_KEY,
                {
                    expiresIn: 60 * 60 * expiry_days
                });
        data.fullname = client.fullname;
        data.date = moment().utcOffset('+0100').format('YYYY-MM-DD');
        data.expiry = moment(data.date).add(expiry_days, 'days').utcOffset('+0100').format('YYYY-MM-DD');
        data.forgot_url = `${req.body.callback_url}?token=${token}&module=password`;
        emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
            to: client.email,
            subject: 'Forgot Password Request',
            template: 'myx3-forgot',
            context: data
        });
        return res.send({
            "status": 200,
            "error": null,
            "response": `Forgot password email sent to ${client.email} successfully!`
        });
    });
});

router.put('/forgot-password/update', (req, res) => {
    if (!req.body.token || !req.body.password) return res.status(500).send('Required parameter(s) not sent!');
    jwt.verify(req.body.token, process.env.SECRET_KEY, function (err, decoded) {
        if (err) return res.send({
            "status": 500,
            "error": err,
            "response": "Failed to authenticate token!"
        });

        let payload = {},
            query = `UPDATE clients SET ? WHERE ID = ${decoded.ID}`;
        payload.password = bcrypt.hashSync(req.body.password, parseInt(process.env.SALT_ROUNDS));
        payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        payload.password_reset_status = enums.PASSWORD_RESET.STATUS.TRUE;
        db.query(query, payload, error => {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
            return res.send({
                "status": 200,
                "error": null,
                "response": `Client password updated successfully!`
            });
        });
    });
});

router.get('/branches', helperFunctions.verifyJWT, (req, res) => {
    let query = 'SELECT * FROM branches';
    db.query(query, function (error, results) {
        if (error)
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

router.get('/states', helperFunctions.verifyJWT, (req, res) => {
    let query = 'SELECT * FROM state';
    db.query(query, function (error, results) {
        if (error)
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

router.get('/countries', helperFunctions.verifyJWT, (req, res) => {
    let query = 'SELECT * FROM country';
    db.query(query, function (error, results) {
        if (error)
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

router.post('/application/verify/email/:id/:application_id/:type', helperFunctions.verifyJWT, (req, res) => {
    if (!req.body.callback_url || !req.body.email || !req.params.type || !req.params.application_id)
        return res.status(500).send('Required parameter(s) not sent!');
    let data = {},
        email = req.body.email;
    const expiry_days = 1,
        token = jwt.sign(
            {
                ID: req.user.ID,
                email: req.user.email,
                phone: req.user.phone,
                type: req.params.type,
                applicationID: req.params.application_id
            },
            process.env.SECRET_KEY,
            {
                expiresIn: 60 * 60 * expiry_days
            });
    data.name = req.user.fullname;
    data.date = moment().utcOffset('+0100').format('YYYY-MM-DD');
    data.expiry = moment(data.date).add(expiry_days, 'days').utcOffset('+0100').format('YYYY-MM-DD');
    data.verify_url = `${req.body.callback_url}?token=${token}&module=application`;
    const options = {
        to: req.user.email,
        subject: `${req.params.type} email confirmation`,
        template: 'myx3-default',
        context: {
            name: req.user.fullname,
            message: `This is a reminder that your ${req.params.type} email (${email}) is pending verification. 
                Kindly log in to your ${req.params.type} email for further instructions on how to proceed!`
        }
    }
    emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, options);
    emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
        to: email,
        subject: `${req.params.type} email confirmation`,
        template: 'myx3-verify-email',
        context: data
    });
    return res.send({
        "status": 200,
        "error": null,
        "response": `Verification email sent to ${email} successfully!`
    });
});

router.get('/application/verify/email/:token', (req, res) => {
    if (!req.params.token) return res.status(500).send('Required parameter(s) not sent!');
    jwt.verify(req.params.token, process.env.SECRET_KEY, function (err, decoded) {
        if (err) return res.send({
            "status": 500,
            "error": err,
            "response": "Failed to authenticate token!"
        });

        let payload = {},
            query = `UPDATE preapplications Set ? WHERE ID = ${decoded.applicationID}`;
        switch (decoded.type) {
            case 'work': {
                payload.verify_work_email = enums.VERIFY_EMAIL.STATUS.VERIFIED;
                break;
            }
        }
        payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

        db.query(query, payload, function (error, response) {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
            
            return res.send({
                "status": 200,
                "error": null,
                "response": `${decoded.type} email verified successfully!`
            });
        });
    });
});

router.get('/banks', (req, res) => {
    let banks = require('../../../banks.json');
    paystack.subaccount.listBanks()
        .then(body => {
            async.forEach(body.data, (bank, callback) => {
                let check = banks.filter(bank_ => {
                    return bank_.name.toLowerCase().indexOf(bank.name.toLowerCase()) > -1;
                });
                if (!check[0]) banks.push({
                    name: bank.name.toUpperCase(),
                    authorization: 'FORM',
                    code: bank.code
                });
                callback();
            }, data => {
                return res.send({
                    "status": 200,
                    "error": null,
                    "response": banks
                });
            });
        })
        .catch(function (error) {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
        });
});

router.get('/resolve/account/:account/:bank', (req, res) => {
    let payload = {};
    payload.bank = req.params.bank;
    payload.account = req.params.account;
    if (!payload.account || !payload.bank) return res.status(500).send('Required parameter(s) not sent!');

    helperFunctions.resolveAccount(payload, response => {
        if (!response.status) return res.send({
            "status": 500,
            "error": response.message,
            "response": null
        });

        return res.send({
            "status": 200,
            "error": null,
            "response": response.data
        });
    });
});

router.post('/application/verifyV2/email/:application_id/:type', (req, res) => {
    if (!req.body.email || !req.params.type || !req.params.application_id)
        return res.status(500).send('Required parameter(s) not sent!');

    db.query(`SELECT c.ID, c.email, c.phone, c.fullname FROM clients c, preapplications a 
        WHERE a.ID = ${req.params.application_id} AND c.ID = a.userID`, (error, client_) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        if (!client_[0]) return res.send({
            "status": 500,
            "error": 'Client does not exist!',
            "response": null
        });

        let data = {},
            client = client_[0],
            email = req.body.email;
        const expiry_days = 1,
            token = jwt.sign(
                {
                    ID: client.ID,
                    email: client.email,
                    phone: client.phone,
                    type: req.params.type,
                    applicationID: req.params.application_id
                },
                process.env.SECRET_KEY,
                {
                    expiresIn: 60 * 60 * expiry_days
                });
        data.name = client.fullname;
        data.date = moment().utcOffset('+0100').format('YYYY-MM-DD');
        data.expiry = moment(data.date).add(expiry_days, 'days').utcOffset('+0100').format('YYYY-MM-DD');
        data.verify_url = `${process.env.CLIENT_HOST}/verify-email?token=${token}&module=application`;
        const options = {
            to: client.email,
            subject: `${req.params.type} email Confirmation`,
            template: 'myx3-default',
            context: {
                name: client.fullname,
                message: `This is a reminder that your ${req.params.type} email (${email}) is pending verification. 
                        Kindly log in to your ${req.params.type} email for further instructions on how to proceed!`
            }
        }
        emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, options);
        firebaseService.send(options);
        emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
            to: email,
            subject: 'Email Confirmation',
            template: 'myx3-verify-email',
            context: data
        });
        return res.send({
            "status": 200,
            "error": null,
            "response": `Verification email sent to ${email} successfully!`
        });
    });
});

router.get('/applications/web/count', (req, res) => {
    let query_status = `(${enums.CLIENT_APPLICATION.STATUS.ACTIVE},${enums.CLIENT_APPLICATION.STATUS.APPROVED})`;
    let query = `SELECT COUNT(*) count FROM preapplications p WHERE p.status in ${query_status} 
    AND p.ID NOT IN (SELECT a.preapplicationID FROM applications a WHERE p.ID = a.preapplicationID) AND p.creator_type = "client"`;
    db.query(query, (error, response) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });
        return res.send({
            "status": 200,
            "error": null,
            "response": response[0]['count']
        });
    });
});

router.get('/bvn/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let end = req.query.end;
    let type = req.query.type;
    let draw = req.query.draw;
    let start = req.query.start;
    let limit = req.query.limit;
    let order = req.query.order;
    let offset = req.query.offset;
    let search_string = req.query.search_string.toUpperCase();
    let query_condition = `FROM clients c WHERE c.bvn_otp IS NOT NULL AND c.bvn_input IS NOT NULL AND c.bvn_phone IS NOT NULL 
        AND (upper(c.ID) LIKE "%${search_string}%" OR upper(c.fullname) LIKE "%${search_string}%" 
        OR upper(c.bvn_phone) LIKE "%${search_string}%" OR upper(c.bvn_input) LIKE "%${search_string}%") `;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    if (type) query_condition = query_condition.concat(`AND c.verify_bvn = ${type} `);
    if (start && end)
        query_condition = query_condition.concat(`AND TIMESTAMP(c.date_created) < TIMESTAMP('${end}') AND TIMESTAMP(c.date_created) >= TIMESTAMP('${start}') `);
    let query = `SELECT * ${query_condition} ${order} LIMIT ${limit} OFFSET ${offset}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) ${query_condition}) as recordsFiltered 
            FROM clients WHERE bvn_otp IS NOT NULL AND bvn_input IS NOT NULL AND bvn_phone IS NOT NULL`;
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

router.post('/bvn/verify/:id', (req, res) => {
    let payload = req.body,
        id = req.params.id,
        query = `SELECT * FROM clients WHERE bvn = ${payload.bvn} AND verify_bvn = 1`;
    payload.verify_bvn = 1;
    payload.bvn_input = payload.bvn;
    payload.bvn_phone = payload.phone;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, (error, bvn_check) => {
        if (error) res.send({ status: 500, error: error, response: null });

        if (bvn_check[0]) {
            if (bvn_check[0]['ID'] == id)
                return res.send({ status: 500, error: 'You have already verified this BVN!', response: null });
            return res.send({ status: 500, error: 'This BVN is already in use by another user!', response: null });
        }

        query = `UPDATE clients SET bvn = NULL WHERE bvn = ${payload.bvn}`;
        db.query(query, () => {
            query = `UPDATE clients SET phone = NULL WHERE phone = ${payload.phone}`;
            db.query(query, () => {
                query = `UPDATE clients SET bvn_input = NULL WHERE bvn_input = ${payload.bvn}`;
                db.query(query, () => {
                    query = `UPDATE clients SET bvn_phone = NULL WHERE bvn_phone = ${payload.phone}`;
                    db.query(query, () => {
                        query = `UPDATE clients Set ? WHERE ID = ${id}`;
                        db.query(query, payload, (error, response) => {
                            if (error)
                                return res.send({ status: 500, error: error, response: null });
                            return res.send({ status: 200, error: null, response: response });
                        });
                    });
                });
            });
        });
    });
});

router.get('/bvn/unverify/:id', (req, res) => {
    let payload = req.body,
        id = req.params.id,
        query = `UPDATE clients Set ? WHERE ID = ${id}`;
    payload.verify_bvn = 0;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, (error, response) => {
        if (error)
            return res.send({ status: 500, error: error, response: null });
        return res.send({ status: 200, error: null, response: response });
    });
});

router.post('/v2/create', (req, res) => {
    let id;
    let postData = req.body,
        query = 'INSERT INTO clients Set ?',
        query2 = 'select * from clients where username = ? or phone = ?';
    postData.status = enums.CLIENT.STATUS.ACTIVE;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    if (!postData.username || !postData.phone || !postData.pin || !postData.loan_officer || !postData.branch)
        return res.send({ "status": 500, "error": "Required parameter(s) not sent!", "response": null });

    postData.pin = bcrypt.hashSync(postData.pin, parseInt(process.env.SALT_ROUNDS));
    postData.images_folder = postData.phone;
    postData.pin_reset_status = enums.PIN_RESET.STATUS.TRUE;
    db.getConnection((err, connection) => {
        if (err) throw err;
        connection.query(query2, [postData.username, postData.phone], (error, results) => {
            if (results && results[0]) {
                let duplicates = [];
                if (postData.phone == results[0]['phone']) duplicates.push('phone');
                return res.send({ "status": 500, "error": `The ${duplicates[0] || username} is already in use by another user!`, "response": null });
            }
            connection.query(query, postData, (error, response) => {
                if (error) {
                    res.send({ "status": 500, "error": error, "response": null });
                } else {
                    connection.query('SELECT * from clients where ID = (SELECT MAX(ID) FROM clients)', (err, client) => {
                        if (!err) {
                            id = client[0]['ID'];
                            connection.query('INSERT into wallets Set ?', { client_id: id }, (er, r) => {
                                connection.release();
                                if (!er) {
                                    let payload = {};
                                    payload.category = 'Clients';
                                    payload.userid = req.cookies.timeout;
                                    payload.description = 'New Client Created';
                                    payload.affected = id;
                                    notificationsService.log(req, payload);
                                    emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
                                        to: postData.email,
                                        subject: 'Signup Successful!',
                                        template: 'myx3-client',
                                        context: postData
                                    });
                                    let user = client[0];
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
                                    res.send({
                                        "status": 200,
                                        "error": null,
                                        "response": user
                                    });
                                } else {
                                    res.send({ "status": 500, "error": er, "response": "Error creating client wallet!" });
                                }
                            });
                        } else {
                            res.send({ "status": 500, "error": err, "response": "Error retrieving client details. Please try a new username!" });
                        }
                    });
                }
            });
        });
    });
});

router.post('/v2/login', (req, res) => {
    let username = req.body.username,
        pin = req.body.pin;
    if (!username || !pin) return res.status(500).send('Required parameter(s) not sent!');

    db.query(`SELECT * FROM clients WHERE username = '${username}' OR email = '${username}' OR phone = '${username}'`, (err, client) => {
        if (err)
            return res.send({
                "status": 500,
                "error": "Connection Error!",
                "response": null
            });

        if (!client || !client[0])
            return res.send({
                "status": 500,
                "error": "Sorry, we can't find this information in our record, please check again or create an account if you are a new user.",
                "response": null
            });

        let user = client[0];
        if (user.status === 0)
            return res.send({
                "status": 500,
                "error": "Your Account Has Been Disabled, Please Contact The Admin",
                "response": null
            });

        if (user.pin_reset_status === enums.PIN_RESET.STATUS.FALSE && pin.toLowerCase() === '0000')
            return res.send({
                "status": 400,
                "error": `Pin has expired! A default pin will be sent to ${user.phone}`,
                "response": null
            });

        if (!user.pin)
            return res.send({
                "status": 500,
                "error": "Incorrect Username/Pin!",
                "response": null
            });

        if (bcrypt.compareSync(pin, user.pin)) {
            let payload = {
                pin_reset_status: enums.PIN_RESET.STATUS.TRUE,
                date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
            };
            db.query(`UPDATE clients SET ? WHERE ID = ${user.ID}`, payload, async error => {
                if (error)
                    return res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });

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

                const myxalary = await helperFunctions.getMyXalaryClient(user.ID);
                if (myxalary) user.myxalary = myxalary;

                let payload = {};
                payload.category = 'Authentication';
                payload.userid = user.ID;
                payload.description = 'New User Login';
                payload.affected = user.ID;
                notificationsService.log(req, payload);
                
                let obj = {};
                const path = `files/users/${user.images_folder}/`;
                if (!fs.existsSync(path)) {
                    user.files = {};
                    return res.send({
                        "status": 200,
                        "error": null,
                        "response": user
                    });
                } else {
                    fs.readdir(path, (err, files) => {
                        files = helperFunctions.removeFileDuplicates(path, files);
                        async.forEach(files, (file, callback) => {
                            let filename = file.split('.')[helperFunctions.getClientFilenameIndex(path, file)].split('_');
                            filename.shift();
                            obj[filename.join('_')] = `${process.env.HOST || req.HOST}/${path}${file}`;
                            callback();
                        }, data => {
                            user.files = obj;
                            return res.send({
                                "status": 200,
                                "error": null,
                                "response": user
                            });
                        });
                    });
                }
            });
        } else {
            res.send({
                "status": 500,
                "error": "Pin is incorrect!",
                "response": null
            });
        }
    });
});

router.post('/forgot-pin/get', (req, res) => {
    if (!req.body.username) return res.status(500).send('Required parameter(s) not sent!');
    let data = {},
        query = `SELECT ID, fullname, email, phone, status FROM clients 
            WHERE username = '${req.body.username}' OR email = '${req.body.username}' OR phone = '${req.body.username}'`;
    db.query(query, (error, client_) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });
        if (!client_ || !client_[0]) return res.send({
            "status": 500,
            "error": 'Sorry we can’t find this username in our record, please proceed to sign up!',
            "response": null
        });

        let client = client_[0];
        if (client.status === 0) return res.send({
            "status": 500,
            "error": "Client has been disabled!",
            "response": null
        });

        let pin = Math.floor(1000 + Math.random() * 9000);
        let payload = {
            pin: bcrypt.hashSync(pin.toString(), parseInt(process.env.SALT_ROUNDS)),
            date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
        };
        let sms = {
            phone: helperFunctions.formatToNigerianPhone(client.phone),
            message: `To login to My X3 mobile app, use this pin ${pin}`
        }
        helperFunctions.sendSMS(sms, data => {
            if (data.response.status === 'SUCCESS') {
                db.query(`UPDATE clients SET ? WHERE ID = ${client.ID}`, payload, (error, response) => {
                    if (error)
                        return res.send({
                            "status": 500,
                            "error": error,
                            "response": null
                        });

                    return res.send({
                        "status": 200,
                        "error": null,
                        "response": `Default pin sent to ${client.phone} successfully!`
                    });
                });
            } else {
                return res.send({
                    "status": 500,
                    "error": 'Error sending new pin!',
                    "response": null
                });
            }
        });
    });
});

router.get('/product/:product_id', helperFunctions.verifyJWT, (req, res) => {
    let obj = {},
        product_id = req.params.product_id,
        path = `files/workflow_download-${product_id}/`,
        query = `SELECT w.*, (SELECT GROUP_CONCAT(NULLIF(s.document,"")) FROM workflow_stages s WHERE w.ID = s.workflowID) document 
        FROM workflows w WHERE w.enable_client_product = 1 AND w.ID = ${product_id}`;
    db.query(query, function (error, product) {
        if (error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });
            
        product = product[0];
        if (!product)
            return res.send({
                "status": 500,
                "error": 'Product does not exist!',
                "response": null
            });

        fs.readdir(path, (err, files) => {
            if (err) files = [];
            files = helperFunctions.removeFileDuplicates(path, files);
            async.forEach(files, (file, callback) => {
                let filename = file.split('.')[0].split('_');
                filename.shift();
                obj[filename.join('_')] = path + file;
                callback();
            }, () => {
                product.file_downloads = obj;
                path = `files/workflow_images/`;
                fs.readdir(path, (err, files) => {
                    if (err) files = [];
                    files = helperFunctions.removeFileDuplicates(path, files);
                    const image = (files.filter(file => {
                        return file.indexOf(`${product_id}_${product.name.trim().replace(/ /g, '_')}`) > -1;
                    }))[0];
                    product.image = `${process.env.HOST || req.HOST}/${(image)? `${path}${image}` : 'product.png'}`;
                    res.send({
                        "status": 200,
                        "error": null,
                        "response": product
                    });
                });
            });
        });
    });
});


/**
 * get table list of clientBanks
 * 
 */
router.get('/clientbanks/:clientId', (req, res) => {
    const userId = req.params.clientId;
    let query = `SELECT * from client_banks WHERE status = 1 AND user_id = ${userId}`;

    db.query(query, (err, result) => {
        if (err) {
            console.log(err)
            res.send({ "status": 500, "error": er, "response": "Err!" });
            return
        }

        res.status(201).json(result)
    })
});

/**
 * Creates a bank information in table of clientBanks
 * 
 */
router.post('/clientbanks/:clientId',  (req, res) => {
    // get user Id
    const userId = req.params.clientId;

    /**  check for duplicate **/
    const account = req.body.account;
    let query = `SELECT * from client_banks WHERE status = 1 AND user_id = ${userId} AND account = ${account}`;

    // query clientbanks
    db.query(query, (err, result) => {
        if(result.length >0) {
            res.send({ "status": 500, "error": 'Account number already exixts', "response": "Err!" });
            return;
        }

        // query normal client table
        query = `SELECT * from clients WHERE ID = ${userId} `;
        db.query(query, (err, result) => {
            if (result.length > 0) {
                if(result[0].account == account) {
                    res.send({ "status": 500, "error": 'Account number already exixts', "response": "Err!" });
                    return;
                }
            }

            // insert the data at this point
            query = `INSERT INTO client_banks SET ?`;
            db.query(query, req.body, (err, result) => {
                if (err) {
                    console.log(err)
                    res.send({ "status": 500, "error": er, "response": "Err!" });
                    return
                }
                res.send({
                    "status": 200,
                    "error": null,
                    "response": "Successfully added card"
                });
            })
        })
    })
});
/**
 * Delete a bank from the table of clientBanks
 * 
 */
router.delete('/clientbanks/:clientId/:bankId',  (req, res) => {
    const userId = req.params.clientId;
    const bankId = req.params.bankId;
    let query = `DELETE FROM client_banks WHERE ID = ${bankId}`;

    db.query(query, (err) => {
        if (err) {
            console.log(err)
            res.send({ "status": 500, "error": er, "response": "Err!" });
            return
        }
        res.send({
            "status": 200,
            "error": null,
            "response": "Successfully Deleted Card"
        });
    });
});

router.get('/loans/history/get/:id', (req, res) => {
    let query = `SELECT  a.loan_amount, a.disbursement_date, a.duration, a.interest_rate, 
        (select coalesce(sum(payment_amount), 0) from schedule_history where applicationID = a.ID and status = 1) paid,
        (a.loan_amount - (select coalesce(sum(payment_amount), 0) from schedule_history where applicationID = a.ID and status = 1)) balance
    FROM clients c, applications a WHERE c.ID = a.userID AND a.ID in (select id from applications where userID = ${req.params.id} and status = 2)`;
    db.query(query, function (error, response) {
        if (error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        res.send({
            "status": 200,
            "error": null,
            "response": response
        });
    });
});

router.get('/account/statement/get/:id', (req, res) => {
    let query = `SELECT date_disbursed date, loan_id reference, COALESCE(amount, 0) amount, 'debit' type FROM disbursement_history 
        WHERE client_id = ${req.params.id} AND status = 1 AND date_disbursed IS NOT NULL`;
    db.query(query, (error, debits) => {
        if (error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        query = `SELECT payment_date date, applicationID reference, COALESCE(payment_amount, 0) amount, 
            'credit' type FROM schedule_history WHERE clientID = ${req.params.id} AND status = 1 AND payment_date IS NOT NULL`;
        db.query(query, (error, credits) => {
            if (error)
                return res.send({
                    "status": 500,
                    "error": error,
                    "response": null
                });
    
            const results = debits.concat(credits);
            results.sort((a, b) => {
                return new Date(a.date) - new Date(b.date);
            });
            res.send({
                "status": 200,
                "error": null,
                "response": results
            });
        });
    });
});

router.post('/call-logs/sync/:id', helperFunctions.verifyJWT, (req, res) => {
    db.getConnection((err, connection) => {
        if (err) throw err;

        let count = 0;
        const call_logs = req.body,
            query = 'INSERT INTO client_call_logs SET ?',
            date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        async.forEach(call_logs, (call_log, callback) => {
            call_log.date_created = date;
            call_log.clientID = req.params.id;
            connection.query(query, call_log, (error, response) => {
                if (error) console.log(error);
                else count++;
                callback();
            });
        }, data => {
            connection.release();
            res.send({
                "status": 200,
                "error": null,
                "response": `${count} call log(s) synced successfully`
            });
        });
    });
});

router.get('/call-logs/get/:id', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let draw = req.query.draw;
    let limit = req.query.limit;
    let order = req.query.order;
    let offset = req.query.offset;
    let search_string = req.query.search_string.toUpperCase();
    let query_condition = `FROM client_call_logs l WHERE clientID = ${req.params.id} AND l.name IS NOT NULL AND (upper(l.name) LIKE "%${search_string}%" 
        OR upper(l.phoneNumber) LIKE "%${search_string}%" OR upper(l.type) LIKE "%${search_string}%" OR upper(l.dateTime) LIKE "%${search_string}%") `;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    let query = `SELECT l.* ${query_condition} ${order} LIMIT ${limit} OFFSET ${offset}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) ${query_condition}) as recordsFiltered 
            FROM client_call_logs WHERE clientID = ${req.params.id} AND name IS NOT NULL`;
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

router.post('/contacts/sync/:id', helperFunctions.verifyJWT, (req, res) => {
    db.getConnection((err, connection) => {
        if (err) throw err;

        let count = 0,
            errors = [];
        const contacts = req.body,
            query = 'INSERT INTO client_contacts SET ?',
            date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        async.forEach(contacts, (contact, callback) => {
            contact.date_created = date;
            contact.clientID = req.params.id;
            if (contact.emailAddresses) 
                contact.emailAddresses = JSON.stringify(contact.emailAddresses)
            if (contact.phoneNumbers) 
                contact.phoneNumbers = JSON.stringify(contact.phoneNumbers)
            if (contact.postalAddresses) 
                contact.postalAddresses = JSON.stringify(contact.postalAddresses)
            if (contact.urlAddresses) 
                contact.urlAddresses = JSON.stringify(contact.urlAddresses)
            connection.query(query, contact, (error, response) => {
                if (error) errors.push(error);
                else count++;
                callback();
            });
        }, data => {
            connection.release();
            res.send({
                "status": 200,
                "error": errors,
                "response": `${count} of ${contacts.length} contact(s) synced successfully`
            });
        });
    });
});

router.get('/contacts/get/:id', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let draw = req.query.draw;
    let limit = req.query.limit;
    let order = req.query.order;
    let offset = req.query.offset;
    let search_string = req.query.search_string.toUpperCase();
    let query_condition = `FROM client_contacts l WHERE clientID = ${req.params.id} AND l.displayName IS NOT NULL 
        AND (upper(l.displayName) LIKE "%${search_string}%" OR upper(l.emailAddresses) LIKE "%${search_string}%" OR upper(l.phoneNumbers) LIKE "%${search_string}%" 
        OR upper(l.company) LIKE "%${search_string}%" OR upper(l.department) LIKE "%${search_string}%" OR upper(l.jobTitle) LIKE "%${search_string}%") `;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    let query = `SELECT l.* ${query_condition} ${order} LIMIT ${limit} OFFSET ${offset}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) ${query_condition}) as recordsFiltered 
            FROM client_contacts WHERE clientID = ${req.params.id} AND displayName IS NOT NULL`;
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

router.post('/locations/sync/:id', helperFunctions.verifyJWT, (req, res) => {
    db.getConnection((err, connection) => {
        if (err) throw err;

        let count = 0;
        const locations = req.body,
            query = 'INSERT INTO client_locations SET ?',
            date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        async.forEach(locations, (location, callback) => {
            location.date_created = date;
            location.clientID = req.params.id;
            connection.query(query, location, (error, response) => {
                if (error) console.log(error);
                else count++;
                callback();
            });
        }, data => {
            connection.release();
            res.send({
                "status": 200,
                "error": null,
                "response": `${count} location(s) synced successfully`
            });
        });
    });
});

router.get('/locations/get/:id', (req, res) => {
    const query = `SELECT * FROM client_locations WHERE clientID = ${req.params.id}`;
    db.query(query, (error, locations) => {
        if (error) 
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        res.send({
            "status": 200,
            "error": null,
            "response": locations
        });
    });
});

router.get('/adverts/:id', helperFunctions.verifyJWT, (req, res) => {
    let adverts = [],
        advert_id = req.params.id,
        query = `SELECT a.* FROM adverts a WHERE a.status = ${enums.ADVERT.STATUS.ACTIVE} ORDER BY a.ID desc`;
    db.query(query, (error, response) => {
        if (error)
            return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

        async.forEach(response, (advert, callback) => {
            if (advert.client !== 'all' && !advert.client.split(',').includes(advert_id)) callback();
            else {
                const path = `files/advert_images/`;
                fs.readdir(path, (err, files) => {
                    if (err) files = [];
                    files = helperFunctions.removeFileDuplicates(path, files);
                    const image = (files.filter(file => {
                        return file.indexOf(`${advert.ID}_${advert.title.trim().replace(/ /g, '_')}`) > -1;
                    }))[0];
                    advert.image = `${process.env.HOST || req.HOST}/${(image)? `${path}${image}` : 'product.png'}`;
                    adverts.push(advert);
                    callback();
                });
            }
        }, data => {
            res.send({
                "status": 200,
                "error": null,
                "response": adverts
            });
        });
    });
});

router.post('/v2/verify/email/:id', helperFunctions.verifyJWT, (req, res) => {
    const otp = helperFunctions.generateOTP();
    const payload = {
        email_otp: otp,
        verify_email: enums.VERIFY_EMAIL.STATUS.NOT_VERIFIED,
        date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
    };
    let query = `SELECT email, fullname FROM clients WHERE ID = ${req.params.id}`;
    db.query(query, (error, client) => {
        if (!client[0]) return res.send({
            "status": 500,
            "error": 'User does not exist!',
            "response": null
        });

        query = `UPDATE clients SET ? WHERE ID = ${req.params.id}`;
        db.query(query, payload, (error, response) => {
            if (error)
                return res.send({
                    "status": 500,
                    "error": error,
                    "response": null
                });
    
            emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
                to: client[0].email,
                subject: 'Email Confirmation',
                template: 'myx3-default',
                context: {
                    name: client[0].fullname,
                    message: `This is a reminder that your email is pending verification. To verify your email address, Kindly use this OTP: ${otp}`
                }
            });
            return res.send({
                "status": 200,
                "error": null,
                "response": `Verification email sent to ${client[0].email} successfully!`
            });
        });
    });
});

router.get('/v2/verify/email/:id/:otp', helperFunctions.verifyJWT, (req, res) => {
    if (!req.params.otp) return res.status(500).send('Required parameter(s) not sent!');
    let query = `SELECT email_otp FROM clients WHERE ID = ${req.params.id}`;
    db.query(query, (error, client) => {
        if (!client[0]) return res.send({
            "status": 500,
            "error": 'User does not exist!',
            "response": null
        });

        if (Number(client[0]['email_otp']) !== Number(req.params.otp))
            return res.send({
                "status": 500,
                "error": 'Invalid OTP!',
                "response": null
            });

        query = `UPDATE clients Set ? WHERE ID = ${req.params.id}`;
        const payload = {
            verify_email: enums.VERIFY_EMAIL.STATUS.VERIFIED,
            date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
        };
        db.query(query, payload, (error, response) => {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

            return res.send({
                "status": 200,
                "error": null,
                "response": `Email verified successfully!`
            });
        });
    });
});

router.post('/v2/application/verify/email/:id/:application_id/:type', helperFunctions.verifyJWT, (req, res) => {
    if (!req.body.email || !req.params.application_id || !req.params.type)
        return res.status(500).send('Required parameter(s) not sent!');
    let email = req.body.email;
    let query = `SELECT email, fullname FROM clients WHERE ID = ${req.params.id}`;
    db.query(query, (error, client) => {
        if (!client[0]) return res.send({
            "status": 500,
            "error": 'User does not exist!',
            "response": null
        });

        const otp = helperFunctions.generateOTP();
        let payload = {
            email_otp: otp,
            date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
        };
        switch (req.params.type) {
            case 'work': {
                payload.verify_work_email = enums.VERIFY_EMAIL.STATUS.NOT_VERIFIED;
                break;
            }
        }
        query = `UPDATE preapplications SET ? WHERE ID = ${req.params.application_id}`;
        db.query(query, payload, error => {
            if (error)
                return res.send({
                    "status": 500,
                    "error": error,
                    "response": null
                });
    
            emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
                to: client[0].email,
                subject: `${req.params.type} email confirmation`,
                template: 'myx3-default',
                context: {
                    name: client[0].fullname,
                    message: `This is a reminder that your ${req.params.type} email (${email}) is pending verification. 
                        Kindly log in to your ${req.params.type} email for further instructions on how to proceed!`
                }
            });
            emailService.sendByDomain(process.env.MYX3_MAILGUN_DOMAIN, {
                to: email,
                subject: `${req.params.type} email confirmation`,
                template: 'myx3-default',
                context: {
                    name: client[0].fullname,
                    message: `This is a reminder that your email is pending verification. To verify to your email address, Kindly use this OTP: ${otp}`
                }
            });
            return res.send({
                "status": 200,
                "error": null,
                "response": `Verification email sent to ${email} successfully!`
            });
        });
    });
});

router.get('/v2/application/verify/email/:id/:application_id/:type/:otp', helperFunctions.verifyJWT, (req, res) => {
    if (!req.params.application_id || !req.params.type || !req.params.otp)
        return res.status(500).send('Required parameter(s) not sent!');

    let query = `SELECT email_otp FROM preapplications WHERE ID = ${req.params.application_id}`;
    db.query(query, (error, preapplication) => {
        if (!preapplication[0]) return res.send({
            "status": 500,
            "error": 'Application does not exist!',
            "response": null
        });

        if (Number(preapplication[0]['email_otp']) !== Number(req.params.otp))
            return res.send({
                "status": 500,
                "error": 'Invalid OTP!',
                "response": null
            });

        query = `UPDATE preapplications Set ? WHERE ID = ${req.params.application_id}`;
        let payload = {
            date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
        };
        switch (req.params.type) {
            case 'work': {
                payload.verify_work_email = enums.VERIFY_EMAIL.STATUS.VERIFIED;
                break;
            }
        }
        db.query(query, payload, error => {
            if (error) return res.send({
                "status": 500,
                "error": error,
                "response": null
            });

            return res.send({
                "status": 200,
                "error": null,
                "response": `${req.params.type} email verified successfully!`
            });
        });
    });
});

router.get('/myxalary/invite/:id/:invite_code', helperFunctions.verifyJWT, async (req, res) => {
    if (!req.params.invite_code) return res.status(500).send('Required parameter(s) not sent!');

    const invite_array = req.params.invite_code.split('-');
    const company_id = invite_array[0];
    const employee_id = invite_array[1];
    const employee = await helperFunctions.getMyXalaryEmployee(company_id, employee_id);
    if (!employee) return res.send({
        "status": 500,
        "error": 'Invalid invite code!',
        "response": null
    });

    const query = `SELECT address, dob, marital_status FROM clients WHERE ID = ${req.params.id}`;
    db.query(query, (error, client) => {
        if (error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });

        if (!client[0]) return res.send({
            "status": 500,
            "error": 'User does not exist!',
            "response": null
        });

        helperFunctions.syncMyXalaryClient(req.params.id, employee._id, client[0])
            .then(body => res.send({
                "status": 200,
                "error": null,
                "response": body.message,
                "payload": body.response
            }))
            .catch(error => res.send({
                "status": 500,
                "error": error.message,
                "response": null
            }));
    });
});

router.get('/myxalary/payslips/get/:id/:employee_id', helperFunctions.verifyJWT, async (req, res) => {
    if (!req.params.employee_id) return res.status(500).send('Required parameter(s) not sent!');

    const payslips = await helperFunctions.getMyXalaryEmployeePayslips(req.params.employee_id);
    if (!payslips) return res.send({
        "status": 500,
        "error": 'No payslip found!',
        "response": null
    });
    
    return res.send({
        "status": 200,
        "error": null,
        "response": payslips
    });
});

router.patch('/myxalary/bankaccount/setup/:id/:employee_id', helperFunctions.verifyJWT, (req, res) => {
    if (!req.params.employee_id) return res.status(500).send('Required parameter(s) not sent!');

    helperFunctions.setupMyXalaryEmployeeBankAccount(req.params.employee_id, req.body)
        .then(body => res.send({
            "status": 200,
            "error": null,
            "response": body.message
        }))
        .catch(error => res.send({
            "status": 500,
            "error": error.message,
            "response": null
        }));
});

router.post('/notification/push/:id', helperFunctions.verifySecretKey, (req, res) => {
    if (!req.params.id || !req.body) return res.status(500).send('Required parameter(s) not sent!');
    const { subject, message, data } = req.body;
    const query = `SELECT username FROM clients WHERE ID = ${req.params.id}`;
    db.query(query, (error, client) => {
        if (!client[0]) return res.send({
            "status": 500,
            "error": 'User does not exist!',
            "response": null
        });

        const options = {
            to: client[0].username,
            subject: subject,
            context: {
                message: message
            },
            data: data
        }
        firebaseService.send(options);
    
        return res.send({
            "status": 200,
            "error": null,
            "response": 'Push notification queued successfully!'
        });
    });
});

router.get('/myxalary/attendance/dashboard/get/:id/:employee_id', helperFunctions.verifyJWT, async (req, res) => {
    if (!req.params.employee_id) return res.status(500).send('Required parameter(s) not sent!');

    const attendance = await helperFunctions.getMyXalaryAttendanceDashboard(req.params.employee_id);
    if (!attendance) return res.send({
        "status": 500,
        "error": 'No attendance found!',
        "response": null
    });
    
    return res.send({
        "status": 200,
        "error": null,
        "response": attendance
    });
});

module.exports = router;