const axios = require('axios'),
    moment = require('moment'),
    express = require('express'),
    router = express.Router(),
    helperFunctions = require('../../../helper-functions');

//Get Investment Product
router.get('/all', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let page = ((req.query.page - 1) * 10 < 0) ? 0 : (req.query.page - 1) * 10;
    let search_string = (req.query.search_string === undefined) ? "" : req.query.search_string.toUpperCase();
    let query = `SELECT ID,fullname FROM clients WHERE status = 1 AND upper(email) LIKE "${search_string}%" OR upper(fullname) LIKE "${search_string}%" ORDER BY ID desc LIMIT ${limit} OFFSET ${page}`;
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
        application_id = req.body.application_id,
        date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        query =  `INSERT INTO remita_mandates Set ?`;

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
            helperFunctions.authorizeMandate(authorize_payload, function (authorization_response) {
                if (authorization_response && authorization_response.remitaTransRef){
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
                        if (remita_mandate.data[0]){
                            query =  `UPDATE remita_mandates Set ? WHERE ID = ${remita_mandate.data[0]['ID']}`;
                        }
                        const endpoint = `/core-service/post?query=${query}`,
                            url = `${HOST}${endpoint}`;
                        axios.post(url, payload)
                            .then(function (remita_response) {
                                res.send(authorization_response);
                            }, err => {
                                res.send({status: 500, error: error, response: null});
                            })
                            .catch(function (error) {
                                res.send({status: 500, error: error, response: null});
                            });
                    });
                } else {
                    res.send({status: 500, error: authorization_response, response: null});
                }
            })
        } else {
            res.send({status: 500, error: setup_response, response: null});
        }
    });
});

router.get('/mandate/get/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = `SELECT r.mandateId, r.requestId FROM preapproved_loans p LEFT JOIN remita_mandates r ON r.applicationID = p.applicationID 
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