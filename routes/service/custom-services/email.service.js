let email = {},
    nodemailer = require('nodemailer'),
    hbs = require('nodemailer-express-handlebars'),
    mailgunTransport = require('nodemailer-mailgun-transport'),
    mailgunOptions = {
        auth: {
            api_key: process.env.MAILGUN_API_KEY,
            domain: process.env.MAILGUN_DOMAIN
        }
    },
    transport = mailgunTransport(mailgunOptions),
    options = {
        viewEngine: {
            extName: '.hbs',
            partialsDir: 'views/email',
            layoutsDir: 'views/email'
        },
        viewPath: 'views/email',
        extName: '.hbs'
    },
    transporter = nodemailer.createTransport(transport);
transporter.use('compile', hbs(options));

email.send = function (mailOptions) {
    if (!mailOptions.to) return console.log('Email recipient is required!');
    if (!mailOptions.subject) return console.log('Email subject is required!');
    if (process.env.ADMIN_EMAIL) mailOptions.to = mailOptions.to.concat(`,${process.env.ADMIN_EMAIL}`);
    mailOptions.from = mailOptions.from || 'no-reply@app.finratus.com';
    mailOptions.subject = `${process.env.TENANT}: ${mailOptions.subject}`;
    transporter.sendMail(mailOptions, function(error, info){
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

email.sendHtmlByDomain = function(domain, mailOptions) {
    if (!mailOptions.to) return console.log('Email recipient is required!');
    if (!mailOptions.subject) return console.log('Email subject is required!');

    mailgunOptions.auth.domain = domain;
    transport = mailgunTransport(mailgunOptions);
    transporter = nodemailer.createTransport(transport);

    mailOptions.from = mailOptions.from || `no-reply@${domain}`;
    transporter.sendMail(mailOptions, function(error, info){
        if (error) console.log(error);

        return info
    });
}

module.exports = email;