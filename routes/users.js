const express = require('express');
let token,
    fs = require('fs'),
    db = require('../db'),
    _ = require('lodash'),
    path = require('path'),
    users = express.Router(),
    async = require('async'),
    enums = require('../enums'),
    moment  = require('moment'),
    bcrypt = require('bcryptjs'),
    jwt = require('jsonwebtoken'),
    nodemailer = require('nodemailer'),
    xeroFunctions = require('../routes/xero'),
    hbs = require('nodemailer-express-handlebars'),
    helperFunctions = require('../helper-functions'),
    smtpTransport = require('nodemailer-smtp-transport'),
    notificationsService = require('./notifications-service'),
    emailService = require('./service/custom-services/email.service'),
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

users.get('/import-bulk-clients', function(req, res) {
    let clients = [],
        count=0,
        errors = [];

    db.getConnection(function(err, connection) {
        if (err) throw err;
        async.forEach(clients, function (client, callback) {
            client.status = 1;
            delete client.ID;
            delete client.user_role;
            delete client.comment;
            delete client.date_modified;
            delete client.address;
            console.log(client.fullname);
            connection.query('INSERT INTO clients SET ?', client, function (err, result, fields) {
                if (err) {
                    console.log(err);
                    errors.push(client);
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            connection.release();
            res.json({count: count, errors: errors})
        })
    });
});

users.get('/bulk-update-clients', function(req, res) {
    let clients = [],
        count=0,
        errors = [];

    db.getConnection(function(err, connection) {
        if (err) throw err;
        async.forEach(clients, function (client, callback) {
            console.log(client.fullname);
            switch (client.loan_officer){
                case "Abiodun Atobatele":{client.loan_officer = 2; break;}
                case "Afeez Ishola":{client.loan_officer = 6; break;}
                case "Ayokunnumi Olugbemiro":{client.loan_officer = 3; break;}
                case "Blessing Ebulueye":{client.loan_officer = 5; break;}
                case "Blessing Ebilueye":{client.loan_officer = 5; break;}
                case "Damola Sunday":{client.loan_officer = 7; break;}
            }
            console.log(client.loan_officer);
            connection.query('UPDATE clients SET loan_officer=? WHERE substring_index(fullname," ",2)=?', [client.loan_officer,client.fullname], function (err, result, fields) {
                if (err) {
                    console.log(err);
                    errors.push(client);
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            connection.release();
            res.json({count: count, errors: errors})
        });
    });
});

users.get('/update-request-client', function(req, res) {
    let users = [],
        count=0,
        errors = [];
    db.getConnection(function(err, connection) {
        async.forEach(users, function (user, callback) {
            console.log(user.fullname);
            connection.query('SELECT * FROM clients WHERE username = ?', [user.username], function (err, client, field) {
                if (client && client[0]){
                    connection.query('UPDATE requests SET userID = ? WHERE userID = ?', [client[0]['ID'],user['ID']], function (err, result, fields) {
                        if (err) {
                            console.log(err);
                            errors.push(user);
                        } else {
                            count++;
                        }
                        callback();
                    })
                } else {
                    console.log('No Client found for '+user.fullname);
                    callback();
                }
            });
        }, function (data) {
            connection.release();
            res.json({count: count, errors: errors})
        });
    });
});

users.get('/update-confirm-payment', function(req, res) {
    let count=0,
        errors = [];
    db.getConnection(function(err, connection) {
        connection.query('SELECT * FROM schedule_history', function (error, payments, field) {
            if (error || !payments) {
                res.send({"status": 500, "error": error, "response": null});
            } else {
                async.forEach(payments, function (payment, callback) {
                    console.log(payment.ID);
                    connection.query(`SELECT a.ID, a.loan_amount amount, a.userID clientID, c.loan_officer loan_officerID, c.branch branchID 
                        FROM applications a, clients c WHERE a.ID=${payment.applicationID} AND a.userID=c.ID`, function (error, app, fields) {
                        if (error) {
                            console.log(error);
                            errors.push(payment);
                            callback();
                        } else if (app[0]) {
                            let invoice = {},
                                application = app[0];
                            invoice.clientID = application.clientID;
                            invoice.loan_officerID = application.loan_officerID;
                            invoice.branchID = application.branchID;
                            if (payment.payment_amount > 0 && payment.interest_amount > 0) {
                                invoice.type = 'multiple';
                            } else {
                                if (payment.payment_amount > 0) {
                                    invoice.type = 'principal';
                                } else if (payment.interest_amount > 0) {
                                    invoice.type = 'interest';
                                } else if (payment.fees_amount > 0) {
                                    invoice.type = 'fees';
                                } else if (payment.penalty_amount > 0) {
                                    invoice.type = 'penalty';
                                }
                            }
                            connection.query(`UPDATE schedule_history SET ? WHERE ID = ${payment.ID}`, invoice, function (err, result, fields) {
                                if (err) {
                                    console.log(err);
                                    errors.push(payment);
                                } else {
                                    count++;
                                }
                                callback();
                            })
                        } else {
                            console.log('No Application found for '+payment.ID);
                            callback();
                        }
                    });
                }, function (data) {
                    connection.release();
                    res.json({count: count, errors: errors})
                });
            }
        });
    });
});

/* User Authentication */
users.post('/login', function(req, res) {
    let user = {},
        appData = {},
        username = req.body.username,
        password = req.body.password;

    db.query('SELECT * FROM users WHERE username = ?', [username], function(err, rows, fields) {
        if (err) {
            appData.error = 1;
            appData["data"] = "Error Occured!";
            res.send(JSON.stringify(appData));
        } else {
            user = rows[0];
            if (rows.length > 0) {
                if (bcrypt.compareSync(password,user.password)) {
                    let token = jwt.sign({data:user}, process.env.SECRET_KEY, {
                        expiresIn: 1440
                    });
                    appData.status = 0;
                    appData["token"] = token;
                    appData["user"] = user;
                    res.send(JSON.stringify(appData));
                } else {
                    appData.status = 1;
                    appData["data"] = "Username and Password do not match";
                    res.send(JSON.stringify(appData));
                }
            } else {
                appData.status = 1;
                appData["data"] = "User does not exists!";
                res.send(JSON.stringify(appData));
            }
        }
    });
});

/* Add New User */
users.post('/new-user', function(req, res, next) {
    let data = [],
        postData = req.body,
        query =  'INSERT INTO users Set ?',
        query2 = 'select * from users where username = ? or email = ?';
    data.username = req.body.username;
    data.email = req.body.email;
    postData.status = 1;
    postData.date_created = Date.now();
    postData.password = bcrypt.hashSync(postData.password, parseInt(process.env.SALT_ROUNDS));
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(query2,[req.body.username, req.body.email], function (error, results, fields) {
            if (results && results[0]){
                res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "User already exists!"}));
            }
            else {
                connection.query(query,postData, function (error, results, fields) {
                    if(error){
                        res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                    } else {
                        connection.query('SELECT * from users where ID = LAST_INSERT_ID()', function(err, re, fields) {
                            connection.release();
                            if (!err){
                                let payload = {}
                                payload.category = 'Users'
                                payload.userid = req.cookies.timeout
                                payload.description = 'New User Created'
                                payload.affected = re[0]['ID']
                                notificationsService.log(req, payload)
                                res.send(JSON.stringify({"status": 200, "error": null, "response": re}));
                            }
                            else{
                                res.send(JSON.stringify({"response": "Error retrieving user details. Please try a new username!"}));
                            }
                        });
                    }
                });
            }
        });
    });
});

/* Add New Client */
users.post('/new-client', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_client', async () => {
        let id;
        let postData = req.body,
            query =  'INSERT INTO clients Set ?',
            query2 = 'select * from clients where username = ? or email = ? or phone = ?';
        postData.status = 1;
        postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

        db.getConnection(function(err, connection) {
            if (err) throw err;
            connection.query(query2,[req.body.username, req.body.email, req.body.phone], function (error, results, fields) {
                console.log(error)
                console.log(results)
                if (results && results[0]){
                    return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Information in use by existing client!"}));
                }
                let bvn = req.body.bvn;
                if (bvn.trim() !== ''){
                    connection.query('select * from clients where bvn = ? and status = 1 limit 1', [req.body.bvn], function (error, rest, foelds){
                        if (rest && rest[0]){
                            return res.send(JSON.stringify({"status": 200, "error": null, "response": rest, "bvn_exists": "Yes"}));
                        }
                        xeroFunctions.authorizedOperation(req, res, 'xero_client', async (xeroClient) => {
                            if (xeroClient) {
                                let contact = {
                                    Name: postData.fullname,
                                    ContactNumber: postData.phone,
                                    ContactStatus: 'ACTIVE',
                                    EmailAddress: postData.email,
                                    Phones: [{
                                        PhoneType: 'MOBILE',
                                        PhoneNumber: postData.phone
                                    }]
                                };
                                if (postData.first_name) contact.FirstName = postData.first_name;
                                if (postData.last_name) contact.LastName = postData.last_name;
                                if (postData.account) contact.BankAccountDetails = postData.account;
                                let xeroContact = await xeroClient.contacts.create(contact);
                                postData.xeroContactID = xeroContact.Contacts[0]['ContactNumber'];
                            }
                            connection.query(query,postData, function (error, re, fields) {
                                if(error){
                                    console.log(error);
                                    res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                                } else {
                                    connection.query('SELECT * from clients where ID = LAST_INSERT_ID()', function(err, re, fields) {
                                        if (!err){
                                            id = re[0]['ID'];
                                            connection.query('INSERT into wallets Set ?', {client_id: id}, function(er, r, fields) {
                                                connection.release();
                                                if (!er){
                                                    let payload = {}
                                                    payload.category = 'Clients'
                                                    payload.userid = req.cookies.timeout
                                                    payload.description = 'New Client Created'
                                                    payload.affected = id
                                                    notificationsService.log(req, payload)
                                                    res.send(JSON.stringify({"status": 200, "error": null, "response": re}));
                                                }
                                                else{
                                                    res.send(JSON.stringify({"response": "Error creating client wallet!"}));
                                                }
                                            });
                                        }
                                        else{
                                            res.send(JSON.stringify({"response": "Error retrieving client details. Please try a new username!"}));
                                        }
                                    });
                                }
                            });
                        });
                    });
                } else {
                    xeroFunctions.authorizedOperation(req, res, 'xero_client', async (xeroClient) => {
                        if (xeroClient) {
                            let contact = {
                                Name: postData.fullname,
                                ContactNumber: postData.phone,
                                ContactStatus: 'ACTIVE',
                                EmailAddress: postData.email,
                                Phones: [{
                                    PhoneType: 'MOBILE',
                                    PhoneNumber: postData.phone
                                }]
                            };
                            if (postData.first_name) contact.FirstName = postData.first_name;
                            if (postData.last_name) contact.LastName = postData.last_name;
                            if (postData.account) contact.BankAccountDetails = postData.account;
                            let xeroContact = await xeroClient.contacts.create(contact);
                            postData.xeroContactID = xeroContact.Contacts[0]['ContactNumber'];
                        }
                        connection.query(query,postData, function (error, re, fields) {
                            if(error){
                                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                            } else {
                                connection.query('SELECT * from clients where ID = LAST_INSERT_ID()', function(err, re, fields) {
                                    if (!err){
                                        id = re[0]['ID'];
                                        connection.query('INSERT into wallets Set ?', {client_id: id}, function(er, r, fields) {
                                            connection.release();
                                            if (!er){
                                                let payload = {}
                                                payload.category = 'Clients'
                                                payload.userid = req.cookies.timeout
                                                payload.description = 'New Client Created'
                                                payload.affected = id
                                                notificationsService.log(req, payload)
                                                res.send(JSON.stringify({"status": 200, "error": null, "response": re}));
                                            }
                                            else{
                                                res.send(JSON.stringify({"response": "Error creating client wallet!"}));
                                            }
                                        });
                                    }
                                    else{
                                        res.send(JSON.stringify({"response": "Error retrieving client details. Please try a new username!"}));
                                    }
                                });
                            }
                        });
                    });
                }
            });
        });
    });
});

/* Add New Team*/
users.post('/new-team', function(req, res, next) {
    let postData = req.body,
        query =  'SELECT * FROM teams WHERE name = ? AND status = 1';
    query2 =  'INSERT INTO teams Set ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query,[postData.name], function (error, team, fields) {
        if(team && team[0]){
            res.send({"status": 500, "error": "Team already exists!"});
        } else {
            db.query(query2,postData, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "error": null, "response": "New Team Added!"});
                }
            });
        }
    });
});

/* Add New User Role*/
users.post('/new-role', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO user_roles Set ?',
        query2 = 'select * from user_roles where role_name = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.role, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Role name already exists!"}));
        db.query(query,{"role_name":postData.role, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New User Role Added!"}));
            }
        });
    });
});

/* Add New Branch*/
users.post('/new-branch', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO branches Set ?',
        query2 = 'select * from branches where branch_name = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.branch_name, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Branch name already exists!"}));
        db.query(query,{"branch_name":postData.branch_name, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New Branch Created!"}));
            }
        });
    });
});

//File Upload - User Registration
users.post('/upload/:id', function(req, res) {
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params) return res.status(400).send('No Number Plate specified!');
    let sampleFile = req.files.file,
        name = sampleFile.name,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1];
    if (extension) extension = extension.toLowerCase();

    fs.stat('files/users/'+req.params.id+'/', function(err) {
        if (!err) {
            console.log('file or directory exists');
        } else if (err.code === 'ENOENT') {
            fs.mkdirSync('files/users/'+req.params.id+'/');
        }
    });

    fs.stat('files/users/'+req.params.id+'/'+req.params.id+'.'+extension, function (err) {
        if (err) {
            sampleFile.mv('files/users/'+req.params.id+'/'+req.params.id+'.'+extension, function(err) {
                if (err) return res.status(500).send(err);
                res.send('File uploaded!');
            });
        }
        else{
            fs.unlink('files/users/'+req.params.id+'/'+req.params.id+'.'+extension,function(err){
                if(err){
                    res.send('Unable to delete file!');
                }
                else{
                    sampleFile.mv('files/users/'+req.params.id+'/'+req.params.id+'.'+extension, function(err) {
                        if (err)
                            return res.status(500).send(err);
                        res.send('File uploaded!');
                    });
                }
            });
        }
    });
});

//File Upload - New Client (Image and Signature)
users.post('/upload-file/:id/:item', function(req, res) {
    console.log('here')
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params) return res.status(400).send('No Number Plate specified!');
    let sampleFile = req.files.file,
        name = sampleFile.name,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1];
    if (extension) extension = extension.toLowerCase();
    fs.stat('files/users/'+req.params.id+'/', function(err) {
        console.log(err)
        if (!err) {
            console.log('file or directory exists');
        }
        else if (err.code === 'ENOENT') {
            fs.mkdirSync('files/users/'+req.params.id+'/');
        }
    });

    fs.stat('files/users/'+req.params.id+'/'+req.params.id+'_'+req.params.item+'.'+extension, function (err) {
        if (err) {
            sampleFile.mv('files/users/'+req.params.id+'/'+req.params.id+'_'+req.params.item+'.'+extension, function(err) {
                if (err) return res.status(500).send(err);
                res.send('File uploaded!');
            });
        }
        else{
            fs.unlink('files/users/'+req.params.id+'/'+req.params.id+'_'+req.params.item+'.'+extension,function(err){
                if(err){
                    res.send('Unable to delete file!');
                }
                else{
                    sampleFile.mv('files/users/'+req.params.id+'/'+req.params.id+'_'+req.params.item+'.'+extension, function(err) {
                        if (err)
                            return res.status(500).send(err);
                        res.send('File uploaded!');
                    });
                }
            });
        }
    });
});

/* GET users listing. */
users.get('/all-users', function(req, res, next) {
    let array = [],
        query = 'SELECT * from users where status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            async.forEach(results, function(k, cb){
                let path = 'files/users/'+k.username+'/';
                if (fs.existsSync(path)){
                    fs.readdir(path, function (err, files){
                        files = helperFunctions.removeFileDuplicates(path, files);
                        async.forEach(files, function (file, callback){
                            k.image = path+file;
                            callback();
                        }, function(data){
                            array.push(k);
                            cb();
                        });
                    });
                } else {
                    k.image = "No Image";
                    array.push(k);
                    cb();
                }

            }, function(data){
                res.send(JSON.stringify({"status": 200, "error": null, "response": array}));
            });
        }
    });
});

users.get('/users-list', function(req, res, next) {
    let query = 'SELECT *, (select u.role_name from user_roles u where u.ID = user_role) as Role from users where user_role not in (3, 4) and status = 1 order by ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Loan Officers Only */
users.get('/loan-officers', function(req, res, next) {
    let query = 'SELECT *, (select u.role_name from user_roles u where u.ID = user_role) as Role from users where loan_officer_status = 1 and status = 1 order by ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/teams-list', function(req, res, next) {
    let query = 'SELECT *, (select u.fullname from users u where u.ID = t.supervisor) as supervisor, (select count(*) from team_members m where m.teamID = t.ID and m.status = 1) as members, ' +
        '(select count(*) from user_targets m where m.userID = t.ID and m.status = 1) as targets from teams t where t.status = 1 order by t.ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Teams fetched successfully", "response": results});
        }
    });
});

users.get('/team/members/:id', function(req, res, next) {
    let query = 'SELECT *,(select u.fullname from users u where u.ID = t.memberID) as member from team_members t where t.status = 1 and t.teamID = ? order by t.ID desc';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Team members fetched successfully", "response": results});
        }
    });
});

users.post('/team/members', function(req, res, next) {
    req.body.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM team_members WHERE teamID=? AND memberID=? AND status = 1', [req.body.teamID,req.body.memberID], function (error, result, fields) {
        if (result && result[0]) {
            res.send({"status": 500, "error": "User has already been assigned to this team"});
        } else {
            db.query('INSERT INTO team_members SET ?', req.body, function (error, result, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    db.query('SELECT *,(select u.fullname from users u where u.ID = t.memberID) as member from team_members t where t.status = 1 and t.teamID = ? order by t.ID desc', [req.body.teamID], function (error, results, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            res.send({"status": 200, "message": "Team member assigned successfully", "response": results});
                        }
                    });
                }
            });
        }
    });
});

users.delete('/team/members/:id/:teamID', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE team_members SET status = 0, date_modified = ? WHERE ID = ?', [date, req.params.id], function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query('SELECT *,(select u.fullname from users u where u.ID = t.memberID) as member from team_members t where t.status = 1 and t.teamID = ? order by t.ID desc', [req.params.teamID], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "Team member deleted successfully", "response": results});
                }
            });
        }
    });
});

users.get('/team/targets/:id', function(req, res, next) {
    let query = 'SELECT *,(select u.name from teams u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
        '(select u.title from targets u where u.ID = t.targetID) as target from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Team targets fetched successfully", "response": results});
        }
    });
});

users.get('/user-targets/:id', function(req, res, next) {
    let query = 'SELECT *,(select u.fullname from users u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
        '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User targets fetched successfully", "response": results});
        }
    });
});

users.get('/user-assigned-target/:id', function(req, res, next) {
    let query = 'SELECT t.targetID AS ID,sum(t.value) AS value,u.title as target,u.type,u.period from user_targets t, targets u where t.status = 1 and t.userID = ? and u.ID = t.targetID group by t.targetID order by t.targetID desc';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User assigned target fetched successfully", "response": results});
        }
    });
});

users.get('/user-assigned-period/:id/:targetID', function(req, res, next) {
    let query = 'SELECT t.sub_periodID AS ID,sum(t.value) AS value,u.name,u.type,u.periodID from user_targets t, sub_periods u where t.status = 1 and t.userID = ? and t.targetID = ? and u.ID = t.sub_periodID group by t.sub_periodID order by t.sub_periodID desc';
    db.query(query, [req.params.id,req.params.targetID], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User assigned period fetched successfully", "response": results});
        }
    });
});

users.get('/targets-list', function(req, res, next) {
    let type = req.query.type,
        target = req.query.target,
        sub_period = req.query.sub_period,
        query = 'SELECT *,(select u.name from teams u where u.ID = t.userID) as owner,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
            '(select u.start from sub_periods u where u.ID = t.sub_periodID) as start,(select u.end from sub_periods u where u.ID = t.sub_periodID) as end,' +
            '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.user_type = "team"',
        query2 = 'SELECT *,(select u.fullname from users u where u.ID = t.userID) as owner,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
            '(select u.start from sub_periods u where u.ID = t.sub_periodID) as start,(select u.end from sub_periods u where u.ID = t.sub_periodID) as end,' +
            '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.user_type = "user"';
    if (type){
        query = query.concat(' AND (select u.type from targets u where u.ID = t.targetID) = "'+type+'"');
        query2 = query2.concat(' AND (select u.type from targets u where u.ID = t.targetID) = "'+type+'"');
    }
    if (target){
        query = query.concat(' AND t.targetID = '+target);
        query2 = query2.concat(' AND t.targetID = '+target);
    }
    if (sub_period){
        query = query.concat(' AND t.sub_periodID = '+sub_period);
        query2 = query2.concat(' AND t.sub_periodID = '+sub_period);
    }
    db.query(query, function (error, team_targets, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, function (error, user_targets, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    results = team_targets.concat(user_targets);
                    res.send({"status": 200, "message": "Targets list fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/targets-list/:officerID', function(req, res, next) {
    let type = req.query.type,
        id = req.params.officerID,
        target = req.query.target,
        sub_period = req.query.sub_period,
        query = 'SELECT *,(select u.name from teams u where u.ID = t.userID) as owner,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
            '(select u.start from sub_periods u where u.ID = t.sub_periodID) as start,(select u.end from sub_periods u where u.ID = t.sub_periodID) as end,' +
            '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.user_type = "team"',
        query2 = 'SELECT *,(select u.fullname from users u where u.ID = t.userID) as owner,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
            '(select u.start from sub_periods u where u.ID = t.sub_periodID) as start,(select u.end from sub_periods u where u.ID = t.sub_periodID) as end,' +
            '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.user_type = "user"',
        query3 = query2.concat(' AND t.userID = '+id+' '),
        query4 = query2.concat(' AND (select supervisor from users where users.id = t.userID) =  '+id+' ');
    if (id)
        query2 = query3;
    if (type){
        query = query.concat(' AND (select u.type from targets u where u.ID = t.targetID) = "'+type+'"');
        query2 = query2.concat(' AND (select u.type from targets u where u.ID = t.targetID) = "'+type+'"');
    }
    if (target){
        query = query.concat(' AND t.targetID = '+target);
        query2 = query2.concat(' AND t.targetID = '+target);
    }
    if (sub_period){
        query = query.concat(' AND t.sub_periodID = '+sub_period);
        query2 = query2.concat(' AND t.sub_periodID = '+sub_period);
    }
    if (id){
        db.query(query, function (error, team_targets, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query(query2, function (error, user_targets, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        db.query(query4, function (error, user_targets2, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                results = team_targets.concat(user_targets,user_targets2);
                                res.send({"status": 200, "message": "Targets list fetched successfully", "response": results});
                            }
                        });
                    }
                });
            }
        });
    } else {
        db.query(query, function (error, team_targets, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query(query2, function (error, user_targets, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        results = team_targets.concat(user_targets);
                        res.send({"status": 200, "message": "Targets list fetched successfully", "response": results});
                    }
                });
            }
        });
    }
});

users.delete('/targets-list/delete/:id', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE user_targets SET status=0, date_modified=? WHERE ID = ?', [date,req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Assigned target deleted successfully!"});
        }
    });
});


users.get('/committals/user/disbursement/:userID/:targetID', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(d.amount) total FROM disbursement_history d, (SELECT ID client_id FROM clients WHERE loan_officer = ? AND status = 1) AS c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE d.client_id = c.client_id',
        query2 = 'SELECT d.amount, a.disbursement_channel channel, a.duration, d.date_disbursed date, c.fullname client FROM disbursement_history d, applications AS a, ' +
            '(SELECT ID client_id, fullname FROM clients WHERE loan_officer = ? AND status = 1) AS c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE d.client_id = c.client_id AND d.loan_id = a.ID';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
    }
    db.query(query, [req.params.userID,req.params.targetID], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.userID,req.params.targetID], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/user/interest/:userID/:targetID', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(s.interest_amount) total FROM schedule_history s, applications a, clients c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges ' +
            'WHERE s.applicationID = a.ID AND s.clientID = c.ID AND s.loan_officerID = ? AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT s.interest_amount amount, s.payment_source channel, s.payment_date date, s.clientID userID, c.fullname client, a.ID application_id, a.duration ' +
            'FROM schedule_history s, applications a, clients c, (SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges ' +
            'WHERE s.applicationID = a.ID AND s.clientID = c.ID AND s.loan_officerID = ? AND s.status = 1 AND s.interest_amount > 0';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
    }
    db.query(query, [req.params.targetID, req.params.userID], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.targetID, req.params.userID], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/user/disbursement/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(d.amount) total FROM disbursement_history d WHERE d.loan_officer = ?',
        query2 = 'SELECT d.amount, a.disbursement_channel channel, a.duration, d.date_disbursed date, c.fullname client FROM disbursement_history d, applications a, clients c WHERE d.loan_officer = ? AND d.loan_id = a.ID AND d.client_id = c.ID';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    }
    db.query(query, [req.params.id], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/user/interest/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(s.interest_amount) total FROM schedule_history AS s, applications a ' +
            'WHERE s.applicationID = a.ID AND s.loan_officerID = ? AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT s.interest_amount amount, s.payment_source channel, s.payment_date date, s.clientID userID, c.fullname client, a.ID application_id, a.duration ' +
            'FROM schedule_history s, applications a, clients c ' +
            'WHERE s.applicationID = a.ID AND s.clientID = c.ID AND s.loan_officerID = ? AND s.status = 1 AND s.interest_amount > 0';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    }
    db.query(query, [req.params.id], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/team/disbursement/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(d.amount) total FROM disbursement_history d, ' +
            '(SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = 3 AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c ' +
            'WHERE d.client_id = c.client_id',
        query2 = 'SELECT d.amount, a.disbursement_channel channel, a.duration, d.date_disbursed date, c.fullname client FROM disbursement_history d, applications a, ' +
            '(SELECT cl.ID client_id, cl.fullname FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = ? AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c ' +
            'WHERE d.client_id = c.client_id AND d.loan_id = a.ID';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    }
    db.query(query, [req.params.id], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/team/interest/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(s.interest_amount) total FROM schedule_history AS s, ' +
            '(SELECT ID application_id FROM applications AS a, (SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = ? AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps ' +
            'WHERE s.applicationID = apps.application_id AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT s.interest_amount amount, s.payment_source channel, s.payment_date date, s.clientID userID, c.fullname client, apps.application_id, apps.duration ' +
            'FROM schedule_history s, clients c, (SELECT ID application_id, duration FROM applications AS a, (SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = ? AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps ' +
            'WHERE s.applicationID = apps.application_id AND s.clientID = c.ID AND s.status = 1 AND s.interest_amount > 0';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    }
    db.query(query, [req.params.id], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/disbursement/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT d.ID, cast(d.amount as unsigned) amount, a.disbursement_channel channel, d.date_disbursed date, c.fullname client FROM disbursement_history d, applications a, ' +
            '(SELECT ID client_id, fullname FROM clients WHERE loan_officer in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "user" AND t.targetID = ?) AND status = 1) AS c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE d.loan_id = a.ID AND d.client_id = c.client_id',
        query2 = 'SELECT d.ID, cast(d.amount as unsigned) amount, a.disbursement_channel channel, d.date_disbursed date, c.fullname client FROM disbursement_history d, applications a, ' +
            '(SELECT cl.ID client_id, cl.fullname FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE status = 1 AND teamID in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "team" AND t.targetID = ?)) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE d.loan_id = a.ID AND d.client_id = c.client_id';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
    }
    db.query(query, [req.params.id,req.params.id], function (error, result_user, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id,req.params.id], function (error, result_team, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = {};
                    results.data = _.unionBy(result_team,result_user,'ID');
                    results.count = results.data.length;
                    results.total = _.sumBy(results.data,'amount');
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/interest/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT cast(s.interest_amount as unsigned) amount, s.payment_source channel, s.payment_date date, c.fullname client, apps.application_id, apps.duration ' +
            'FROM schedule_history AS s, clients c, ' +
            '(SELECT ID application_id, duration FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "user" AND t.targetID = ?) AND status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE s.applicationID = apps.application_id AND s.clientID = c.ID AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT cast(s.interest_amount as unsigned) amount, s.payment_source channel, s.payment_date date, c.fullname client, apps.application_id, apps.duration ' +
            'FROM schedule_history AS s, clients c, ' +
            '(SELECT ID application_id, duration FROM applications AS a, (SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE status = 1 AND teamID in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "team" AND t.targetID = ?)) AS t ' +
            'WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE s.applicationID = apps.application_id AND s.clientID = c.ID AND s.status = 1 AND s.interest_amount > 0';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
    }
    db.query(query, [req.params.id,req.params.id], function (error, result_user, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id,req.params.id], function (error, result_team, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = {};
                    results.data = _.unionBy(result_team,result_user,'ID');
                    results.count = results.data.length;
                    results.total = _.sumBy(results.data,'amount');
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/target/details/:id', function(req, res, next) {
    let query = 'SELECT count(*) count, sum(t.value) total FROM user_targets AS t WHERE targetID = ? AND status = 1',
        query2 = 'SELECT userID, sum(value) as value, (SELECT name FROM sub_periods WHERE ID = t.sub_periodID) AS period, ' +
            '(CASE WHEN t.user_type = "user" THEN (SELECT fullname FROM users WHERE ID = userID) WHEN t.user_type = "team" THEN (SELECT name FROM teams WHERE ID = userID) END) AS owner ' +
            'FROM user_targets AS t WHERE t.targetID = ? AND t.status = 1 GROUP BY owner';
    db.query(query, [req.params.id], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Target details fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/target/limit/:id', function(req, res, next) {
    let query = 'SELECT (CASE WHEN sum(t.value) IS NULL THEN 0 ELSE sum(t.value) END) allocated, (SELECT value FROM targets WHERE ID = ?) target, ' +
        '((SELECT value FROM targets WHERE ID = ?) - (CASE WHEN sum(t.value) IS NULL THEN 0 ELSE sum(t.value) END)) unallocated FROM user_targets AS t WHERE targetID = ? AND status = 1';
    db.query(query, [req.params.id,req.params.id,req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Target limit fetched successfully", "response": results[0]});
        }
    });
});

users.post('/team/targets', function(req, res, next) {
    req.body.user_type = "team";
    req.body.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM user_targets WHERE userID=? AND targetID=? AND periodID=? AND sub_periodID=? AND status = 1',
        [req.body.userID,req.body.targetID,req.body.periodID,req.body.sub_periodID], function (error, result, fields) {
            if (result && result[0]) {
                res.send({"status": 500, "error": "Target has already been assigned to this team"});
            } else {
                db.query('INSERT INTO user_targets SET ?', req.body, function (error, result, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        let query = 'SELECT *,(select u.name from teams u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
                            '(select u.title from targets u where u.ID = t.targetID) as target from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
                        db.query(query, [req.body.userID], function (error, results, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                res.send({"status": 200, "message": "Team target assigned successfully", "response": results});
                            }
                        });
                    }
                });
            }
        });
});

users.post('/user-targets', function(req, res, next) {
    req.body.user_type = "user";
    req.body.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM user_targets WHERE userID=? AND targetID=? AND periodID=? AND sub_periodID=? AND status = 1',
        [req.body.userID,req.body.targetID,req.body.periodID,req.body.sub_periodID], function (error, result, fields) {
            if (result && result[0]) {
                res.send({"status": 500, "error": "Target has already been assigned to this user"});
            } else {
                db.query('SELECT * FROM users WHERE ID=?', [req.body.userID], function (error, user, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        if (user[0]['loan_officer_status'] !== 1)
                            return res.send({"status": 500, "error": "User must be a loan officer"});
                        db.query('INSERT INTO user_targets SET ?', req.body, function (error, result, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                let query = 'SELECT *,(select u.fullname from users u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
                                    '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
                                db.query(query, [req.body.userID], function (error, results, fields) {
                                    if(error){
                                        res.send({"status": 500, "error": error, "response": null});
                                    } else {
                                        res.send({"status": 200, "message": "User target assigned successfully", "response": results});
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
});

users.delete('/team/targets/:id/:userID', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE user_targets SET status = 0, date_modified = ? WHERE ID = ?', [date, req.params.id], function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT *,(select u.name from teams u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
                '(select u.title from targets u where u.ID = t.targetID) as target from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
            db.query(query, [req.params.userID], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "Team target deleted successfully", "response": results});
                }
            });
        }
    });
});

users.delete('/user-targets/:id/:userID', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE user_targets SET status = 0, date_modified = ? WHERE ID = ?', [date, req.params.id], function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT *,(select u.fullname from users u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
                '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
            db.query(query, [req.params.userID], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "User target deleted successfully", "response": results});
                }
            });
        }
    });
});

users.get('/users-list-full', function(req, res, next) {
    let query = 'SELECT *, (select u.fullname from users u where u.ID = s.supervisor) as supervisor, (select u.role_name from user_roles u where u.ID = s.user_role) as Role ' +
        'from users s where s.user_role not in (3, 4) order by s.ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/branches', function(req, res, next) {
    let query = 'SELECT * from branches';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/states', function(req, res, next) {
    let query = 'SELECT * from state';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/countries', function(req, res, next) {
    let query = 'SELECT * from country';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/clients-list', function(req, res, next) {
    let query = 'select * from clients where status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/clients-list-full', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'select *, (select l.fullname from users l where l.ID = loan_officer) as loan_officer_name from clients ';
    if (start && end){
        start = "'"+moment(start).utcOffset('+0100').format("YYYY-MM-DD")+"'";
        end = "'"+moment(end).add(1, 'days').format("YYYY-MM-DD")+"'";
        query = query.concat('where TIMESTAMP(date_created) between TIMESTAMP('+start+') and TIMESTAMP('+end+')')
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/clients-list-full/:officerID', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        id = req.params.officerID,
        query = 'select *, (select l.fullname from users l where l.ID = loan_officer) as loan_officer_name from clients ',
        query2 = 'select *, (select l.fullname from users l where l.ID = loan_officer) as loan_officer_name from clients where loan_officer = '+id,
        query3 = 'select *, (select l.fullname from users l where l.ID = loan_officer) as loan_officer_name from clients where (select supervisor from users where users.id = clients.loan_officer) = '+id;
    if (id)
        query = query2;
    if (start && end){
        let start_query = "'"+moment(start).utcOffset('+0100').format("YYYY-MM-DD")+"'";
        let end_query = "'"+moment(end).add(1, 'days').format("YYYY-MM-DD")+"'";
        query = query.concat(' where TIMESTAMP(date_created) between TIMESTAMP('+start_query+') and TIMESTAMP('+end_query+')')
    }
    if (id){
        db.query(query, function (error, results1, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                db.query(query3, function (error, results2, fields) {
                    if(error){
                        res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                    } else {
                        let results = _.unionBy(results1,results2,'ID');
                        res.send(JSON.stringify(results));
                    }
                });
            }
        });
    } else {
        db.query(query, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify(results));
            }
        });
    }
});

users.get('/users-list-v2', function(req, res, next) {
    let query = 'SELECT ID, username, fullname, email, status, date_created from clients where status = 1 order by fullname asc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/user-dets/:id', function(req, res, next) {
    let query = 'SELECT *, (select u.role_name from user_roles u where u.ID = user_role) as Role, (select fullname from users where users.ID = u.supervisor) as Super from users u where id = ? order by ID desc ';
    db.query(query, req.params.id, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

users.get('/client-dets/:id', function(req, res, next) {
    let query = 'SELECT *, (select fullname from users u where u.ID = clients.loan_officer) as officer, \n' +
        '(select branch_name from branches b where b.ID = clients.branch) as branchname, \n' +
        '(SELECT sum(amount) FROM escrow WHERE clientID=clients.ID AND status=1) AS escrow ,  \n' +
        '(select sum(loan_amount) from applications where userID = clients.ID and not (status = 0 and close_status = 0)) as total_loans, \n'+
        '(select \n' +
        '(select sum(loan_amount) from applications where userID = clients.ID and not (status = 0 and close_status = 0)) - \n' +
        'sum(payment_amount)\n' +
        'from schedule_history\n' +
        'where applicationID in (select id from applications where userid = clients.ID and not (status = 0 and close_status = 0))\n' +
        'and status = 1) as total_balance, \n'+
        '(select \n' +
        'sum(interest_amount)\n' +
        'from schedule_history\n' +
        'where applicationID in (select id from applications where userid = clients.ID and not (status = 0 and close_status = 0))\n' +
        'and status = 1) as total_interests\n'+
        'from clients where id = ? order by id desc \n';
    db.query(query, req.params.id, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

users.get('/incomplete-records', function(req, res, next){
    let query = `select * from clients where 
                (fullname = ' ' or fullname is null) or 
                (username = ' ' or username is null) or 
                (password = ' ' or password is null) or 
                (status = ' ' or status is null) or 
                (phone = ' ' or phone is null) or 
                (address = ' ' or address is null) or 
                (email = ' ' or email is null) or 
                (dob = ' ' or dob is null) or 
                (marital_status = ' ' or marital_status is null) or 
                (loan_officer = ' ' or loan_officer is null) or 
                (client_state = ' ' or client_state is null) or 
                (client_country = ' ' or client_country is null) or 
                (postcode = ' ' or postcode is null) or 
                (years_add = ' ' or years_add is null) or 
                (ownership = ' ' or ownership is null) or 
                (employer_name = ' ' or employer_name is null) or
                (industry = ' ' or industry is null) or 
                (job = ' ' or job is null) or 
                (salary = ' ' or salary is null) or 
                (job_country = ' ' or job_country is null) or 
                (off_address = ' ' or off_address is null) or 
                (off_state = ' ' or off_state is null) or 
                (doe = ' ' or doe is null) or 
                (guarantor_name = ' ' or guarantor_name is null) or 
                (guarantor_occupation = ' ' or guarantor_occupation is null) or 
                (relationship = ' ' or relationship is null) or 
                (years_known = ' ' or years_known is null) or 
                (guarantor_phone = ' ' or guarantor_phone is null) or 
                (guarantor_email = ' ' or guarantor_email is null) or 
                (guarantor_address = ' ' or guarantor_address is null) or 
                (gua_country = ' ' or gua_country is null) or
                (gender = ' ' or gender is null) or 
                (branch = ' ' or branch is null) or 
                (bank = ' ' or bank is null) or 
                (account = ' ' or account is null) or 
                (bvn = ' ' or bvn is null) or 
                (client_type = ' ' or client_type is null) or 
                (product_sold = ' ' or product_sold is null) or 
                (capital_invested = ' ' or capital_invested is null) or 
                (market_name = ' ' or market_name is null) or 
                (market_years = ' ' or market_years is null) or 
                (market_address = ' ' or market_address is null) or 
                (kin_fullname = ' ' or kin_fullname is null) or 
                (kin_phone = ' ' or kin_phone is null) or 
                (kin_relationship = ' ' or kin_relationship is null)`
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

/* Custom APIs to update all clients' first_name, middle_name and last_name*/
users.get('/update-records', function(req, res, next){
    let query = `select ID, fullname from clients `
    // where (first_name = ' ' or first_name is null) or
    // (middle_name = ' ' or middle_name is null) or
    // (last_name = ' ' or last_name is null)`
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            db.getConnection(function(err, connect) {
                if (err) throw err;
                for (let i = 0; i < results.length; i++){
                    let id = results[i]['ID'];
                    let fullname = (results[i]['fullname'] === null) ? ' ' : results[i]['fullname'];
                    let first_name = fullname.split(' ')[0].trim();
                    let middle_name = fullname.split(' ')[1].trim();
                    let last_name = fullname.split(' ')[2].trim();
                    console.log(fullname + ': ')
                    console.log(first_name + middle_name + last_name + '\n')
                    let dets = {};
                    let query = 'update clients set first_name = ?, middle_name = ?, last_name = ? where ID = ?  ';
                    connect.query(query, [first_name, middle_name, last_name, id], function (error, results, fields) {
                        if (error) {
                            console.log(error)
                            // res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                        } else {
                            console.log(id);
                            console.log(results);
                            // res.send(JSON.stringify({"status": 200, "error": null, "response": "Category Disabled!"}));
                        }
                        if (i === results.length-1)
                            return connect.release();
                    });
                }
            });
            // res.send(results);
        }
    });
});

users.get('/update-folders', function(req, res, next){
    let query = `select ID, first_name, middle_name, last_name, email from clients`
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            db.getConnection(function(err, connect) {
                if (err) throw err;
                for (let i = 0; i < results.length; i++){
                    let id = results[i]['ID'];
                    let first_name = (results[i]['first_name'] === null) ? '' : results[i]['first_name'].trim();
                    let middle_name = (results[i]['middle_name'] === null) ? '' : results[i]['middle_name'].trim();
                    let last_name = (results[i]['last_name'] === null) ? '' : results[i]['last_name'].trim();
                    let email = results[i]['email'];
                    let folder_name = first_name + ' ' + middle_name + ' ' + last_name + '_' + email
                    console.log(folder_name)
                    let dets = {};
                    let query = 'update clients set images_folder = ? where ID = ?  ';
                    // console.log(query)
                    connect.query(query, [folder_name, id], function (error, results, fields) {
                        if (error) {
                            console.log(error)
                            // res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                        } else {
                            console.log(id);
                            console.log(results);
                            // res.send(JSON.stringify({"status": 200, "error": null, "response": "Category Disabled!"}));
                        }
                        if (i === results.length-1)
                            return connect.release();
                    });
                }
            });
            // res.send(results);
        }
    });
});
/* */

users.get('/user-roles', function(req, res, next) {
    let query = 'SELECT * from user_roles where status = 1 and id not in (1, 3, 4)';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/roles/:role', function(req, res, next) {
    let query = (req.params.role === '1') ? 'SELECT * from user_roles where id not in (3, 4, 1) ' : 'SELECT * from user_roles where id not in (3, 4) ';
    db.query(query, req.params.role, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET users count. */
users.get('/usersCount', function(req, res, next) {
    let query = 'SELECT count(*) as total from users where status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET All Requests count. */
users.get('/all-requests', function(req, res, next) {
    let query = 'select count(*) as requests from requests, clients where clients.ID = requests.userID AND requests.status <> 0';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

/* GET All Applications count. */
users.get('/all-applications', function(req, res, next) {
    let query = 'select count(*) as applications from applications where applications.status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

/* GET Specific User. */
users.get('/user/:id', function(req, res, next) {
    let path = 'files/users/'+req.params.id+'/',
        query = 'SELECT * from users where username = ?';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            fs.stat(path, function(err) {
                if (!err){
                    let obj = {},
                        items = [],
                        image = "";
                    fs.readdir(path, function (err, files){
                        files = helperFunctions.removeFileDuplicates(path, files);
                        files.forEach(function (file){
                            image = path+file;
                        });
                        res.send(JSON.stringify({"status": 200, "error": null, "response": results, "image": image}));
                    });
                }else{
                    res.send(JSON.stringify({"status": 200, "error": null, "response": results, "path": "No Image Uploaded Yet"}));
                }
            });
        }
    });
});

/* Edit User Info */
users.post('/edit-user/:id/:user', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.fullname, postData.user_role, postData.email, postData.branch, postData.supervisor, postData.loan_officer_status, postData.date_modified, req.params.id],
        query = 'Update users SET fullname=?, user_role=?, email=?, branch =?, supervisor =?, loan_officer_status =?, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        }
        else {
            let payload = {}
            payload.category = 'Users'
            payload.userid = req.cookies.timeout
            payload.description = 'User details updated.'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send(JSON.stringify({"status": 200, "error": null, "response": "User Details Updated"}));
        }
    });
});

users.post('/edit-client/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_client', async (xeroClient) => {
        let date = Date.now(),
            postData = req.body;
        postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let payload = [postData.username, postData.fullname, postData.first_name, postData.middle_name, postData.last_name, postData.phone, postData.address, postData.email,
            postData.gender, postData.dob, postData.marital_status, postData.loan_officer, postData.branch, postData.bank, postData.account, postData.bvn, postData.client_state, postData.postcode, postData.client_country,
            postData.years_add, postData.ownership , postData.employer_name ,postData.industry ,postData.job, postData.salary, postData.job_country , postData.off_address, postData.off_state,
            postData.doe, postData.guarantor_name, postData.guarantor_occupation, postData.relationship, postData.years_known, postData.guarantor_phone, postData.guarantor_email,
            postData.guarantor_address, postData.gua_country, postData.product_sold, postData.capital_invested, postData.market_name, postData.market_years,
            postData.market_address, postData.kin_fullname, postData.kin_phone, postData.kin_relationship, postData.images_folder, postData.date_modified, req.params.id];
        let query = 'Update clients SET username = ?, fullname=?, first_name=?, middle_name=?, last_name=?,  phone=?, address = ?, email=?, gender=?, dob = ?, marital_status=?, loan_officer=?, branch=?, bank=?, account=?, bvn = ?, ' +
            'client_state=?, postcode=?, client_country=?, years_add=?, ownership=?, employer_name=?, industry=?, job=?, salary=?, job_country=?, off_address=?, off_state=?, ' +
            'doe=?, guarantor_name=?, guarantor_occupation=?, relationship=?, years_known=?, guarantor_phone=?, guarantor_email=?, guarantor_address=?, gua_country=?, ' +
            'product_sold =? , capital_invested = ?, market_name =? , market_years = ?, market_address =? , kin_fullname = ?, kin_phone =? , kin_relationship = ?, images_folder = ?, date_modified = ? where ID=?';
        if (xeroClient && postData.xeroContactID) {
            let contact = {
                Name: postData.fullname,
                ContactNumber: postData.phone,
                ContactStatus: 'ACTIVE',
                EmailAddress: postData.email,
                Phones: [{
                    PhoneType: 'MOBILE',
                    PhoneNumber: postData.phone
                }]
            };
            if (postData.first_name) contact.FirstName = postData.first_name;
            if (postData.last_name) contact.LastName = postData.last_name;
            if (postData.account) contact.BankAccountDetails = postData.account;
            contact.ContactNumber = postData.xeroContactID;
            let xeroContact = await xeroClient.contacts.update(contact);
        }
        db.query(query, payload, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                let payload = {}
                payload.category = 'Clients'
                payload.userid = req.cookies.timeout
                payload.description = 'Client details updated.'
                payload.affected = req.params.id
                notificationsService.log(req, payload)
                res.send(JSON.stringify({"status": 200, "error": null, "response": "Client Details Updated"}));
            }
        });
    });
});

/* Change Branch Status */
users.post('/del-branch/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update branches SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Branch Disabled!"}));
        }
    });
});

/* Reactivate Branch */
users.post('/en-branch/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update branches SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Branch Re-enabled!"}));
        }
    });
});

/* Change Role Status */
users.post('/del-role/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update user_roles SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Disabled!"}));
        }
    });
});

/* Reactivate Role */
users.post('/en-role/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update user_roles SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Re-enabled!"}));
        }
    });
});

// Disable User
users.post('/del-user/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update users SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "User Disabled!"}));
        }
    });
});

// Enable User
users.post('/en-user/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update users SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "User Reactivated!"}));
        }
    });
});

// Change Client Status
users.post('/del-client/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_client', async (xeroClient) => {
        let date = Date.now(),
            postData = req.body;
        postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let payload = [postData.date_modified, req.params.id],
            query = 'Update clients SET status = 0, date_modified = ? where ID=?';
        if (xero_client && postData.xeroContactID) {
            let xeroContact = await xeroClient.contacts.update({
                ContactNumber: postData.xeroContactID,
                ContactStatus: 'ARCHIVED'
            });
        }
        db.query(query, payload, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "Client Disabled!"}));
            }
        });
    });
});

// Enable Client
users.post('/en-client/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_client', async (xeroClient) => {
        let date = Date.now(),
            postData = req.body;
        postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let payload = [postData.date_modified, req.params.id],
            query = 'Update clients SET status = 1, date_modified = ? where ID=?';
        // if (xeroClient && postData.xeroContactID) {
        //     let xeroContact = await xeroClient.contacts.update({
        //         ContactNumber: postData.xeroContactID,
        //         ContactStatus: 'ACTIVE'
        //     });
        // }
        db.query(query, payload, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "Client Reactivated!"}));
            }
        });
    });
});

/* Change User Password */
users.post('/changePassword/:id', function(req, res, next) {
    let date_modified = Date.now(),
        query = 'Update users SET password = ?, date_modified = ?  where id=?';
    db.query(query, [bcrypt.hashSync(req.body.password, parseInt(process.env.SALT_ROUNDS)), date_modified, req.params.id], function (error, results, fields) {                   ;
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "User password updated!"});
        }
    });
});

/* GET Vehicle Owners listing. */
users.get('/owners/', function(req, res, next) {
    let query = 'SELECT * from users where user_role = 4';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Add New Vehicle Owner*/
users.post('/new-owner', function(req, res, next) {
    let postData = req.body;
    postData.date_created = Date.now();
    let query =  'INSERT INTO vehicle_owners Set ?';
    db.query(query,postData, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "New Vehicle Owner Added!"}));
        }
    });
});

/**
 * User Application (3rd Party)
 * Payload => Firstname, Lastname, Phone, Collateral
 */

users.post('/apply', function(req, res) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async () => {
        let data = {},
            workflow_id = req.body.workflowID,
            postData = Object.assign({},req.body),
            query =  'INSERT INTO applications Set ?';
        if (!workflow_id)
            query =  'INSERT INTO requests Set ?';
        delete postData.email;
        delete postData.username;
        postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        db.query(query, postData, function (error, results, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                data.name = req.body.username;
                data.date = postData.date_created;
                let mailOptions = {
                    from: process.env.TENANT+' <noreply@finratus.com>',
                    to: req.body.email,
                    subject: process.env.TENANT+' Application Successful',
                    template: 'application',
                    context: data
                };
                if (!workflow_id)
                    mailOptions.template =  'main';
                transporter.sendMail(mailOptions, function(error, info){
                    if(error)
                        console.log({"status": 500, "message": "Error occurred!", "response": error});
                    if (!workflow_id)
                        return res.send({"status": 200, "message": "New Application Added!"});
                    helperFunctions.getNextWorkflowProcess(false,workflow_id,false, function (process) {
                        db.query('SELECT MAX(ID) AS ID from applications', function(err, application, fields) {
                            process.workflowID = workflow_id;
                            process.agentID = postData.agentID;
                            process.applicationID = application[0]['ID'];
                            process.date_created = postData.date_created;

                            let payload = {}
                            payload.category = 'Application'
                            payload.userid = req.cookies.timeout
                            payload.description = 'New Application Created'
                            payload.affected = application[0]['ID']
                            notificationsService.log(req, payload)
                            db.query('INSERT INTO workflow_processes SET ?',process, function (error, results, fields) {
                                if(error){
                                    return res.send({"status": 500, "error": error, "response": null});
                                } else {
                                    return res.send({"status": 200, "message": "New Application Added!", "response": application[0]});
                                }
                            });
                        });
                    });
                });
            }
        });
    });
});

users.post('/contact', function(req, res) {
    let data = req.body;
    if (!data.fullname || !data.email || !data.subject || !data.message)
        return res.send({"status": 500, "message": "Please send all required parameters"});
    data.date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let mailOptions = {
        from: data.fullname+' <applications@loan35.com>',
        to: 'getloan@loan35.com',
        subject: 'Feedback: '+data.subject,
        template: 'contact',
        context: data
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error)
            return res.send({"status": 500, "message": "Oops! An error occurred while sending feedback", "response": error});
        return res.send({"status": 200, "message": "Feedback sent successfully!"});
    });
});

users.post('/sendmail', function(req, res) {
    let data = req.body;
    if (!data.name || !data.email || !data.company || !data.phone)
        return res.send("Required Parameters not sent!");
    data.date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let mailOptions = {
        from: 'ATB Cisco <solutions@atbtechsoft.com>',
        to: 'sibironke@atbtechsoft.com',
        subject: 'ATB Cisco Application: '+data.name,
        template: 'mail',
        context: data
    };
    emailService.send(mailOptions);
    return res.send("OK");
});

/* GET User Applications. */
users.get('/applications', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        type = req.query.type;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");

    let query = 'SELECT u.fullname, u.phone, u.email, u.address, c.name corporate_name, c.email corporate_email, c.phone corporate_phone, c.address corporate_address, ' +
        'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.client_type, ' +
        'a.workflowID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.loanCirrusID, a.reschedule_amount, w.current_stage, ' +
        '(SELECT product FROM preapplications WHERE ID = a.preapplicationID) AS product, ' +
        '(SELECT status FROM client_applications WHERE ID = a.preapplicationID) AS client_applications_status, ' +
        '(CASE WHEN (SELECT COUNT(*) FROM application_information_requests WHERE applicationID = a.ID) > 0 THEN 1 ELSE 0 END) information_request_status, ' +
        '(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status ' +
        'FROM clients AS u, workflow_processes AS w, applications AS a LEFT JOIN corporates AS c ON a.userID = c.ID ' +
        'WHERE u.ID=a.userID AND a.status <> 0 AND w.ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=a.ID AND status=1) ';
    if (type){
        switch (type){
            case '1': {
                //do nothing
                break;
            }
            case '2': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage<>2  AND w.current_stage<>3 ");
                break;
            }
            case '3': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage=2 ");
                break;
            }
            case '4': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage=3 ");
                break;
            }
            case '5': {
                query = query.concat("AND a.status = 2  AND a.close_status = 0 ");
                break;
            }
            case '6': {
                query = query.concat("AND a.close_status <> 0 ");
                break;
            }
        }
    }
    if (start && end)
        query = query.concat("AND TIMESTAMP(a.date_created) < TIMESTAMP('"+end+"') AND TIMESTAMP(a.date_created) >= TIMESTAMP('"+start+"') ");
    query = query.concat("ORDER BY a.ID desc");
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
        }
    });
});

users.get('/requests', function(req, res, next) {
    let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
        'a.loan_amount, a.date_modified, a.comment FROM clients AS u, requests AS a WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
        }
    });
});

//Get A User's Applications For Profile Page
users.get('/user-applications/:id', function(req, res, next) {
    let query = 'SELECT * FROM applications WHERE userid = ? AND interest_rate <> 0 ORDER BY id desc';
    db.query(query, req.params.id, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send(results);
        }
    });
});

users.get('/application/:id', function(req, res, next) {
    let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
        'a.workflowID, a.loan_amount, a.date_modified, a.comment FROM clients AS u, applications AS a WHERE u.ID=a.userID AND u.ID =?';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
        }
    });
});

users.get('/application-id/:id', function(req, res, next) {
    let obj = {},
        application_id = req.params.id,
        path = 'files/application-'+application_id+'/',
        query = 'SELECT u.ID userID, u.fullname, u.phone, u.email, u.address, u.industry, u.date_created client_date_created, a.fees, ' +
            '(SELECT title FROM loan_purpose_settings WHERE ID = a.loan_purpose) loan_purpose, (SELECT GROUP_CONCAT(document) FROM workflow_stages WHERE workflowID = a.workflowID) documents, '+
            '(SELECT GROUP_CONCAT(download) FROM workflow_stages WHERE workflowID = a.workflowID) downloads, cast(u.loan_officer as unsigned) loan_officer, ' +
            'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.workflowID, a.interest_rate, a.repayment_date, ' +
            'a.reschedule_amount, a.loanCirrusID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.duration, a.client_type, a.interest_rate, a.duration, a.preapplicationID, ' +
            '(SELECT l.supervisor FROM users l WHERE l.ID = u.loan_officer) AS supervisor, ' +
            '(SELECT sum(amount) FROM escrow WHERE clientID=u.ID AND status=1) AS escrow, ' +
            '(SELECT status FROM client_applications WHERE ID = a.preapplicationID) AS client_applications_status, ' +
            'r.payerBankCode, r.payerAccount, r.requestId, r.mandateId, r.remitaTransRef ' +
            'FROM clients AS u INNER JOIN applications AS a ON u.ID = a.userID LEFT JOIN remita_mandates r ' +
            'ON (r.applicationID = a.ID AND r.status = 1) WHERE a.ID = ?',
        query2 = 'SELECT u.ID userID, c.ID contactID, u.name fullname, u.phone, u.email, u.address, u.industry, u.incorporation_date, u.registration_number, u.date_created client_date_created, a.fees, ' +
            '(SELECT title FROM loan_purpose_settings WHERE ID = a.loan_purpose) loan_purpose, (SELECT GROUP_CONCAT(document) FROM workflow_stages WHERE workflowID = a.workflowID) documents, '+
            '(SELECT GROUP_CONCAT(download) FROM workflow_stages WHERE workflowID = a.workflowID) downloads, cast(c.loan_officer as unsigned) loan_officer, ' +
            'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.workflowID, a.interest_rate, a.repayment_date, ' +
            'a.reschedule_amount, a.loanCirrusID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.duration, a.client_type, a.interest_rate, a.duration, a.preapplicationID, ' +
            '(SELECT l.supervisor FROM users l WHERE l.ID = c.loan_officer) AS supervisor, ' +
            '(SELECT sum(amount) FROM escrow WHERE clientID=u.ID AND status=1) AS escrow, ' +
            '(SELECT status FROM client_applications WHERE ID = a.preapplicationID) AS client_applications_status, ' +
            'r.payerBankCode, r.payerAccount, r.requestId, r.mandateId, r.remitaTransRef ' +
            'FROM corporates AS u INNER JOIN applications AS a ON u.ID = a.userID INNER JOIN clients AS c ON u.clientID=c.ID LEFT JOIN remita_mandates r ' +
            'ON (r.applicationID = a.ID AND r.status = 1) WHERE a.ID = ?';
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query('SELECT client_type FROM applications WHERE ID = ?', [application_id], function (error, app, fields) {
            if (error || !app[0]) {
                res.send({"status": 500, "error": error, "response": null});
            } else {
                if (app[0]['client_type'] === 'corporate')
                    query = query2;
                connection.query(query, [application_id], function (error, result, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        result = (result[0])? result[0] : {};
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
                                        let path2 = `files/client_application-${result.preapplicationID}/`,
                                            path3 = `files/application_download-${application_id}/`;
                                        result.files = {};
                                        fs.readdir(path, function (err, files){
                                            if (err) files = [];
                                            files = helperFunctions.removeFileDuplicates(path, files);
                                            async.forEach(files, function (file, callback){
                                                let filename = file.split('.')[0].split('_');
                                                filename.shift();
                                                obj[filename.join('_')] = path+file;
                                                callback();
                                            }, function(data){
                                                result.files = Object.assign({}, result.files, obj);
                                                obj = {};
                                                fs.readdir(path2, function (err, files){
                                                    if (err) files = [];
                                                    files = helperFunctions.removeFileDuplicates(path2, files);
                                                    async.forEach(files, function (file, callback){
                                                        let filename = file.split('.')[0].split('_');
                                                        filename.shift();
                                                        obj[filename.join('_')] = path2+file;
                                                        callback();
                                                    }, function(data){
                                                        result.files = Object.assign({}, result.files, obj);
                                                        obj = {};
                                                        fs.readdir(path3, function (err, files){
                                                            if (err) files = [];
                                                            files = helperFunctions.removeFileDuplicates(path3, files);
                                                            async.forEach(files, function (file, callback){
                                                                let filename = file.split('.')[0].split('_');
                                                                filename.shift();
                                                                obj[filename.join('_')] = path3+file;
                                                                callback();
                                                            }, function(data){
                                                                result.file_downloads = obj;
                                                                return res.send({"status": 200, "message": "User applications fetched successfully!", "response": result});
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
            }
        });
    });
});

/* GET User Applications. */
users.get('/applications/:officerID', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        type = req.query.type,
        id = req.params.officerID;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");

    let query = "SELECT u.fullname, u.phone, u.email, u.address, c.name corporate_name, c.email corporate_email, c.phone corporate_phone, c.address corporate_address, " +
        "a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.client_type, " +
        "a.loan_amount, a.date_modified, a.comment, a.close_status, a.workflowID, a.loanCirrusID, a.reschedule_amount, w.current_stage," +
        "(SELECT product FROM preapplications WHERE ID = a.preapplicationID) AS product," +
        "(SELECT status FROM client_applications WHERE ID = a.preapplicationID) AS client_applications_status, " +
        "(CASE WHEN (SELECT COUNT(*) FROM application_information_requests WHERE a.ID = applicationID) > 0 THEN 1 ELSE 0 END) information_request_status," +
        "(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status " +
        "FROM clients AS u, workflow_processes AS w, applications AS a LEFT JOIN corporates AS c ON a.userID = c.ID " +
        "WHERE u.ID=a.userID AND a.status <> 0 AND w.ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=a.ID AND status=1) ",
        query2 = query.concat('AND loan_officer = '+id+' '),
        query3 = query.concat('AND (select supervisor from users where users.id = u.loan_officer) =  '+id+' ');
    if (id)
        query = query2;
    if (type){
        switch (type){
            case '1': {
                //do nothing
                break;
            }
            case '2': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage<>2  AND w.current_stage<>3 ");
                break;
            }
            case '3': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage=2 ");
                break;
            }
            case '4': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage=3 ");
                break;
            }
            case '5': {
                query = query.concat("AND a.status = 2  AND a.close_status = 0 ");
                break;
            }
            case '6': {
                query = query.concat("AND a.close_status <> 0 ");
                break;
            }
        }
    }
    if (start && end)
        query = query.concat("AND TIMESTAMP(a.date_created) < TIMESTAMP('"+end+"') AND TIMESTAMP(a.date_created) >= TIMESTAMP('"+start+"') ");
    query = query.concat("ORDER BY a.ID desc");
    if (id){
        db.query(query, function (error, results1, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query(query3, function (error, results2, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        results = results1.concat(results2);
                        res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
                    }
                });
            }
        });
    } else {
        db.query(query, function (error, results, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
            }
        });
    }
});

users.get('/collections/filter', function(req, res, next) {
    let type = req.query.type,
        range = parseInt(req.query.range),
        today = moment().utcOffset('+0100').format('YYYY-MM-DD');

    let query = "SELECT s.ID, (select fullname from clients c where c.ID = (select userID from applications a where a.ID = s.applicationID)) AS client, " +
        "(select ID from clients c where c.ID = (select userID from applications a where a.ID = s.applicationID)) AS clientID, " +
        "s.applicationID, s.status, s.payment_amount, s.payment_collect_date, s.payment_status, 'Principal' AS 'type' FROM application_schedules AS s " +
        "WHERE s.status = 1 AND s.payment_status = 0 AND (select status from applications a where a.ID = s.applicationID) = 2 " +
        "AND (select close_status from applications a where a.ID = s.applicationID) = 0 AND s.payment_amount > 0 ";

    collectionsQueryMiddleware(query, type, range, today, function (response) {
        if (response.status !== 200)
            return res.send(response);
        let query = "SELECT s.ID, (select fullname from clients c where c.ID = (select userID from applications a where a.ID = s.applicationID)) AS client, " +
            "(select ID from clients c where c.ID = (select userID from applications a where a.ID = s.applicationID)) AS clientID, " +
            "s.applicationID, s.status, s.interest_amount as payment_amount, s.interest_collect_date as payment_collect_date, s.payment_status, 'Interest' AS 'type' FROM application_schedules AS s " +
            "WHERE s.status = 1 AND s.payment_status = 0 AND (select status from applications a where a.ID = s.applicationID) = 2 " +
            "AND (select close_status from applications a where a.ID = s.applicationID) = 0 AND s.interest_amount > 0 ",
            results_principal = response.response;
        collectionsQueryMiddleware(query, type, range, today, function (response) {
            if (response.status !== 200)
                return res.send(response);
            let results_interest = response.response,
                results = results_principal.concat(results_interest);
            return res.send({"status": 200, "message": "Collections fetched successfully!", "response": results});
        });
    });
});

function collectionsQueryMiddleware(query, type, range, today, callback) {
    switch (type) {
        case 'due': {
            query = query.concat(collectionDueRangeQuery(today, range));
            break;
        }
        case 'overdue': {
            query = query.concat(collectionOverdueRangeQuery(today, range));
            break;
        }
    }
    query = query.concat(" ORDER BY ID desc");
    db.query(query, function (error, results, fields) {
        if(error){
            callback({"status": 500, "error": error, "response": null});
        } else {
            callback({"status": 200, "response": results});
        }
    });
}

function collectionDueRangeQuery(today, range){
    switch (range){
        case 0: {
            return 'AND TIMESTAMP(payment_collect_date) = TIMESTAMP("'+today+'") ';
        }
        case 1: {
            return 'AND TIMESTAMP(payment_collect_date) = TIMESTAMP("'+moment(today).add(1, "days").format("YYYY-MM-DD")+'") ';
        }
        case 7: {
            return 'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).add(2, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).add(7, "days").format("YYYY-MM-DD")+'") ';
        }
        case 14: {
            return 'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).add(8, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).add(14, "days").format("YYYY-MM-DD")+'") ';
        }
        case 30: {
            return 'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).add(15, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).add(30, "days").format("YYYY-MM-DD")+'") ';
        }
        case 60: {
            return 'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).add(31, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).add(60, "days").format("YYYY-MM-DD")+'") ';
        }
        case 61: {
            return 'AND TIMESTAMP(payment_collect_date) > TIMESTAMP("'+moment(today).add(60, "days").format("YYYY-MM-DD")+'") ';
        }
    }
}

function collectionOverdueRangeQuery(today, range){
    switch (range){
        case 0: {
            return 'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).subtract(1, "days").format("YYYY-MM-DD")+'") ';
        }
        case 1: {
            return 'AND TIMESTAMP(payment_collect_date) = TIMESTAMP("'+moment(today).subtract(1, "days").format("YYYY-MM-DD")+'") ';
        }
        case 7: {
            return 'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).subtract(2, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).subtract(7, "days").format("YYYY-MM-DD")+'") ';
        }
        case 14: {
            return 'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).subtract(8, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).subtract(14, "days").format("YYYY-MM-DD")+'") ';
        }
        case 30: {
            return 'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).subtract(15, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).subtract(30, "days").format("YYYY-MM-DD")+'") ';
        }
        case 60: {
            return 'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).subtract(31, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).subtract(60, "days").format("YYYY-MM-DD")+'") ';
        }
        case 61: {
            return 'AND TIMESTAMP(payment_collect_date) < TIMESTAMP("'+moment(today).subtract(60, "days").format("YYYY-MM-DD")+'") ';
        }
    }
}

users.get('/requests/filter/:start/:end', function(req, res, next) {
    let start = req.params.start,
        end = req.params.end;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let query = "SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, " +
        "a.loan_amount, a.date_modified, a.comment FROM clients AS u, requests AS a WHERE u.ID=a.userID AND a.status <> 0 " +
        "AND TIMESTAMP(a.date_created) < TIMESTAMP('"+end+"') AND TIMESTAMP(a.date_created) >= TIMESTAMP('"+start+"') ORDER BY a.ID desc";
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
        }
    });
});

users.get('/applications/delete/:id', function(req, res, next) {
    let id = req.params.id,
        date_modified = Date.now(),
        query =  'UPDATE applications SET status=0, date_modified=? where ID=?';
    db.query(query,[date_modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT u.fullname, u.phone, u.email, u.address, c.name corporate_name, c.email corporate_email, c.phone corporate_phone, c.address corporate_address, ' +
                'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.client_type, ' +
                'a.workflowID, a.loan_amount, a.date_modified, a.comment, a.loanCirrusID, a.reschedule_amount,' +
                '(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status ' +
                'FROM clients AS u, applications AS a LEFT JOIN corporates AS c ON a.userID = c.ID WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
            db.query(query, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'Loan Application Archived'
                    payload.affected= id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application archived successfully!", "response": results});
                }
            });
        }
    });
});

users.get('/requests/delete/:id', function(req, res, next) {
    let id = req.params.id,
        date_modified = Date.now(),
        query =  'UPDATE requests SET status=0, date_modified=? where ID=?';
    db.query(query,[date_modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
                'a.loan_amount, a.date_modified, a.comment FROM clients AS u, requests AS a WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
            db.query(query, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'Loan Request Archived'
                    payload.affected = id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application archived successfully!", "response": results});
                }
            });
        }
    });
});

users.post('/applications/comment/:id', function(req, res, next) {
    let id = req.params.id,
        comment = req.body.comment,
        date_modified = Date.now(),
        query =  'UPDATE applications SET comment=?, date_modified=? where ID=?';
    db.query(query,[comment, date_modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT u.fullname, u.phone, u.email, u.address, c.name corporate_name, c.email corporate_email, c.phone corporate_phone, c.address corporate_address, ' +
                'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.client_type, ' +
                'a.workflowID, a.loan_amount, a.date_modified, a.comment, a.loanCirrusID, a.reschedule_amount,' +
                '(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status ' +
                'FROM clients AS u, applications AS a LEFT JOIN corporates AS c ON a.userID = c.ID WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
            db.query(query, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'New comment on Loan Application'
                    payload.affected = id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application commented successfully!", "response": results});
                }
            });
        }
    });
});

users.post('/requests/comment/:id', function(req, res, next) {
    let id = req.params.id,
        comment = req.body.comment,
        date_modified = Date.now(),
        query =  'UPDATE requests SET comment=?, date_modified=? where ID=?';
    db.query(query,[comment, date_modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
                'a.loan_amount, a.date_modified, a.comment FROM clients AS u, requests AS a WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
            db.query(query, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'New comment on Loan Request'
                    payload.affected = id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application commented successfully!", "response": results});
                }
            });
        }
    });
});

users.get('/application/assign_workflow/:id/:workflow_id/:agent_id', function(req, res, next) {
    let id = req.params.id,
        agent_id = req.params.agent_id,
        workflow_id = req.params.workflow_id,
        date_modified = Date.now(),
        query =  'UPDATE applications SET workflowID=?, date_modified=? where ID=?';
    db.query(query,[workflow_id, date_modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            helperFunctions.getNextWorkflowProcess(false,workflow_id,false, function (process) {
                process.workflowID = workflow_id;
                process.applicationID = id;
                process.agentID = agent_id;
                process.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                db.query('INSERT INTO workflow_processes SET ?',process, function (error, results, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
                            'a.workflowID, a.loan_amount, a.date_modified, a.comment FROM clients AS u, applications AS a WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
                        db.query(query, function (error, results, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                res.send({"status": 200, "message": "Workflow assigned successfully!", "response": results});
                            }
                        });
                    }
                });
            });
        }
    });
});

users.post('/workflow_process/:application_id/:workflow_id', function(req, res, next) {
    let stage = req.body.stage,
        agent_id = req.body.agentID,
        user_role = req.body.user_role,
        workflow_id = req.params.workflow_id,
        application_id = req.params.application_id;
    if (!application_id || !workflow_id || !user_role)
        return res.send({"status": 500, "error": "Required Parameter(s) not sent!"});
    if (!stage || (Object.keys(stage).length === 0 && stage.constructor === Object))
        stage = false;
    helperFunctions.getNextWorkflowProcess(application_id,workflow_id,stage, function (process) {
        process.workflowID = workflow_id;
        process.applicationID = application_id;
        if (!process.approver_id || (process.approver_id === 0))
            process.approver_id = 1;
        process.agentID = agent_id;
        process.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        db.query('SELECT * FROM workflow_processes WHERE ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=? AND status=1)', [application_id], function (error, last_process, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query('UPDATE workflow_processes SET approval_status=? WHERE ID=? AND status=1',[1,last_process[0]['ID']], function (error, status, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        if (!(((process.approver_id).split(',')).includes((user_role).toString())))
                            return res.send({"status": 500, "message": "You do not have authorization rights"});
                        delete process.approver_id;
                        db.query('INSERT INTO workflow_processes SET ?',process, function (error, results, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                let payload = {}
                                payload.category = 'Application'
                                payload.userid = req.cookies.timeout
                                payload.description = 'Loan Application moved to next Workflow Stage'
                                payload.affected = application_id
                                notificationsService.log(req, payload)
                                res.send({"status": 200, "message": "Workflow Process created successfully!"});
                            }
                        });
                    }
                });
            }
        });
    });
});

users.get('/revert_workflow_process/:application_id', function(req, res, next) {
    let query = 'SELECT * FROM workflow_processes WHERE ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=? AND status=1)';
    db.query(query, [req.params.application_id], function (error, last_process, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query('UPDATE workflow_processes SET status=? WHERE ID=?',[0,last_process[0]['ID']], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "Workflow Process reverted successfully!", "response": null});
                }
            });
        }
    });
});

users.get('/workflow_process/:application_id', function(req, res, next) {
    let query = 'SELECT * FROM workflow_processes WHERE applicationID = ? AND status=1';
    db.query(query, [req.params.application_id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Workflow Process fetched successfully!", "response": results});
        }
    });
});

users.get('/workflow_process_all/:application_id', function(req, res, next) {
    let query = 'SELECT w.ID, w.workflowID, w.previous_stage, w.current_stage, w.next_stage, w.approval_status, w.date_created, w.applicationID, w.status,' +
        'w.agentID, u.fullname AS agent, (SELECT role_name FROM user_roles WHERE ID = u.user_role) role, (SELECT name FROM workflow_stages WHERE workflowID = w.workflowID AND stageID = w.current_stage) stage ' +
        'FROM workflow_processes AS w, users AS u WHERE applicationID = ? AND w.agentID = u.ID';
    db.query(query, [req.params.application_id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "All Workflow Process fetched successfully!", "response": results});
        }
    });
});

users.post('/application/comments/:id/:user_id', function(req, res, next) {
    db.query('INSERT INTO application_comments SET ?', [{applicationID:req.params.id,userID:req.params.user_id,text:req.body.text,date_created:moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')}],
        function (error, response, fields) {
            if(error || !response)
                return res.send({"status": 500, "error": error, "response": null});
            db.query('SELECT c.text, c.date_created, u.fullname FROM application_comments AS c, users AS u WHERE c.applicationID = ? AND c.userID=u.ID ORDER BY c.ID desc', [req.params.id], function (error, comments, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'New comment on Loan Application'
                    payload.affected = req.params.id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application commented successfully!", "response": comments});
                }
            });
        });
});

users.get('/application/comments/:id', function(req, res, next) {
    db.query(`SELECT c.text, c.date_created, c.user_type,
        (CASE WHEN c.user_type = 'admin' THEN (SELECT fullname FROM users WHERE ID = c.userID)
        WHEN c.user_type = 'client' THEN (SELECT fullname FROM clients WHERE ID = c.userID) END) fullname
        FROM application_comments c WHERE c.applicationID = ${req.params.id} ORDER BY c.ID DESC`, (error, comments) => {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Application comments fetched successfully!", "response": comments});
        }
    })
});

users.post('/application/information-request/:id', (req, res) => {
    let payload = req.body;
    payload.applicationID = req.params.id;
    payload.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO application_information_requests SET ?', payload, (error, response) => {
        if(error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });
        return res.send({
            "status": 200,
            "error": null,
            "response": "Application information requested successfully!"
        });
    });
});

users.get('/application/information-request/:id', function(req, res, next) {
    db.query(`SELECT i.*, u.fullname FROM application_information_requests i, users u 
    WHERE i.applicationID = ${req.params.id} AND i.created_by=u.ID ORDER BY i.ID desc`, (error, information) => {
        if(error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });
        return res.send({
            "status": 200,
            "error": null,
            "response": information
        });
    })
});

users.post('/application/schedule/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async () => {
        db.getConnection(function(err, connection) {
            if (err) throw err;

            connection.query(`SELECT c.fullname, a.funding_source FROM applications a, clients c WHERE a.ID = ${req.params.id} 
            AND a.userID = c.ID`, function (error, client) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    connection.query(`SELECT * FROM application_schedules WHERE applicationID = ${req.params.id} 
                    AND status = 1`, function (error, invoices) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            let obj2 = {};
                            async.forEach(invoices, function (old_invoice, callback) {
                                if (old_invoice.interest_invoice_no && client[0]['funding_source']) {
                                    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient) => {
                                        if (xeroClient) {
                                            let xeroInterest2 = await xeroClient.invoices.update({
                                                Type: 'ACCREC',
                                                Contact: {
                                                    Name: client[0]['fullname']
                                                },
                                                Date: old_invoice.interest_create_date,
                                                DueDate: old_invoice.interest_collect_date,
                                                LineItems: [{
                                                    Description: `LOAN ID: ${helperFunctions.padWithZeroes(old_invoice.applicationID, 6)}`,
                                                    Quantity: '1',
                                                    UnitAmount: old_invoice.interest_amount,
                                                    AccountCode: client[0]['funding_source']
                                                }],
                                                InvoiceNumber: old_invoice.interest_invoice_no,
                                                Status: "VOIDED"
                                            });
                                        }
                                    });
                                }
                                obj2.date_modified = date_modified;
                                obj2.status = 0;
                                connection.query(`UPDATE application_schedules SET ? WHERE ID = ${old_invoice.ID}`, 
                                obj2, function (error, response) {
                                    if(error) console.log(error);
                                    callback();
                                });
                            }, function (data) {
                                let LineItems = [],
                                    schedule = req.body.schedule;
                                if (client[0]['funding_source']) {
                                    for (let i=0; i<schedule.length; i++) {
                                        let invoice = schedule[i];
                                        LineItems.push({
                                            Description: `LOAN ID: ${helperFunctions.padWithZeroes(req.params.id, 6)}`,
                                            Quantity: '1',
                                            UnitAmount: invoice.payment_amount,
                                            AccountCode: client[0]['funding_source']
                                        });
                                    }
                                }
                                xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient) => {
                                    let xeroPrincipal;
                                    if (xeroClient && client[0]['funding_source']) {
                                        xeroPrincipal = await xeroClient.invoices.create({
                                            Type: 'ACCREC',
                                            Contact: {
                                                Name: client[0]['fullname']
                                            },
                                            Date: schedule[0]['payment_create_date'],
                                            DueDate: schedule[0]['payment_collect_date'],
                                            LineItems: LineItems,
                                            Status: "AUTHORISED"
                                        });
                                    }
                                    syncXeroSchedule(req, res, connection, client[0], schedule, xeroPrincipal, 'post')
                                    .then(response => {
                                        connection.release();
                                        res.send({
                                            "status": 200,
                                            "message": `Application scheduled with ${schedule.length} invoice(s) successfully!`,
                                            "response": null
                                        });
                                    });
                                });
                            });
                        }
                    });
                }
            });
        });
    });
});

async function syncXeroSchedule (req, res, connection, client, schedule, xeroPrincipal, method) {
    for (let i=0; i <schedule.length; i++)
        await postXeroSchedule(req, res, connection, schedule[i], client, xeroPrincipal, method);
    return;
}

async function postXeroSchedule (req, res, connection, obj, client, xeroPrincipal, method) {
    const xeroClient = await xeroFunctions.authorizedOperation(req, res, 'xero_loan_account');
    const date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    if (xeroClient && client.funding_source) {
        let xeroInterest = await xeroClient.invoices.create({
            Type: 'ACCREC',
            Contact: {
                Name: client.fullname
            },
            Date: obj.interest_create_date,
            DueDate: obj.interest_collect_date,
            LineItems: [{
                Description: `LOAN ID: ${helperFunctions.padWithZeroes(obj.applicationID, 6)}`,
                Quantity: '1',
                UnitAmount: obj.interest_amount,
                AccountCode: client.funding_source
            }],
            Status: "AUTHORISED"
        });
        obj.principal_invoice_no = xeroPrincipal.Invoices[0]['InvoiceNumber'];
        obj.interest_invoice_no = xeroInterest.Invoices[0]['InvoiceNumber'];
    }
    let query;
    if (method === 'post') {
        obj.applicationID = req.params.id;
        obj.date_created = date;
        query = 'INSERT INTO application_schedules SET ?';
    }
    if (method === 'put') {
        obj.date_modified = date;
        obj.status = 1;
        query = `UPDATE application_schedules SET ? WHERE ID = ${obj.ID}`;
    }
    connection.query(query, obj, error => {});
    return;
}

users.post('/application/approve-schedule/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async () => {
        db.getConnection(function(err, connection) {
            if (err) throw err;

            connection.query(`SELECT a.ID, a.loan_amount amount, a.userID clientID, a.funding_source, c.loan_officer loan_officerID, c.branch branchID, c.fullname 
                FROM applications a, clients c WHERE a.ID=${req.params.id} AND a.userID=c.ID`, function (error, app, fields) {
                if (error) {
                    res.send({"status": 500, "error": error, "response": null});
                } else if (!app[0]) {
                    res.send({"status": 500, "error": "Application does not exist!", "response": null});
                } else {
                    let application = app[0],
                        reschedule_amount = req.body.reschedule_amount,
                        loan_amount_update = req.body.loan_amount_update,
                        date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    connection.query('UPDATE applications SET loan_amount = ?, reschedule_amount = ?, date_modified = ? WHERE ID = ?', 
                    [loan_amount_update,reschedule_amount,date_modified,req.params.id], function (error, invoice) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            connection.query(`SELECT * FROM application_schedules WHERE applicationID = ${req.params.id} AND status = 1`, (error, old_schedule) => {
                                let obj2 = {};
                                async.forEach(old_schedule, (old_invoice, callback2) => {
                                    if (old_invoice.interest_invoice_no && application.funding_source) {
                                        xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient) => {
                                            if (xeroClient) {
                                                let xeroInterest2 = await xeroClient.invoices.update({
                                                    Type: 'ACCREC',
                                                    Contact: {
                                                        Name: application.fullname
                                                    },
                                                    Date: old_invoice.interest_create_date,
                                                    DueDate: old_invoice.interest_collect_date,
                                                    LineItems: [{
                                                        Description: `LOAN ID: ${helperFunctions.padWithZeroes(old_invoice.applicationID, 6)}`,
                                                        Quantity: '1',
                                                        UnitAmount: old_invoice.interest_amount,
                                                        AccountCode: application.funding_source
                                                    }],
                                                    InvoiceNumber: old_invoice.interest_invoice_no,
                                                    Status: "VOIDED"
                                                });
                                            }
                                        });
                                    }
                                    obj2.date_modified = date_modified;
                                    obj2.status = 0;
                                    connection.query(`UPDATE application_schedules SET ? WHERE ID = ${old_invoice.ID}`, 
                                    obj2, function (error, response) {
                                        if(error) console.log(error);
                                        callback2();
                                    });
                                }, (data) => {
                                    connection.query(`SELECT * FROM application_schedules WHERE applicationID = ${req.params.id} AND status = 2`, (error, new_schedule) => {
                                        let LineItems = [];
                                        if (application.funding_source) {
                                            for (let i=0; i<new_schedule.length; i++) {
                                                let invoice = new_schedule[i];
                                                LineItems.push({
                                                    Description: `LOAN ID: ${helperFunctions.padWithZeroes(req.params.id, 6)}`,
                                                    Quantity: '1',
                                                    UnitAmount: invoice.payment_amount,
                                                    AccountCode: application.funding_source
                                                });
                                            }
                                        }
                                        xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient) => {
                                            let xeroPrincipal;
                                            if (xeroClient && application.funding_source) {
                                                xeroPrincipal = await xeroClient.invoices.create({
                                                    Type: 'ACCREC',
                                                    Contact: {
                                                        Name: application.fullname
                                                    },
                                                    Date: new_schedule[0]['payment_create_date'],
                                                    DueDate: new_schedule[0]['payment_collect_date'],
                                                    LineItems: LineItems,
                                                    Status: "AUTHORISED"
                                                });
                                            }
                                            syncXeroSchedule(req, res, connection, application, new_schedule, xeroPrincipal, 'put')
                                            .then(response => {
                                                let disbursement = {
                                                    loan_id: application.ID,
                                                    amount: reschedule_amount,
                                                    client_id: application.clientID,
                                                    loan_officer: application.loan_officerID,
                                                    branch: application.branchID,
                                                    date_disbursed: date_modified,
                                                    status: 1,
                                                    date_created: date_modified
                                                };
                                                connection.query(`INSERT INTO disbursement_history SET ?`, disbursement, function (error, result, fields) {
                                                    if(error){
                                                        res.send({"status": 500, "error": error, "response": null});
                                                    } else {
                                                        let payload = {};
                                                        payload.category = 'Application';
                                                        payload.userid = req.cookies.timeout;
                                                        payload.description = 'Application Schedule Approved for Loan Application';
                                                        payload.affected = req.params.id;
                                                        notificationsService.log(req, payload);
                                                        connection.release();
                                                        res.send({
                                                            "status": 200,
                                                            "message": `Application schedule with ${new_schedule.length} invoice(s) approved successfully!`,
                                                            "response": null
                                                        });
                                                    }
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
        });
    });
});

users.get('/application/reject-schedule/:id', function(req, res, next) {
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query('SELECT * FROM application_schedules WHERE applicationID = ? AND status = 2', [req.params.id], function (error, new_schedule, fields) {
            if (error) {
                res.send({"status": 500, "error": error, "response": null});
            } else {
                let count = 0;
                async.forEach(new_schedule, function (obj, callback2) {
                    connection.query('DELETE FROM application_schedules WHERE ID = ?', [obj.ID], function (error, response, fields) {
                        if(!error)
                            count++;
                        callback2();
                    });
                }, function (data) {
                    connection.release();
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'Schedule Rejected for Loan Application'
                    payload.affected = req.params.id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application schedule with "+count+" invoices deleted successfully!", "response": null});
                });
            }
        });
    });
});

users.post('/application/add-schedule/:id', function(req, res, next) {
    db.getConnection(function(err, connection) {
        if (err) throw err;

        let count = 0;
        async.forEach(req.body.schedule, function (obj, callback) {
            obj.applicationID = req.params.id;
            obj.status = 2;
            obj.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            connection.query('INSERT INTO application_schedules SET ?', obj, function (error, response, fields) {
                if(!error)
                    count++;
                callback();
            });
        }, function (data) {
            connection.release();
            let payload = {}
            payload.category = 'Application'
            payload.userid = req.cookies.timeout
            payload.description = 'New Schedule Uploaded for Loan Application'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send({"status": 200, "message": "Application scheduled with "+count+" invoices successfully!", "response": null});
        })
    });
});

users.get('/application/schedule/:id', function(req, res, next) {
    db.query('SELECT * FROM application_schedules WHERE applicationID = ? AND status = 1', [req.params.id], function (error, schedule, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Application schedule fetched successfully!", "response": schedule});
        }
    });
});

users.post('/application/add-payment/:id/:agent_id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async () => {
        db.query('SELECT a.funding_source, c.fullname FROM applications a, clients c '+
        'WHERE a.ID = ? AND a.userID = c.ID', [req.params.id], function (error, application, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                let data = req.body;
                data.applicationID = req.params.id;
                data.payment_create_date = data.interest_create_date;
                data.payment_collect_date = data.interest_collect_date;
                data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient) => {
                    if (xeroClient && application[0]['funding_source']) {
                        let xeroInterest = await xeroClient.invoices.create({
                            Type: 'ACCREC',
                            Contact: {
                                Name: application[0]['fullname']
                            },
                            Date: data.interest_create_date,
                            DueDate: data.interest_collect_date,
                            LineItems: [{
                                Description: `LOAN ID: ${helperFunctions.padWithZeroes(data.applicationID, 6)}`,
                                Quantity: '1',
                                UnitAmount: data.interest_amount,
                                AccountCode: application[0]['funding_source']
                            }],
                            Status: "AUTHORISED"
                        });
                        data.interest_invoice_no = xeroInterest.Invoices[0]['InvoiceNumber'];
                    }
                    db.query('INSERT INTO application_schedules SET ?', data, function (error, response, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            let payload = {}
                            payload.category = 'Application'
                            payload.userid = req.cookies.timeout
                            payload.description = 'New Loan Application Payment'
                            payload.affected = req.params.id
                            notificationsService.log(req, payload)
                            return res.send({"status": 200, "message": "Payment added successfully!"});
                        }
                    });
                });
            }
        });
    });
});

users.get('/application/confirm-payment/:id', function(req, res, next) {
    db.query('UPDATE application_schedules SET payment_status=1 WHERE ID = ?', [req.params.id], function (error, invoice, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Invoice Payment confirmed successfully!"});
        }
    });
});

users.post('/application/edit-schedule/:id/:modifier_id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async () => {
        let data = req.body;
        data.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        data.modifierID = req.params.modifier_id;
        db.getConnection(function(err, connection) {
            if (err) throw err;

            connection.query('UPDATE application_schedules SET ? WHERE ID = '+req.params.id, data, function (error, response, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    connection.query('SELECT s.*, a.funding_source, c.fullname FROM application_schedules s, applications a, clients c '+
                    'WHERE s.ID = ? AND a.ID = s.applicationID AND c.ID = a.userID',[req.params.id], function (error, invoice_obj, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            let invoice = {
                                invoiceID: invoice_obj[0].ID,
                                applicationID: invoice_obj[0].applicationID,
                                interest_amount: invoice_obj[0].interest_amount,
                                payment_amount: invoice_obj[0].payment_amount,
                                payment_collect_date: invoice_obj[0].payment_collect_date,
                                payment_create_date: invoice_obj[0].payment_create_date,
                                interest_collect_date: invoice_obj[0].interest_collect_date,
                                interest_create_date: invoice_obj[0].interest_create_date,
                                fees_amount: invoice_obj[0].fees_amount,
                                penalty_amount: invoice_obj[0].penalty_amount,
                                date_modified: invoice_obj[0].date_modified,
                                modifierID: invoice_obj[0].modifierID
                            };
                            if (invoice_obj[0]['interest_invoice_no'])
                                invoice['interest_invoice_no'] = invoice_obj[0]['interest_invoice_no'];
                            if (invoice_obj[0]['payment_invoice_no'])
                                invoice['payment_invoice_no'] = invoice_obj[0]['payment_invoice_no'];
                            connection.query('INSERT INTO edit_schedule_history SET ? ', invoice, function (error, response, fields) {
                                connection.release();
                                if(error){
                                    res.send({"status": 500, "error": error, "response": null});
                                } else {
                                    if (invoice.interest_invoice_no && invoice_obj[0]['funding_source']) {
                                        xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient) => {
                                            if (xeroClient) {
                                                let xeroInterest = await xeroClient.invoices.update({
                                                    Type: 'ACCREC',
                                                    Contact: {
                                                        Name: invoice_obj[0]['fullname']
                                                    },
                                                    Date: invoice.interest_create_date,
                                                    DueDate: invoice.interest_collect_date,
                                                    LineItems: [{
                                                        Description: `LOAN ID: ${helperFunctions.padWithZeroes(invoice.applicationID, 6)}`,
                                                        Quantity: '1',
                                                        UnitAmount: invoice.interest_amount,
                                                        AccountCode: invoice_obj[0]['funding_source']
                                                    }],
                                                    InvoiceNumber: invoice.interest_invoice_no
                                                });
                                            }
                                        });
                                    }
                                    let payload = {}
                                    payload.category = 'Application'
                                    payload.userid = req.cookies.timeout
                                    payload.description = 'Loan Application Schedule updated'
                                    payload.affected = req.params.id
                                    notificationsService.log(req, payload)
                                    res.send({"status": 200, "message": "Schedule updated successfully!"});
                                }
                            });
                        }
                    });
                }
            });
        });
    });
});

users.get('/application/edit-schedule-history/:id', function(req, res, next) {
    db.query('SELECT s.ID, s.invoiceID, s.payment_amount, s.interest_amount, s.fees_amount, s.penalty_amount, s.payment_collect_date, s.date_modified, s.modifierID,' +
        's.applicationID, u.fullname AS modified_by FROM edit_schedule_history AS s, users AS u WHERE s.modifierID=u.ID AND invoiceID = ? ORDER BY ID desc', [req.params.id], function (error, history, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Edit schedule history fetched successfully!", "response":history});
        }
    });
});

users.get('/application/schedule-history/write-off/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_writeoff', async () => {
        db.query(`SELECT xero_writeoff_account FROM integrations WHERE ID = (SELECT MAX(ID) FROM integrations)`, (error, integrations) => {
            db.query('SELECT s.interest_invoice_no, s.interest_amount, a.ID applicationID, c.fullname FROM application_schedules s, applications a, clients c '+
            'WHERE s.ID = '+req.params.id+' AND s.applicationID = a.ID AND a.userID = c.ID', function (error, invoice, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let update = {
                        payment_status: 2,
                        date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
                    };
                    db.query('UPDATE application_schedules SET ? WHERE ID = '+req.params.id, update, function (error, result, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            xeroFunctions.authorizedOperation(req, res, 'xero_writeoff', async (xeroClient) => {
                                if (xeroClient && invoice[0]['interest_invoice_no'] && integrations[0] && integrations[0]['xero_writeoff_account']) {
                                    let xeroWriteOff = await xeroClient.creditNotes.create({
                                        Type: 'ACCRECCREDIT',
                                        Status: 'AUTHORISED',
                                        Contact: {
                                            Name: invoice[0]['fullname']
                                        },
                                        Date: update.date_modified,
                                        LineItems: [{
                                            Description: `LoanID: ${helperFunctions.padWithZeroes(invoice[0]['applicationID'], 6)}`,
                                            Quantity: '1',
                                            UnitAmount: invoice[0]['interest_amount'],
                                            AccountCode: integrations[0]['xero_writeoff_account'],
                                            TaxType: 'NONE'
                                        }]
                                    });
                                    let xeroWriteOff2 = await xeroClient.creditNotes.update({
                                        Type: 'ACCRECCREDIT',
                                        CreditNoteNumber: xeroWriteOff.CreditNotes[0]['CreditNoteNumber'],
                                        Contact: {
                                            Name: invoice[0]['fullname']
                                        },
                                        Amount: invoice[0]['interest_amount'],
                                        Invoice: {
                                            InvoiceNumber: invoice[0]['interest_invoice_no']
                                        },
                                        Date: update.date_modified
                                    });
                                }
                            });
                            res.send({"status": 200, "message": "Schedule write off successful!"});
                        }
                    });
                }
            });
        });
    });
});

users.post('/application/confirm-payment/:id/:application_id/:agent_id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async () => {
        db.query(`SELECT a.ID, a.loan_amount amount, a.userID clientID, c.loan_officer loan_officerID, c.branch branchID, 
            s.principal_invoice_no, s.interest_invoice_no FROM applications a, clients c, application_schedules s 
            WHERE a.ID = ${req.params.application_id} AND a.userID = c.ID AND a.ID = s.applicationID AND s.ID = ${req.params.id}`, (error, app) => {
            if (error) {
                res.send({"status": 500, "error": error, "response": null});
            } else if (!app[0]) {
                res.send({"status": 500, "error": "Application does not exist!", "response": null});
            } else {
                let data = req.body,
                    application = app[0],
                    postData = Object.assign({},req.body);
                postData.payment_status = 1;
                delete postData.payment_source;
                delete postData.payment_date;
                delete postData.remitaPaymentID;
                delete postData.xeroCollectionBankID;
                db.query('UPDATE application_schedules SET ? WHERE ID = '+req.params.id, postData, function (error, invoice, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        let invoice = {};
                        invoice.invoiceID = req.params.id;
                        invoice.agentID = req.params.agent_id;
                        invoice.applicationID = req.params.application_id;
                        invoice.payment_amount = data.actual_payment_amount;
                        invoice.interest_amount = data.actual_interest_amount;
                        invoice.fees_amount = data.actual_fees_amount;
                        invoice.penalty_amount = data.actual_penalty_amount;
                        invoice.payment_source = data.payment_source;
                        invoice.payment_date = data.payment_date;
                        invoice.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                        invoice.clientID = application.clientID;
                        invoice.loan_officerID = application.loan_officerID;
                        invoice.branchID = application.branchID;
                        if (data.xeroCollectionBankID)
                            invoice.xeroCollectionBankID = data.xeroCollectionBankID;
                        if (data.remitaPaymentID) invoice.remitaPaymentID = data.remitaPaymentID;
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
                        xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async (xeroClient) => {
                            if (xeroClient && invoice.payment_amount > 0 && 
                                application.principal_invoice_no && invoice.xeroCollectionBankID) {
                                let xeroPayment = await xeroClient.payments.create({
                                    Invoice: {
                                        InvoiceNumber: application.principal_invoice_no
                                    },
                                    Account: {
                                        Code: invoice.xeroCollectionBankID
                                    },
                                    Date: invoice.date_created,
                                    Amount: invoice.payment_amount,
                                    IsReconciled: true
                                });
                                invoice.xeroPrincipalPaymentID = xeroPayment.Payments[0]['PaymentID'];
                            }
                            if (xeroClient && invoice.interest_amount > 0 && 
                                application.interest_invoice_no && invoice.xeroCollectionBankID) {
                                let xeroPayment = await xeroClient.payments.create({
                                    Invoice: {
                                        InvoiceNumber: application.interest_invoice_no
                                    },
                                    Account: {
                                        Code: invoice.xeroCollectionBankID
                                    },
                                    Date: invoice.date_created,
                                    Amount: invoice.interest_amount,
                                    IsReconciled: true
                                });
                                invoice.xeroInterestPaymentID = xeroPayment.Payments[0]['PaymentID'];
                            }
                            db.query('INSERT INTO schedule_history SET ?', invoice, function (error, response, fields) {
                                if(error){
                                    res.send({"status": 500, "error": error, "response": null});
                                } else {
                                    let payload = {};
                                    payload.category = 'Application';
                                    payload.userid = req.cookies.timeout;
                                    payload.description = 'Loan Application Payment Confirmed';
                                    payload.affected = req.params.application_id;
                                    notificationsService.log(req, payload);
                                    if (!invoice.remitaPaymentID)
                                        return res.send({"status": 200, "message": "Invoice Payment confirmed successfully!"});
                                    let update = {};
                                    update.status = enums.REMITA_PAYMENT.STATUS.FULL_ASSIGNED;
                                    update.invoiceID = invoice.invoiceID;
                                    update.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                    db.query(`UPDATE remita_payments Set ? WHERE ID = ${invoice.remitaPaymentID}`, update, function (error, response) {
                                        if (error)
                                            console.log(error);
                                        return res.send({"status": 200, "message": "Invoice Payment confirmed successfully!"});
                                    });
                                }
                            });
                        });
                    }
                });
            }
        });
    });
});

users.post('/application/escrow', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_escrow', async () => {
        let data = req.body;
        data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        db.query(`SELECT xero_escrow_account FROM integrations WHERE ID = (SELECT MAX(ID) FROM integrations)`, (error, integrations) => {
            db.query(`SELECT fullname FROM clients WHERE ID = ${data.clientID}`, (error, client) => {
                if (data.type === 'debit') {
                    //Allocating Overpayment in xero
                    db.query('INSERT INTO escrow SET ?', data, function (error, result, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            res.send({"status": 200, "message": "Escrow saved successfully!"});
                        }
                    });
                } else {
                    xeroFunctions.authorizedOperation(req, res, 'xero_escrow', async (xeroClient) => {
                        if (xeroClient && integrations[0] && integrations[0]['xero_escrow_account']) {
                            let xeroPayment = await xeroClient.bankTransactions.create({
                                Type: 'RECEIVE-OVERPAYMENT',
                                Contact: {
                                    Name: client[0]['fullname']
                                },
                                BankAccount: {
                                    Code: integrations[0]['xero_escrow_account']
                                },
                                LineItems: [{
                                    Description: `ClientID: ${helperFunctions.padWithZeroes(data.clientID, 6)}`,
                                    LineAmount: data.amount
                                }]
                            });
                            data.xeroOverpaymentID = xeroPayment.BankTransactions[0]['OverpaymentID'];
                        }
                        db.query('INSERT INTO escrow SET ?', data, function (error, result, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                res.send({"status": 200, "message": "Escrow saved successfully!"});
                            }
                        });
                    });
                }
            });
        });
    });
});

users.get('/application/escrow-history/:clientID', function(req, res, next) {
    db.query('SELECT * FROM escrow WHERE clientID = '+req.params.clientID, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Escrow fetched successfully!", response: result});
        }
    });
});

Number.prototype.round = function(p) {
    p = p || 10;
    return parseFloat( this.toFixed(p) );
};

users.post('/application/disburse/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async () => {
        db.query(`SELECT a.ID, a.loan_amount amount, a.userID clientID, c.loan_officer loan_officerID, c.branch branchID 
            FROM applications a, clients c WHERE a.ID=${req.params.id} AND a.userID=c.ID`, function (error, app, fields) {
            if (error) {
                res.send({"status": 500, "error": error, "response": null});
            } else if (!app[0]) {
                res.send({"status": 500, "error": "Application does not exist!", "response": null});
            } else {
                let data = req.body,
                    application = app[0];
                data.status = 2;
                data.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                db.query(`UPDATE applications SET ? WHERE ID = ${req.params.id}`, data, function (error, result, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        let disbursement = {
                            loan_id: application.ID,
                            amount: application.amount,
                            client_id: application.clientID,
                            loan_officer: application.loan_officerID,
                            branch: application.branchID,
                            date_disbursed: data.disbursement_date,
                            status: 1,
                            date_created: data.date_modified
                        };
                        db.query(`INSERT INTO disbursement_history SET ?`, disbursement, function (error, result, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                let payload = {};
                                payload.category = 'Application';
                                payload.userid = req.cookies.timeout;
                                payload.description = 'Loan Disbursed';
                                payload.affected = req.params.id;
                                notificationsService.log(req, payload);
                                createXeroSchedule(req, res);
                                res.send({"status": 200, "message": "Loan disbursed successfully!"});
                            }
                        });
                    }
                });
            }
        });
    });
});

function createXeroSchedule (req, res) {
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(`SELECT c.fullname, a.funding_source FROM applications a, clients c WHERE a.ID = ${req.params.id} 
        AND a.userID = c.ID`, function (error, client) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                connection.query(`SELECT * FROM application_schedules WHERE applicationID = ${req.params.id} 
                AND status = 1`, function (error, invoices) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        let LineItems = [],
                            schedule = invoices;
                        if (client[0]['funding_source']) {
                            for (let i=0; i<schedule.length; i++) {
                                let invoice = schedule[i];
                                LineItems.push({
                                    Description: `LOAN ID: ${helperFunctions.padWithZeroes(req.params.id, 6)}`,
                                    Quantity: '1',
                                    UnitAmount: invoice.payment_amount,
                                    AccountCode: client[0]['funding_source']
                                });
                            }
                        }
                        xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient) => {
                            let xeroPrincipal;
                            if (xeroClient && client[0]['funding_source']) {
                                xeroPrincipal = await xeroClient.invoices.create({
                                    Type: 'ACCREC',
                                    Contact: {
                                        Name: client[0]['fullname']
                                    },
                                    Date: schedule[0]['payment_create_date'],
                                    DueDate: schedule[0]['payment_collect_date'],
                                    LineItems: LineItems,
                                    Status: "AUTHORISED"
                                });
                            }
                            syncXeroSchedule(req, res, connection, client[0], schedule, xeroPrincipal, 'put')
                            .then(response => {
                                connection.release();
                            });
                        });
                    }
                });
            }
        });
    });
}

users.get('/application/invoice-history/:id', function(req, res, next) {
    db.query('SELECT s.ID, s.invoiceID, s.payment_amount, s.interest_amount, s.fees_amount, s.penalty_amount, s.payment_date, s.date_created, s.status,' +
        's.applicationID, u.fullname AS agent FROM schedule_history AS s, users AS u WHERE s.agentID=u.ID AND invoiceID = ? ORDER BY ID desc', [req.params.id], function (error, history, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Invoice history fetched successfully!", "response":history});
        }
    });
});

users.get('/application/payment-reversal/:id/:invoice_id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async () => {
        let id;
        db.query('UPDATE schedule_history SET status=0 WHERE ID=?', [req.params.id], function (error, history, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query('select applicationID, xeroPrincipalPaymentID, xeroInterestPaymentID from schedule_history where ID = ?', 
                [req.params.id], function(error, result, fields){
                    if (error){
                        res.send({"status": 500, "error": error, "response": null});
                    }
                    else {
                        id = result[0]['applicationID'];
                        if (result[0]['xeroPrincipalPaymentID'] || result[0]['xeroInterestPaymentID']) {
                            xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async (xeroClient) => {
                                if (xeroClient && result[0]['xeroPrincipalPaymentID']) {
                                    let xeroPayment = await xeroClient.payments.update(
                                        {
                                            Status: 'DELETED'
                                        },
                                        {
                                            PaymentID: result[0]['xeroPrincipalPaymentID']
                                        }
                                    );
                                }
                                if (xeroClient && result[0]['xeroInterestPaymentID']) {
                                    let xeroPayment = await xeroClient.payments.update(
                                        {
                                            Status: 'DELETED'
                                        },
                                        {
                                            PaymentID: result[0]['xeroInterestPaymentID']
                                        }
                                    );
                                }
                            });
                        }
                        db.query('UPDATE application_schedules SET payment_status=0 WHERE ID=?', [req.params.invoice_id], function (error, history, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                let payload = {}
                                payload.category = 'Application'
                                payload.userid = req.cookies.timeout
                                payload.description = 'Payment Reversed for Loan'
                                payload.affected = id
                                notificationsService.log(req, payload)
                                res.send({"status": 200, "message": "Payment reversed successfully!", "response":history});
                            }
                        });
                    }
                });
            }
        });
    });
});

users.get('/application/escrow-payment-reversal/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_escrow', async () => {
        let update = {};
        update.status = 0,
        update.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        db.query(`SELECT xero_escrow_account FROM integrations WHERE ID = (SELECT MAX(ID) FROM integrations)`, (error, integrations) => {
            db.query(`SELECT clientID, amount, xeroOverpaymentID FROM escrow WHERE ID = ${req.params.id}`, [req.params.id], function (error, escrow, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    if (escrow[0]['xeroOverpaymentID'] && integrations[0] && integrations[0]['xero_escrow_account']) {
                        xeroFunctions.authorizedOperation(req, res, 'xero_escrow', async (xeroClient) => {
                            if (xeroClient) {
                                let xeroPayment = await xeroClient.payments.update({
                                    Overpayment: {
                                        OverpaymentID: escrow[0]['xeroOverpaymentID']
                                    },
                                    Account: {
                                        Code: integrations[0]['xero_escrow_account']
                                    },
                                    Date: update.date_modified,
                                    Amount: escrow[0]['amount'],
                                    Reference: `CLIENT ID: ${helperFunctions.padWithZeroes(escrow[0]['clientID'], 6)}`
                                });
                            }
                        });
                    }
                    db.query(`UPDATE escrow SET ? WHERE ID = ${req.params.id}`, update, function (error, response, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            
                            res.send({"status": 200, "message": "Payment reversed successfully!"});
                        }
                    });
                }
            });
        });
    });
});

users.post('/application/loancirrus-id/:application_id', function(req, res, next) {
    db.query('UPDATE applications SET loanCirrusID=? WHERE ID=?', [req.body.id,req.params.application_id], function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Loan Cirrus ID updated successfully!"});
        }
    });
});

users.post('/application/pay-off/:id/:agentID', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_payoff', async () => {
        let data = req.body;
        data.close_status = 1;
        db.getConnection(function(err, connection) {
            if (err) throw err;

            connection.query(`SELECT xero_payoff_account FROM integrations WHERE ID = (SELECT MAX(ID) FROM integrations)`, (error, integrations) => {
                connection.query(`SELECT a.ID, a.loan_amount amount, a.userID clientID, c.loan_officer loan_officerID, c.branch branchID 
                    FROM applications a, clients c WHERE a.ID = ${req.params.id} AND a.userID = c.ID`, (error, app) => {
                    if (error) {
                        res.send({"status": 500, "error": error, "response": null});
                    } else if (!app[0]) {
                        res.send({"status": 500, "error": "Application does not exist!", "response": null});
                    } else {
                        let application = app[0];
                        connection.query('UPDATE applications SET ? WHERE ID = '+req.params.id, data, function (error, result, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                connection.query('SELECT * FROM application_schedules WHERE applicationID = ? AND status = 1 AND payment_status = 0', [req.params.id], function (error, invoices, fields) {
                                    if(error){
                                        res.send({"status": 500, "error": error, "response": null});
                                    } else {
                                        async.forEach(invoices, function (invoice_obj, callback) {
                                            let invoice = {};
                                            invoice.invoiceID = invoice_obj.ID;
                                            invoice.applicationID = req.params.id;
                                            invoice.payment_amount = invoice_obj.payment_amount;
                                            invoice.interest_amount = invoice_obj.interest_amount;
                                            invoice.fees_amount = invoice_obj.fees_amount;
                                            invoice.penalty_amount = invoice_obj.penalty_amount;
                                            invoice.agentID = req.params.agentID;
                                            invoice.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                            invoice.payment_date = moment().utcOffset('+0100').format('YYYY-MM-DD');
                                            invoice.payment_source = 'cash';
                                            invoice.clientID = application.clientID;
                                            invoice.loan_officerID = application.loan_officerID;
                                            invoice.branchID = application.branchID;
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
                                            xeroFunctions.authorizedOperation(req, res, 'xero_payoff', async (xeroClient) => {
                                                if (xeroClient && invoice.payment_amount > 0 && invoice_obj.principal_invoice_no && 
                                                integrations[0] && integrations[0]['xero_payoff_account']) {
                                                    let xeroPayment = await xeroClient.payments.create({
                                                        Invoice: {
                                                            InvoiceNumber: invoice_obj.principal_invoice_no
                                                        },
                                                        Account: {
                                                            Code: integrations[0]['xero_payoff_account']
                                                        },
                                                        Date: invoice.date_created,
                                                        Amount: invoice.payment_amount,
                                                        IsReconciled: true
                                                    });
                                                    invoice.xeroPrincipalPaymentID = xeroPayment.Payments[0]['PaymentID'];
                                                }
                                                if (xeroClient && invoice.interest_amount > 0 && invoice_obj.interest_invoice_no && 
                                                integrations[0] && integrations[0]['xero_payoff_account']) {
                                                    let xeroPayment = await xeroClient.payments.create({
                                                        Invoice: {
                                                            InvoiceNumber: invoice_obj.interest_invoice_no
                                                        },
                                                        Account: {
                                                            Code: integrations[0]['xero_payoff_account']
                                                        },
                                                        Date: invoice.date_created,
                                                        Amount: invoice.interest_amount,
                                                        IsReconciled: true
                                                    });
                                                    invoice.xeroInterestPaymentID = xeroPayment.Payments[0]['PaymentID'];
                                                }
                                                connection.query('UPDATE application_schedules SET payment_status=1 WHERE ID = ?', [invoice_obj.ID], function (error, result, fields) {
                                                    connection.query('INSERT INTO schedule_history SET ?', invoice, function (error, response, fields) {
                                                        callback();
                                                    });
                                                });
                                            });
                                        }, function (data) {
                                            connection.release();
                                            let payload = {};
                                            payload.category = 'Application';
                                            payload.userid = req.cookies.timeout;
                                            payload.description = 'Loan Application Paid Off';
                                            payload.affected = req.params.id;
                                            notificationsService.log(req, payload);
                                            res.send({"status": 200, "message": "Application pay off successful!"});
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
});

users.post('/application/write-off/:id/:agentID', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_writeoff', async () => {
        db.query(`SELECT xero_writeoff_account FROM integrations WHERE ID = (SELECT MAX(ID) FROM integrations)`, (error, integrations) => {
            db.query('SELECT s.principal_invoice_no, c.fullname FROM applications a, application_schedules s, clients c '+
            'WHERE a.ID = '+req.params.id+' AND s.ID = (SELECT MIN(ID) FROM application_schedules WHERE a.ID = applicationID AND status = 1) '+
            'AND a.userID = c.ID', function (error, invoice, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let data = req.body;
                    data.close_status = 2;
                    data.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    db.query('UPDATE applications SET ? WHERE ID = '+req.params.id, data, function (error, result, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            xeroFunctions.authorizedOperation(req, res, 'xero_writeoff', async (xeroClient) => {
                                if (xeroClient && invoice[0]['principal_invoice_no'] && integrations[0] && integrations[0]['xero_writeoff_account']) {
                                    let xeroWriteOff = await xeroClient.creditNotes.create({
                                        Type: 'ACCRECCREDIT',
                                        Status: 'AUTHORISED',
                                        Contact: {
                                            Name: invoice[0]['fullname']
                                        },
                                        Date: data.date_modified,
                                        LineItems: [{
                                            Description: `LoanID: ${helperFunctions.padWithZeroes(req.params.id, 6)}`,
                                            Quantity: '1',
                                            UnitAmount: data.close_amount,
                                            AccountCode: integrations[0]['xero_writeoff_account'],
                                            TaxType: 'NONE'
                                        }]
                                    });
                                    let xeroWriteOff2 = await xeroClient.creditNotes.update({
                                        Type: 'ACCRECCREDIT',
                                        CreditNoteNumber: xeroWriteOff.CreditNotes[0]['CreditNoteNumber'],
                                        Contact: {
                                            Name: invoice[0]['fullname']
                                        },
                                        Amount: data.close_amount,
                                        Invoice: {
                                            InvoiceNumber: invoice[0]['principal_invoice_no']
                                        },
                                        Date: data.date_modified
                                    });
                                }
                            });
                            let payload = {};
                            payload.category = 'Application';
                            payload.userid = req.cookies.timeout;
                            payload.description = 'Loan Application Written Off';
                            payload.affected = req.params.id;
                            notificationsService.log(req, payload);
                            res.send({"status": 200, "message": "Application write off successful!"});
                        }
                    });
                }
            });
        });
    });
});

users.post('/application/close/:id', function(req, res, next) {
    let data = req.body;
    data.close_status = 3;
    data.close_date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE applications SET ? WHERE ID = '+req.params.id, data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let payload = {}
            payload.category = 'Application'
            payload.userid = req.cookies.timeout
            payload.description = 'Loan Application Closed'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send({"status": 200, "message": "Application closed successful!"});
        }
    });
});

users.get('/application/cancel/:id', function(req, res, next) {
    let data = {};
    data.status = 0;
    db.query('UPDATE applications SET ? WHERE ID = '+req.params.id, data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let payload = {}
            payload.category = 'Application'
            payload.userid = req.cookies.timeout
            payload.description = 'Loan Application Cancelled'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send({"status": 200, "message": "Application cancellation successful!"});
        }
    });
});

users.get('/forgot-password/:username', function(req, res) {
    let username = req.params.username;
    db.query('SELECT *, (select role_name from user_roles r where r.id = user_role) as role FROM users WHERE username = ?', username, function(err, rows, fields) {
        if (err)
            return res.send({"status": 500, "response": "Connection Error!"});

        if (rows.length === 0)
            return res.send({"status": 500, "response": "Incorrect Username/Password!"});

        if (rows[0].status === 0)
            return res.send({"status": 500, "response": "User Disabled!"});

        let user = rows[0];
        user.forgot_url = req.protocol + '://' + req.get('host') + '/forgot-password?t=' + encodeURIComponent(user.username);
        user.date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let mailOptions = {
            from: 'no-reply@loan35.com',
            to: user.email,
            subject: process.env.TENANT+': Forgot Password Request',
            template: 'forgot',
            context: user
        };

        transporter.sendMail(mailOptions, function(error, info){
            console.log(info)
            if(error)
                return res.send({"status": 500, "message": "Oops! An error occurred while sending request", "response": error});
            return res.send({"status": 200, "message": "Forgot Password request sent successfully!"});
        });

    });
});

users.post('/forgot-password', function(req, res) {
    let user = req.body,
        date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE users SET password = ?, date_modified = ? WHERE username = ?', [bcrypt.hashSync(user.password, parseInt(process.env.SALT_ROUNDS)), date_modified, user.username], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "User password updated!"});
        }
    });
});

///////////////////////////////////////////////////////////////// REPORTS //////////////////////////////////////////////////////

/* GET Client Loan Details */
users.get('/client-loan-details/:id', function(req, res, next) {
    let id = req.params.id;
    let query, query1, query2;
    query = 'select sum(loan_amount) as total_loans from applications where userID = '+id+' and not (status = 0 and close_status = 0)'
    query1 = 'select \n' +
        '(select sum(loan_amount) from applications where userID = '+id+' and not (status = 0 and close_status = 0)) - \n' +
        'sum(payment_amount) as total_balance\n' +
        'from schedule_history\n' +
        'where applicationID in (select id from applications where userid = '+id+' and not (status = 0 and close_status = 0))\n' +
        'and status = 1'
    query2 = 'select \n' +
        'sum(interest_amount) as total_interests\n' +
        'from schedule_history\n' +
        'where applicationID in (select id from applications where userid = '+id+' and not (status = 0 and close_status = 0))\n' +
        'and status = 1'
    var items = {};
    db.query(query, function (error, results, fields) {
        items.total_loans = results;
        db.query(query1, function (error, results, fields) {
            items.total_balance = results;
            db.query(query2, function (error, results, fields) {
                items.total_interest = results;
                res.send({"status": 200, "response": items})
            });
        });
    });
});

/* GET Report Cards. */
users.get('/report-cards', function(req, res, next) {
    let query, query1, query2, query3;
    query = 'select count(*) as branches from branches'
    query1 = 'select count(*) as loan_officers from users where ID in (select loan_officer from clients where clients.id in (select userid from applications where applications.status = 2))'
    query2 = 'select count(*) as all_applications from applications where status = 2 and close_status = 0 '
    query3 = 'select count(*) as apps from applications'
    var items = {}; var num;
    var den;
    db.query(query, function (error, results, fields) {
        items.branches = results;
        db.query(query1, function (error, results, fields) {
            items.loan_officers = results;
            db.query(query2, function (error, results, fields) {
                items.active_loans = results
                den = parseInt(items.loan_officers[0]["loan_officers"]);
                num = parseInt(results[0]["all_applications"])
                avg_loan_per_officers = parseInt(num/den)
                items.avg_loan_per_officers = avg_loan_per_officers;
                db.query(query3, function (error, results, fields) {
                    res.send({"status": 200, "response": items})
                });
            });
        });
    });
});

/* Disbursements  */
users.get('/disbursements/filter', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        loan_officer = req.query.officer
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        queryPart2,
        query,
        query3,
        group
    queryPart = 'select (select reschedule_amount from applications where ID = applicationID) as reschedule_amount, \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, payment_amount, \n' +
        'applicationID, (select loan_amount from applications where ID = applicationID) as loan_amount, sum(payment_amount) as paid, \n' +
        '((select loan_amount from applications where ID = applicationID) - sum(payment_amount)) as balance, (select disbursement_date from applications where ID = applicationID) as date, \n' +
        '(select date_modified from applications where ID = applicationID) as date_modified, (select date_created from applications ap where ap.ID = applicationID) as created_date, ' +
        'CASE\n' +
        '    WHEN status = 0 THEN sum(payment_amount)\n' +
        'END as invalid_payment,\n' +
        'CASE\n' +
        '    WHEN status = 1 THEN sum(payment_amount)\n' +
        'END as valid_payment '+
        'from schedule_history \n' +
        'where applicationID in (select applicationID from application_schedules\n' +
        '\t\t\t\t\t\twhere applicationID in (select ID from applications where status = 2) and status = 1)\n'+
        'and status = 1 '
    ;
    queryPart2 = 'select (select reschedule_amount from applications where ID = applicationID) as reschedule_amount, \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, payment_amount, \n' +
        'applicationID, (select loan_amount from applications where ID = applicationID) as loan_amount, sum(payment_amount) as paid, \n' +
        '((select loan_amount from applications where ID = applicationID) - sum(payment_amount)) as balance, (select disbursement_date from applications where ID = applicationID) as date, \n' +
        '(select date_modified from applications where ID = applicationID) as date_modified, (select date_created from applications ap where ap.ID = applicationID) as created_date, ' +
        'CASE\n' +
        '    WHEN status = 0 THEN sum(payment_amount)\n' +
        'END as invalid_payment,\n' +
        'CASE\n' +
        '    WHEN status = 1 THEN sum(payment_amount)\n' +
        'END as valid_payment '+
        'from schedule_history \n' +
        'where applicationID in (select applicationID from application_schedules\n' +
        '\t\t\t\t\t\twhere applicationID in (select ID from applications where status = 2) and status = 1)\n'+
        'and applicationID not in (select applicationID from schedule_history where status = 1)\n'+
        'and status = 0 '
    ;
    group = 'group by applicationID';
    query = queryPart.concat(group);
    query3 = queryPart2.concat(group);

    let query2 = 'select ID, (select fullname from clients where ID = userID) as fullname, loan_amount, disbursement_date, date_modified, date_created, reschedule_amount ' +
        'from applications where status = 2 and ID not in (select applicationID from schedule_history) '

    var items = {};
    if (loan_officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = ?')
        queryPart2 = queryPart2.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = ?')
        query = queryPart.concat(group);
        query3 = queryPart2.concat(group);
        query2 = query2.concat('and (select loan_officer from clients where clients.ID = userID) = '+loan_officer+' ');
    }
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        // query = (queryPart.concat('AND (TIMESTAMP((select date_modified from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) OR (TIMESTAMP(select date_modified from applications ap where ap.ID = applicationID) between TIMESTAMP('+start+') AND TIMESTAMP('+end+'))')).concat(group);
        query = (queryPart.concat('AND ((TIMESTAMP((select disbursement_date from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+'))) ').concat(group) );
        // 'OR (TIMESTAMP((select date_modified from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') AND TIMESTAMP('+end+'))) ')).concat(group);
        query3 = (queryPart2.concat('AND ((TIMESTAMP((select disbursement_date from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+'))) ').concat(group));
        // 'OR (TIMESTAMP((select date_modified from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') AND TIMESTAMP('+end+'))) ')).concat(group);
        query2 = query2.concat('AND ((TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') AND TIMESTAMP('+end+')) )');
        // 'OR (TIMESTAMP(date_modified) between TIMESTAMP('+start+') AND TIMESTAMP('+end+')))');
    }
    db.query(query, [loan_officer], function (error, results, fields) {
        items.with_payments = results;
        db.query(query3, [loan_officer], function (error, results, fields) {
            items.with_invalid_payments = results;
            db.query(query2, [loan_officer], function (error, results, fields) {
                if (error) {
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    items.without_pay = results;
                    res.send({"status": 200, "error": null, "response": items, "message": "All Disbursements pulled!"});
                }
            });
        });
    });
});

/* Disbursements  */
users.get('/disbursements-new/filter', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        loan_officer = req.query.officer,
        query;
    query = 'select ' +
        'client_id as user, loan_officer, (select fullname from clients where ID = user) as fullname, loan_id as applicationID, amount as loan_amount, date_disbursed as date ' +
        'from disbursement_history where status = 1 ';
    if (loan_officer){
        query = query.concat('and loan_officer = '+loan_officer+' ');
    }
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (query.concat('AND ((TIMESTAMP(date_disbursed) between TIMESTAMP('+start+') and TIMESTAMP('+end+'))) ') );
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Disbursements pulled!"});
        }
    });
});

/* Interest Received  */
users.get('/interests/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, \n' +
        'applicationID, sum(interest_amount) as paid, \n' +
        '(select date_modified from applications where ID = applicationID) as date,\n' +
        '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) loan_officer\n'+
        'from schedule_history sh \n' +
        'where applicationID in (select applicationID from application_schedules\n' +
        '\t\t\t\t\t\twhere applicationID in (select ID from applications where status = 2) and status = 1)\n' +
        'and status = 1\n';
    group = 'group by applicationID';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        queryPart = queryPart.concat('AND (TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')
        // query = (queryPart.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = queryPart.concat(group);
    }
    if (officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = '+officer+' ')
        query = queryPart.concat(group)
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Interests Received pulled!"});
        }
    });
});

/* Interest Receivable  */
users.get('/interests-receivable/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, \n' +
        'applicationID, sum(interest_amount) as due, interest_collect_date,\n' +
        '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) loan_officer\n'+
        'from application_schedules sh \n' +
        'where applicationID in (select ID from applications where status = 2)\n' +
        'and status = 1\n';
    group = 'group by applicationid order by applicationid';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        queryPart = queryPart.concat('AND (TIMESTAMP(interest_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')
        // query = (queryPart.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = queryPart.concat(group);
    }
    if (officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = '+officer+' ')
        query = queryPart.concat(group)
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Interests Receivables pulled!"});
        }
    });
});

/* Principal Received  */
users.get('/principal/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, \n' +
        'applicationID, sum(payment_amount) as paid, \n' +
        '(select date_modified from applications where ID = applicationID) as date,\n' +
        '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) loan_officer\n'+
        'from schedule_history sh \n' +
        'where applicationID in (select applicationID from application_schedules\n' +
        '\t\t\t\t\t\twhere applicationID in (select ID from applications where status = 2) and status = 1)\n' +
        'and status = 1\n';
    group = 'group by applicationID';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        queryPart = queryPart.concat('AND (TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')
        // query = (queryPart.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = queryPart.concat(group);
    }
    if (officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = '+officer+' ')
        query = queryPart.concat(group)
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Principal Payments Received pulled!"});
        }
    });
});

/* Principal Receivable  */
users.get('/principal-receivable/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, \n' +
        'applicationID, sum(payment_amount) as due, payment_collect_date,\n' +
        '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) loan_officer\n'+
        'from application_schedules sh \n' +
        'where applicationID in (select ID from applications where status = 2)\n' +
        'and status = 1\n';
    group = 'group by applicationid order by applicationid';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        queryPart = queryPart.concat('AND (TIMESTAMP(payment_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')
        // query = (queryPart.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = queryPart.concat(group);
    }
    if (officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = '+officer+' ')
        query = queryPart.concat(group)
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Principal Receivables pulled!"});
        }
    });
});

/* Bad Loans - DeCommissioned  */
users.get('/bad-loans/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    query = '\n' +
        'select ID, \n' +
        '(select fullname from clients where clients.ID = userID) as client, \n' +
        'loan_amount, date_created\n' +
        'from applications \n' +
        'where status = 2 and close_status = 0 \n' +
        'and ID not in (select applicationID from schedule_history where status = 1)';
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (query.concat('AND (TIMESTAMP(date_created) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) '));
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Bad Loans pulled!"});
        }
    });
});

users.get('/all-updates', function(req, res){
    let load = {}
    let data = []
    const HOST = `${req.protocol}://${req.get('host')}`;
    let user = req.query.bug, word = 'Application'
    let role = req.query.bugger
    let query_ = 'select id from notification_preferences where userid = '+user+''
    // let query = `select notification_id, category, description, date_created, (select fullname from users where users.id = userid) user from pending_records inner join notifications on notification_id = notifications.id where status = 1 and view_status in (1,2) order by notification_id desc`;
    const endpoint = `/core-service/get?query=${query_}`;
    const url = `${HOST}${endpoint}`;
    try {
        db.getConnection(function(error, connection){
            if (error || !connection)
                return res.send({"status": 500, "error": error, "response": null});
            connection.query(query_, function(err, results, fields){
                if (err)
                    return res.send({"status": 500, "error": err, "response": null});
                else{
                    let query;
                    if (results.length > 0){
                        query = 'select *, notificationid as ID, category, description, unr.date_created, nt.userid, (select fullname from users where users.id = nt.userid) user \n' +
                            'from user_notification_rel unr inner join notifications nt on notificationid = nt.id \n' +
                            'where status = 1 and view_status = 1 and unr.userid = '+user+'\n' +
                            'and nt.userid <> '+user+' \n'+
                            'and ' +
                            '(select np.status from notification_preferences np where np.category = \n' +
                            '\t(select nc.id from notification_categories nc where nc.category_name = nt.category) \n' +
                            'and np.userid = '+user+' and np.date_created = (select date_created from notification_preferences npf where npf.id = '+
                            '(select max(id) from notification_preferences nop where nop.userid = '+user+' ))) = 1 \n' +
                            'and category <> ?\n'+
                            'and (select visible from notification_roles_rel nr where role_id = '+role+' and nr.category = \n' +
                            '(select nc.id from notification_categories nc where nc.category_name = nt.category) \n' +
                            '\tand nr.date_created = (select date_created from notification_roles_rel nrr where nrr.id = \n' +
                            '(select max(id) from notification_roles_rel ntr where ntr.category = (select nc.id from notification_categories nc where nc.category_name = nt.category)))) = 1\n'+
                            'order by nt.id desc'
                    }
                    else {
                        query = 'select *, notification_id as ID, category, description, date_created, view_status, (select fullname from users where users.id = userid) user \n'+
                            'from pending_records inner join notifications nt on notification_id = notifications.id \n'+
                            'where status = 1 and userid <> '+user+' and category <> ? and view_status in (1,2) ' +
                            'and (select visible from notification_roles_rel nr where role_id = '+role+' and nr.category = \n' +
                            '(select nc.id from notification_categories nc where nc.category_name = nt.category) \n' +
                            '\tand nr.date_created = (select date_created from notification_roles_rel nrr where nrr.id = \n' +
                            '(select max(id) from notification_roles_rel ntr where ntr.category = (select nc.id from notification_categories nc where nc.category_name = nt.category)))) = 1\n'+
                            'order by notifications.id desc';
                    }
                    connection.query(query, ['Application'], function(er, response, field){
                        if (er)
                            return res.send({"status": 500, "error": er, "response": null});
                        else{
                            load.all = response;
                            connection.query(query_, function(rrr, resp, fld){
                                if (rrr)
                                    return res.send({"status": 500, "error": rrr, "response": null});
                                else{
                                    let query2;
                                    if (resp.length > 0){
                                        query2 = 'select *, notificationid as ID, category, \n' +
                                            '(select GROUP_CONCAT(distinct(approverid)) from workflow_stages where workflowid = (select workflowid from applications where applications.id = affected)) approvers,\n' +
                                            'description, unr.date_created, nt.userid, (select fullname from users where users.id = nt.userid) user \n' +
                                            'from user_notification_rel unr inner join notifications nt on notificationid = nt.id \n' +
                                            'where status = 1 and view_status = 1 and unr.userid = '+user+'\n' +
                                            'and nt.userid <> '+user+' \n'+
                                            'and nt.category = ? and \n' +
                                            '(select np.status from notification_preferences np where np.category = \n' +
                                            '\t(select nc.id from notification_categories nc where nc.category_name = ?) \n' +
                                            'and np.userid = '+user+' and np.date_created = (select date_created from notification_preferences npf where npf.id = '+
                                            '(select max(id) from notification_preferences nop where nop.userid = '+user+' ))) = 1 \n' +
                                            'and (select visible from notification_roles_rel nr where role_id = '+role+' and nr.category = (select nc.id from notification_categories nc where nc.category_name = ?) '+
                                            'and nr.date_created = (select date_created from notification_roles_rel nrr where nrr.id = '+
                                            '(select max(id) from notification_roles_rel ntr where ntr.category = (select nc.id from notification_categories nc where nc.category_name = ?)))) = 1\n'+
                                            'order by nt.id desc'
                                    }
                                    else {
                                        query2 = `select *, notification_id as ID, category, description, date_created, view_status, (select fullname from users where users.id = userid) user, \n`+
                                            `(select GROUP_CONCAT(distinct(approverid)) as approvers from workflow_stages where workflowid = (select workflowid from applications where applications.id = affected)) approvers, `+
                                            `affected  `+
                                            `from pending_records inner join notifications on notification_id = notifications.id \n`+
                                            `where status = 1 and userid <> ${user} and category = ? and view_status in (1,2) `+
                                            `and `+
                                            `(select visible from notification_roles_rel nr where role_id = ${role} and nr.category = (select nc.id from notification_categories nc where nc.category_name = ?) `+
                                            `and nr.date_created = (select date_created from notification_roles_rel nrr where nrr.id = `+
                                            `(select max(id) from notification_roles_rel ntr where ntr.category = (select nc.id from notification_categories nc where nc.category_name = ?)))) = 1 `+
                                            `order by notifications.id desc`;
                                    }
                                    connection.query(query2, [word, word, word, word, word], function(e, r, f){
                                        connection.release();
                                        if (e)
                                            return res.send({"status": 500, "error": e, "response": null});
                                        else {
                                            for (let i = 0; i < r.length; i++){
                                                let dets = r[i]
                                                if (dets.approvers !== null){
                                                    if (Array.from(new Set(dets.approvers.split(','))).includes(role)){
                                                        data.push(dets)
                                                    }
                                                }
                                            }
                                            let result = _.orderBy(load.all.concat(data), ['id'], ['desc']);
                                            res.send(result);
                                        }
                                    })
                                }
                            });
                        }
                    });
                }
            });
        })
    } catch (e) {
        throw e;
    }
});

/* Overdue Loans  */
users.get('/overdues/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer;
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select ID, applicationID, (datediff(curdate(), payment_collect_date)) as days_since,\n' +
        'payment_collect_date, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
        '(select loan_amount from applications where applications.ID = applicationID) as principal,\n' +
        'sum(payment_amount) as amount_due, sum(interest_amount) as interest_due\n' +
        'from application_schedules\n' +
        'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0 \n' +
        'and payment_collect_date < (select curdate()) ';
    group = 'group by applicationID';
    query = queryPart.concat(group);
    if (officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationID)) = '+officer+'\n');
        query = queryPart.concat(group);
    }
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (queryPart.concat('AND (TIMESTAMP(payment_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Overdue Loans pulled!"});
        }
    });
});

/* Bad Loans  */
users.get('/badloans/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer;
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select ID, applicationID, \n' +
        '(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
        '(select loan_amount from applications where applications.ID = applicationID) as principal, payment_amount\n' +
        // 'payment_amount, sum(payment_amount) sum,  (sum(interest_amount) - interest_amount) as interest_due\n' +
        'from application_schedules\n' +
        'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) \n'+
        'and datediff(curdate(), payment_collect_date) > 0 ';
    group = 'group by applicationID';
    query = queryPart.concat(group);
    if (start  && end){
        start = "'"+start+"'";
        end = "'"+end+"'";
        query = (queryPart.concat('AND (TIMESTAMP(payment_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
    }
    if (officer){
        query = (queryPart.concat('and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationID)) = '+officer+'\n')).concat(group);
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Overdue Loans pulled!"});
        }
    });
});

users.get('/badloanss/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        classification = req.query.class,
        un_max = req.query.unmax,
        officer = req.query.officer;
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select ID, applicationID, \n' +
        'max(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
        '(select loan_amount from applications where applications.ID = applicationID) as principal, payment_amount\n' +
        // 'payment_amount, sum(payment_amount) sum,  (sum(interest_amount) - interest_amount) as interest_due\n' +
        'from application_schedules\n' +
        'where payment_status = 1 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) ' +
        'and payment_collect_date < curdate() ';
    // 'and datediff(curdate(), (payment_collect_date)) = 0';
    group = 'group by applicationID';
    query = queryPart.concat(group)
    if (classification && classification === '0'){
        queryPart = 'select ID, applicationID, \n' +
            'max(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
            '(select loan_amount from applications where applications.ID = applicationID) as principal, payment_amount\n' +
            'from application_schedules\n' +
            'where payment_status = 1 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) ' +
            'and payment_collect_date < curdate() ';
        query = queryPart.concat(group);
    }
    if (classification && classification != '0'){
        queryPart = 'select ID, applicationID, \n' +
            '(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
            '(select loan_amount from applications where applications.ID = applicationID) as principal, payment_amount\n' +
            'from application_schedules\n' +
            'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) \n'+
            'and datediff(curdate(), (payment_collect_date)) between ' +
            '(select min_days from loan_classifications lc where lc.id = '+classification+') ' +
            'and (select max_days from loan_classifications lc where lc.id = '+classification+') ';
        query = queryPart.concat(group);
    }
    if (classification && classification != '0' && un_max == '1'){
        queryPart = 'select ID, applicationID, \n' +
            '(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
            '(select loan_amount from applications where applications.ID = applicationID) as principal, payment_amount\n' +
            'from application_schedules\n' +
            'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) \n'+
            'and datediff(curdate(), (payment_collect_date)) > ' +
            '(select min_days from loan_classifications lc where lc.id = '+classification+') ';
        query = queryPart.concat(group);
    }
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (queryPart.concat('AND (TIMESTAMP(payment_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
    }
    if (officer && officer != '0'){
        query = (queryPart.concat('and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationID)) = '+officer+'\n')).concat(group);
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Overdue Loans pulled!"});
        }
    });
});

/* Payments */
users.get('/payments', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select \n' +
        '(select fullname from clients where ID = (select userID from applications where ID = applicationID)) as fullname,\n' +
        '(select userID from applications where ID = applicationID) as clientid,\n' +
        'applicationID, sum(payment_amount) as paid, sum(interest_amount) as interest, max(payment_date) as date\n' +
        'from schedule_history \n' +
        'where applicationID in (select ID from applications) and status = 1\n ';
    group = 'group by applicationID';
    query = queryPart.concat(group);
    let query2 = 'select sum(payment_amount + interest_amount) as total from schedule_history \n' +
        'where applicationID in (select ID from applications)\n' +
        'and status = 1 '
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (queryPart.concat('AND (TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query2 = query2.concat('AND (TIMESTAMP(payment_date) between TIMESTAMP('+start+') AND TIMESTAMP('+end+')) ');
    }
    db.query(query, function (error, results, fields) {
        items.payment = results;
        db.query(query2, function (error, results, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                items.total = results;
                res.send({"status": 200, "error": null, "response": items, "message": "All Payments pulled!"});
            }
        });
    });
});

/* Loans by Branches */
// users.get('/loans-by-branches', function(req, res, next) {
//     let start = req.query.start,
//         end = req.query.end
//     // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
//     let queryPart,
//         query,
//         group
//     queryPart = 'select (select branch from clients where ID = userID) as branchID, \n' +
//             '(select branch_name from branches br where br.id = branchID) as branch,\n' +
//             'loan_amount, sum(loan_amount) as disbursed,\n' +
//             '(select sum(payment_amount) from schedule_history sh\n' +
//             'where sh.status = 1 and \n' +
//             '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
//             'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) as collected\n' +
//             '\n' +
//             'from applications a\n' +
//             'where status = 2\n ';
//     group = 'group by branchID';
//     query = queryPart.concat(group);
//     var items = {};
//     if (start  && end){
//         start = "'"+start+"'"
//         end = "'"+end+"'"
//         // query = (queryPart.concat('AND (TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
//         query = 'select (select branch from clients where ID = userID) as branchID, \n' +
//             '(select branch_name from branches br where br.id = branchID) as branch,\n' +
//             'loan_amount, sum(loan_amount) as disbursed,\n' +
//             '(select sum(payment_amount) from schedule_history sh\n' +
//             'where sh.status = 1 and \n' +
//             '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
//             'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)\n' +
//             'and TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+') ) as collected\n' +
//             'from applications a\n' +
//             'where status = 2\n '+
//             'AND TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')\n '+
//             'group by branchID'
//     }
//     db.query(query, function (error, results, fields) {
//         if(error){
//             res.send({"status": 500, "error": error, "response": null});
//         } else {
//             res.send({"status": 200, "error": null, "response": results, "message": "All Payments pulled!"});
//         }
//     });
// });

users.get('/loans-by-branches', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group;
    queryPart = `select branch branchID, \n
                (select branch_name from branches br where br.id = branchID) as branch, sum(amount) disbursed, \n
                (select sum(payment_amount) from schedule_history sh where sh.status = 1 and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) collected\n
                from disbursement_history\n
                where status = 1 `;
    group = 'group by branchID';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'";
        end = "'"+end+"'";
        query = `select branch branchID, \n
                (select branch_name from branches br where br.id = branchID) as branch, sum(amount) disbursed, \n
                (select sum(payment_amount) from schedule_history sh where sh.status = 1 and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) collected\n
                from disbursement_history\n
                where status = 1 \n
                AND TIMESTAMP(date_disbursed) between TIMESTAMP('+start+') and TIMESTAMP('+end+')\n
                group by branchID`;
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Payments pulled!"});
        }
    });
});

/* Interests by Branches */
users.get('/interests-by-branches', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select (select branch from clients where ID = userID) as branchID, \n' +
        '(select branch_name from branches br where br.id = branchID) as branch,\n' +
        'loan_amount, ' +
        '(select sum(interest_amount) from application_schedules ash where (select branch from clients where clients.ID = (select userID from applications where applications.ID = ash.applicationID)) = branchID and ash.status = 1) ' +
        'as interest_expected,\n' +
        '(select sum(interest_amount) from schedule_history sh\n' +
        'where sh.status = 1 and \n' +
        '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
        'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) as collected\n' +
        '\n' +
        'from applications a\n' +
        'where status = 2\n ';
    group = 'group by branchID';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        // query = (queryPart.concat('AND (TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = 'select (select branch from clients where ID = userID) as branchID, \n' +
            '(select branch_name from branches br where br.id = branchID) as branch,\n' +
            'loan_amount, ' +
            '(select sum(interest_amount) from application_schedules ash where (select branch from clients where clients.ID = (select userID from applications where applications.ID = ash.applicationID)) = branchID and ash.status = 1) ' +
            'as interest_expected,\n' +
            '(select sum(interest_amount) from schedule_history sh\n' +
            'where sh.status = 1 and \n' +
            '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
            'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)\n' +
            'and TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+') ) as collected\n' +
            'from applications a\n' +
            'where status = 2\n '+
            'AND TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')\n '+
            'group by branchID'
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Report pulled!"});
        }
    });
});

/* Payments by Branches */
users.get('/payments-by-branches', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select (select branch from clients where ID = userID) as branchID, \n' +
        '(select branch_name from branches br where br.id = branchID) as branch,\n' +
        'loan_amount,sum(loan_amount) as disbursed,\n' +
        '(select sum(payment_amount) from schedule_history sh\n' +
        'where sh.status = 1 and \n' +
        '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
        'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) as collected\n' +
        '\n' +
        'from applications a\n' +
        'where status = 2\n ';
    group = 'group by branchID';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        // query = (queryPart.concat('AND (TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = 'select (select branch from clients where ID = userID) as branchID, \n' +
            '(select branch_name from branches br where br.id = branchID) as branch,\n' +
            'loan_amount,sum(loan_amount) as disbursed,\n' +
            '(select sum(payment_amount) from schedule_history sh\n' +
            'where sh.status = 1 and \n' +
            '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
            'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)\n' +
            'and TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+') ) as collected\n' +
            'from applications a\n' +
            'where status = 2\n '+
            'AND TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')\n '+
            'group by branchID'
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Report pulled!"});
        }
    });
});

/* Bad Loans by Branches */
users.get('/badloans-by-branches', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group;
    // queryPart = 'select (select branch from clients where ID = userID) as branchID, \n' +
    //     '(select branch_name from branches br where br.id = branchID) as branch,\n' +
    //     'loan_amount, sum(loan_amount) as disbursed,\n' +
    //     '(select sum(payment_amount) from schedule_history sh\n' +
    //     'where sh.status = 1 and \n' +
    //     '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
    //     'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) as collected\n' +
    //     '\n' +
    //     'from applications a\n' +
    //     'where status = 2\n ';
    query = `
            select applicationid, (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) branchID,      
            sum(payment_amount) amount, payment_collect_date period,
            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
            from application_schedules ap
            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
            and datediff(curdate(), payment_collect_date) > 90 group by branchID 
            `;
    group = 'group by branchID';
    // query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        // query = (queryPart.concat('AND (TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = 'select (select branch from clients where ID = userID) as branchID, \n' +
            '(select branch_name from branches br where br.id = branchID) as branch,\n' +
            'loan_amount, sum(loan_amount) as disbursed,\n' +
            '(select sum(payment_amount) from schedule_history sh\n' +
            'where sh.status = 1 and \n' +
            '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
            'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)\n' +
            'and TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+') ) as collected\n' +
            'from applications a\n' +
            'where status = 2\n '+
            'AND TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')\n '+
            'group by branchID';
        query = `
                select applicationid, (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) branchID ,     
                sum(payment_amount) amount, payment_collect_date period,
                (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                from application_schedules ap
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                AND TIMESTAMP(payment_collect_date) between TIMESTAMP(${start}) and TIMESTAMP(${end})
                and datediff(curdate(), payment_collect_date) > 90 group by branchID 
                `;
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Badloans pulled!"});
        }
    });
});

/* Projected Interests */
users.get('/projected-interests', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        queryPart2,
        query,
        group
    queryPart = 'select applicationID, sum(interest_amount) as interest_due,\n' +
        '(select userID from applications a where a.ID = applicationID) as clientID,\n' +
        '(select fullname from clients c where c.ID = (select userID from applications a where a.ID = applicationID)) as client\n' +
        'from application_schedules \n' +
        'where applicationID in (select a.ID from applications a where a.status = 2 )\n ';
    group = 'group by applicationID order by applicationID asc ';
    query = queryPart.concat(group);
    queryPart2 = 'select applicationID, sum(interest_amount) as interest_paid\n' +
        'from schedule_history\n' +
        'where status = 1\n' +
        'and applicationID in (select a.ID from applications a where a.status = 2) '
    query2= queryPart2.concat(group);
    var items = {};
    if (start && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (queryPart.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query2 = (queryPart2.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') AND TIMESTAMP('+end+')) ')).concat(group);
    }
    db.query(query, function (error, results, fields) {
        items.due = results;
        db.query(query2, function (error, results, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                items.paid = results;
                res.send({"status": 200, "error": null, "response": items, "message": "All Payments pulled!"});
            }
        });
    });
});

/* Aggregate Projected Interests */
users.get('/agg-projected-interests', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let query,
        group
    query = 'select sum(interest_amount) as total \n' +
        'from application_schedules\n' +
        'where applicationID in (select ID from applications where status = 2)\n' +
        'and status = 1 and payment_status = 0 '

    if (start && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = query.concat('and timestamp(interest_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')');
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/analytics', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        t = req.query.t,
        y = req.query.year,
        b = req.query.branch,
        freq = req.query.freq,
        officer = req.query.officer,
        bt = req.query.bt
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let query, load = [];
    switch (t){
        // case 'disbursements':
        //     //Default
        //     query = 'select ' +
        //         'sum(amount) as amount_disbursed, (select fullname from users where users.id = loan_officer) name' +
        //         'from disbursement_history where status = 1 group by name';
        //     // query = 'select sum(loan_amount) amount_disbursed, (select fullname from users where users.id = (select loan_officer from clients where clients.id = userID)) name\n' +
        //     //     'from disbursement_history where status = 1\n' +
        //     //     'group by name'
        //     //An Officer
        //     if (officer){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, \n' +
        //             '         SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') agent,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             // 'WHERE    EXTRACT(YEAR_MONTH FROM Disbursement_date) >= EXTRACT(YEAR_MONTH FROM CURDATE())-102\n' +
        //             'WHERE      status =2\n'+
        //             'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             'GROUP BY agent\n' +
        //             'ORDER BY DisburseYearMonth';
        //         load = [officer]
        //     }
        //     //All Officers, Yearly
        //     if (officer == '0' && freq == '3'){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%Y\') AS OfficersYear, \n' +
        //             'SUM(loan_amount) AmountDisbursed, \n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //One Officer, Yearly
        //     if (officer !== "0" && freq == "3"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') AS DisburseYear, \n' +
        //             '                    SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent, \n' +
        //             '                    EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             '    FROM     applications \n' +
        //             '    WHERE    status =2\n' +
        //             '    AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             '    GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')\n' +
        //             '    ORDER BY DisburseYearMonth'
        //     }
        //     //One Officer, Monthly In One Year
        //     if (officer !== "0" && freq == "2"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') AS Year, \n' +
        //             'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' OR DATE_FORMAT(date_modified, \'%Y\') = '+y+'\n'+
        //             'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //One Officer, Monthly
        //     if (officer !== "0" && freq == "2" && y == '0'){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') AS Year, \n' +
        //             'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //One Officer, Quarterly In One Year
        //     if (officer !== "0" && freq == "4"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) quarter,\n' +
        //             'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' OR DATE_FORMAT(date_modified, \'%Y\') = '+y+'\n'+
        //             'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             'GROUP BY quarter\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //One Officer, Quarterly
        //     if (officer !== "0" && freq == "4" && y == '0'){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) quarter, \n' +
        //             'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             'GROUP BY quarter\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //All Officers, Monthly In One Year
        //     if (officer == "0" && freq == "2"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS OfficersMonth, \n' +
        //             'SUM(loan_amount) AmountDisbursed, \n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' OR DATE_FORMAT(date_modified, \'%Y\') = '+y+'\n'+
        //             'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //All Officers, Monthly
        //     if (officer == "0" && freq == "2" && y == "0"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS Month, DATE_FORMAT(Disbursement_date, \'%Y\') AS AYear, \n' +
        //             'SUM(loan_amount) AmountDisbursed, \n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //All Officers, Quarterly In One Year
        //     if (officer == "0" && freq == "4"){
        //         query = 'SELECT   concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) OfficersQuarter, \n' +
        //             'SUM(loan_amount) AmountDisbursed, \n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' OR DATE_FORMAT(date_modified, \'%Y\') = '+y+'\n'+
        //             'GROUP BY OfficersQuarter\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //All Officers, Quarterly
        //     if (officer == "0" && freq == "4" && y == "0"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS Month, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) AQuarter, \n' +
        //             'SUM(loan_amount) AmountDisbursed, \n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'GROUP BY AQuarter\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     break;
        case 'disbursements':
            //Default
            query = 'select ' +
                'sum(amount) as amount_disbursed, (select fullname from users where users.id = loan_officer) name ' +
                'from disbursement_history where status = 1 group by name';
            //An Officer
            if (officer){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, \n' +
                    '         SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') agent,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE      status =1\n'+
                    'AND      loan_officer = '+officer+'\n' +
                    'GROUP BY agent\n' +
                    'ORDER BY DisburseYearMonth';
                load = [officer]
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%Y\') AS OfficersYear, \n' +
                    'SUM(amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'GROUP BY DATE_FORMAT(date_disbursed, \'%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Yearly
            if (officer !== "0" && freq == "3"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') AS DisburseYear, \n' +
                    '                    SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent, \n' +
                    '                    EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    '    FROM     disbursement_history \n' +
                    '    WHERE    status =1\n' +
                    '    AND      loan_officer = '+officer+'\n' +
                    '    GROUP BY DATE_FORMAT(date_disbursed, \'%Y\')\n' +
                    '    ORDER BY DisburseYearMonth'
            }
            //One Officer, Monthly In One Year
            if (officer !== "0" && freq == "2"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') AS Year, \n' +
                    'SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'and      DATE_FORMAT(date_disbursed, \'%Y\') = '+y+'\n'+
                    'AND      loan_officer = '+officer+'\n' +
                    'GROUP BY DATE_FORMAT(date_disbursed, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Monthly
            if (officer !== "0" && freq == "2" && y == '0'){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') AS Year, \n' +
                    'SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'AND      loan_officer = '+officer+'\n' +
                    'GROUP BY DATE_FORMAT(date_disbursed, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Quarterly In One Year
            if (officer !== "0" && freq == "4"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) quarter,\n' +
                    'SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'and      DATE_FORMAT(date_disbursed, \'%Y\') = '+y+' \n'+
                    'AND      loan_officer = userID) = '+officer+'\n' +
                    'GROUP BY quarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Quarterly
            if (officer !== "0" && freq == "4" && y == '0'){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) quarter, \n' +
                    'SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'AND      loan_officer = '+officer+'\n' +
                    'GROUP BY quarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Monthly In One Year
            if (officer == "0" && freq == "2"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS OfficersMonth, \n' +
                    'SUM(amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'and      DATE_FORMAT(date_disbursed, \'%Y\') = '+y+'\n'+
                    'GROUP BY DATE_FORMAT(date_disbursed, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Monthly
            if (officer == "0" && freq == "2" && y == "0"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS Month, DATE_FORMAT(date_disbursed, \'%Y\') AS AYear, \n' +
                    'SUM(amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'GROUP BY DATE_FORMAT(date_disbursed, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Quarterly In One Year
            if (officer == "0" && freq == "4"){
                query = 'SELECT   concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) OfficersQuarter, \n' +
                    'SUM(amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'and      DATE_FORMAT(date_disbursed, \'%Y\') = '+y+'\n'+
                    'GROUP BY OfficersQuarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Quarterly
            if (officer == "0" && freq == "4" && y == "0"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS Month, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) AQuarter, \n' +
                    'SUM(amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'GROUP BY AQuarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            break;
        // case 'branches':
        //     //Disbursements
        //     if (bt == '1'){
        //
        //         query = 'select sum(loan_amount) amount_disbursed, \n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch\n' +
        //             'from applications \n' +
        //             'where status = 2\n' +
        //             'group by branch'
        //         //Specific Branch
        //         if (b){
        //             query = 'select sum(loan_amount) amount_disbursed, \n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch\n' +
        //                 'from applications \n' +
        //                 'where status = 2\n' +
        //                 'and (select branch from clients where clients.id = userid) = '+b+'\n'+
        //                 'group by branch'
        //         }
        //         //Specific Branch, Monthly in a year
        //         if (b != '0' && freq == "2"){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND   (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'AND   DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+'\n' +
        //                 'GROUP BY DisburseMonth, office\n' +
        //                 'ORDER BY Disbursement_date'
        //         }
        //         //All Branches, Monthly in a year
        //         if (b == '0' && freq == "2"){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND   DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+'\n' +
        //                 'GROUP BY office, DisburseMonth\n' +
        //                 'ORDER BY office, Disbursement_date'
        //         }
        //         //All Branches, Monthly
        //         if (b == '0' && freq == "2" && y == '0'){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'GROUP BY office, DisburseMonth\n' +
        //                 'ORDER BY Disbursement_date'
        //         }
        //         if (b != '0' && freq == "2" && y == '0'){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND   (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'GROUP BY DisburseMonth, office\n' +
        //                 'ORDER BY Disbursement_date'
        //         }
        //         //Specific Branch, Yearly
        //         if (b != '0' && freq == "3"){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') year,\n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2 and date_format(disbursement_date, \'%Y\') = '+y+'\n' +
        //                 'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')'
        //         }
        //         if (b != '0' && freq == "3" && y == '0'){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') year,\n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')'
        //         }
        //         if (b != '0' && freq == "4"){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) Quarter,\n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'GROUP BY Quarter order by DisburseYearMonth'
        //         }
        //         if (b != '0' && freq == "4" && y != '0'){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) Quarter,\n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'and date_format(Disbursement_date, \'%Y\') = '+y+'\n'+
        //                 'GROUP BY Quarter order by DisburseYearMonth'
        //         }
        //     }
        //     //Interests
        //     if (bt == '2'){
        //         query = 'select sum(interest_amount) amount_received, \n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
        //             'from schedule_history \n' +
        //             'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
        //             'group by branch'
        //         //Specific Branch
        //         if (b){
        //             query = 'select sum(interest_amount) amount_received, \n' +
        //                     '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
        //                     'from schedule_history \n' +
        //                     'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
        //                     'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                     'group by branch'
        //         }
        //         //Specific Branch, Monthly, Specific Year
        //         if (b !== '0' && freq == "2"){
        //             query = 'select sum(interest_amount) amount_received, \n' +
        //                 'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         if (b !== '0' && freq == "2" && y == '0'){
        //             query = 'select sum(interest_amount) amount_received, \n' +
        //                 'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         //Specific Branch, Yearly
        //         if (b !== '0' && freq == "3"){
        //             query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office \n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and date_format(payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by officer, DATE_FORMAT(Payment_date, \'%Y\')'
        //         }
        //         if (b !== '0' && freq == "3" && y == '0'){
        //             query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office \n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by officer, DATE_FORMAT(Payment_date, \'%Y\')'
        //         }
        //         if (b !== '0' && freq == "4"){
        //             query = 'select sum(interest_amount) amount_received, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office, \n'+
        //                 'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         if (b !== '0' && freq == "4" && y == '0'){
        //             query = 'select sum(interest_amount) amount_received, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office, \n'+
        //                 'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //     }
        //     //Payments
        //     if (bt == '3'){
        //         query = 'select sum(payment_amount) amount_received, \n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
        //             'from schedule_history \n' +
        //             'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
        //             'group by branch'
        //         //Specific Branch
        //         if (b){
        //             query = 'select sum(payment_amount) amount_received, \n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
        //                 'from schedule_history \n' +
        //                 'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by branch'
        //         }
        //         //Specific Branch, Monthly, Specific Year
        //         if (b !== '0' && freq == "2"){
        //             query = 'select sum(payment_amount) amount_received, \n' +
        //                 'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         if (b !== '0' && freq == "2" && y == '0'){
        //             query = 'select sum(payment_amount) amount_received, \n' +
        //                 'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         //Specific Branch, Yearly
        //         if (b !== '0' && freq == "3"){
        //             query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office \n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and date_format(payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
        //         }
        //         if (b !== '0' && freq == "3" && y == '0'){
        //             query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office \n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
        //         }
        //         if (b !== '0' && freq == "4"){
        //             query = 'select sum(payment_amount) amount_received, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office, \n'+
        //                 'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         if (b !== '0' && freq == "4" && y == '0'){
        //             query = 'select sum(payment_amount) amount_received, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office, \n'+
        //                 'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //     }
        //     //Bad Loans
        //     if (bt == '4'){
        //         query = `
        //                 select  applicationid,
        //                 sum(payment_amount) amount,
        //                 (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                 from application_schedules ap
        //                 where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                 and datediff(curdate(), payment_collect_date) > 90 group by branch
        //                 `;
        //         //Specific Branch
        //         if (b){
        //             query = `
        //                     select  applicationid,
        //                     sum(payment_amount) amount,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch
        //                     `;
        //         }
        //         //Specific Branch, Monthly, Specific Year
        //         if (b !== '0' && freq == "2"){
        //             query = `
        //                     select  applicationid,
        //                     sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%M %Y\') period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and Date_format(Payment_collect_date, \'%Y\') = ${y}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
        //                     `;
        //         }
        //         if (b !== '0' && freq == "2" && y == '0'){
        //             query = `
        //                     select  applicationid,
        //                     sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%M %Y\') period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
        //                     `;
        //         }
        //         //Specific Branch, Yearly
        //         if (b !== '0' && freq == "3"){
        //             query = `
        //                     select applicationid,
        //                     sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%Y\') period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and Date_format(Payment_collect_date, \'%Y\') = ${y}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR FROM payment_collect_date) order by EXTRACT(YEAR FROM payment_collect_date)
        //                     `;
        //         }
        //         if (b !== '0' && freq == "3" && y == '0'){
        //             query = `
        //                     select applicationid,
        //                     sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%Y\') period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR FROM payment_collect_date) order by EXTRACT(YEAR FROM payment_collect_date)
        //                     `;
        //         }
        //         if (b !== '0' && freq == "4"){
        //             query = `
        //                     select applicationid,
        //                     sum(payment_amount) amount, concat('Q',quarter(payment_collect_date),'-', year(payment_collect_date)) period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and Date_format(Payment_collect_date, \'%Y\') = ${y}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
        //                     `;
        //         }
        //         if (b !== '0' && freq == "4" && y == '0'){
        //             query = `
        //                     select applicationid,
        //                     sum(payment_amount) amount, concat('Q',quarter(payment_collect_date),'-', year(payment_collect_date)) period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
        //                     `;
        //         }
        //     }
        //     break;
        case 'branches':
            //Disbursements
            if (bt == '1'){

                query = 'select sum(amount) amount_disbursed, \n' +
                    '(select branch_name from branches where branches.id = branch) branch\n' +
                    'from disbursement_history \n' +
                    'where status = 1\n' +
                    'group by branch'
                //Specific Branch
                if (b){
                    query = 'select sum(amount) amount_disbursed, \n' +
                        '(select branch_name from branches where branches.id = branch) branch\n' +
                        'from date_disbursed \n' +
                        'where status = 1\n' +
                        'and branch = '+b+'\n'+
                        'group by branch'
                }
                //Specific Branch, Monthly in a year
                if (b != '0' && freq == "2"){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = branch) office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1\n' +
                        'AND   branch = '+b+'\n' +
                        'AND   DATE_FORMAT(date_disbursed, \'%Y\') = '+y+'\n' +
                        'GROUP BY DisburseMonth, office\n' +
                        'ORDER BY date_disbursed'
                }
                //All Branches, Monthly in a year
                if (b == '0' && freq == "2"){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = branch) office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1\n' +
                        'AND   DATE_FORMAT(date_disbursed, \'%Y\') = '+y+'\n' +
                        'GROUP BY office, DisburseMonth\n' +
                        'ORDER BY office, date_disbursed'
                }
                //All Branches, Monthly
                if (b == '0' && freq == "2" && y == '0'){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = branch) office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1\n' +
                        'GROUP BY office, DisburseMonth\n' +
                        'ORDER BY date_disbursed'
                }
                if (b != '0' && freq == "2" && y == '0'){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = branch) office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1\n' +
                        'AND   branch = '+b+'\n' +
                        'GROUP BY DisburseMonth, office\n' +
                        'ORDER BY date_disbursed'
                }
                //Specific Branch, Yearly
                if (b != '0' && freq == "3"){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') year,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1 and date_format(date_disbursed, \'%Y\') = '+y+'\n' +
                        'AND     branch = '+b+'\n' +
                        'GROUP BY DATE_FORMAT(date_disbursed, \'%Y\')'
                }
                if (b != '0' && freq == "3" && y == '0'){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') year,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     applications\n' +
                        'WHERE  status = 1\n' +
                        'AND     branch = '+b+'\n' +
                        'GROUP BY DATE_FORMAT(date_disbursed, \'%Y\')'
                }
                if (b != '0' && freq == "4"){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) Quarter,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1\n' +
                        'AND     branch = '+b+'\n' +
                        'GROUP BY Quarter order by DisburseYearMonth'
                }
                if (b != '0' && freq == "4" && y != '0'){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) Quarter,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 2\n' +
                        'AND     branch = '+b+'\n' +
                        'and date_format(date_disbursed, \'%Y\') = '+y+'\n'+
                        'GROUP BY Quarter order by DisburseYearMonth'
                }
            }
            //Interests
            if (bt == '2'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
                    'from schedule_history \n' +
                    'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
                    'group by branch'
                //Specific Branch
                if (b){
                    query = 'select sum(interest_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
                        'from schedule_history \n' +
                        'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by branch'
                }
                //Specific Branch, Monthly, Specific Year
                if (b !== '0' && freq == "2"){
                    query = 'select sum(interest_amount) amount_received, \n' +
                        'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                if (b !== '0' && freq == "2" && y == '0'){
                    query = 'select sum(interest_amount) amount_received, \n' +
                        'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                //Specific Branch, Yearly
                if (b !== '0' && freq == "3"){
                    query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and date_format(payment_date, \'%Y\') = '+y+'\n'+
                        'group by officer, DATE_FORMAT(Payment_date, \'%Y\')'
                }
                if (b !== '0' && freq == "3" && y == '0'){
                    query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by officer, DATE_FORMAT(Payment_date, \'%Y\')'
                }
                if (b !== '0' && freq == "4"){
                    query = 'select sum(interest_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office, \n'+
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                        'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                if (b !== '0' && freq == "4" && y == '0'){
                    query = 'select sum(interest_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office, \n'+
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
            }
            //Payments
            if (bt == '3'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
                    'from schedule_history \n' +
                    'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
                    'group by branch'
                //Specific Branch
                if (b){
                    query = 'select sum(payment_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
                        'from schedule_history \n' +
                        'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by branch'
                }
                //Specific Branch, Monthly, Specific Year
                if (b !== '0' && freq == "2"){
                    query = 'select sum(payment_amount) amount_received, \n' +
                        'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                if (b !== '0' && freq == "2" && y == '0'){
                    query = 'select sum(payment_amount) amount_received, \n' +
                        'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                //Specific Branch, Yearly
                if (b !== '0' && freq == "3"){
                    query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and date_format(payment_date, \'%Y\') = '+y+'\n'+
                        'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
                }
                if (b !== '0' && freq == "3" && y == '0'){
                    query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
                }
                if (b !== '0' && freq == "4"){
                    query = 'select sum(payment_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office, \n'+
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                        'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                if (b !== '0' && freq == "4" && y == '0'){
                    query = 'select sum(payment_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office, \n'+
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
            }
            //Bad Loans
            if (bt == '4'){
                query = `
                        select  applicationid,      
                        sum(payment_amount) amount,
                        (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                        from application_schedules ap
                        where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                        and datediff(curdate(), payment_collect_date) > 90 group by branch
                        `;
                //Specific Branch
                if (b){
                    query = `
                            select  applicationid,      
                            sum(payment_amount) amount, 
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and datediff(curdate(), payment_collect_date) > 90 group by branch
                            `;
                }
                //Specific Branch, Monthly, Specific Year
                if (b !== '0' && freq == "2"){
                    query = `
                            select  applicationid,      
                            sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%M %Y\') period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and Date_format(Payment_collect_date, \'%Y\') = ${y} 
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
                            `;
                }
                if (b !== '0' && freq == "2" && y == '0'){
                    query = `
                            select  applicationid,      
                            sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%M %Y\') period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
                            `;
                }
                //Specific Branch, Yearly
                if (b !== '0' && freq == "3"){
                    query = `
                            select applicationid,      
                            sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%Y\') period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and Date_format(Payment_collect_date, \'%Y\') = ${y} 
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR FROM payment_collect_date) order by EXTRACT(YEAR FROM payment_collect_date)
                            `;
                }
                if (b !== '0' && freq == "3" && y == '0'){
                    query = `
                            select applicationid,      
                            sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%Y\') period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR FROM payment_collect_date) order by EXTRACT(YEAR FROM payment_collect_date)
                            `;
                }
                if (b !== '0' && freq == "4"){
                    query = `
                            select applicationid,      
                            sum(payment_amount) amount, concat('Q',quarter(payment_collect_date),'-', year(payment_collect_date)) period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and Date_format(Payment_collect_date, \'%Y\') = ${y} 
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
                            `;
                }
                if (b !== '0' && freq == "4" && y == '0'){
                    query = `
                            select applicationid,      
                            sum(payment_amount) amount, concat('Q',quarter(payment_collect_date),'-', year(payment_collect_date)) period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
                            `;
                }
            }
            break;
        case 'payments':
            //Default
            query = 'select sum(payment_amount) amount_payed, \n' +
                '(select fullname from users where users.id = \n' +
                '(select loan_officer from clients where clients.id = \n' +
                ' (select userid from applications where applications.id = applicationid))) officer\n' +
                'from schedule_history \n' +
                'where status = 1\n' +
                'and applicationid in (select id from applications where applications.status <> 0)\n'+
                'group by officer\n'
            //One officer
            if (officer){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth,\n' +
                    '  (select fullname from users where users.id = '+officer+') officer,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE  status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'
                load = [officer]
            }
            //One Officer, Yearly
            if (officer !== "0" && freq == "3"){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%Y\') year,\n' +
                    ' (select fullname from users where users.id = '+officer+') name,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As PaymentYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'group by year'
            }
            //All Officers, Yearly
            if (officer == "0" && freq == "3"){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%Y\') allpaymentyear,\n' +
                    '         SUM(payment_amount) AmountPayed\n' +
                    'FROM     schedule_history\n' +
                    'WHERE status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'and  DATE_FORMAT(Payment_date, \'%Y\') is not null\n'+
                    'group by allpaymentyear'
            }
            //One Officer, Monthly in One Year
            if (officer !== '0' && freq == '2'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%M\') month,\n' +
                    '\t\t (select fullname from users where users.id = '+officer+') name,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE\t\t status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'AND DATE_FORMAT(Payment_date, \'%Y\') = '+y+'\n'+
                    'GROUP BY DATE_FORMAT(Payment_date, \'%M%Y\') order by DisburseYearMonth'
            }
            //One Officer, Monthly
            if (officer !== '0' && freq == '2' && y == '0'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%M\') month,\n' +
                    ' (select fullname from users where users.id = '+officer+') name,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'GROUP BY DATE_FORMAT(Payment_date, \'%M%Y\') order by DisburseYearMonth'
            }
            //One Officer, Quarterly in One Year
            if (officer !== '0' && freq == '4'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Officersquarter,\n' +
                    '\t\t (select fullname from users where users.id = '+officer+') name,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE\t\t status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'AND DATE_FORMAT(Payment_date, \'%Y\') = '+y+'\n'+
                    'GROUP BY Officersquarter'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Officersquarter,\n' +
                    ' (select fullname from users where users.id = '+officer+') name,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'GROUP BY Officersquarter'
            }
            //All Officers, Monthly in One Year
            if (officer == '0' && freq == '2'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%M\') Officersmonth,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE  status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND DATE_FORMAT(Payment_date, \'%Y\') = '+y+'\n'+
                    'GROUP BY DATE_FORMAT(Payment_date, \'%M%Y\')\n'+
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '2' && y == '0'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%M\') Officersmonth,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE  status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'GROUP BY DATE_FORMAT(Payment_date, \'%M%Y\')\n'+
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Monthly in One Year
            if (officer == '0' && freq == '4'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE  status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND DATE_FORMAT(Payment_date, \'%Y\') = '+y+'\n'+
                    'GROUP BY Quarter'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE  status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'GROUP BY Quarter'
            }
            break;
        case 'interest-received':
            //Default
            query = 'select sum(interest_amount) amount_received, \n' +
                '(select fullname from users where users.id = \n' +
                '(select loan_officer from clients where clients.id = \n' +
                '(select userid from applications where applications.id = applicationid))) officer\n' +
                'from schedule_history \n' +
                'where status = 1\n' +
                'and applicationid in (select id from applications where status <> 0)\n'+
                'group by officer'
            //One Officer
            if (officer){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) officer\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'
                'group by officer'
            }
            //One Officer, Monthly in Specific Year
            if (officer !== '0' && freq == '2'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') paymonth\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Monthly
            if (officer !== '0' && freq == '2' && y == '0'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, DATE_FORMAT(payment_date, \'%M, %Y\') paymonth\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Quarterly in Specific Year
            if (officer !== '0' && freq == '4'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) OfficerQuarter\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) OfficerQuarter\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Monthly in Specific Year
            if (officer == '0' && freq == '2'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') Monthyear  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(Payment_date, \'%M, %Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '2' && y == '0'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') Monthyear  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by Date_format(Payment_date, \'%M %Y\')  order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Quarterly in Specific Year
            if (officer == '0' && freq == '4'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Quarter  order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Quarterly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by Quarter  order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Yearly
            if (officer !== '0' && freq == '3'){
                query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') OfficerYear, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) agent\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by agent, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by DATE_FORMAT(Payment_date, \'%Y\')'
            }
            break;
        case 'interest-receivable':
            //Default
            query = 'select \n' +
                'sum(interest_amount) as amount_due,\n' +
                '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) officer\n'+
                'from application_schedules sh \n' +
                'where applicationID in (select ID from applications where status = 2)\n' +
                'and status = 1 group by officer\n';
            //One Officer
            if (officer){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) officer\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'and status = 1 group by officer\n';
            }
            //One Officer, Monthly in Specific Year
            if (officer !== '0' && freq == '2'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent,\n'+
                    'DATE_FORMAT(interest_collect_date, \'%M, %Y\') paymonth\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(interest_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(interest_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //One Officer, Monthly
            if (officer !== '0' && freq == '2' && y == '0'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent,\n'+
                    'DATE_FORMAT(interest_collect_date, \'%M, %Y\') paymonth\n'+
                    'from application_schedules\n'+
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by paymonth order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //One Officer, Quarterly in Specific Year
            if (officer !== '0' && freq == '4'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) OfficerQuarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(interest_collect_date, \'%Y\') = '+y+'\n'+
                    'group by OfficerQuarter  order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) OfficerQuarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //All Officers, Monthly in Specific Year
            if (officer == '0' && freq == '2'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'DATE_FORMAT(interest_collect_date, \'%M, %Y\') Monthyear\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and Date_format(interest_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(interest_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '2' && y == '0'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'DATE_FORMAT(interest_collect_date, \'%M, %Y\') Monthyear\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'group by Date_format(interest_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //All Officers, Quarterly in Specific Year
            if (officer == '0' && freq == '4'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) Quarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and Date_format(interest_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //All Officers, Quarterly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) Quarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //One Officer, Yearly
            if (officer !== '0' && freq == '3'){
                query = 'select sum(interest_amount) amount_due, DATE_FORMAT(interest_collect_date, \'%Y\') OfficerYear, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) agent\n' +
                    'from application_schedules \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status = 2)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by agent, DATE_FORMAT(interest_collect_date, \'%Y\')'
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'select sum(interest_amount) amount_due, DATE_FORMAT(interest_collect_date, \'%Y\') PaymentYear \n' +
                    'from application_schedules \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status = 2)\n'+
                    'group by DATE_FORMAT(interest_collect_date, \'%Y\')'
            }
            break;
        case 'principal-received':
            //Default
            query = 'select sum(payment_amount) amount_received, \n' +
                '(select fullname from users where users.id = \n' +
                '(select loan_officer from clients where clients.id = \n' +
                '(select userid from applications where applications.id = applicationid))) officer\n' +
                'from schedule_history \n' +
                'where status = 1\n' +
                'and applicationid in (select id from applications where status <> 0)\n'+
                'group by officer'
            //One Officer
            if (officer){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) officer\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'
                'group by officer'
            }
            //One Officer, Monthly in Specific Year
            if (officer !== '0' && freq == '2'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') paymonth\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Monthly
            if (officer !== '0' && freq == '2' && y == '0'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, DATE_FORMAT(payment_date, \'%M, %Y\') paymonth\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Quarterly in Specific Year
            if (officer !== '0' && freq == '4'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) OfficerQuarter\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) OfficerQuarter\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Monthly in Specific Year
            if (officer == '0' && freq == '2'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') Monthyear  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(Payment_date, \'%M, %Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '2' && y == '0'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') Monthyear  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by Date_format(Payment_date, \'%M %Y\')  order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Quarterly in Specific Year
            if (officer == '0' && freq == '4'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Quarterly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Yearly
            if (officer !== '0' && freq == '3'){
                query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') OfficerYear, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) agent\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by agent, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by DATE_FORMAT(Payment_date, \'%Y\')'
            }
            break;
        case 'principal-receivable':
            //Default
            query = 'select \n' +
                'sum(payment_amount) as amount_due,\n' +
                '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) officer\n'+
                'from application_schedules sh \n' +
                'where applicationID in (select ID from applications where status = 2)\n' +
                'and status = 1 group by officer\n';
            //One Officer
            if (officer){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) officer\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'and status = 1 group by officer\n';
            }
            //One Officer, Monthly in Specific Year
            if (officer !== '0' && freq == '2'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent,\n'+
                    'DATE_FORMAT(payment_collect_date, \'%M, %Y\') paymonth\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(payment_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(payment_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'
            }
            //One Officer, Monthly
            if (officer !== '0' && freq == '2' && y == '0'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent,\n'+
                    'DATE_FORMAT(payment_collect_date, \'%M, %Y\') paymonth\n'+
                    'from application_schedules\n'+
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by paymonth order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'
            }
            //One Officer, Quarterly in Specific Year
            if (officer !== '0' && freq == '4'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date)) OfficerQuarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(payment_collect_date, \'%Y\') = '+y+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date)) OfficerQuarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'//date_format(payment_collect_date, \'%Y%M\')'
            }
            //All Officers, Monthly in Specific Year
            if (officer == '0' && freq == '2'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    'DATE_FORMAT(payment_collect_date, \'%M, %Y\') Monthyear\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and Date_format(payment_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(payment_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '2' && y == '0'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    'DATE_FORMAT(payment_collect_date, \'%M, %Y\') Monthyear\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'group by Date_format(payment_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'
            }
            //All Officers, Quarterly in Specific Year
            if (officer == '0' && freq == '4'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) Quarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and Date_format(interest_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM payment_collect_date)' //date_format(payment_collect_date, \'%Y%M\')'
            }
            //All Officers, Quarterly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    'concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date)) Quarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM payment_collect_date) '//date_format(payment_collect_date, \'%Y%M\')'
            }
            //One Officer, Yearly
            if (officer !== '0' && freq == '3'){
                query = 'select sum(payment_amount) amount_due, DATE_FORMAT(payment_collect_date, \'%Y\') OfficerYear, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) agent\n' +
                    'from application_schedules \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status = 2)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by agent, DATE_FORMAT(payment_collect_date, \'%Y\')'
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'select sum(payment_amount) amount_due, DATE_FORMAT(payment_collect_date, \'%Y\') PaymentYear \n' +
                    'from application_schedules \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status = 2)\n'+
                    'group by DATE_FORMAT(payment_collect_date, \'%Y\')'
            }
            break;
        case 'glp':
            break;
        case 'bad-loans':
            break;
        case 'overdue-loans':
            break;
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/multi-analytics', function (req, res, next){
    let bt = req.query.bt,
        pvi = req.query.pvi,
        freq = req.query.freq,
        officer = req.query.officer,
        y = req.query.year;
    let query1;
    let query2;
    switch (bt){
        // case '1':
        //     if (freq == '2' && y == '0'){
        //         query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%M, %Y\')) periods from applications where status = 2 ' +
        //             ' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS period, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and DATE_FORMAT(Disbursement_date, \'%M, %Y\') = ?\n' +
        //             'GROUP BY branch, period\n' +
        //             'ORDER BY branch, Disbursement_date'
        //     }
        //     if (freq == '2' && y != '0'){
        //         query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%M, %Y\')) periods from applications where status = 2 ' +
        //             ' and DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS period, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and DATE_FORMAT(Disbursement_date, \'%M, %Y\') = ?\n' +
        //             'GROUP BY branch, period\n' +
        //             'ORDER BY branch, Disbursement_date'
        //     }
        //     if (freq == '3' && y == '0'){
        //         query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%Y\')) periods from applications where status = 2 ' +
        //             ' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') period,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and DATE_FORMAT(Disbursement_date, \'%Y\') = ?\n' +
        //             'GROUP BY branch, DATE_FORMAT(Disbursement_date, \'%Y\') order by branch'
        //     }
        //     if (freq == '3' && y != '0'){
        //         query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%Y\')) periods from applications where status = 2 ' +
        //             ' and DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') period,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and DATE_FORMAT(Disbursement_date, \'%Y\') = ?\n' +
        //             'GROUP BY branch, DATE_FORMAT(Disbursement_date, \'%Y\') order by branch'
        //     }
        //     if (freq == '4' && y == '0'){
        //         query1 = 'select distinct(concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date))) periods from applications where status = 2 ' +
        //             ' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) = ?\n' +
        //             'GROUP BY branch, period'
        //     }
        //     if (freq == '4' && y != '0'){
        //         query1 = 'select distinct(concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date))) periods from applications where status = 2 ' +
        //             ' and DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) = ?\n' +
        //             'GROUP BY branch, period'
        //     }
        //     break;
        case '1':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(date_disbursed, \'%M, %Y\')) periods from disbursement_history where status = 1 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS period, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and DATE_FORMAT(date_disbursed, \'%M, %Y\') = ?\n' +
                    'GROUP BY branch, period\n' +
                    'ORDER BY branch, date_disbursed'
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(date_disbursed, \'%M, %Y\')) periods from disbursement_history where status = 1 ' +
                    ' and DATE_FORMAT(date_disbursed, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS period, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and DATE_FORMAT(date_disbursed, \'%M, %Y\') = ?\n' +
                    'GROUP BY branch, period\n' +
                    'ORDER BY branch, date_disbursed'
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(date_disbursed, \'%Y\')) periods from disbursement_history where status = 1 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') period,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and DATE_FORMAT(date_disbursed, \'%Y\') = ?\n' +
                    'GROUP BY branch, DATE_FORMAT(date_disbursed, \'%Y\') order by branch'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(date_disbursed, \'%Y\')) periods from disbursement_history where status = 1 ' +
                    ' and DATE_FORMAT(date_disbursed, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') period,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and DATE_FORMAT(date_disbursed, \'%Y\') = ?\n' +
                    'GROUP BY branch, DATE_FORMAT(date_disbursed, \'%Y\') order by branch'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed))) periods from disbursement_history where status = 1 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) period,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) = ?\n' +
                    'GROUP BY branch, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed))) periods from disbursement_history where status = 1 ' +
                    ' and DATE_FORMAT(date_disbursed, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) = ?\n' +
                    'GROUP BY branch, period'
            }
            break;
        case '2':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and DATE_FORMAT(payment_date, \'%Y\') ='+y+'  order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            break;
        case '3':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and DATE_FORMAT(payment_date, \'%Y\') ='+y+'  order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            break;
        case '4':
            query1 = 'select distinct(DATE_FORMAT(payment_collect_date, \'%M, %Y\')) periods from application_schedules where status = 1 and \n'+
                'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                'and extract(year_month from payment_collect_date) < (select extract(year_month from curdate())) '+
                'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
            query2 = 'select ID, applicationID, DATE_FORMAT(payment_collect_date, \'%M, %Y\') period,\n' +
                'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                '(sum(payment_amount)) as amount_due,\n' +
                '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                'from application_schedules\n' +
                'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                'and date_format(payment_collect_date, \'%M, %Y\') = ? group by office';
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_collect_date, \'%M, %Y\')) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and extract(year_month from payment_collect_date) < (select extract(year_month from curdate())) '+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, DATE_FORMAT(payment_collect_date, \'%M, %Y\') period, \n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and date_format(payment_collect_date, \'%M, %Y\') = ? group by office, Date_format(Payment_collect_date, \'%M%Y\')';
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_collect_date, \'%M, %Y\')) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and extract(year_month from payment_collect_date) < (select extract(year_month from curdate())) '+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, DATE_FORMAT(payment_collect_date, \'%M, %Y\') period,\n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'+
                    'and date_format(payment_collect_date, \'%M, %Y\') = ? group by office, Date_format(Payment_collect_date, \'%M%Y\')';
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_collect_date, \' %Y\')) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and extract(year from payment_collect_date) <= (select extract(year from curdate())) '+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, DATE_FORMAT(payment_collect_date, \'%Y\') period,\n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and date_format(payment_collect_date, \'%Y\') = ? group by office, Date_format(Payment_collect_date, \'%Y\')';
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_collect_date, \' %Y\')) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and extract(year from payment_collect_date) <= (select extract(year from curdate())) '+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, DATE_FORMAT(payment_collect_date, \'%Y\') period,\n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'
                'and date_format(payment_collect_date, \'%Y\') = ? group by office';
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date))) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and (quarter(payment_collect_date) + year(payment_collect_date)) < ((select quarter(curdate()) + (select year(curdate())))) '+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date)) period,\n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and (concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date))) = ? group by office';
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date))) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and (quarter(payment_collect_date) + year(payment_collect_date)) <= ((select quarter(curdate()) + (select year(curdate())))) '+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date)) period, \n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'+
                    'and (concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date))) = ? group by office';
            }
            break;
        case '5':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and DATE_FORMAT(payment_date, \'%Y\') ='+y+'  order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            break;
        case '6':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and DATE_FORMAT(payment_date, \'%Y\') ='+y+'  order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            break;
    }
    let word = 'All Time';
    switch (pvi){
        case 'received':
            if (!officer && !freq && !y){
                query1 = 'select ? from schedule_history limit 1';
                query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                    // 'DATE_FORMAT(payment_date, \'%M, %Y\') period \n'+
                    '(select ? from schedule_history limit 1) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n';
                // 'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                // 'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer;
                // 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (officer && freq == '-1' && y == '0'){
                query1 = 'select ? from schedule_history limit 1';
                query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                    // 'DATE_FORMAT(payment_date, \'%M, %Y\') period \n'+
                    '(select ? from schedule_history limit 1) period,\n'+
                    '(select fullname from users where users.id = '+officer+') officer\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    // 'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer;
                // 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (officer == '0'){
                if (freq == '-1' && y == '0'){
                    query1 = 'select ? from schedule_history limit 1';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        // 'DATE_FORMAT(payment_date, \'%M, %Y\') period \n'+
                        '(select ? from schedule_history limit 1) period\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n';
                    // 'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    // 'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer;
                    // 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '2' && y != '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%M, %Y\') period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '3' && y != '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%Y\') period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                        'group by Date_format(Payment_date, \'%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '4' && y != '0'){
                    query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                        'group by period order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '2' && y == '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%M, %Y\') period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '3' && y == '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%Y\') period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                        'group by Date_format(Payment_date, \'%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '4' && y == '0'){
                    console.log('In Here')
                    query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                        'group by period order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
            }
            else {
                if (freq == '2' && y == '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '2' && y!= '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '3' && y== '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%Y\') period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by Date_format(Payment_date, \'%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '3' && y!= '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%Y\') period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by Date_format(Payment_date, \'%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '4' && y== '0'){
                    query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by period order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '4' && y!= '0'){
                    query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by period order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
            }
            break;
        case 'receivable':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from application_schedules where status = 1 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'SELECT DATE_FORMAT(payment_date, \'%M, %Y\') AS period, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
                    '(select fullname from users where user.id = '+officer+') officer,\n' +
                    '         SUM(payment_amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     application_schedules\n' +
                    'WHERE  status = 2\n' +
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n' +
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'GROUP BY period\n' +
                    'ORDER BY payment_date'
            }
            break;
    }
    let load = {};
    db.query(query1, [word], function (error, results, fields) {
        db.getConnection(function(err, connection) {
            if (err) throw err;
            async.forEachOf(results, function (result, key, callback) {
                connection.query(query2, [(result['periods']) ? result['periods'] : 'All Time'], function (err, rest) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        load[(result['periods']) ? result['periods'] : 'All Time'] = rest;
                    }
                    callback();
                });
            }, function (data) {
                connection.release();
                res.send({"status": 200, "error": null, "response": load, "message": "Success!"});
            });
        });
    });
});

users.get('/individual-borrowers', function(req, res, next) {
    query =
        `select

            ID as CustomerID,
            concat('00000', branch) as BranchCode,
            last_name as Surname,
            first_name as FirstName,
            middle_name as MiddleName,
            dob as Date_Of_Birth,
            'N/A' as National_Identity_Number,
            'N/A' as Driver_License_Number,
            bvn as BVN,
            'N/A' as Passport_Number,
            gender as Gender,
            (select country_name from country where country.ID = client_country) as Nationality,
            marital_status as Marital_Status,
            phone as Mobile_Number,
            address as Primary_Address,
            'N/A' as Primary_City_LGA,
            (select state from state where state.ID = client_state) as Primary_State,
            (select country_name from country where country.ID = client_country) as Primary_Country,
            'N/A' as Employment_Status,
            job as Occupation,
            industry as Business_Category,
            'N/A' as Business_Sector,
            client_type as Borrower_Type,
            'N/A' as Other_ID,
            'N/A' as Tax_ID,
            email as Email_Address,
            employer_name as Employer_Name,
            off_address as Employer_Address,
            'N/A' as Employer_City,
            (select state from state where state.ID = off_state) as Employer_State,
            (select country_name from country where country.ID = job_country) as Employer_Country,
            CASE 
                when (gender = 'Male') then 'Mr.'
                when (gender = 'Female' and marital_status <> 'married') then 'Miss'
                when (gender = 'Female' and marital_status = 'married') then 'Mrs.'
                else 'N/A'
            END as Title,
            'N/A' as Place_of_Birth,
            'N/A' as Work_Phone,
            'N/A' as Home_Phone,
            'N/A' as Secondary_Address,
            'N/A' as Secondary_City,
            'N/A' as Secondary_State,
            'N/A' as Secondary_Country,
            'N/A' as Spouse_Surname,
            'N/A' as Spouse_Firstname,
            'N/A' as Spouse_Middlename
            
        from clients`;

    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/corporate-borrowers', function(req, res, next) {
    query =
        `select 

            ID as Business_Identification_Number,
            name as Business_Name,
            business_type as Business_Corporate_Type,
            'N/A' as Business_Category,
            incorporation_date as Date_of_Incorporation,
            clientID as Customer_ID,
            (select concat('00000', branch) from clients where clients.ID = clientID) as Customer_Branch_Code,
            address as Business_Office_Address,
            'N/A' as City,
            (select state from state where state.ID = state) as State,
            (select country_name from country where country.ID = country) as Country, 
            email as Email_Address,
            'N/A' as Secondary_Address, tax_id as Tax_ID,
            phone as Phone_Number
            
        from corporates`;

    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/principal-officers', function(req, res, next) {
    query =
        `select 

            ID as CustomerID,
            (select fullname from clients where clients.id = clientID) as Principal_Officer1,
            (select dob from clients where clients.ID = clientID) as Date_Of_Birth,
            (select gender from clients where clients.ID = clientID) as Gender,
            (select address from clients where clients.ID = clientID) as Primary_Address,
            'N/A' as City,
            (select state from state where state.ID = (select client_state from clients where clients.ID = clientID)) as State,
            (select country_name from country where country.ID = (select client_country from clients where clients.ID = clientID)) as Country, 
            'N/A' as National_Identity_Number,
            'N/A' as Driver_License_Number,
            (select bvn from clients where clients.ID = clientID) as BVN,
            'N/A' as Passport_Number,
            (select phone from clients where clients.ID = clientID) as PhoneNo1,
            (select email from clients where clients.ID = clientID) as Email_Address,
            (select job from clients where clients.ID = clientID) as Position_In_Business,
            'N/A' as Principal_Officer2_Surname,
            'N/A' as Principal_Officer2_Firstname,
            'N/A' as Principal_Officer2_Middlename
            
        from corporates`;

    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/credit-information', function(req, res, next) {
    query =
        `select 

            userID as CustomerID,
            ID as LoanID,
            (select max(payment_collect_date) 
            from application_schedules 
            where applicationID = app.ID and payment_status = 1 group by applicationID) as Last_Payment_Date,
            'N/A' as Loan_Status_Date,
            disbursement_date as Disbursement_Date,
            loan_amount as Loan_Amount,
            (select 
            CASE 
            when (select count(*)
                from application_schedules
                where applicationID = 30 and payment_status = 1 group by applicationID) is null then loan_amount
            else 
                (loan_amount - 
                (select sum(payment_amount) 
                from application_schedules
                where applicationID = app.ID and payment_status = 1 group by applicationID))
            END) as Outstanding_Balance,
            (loan_amount / duration) as Installment_Amount,
            'NGN' as Currency,
            (select 
            CASE 
            when (select datediff(curdate(), payment_collect_date) 
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID 
                    and payment_collect_date < (select curdate())
                    group by applicationID) is null then 0
            else (select datediff(curdate(), payment_collect_date) 
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID 
                    and payment_collect_date < (select curdate())
                    group by applicationID)
            END) as Days_in_Arrears,
            (select 
            CASE 
            when (select sum(payment_amount) 
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID 
                    and payment_collect_date < (select curdate())
                    group by applicationID) = '' then 0
            else (select sum(payment_amount)
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID 
                    and payment_collect_date < (select curdate())
                    group by applicationID)
            END) as Overdue_Amount,
            'N/A' as Loan_Type,
            duration as Loan_Tenor,
            'Monthly' as Repayment_Frequency,
            (select (payment_amount + interest_amount)
            from schedule_history sh where sh.ID = 
            (select max(ID) from schedule_history shy where shy.applicationID = app.ID)
            and status = 1) as Last_Payment_Amount,
            (select max(payment_collect_date) 
            from application_schedules
            where applicationID = app.ID) as Maturity_Date,
            'N/A' as Loan_Classification,
            'N/A' as Legal_Challenge_Status,
            'N/A' as Litigation_Date,
            'N/A' as Consent_Status,
            'N/A' as Loan_Security_Status,
            'N/A' as Collateral_Type,
            'N/A' as Collateral_Details,
            'N/A' as Previous_Account_Number,
            'N/A' as Previous_Name,
            'N/A' as Previous_CustomerID,
            'N/A' as Previous_BranchCode
            
        from applications app
        where status <> 0
            
`;

    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/portfolio-loan-risk', function(req, res, next) {
    query =
        `select 

            ID,
            (select fullname from clients where clients.id = userID) as Customer_Name,
            concat('00000', (select branch from clients where clients.id = userID))as Branch,
            (select address from clients where clients.id = userID) Address,
            (select gender from clients where clients.id = userID) Gender,
            (select phone from clients where clients.id = userID) Phone_Number,
            loan_amount as Loan_Amount,
            concat(interest_rate, '%') as Interest_Rate,
            'N/A' as Economic_Sector,
            (select sum(payment_amount) from application_schedules aps
            where aps.status = 1
            and aps.applicationID = app.ID
            and payment_collect_date > (select curdate())) as Principal_Balance,
            'N/A' as Customer_Account_Balance,
            disbursement_date as Disbursement_Date,
            (select max(payment_collect_date) 
            from application_schedules
            where applicationID = app.ID) as Maturation_Date,
            (select fullname from users where users.ID = 
            (select loan_officer from clients where clients.ID = userID)) as Credit_Officer,
            (select 
            CASE 
            when (select count(*)
                from application_schedules
                where applicationID = app.ID and payment_status = 1 group by applicationID) is null then loan_amount
            else 
                (loan_amount - 
                (select sum(payment_amount) 
                from application_schedules
                where applicationID = app.ID and payment_status = 1 group by applicationID))
            END) as Total_Outstanding_Principal,
            (select sum(payment_amount) from application_schedules aps
            where aps.status = 1 
            and aps.applicationID = app.ID
            and payment_collect_date < (select curdate())) as Past_Due_Principal,
            (select sum(interest_amount) from application_schedules aps
            where aps.status = 1 
            and aps.applicationID = app.ID
            and payment_collect_date < (select curdate())) as Past_Due_Interest,
            (select (sum(payment_amount) + sum(interest_amount)) from application_schedules aps
            where aps.status = 1 
            and aps.applicationID = app.ID
            and payment_collect_date < (select curdate())) as Loan_Arrears,
            (select payment_amount
            from schedule_history sh where sh.ID = 
            (select max(ID) from schedule_history shy where shy.applicationID = app.ID)
            and sh.status = 1) as Last_Payment_Amount,
            (select sum(interest_amount) from application_schedules aps
            where aps.status = 1 and app.status <> 0
            and aps.applicationID = app.ID) as Due_Interest,
            (select 
            CASE 
                WHEN(select sum(interest_amount) from application_schedules aps
                    where aps.status = 1 and aps.payment_status = 0
                    and aps.applicationID = app.ID
                    and interest_collect_date < (select curdate())) is null THEN 0
                ELSE (select sum(interest_amount) from application_schedules aps
                    where aps.status = 1 and aps.payment_status = 0
                    and aps.applicationID = app.ID
                    and interest_collect_date < (select curdate()))
            END) as Unpaid_Interest,
            'N/A' as Collateral,
            'N/A' as Collateral_Value,
            'N/A' as IPPIS,
            (select 
            CASE
                WHEN reschedule_amount is not null THEN 'Yes'
                ELSE 'No'
            END) as Is_Restructured,
            (select 
            CASE
            WHEN (select count(*)
            from schedule_history sh where 
            sh.applicationID = app.ID and sh.status = 1) is null THEN 0
            ELSE (select sum(payment_amount)
            from schedule_history sh where 
            sh.applicationID = app.ID and sh.status = 1)
            END) as Paid_Principal,
            (select 
            CASE
            WHEN (select count(*)
            from schedule_history sh where 
            sh.applicationID = app.ID and sh.status = 1) is null THEN 0
            ELSE (select sum(interest_amount)
            from schedule_history sh where 
            sh.applicationID = app.ID and sh.status = 1)
            END) as Paid_Interest,
            (select
            CASE 
                WHEN status = 0 THEN 'Inactive'
                WHEN status = 1 THEN 'Active'
                WHEN status = 2 THEN 'Disbursed'
                WHEN close_status = 1 THEN 'Closed'
            END) as Status,
            (select payment_collect_date
            from application_schedules aps
            where payment_status = 0 and aps.status = 1
            and applicationID = app.ID
            and payment_collect_date < (select curdate())
            group by applicationID) as Past_Due_Date,
            (select sh.date_created
            from schedule_history sh where sh.ID = 
            (select max(ID) from schedule_history shy where shy.applicationID = app.ID)
            and sh.status = 1) as Last_Repayment_Date,
            (select 
            CASE 
            when (select datediff(curdate(), payment_collect_date) 
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID 
                    and payment_collect_date < (select curdate())
                    group by applicationID) is null then 0
            else (select datediff(curdate(), payment_collect_date) 
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID
                    and payment_collect_date < (select curdate())
                    group by applicationID)
            END) as Days_OverDue,
            (select sh.date_created
            from schedule_history sh where sh.ID = 
            (select max(ID) from schedule_history shy where shy.applicationID = app.ID)
            and sh.status = 1) as Last_Payment_Date
            
        from applications app
            
`;

    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/trends', function(req, res, next){
    let report = req.query.trend,
        filter = req.query.filter,
        query;
    if (filter === 'Gender'){
        if (report === 'Interest'){
            query = `select sum(interest_amount) amount, 
                    (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender 
                    from schedule_history
                    where status = 1 and 
                    applicationid in (select id from applications where status <> 0) 
                    group by gender`;
        }
        if (report === 'Bad Loans'){
            query = `select
                    sum(payment_amount) amount, 
                    (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                    from application_schedules 
                    where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) 
                    and datediff(curdate(), payment_collect_date) > 90 group by gender  `;
        }
        if (report === 'Overdue Loans'){
            query = `select
                    sum(payment_amount) amount, 
                    (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                    from application_schedules 
                    where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) 
                    and payment_collect_date < (select curdate()) group by gender  `;
        }
    }
    if (filter === 'Age'){
        if (report === 'Interest'){
            query = `select (interest_amount) amount,
                    (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob, 
                    ((select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid))) age 
                    from schedule_history
                    where status = 1 and 
                    applicationid in (select id from applications where status <> 0) group by age`;
            // group by age`;
        }
        if (report === 'Bad Loans'){
            query = `select
                    sum(payment_amount) amount, 
                    (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                    ((select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid))) age
                    from application_schedules 
                    where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) 
                    and datediff(curdate(), payment_collect_date) > 90 group by age  `;
        }
        if (report === 'Overdue Loans'){
            query = `select
                    sum(payment_amount) amount, 
                    (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                    ((select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid))) age
                    from application_schedules 
                    where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) 
                    and payment_collect_date < (select curdate()) group by age  `;
        }
    }
    db.query(query, function (error, result, fields){
        if (error){
            res.send({'status': 500, 'error': error, 'response': null});
        }
        else {
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/demographic-interest-report', function(req, res, next){
    let report = req.query.trend,
        filter = req.query.filter,
        period = req.query.period,
        query,
        year = req.query.year,
        frequency = req.query.frequency;
    payload = {};
    if (filter === 'Gender'){
        query = `select sum(interest_amount) amount, 
                    (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender 
                    from schedule_history
                    where status = 1 and 
                    applicationid in (select id from applications where status <> 0) 
                    group by gender`;
        if (period !== '-1' && year !== '0'){
            query = `select sum(interest_amount) amount, 
                    (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender 
                    from schedule_history
                    where status = 1 and 
                    applicationid in (select id from applications where status <> 0) and 
                    quarter(payment_date) = ${period} and year(payment_date) = ${year}
                    group by gender`;
        }
    }
    if (filter === 'Age'){
        query = `select (interest_amount) amount,
                (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob, 
                CASE
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                END as age_range 
                from schedule_history
                where status = 1 and 
                applicationid in (select id from applications where status <> 0) group by age_range`;
        if (period !== '-1' && year !== '0'){
            query = `select (interest_amount) amount,
                    (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob, 
                    CASE
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                    END as age_range 
                    from schedule_history
                    where status = 1 and 
                    quarter(payment_date) = ${period} and year(payment_date) = ${year} and 
                    applicationid in (select id from applications where status <> 0) group by age_range 
                    `;
        }
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.interest = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/demographic-badloans-report', function(req, res, next){
    let report = req.query.trend,
        filter = req.query.filter,
        period = req.query.period,
        query,
        year = req.query.year,
        frequency = req.query.frequency;
    payload = {};
    if (filter === 'Gender'){
        query = `select
                sum(payment_amount) amount, 
                (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0 
                and datediff(curdate(), payment_collect_date) > 90 group by gender  `;
        if (period !== '-1' && year !== '0'){
            query = `select
                sum(payment_amount) amount, 
                (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0  
                and quarter(payment_collect_date) = ${period} and year(payment_collect_date) = ${year} 
                and datediff(curdate(), payment_collect_date) > 90 group by gender  `;
        }
    }
    if (filter === 'Age'){
        query = `
                select sum(payment_amount) amount, 
                (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                CASE
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                END as age_range
                from application_schedules
                where payment_status = 0 and status = 1 and 
                applicationid in (select id from applications where status = 2) and (select close_status from applications where applications.id = applicationID) = 0 
                group by age_range
                `;
        if (period !== '-1' && year !== '0'){
            query = `
                select sum(payment_amount) amount, 
                (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                CASE
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                END as age_range
                from application_schedules
                where payment_status = 0 and status = 1 and 
                applicationid in (select id from applications where status = 2) and (select close_status from applications where applications.id = applicationID) = 0 
                and quarter(payment_collect_date) = ${period} and year(payment_collect_date) = ${year} 
                group by age_range
                `;
        }
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.badloans = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/demographic-overdues-report', function(req, res, next){
    let report = req.query.trend,
        filter = req.query.filter,
        period = req.query.period,
        query,
        year = req.query.year,
        frequency = req.query.frequency,
        payload = {};
    if (filter === 'Gender'){
        query = `select
                sum(payment_amount) amount, 
                (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0  
                and payment_collect_date < (select curdate()) group by gender  `;
        if (period !== '-1' && year !== '0'){
            query = `select
                sum(payment_amount) amount, 
                (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0  
                and quarter(payment_collect_date) = ${period} and year(payment_collect_date) = ${year} 
                and payment_collect_date < (select curdate()) group by gender  `;
        }
    }
    if (filter === 'Age'){
        query = `select
                sum(payment_amount) amount, 
                (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                CASE
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                END as age_range
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0  
                and payment_collect_date < (select curdate()) group by age_range  `;
        if (period !== '-1' && year !== '0'){
            query = `select
                sum(payment_amount) amount, 
                (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                CASE
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                END as age_range
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0  
                and quarter(payment_collect_date) = ${period} and year(payment_collect_date) = ${year} 
                and payment_collect_date < (select curdate()) group by age_range  `;
        }
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.overdues = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/demographic-age-reports', function(req, res, next){

});

/*Unfortunately won't be called anymore*/
users.get('/growth-trends', function(req, res, next){
    let query, query1, query2, payload;
    query = 'select sum(loan_amount) amount, DATE_FORMAT(disbursement_date, \'%M, %Y\') period ' +
        'from applications ' +
        'where status = 2 and extract(year_month from disbursement_date) <> (select extract(year_month from curdate())) group by extract(year_month from disbursement_date)';
    query1 = 'select sum(interest_amount) amount, DATE_FORMAT(payment_date, \'%M, %Y\') period ' +
        'from schedule_history ' +
        'where status = 1 and extract(year_month from payment_date) <> (select extract(year_month from curdate())) and applicationid in (select id from applications where status = 2) group by extract(year_month from payment_date)';
    query2 = 'select sum(interest_amount) amount, DATE_FORMAT(interest_collect_date, \'%M, %Y\') period ' +
        'from application_schedules ' +
        'where status = 1 and extract(year_month from interest_collect_date) <> (select extract(year_month from curdate())) ' +
        'and applicationid in (select id from applications where status = 2)' +
        'group by extract(year_month from interest_collect_date)';
    payload = {};
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.disbursements = results;
            db.query(query1, function(error, results, fields) {
                if (error){
                    res.send({"status": 500, "error": error, "response": null, 'message': payload});
                }
                else {
                    payload.interest_received = results;
                    db.query(query2, function(error, results, fields) {
                        if (error){
                            res.send({"status": 500, "error": error, "response": null, 'message': payload});
                        }
                        else {
                            payload.interest_receivable = results;
                            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
                        }
                    });
                }
            });
        }
    });
});

users.get('/disbursement-trends', function(req, res, next){
    let query,
        year = req.query.year,
        frequency = req.query.frequency;
    payload = {};
    query = 'select sum(loan_amount) amount, DATE_FORMAT(disbursement_date, \'%M, %Y\') period ' +
        'from applications ' +
        'where status = 2 and extract(year_month from disbursement_date) <> (select extract(year_month from curdate())) ' +
        'group by extract(year_month from disbursement_date)';
    if (!frequency || frequency === '-1' || frequency === '2' && year === '0'){
        query = 'select sum(loan_amount) amount, DATE_FORMAT(disbursement_date, \'%M, %Y\') period ' +
            'from applications ' +
            'where status = 2 and extract(year_month from disbursement_date) <> (select extract(year_month from curdate())) ' +
            'group by extract(year_month from disbursement_date)';
    }
    if (frequency && frequency === '2' && year !== '0'){
        query = 'select sum(loan_amount) amount, DATE_FORMAT(disbursement_date, \'%M, %Y\') period ' +
            'from applications ' +
            'where status = 2 ' +
            'and DATE_FORMAT(disbursement_date, \'%Y\') = '+year+' ' +
            'and extract(year_month from disbursement_date) <> (select extract(year_month from curdate())) ' +
            'group by extract(year_month from disbursement_date)';
    }
    if (frequency && frequency === '3'){
        query = 'select sum(loan_amount) amount, DATE_FORMAT(disbursement_date, \'%Y\') period ' +
            'from applications ' +
            'where status = 2 and extract(year from disbursement_date) <> (select extract(year from curdate())) ' +
            'group by period';
    }
    if (frequency && frequency === '4' && year !== '0'){
        query = 'select sum(loan_amount) amount, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period ' +
            'from applications ' +
            'where status = 2 ' +
            'and concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) <> (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) ' +
            'and DATE_FORMAT(disbursement_date, \'%Y\') = '+year+' ' +
            'group by period';
    }
    if (frequency && frequency === '4' && year === '0'){
        query = 'select sum(loan_amount) amount, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period ' +
            'from applications ' +
            'where status = 2 ' +
            'and concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) <> (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) ' +
            'group by period order by extract(year_month from disbursement_date)';
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.disbursements = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/interest-received-trends', function(req, res, next){
    let query,
        year = req.query.year,
        frequency = req.query.frequency;
    payload = {};
    query = 'select sum(interest_amount) amount, DATE_FORMAT(payment_date, \'%M, %Y\') period ' +
        'from schedule_history ' +
        'where status = 1 and extract(year_month from payment_date) <> (select extract(year_month from curdate())) ' +
        'and applicationid in (select id from applications where status = 2) group by extract(year_month from payment_date)';
    if (!frequency || frequency === '-1' || frequency === '2' && year === '0'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(payment_date, \'%M, %Y\') period ' +
            'from schedule_history ' +
            'where status = 1 and extract(year_month from payment_date) <> (select extract(year_month from curdate())) ' +
            'and applicationid in (select id from applications where status = 2) group by extract(year_month from payment_date)';
    }
    if (frequency && frequency === '2' && year !== '0'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(payment_date, \'%M, %Y\') period ' +
            'from schedule_history ' +
            'where status = 1  and extract(year_month from payment_date) <> (select extract(year_month from curdate())) ' +
            'and DATE_FORMAT(payment_date, \'%Y\') = '+year+' and applicationid in (select id from applications where status = 2) group by extract(year_month from payment_date)';
    }
    if (frequency && frequency === '3'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(payment_date, \'%Y\') period ' +
            'from schedule_history ' +
            'where status = 1  and extract(year from payment_date) <> (select extract(year from curdate())) ' +
            'and applicationid in (select id from applications where status = 2) group by period'
    }
    if (frequency && frequency === '4' && year !== '0'){
        query = 'select sum(interest_amount) amount, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period ' +
            'from schedule_history ' +
            'where status = 1 and applicationid in (select id from applications where status = 2) ' +
            'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) <> (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) '+
            'and DATE_FORMAT(payment_date, \'%Y\') = '+year+' ' +
            'group by period order by extract(year_month from payment_date)';
    }
    if (frequency && frequency === '4' && year === '0'){
        query = 'select sum(interest_amount) amount, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period ' +
            'from schedule_history ' +
            'where status = 1 and applicationid in (select id from applications where status = 2) ' +
            'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) <> (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) '+
            'group by period order by extract(year_month from payment_date)';
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.interest_received = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/interest-receivable-trends', function(req, res, next){
    let query,
        year = req.query.year,
        frequency = req.query.frequency,
        payload = {};
    query = 'select sum(interest_amount) amount, DATE_FORMAT(interest_collect_date, \'%M, %Y\') period ' +
        'from application_schedules ' +
        'where status = 1 and extract(year_month from interest_collect_date) < (select extract(year_month from curdate())) ' +
        'and applicationid in (select id from applications where status = 2)' +
        'group by extract(year_month from interest_collect_date)';
    if (!frequency || frequency === '-1' || frequency === '2' && year === '0'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(interest_collect_date, \'%M, %Y\') period ' +
            'from application_schedules ' +
            'where status = 1  and extract(year_month from interest_collect_date) < (select extract(year_month from curdate())) ' +
            'and applicationid in (select id from applications where status = 2)' +
            'group by extract(year_month from interest_collect_date)';
    }
    if (frequency && frequency === '2' && year !== '0'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(interest_collect_date, \'%M, %Y\') period ' +
            'from application_schedules ' +
            'where status = 1 and extract(year_month from interest_collect_date) < (select extract(year_month from curdate()))  ' +
            'and DATE_FORMAT(interest_collect_date, \'%Y\') = '+year+' and applicationid in (select id from applications where status = 2) group by extract(year_month from interest_collect_date)';
    }
    if (frequency && frequency === '3'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(interest_collect_date, \'%Y\') period ' +
            'from application_schedules ' +
            'where status = 1  and extract(year from interest_collect_date) < (select extract(year from curdate())) ' +
            'and applicationid in (select id from applications where status = 2) group by period'
    }
    if (frequency && frequency === '4' && year !== '0'){
        query = 'select sum(interest_amount) amount, concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) period ' +
            'from application_schedules ' +
            'where status = 1 and applicationid in (select id from applications where status = 2) ' +
            // 'and concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) < (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) '+
            'and (quarter(interest_collect_date) + year(interest_collect_date)) < ((select quarter(curdate()) + (select year(curdate()))) ' +
            'and DATE_FORMAT(interest_collect_date, \'%Y\') = '+year+' ' +
            'group by period order by extract(year_month from interest_collect_date)';
    }
    if (frequency && frequency === '4' && year === '0'){
        query = 'select sum(interest_amount) amount, concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) period ' +
            'from application_schedules ' +
            'where status = 1 and applicationid in (select id from applications where status = 2) ' +
            // 'and concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) < (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) '+
            'and (quarter(interest_collect_date) + year(interest_collect_date)) < ((select quarter(curdate()) + (select year(curdate())))) ' +
            'group by period order by extract(year_month from interest_collect_date)';
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.interest_receivable = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

///// Treasury Management
users.get('/treasury/expenses', function(req, res, next){
    let capitalQuery, interestQuery, expensesQuery, disbursementQuery, period = req.query.period, start = req.query.start, end = req.query.end;
    capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
    interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
    expensesQuery = `select * from expenses where status = 1 and date_of_spend = curdate()`;
    disbursementQuery = `select 
                            case 
                                when (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate())) = 0 then 'No Previous History For This Date'
                                else (select sum(amount)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate()))    
                                    /
                                    (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate()))
                            end
                        as average`;
    if (period && period === '0'){
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and timestamp(a.investment_mature_date) between timestamp("${start}") and timestamp("${end}"))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and timestamp(a.investment_mature_date) between timestamp("${start}") and timestamp("${end}"))
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and timestamp(a.investment_mature_date) between timestamp("${start}") and timestamp("${end}"))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and timestamp(a.investment_mature_date) between timestamp("${start}") and timestamp("${end}"))
                ) as amount
                `;
        expensesQuery = `select * from expenses where status = 1 
                    and timestamp(date_of_spend) between timestamp("${start}") and timestamp("${end}")`;
        disbursementQuery = `select 
                            case 
                                when (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) between day("${start}") and day("${end}")) = 0 then 'No Previous History For This Date'
                                else (select sum(amount)
                                    from disbursement_history 
                                    where day(date_disbursed) between day("${start}") and day("${end}"))
                                    /
                                    (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) between day("${start}") and day("${end}"))
                            end
                        as average`;
    }
    if (period && period === '1'){
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
        expensesQuery = `select * from expenses where status = 1 and date_of_spend = curdate()`;
        disbursementQuery = `select 
                            case 
                                when (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate())) = 0 then 'No Previous History For This Date'
                                else (select sum(amount)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate()))    
                                    /
                                    (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate()))
                            end
                        as average`;
    }
    if (period && period === '2'){
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                ) as amount
                `;
        expensesQuery = `select * from expenses where status = 1 and yearweek(date_of_spend) = yearweek(curdate())`;
        disbursementQuery = `select 
                                case 
                                    when (select count(Distinct concat(FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1, month(date_disbursed)))
                                            from disbursement_history 
                                            where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1)
                                           ) = 0 then 'No Previous History For This Week'
                                    else ((select sum(amount)
                                            from disbursement_history 
                                            where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1) )
                                            /
                                            (select count(Distinct concat(FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1, month(date_disbursed)))
                                            from disbursement_history 
                                            where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1)))
                                end
                            as average`;
    }
    if (period && period === '3'){
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                ) as amount
                `;
        expensesQuery = `select * from expenses where status = 1 and extract(year_month from date_of_spend) = extract(year_month from curdate())`;
        disbursementQuery = `
                            select 
                                case 
                                    when (select count(Distinct concat(month(date_disbursed), year(date_disbursed)))
                                            from disbursement_history 
                                            where month(date_disbursed) = month(curdate())
                                           ) = 0 then 'No Previous History For This Week'
                                    else ((select sum(amount)
                                            from disbursement_history 
                                            where month(date_disbursed) = month(curdate()))
                                            /
                                            (select count(Distinct concat(month(date_disbursed), year(date_disbursed)))
                                            from disbursement_history 
                                            where month(date_disbursed) = month(curdate())
                                           ))
                                end
                            as average
                            `;
    }
    let response = {};
    db.query(capitalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            response.capital = results;
            db.query(interestQuery, function(error, results, fields){
                if (error){
                    res.send({"status": 500, "error": error, "response": null});
                }
                else {
                    response.interests = results;
                    db.query(expensesQuery, function(error, results, fields){
                        if (error){
                            res.send({"status": 500, "error": error, "response": null});
                        }
                        else {
                            response.expenses = results;
                            db.query(disbursementQuery, function(error, results, fields){
                                if (error){
                                    res.send({"status": 500, "error": error, "response": null});
                                }
                                else {
                                    response.disbursements = results;
                                    res.send({"status": 200, "error": null, "response": "Success", 'message': response});
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

users.get('/treasury/income', function(req, res, next){
    let principalQuery, interestQuery, period = req.query.period, start = req.query.start, end = req.query.end;
    principalQuery = `
                select sum(payment_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    if (period && period === '0'){
        principalQuery = `
                select sum(payment_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and timestamp(payment_collect_date) between timestamp("${start}") and timestamp("${end}")
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and timestamp(payment_collect_date) between timestamp("${start}") and timestamp("${end}")
                `;
    }
    if (period && period === '1'){
        principalQuery = `
                select sum(payment_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    }
    if (period && period === '2'){
        principalQuery = `
                select sum(payment_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and yearweek(payment_collect_date) = yearweek(curdate())
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and yearweek(payment_collect_date) = yearweek(curdate())
                `;
    }
    if (period && period === '3'){
        principalQuery = `
                select sum(payment_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from curdate())
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from curdate())
                `;
    }
    let response = {};
    db.query(principalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            response.capital = results;
            db.query(interestQuery, function(error, results, fields){
                if (error){
                    res.send({"status": 500, "error": error, "response": null});
                }
                else {
                    response.interests = results;
                    res.send({"status": 200, "error": null, "response": "Success", 'message': response});
                }
            });
        }
    });
});

users.get('/investment-figures', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        capitalQuery, interestQuery;
    let today = moment().utcOffset('+0100').format('YYYY-MM-DD');
    capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
    interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
    if (day && day!== ''){
        day = "'"+day+"'";
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and a.investment_mature_date = ${day})
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = ${day})
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = ${day})
                    -
                    (select sum(b.amount)
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = ${day})
                ) as amount
                `;
    }
    if (period && period == '1'){ //daily
        day = "'"+day+"'";
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                        `;
    }
    if (period && period == '2'){ //weekly
        day = "'"+day+"'";
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                ) as amount
                `;
    }
    if (day && day!== '' && period && period == '3'){ //monthly
        day = "'"+day+"'";
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                ) as amount
                `;
    }
    // if (day && day!== ''){
    //     day = "'"+day+"'";
    //     capitalQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //             ) as amount
    //             `;
    //     interestQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //                 -
    //                 (select sum(b.amount)
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //             ) as amount
    //             `;
    // }
    // if (day && day!== '' && period && period == '1'){ //daily
    //     day = "'"+day+"'";
    //     capitalQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //             ) as amount
    //             `;
    //     interestQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //             ) as amount
    //                     `;
    // }
    // if (day && day!== '' && period && period == '2'){ //weekly
    //     day = "'"+day+"'";
    //     capitalQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and a.investment_mature_date <> ''
    //                 and yearweek(a.investment_mature_date) = yearweek(${day}))
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and a.investment_mature_date <> ''
    //                 and yearweek(a.investment_mature_date) = yearweek(${day}))
    //             ) as amount
    //             `;
    //     interestQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and yearweek(a.investment_mature_date) = yearweek(${day}))
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and yearweek(a.investment_mature_date) = yearweek(${day}))
    //             ) as amount
    //             `;
    // }
    // if (day && day!== '' && period && period == '3'){ //monthly
    //     day = "'"+day+"'";
    //     capitalQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and a.investment_mature_date <> ''
    //                 and extract(year_month from a.investment_mature_date) = extract(year_month from ${day}))
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and a.investment_mature_date <> ''
    //                 and extract(year_month from a.investment_mature_date) = extract(year_month from ${day}))
    //             ) as amount
    //             `;
    //     interestQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and extract(year_month from a.investment_mature_date) = extract(year_month from ${day}))
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and extract(year_month from a.investment_mature_date) = extract(year_month from ${day}))
    //             ) as amount
    //             `;
    // }
    let response = {};
    db.query(capitalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            response.capital = results;
            db.query(interestQuery, function(error, results, fields){
                if (error){
                    res.send({"status": 500, "error": error, "response": null});
                }
                else {
                    response.interests = results;
                    res.send({"status": 200, "error": null, "response": "Success", 'message': response});
                }
            });
        }
    });
});

users.get('/loan-figures', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        principalQuery, interestQuery;
    principalQuery = `
                select sum(payment_amount+interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    if (day && day!== ''){
        day = "'"+day+"'";
        principalQuery = `
                select sum(payment_amount+interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = ${day}
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = ${day}
                `;
    }
    if (period && period == '1'){ //daily
        day = "'"+day+"'";
        principalQuery = `
                select sum(payment_amount+interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    }
    if (period && period == '2'){ //weekly
        day = "'"+day+"'";
        principalQuery = `
                select sum(payment_amount+interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and yearweek(payment_collect_date) = yearweek(curdate())
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and yearweek(payment_collect_date) = yearweek(curdate())
                `;
    }
    if (period && period == '3'){ //monthly
        day = "'"+day+"'";
        principalQuery = `
                select sum(payment_amount+interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from curdate())
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from curdate())
                `;
    }
    // if (day && day!== ''){
    //     day = "'"+day+"'";
    //     principalQuery = `
    //             select sum(payment_amount+interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and payment_collect_date = ${day}
    //             `;
    //     interestQuery = `
    //             select sum(interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and payment_collect_date = ${day}
    //             `;
    // }
    // if (day && day!== '' && period && period == '1'){ //daily
    //     day = "'"+day+"'";
    //     principalQuery = `
    //             select sum(payment_amount+interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and payment_collect_date = ${day}
    //             `;
    //     interestQuery = `
    //             select sum(interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and payment_collect_date = ${day}
    //             `;
    // }
    // if (day && day!== '' && period && period == '2'){ //weekly
    //     day = "'"+day+"'";
    //     principalQuery = `
    //             select sum(payment_amount+interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and yearweek(payment_collect_date) = yearweek(${day})
    //             `;
    //     interestQuery = `
    //             select sum(interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and yearweek(payment_collect_date) = yearweek(${day})
    //             `;
    // }
    // if (day && day!== '' && period && period == '3'){ //monthly
    //     day = "'"+day+"'";
    //     principalQuery = `
    //             select sum(payment_amount+interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from ${day})
    //             `;
    //     interestQuery = `
    //             select sum(interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from ${day})
    //             `;
    // }
    let response = {};
    db.query(principalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            response.capital = results;
            db.query(interestQuery, function(error, results, fields){
                if (error){
                    res.send({"status": 500, "error": error, "response": null});
                }
                else {
                    response.interests = results;
                    res.send({"status": 200, "error": null, "response": "Success", 'message': response});
                }
            });
        }
    });
});

users.get('/predicted-loan-figures', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        principalQuery, interestQuery;
    day = "'"+day+"'";
    principalQuery = `
                select 
                    case 
                        when (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(curdate())) = 0 then 'No Previous History For This Date'
                        else (select sum(amount)
                            from disbursement_history 
                            where day(date_disbursed) = day(curdate()))    
                            /
                            (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(curdate()))
                    end
                as average
                `;
    if (day && day!== ''){
        principalQuery = `
                select 
                    case 
                        when (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day})) = 0 then 'No Previous History For This Date'
                        else (select sum(amount)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day}))    
                            /
                            (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day}))
                    end
                as average
                `;
    }
    if (day && day!== '' && period && period == '1'){ //daily
        principalQuery = `
                select 
                    case 
                        when (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day})) = 0 then 'No Previous History For This Date'
                        else (select sum(amount)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day}))    
                            /
                            (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day}))
                    end
                as average
                `;
    }
    if (period && period == '2'){ //weekly
        principalQuery = `
                select 
                    case 
                        when (select count(Distinct concat(FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1, month(date_disbursed)))
                                from disbursement_history 
                                where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1)
                               ) = 0 then 'No Previous History For This Week'
                        else ((select sum(amount)
                                from disbursement_history 
                                where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1) )
                                /
                                (select count(Distinct concat(FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1, month(date_disbursed)))
                                from disbursement_history 
                                where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1)))
                    end
                as average
                `;
    }
    if (period && period == '3'){ //monthly
        principalQuery = `
                select 
                    case 
                        when (select count(Distinct concat(month(date_disbursed), year(date_disbursed)))
                                from disbursement_history 
                                where month(date_disbursed) = month(curdate())
                               ) = 0 then 'No Previous History For This Week'
                        else ((select sum(amount)
                                from disbursement_history 
                                where month(date_disbursed) = month(curdate()))
                                /
                                (select count(Distinct concat(month(date_disbursed), year(date_disbursed)))
                                from disbursement_history 
                                where month(date_disbursed) = month(curdate())
                               ))
                    end
                as average
                `;
    }
    db.query(principalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            res.send({"status": 200, "error": null, "response": "Success", 'message': results});
        }
    });
});

users.get('/investment-payouts', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        capitalQuery, interestQuery;
    let today = moment().utcOffset('+0100').format('YYYY-MM-DD');
    capitalQuery = `
                select id, (select fullname from clients where clients.id = a.clientId) client, a.amount, investment_mature_date
                from investments a
                where a.investment_mature_date <> ''
                and investment_mature_date = curdate()
                `;
    if (period && period == '1'){
        day = "'"+day+"'";
        capitalQuery = `
                select id, (select fullname from clients where clients.id = a.clientId) client, a.amount, investment_mature_date
                from investments a
                where a.investment_mature_date <> ''
                and investment_mature_date = curdate()
                `;
    }
    if (period && period == '2'){
        day = "'"+day+"'";
        capitalQuery = `
                select id, (select fullname from clients where clients.id = a.clientId) client, a.amount, investment_mature_date
                from investments a
                where a.investment_mature_date <> ''
                and yearweek(a.investment_mature_date) = yearweek(curdate()) 
                `;
    }
    if (period && period == '3'){
        day = "'"+day+"'";
        capitalQuery = `
                select id, (select fullname from clients where clients.id = a.clientId) client, a.amount, investment_mature_date
                from investments a
                where a.investment_mature_date <> ''
                and extract(year_month from a.investment_mature_date) = extract(year_month from curdate())
                `;
    }
    db.query(capitalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            res.send({"status": 200, "error": null, "response": "Success", 'message': results});
        }
    });
});

users.get('/investment-interests', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        capitalQuery, interestQuery;
    let today = moment().utcOffset('+0100').format('YYYY-MM-DD');
    capitalQuery = `
                select investmentid, (select fullname from clients where clients.id = clientId) client, sum(amount) amount, clientId,
                (select investment_mature_date from investments where investments.id = investmentid) investment_mature_date 
                from investment_txns where 
                isInterest =1 and is_credit = 1 and isReversedTxn = 0
                and (select investment_mature_date from investments i where i.id = investmentid) = curdate()
                group by investmentid
                `;
    if (period && period == '1'){
        day = "'"+day+"'";
        capitalQuery = `
                select investmentid, (select fullname from clients where clients.id = clientId) client, sum(amount) amount, clientId,
                (select investment_mature_date from investments where investments.id = investmentid) investment_mature_date
                from investment_txns where 
                isInterest =1 and is_credit = 1 and isReversedTxn = 0
                and (select investment_mature_date from investments i where i.id = investmentid) = curdate()
                group by investmentid
                `;
    }
    if (period && period == '2'){
        day = "'"+day+"'";
        capitalQuery = `
                select investmentid, (select fullname from clients where clients.id = clientId) client, sum(amount) amount, 
                (select investment_mature_date from investments where investments.id = investmentid) investment_mature_date
                from investment_txns where 
                isInterest =1 and is_credit = 1 and isReversedTxn = 0
                and (select yearweek(investment_mature_date) from investments i where i.id = investmentid) = yearweek(curdate())
                group by investmentid
                `;
    }
    if (period && period == '3'){
        day = "'"+day+"'";
        capitalQuery = `
                select investmentid, (select fullname from clients where clients.id = clientId) client, sum(amount) amount, 
                (select investment_mature_date from investments where investments.id = investmentid) investment_mature_date
                from investment_txns where 
                isInterest =1 and is_credit = 1 and isReversedTxn = 0
                and (select extract(year_month from investment_mature_date) from investments i where i.id = investmentid) = extract(year_month from curdate())
                group by investmentid
                `;
    }console.log(capitalQuery)
    db.query(capitalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            res.send({"status": 200, "error": null, "response": "Success", 'message': results});
        }
    });
});

users.get('/loan-receivables', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        principalQuery, interestQuery;
    principalQuery = `
                select applicationID, (select fullname from clients c where c.id = (select userid from applications a where a.id = applicationID)) client, payment_amount, interest_amount, payment_collect_date
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                group by applicationID
                `;
    if (period && period== '1'){
        day = "'"+day+"'";
        principalQuery = `
                select applicationID, (select fullname from clients c where c.id = (select userid from applications a where a.id = applicationID)) client, payment_amount, interest_amount, payment_collect_date
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                group by applicationID
                `;
    }

    if (period && period== '2'){
        day = "'"+day+"'";
        principalQuery = `
                select applicationID, (select fullname from clients c where c.id = (select userid from applications a where a.id = applicationID)) client, payment_amount, interest_amount, payment_collect_date
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and yearweek(payment_collect_date) = yearweek(curdate())
                group by applicationID
                `;
    }

    if (period && period == '3'){
        day = "'"+day+"'";
        principalQuery = `
                select applicationID, (select fullname from clients c where c.id = (select userid from applications a where a.id = applicationID)) client, payment_amount, interest_amount, payment_collect_date
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from curdate())
                group by applicationID
                `;
    }

    let response = {};
    db.query(principalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            res.send({"status": 200, "error": null, "response": "Success", 'message': results});
        }
    });
});

users.post('/new-expense', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO expenses Set ?',
        query2 = 'select * from expenses where expense_name = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.expense_name, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Expense already exists!"}));
        db.query(query,{"expense_name":postData.expense_name, "amount":postData.amount, "date_of_spend":postData.date_of_spend, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New Expense Added!"}));
            }
        });
    });
});

users.get('/expenses', function(req, res, next) {
    let query = 'SELECT * from expenses';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Change Expense Status */
users.post('/del-expense/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update expenses SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Expense Disabled!"}));
        }
    });
});

/* Reactivate Expense Type */
users.post('/en-expense/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update expenses SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Expense Re-enabled!"}));
        }
    });
});

/////// Loan Classification
/* Create New Loan Classification
 */

users.post('/new-classification-type', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO loan_classifications Set ?',
        query2 = 'select * from loan_classifications where description = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.description, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Classifcation already exists!"}));
        db.query(query,{"description":postData.description, "min_days":postData.min_days, "max_days":postData.max_days, "un_max":postData.un_max, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New Loan Classifcation Added!"}));
            }
        });
    });
});

users.post('/edit-classification/:id/', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.description, postData.min_days, postData.max_days, postData.un_max, postData.date_modified, req.params.id],
        query = 'Update loan_classifications SET description=?, min_days=?, max_days=?, un_max =?, date_modified =? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        }
        else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Classification Details Updated"}));
        }
    });
});

users.get('/classification-types', function(req, res, next) {
    let query = 'SELECT * from loan_classifications where status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/classification-types-full', function(req, res, next) {
    let query = 'SELECT * from loan_classifications';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Change Classification Type Status */
users.post('/del-class-type/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update loan_classifications SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Disabled!"}));
        }
    });
});

/* Reactivate Classification Type */
users.post('/en-class-type/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update loan_classifications SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Re-enabled!"}));
        }
    });
});

users.get('/class-dets/:id', function(req, res, next) {
    let query = 'SELECT * from loan_classifications where id = ? ';
    db.query(query, req.params.id, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});


/////// Activity
/*Create New Activity Type*/
users.post('/new-activity-type', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO activity_types Set ?',
        query2 = 'select * from activity_types where activity_name = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.role, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Activity type already exists!"}));
        db.query(query,{"activity_name":postData.role, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New Activity Type Added!"}));
            }
        });
    });
});

users.get('/activity-types', function(req, res, next) {
    let query = 'SELECT * from activity_types where status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/activity-types-full', function(req, res, next) {
    let query = 'SELECT * from activity_types';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Add New Activity */
users.post('/new-activity', function(req, res, next) {
    let data = [],
        postData = req.body,
        query =  'INSERT INTO activities Set ?',
        query2 = 'SELECT ID from activities where ID = LAST_INSERT_ID()';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(query,postData, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                connection.query(query2, function(error, results, fields){
                    let id = results[0].ID;
                    connection.query('update activities set attachments = ? where activities.id = ?', [postData.attachments, id], function(error, results, fields){
                        connection.release();
                        let payload = {}
                        payload.category = 'Activity'
                        payload.userid = postData.for_
                        payload.description = 'New Activity Created'
                        notificationsService.log(req, payload)
                        res.send(JSON.stringify({"status": 200, "error": null, "response": "New Activity Created", "result": id}));
                    });
                });
            }
        });
    });
});

/* All Activities */
users.get('/activities', function(req, res, next) {
    let current_user = req.query.user;
    let team = req.query.team;
    let officer = req.query.officer;
    let word = 'team'
    let load = [];
    let query = 'SELECT *, (select count(*) from activity_comments where activityID = activities.ID group by activityID) as comment_count, ' +
        '(select fullname from clients c where c.ID = client) as clients, ' +
        '(select fullname from users where users.id = for_) as user, ' +
        '(select name from teams where teams.Id = ?) as team_name, ' +
        '(select activity_name from activity_types at where at.id = activity_type) as activity ' +
        'from activities where status = 1 and for_ = ? ';
    if (team){
        query = query.concat(' and category = ?').concat('  and team = ? order by id desc')
        load = [team, current_user, word, team]
    }
    if (officer){
        query = 'SELECT *, (select count(*) from activity_comments where activityID = activities.ID group by activityID) as comment_count, ' +
            '(select fullname from clients c where c.ID = client) as clients, ' +
            '(select fullname from users where users.id = for_) as user, ' +
            '(select name from teams where teams.Id = team) as team_name, ' +
            '(select activity_name from activity_types at where at.id = activity_type) as activity ' +
            'from activities where for_ = ? and status = 1 order by id desc';
        load = [officer]
    }
    db.query(query, load, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/all-activities', function(req, res, next) {
    let current_user = req.query.user;
    let team = req.query.team;
    let officer = req.query.officer;
    let word = 'team'
    let load = [];
    let query = 'SELECT *, (select count(*) from activity_comments where activityID = activities.ID group by activityID) as comment_count, ' +
        '(select fullname from clients c where c.ID = client) as client_name, ' +
        '(select fullname from users where users.id = for_) as user, ' +
        '(select name from teams where teams.Id = team) as team_name, ' +
        '(select activity_name from activity_types at where at.id = activity_type) as activity ' +
        'from activities where status = 1 and for_ is not null order by ID desc';
    db.query(query, load, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Teams */
users.get('/teams', function(req, res, next) {
    let current_user = req.query.user;
    let query = 'select teamID, ' +
        '(select name from teams where teams.id = teamID) as team_name ' +
        'from team_members where memberID = ? ' +
        // '(select users.ID from users where users.fullname = ? and users.status = 1) ' +
        'and status = 1'
    db.query(query, [current_user], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Team Activities */
users.get('/team-activities', function(req, res, next) {
    let current_user = req.query.user;
    let word = 'team'
    let query = 'select *, (select count(*) from activity_comments where activityID = activities.ID group by activityID) as comment_count, ' +
        '(select activity_name from activity_types where activity_types.id = activity_type) as activity, ' +
        '(select name from teams where teams.Id = team) as team_name, ' +
        '(select fullname from users where users.id = for_) as user, ' +
        '(select fullname from clients where clients.id = client) as client_name ' +
        'from activities where ' +
        'category = ? and team in (select teamID from team_members where memberID = ?) or (select supervisor from teams where teams.id = team) = ?' +
        ' order by id desc';
    // 'for_ = ?  ';
    // '(select fullname from users where users.id in (select memberID from team_members where teamID in (select teamID from team_members where memberID = (select users.ID from users where users.fullname = ? and users.status = 1 ) and status = 1)  and status = 1) ) ' +
    //         'and for_ <> ?';
    let query2 = 'select *, (select count(*) from activity_comments where activityID = activities.ID group by activityID) as comment_count,' +
        '(select activity_name from activity_types where activity_types.id = activity_type) as activity, ' +
        '(select fullname from clients where clients.id = client) as client_name, ' +
        '(select name from teams where teams.Id = team) as team_name, ' +
        '(select fullname from users where users.id = for_) as user ' +
        'from activities where ' +
        'team = 0 and for_ = ? order by id desc';
    db.query(query, [word, current_user, current_user], function (error, results_team, fields) {
        db.query(query2, [current_user], function (error, results_personal, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                let results = _.orderBy(results_team.concat(results_personal), ['ID'], ['desc']);
                res.send(JSON.stringify(results));
            }
        });
    });
});

/* Add Comment */
users.post('/save-comment', function(req, res, next) {
    let data = [],
        postData = req.body,
        query =  'INSERT INTO activity_comments Set ?';
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(query,postData, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                let payload = {}
                payload.category = 'Activity'
                payload.userid = req.cookies.timeout
                payload.description = 'New Activity Comment'
                payload.affected = postData.activityID
                notificationsService.log(req, payload)
                res.send(JSON.stringify({"status": 200, "error": null, "response": "Comment Posted"}));
            }
        });
    });
});

/* Activity Comments */
users.get('/activity-comments', function(req, res, next) {
    let activity = req.query.activity;
    let query = 'select *, (select fullname from users where users.ID = commenter) as maker from activity_comments where activityID = ?'
    db.query(query, [activity], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send(results);
        }
    });
});

/* Activity Details */
users.get('/activity-details', function(req, res, next) {
    var load = {}
    let activity = req.query.id;
    let query = 'select *, (select count(*) from activity_comments where activityID = ? group by activityID) as comment_count, ' +
        '(select activity_name from activity_types where activity_types.id = activity_type) as activity, ' +
        '(select name from teams where teams.Id = team) as team_name, ' +
        '(select fullname from users where users.id = for_) as user, ' +
        '(select fullname from clients where clients.id = client) as client_name ' +
        'from activities where activities.ID = ?'
    let query2 = 'select *, (select fullname from users where users.ID = commenter) as maker from activity_comments where activityID = ?'
    db.query(query, [activity, activity], function (error, results, fields) {
        load.activity_details = results
        db.query(query2, [activity], function (error, results, fields) {
            load.activity_comments = results
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                res.send(load);
            }
        });
    });
});

/* Client Activities */
users.get('/client-activities', function(req, res, next) {
    var load = {}
    let client = req.query.id;
    let query = 'select *, ' +
        '(select activity_name from activity_types where activity_types.id = activity_type) as activity, ' +
        '(select fullname from users where users.id = for_) as user, ' +
        '(select fullname from clients where clients.id = client) as client_name ' +
        'from activities where client = ?'
    let query2 = 'select *, (select fullname from users where users.ID = commenter) as maker from activity_comments where activityID = ?'
    db.query(query, [client], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send(results);
        }
    });
});

users.get('/clients-act', function(req, res, next) {
    let user = req.query.user;
    let team = req.query.team;
    let params;
    let query = 'select * ' +
        'from clients where loan_officer = ? ' +
        'and status = 1';
    params = [user];
    if (team){
        query = 'select * from clients where loan_officer in (select memberID from team_members where teamID = ?)';
        params = [team];
    }
    db.query(query, params, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Change Activity Type Status */
users.post('/del-act-type/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update activity_types SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Disabled!"}));
        }
    });
});

/* Reactivate Role */
users.post('/en-act-type/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update activity_types SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Re-enabled!"}));
        }
    });
});

//File Attachments - Activities
users.post('/attach-files/:id', function(req, res) {
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params.id) return res.status(400).send('No Folder specified!');
    if (req.body.num === '1'){
        fs.stat('files/activities/'+req.params.id+'/', function(err) {
            if (!err) {
                console.log('file or directory exists');
            }
            else if (err.code === 'ENOENT') {
                fs.mkdirSync('files/activities/'+req.params.id+'/');
            }
            let sampleFile = req.files.file,
                name = sampleFile.name,
                extArray = sampleFile.name.split("."),
                extension = extArray[extArray.length - 1];
            if (extension) extension = extension.toLowerCase();

            fs.stat('files/activities/'+req.params.id+'/'+name, function (err) {
                if (err) {
                    sampleFile.mv('files/activities/'+req.params.id+'/'+name, function(err) {
                        if (err) return res.status(500).send(err);
                        res.send('File uploaded!');
                    });
                }
                else{
                    fs.unlink('files/activities/'+req.params.id+'/'+name,function(err){
                        if(err){
                            res.send('Unable to delete file!');
                        }
                        else{
                            sampleFile.mv('files/activities/'+req.params.id+'/'+name, function(err) {
                                if (err)
                                    return res.status(500).send(err);
                                res.send('File uploaded!');
                            });
                        }
                    });
                }
            });
        });
    }
});

/* GET Activity Attachments. */
users.get('/attached-images/:folder/', function(req, res, next) {
    var array = [];
    var path = 'files/activities/'+req.params.folder+'/';
    if (fs.existsSync(path)){
        fs.readdir(path, function (err, files){
            var obj = [];
            files = helperFunctions.removeFileDuplicates(path, files);
            async.forEach(files, function (file, callback){
                obj.push(path+file)
                callback();
            }, function(data){
                //array.push(res);
                res.send(JSON.stringify({"status": 200, "response":obj}));
            });
        })	;
    }
    else {
        res.send(JSON.stringify({"status":500, "response": "No Attachments!"}));
    }
});

users.get('/user-commissions/:id', function(req, res, next) {
    let query = 'SELECT *,(select u.fullname from users u where u.ID = c.userID) as user,(select s.title from commissions s where s.ID = c.commissionID) as commission,' +
        '(select t.title from targets t where t.ID = c.targetID) as target,(select p.name from sub_periods p where p.ID = c.sub_periodID) as period from user_commissions c where c.status = 1 and c.userID = ? order by c.ID desc';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User commissions fetched successfully", "response": results});
        }
    });
});

users.post('/user-commissions', function(req, res, next) {
    req.body.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM user_commissions WHERE userID=? AND type=? AND sub_periodID=? AND status = 1',
        [req.body.userID,req.body.type,req.body.sub_periodID], function (error, result, fields) {
            if (result && result[0]) {
                res.send({"status": 500, "error": "The "+req.body.type+" commission for the same period has already been assigned to this user"});
            } else {
                db.query('SELECT * FROM users WHERE ID=?', [req.body.userID], function (error, user, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        if (user[0]['loan_officer_status'] !== 1)
                            return res.send({"status": 500, "error": "User must be a loan officer"});
                        db.query('INSERT INTO user_commissions SET ?', req.body, function (error, result, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                let query = 'SELECT *,(select u.fullname from users u where u.ID = c.userID) as user,(select s.title from commissions s where s.ID = c.commissionID) as commission,' +
                                    '(select t.title from targets t where t.ID = c.targetID) as target,(select p.name from sub_periods p where p.ID = c.sub_periodID) as period from user_commissions c where c.status = 1 and c.userID = ? order by c.ID desc';
                                db.query(query, [req.body.userID], function (error, results, fields) {
                                    if(error){
                                        res.send({"status": 500, "error": error, "response": null});
                                    } else {
                                        res.send({"status": 200, "message": "User commission assigned successfully", "response": results});
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
});

users.delete('/user-commissions/:id/:userID', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE user_commissions SET status = 0, date_modified = ? WHERE ID = ?', [date, req.params.id], function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT *,(select u.fullname from users u where u.ID = c.userID) as user,(select s.title from commissions s where s.ID = c.commissionID) as commission,' +
                '(select t.title from targets t where t.ID = c.targetID) as target,(select p.name from sub_periods p where p.ID = c.sub_periodID) as period from user_commissions c where c.status = 1 and c.userID = ? order by c.ID desc';
            db.query(query, [req.params.userID], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "User commission deleted successfully", "response": results});
                }
            });
        }
    });
});

users.get('/commissions-list', function(req, res, next) {
    let type = req.query.type,
        user = req.query.user,
        target = req.query.target,
        sub_period = req.query.sub_period,
        commission = req.query.commission,
        query = 'SELECT c.ID,c.userID,c.commissionID,c.targetID,c.periodID,c.sub_periodID,c.type,c.threshold,c.target_value,c.status,c.date_created,c.date_modified,(SELECT CASE WHEN sum(p.amount) IS NULL THEN 0 ELSE sum(p.AMOUNT) END FROM commission_payments p WHERE c.ID=p.user_commissionID AND p.status=1) AS value,' +
            '(select u.fullname from users u where u.ID = c.userID) as user,(select u.title from targets u where u.ID = c.targetID) as target,m.title as commission,m.rate,m.accelerator,m.accelerator_type,c.accelerator_threshold,p.name as period,p.start,p.end from user_commissions c, commissions m, sub_periods p where c.status = 1 and c.commissionID = m.ID and p.ID = c.sub_periodID';
    if (user)
        query = query.concat(' AND c.userID = "'+user+'"');
    if (type)
        query = query.concat(' AND c.type = "'+type+'"');
    if (target)
        query = query.concat(' AND c.targetID = '+target);
    if (sub_period)
        query = query.concat(' AND c.sub_periodID = '+sub_period);
    if (commission)
        query = query.concat(' AND c.commissionID = '+commission);
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commissions list fetched successfully", "response": results});
        }
    });
});

users.get('/commissions-list/:officerID', function(req, res, next) {
    let type = req.query.type,
        user = req.query.user,
        id = req.params.officerID,
        target = req.query.target,
        sub_period = req.query.sub_period,
        commission = req.query.commission,
        query = 'SELECT c.ID,c.userID,c.commissionID,c.targetID,c.periodID,c.sub_periodID,c.type,c.threshold,c.target_value,c.status,c.date_created,c.date_modified,(SELECT CASE WHEN sum(p.amount) IS NULL THEN 0 ELSE sum(p.AMOUNT) END FROM commission_payments p WHERE c.ID=p.user_commissionID AND p.status=1) AS value,' +
            '(select u.fullname from users u where u.ID = c.userID) as user,(select u.title from targets u where u.ID = c.targetID) as target,m.title as commission,m.rate,m.accelerator,m.accelerator_type,c.accelerator_threshold,p.name as period,p.start,p.end from user_commissions c, commissions m, sub_periods p where c.status = 1 and c.commissionID = m.ID and p.ID = c.sub_periodID',
        query2 = query.concat(' AND c.userID = '+id+' '),
        query3 = query.concat(' AND (select supervisor from users where users.id = c.userID) =  '+id+' ');
    if (id)
        query = query2;
    if (user)
        query = query.concat(' AND c.userID = "'+user+'"');
    if (type)
        query = query.concat(' AND c.type = "'+type+'"');
    if (target)
        query = query.concat(' AND c.targetID = '+target);
    if (sub_period)
        query = query.concat(' AND c.sub_periodID = '+sub_period);
    if (commission)
        query = query.concat(' AND c.commissionID = '+commission);
    if (id){
        db.query(query, function (error, commissions, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query(query3, function (error, commissions2, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        let results = commissions.concat(commissions2);
                        res.send({"status": 200, "message": "Commissions list fetched successfully", "response": results});
                    }
                });
            }
        });
    } else {
        db.query(query, function (error, results, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                res.send({"status": 200, "message": "Commissions list fetched successfully", "response": results});
            }
        });
    }
});

users.post('/commission/payments', function(req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO commission_payments SET ?', data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commission payment saved successfully!"});
        }
    });
});

users.get('/commission/payment-history/:user_commissionID', function(req, res, next) {
    db.query('SELECT * FROM commission_payments WHERE user_commissionID = '+req.params.user_commissionID, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commission payment fetched successfully!", response: result});
        }
    });
});

users.post('/commission/processes', function(req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO commission_processes SET ?', data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commission process saved successfully!"});
        }
    });
});

users.get('/commission/processes/:user_commissionID', function(req, res, next) {
    db.query('SELECT * FROM commission_processes WHERE status = 1 AND user_commissionID = '+req.params.user_commissionID, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commission process fetched successfully!", response: result});
        }
    });
});

users.get('/application/commission-payment-reversal/:id', function(req, res, next) {
    db.query('UPDATE commission_payments SET status=0 WHERE ID=?', [req.params.id], function (error, history, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Payment reversed successfully!"});
        }
    });
});

users.get('/application/commission-process-reversal/:id', function(req, res, next) {
    db.query('UPDATE commission_processes SET status=0 WHERE ID=?', [req.params.id], function (error, history, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Process reversed successfully!"});
        }
    });
});

users.get('/target-mail', function(req, res) {
    // let data = req.body;
    // if (!data.name || !data.email || !data.company || !data.phone || !data.title || !data.location || !data.description || !data.lead)
    //     return res.send("Required Parameters not sent!");
    // data.date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let mailOptions = {
        from: process.env.TENANT+' Target <noreply@finratus.com>',
        to: 'itaukemeabasi@gmail.com',
        subject: 'Target',
        template: 'target'
    };

    transporter.sendMail(mailOptions, function(error, info){
        console.log(error)
        console.log(info)
        if(error)
            return res.send("Error");
        return res.send("OK");
    });
});

users.get('/banks', function(req, res) {
    res.send(require('../banks.json'));
});

module.exports = users;