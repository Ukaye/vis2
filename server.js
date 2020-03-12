// Loads the environment variables from the .env file
require('dotenv').config();


let express = require('express');
let fs = require('fs'),
    db = require('./db'),
    http = require('http'),
    bcrypt = require('bcryptjs'),
    bodyParser = require('body-parser'),
    session = require('client-sessions'),
    cookieParser = require('cookie-parser'),
    notificationsService = require('./routes/notifications-service'),
    compression = require('compression'),
    fileUpload = require('express-fileupload');

//check and create uploads directory
if (!fs.existsSync('./files')) {
    fs.mkdirSync('./files');
    console.log('Files folder created');
} else {
    console.log('Files folder exists');
}

if (fs.existsSync('./files')) {
    if (!fs.existsSync('./files/users')) {
        fs.mkdirSync('./files/users');
        console.log('Users folder created');
    } else {
        console.log('Users folder exists');
    }
}

if (fs.existsSync('./files')) {
    if (!fs.existsSync('./files/activities')) {
        fs.mkdirSync('./files/activities');
        console.log('Activities folder created');
    } else {
        console.log('Activities folder exists');
    }
}

let app = express(),
    cors = require('cors'),
    user = require('./routes/users'),
    settings = require('./routes/service/custom-services/settings.service'),
    investment = require('./routes/investment'),
    core_service = require('./routes/service/core-service'),
    client_service = require('./routes/service/custom-services/client.service'),
    investment_product_service = require('./routes/service/custom-services/investment-product.service'),
    investment_service = require('./routes/service/custom-services/investment.service'),
    investment_interest_service = require('./routes/service/custom-services/investment-interest.service'),
    inv_transaction_service = require('./routes/service/custom-services/transaction.service'),
    preapproved_loan_service = require('./routes/service/custom-services/preapproved-loan.service'),
    preapplication_service = require('./routes/service/custom-services/preapplication.service'),
    collection_service = require('./routes/service/custom-services/collection.service'),
    remita_service = require('./routes/service/custom-services/remita.service'),
    paystack_service = require('./routes/service/custom-services/paystack.service'),
    xero_service = require('./routes/service/custom-services/xero.service'),
    application_service = require('./routes/service/custom-services/application.service'),
    audit_service = require('./routes/service/custom-services/audit.service'),
    payment_service = require('./routes/service/custom-services/payment.service'),
    notification = require('./routes/notifications'),
    upload_service = require('./routes/service/custom-services/upload.service'),
    index = require('./routes/index'),
    atbmailer_service = require('./routes/service/custom-services/atbmailer.service');

app.use(compression());    
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(bodyParser.json({
    limit: '50mb',
    extended: true,
    parameterLimit: 1000000
}));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 1000000
}));
app.use(express.static(__dirname + '/views'));
app.use(cookieParser());
app.use(fileUpload());
app.use(cors());

//Session 
app.use(session({
    cookieName: 'session',
    secret: 'eg[isfd-8yF9-7w2315df{}+Ijsli;;to8',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    secure: true,
    ephemeral: true
}));

app.use((req, res, next) => {
    if (Number(req.headers['content-length']) > Number(process.env.FILE_SIZE_LIMIT))
        return res.status(413).send('File exceeds the maximum upload size limit!');
    next();
});

app.post('/login', function (req, res) {
    let user = [],
        username = req.body.username,
        password = req.body.password;

    db.query('SELECT *, (select role_name from user_roles r where r.id = user_role) as role FROM users WHERE username = ?', username, function (err, rows, fields) {
        if (err)
            return res.send({
                "status": 500,
                "error": err,
                "response": "Connection Error!"
            });

        if (rows.length === 0)
            return res.send({
                "status": 500,
                "response": "Incorrect Username/Password!"
            });

        if (rows[0].status === "0")
            return res.send({
                "status": 500,
                "response": "User Disabled!"
            });

        if (bcrypt.compareSync(password, rows[0].password)) {
            req.session.user = rows[0]['user_role'];
            user = rows[0];
            db.query('SELECT id,module_id, (select module_name from modules m where m.id = module_id) as module_name, (select menu_name from modules m where m.id = module_id) as menu_name, read_only, editable ' +
                'FROM permissions where role_id = ? and date = (select date from permissions where role_id = ? and id = (select max(id) from permissions where role_id = ?)) group by module_id', [parseInt(user.user_role), parseInt(user.user_role), parseInt(user.user_role)],
                function (error, perm, fields) {
                    if (!error) {
                        user.permissions = perm;
                        let modules = [],
                            query1 = 'select * from modules m where m.id in (select p.module_id from permissions p where read_only = 1 ' +
                            'and p.role_id = ? and date = (select date from permissions where role_id = ? and id = (select max(id) from permissions where role_id = ?)) group by module_id) and menu_name = "Main Menu" order by id asc',
                            query2 = 'select * from modules m where m.id in (select p.module_id from permissions p where read_only = 1 ' +
                            'and p.role_id = ? and date = (select date from permissions where role_id = ? and id = (select max(id) from permissions where role_id = ?)) group by module_id) and menu_name = "Sub Menu" order by id asc',
                            query3 = 'select * from modules m where m.id in (select p.module_id from permissions p where read_only = 1 ' +
                            'and p.role_id = ? and date = (select date from permissions where role_id = ? and id = (select max(id) from permissions where role_id = ?)) group by module_id) and menu_name = "Others" order by id asc';
                        db.query(query1, [user.user_role, user.user_role, user.user_role], function (er, mods, fields) {
                            modules = modules.concat(mods);
                            db.query(query2, [user.user_role, user.user_role, user.user_role], function (er, mods, fields) {
                                modules = modules.concat(mods);
                                user.modules = modules;
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
                                    "response": user
                                });
                            });
                        });
                    } else {
                        res.send({
                            "status": 500,
                            "error": error,
                            "response": "No permissions set for this user"
                        })
                    }
                });
        } else {
            res.send({
                "status": 500,
                "response": "Password is incorrect!"
            });
        }
    });
});

function requireLogin(req, res, next) {
    if (!req.cookies.timeout) {
        res.sendFile('index.html', {
            root: __dirname + '/views'
        });
    } else {
        let url = req.originalUrl;
        if (url) {
            var page = url.split('/')[1].split('?')[0];
            let name = 'Others'
            let role = parseInt(req.session.user);
            let query = 'SELECT id,module_id, (select module_name from modules m where m.id = module_id) as module_name, read_only, editable FROM permissions where role_id = ? ' +
                'and ((select menu_name from modules m where m.id = module_id) <> ?) and date = (select date from permissions where role_id = ? and id = (select max(id) from permissions where role_id = ?)) group by module_id'
            db.query(query, [role, name, role], function (error, result, fields) {
                if (!error) {
                    let status = true;
                    for (let i = 0; i < result.length; i++) {
                        if (result[i].module_name === page) {
                            if (!(result[i].read_only === '1'))
                                status = false;
                        }
                        if (i === result.length - 1) {
                            if (status) {
                                next();
                            } else {
                                // return res.redirect('/logon');
                                res.sendFile('index.html', {
                                    root: __dirname + '/views'
                                });
                            }
                        }
                    }
                } else {
                    next()
                }
            });
        } else {
            next();
        }
    }
}

app.get('/logout', function (req, res) {
    req.session.reset();
    res.redirect('/logon');
});

//create mail routes
app.get('/atbmailer', requireLogin, function(req, res) {
    res.sendFile('/atbmailer/index.html', {
        root: __dirname + '/views'
    });
});

app.get('/atbmailer/send', requireLogin, function(req, res) {
    res.sendFile('/atbmailer/send.html', {
        root: __dirname + '/views'
    });
});

app.get('/atbmailer/unsubscribe', function(req, res) {
    res.sendFile('/atbmailer/unsubscribe.html', {
        root: __dirname + '/views'
    });
});

app.get('/atbmailer/promotions', requireLogin, function(req, res) {
    res.sendFile('/atbmailer/promotions.html', {
        root: __dirname + '/views'
    });
});

app.use('/', index);
app.use('/user', user);
app.use('/settings', settings);
app.use('/investment', investment);
app.use('/client', client_service);
app.use('/core-service', core_service);
app.use('/investment-service', investment_service);
app.use('/investment-products', investment_product_service);
app.use('/investment-txns', inv_transaction_service);
app.use('/preapproved-loan', preapproved_loan_service);
app.use('/preapplication', preapplication_service);
app.use('/collection', collection_service);
app.use('/investment-interests', investment_interest_service);
// app.use('/notification-service', notification_service);
app.use('/remita', remita_service);
app.use('/paystack', paystack_service);
app.use('/xero', xero_service);
app.use('/application', application_service);
app.use('/audit', audit_service);
app.use('/payment', payment_service);
app.use('/notifications', notification);
app.use('/upload', upload_service);
app.use('/atbmailer', atbmailer_service);
app.use('/files', express.static(__dirname + '/files'));

app.get('/logon', function (req, res) {
    res.sendFile('index.html', {
        root: __dirname + '/views'
    });
});

app.get('/dashboard', requireLogin, function (req, res) {
    res.sendFile('dashboard.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-vehicles', requireLogin, function (req, res) {
    res.sendFile('all-vehicles.html', {
        root: __dirname + '/views/vehicles/all-vehicles'
    });
});

app.get('/all-users', requireLogin, function (req, res) {
    res.sendFile('all-users.html', {
        root: __dirname + '/views/user/all-users'
    });
});

app.get('/all-applications', requireLogin, function (req, res) {
    res.sendFile('application/all-applications/all-applications.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-collections', requireLogin, function (req, res) {
    res.sendFile('collection/all-collections/all-collections.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-owners', requireLogin, function (req, res) {
    res.sendFile('all-owners.html', {
        root: __dirname + '/views'
    });
});

app.get('/add-vehicle', requireLogin, function (req, res) {
    res.sendFile('add-vehicles.html', {
        root: __dirname + '/views/vehicles/add-vehicle'
    });
});

app.get('/add-user', requireLogin, function (req, res) {
    res.sendFile('add-user.html', {
        root: __dirname + '/views/user/add-user'
    });
});

app.get('/add-owner', requireLogin, function (req, res) {
    res.sendFile('add-owner.html', {
        root: __dirname + '/views'
    });
});

app.get('/add-model', requireLogin, function (req, res) {
    res.sendFile('add-model.html', {
        root: __dirname + '/views/car-models/add-model'
    });
});

app.get('/all-models', requireLogin, function (req, res) {
    res.sendFile('all-models.html', {
        root: __dirname + '/views/car-models/all-models'
    });
});

app.get('/inspections', requireLogin, function (req, res) {
    res.sendFile('inspections.html', {
        root: __dirname + '/views'
    });
});

app.get('/branches', requireLogin, function (req, res) {
    res.sendFile('branches.html', {
        root: __dirname + '/views'
    });
});

app.get('/reports', requireLogin, function (req, res) {
    res.sendFile('reports.html', {
        root: __dirname + '/views'
    });
});

app.get('/add-workflow', requireLogin, function (req, res) {
    res.sendFile('workflow/add-workflow/add-workflow.html', {
        root: __dirname + '/views'
    });
});

app.get('/application/:id?', requireLogin, function (req, res) {
    res.sendFile('/application/view-application/view-application.html', {
        root: __dirname + '/views'
    });
});

app.get('/edit-workflow/:id?', requireLogin, function (req, res) {
    res.sendFile('workflow/edit-workflow/edit-workflow.html', {
        root: __dirname + '/views'
    });
});

app.get('/manage-permissions', requireLogin, function (req, res) {
    res.sendFile('manage-permissions.html', {
        root: __dirname + '/views/settings/permissions'
    });
});

app.get('/module', requireLogin, function (req, res) {
    res.sendFile('modules.html', {
        root: __dirname + '/views'
    });
});

app.get('/add-application', requireLogin, function (req, res) {
    res.sendFile('/application/add-application/add-application.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-workflow', requireLogin, function (req, res) {
    res.sendFile('workflow/all-workflow/all-workflow.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-requests', requireLogin, function (req, res) {
    res.sendFile('all-requests.html', {
        root: __dirname + '/views/application/all-requests'
    });
});

app.get('/loan-repayment', requireLogin, function (req, res) {
    res.sendFile('collection/loan-repayment/loan-repayment.html', {
        root: __dirname + '/views'
    });
});

app.get('/add-client', requireLogin, function (req, res) {
    res.sendFile('add-client.html', {
        root: __dirname + '/views/client/add-client'
    });
});

app.get('/all-clients', requireLogin, function (req, res) {
    res.sendFile('all-clients.html', {
        root: __dirname + '/views/client/all-clients'
    });
});

app.get('/client-info', requireLogin, function (req, res) {
    res.sendFile('client/client-info/client-info.html', {
        root: __dirname + '/views'
    });
});

app.get('/incomplete-records', requireLogin, function (req, res) {
    res.sendFile('client/client-info/incomplete-records.html', {
        root: __dirname + '/views'
    });
});

app.get('/loan-reports', requireLogin, function (req, res) {
    res.sendFile('loan-reports.html', {
        root: __dirname + '/views'
    });
});

app.get('/forgot-password/:id?', function (req, res) {
    res.sendFile('forgot-password.html', {
        root: __dirname + '/views'
    });
});

app.get('/activity', requireLogin, function (req, res) {
    res.sendFile('activity/activity.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-targets', requireLogin, function (req, res) {
    res.sendFile('target/all-targets/all-targets.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-teams', requireLogin, function (req, res) {
    res.sendFile('all-teams.html', {
        root: __dirname + '/views/user/teams'
    });
});

app.get('/target-dashboard', requireLogin, function (req, res) {
    res.sendFile('target/target-dashboard/target-dashboard.html', {
        root: __dirname + '/views'
    });
});

app.get('/activity-settings', requireLogin, function (req, res) {
    res.sendFile('activity-settings.html', {
        root: __dirname + '/views/settings/activity-settings'
    });
});

app.get('/notification-settings', requireLogin, function (req, res) {
    res.sendFile('notification-settings.html', {
        root: __dirname + '/views/settings/notification-settings'
    });
});

app.get('/loan-classification-settings', requireLogin, function (req, res) {
    res.sendFile('loan-classification-settings.html', {
        root: __dirname + '/views/settings/loan-classification'
    });
});

app.get('/all-periods', requireLogin, function (req, res) {
    res.sendFile('target/all-periods/all-periods.html', {
        root: __dirname + '/views'
    });
});

app.get('/commission-profile', requireLogin, function (req, res) {
    res.sendFile('/settings/commission-profile/commission-profile.html', {
        root: __dirname + '/views'
    });
});

app.get('/integrations', requireLogin, function (req, res) {
    res.sendFile('/settings/integrations/integrations.html', {
        root: __dirname + '/views'
    });
});

app.get('/commission-dashboard', requireLogin, function (req, res) {
    res.sendFile('commission/commission-dashboard/commission-dashboard.html', {
        root: __dirname + '/views'
    });
});

app.get('/add-investment-products', requireLogin, function (req, res) {
    res.sendFile('investment/add-product/investment-products.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-investment-products', requireLogin, function (req, res) {
    res.sendFile('investment/all-product/all-investment-products.html', {
        root: __dirname + '/views'
    });
});

app.get('/add-investments', requireLogin, function (req, res) {
    res.sendFile('investment/add-investment/add-investment.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-investments', requireLogin, function (req, res) {
    res.sendFile('investment/all-investment/all-investment.html', {
        root: __dirname + '/views'
    });
});

app.get('/investment-transactions', requireLogin, function (req, res) {
    res.sendFile('investment/transaction/transaction.html', {
        root: __dirname + '/views'
    });
});

app.get('/investment-settings', requireLogin, function (req, res) {
    res.sendFile('investment/settings/settings.html', {
        root: __dirname + '/views'
    });
});

app.get('/investment-charges', requireLogin, function (req, res) {
    res.sendFile('investment/charges-taxes/charges-taxes.html', {
        root: __dirname + '/views'
    });
});

app.get('/investment-statements/:id?', requireLogin, function (req, res) {
    res.sendFile('investment/statement/statement.html', {
        root: __dirname + '/views'
    });
});

// app.get('/mature-investments', requireLogin, function (req, res) {
//     res.sendFile('investment/all-product/all-investment-products.html', {
//         root: __dirname + '/views'
//     });
// });

app.get('/all-commissions', requireLogin, function (req, res) {
    res.sendFile('commission/all-commissions/all-commissions.html', {
        root: __dirname + '/views'
    });
});

app.get('/application-settings', requireLogin, function (req, res) {
    res.sendFile('settings/application-settings/application-settings.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-suggested-loans', requireLogin, function (req, res) {
    res.sendFile('preapproved-loan/all-suggested-loans/all-suggested-loans.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-preapproved-loans', requireLogin, function (req, res) {
    res.sendFile('preapproved-loan/all-preapproved-loans/all-preapproved-loans.html', {
        root: __dirname + '/views'
    });
});

app.get('/edit-preapproved-loan/:id?', requireLogin, function (req, res) {
    res.sendFile('preapproved-loan/edit-preapproved-loan/edit-preapproved-loan.html', {
        root: __dirname + '/views'
    });
});

app.get('/view-preapproved-loan/:id?', requireLogin, function (req, res) {
    res.sendFile('preapproved-loan/view-preapproved-loan/view-preapproved-loan.html', {
        root: __dirname + '/views'
    });
});

app.get('/offer/:id?', function (req, res) {
    res.sendFile('preapproved-loan/offer/offer.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-preapplications', requireLogin, function (req, res) {
    res.sendFile('application/all-preapplications/all-preapplications.html', {
        root: __dirname + '/views'
    });
});

app.get('/all-client-applications', requireLogin, function (req, res) {
    res.sendFile('application/client-applications/all-client-applications/all-client-applications.html', {
        root: __dirname + '/views'
    });
});

app.get('/view-client-application', requireLogin, function (req, res) {
    res.sendFile('application/client-applications/view-client-applications/view-client-applications.html', {
        root: __dirname + '/views'
    });
});

app.get('/bulk-upload', requireLogin, function (req, res) {
    res.sendFile('collection/bulk-upload/bulk-upload.html', {
        root: __dirname + '/views'
    });
});

app.get('/bulk-collection', requireLogin, function (req, res) {
    res.sendFile('collection/bulk-collection/bulk-collection.html', {
        root: __dirname + '/views'
    });
});

app.get('/remita-collection', requireLogin, function (req, res) {
    res.sendFile('remita/remita-collection/remita-collection.html', {
        root: __dirname + '/views'
    });
});

app.get('/remita-debits-log', requireLogin, function (req, res) {
    res.sendFile('remita/remita-debits-log/remita-debits-log.html', {
        root: __dirname + '/views'
    });
});

app.get('/paystack-collection', requireLogin, function (req, res) {
    res.sendFile('paystack/paystack-collection/paystack-collection.html', {
        root: __dirname + '/views'
    });
});

app.get('/paystack-debits-log', requireLogin, function (req, res) {
    res.sendFile('paystack/paystack-debits-log/paystack-debits-log.html', {
        root: __dirname + '/views'
    });
});

app.get('/treasuries', requireLogin, function (req, res) {
    res.sendFile('treasury/treasury-management.html', {
        root: __dirname + '/views'
    });
});

app.get('/expenses', requireLogin, function (req, res) {
    res.sendFile('treasury/expenses.html', {
        root: __dirname + '/views'
    });
});

app.get('/collection-banks', requireLogin, function (req, res) {
    res.sendFile('collection/collection-banks/collection-banks.html', {
        root: __dirname + '/views'
    });
});

app.get('/loan-file/:id?', requireLogin, function (req, res) {
    res.sendFile('/application/loan-file/loan-file.html', {
        root: __dirname + '/views'
    });
});

app.get('/loan-schedule/:id?', requireLogin, function (req, res) {
    res.sendFile('/application/loan-schedule/loan-schedule.html', {
        root: __dirname + '/views'
    });
});

app.get('/audit-logs', requireLogin, function (req, res) {
    res.sendFile('/audit-log/audit-log.html', {
        root: __dirname + '/views'
    });
});

app.get('/web-payments', requireLogin, function (req, res) {
    res.sendFile('/web-payment/web-payment.html', {
        root: __dirname + '/views'
    });
});

app.get('/client-bvn-verifications', requireLogin, function (req, res) {
    res.sendFile('/client-bvn-verification/client-bvn-verification.html', {
        root: __dirname + '/views'
    });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    res.status(404);

    if (req.accepts('html')) {
        return res.render('404', {
            url: req.url
        });
    }

    if (req.accepts('json')) {
        return res.send({
            error: 'Not found'
        });
    }

    res.type('txt').send('Not found');
});

app.get('/error', function(req, res) {
    console.log(req.query.error);
    res.render('404', {
        url: req.url,
        error: req.query.error
    });
});

module.exports = app;
let server = http.createServer(app);

server.listen(process.env.port || process.env.PORT || 4000, function () {
    console.log('server running on %s [%s]', process.env.PORT, process.env.STATUS);
});
server.timeout = 0;