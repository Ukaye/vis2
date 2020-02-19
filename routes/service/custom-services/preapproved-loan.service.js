const
    axios = require('./axios'),
    moment = require('moment'),
    db = require('../../../db'),
    bcrypt = require('bcryptjs'),
    express = require('express'),
    router = express.Router(),
    SHA512 = require('js-sha512'),
    helperFunctions = require('../../../helper-functions'),
    emailService = require('../custom-services/email.service');

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
        AND (SELECT count(p.ID) FROM preapproved_loans p WHERE p.userID = apps.userID) = 0
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
        AND (SELECT count(p.ID) FROM preapproved_loans p WHERE p.userID = apps.userID) = 0 
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

/**
 * 1. Preapproved Loan Offer
 * 2. Direct Debit Mandate Setup
 */
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

    getApplicationID(req, query, postData, function (error, response) {
        if(error){
            res.send({status: 500, error: error, response: null});
        } else {
            let applicationID = req.body.applicationID || '(SELECT MAX(ID) from applications)';
            query = `SELECT a.*, (SELECT u.phone FROM users u WHERE u.ID = (SELECT c.loan_officer FROM clients c WHERE c.ID = a.userID)) AS contact 
                    FROM applications a WHERE a.ID = ${applicationID}`;
            endpoint = `/core-service/get`;
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).
            then(function (response_) {
                query =  'INSERT INTO preapproved_loans Set ?';
                endpoint = `/core-service/post?query=${query}`;
                url = `${HOST}${endpoint}`;
                preapproved_loan.applicationID = req.body.applicationID ||  response_['data'][0]['ID'];
                preapproved_loan.date_created = postData.date_created;
                preapproved_loan.expiry_date = moment().add(5, 'days').utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                preapproved_loan.hash = bcrypt.hashSync(postData.userID, parseInt(process.env.SALT_ROUNDS));
                db.query(query, preapproved_loan, function (error, response__) {
                    if(error){
                        res.send({status: 500, error: error, response: null});
                    } else {
                        data.name = req.body.fullname;
                        data.date = postData.date_created;
                        data.expiry = preapproved_loan.expiry_date;
                        data.contact = response_['data'][0]['contact'];
                        data.amount = helperFunctions.numberToCurrencyFormatter(postData.loan_amount);
                        data.offer_url = `${HOST}/offer?t=${encodeURIComponent(preapproved_loan.hash)}`;
                        if (req.body.applicationID)
                            data.offer_url = data.offer_url.concat(`&i=${req.body.applicationID}`);
                        let mailOptions = {
                            to: req.body.email,
                            subject: 'Loan Application Offer',
                            template: 'offer',
                            context: data
                        };
                        if (req.body.applicationID) {
                            mailOptions.template = 'mandate';
                            mailOptions.subject = 'Mandate Setup';
                        }
                        emailService.send(mailOptions);
                        return res.send(response_['data'][0]);
                    }
                });
            }, err => {
                res.send({status: 500, error: err, response: null});
            })
            .catch(function (error) {
                res.send({status: 500, error: error, response: null});
            });
        }
    });
});

function getApplicationID(req, query, postData, callback) {
    if (!req.body.applicationID) {
        db.query(query, postData, function (error, response) {
            if(error){
                callback(error, null);
            } else {
                callback(null, response);
            }
        });
    } else {
        callback(null, null);
    }
}

router.post('/reject', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let preapproved_loan = Object.assign({},req.body.preapproved_loan),
        query =  'INSERT INTO preapproved_loans Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    preapproved_loan.status = 0;
    preapproved_loan.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, preapproved_loan, function (error, response) {
        if(error){
            res.send({status: 500, error: error, response: null});
        } else {
            res.send(response.data);
        }
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



// remita error 

router.get('/get/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT 
                    p.*,
                    c.fullname,
                    c.email,
                    c.salary,
                    c.phone,
                    (CASE WHEN (a.bank IS NOT NULL) THEN a.bank ELSE c.bank END) bank, 
                    (CASE WHEN (a.account IS NOT NULL) THEN a.account ELSE c.account END) account,
                    r.mandateId,
                    r.requestId,
                    r.remitaTransRef,
                    r.authParams
                FROM
                    preapproved_loans p
                        INNER JOIN
                    clients c ON p.userID = c.ID
                        LEFT JOIN
                    remita_mandates r ON (r.applicationID = p.applicationID
                        AND r.status = 1)
                        INNER JOIN
                    applications a ON a.ID = p.applicationID
                WHERE
                    (p.ID = '${decodeURIComponent(req.params.id)}' OR p.hash = '${decodeURIComponent(req.params.id)}')
                AND p.status = 1`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    if (req.query.key === 'userID') {
        query = `SELECT p.*, c.fullname, c.email, c.salary, r.mandateId, 
        (CASE WHEN (a.bank IS NOT NULL) THEN a.bank ELSE c.bank END) bank, (CASE WHEN (a.account IS NOT NULL) THEN a.account ELSE c.account END) account, 
        r.requestId, r.remitaTransRef, r.authParams FROM preapproved_loans p INNER JOIN clients c ON p.userID = c.ID 
        LEFT JOIN remita_mandates r ON (r.applicationID = p.applicationID AND r.status = 1) INNER JOIN applications a ON a.ID = p.applicationID 
        WHERE p.userID = '${req.params.id}' AND p.status = 1`;
    }
    if (req.query.key === 'applicationID') {
        query = `SELECT p.*, c.fullname, c.email, c.salary, r.mandateId, 
        (CASE WHEN (a.bank IS NOT NULL) THEN a.bank ELSE c.bank END) bank, (CASE WHEN (a.account IS NOT NULL) THEN a.account ELSE c.account END) account, 
        r.requestId, r.remitaTransRef, r.authParams FROM preapproved_loans p INNER JOIN clients c ON p.userID = c.ID 
        LEFT JOIN remita_mandates r ON (r.applicationID = p.applicationID AND r.status = 1) INNER JOIN applications a ON a.ID = p.applicationID 
        WHERE p.applicationID = '${req.params.id}' AND p.status = 1`;
    }
    console.log(query)
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
        id = req.params.id,
        email = req.body.email,
        fullname = req.body.fullname,
        authParams = req.body.authParams,
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
            authParams: authParams,
            remitaTransRef: remitaTransRef
        };

    helperFunctions.validateMandate(validate_payload, authorization, function (validation_response) {
        if (validation_response.statuscode === '00' || validation_response.statuscode === '02') {
            if (authorization === 'FORM' && !validation_response.isActive)
                return res.send({status: 500, error: {status: 'Your direct debit mandate is still pending activation.'}, response: null});
            offer.status = 2;
            offer.date_modified = date;
            db.query(query, offer, function (error, preapproved_response) {
                if(error) {
                    res.send({status: 500, error: error, response: null});
                } else {
                    let application = {};
                    query =  `UPDATE applications Set ? WHERE ID = ${application_id}`;
                    endpoint = `/core-service/post?query=${query}`;
                    url = `${HOST}${endpoint}`;
                    application.status = 1;
                    application.date_modified = date;
                    db.query(query, application, function (error, application_response) {
                        if(error) {
                            res.send({status: 500, error: error, response: null});
                        } else {
                            let mailOptions = {
                                to: email,
                                subject: 'Application Successful',
                                template: 'main',
                                context: {
                                    name: fullname,
                                    date: date
                                }
                            };
                            emailService.send(mailOptions);
                            helperFunctions.getNextWorkflowProcess(false,workflow_id,false, function (process, stage) {
                                query =  'INSERT INTO workflow_processes Set ?';
                                endpoint = `/core-service/post?query=${query}`;
                                url = `${HOST}${endpoint}`;
                                process.workflowID = workflow_id;
                                process.agentID = created_by;
                                process.applicationID = application_id;
                                process.date_created = date;
                                db.query(query, process, function (error, process_response) {
                                    if(error) {
                                        res.send({status: 500, error: error, response: null});
                                    } else {
                                        if(stage) helperFunctions.workflowApprovalNotification(process, stage, workflow_id);
                                        res.send(process_response);
                                    }
                                });
                            });
                        }
                    });
                }
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
    db.query(query, offer, function (error, response) {
        if(error) {
            res.send({status: 500, error: error, response: null});
        } else {
            res.send(response);
        }
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