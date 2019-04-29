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

router.post('/payment/create', function (req, res, next) {
    let payment = req.body;
    helperFunctions.sendDebitInstruction(payment, function (response) {
        res.send(response);
    });
});

router.get('/payments/get/:applicationID', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query =  `SELECT mandateId, requestId FROM remita_mandates WHERE applicationID = ${req.params.applicationID}`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let remita_mandate = response.data[0];
        if (remita_mandate) {
            helperFunctions.mandatePaymentHistory({
                mandateId: remita_mandate.mandateId,
                requestId: remita_mandate.requestId
            }, function (history_response) {
                console.log(history_response)
                if (history_response) {

                }
            })
        } else {
            res.send({status: 500, error: 'There is no remita mandate setup for this application', response: []});
        }
    });
});

module.exports = router;