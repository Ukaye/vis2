let email = {},
    nodemailer = require('nodemailer'),
    hbs = require('nodemailer-express-handlebars'),
    mailgunTransport = require('nodemailer-mailgun-transport'),
    mailgunOptions = {
        auth: {
            api_key: process.env.MAILGUN_API_KEY,
            domain: process.env.DOMAIN
        }
    },
    transport = mailgunTransport(mailgunOptions),
    options = {
        viewPath: 'views/email',
        extName: '.hbs'
    },
    transporter = nodemailer.createTransport(transport);
transporter.use('compile', hbs(options));

email.send = function (mailOptions) {
    if (!mailOptions.to) return console.log('Email recipient is required!');
    if (!mailOptions.subject) return console.log('Email subject is required!');
    mailOptions.from = mailOptions.from || 'no-reply@x3.loanratus.com';
    mailOptions.subject = `${process.env.TENANT}: ${mailOptions.subject}`;
    transporter.sendMail(mailOptions, function(error, info){
        console.log(info)
        console.log(error)
        if (error) console.log(error);
    });
};

email.sendByDomain = function (domain, mailOptions) {
    if (!mailOptions.to) return console.log('Email recipient is required!');
    if (!mailOptions.subject) return console.log('Email subject is required!');

    mailgunOptions.auth.domain = domain;
    transport = mailgunTransport(mailgunOptions);
    transporter = nodemailer.createTransport(transport);
    transporter.use('compile', hbs(options));

    mailOptions.from = mailOptions.from || `no-reply@${domain}`;
    transporter.sendMail(mailOptions, function(error, info){
        if (error) console.log(error);
    });
};

module.exports = email;