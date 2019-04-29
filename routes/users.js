const express = require('express');
let token,
    fs = require('fs'),
    db = require('../db'),
    _ = require('lodash'),
    path = require('path'),
    users = express.Router(),
    async = require('async'),
    moment  = require('moment'),
    bcrypt = require('bcryptjs'),
    jwt = require('jsonwebtoken'),
    nodemailer = require('nodemailer'),
    helperFunctions = require('../helper-functions'),
    notificationsService = require('./notifications-service'),
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
    let postData = req.body,
        query =  'INSERT INTO clients Set ?',
        query2 = 'select * from clients where username = ? or email = ? or phone = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.getConnection(function(err, connection) {
        if (err) throw err;
        connection.query(query2,[req.body.username, req.body.email, req.body.phone], function (error, results, fields) {
            if (results && results[0]){
                return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Information in use by existing client!"}));
            }
            connection.query(query,postData, function (error, re, fields) {
                if(error){
                    res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                } else {
                    connection.query('SELECT * from clients where ID = LAST_INSERT_ID()', function(err, re, fields) {
                        connection.release();
                        if (!err){
                            let payload = {}
                            payload.category = 'Clients'
                            payload.userid = req.cookies.timeout
                            payload.description = 'New Client Created'
                            payload.affected = re[0]['ID']
                            notificationsService.log(req, payload)
                            res.send(JSON.stringify({"status": 200, "error": null, "response": re}));
                        }
                        else{
                            res.send(JSON.stringify({"response": "Error retrieving client details. Please try a new username!"}));
                        }
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
        extension = extArray[extArray.length - 1],
        fileName = name+'.'+extension;

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
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params) return res.status(400).send('No Number Plate specified!');
    let sampleFile = req.files.file,
        name = sampleFile.name,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1],
        fileName = name+'.'+extension;
    fs.stat('files/users/'+req.params.id+'/', function(err) {
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
        query = 'SELECT count(*) count, sum(a.loan_amount) total FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer = ? AND status = 1) AS c,' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE a.userID = c.client_id AND a.status = 2',
        query2 = 'SELECT *, a.loan_amount amount, a.disbursement_channel channel, a.disbursement_date date, (SELECT cls.fullname FROM clients cls WHERE cls.ID = a.userID AND cls.status = 1) AS client FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer = ? AND status = 1) AS c,' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE a.userID = c.client_id AND a.status = 2';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
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
        query = 'SELECT count(*) count, sum(s.interest_amount) total FROM schedule_history AS s, (SELECT ID application_id FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer = ? AND status = 1) AS c ' +
            'WHERE a.userID = c.client_id AND a.status = 2) AS apps,(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE s.applicationID = apps.application_id AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT *, s.interest_amount amount, s.payment_source channel, s.payment_date date, (SELECT userID FROM applications WHERE ID = s.applicationID) AS userID, (SELECT fullname FROM clients where ID = userID) AS client ' +
            'FROM schedule_history AS s, (SELECT ID application_id, duration FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer = ? AND status = 1) AS c ' +
            'WHERE a.userID = c.client_id AND a.status = 2) AS apps,(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE s.applicationID = apps.application_id AND s.status = 1 AND s.interest_amount > 0';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
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

users.get('/committals/user/disbursement/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(a.loan_amount) total FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer = ? AND status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2',
        query2 = 'SELECT *, a.loan_amount amount, a.disbursement_channel channel, a.disbursement_date date, (SELECT cls.fullname FROM clients cls WHERE cls.ID = a.userID AND cls.status = 1) AS client FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer = ? AND status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
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
        query = 'SELECT count(*) count, sum(s.interest_amount) total FROM schedule_history AS s, (SELECT ID application_id FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer = ? AND status = 1) AS c ' +
        'WHERE a.userID = c.client_id AND a.status = 2) AS apps WHERE s.applicationID = apps.application_id AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT *, s.interest_amount amount, s.payment_source channel, s.payment_date date, (SELECT userID FROM applications WHERE ID = s.applicationID) AS userID, (SELECT fullname FROM clients where ID = userID) AS client ' +
            'FROM schedule_history AS s, (SELECT ID application_id, duration FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer = ? AND status = 1) AS c ' +
            'WHERE a.userID = c.client_id AND a.status = 2) AS apps WHERE s.applicationID = apps.application_id AND s.status = 1 AND s.interest_amount > 0';
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
        query = 'SELECT count(*) count, sum(a.loan_amount) total FROM applications AS a, (SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = ? AND status = 1) AS t ' +
        'WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2',
        query2 = 'SELECT *, a.loan_amount amount, a.disbursement_channel channel, a.disbursement_date date, (SELECT cls.fullname FROM clients cls WHERE cls.ID = a.userID AND cls.status = 1) AS client FROM applications AS a, (SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = ? AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c ' +
            'WHERE a.userID = c.client_id AND a.status = 2';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
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
        query = 'SELECT count(*) count, sum(s.interest_amount) total FROM schedule_history AS s, (SELECT ID application_id FROM applications AS a, (SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = ? AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps ' +
        'WHERE s.applicationID = apps.application_id AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT *, s.interest_amount amount, s.payment_source channel, s.payment_date date, (SELECT userID FROM applications WHERE ID = s.applicationID) AS userID, (SELECT fullname FROM clients where ID = userID) AS client ' +
            'FROM schedule_history AS s, (SELECT ID application_id, duration FROM applications AS a, (SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = ? AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps ' +
            'WHERE s.applicationID = apps.application_id AND s.status = 1 AND s.interest_amount > 0';
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
        query = 'SELECT *, cast(a.loan_amount as unsigned) amount, a.disbursement_channel channel, a.disbursement_date date, (SELECT cls.fullname FROM clients cls WHERE cls.ID = a.userID AND cls.status = 1) AS client ' +
            'FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "user" AND t.targetID = ?) AND status = 1) AS c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE a.userID = c.client_id AND a.status = 2',
        query2 = 'SELECT *, cast(a.loan_amount as unsigned) amount, a.disbursement_channel channel, a.disbursement_date date, (SELECT cls.fullname FROM clients cls WHERE cls.ID = a.userID AND cls.status = 1) AS client FROM applications AS a, ' +
            '(SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE status = 1 AND teamID in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "team" AND t.targetID = ?)) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE a.userID = c.client_id AND a.status = 2';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(a.disbursement_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
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
        query = 'SELECT *, cast(s.interest_amount as unsigned) amount, s.payment_source channel, s.payment_date date, (SELECT userID FROM applications WHERE ID = s.applicationID) AS userID, (SELECT fullname FROM clients where ID = userID) AS client ' +
            'FROM schedule_history AS s, (SELECT ID application_id, duration FROM applications AS a, ' +
            '(SELECT ID client_id FROM clients WHERE loan_officer in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "user" AND t.targetID = ?) AND status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE s.applicationID = apps.application_id AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT *, cast(s.interest_amount as unsigned) amount, s.payment_source channel, s.payment_date date, (SELECT userID FROM applications WHERE ID = s.applicationID) AS userID, (SELECT fullname FROM clients where ID = userID) AS client ' +
            'FROM schedule_history AS s, (SELECT ID application_id, duration FROM applications AS a, ' +
            '(SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE status = 1 AND teamID in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "team" AND t.targetID = ?)) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE s.applicationID = apps.application_id AND s.status = 1 AND s.interest_amount > 0';
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
    let query = 'SELECT * from clients where status = 1 order by fullname asc';
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
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.username, postData.fullname, postData.phone, postData.address, postData.email,
    postData.gender, postData.dob, postData.marital_status, postData.loan_officer, postData.branch, postData.bank, postData.account , postData.client_state, postData.postcode, postData.client_country,
    postData.years_add, postData.ownership , postData.employer_name ,postData.industry ,postData.job, postData.salary, postData.job_country , postData.off_address, postData.off_state,
    postData.doe, postData.guarantor_name, postData.guarantor_occupation, postData.relationship, postData.years_known, postData.guarantor_phone, postData.guarantor_email,
    postData.guarantor_address, postData.gua_country, postData.date_modified, req.params.id];
    let query = 'Update clients SET username = ?, fullname=?, phone=?, address = ?, email=?, gender=?, dob = ?, marital_status=?, loan_officer=?, branch=?, bank=?, account=?, ' +
                'client_state=?, postcode=?, client_country=?, years_add=?, ownership=?, employer_name=?, industry=?, job=?, salary=?, job_country=?, off_address=?, off_state=?, ' +
                'doe=?, guarantor_name=?, guarantor_occupation=?, relationship=?, years_known=?, guarantor_phone=?, guarantor_email=?, guarantor_address=?, gua_country=?, ' +
                'date_modified = ? where ID=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            console.log('error'); console.log(error)
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
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update clients SET status = 0, date_modified = ? where ID=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Client Disabled!"}));
        }
    });
});

// Enable Client
users.post('/en-client/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update clients SET status = 1, date_modified = ? where ID=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Client Reactivated!"}));
        }
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
                from: 'no-reply Finratus <applications@loan35.com>',
                to: req.body.email,
                subject: 'Finratus Application Successful',
                template: 'main',
                context: data
            };
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
    if (!data.name || !data.email || !data.company || !data.phone || !data.title || !data.location || !data.description || !data.lead)
        return res.send("Required Parameters not sent!");
    data.date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let mailOptions = {
        from: 'ATB Cisco <applications@loan35.com>',
        to: 'abiodun@atbtechsoft.com',
        subject: 'ATB Cisco Application: '+data.name,
        template: 'mail',
        context: data
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error)
            return res.send("Error");
        return res.send("OK");
    });
});

/* GET User Applications. */
users.get('/applications', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        type = req.query.type;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");

    let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
        'a.workflowID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.loanCirrusID, a.reschedule_amount, w.current_stage,' +
        '(SELECT product FROM preapplications WHERE ID = a.preapplicationID) AS product,' +
        '(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status ' +
        'FROM clients AS u, applications AS a, workflow_processes AS w WHERE u.ID=a.userID AND a.status <> 0 ' +
        'AND w.ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=a.ID AND status=1) ';
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
        query = 'SELECT u.ID AS userID, u.fullname, u.phone, u.email, u.address, cast(u.loan_officer as unsigned) loan_officer, ' +
            'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.workflowID, ' +
            'a.reschedule_amount, a.loanCirrusID, a.loan_amount, a.date_modified, a.comment, a.close_status, ' +
            '(SELECT l.supervisor FROM users l WHERE l.ID = u.loan_officer) AS supervisor, ' +
            '(SELECT sum(amount) FROM escrow WHERE clientID=u.ID AND status=1) AS escrow, ' +
            'r.payerBankCode, r.payerAccount, r.requestId, r.mandateId, r.remitaTransRef ' +
            'FROM clients AS u INNER JOIN applications AS a ON u.ID = a.userID LEFT JOIN remita_mandates r ' +
            'ON (r.applicationID = a.ID AND r.status = 1) WHERE a.ID = ?';
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(query, [application_id], function (error, result, fields) {
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
    });
});

/* GET User Applications. */
users.get('/applications/:officerID', function(req, res, next) {
    let start = req.query.start,
		end = req.query.end,
		type = req.query.type,
        id = req.params.officerID;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");

	let query = "SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, " +
        "a.loan_amount, a.date_modified, a.comment, a.close_status, a.workflowID, a.loanCirrusID, a.reschedule_amount, w.current_stage," +
        '(SELECT product FROM preapplications WHERE ID = a.preapplicationID) AS product,' +
        "(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status " +
        "FROM clients AS u, applications AS a, workflow_processes AS w " +
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
        "s.applicationID, s.status, s.payment_amount, s.payment_collect_date, s.payment_status, 'Principal' AS 'type' FROM application_schedules AS s " +
        "WHERE s.status = 1 AND s.payment_status = 0 AND (select status from applications a where a.ID = s.applicationID) = 2 " +
        "AND (select close_status from applications a where a.ID = s.applicationID) = 0 AND s.payment_amount > 0 ";

    collectionsQueryMiddleware(query, type, range, today, function (response) {
        if (response.status !== 200)
            return res.send(response);
        let query = "SELECT s.ID, (select fullname from clients c where c.ID = (select userID from applications a where a.ID = s.applicationID)) AS client, " +
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
    switch (type){
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
            let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
                'a.workflowID, a.loan_amount, a.date_modified, a.comment, a.loanCirrusID, a.reschedule_amount,' +
                '(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status FROM clients AS u, applications AS a WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
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
            let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
                'a.workflowID, a.loan_amount, a.date_modified, a.comment, a.loanCirrusID, a.reschedule_amount,' +
                '(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status FROM clients AS u, applications AS a WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
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
        'w.agentID, u.fullname AS agent FROM workflow_processes AS w, users AS u WHERE applicationID = ? AND w.agentID = u.ID';
    db.query(query, [req.params.application_id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "All Workflow Process fetched successfully!", "response": results});
        }
    });
});

users.post('/application/comments/:id/:user_id', function(req, res, next) {
    db.query('SELECT * FROM applications WHERE ID = ?', [req.params.id], function (error, application, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query('INSERT INTO application_comments SET ?', [{applicationID:req.params.id,userID:req.params.user_id,text:req.body.text,date_created:moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')}],
                function (error, response, fields) {
                    if(error || !response)
                        res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
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
        }
    });
});

users.get('/application/comments/:id', function(req, res, next) {
    db.query('SELECT c.text, c.date_created, u.fullname FROM application_comments AS c, users AS u WHERE c.applicationID = ? AND c.userID=u.ID ORDER BY c.ID desc', [req.params.id], function (error, comments, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Application comments fetched successfully!", "response": comments});
        }
    })
});

users.post('/application/schedule/:id', function(req, res, next) {
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query('SELECT * FROM application_schedules WHERE applicationID = ? AND status = 1', [req.params.id], function (error, invoices, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                async.forEach(invoices, function (invoice, callback) {
                    connection.query('UPDATE application_schedules SET status=0 WHERE ID = ?', [invoice.ID], function (error, response, fields) {
                        callback();
                    });
                }, function (data) {
                    let count = 0;
                    async.forEach(req.body.schedule, function (obj, callback2) {
                        obj.applicationID = req.params.id;
                        connection.query('INSERT INTO application_schedules SET ?', obj, function (error, response, fields) {
                            if(!error)
                                count++;
                            callback2();
                        });
                    }, function (data) {
                        connection.release();
                        res.send({"status": 200, "message": "Application scheduled with "+count+" invoices successfully!", "response": null});
                    });
                });
            }
        });
    });
});

users.post('/application/approve-schedule/:id', function(req, res, next) {
    db.getConnection(function(err, connection) {
        if (err) throw err;
        let reschedule_amount = req.body.reschedule_amount,
            loan_amount_update = req.body.loan_amount_update,
            date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        connection.query('UPDATE applications SET loan_amount = ?, reschedule_amount = ?, date_modified = ? WHERE ID = ?', [loan_amount_update,reschedule_amount,date_modified,req.params.id], function (error, invoice, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                connection.query('SELECT * FROM application_schedules WHERE applicationID = ? AND status = 1', [req.params.id], function (error, invoices, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        async.forEach(invoices, function (invoice, callback) {
                            connection.query('UPDATE application_schedules SET status=0 WHERE ID = ?', [invoice.ID], function (error, response, fields) {
                                callback();
                            });
                        }, function (data) {
                            connection.query('SELECT * FROM application_schedules WHERE applicationID = ? AND status = 2', [req.params.id], function (error, new_schedule, fields) {
                                if (error) {
                                    res.send({"status": 500, "error": error, "response": null});
                                } else {
                                    let count = 0;
                                    async.forEach(new_schedule, function (obj, callback2) {
                                        connection.query('UPDATE application_schedules SET status=1, date_modified=? WHERE ID = ?', [date_modified,obj.ID], function (error, response, fields) {
                                            if(!error)
                                                count++;
                                            callback2();
                                        });
                                    }, function (data) {
                                        connection.release();
                                        let payload = {}
                                        payload.category = 'Application'
                                        payload.userid = req.cookies.timeout
                                        payload.description = 'Application Schedule Approved for Loan Application'
                                        payload.affected = req.params.id
                                        notificationsService.log(req, payload)
                                        res.send({"status": 200, "message": "Application schedule approved with "+count+" invoices successfully!", "response": null});
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
    let data = req.body;
    data.applicationID = req.params.id;
    data.payment_status = 1;
    data.payment_collect_date = data.interest_collect_date;
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
            // db.query('SELECT MAX(ID) AS ID from application_schedules', function(err, invoice_obj, fields) {
            //     let invoice = {};
            //     invoice.agentID = req.params.agent_id;
            //     invoice.applicationID = req.params.id;
            //     invoice.invoiceID = invoice_obj[0]['ID'];
            //     invoice.interest_amount = data.actual_interest_amount;
            //     invoice.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            //     db.query('INSERT INTO schedule_history SET ?', invoice, function (error, response, fields) {
            //         if(error){
            //             res.send({"status": 500, "error": error, "response": null});
            //         } else {
            //             res.send({"status": 200, "message": "Payment added successfully!"});
            //         }
            //     });
            // });
        }
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
    let data = req.body;
    data.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    data.modifierID = req.params.modifier_id;
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query('UPDATE application_schedules SET ? WHERE ID = '+req.params.id, data, function (error, response, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                connection.query('SELECT * FROM application_schedules WHERE ID = ?',[req.params.id], function (error, invoice_obj, fields) {
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
    db.query('UPDATE application_schedules SET ? WHERE ID = '+req.params.id, {payment_status:2,date_modified:moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')}, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Schedule write off successful!"});
        }
    });
});

users.post('/application/confirm-payment/:id/:application_id/:agent_id', function(req, res, next) {
    let data = req.body,
        postData = Object.assign({},req.body);
    postData.payment_status = 1;
    delete postData.payment_source;
    delete postData.payment_date;
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
            db.query('INSERT INTO schedule_history SET ?', invoice, function (error, response, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'Loan Application Payment Confirmed'
                    payload.affected = req.params.application_id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Invoice Payment confirmed successfully!"});
                }
            });
        }
    });
});

// users.post('/application/escrow', function(req, res, next) {
//     let data = req.body,
//         date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
//     data.date_created = date;
//     db.query('SELECT * FROM escrow WHERE clientID = '+data.clientID, function (error, result, fields) {
//         if(error){
//             res.send({"status": 500, "error": error, "response": null});
//         } else {
//             if (result && result[0]){
//                 db.query('UPDATE escrow SET ? WHERE clientID = '+data.clientID, {amount:((parseFloat(data.amount)+parseFloat(result[0]['amount'])).round(2)),date_modified:date}, function (error, result, fields) {
//                     if(error){
//                         res.send({"status": 500, "error": error, "response": null});
//                     } else {
//                         res.send({"status": 200, "message": "Escrow credited successfully!"});
//                     }
//                 });
//             } else {
//                 db.query('INSERT INTO escrow SET ?', data, function (error, result, fields) {
//                     if(error){
//                         res.send({"status": 500, "error": error, "response": null});
//                     } else {
//                         res.send({"status": 200, "message": "Escrow credited successfully!"});
//                     }
//                 });
//             }
//         }
//     });
// });

users.post('/application/escrow', function(req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO escrow SET ?', data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Escrow saved successfully!"});
        }
    });
});

users.post('/application/escrow/update/:clientID', function(req, res, next) {
    let data = req.body;
    data.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE escrow SET ? WHERE clientID = '+req.params.clientID, data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Escrow updated successfully!"});
        }
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
    let data = req.body;
    data.status = 2;
    data.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE applications SET ? WHERE ID = '+req.params.id, data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let payload = {}
            payload.category = 'Application'
            payload.userid = req.cookies.timeout
            payload.description = 'Loan Disbursed'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send({"status": 200, "message": "Loan disbursed successfully!"});
        }
    });
});

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
    let id;
    db.query('UPDATE schedule_history SET status=0 WHERE ID=?', [req.params.id], function (error, history, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query('select applicationID from schedule_history where ID = ?', [req.params.id], function(error, result, fields){
                if (error){
                    res.send({"status": 500, "error": error, "response": null});
                }
                else {
                    id = result[0]['applicationID']
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

users.get('/application/escrow-payment-reversal/:id', function(req, res, next) {
    db.query('UPDATE escrow SET status=0 WHERE ID=?', [req.params.id], function (error, history, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Payment reversed successfully!"});
        }
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
    let data = req.body;
    data.close_status = 1;
    db.getConnection(function(err, connection) {
        if (err) throw err;

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
                            connection.query('UPDATE application_schedules SET payment_status=1 WHERE ID = ?', [invoice_obj.ID], function (error, result, fields) {
                                connection.query('INSERT INTO schedule_history SET ?', invoice, function (error, response, fields) {
                                    callback();
                                });
                            });
                        }, function (data) {
                            connection.release();
                            let payload = {}
                            payload.category = 'Application'
                            payload.userid = req.cookies.timeout
                            payload.description = 'Loan Application Paid Off'
                            payload.affected = req.params.id
                            notificationsService.log(req, payload)
                            res.send({"status": 200, "message": "Application pay off successful!"});
                        });
                    }
                });
            }
        });
    });
});

users.post('/application/write-off/:id/:agentID', function(req, res, next) {
    let data = req.body;
    data.close_status = 2;
    db.query('UPDATE applications SET ? WHERE ID = '+req.params.id, data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let payload = {}
            payload.category = 'Application'
            payload.userid = req.cookies.timeout
            payload.description = 'Loan Application Written Off'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send({"status": 200, "message": "Application write off successful!"});
        }
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
            subject: 'Finratus: Forgot Password Request',
            template: 'forgot',
            context: user
        };

        transporter.sendMail(mailOptions, function(error, info){
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
    query2 = 'select count(*) as all_applications from applications where status = 2'
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
    queryPart = 'select \n' +
            '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, payment_amount, \n' +
            'applicationID, (select loan_amount from applications where ID = applicationID) as loan_amount, sum(payment_amount) as paid, \n' +
            '((select loan_amount from applications where ID = applicationID) - sum(payment_amount)) as balance, (select disbursement_date from applications where ID = applicationID) as date, \n' +
            '(select date_created from applications ap where ap.ID = applicationID) as created_date, ' +
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
    queryPart2 = 'select \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, payment_amount, \n' +
        'applicationID, (select loan_amount from applications where ID = applicationID) as loan_amount, sum(payment_amount) as paid, \n' +
        '((select loan_amount from applications where ID = applicationID) - sum(payment_amount)) as balance, (select disbursement_date from applications where ID = applicationID) as date, \n' +
        '(select date_created from applications ap where ap.ID = applicationID) as created_date, ' +
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

    let query2 = 'select ID, (select fullname from clients where ID = userID) as fullname, loan_amount, disbursement_date, date_created ' +
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
        // query = (queryPart.concat('AND (TIMESTAMP((select date_modified from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = (queryPart.concat('AND (TIMESTAMP((select disbursement_date from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query3 = (queryPart2.concat('AND (TIMESTAMP((select disbursement_date from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query2 = query2.concat('AND (TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') AND TIMESTAMP('+end+')) ');
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
        'where status = 2\n' +
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

/* Overdue Loans  */
users.get('/overdues/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer;
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select ID, applicationID,\n' +
        'payment_collect_date, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
        '(select loan_amount from applications where applications.ID = applicationID) as principal,\n' +
        'sum(payment_amount) as amount_due, sum(interest_amount) as interest_due\n' +
        'from application_schedules\n' +
        'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n' +
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
        'and datediff(curdate(), payment_collect_date) > 90 ';
    group = 'group by applicationID';
    query = queryPart.concat(group)
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
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
users.get('/loans-by-branches', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select (select branch from clients where ID = userID) as branchID, \n' +
            '(select branch_name from branches br where br.id = branchID) as branch,\n' +
            'loan_amount, sum(loan_amount) as disbursed,\n' +
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
            'loan_amount, sum(loan_amount) as disbursed,\n' +
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
        case 'disbursements':
            //Default
            query = 'select sum(loan_amount) amount_disbursed, (select fullname from users where users.id = (select loan_officer from clients where clients.id = userID)) name\n' +
                'from applications where status = 2\n' +
                'group by name'
            //An Officer
            if (officer){
                query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, \n' +
                    '         SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') agent,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications \n' +
                    // 'WHERE    EXTRACT(YEAR_MONTH FROM Disbursement_date) >= EXTRACT(YEAR_MONTH FROM CURDATE())-102\n' +
                    'WHERE      status =2\n'+
                    'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
                    'GROUP BY agent\n' +
                    'ORDER BY DisburseYearMonth';
                load = [officer]
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%Y\') AS OfficersYear, \n' +
                    'SUM(loan_amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications \n' +
                    'WHERE    status =2\n' +
                    'GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Yearly
            if (officer !== "0" && freq == "3"){
                query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') AS DisburseYear, \n' +
                    '                    SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent, \n' +
                    '                    EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    '    FROM     applications \n' +
                    '    WHERE    status =2\n' +
                    '    AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
                    '    GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')\n' +
                    '    ORDER BY DisburseYearMonth'
            }
            //One Officer, Monthly In One Year
            if (officer !== "0" && freq == "2"){
                query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') AS Year, \n' +
                    'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications \n' +
                    'WHERE    status =2\n' +
                    'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+'\n'+
                    'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
                    'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Monthly
            if (officer !== "0" && freq == "2" && y == '0'){
                query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') AS Year, \n' +
                    'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications \n' +
                    'WHERE    status =2\n' +
                    'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
                    'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Quarterly In One Year
            if (officer !== "0" && freq == "4"){
                query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) quarter,\n' +
                    'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications \n' +
                    'WHERE    status =2\n' +
                    'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+'\n'+
                    'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
                    'GROUP BY quarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Quarterly
            if (officer !== "0" && freq == "4" && y == '0'){
                query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) quarter, \n' +
                    'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications \n' +
                    'WHERE    status =2\n' +
                    'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
                    'GROUP BY quarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Monthly In One Year
            if (officer == "0" && freq == "2"){
                query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS OfficersMonth, \n' +
                    'SUM(loan_amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications \n' +
                    'WHERE    status =2\n' +
                    'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+'\n'+
                    'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Monthly
            if (officer == "0" && freq == "2" && y == "0"){
                query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS Month, DATE_FORMAT(Disbursement_date, \'%Y\') AS AYear, \n' +
                    'SUM(loan_amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications \n' +
                    'WHERE    status =2\n' +
                    'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Quarterly In One Year
            if (officer == "0" && freq == "4"){
                query = 'SELECT   concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) OfficersQuarter, \n' +
                    'SUM(loan_amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications \n' +
                    'WHERE    status =2\n' +
                    'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+'\n'+
                    'GROUP BY OfficersQuarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Quarterly
            if (officer == "0" && freq == "4" && y == "0"){
                query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS Month, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) AQuarter, \n' +
                    'SUM(loan_amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications \n' +
                    'WHERE    status =2\n' +
                    'GROUP BY AQuarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            break;
        case 'branches':
            //Disbursements
            if (bt == '1'){

                query = 'select sum(loan_amount) amount_disbursed, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch\n' +
                    'from applications \n' +
                    'where status = 2\n' +
                    'group by branch'
                //Specific Branch
                if (b){
                    query = 'select sum(loan_amount) amount_disbursed, \n' +
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch\n' +
                        'from applications \n' +
                        'where status = 2\n' +
                        'and (select branch from clients where clients.id = userid) = '+b+'\n'+
                        'group by branch'
                }
                //Specific Branch, Monthly in a year
                if (b != '0' && freq == "2"){
                    query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
                        '         SUM(loan_amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                        'FROM     applications\n' +
                        'WHERE  status = 2\n' +
                        'AND   (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
                        'AND   DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+'\n' +
                        'GROUP BY DisburseMonth, office\n' +
                        'ORDER BY Disbursement_date'
                }
                //All Branches, Monthly in a year
                if (b == '0' && freq == "2"){
                    query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
                        '         SUM(loan_amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                        'FROM     applications\n' +
                        'WHERE  status = 2\n' +
                        'AND   DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+'\n' +
                        'GROUP BY office, DisburseMonth\n' +
                        'ORDER BY office, Disbursement_date'
                }
                //All Branches, Monthly
                if (b == '0' && freq == "2" && y == '0'){
                    query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
                        '         SUM(loan_amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                        'FROM     applications\n' +
                        'WHERE  status = 2\n' +
                        'GROUP BY office, DisburseMonth\n' +
                        'ORDER BY Disbursement_date'
                }
                if (b != '0' && freq == "2" && y == '0'){
                    query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
                        '         SUM(loan_amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                        'FROM     applications\n' +
                        'WHERE  status = 2\n' +
                        'AND   (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
                        'GROUP BY DisburseMonth, office\n' +
                        'ORDER BY Disbursement_date'
                }
                //Specific Branch, Yearly
                if (b != '0' && freq == "3"){
                    query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') year,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(loan_amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                        'FROM     applications\n' +
                        'WHERE  status = 2 and date_format(disbursement_date, \'%Y\') = '+y+'\n' +
                        'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
                        'GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')'
                }
                if (b != '0' && freq == "3" && y == '0'){
                    query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') year,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(loan_amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                        'FROM     applications\n' +
                        'WHERE  status = 2\n' +
                        'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
                        'GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')'
                }
                if (b != '0' && freq == "4"){
                    query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) Quarter,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(loan_amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                        'FROM     applications\n' +
                        'WHERE  status = 2\n' +
                        'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
                        'GROUP BY Quarter order by DisburseYearMonth'
                }
                if (b != '0' && freq == "4" && y != '0'){
                    query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) Quarter,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(loan_amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                        'FROM     applications\n' +
                        'WHERE  status = 2\n' +
                        'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
                        'and date_format(Disbursement_date, \'%Y\') = '+y+'\n'+
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
                query = 'select ID, applicationID, \n' +
                    'min(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(select loan_amount from applications where applications.ID = applicationID) as principal,\n' +
                    '(sum(payment_amount) - payment_amount) as amount_due, (sum(interest_amount) - interest_amount) as interest_due\n' +
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) group by applicationid\n';
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
                    'group by OfficerQuarter'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) OfficerQuarter\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by OfficerQuarter'
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
                    'group by Quarter'
            }
            //All Officers, Quarterly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by Quarter'
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
                    'group by OfficerQuarter order by date_format(interest_collect_date, \'%Y%M\')'
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
                    'group by OfficerQuarter order by date_format(interest_collect_date, \'%Y%M\')'
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
                    'group by Quarter order by date_format(interest_collect_date, \'%Y%M\')'
            }
            //All Officers, Quarterly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) Quarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'group by Quarter order by date_format(interest_collect_date, \'%Y%M\')'
            }
            //One Officer, Yearly
            if (officer !== '0' && freq == '3'){
                query = 'select sum(interest_amount) amount_received, DATE_FORMAT(interest_collect_date, \'%Y\') OfficerYear, \n' +
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
        freq = req.query.freq,
        y = req.query.year;
    let query1;
    let query2;
    switch (bt){
        case '1':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%M, %Y\')) periods from applications where status = 2 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
                query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS period, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
                    '         SUM(loan_amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications\n' +
                    'WHERE  status = 2\n' +
                    'and DATE_FORMAT(Disbursement_date, \'%M, %Y\') = ?\n' +
                    'GROUP BY branch, period\n' +
                    'ORDER BY branch, Disbursement_date'
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%M, %Y\')) periods from applications where status = 2 ' +
                    ' and DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
                query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS period, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
                    '         SUM(loan_amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications\n' +
                    'WHERE  status = 2\n' +
                    'and DATE_FORMAT(Disbursement_date, \'%M, %Y\') = ?\n' +
                    'GROUP BY branch, period\n' +
                    'ORDER BY branch, Disbursement_date'
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%Y\')) periods from applications where status = 2 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
                query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') period,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
                    '         SUM(loan_amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications\n' +
                    'WHERE  status = 2\n' +
                    'and DATE_FORMAT(Disbursement_date, \'%Y\') = ?\n' +
                    'GROUP BY branch, DATE_FORMAT(Disbursement_date, \'%Y\') order by branch'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%Y\')) periods from applications where status = 2 ' +
                    ' and DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
                query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') period,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
                    '         SUM(loan_amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications\n' +
                    'WHERE  status = 2\n' +
                    'and DATE_FORMAT(Disbursement_date, \'%Y\') = ?\n' +
                    'GROUP BY branch, DATE_FORMAT(Disbursement_date, \'%Y\') order by branch'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date))) periods from applications where status = 2 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
                query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
                    '         SUM(loan_amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications\n' +
                    'WHERE  status = 2\n' +
                    'and concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) = ?\n' +
                    'GROUP BY branch, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date))) periods from applications where status = 2 ' +
                    ' and DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
                query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
                    '         SUM(loan_amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     applications\n' +
                    'WHERE  status = 2\n' +
                    'and concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) = ?\n' +
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
                'payment_collect_date is not null and applicationid in (select id from applications where status <> 0) order by EXTRACT(YEAR_MONTH from payment_collect_date)'
            query2 = 'select ID, applicationID, \n' +
                'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                '(sum(payment_amount)) as amount_due,\n' +
                '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                'from application_schedules\n' +
                'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                'and date_format(payment_collect_date, \'%M, %Y\') = ? group by office, Date_format(Payment_collect_date, \'%M%Y\')';
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
    let load = {};
    db.query(query1, function (error, results, fields) {
        db.getConnection(function(err, connection) {
            if (err) throw err;
            async.forEachOf(results, function (result, key, callback) {
                connection.query(query2, [result['periods']], function (err, rest) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        load[result['periods']] = rest;
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
            'from activities where for_ = ? and status = 1 ';
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
                extension = extArray[extArray.length - 1],
                fileName = name+'.'+extension;

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
        from: 'Finratus Target <applications@loan35.com>',
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