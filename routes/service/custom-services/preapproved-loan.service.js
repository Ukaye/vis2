const
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

router.get('/recommendations/get', function (req, res, next) {
    let query =
        `SELECT
            apps.userID,
            (SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID) AS invoices_due,

            (SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID) AS duration,

            round((round(((SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
            /(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID)),2) * 100),0) AS percentage_completion,

            ((SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID)
            -(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)) AS months_left,

            round(sum(apps.loan_amount)/count(apps.ID),2) as average_loan,
            (SELECT c.salary FROM clients c WHERE c.ID = apps.userID) AS salary,
            (SELECT c.salary FROM clients c WHERE c.ID = apps.userID)*6 AS salary_loan,

            (SELECT sum((CASE
						WHEN (SELECT sum(s.payment_amount) FROM schedule_history s WHERE s.status=1
						AND timestamp(s.payment_date)<=timestamp(date_add(a2.payment_collect_date, INTERVAL 3 DAY)) AND s.invoiceID = a2.ID) IS NULL THEN 1
					ELSE 0
					END))
            FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID) AS defaults2,

            sum((CASE
                WHEN (SELECT sum(s.payment_amount) FROM schedule_history s WHERE s.status=1
                AND timestamp(s.payment_date)<=timestamp(date_add(a.payment_collect_date, INTERVAL 3 DAY)) AND s.invoiceID = a.ID) IS NULL
				THEN 1
            ELSE
                0
            END)) AS defaults,

            (SELECT c.fullname FROM clients c WHERE c.ID = apps.userID) AS client,

            round((1-(round(((SELECT sum((CASE
									WHEN (SELECT sum(s.payment_amount) FROM schedule_history s WHERE s.status=1
									AND timestamp(s.payment_date)<=timestamp(date_add(a2.payment_collect_date, INTERVAL 3 DAY)) AND s.invoiceID = a2.ID) IS NULL THEN 1
								ELSE 0
								END))
						FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
						AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
                    /(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
					AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
					),2))
                )*100
            ,0) AS credit_score,

            round((CASE
                    WHEN ((SELECT c.salary FROM clients c WHERE c.ID = apps.userID)*6) > (round(sum(apps.loan_amount)/count(apps.ID),2))
                    THEN ((SELECT c.salary FROM clients c WHERE c.ID = apps.userID)*6)
                ELSE
                    (round(sum(apps.loan_amount)/count(apps.ID),2))
                END)
                *(round((1-(sum((CASE
                            WHEN (SELECT sum(s.payment_amount) FROM schedule_history s WHERE s.status=1
                            AND timestamp(s.payment_date)<=timestamp(date_add(a.payment_collect_date, INTERVAL 3 DAY)) AND s.invoiceID = a.ID) IS NULL THEN 1
                        ELSE
                            0
                        END))
                    /(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
					AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
				)),2))
			,2) AS loan_amount

        FROM application_schedules a, applications apps WHERE a.status=1 AND apps.status=2
        AND (SELECT p.ID FROM preapproved_loans p WHERE p.userID = apps.userID) IS NULL
        AND a.applicationID = apps.ID AND a.payment_collect_date < CURDATE()
        AND round((round(((SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
            /(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID)),2) * 100),0) > 50
		AND round((1-(round(((SELECT sum((CASE
									WHEN (SELECT sum(s.payment_amount) FROM schedule_history s WHERE s.status=1
									AND timestamp(s.payment_date)<=timestamp(date_add(a2.payment_collect_date, INTERVAL 3 DAY)) AND s.invoiceID = a2.ID) IS NULL THEN 1
								ELSE 0
								END))
						FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
						AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
                    /(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
					AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
					),2))
                )*100
            ,0) > 50
        GROUP BY apps.userID
        ORDER BY round((1-(round(((SELECT sum((CASE
									WHEN (SELECT sum(s.payment_amount) FROM schedule_history s WHERE s.status=1
									AND timestamp(s.payment_date)<=timestamp(date_add(a2.payment_collect_date, INTERVAL 3 DAY)) AND s.invoiceID = a2.ID) IS NULL THEN 1
								ELSE 0
								END))
						FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
						AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
                    /(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
					AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
					),2))
                )*100
            ,0) desc,
		round((round(((SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
            /(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID)),2) * 100),0) desc`;
    db.query(query, function (error, results, fields) {
        res.send({data:results});
    });
});

router.get('/recommendations/get/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT 
            apps.userID, 
            (SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
            AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID) AS invoices_due, 
            
            (SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID) AS duration, 
            
            round((SELECT count(a2.ID)/count(distinct(apps2.ID)) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID),0) AS tenor, 
            
            round((SELECT sum(apps2.interest_rate)/count(apps2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID),0) AS interest_rate, 
            
            date_format(date_add(CURDATE(), INTERVAL 1 month), '%Y-%m-%d') AS first_repayment_date,
            
            round((round(((SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
            AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
            /(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID)),2) * 100),0) AS percentage_completion, 
            
            ((SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID) 
            -(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
            AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)) AS months_left, 
            
            round(sum(apps.loan_amount)/count(apps.ID),2) as average_loan, 
            (SELECT c.salary FROM clients c WHERE c.ID = apps.userID) AS salary, 
            (SELECT c.salary FROM clients c WHERE c.ID = apps.userID)
            *(round((SELECT count(a2.ID)/count(distinct(apps2.ID)) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
            AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID),0)/2) AS salary_loan, 
            
            (SELECT sum((CASE
						WHEN (SELECT sum(s.payment_amount) FROM schedule_history s WHERE s.status=1  
						AND timestamp(s.payment_date)<=timestamp(date_add(a2.payment_collect_date, INTERVAL 3 DAY)) AND s.invoiceID = a2.ID) IS NULL THEN 1
					ELSE 0
					END)) 
            FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
            AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID) AS defaults2, 
            
            sum((CASE
                WHEN (SELECT sum(s.payment_amount) FROM schedule_history s WHERE s.status=1  
                AND timestamp(s.payment_date)<=timestamp(date_add(a.payment_collect_date, INTERVAL 3 DAY)) AND s.invoiceID = a.ID) IS NULL 
				THEN 1
            ELSE
                0
            END)) AS defaults,
            
            (SELECT c.fullname FROM clients c WHERE c.ID = apps.userID) AS client,
            
            round((1-(round(((SELECT sum((CASE
									WHEN (SELECT sum(s.payment_amount) FROM schedule_history s WHERE s.status=1  
									AND timestamp(s.payment_date)<=timestamp(date_add(a2.payment_collect_date, INTERVAL 3 DAY)) AND s.invoiceID = a2.ID) IS NULL THEN 1
								ELSE 0
								END)) 
						FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
						AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
                    /(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
					AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
					),2))
                )*100
            ,0) AS credit_score, 
            
            round((CASE
                    WHEN ((SELECT c.salary FROM clients c WHERE c.ID = apps.userID)
						*(round((SELECT count(a2.ID)/count(distinct(apps2.ID)) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
							AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID),0)/2)) 
						> (round(sum(apps.loan_amount)/count(apps.ID),2))
                    THEN ((SELECT c.salary FROM clients c WHERE c.ID = apps.userID)
						*(round((SELECT count(a2.ID)/count(distinct(apps2.ID)) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
							AND a2.applicationID = apps2.ID AND apps2.userID = apps.userID),0)/2))
                ELSE
                    (round(sum(apps.loan_amount)/count(apps.ID),2))
                END)
                *(round((1-(sum((CASE
                            WHEN (SELECT sum(s.payment_amount) FROM schedule_history s WHERE s.status=1 
                            AND timestamp(s.payment_date)<=timestamp(date_add(a.payment_collect_date, INTERVAL 3 DAY)) AND s.invoiceID = a.ID) IS NULL THEN 1
                        ELSE
                            0
                        END))
                    /(SELECT count(a2.ID) FROM application_schedules a2, applications apps2 WHERE a2.status=1 AND apps2.status=2 
					AND a2.applicationID = apps2.ID AND a2.payment_collect_date < CURDATE() AND apps2.userID = apps.userID)
				)),2))
			,2) AS loan_amount
                
        FROM application_schedules a, applications apps WHERE a.status=1 AND apps.status=2 
        AND (SELECT p.ID FROM preapproved_loans p WHERE p.userID = apps.userID) IS NULL 
        AND a.applicationID = apps.ID AND a.payment_collect_date < CURDATE() AND apps.userID = ${req.params.id}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send({
            data: (response.data === undefined) ? {} : response.data[0]
        });
    });
});

router.post('/create', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = {},
        postData = Object.assign({},req.body.application),
        preapproved_loan = Object.assign({},req.body.preapproved_loan),
        query =  'INSERT INTO applications Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    delete postData.email;
    delete postData.fullname;
    postData.status = 0;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    axios.post(url, postData)
        .then(function (response) {
            query = `SELECT * from applications WHERE ID = (SELECT MAX(ID) from applications)`;
            endpoint = `/core-service/get`;
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(function (response_) {
                query =  'INSERT INTO preapproved_loans Set ?';
                endpoint = `/core-service/post?query=${query}`;
                url = `${HOST}${endpoint}`;
                preapproved_loan.applicationID = response_['data'][0]['ID'];
                preapproved_loan.date_created = postData.date_created;
                preapproved_loan.expiry_date = moment().add(5, 'days').utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                preapproved_loan.hash = bcrypt.hashSync(postData.userID, parseInt(process.env.SALT_ROUNDS));
                axios.post(url, preapproved_loan)
                    .then(function (response__) {
                        data.name = req.body.fullname;
                        data.date = postData.date_created;
                        data.offer_url = `${HOST}/offer?t=${encodeURIComponent(preapproved_loan.hash)}`;
                        let mailOptions = {
                            from: 'no-reply Finratus <applications@loan35.com>',
                            to: req.body.email,
                            subject: 'Finratus Loan Application Offer',
                            template: 'offer',
                            context: data
                        };
                        transporter.sendMail(mailOptions, function(error, info){
                            if(error)
                                return res.send({status: 500, error: error, response: null});
                            return res.send(response_['data'][0]);
                        });
                }, err => {
                    res.send({status: 500, error: err, response: null});
                })
                .catch(function (error) {
                    res.send({status: 500, error: error, response: null});
                });
            }, err => {
                res.send({status: 500, error: err, response: null});
            })
            .catch(function (error) {
                res.send({status: 500, error: error, response: null});
            });
        }, err => {
            res.send({status: 500, error: err, response: null});
        })
        .catch(function (error) {
            res.send({status: 500, error: error, response: null});
        });
});

router.post('/reject', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let preapproved_loan = Object.assign({},req.body.preapproved_loan),
        query =  'INSERT INTO preapproved_loans Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    preapproved_loan.status = 0;
    preapproved_loan.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    axios.post(url, preapproved_loan)
        .then(function (response) {
            res.send(response.data);
        }, err => {
            res.send({status: 500, error: err, response: null});
        })
        .catch(function (error) {
            res.send({status: 500, error: error, response: null});
        });
});

router.get('/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT * FROM preapproved_loans p 
                 WHERE upper(p.client) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
                 OR upper(p.credit_score) LIKE "${search_string}%" ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM preapproved_loans p 
                 WHERE upper(p.client) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
                 OR upper(p.credit_score) LIKE "${search_string}%") as recordsFiltered FROM preapproved_loans`;
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

router.get('/get/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT p.*, c.fullname, c.email, c.salary, c.phone, c.bank, c.account, r.mandateId, r.requestId, r.remitaTransRef FROM preapproved_loans p INNER JOIN clients c ON p.userID = c.ID 
                LEFT JOIN remita_mandates r ON (r.applicationID = p.applicationID AND r.status = 1) WHERE (p.ID = '${decodeURIComponent(req.params.id)}' OR p.hash = '${decodeURIComponent(req.params.id)}')`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        if (response['data'][0]){
            const status_payload = {
                mandateId: response['data'][0]['mandateId'],
                requestId: response['data'][0]['requestId']
            };
            helperFunctions.mandateStatus(status_payload, function (remita_mandate_status) {
                query = `SELECT * FROM application_schedules WHERE applicationID = ${response['data'][0]['applicationID']} AND status = 1`;
                endpoint = '/core-service/get';
                url = `${HOST}${endpoint}`;
                axios.get(url, {
                    params: {
                        query: query
                    }
                }).then(response_ => {
                    let preapproved_loan = (response.data === undefined) ? {} : response.data[0];
                    preapproved_loan.schedule = (response_.data === undefined) ? [] : response_.data;
                    preapproved_loan.remita = remita_mandate_status;
                    preapproved_loan.merchantId = process.env.REMITA_MERCHANT_ID;
                    if (response['data'][0]['requestId'])
                        preapproved_loan.remita_hash = SHA512(preapproved_loan.merchantId + process.env.REMITA_API_KEY + response['data'][0]['requestId']);
                    res.send({
                        data: preapproved_loan
                    });
                });
            });
        } else {
            res.send({
                data: {}
            });
        }
    });
});

router.get('/delete/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `DELETE FROM preapproved_loans WHERE ID = ${req.params.id}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        res.send({
            data: (response.data === undefined) ? {} : response.data[0]
        });
    });
});

router.post('/offer/accept/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let offer = {},
        otp = req.body.otp,
        id = req.params.id,
        card = req.body.card,
        email = req.body.email,
        fullname = req.body.fullname,
        created_by = req.body.created_by,
        workflow_id = req.body.workflow_id,
        authorization = req.body.authorization,
        remitaTransRef = req.body.remitaTransRef,
        application_id = req.body.application_id,
        date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        query =  `UPDATE preapproved_loans Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`,
        validate_payload = {
            id: id,
            host: HOST,
            remitaTransRef: remitaTransRef,
            authParams: [
                {
                    param1: 'OTP',
                    value: otp
                },
                {
                    param2: 'CARD',
                    value: card
                }
            ]
        };

    helperFunctions.validateMandate(validate_payload, authorization, function (validation_response) {
        if (validation_response.statuscode === '00' || validation_response.statuscode === '02') {
            if (authorization === 'FORM' && !validation_response.isActive)
                return res.send({status: 500, error: {status: 'Your direct debit mandate is still pending activation.'}, response: null});
            offer.status = 2;
            offer.date_modified = date;
            axios.post(url, offer)
                .then(function (preapproved_response) {
                    let application = {};
                    query =  `UPDATE applications Set ? WHERE ID = ${application_id}`;
                    endpoint = `/core-service/post?query=${query}`;
                    url = `${HOST}${endpoint}`;
                    application.status = 1;
                    application.date_modified = date;
                    axios.post(url, application)
                        .then(function (application_response) {
                            let mailOptions = {
                                from: 'no-reply Finratus <applications@loan35.com>',
                                to: email,
                                subject: 'Finratus Application Successful',
                                template: 'main',
                                context: {
                                    name: fullname,
                                    date: date
                                }
                            };
                            transporter.sendMail(mailOptions, function(error, info){
                                if(error)
                                    res.send({status: 500, error: error, response: null});
                                helperFunctions.getNextWorkflowProcess(false,workflow_id,false, function (process) {
                                    query =  'INSERT INTO workflow_processes Set ?';
                                    endpoint = `/core-service/post?query=${query}`;
                                    url = `${HOST}${endpoint}`;
                                    process.workflowID = workflow_id;
                                    process.agentID = created_by;
                                    process.applicationID = application_id;
                                    process.date_created = date;
                                    axios.post(url, process)
                                        .then(function (process_response) {
                                            res.send(process_response.data);
                                        }, err => {
                                            res.send({status: 500, error: err, response: null});
                                        })
                                        .catch(function (error) {
                                            res.send({status: 500, error: error, response: null});
                                        });
                                });
                            });
                        }, err => {
                            res.send({status: 500, error: err, response: null});
                        })
                        .catch(function (error) {
                            res.send({status: 500, error: error, response: null});
                        });
                }, err => {
                    res.send({status: 500, error: err, response: null});
                })
                .catch(function (error) {
                    res.send({status: 500, error: error, response: null});
                });
        } else {
            res.send({status: 500, error: validation_response, response: null});
        }
    });
});

router.get('/offer/decline/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let offer = {},
        query =  `UPDATE preapproved_loans Set ? WHERE ID = ${req.params.id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    offer.status = 3;
    offer.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    axios.post(url, offer)
        .then(function (response) {
            res.send(response.data);
        }, err => {
            res.send({status: 500, error: err, response: null});
        })
        .catch(function (error) {
            res.send({status: 500, error: error, response: null});
        });
});

router.get('/mandate/get/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT r.mandateId, r.requestId FROM preapproved_loans p LEFT JOIN remita_mandates r ON (r.applicationID = p.applicationID AND r.status = 1) 
                WHERE (p.ID = '${decodeURIComponent(req.params.id)}' OR p.hash = '${decodeURIComponent(req.params.id)}')`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
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

module.exports = router;