let functions = {},
    fs = require('fs'),
    db = require('./db'),
    path = require('path'),
    async = require('async'),
    moment = require('moment'),
    request = require('request'),
    jwt = require('jsonwebtoken'),
    SHA512 = require('js-sha512'),
    paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY),
    emailService = require('./routes/service/custom-services/email.service');

functions.getNextWorkflowProcess = function (application_id, workflow_id, stage, callback) {
    db.query('SELECT * FROM workflow_stages WHERE workflowID=? ORDER BY ID asc', [workflow_id], function (error, stages, fields) {
        if (stages) {
            stages.push({ name: "Denied", stageID: 4, stage_name: "Denied", workflowID: workflow_id, approverID: 1 });
            if (application_id && !stage) {
                db.query('SELECT * FROM workflow_processes WHERE ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=? AND status=1)', [application_id], function (error, application_last_process, fields) {
                    if (application_last_process) {
                        let next_stage_index = stages.map(function (e) { return e.stageID; }).indexOf(parseInt(application_last_process[0]['next_stage'])),
                            current_stage_index = stages.map(function (e) { return e.stageID; }).indexOf(parseInt(application_last_process[0]['current_stage']));
                        if (stages[next_stage_index + 1]) {
                            if (application_last_process[0]['next_stage'] !== stages[next_stage_index + 1]['stageID']) {//current stage must not be equal to next stage
                                callback({ previous_stage: application_last_process[0]['current_stage'], current_stage: application_last_process[0]['next_stage'], next_stage: stages[next_stage_index + 1]['stageID'], approver_id: stages[current_stage_index]['approverID'] }, stages[next_stage_index]);
                            } else {
                                if (stages[next_stage_index + 2]) {
                                    callback({ previous_stage: application_last_process[0]['current_stage'], current_stage: application_last_process[0]['next_stage'], next_stage: stages[next_stage_index + 2]['stageID'], approver_id: stages[current_stage_index]['approverID'] }, stages[next_stage_index]);
                                } else {
                                    callback({ previous_stage: application_last_process[0]['current_stage'], current_stage: application_last_process[0]['next_stage'], approver_id: stages[current_stage_index]['approverID'] });
                                }
                            }
                        } else {
                            callback({ previous_stage: application_last_process[0]['current_stage'], current_stage: application_last_process[0]['next_stage'], approver_id: stages[current_stage_index]['approverID'] });
                        }
                    } else {
                        callback({});
                    }
                });
            } else if (application_id && stage) {
                let previous_stage_index = stages.map(function (e) { return e.stageID; }).indexOf(parseInt(stage['previous_stage'])),
                    current_stage_index = stages.map(function (e) { return e.stageID; }).indexOf(parseInt(stage['current_stage'])),
                    next_stage_index = current_stage_index + 1;
                if (stage['next_stage']) {
                    callback({ previous_stage: stage['previous_stage'], current_stage: stage['current_stage'], next_stage: stage['next_stage'], approver_id: stages[previous_stage_index]['approverID'] }, stages[current_stage_index]);
                } else if (stages[next_stage_index]) {
                    if (stage['current_stage'] !== stages[next_stage_index]['stageID']) {
                        callback({ previous_stage: stage['previous_stage'], current_stage: stage['current_stage'], next_stage: stages[next_stage_index]['stageID'], approver_id: stages[previous_stage_index]['approverID'] }, stages[current_stage_index]);
                    } else {
                        if (stages[next_stage_index + 1]) {
                            callback({ previous_stage: stage['previous_stage'], current_stage: stage['current_stage'], next_stage: stages[next_stage_index + 1]['stageID'], approver_id: stages[previous_stage_index]['approverID'] }, stages[current_stage_index]);
                        } else {
                            callback({ previous_stage: stage['previous_stage'], current_stage: stage['current_stage'], approver_id: stages[previous_stage_index]['approverID'] });
                        }
                    }
                } else {
                    callback({ previous_stage: stage['previous_stage'], current_stage: stage['current_stage'], approver_id: stages[previous_stage_index]['approverID'] });
                }
            } else {
                callback({ current_stage: stages[0]['stageID'], next_stage: stages[1]['stageID'] }, stages[0]);
            }
        } else {
            callback({})
        }
    });
};

functions.workflowApprovalNotification = function (process, stage, workflow_id) {
    db.getConnection((err, connection) => {
        if (err) throw err;
        let query = `SELECT * FROM workflows WHERE ID = ${workflow_id}`;
        connection.query(query, (error, worklow) => {
            if (!worklow || !worklow[0] || worklow[0]['admin_email'] === 0)
                return connection.release();
            async.forEach(stage.approverID.split(','), (role_id, callback) => {
                query = `SELECT fullname, email FROM users WHERE user_role = ${role_id}`;
                connection.query(query, (error, users) => {
                    async.forEach(users, (user, callback_user) => {
                        if (!user || !user.email) return callback_user();
                        query = `SELECT c.name, c.fullname FROM clients c, applications a 
                            WHERE c.ID = a.userID AND a.ID = ${process.applicationID}`;
                        connection.query(query, (error, client_) => {
                            let client = 'client';
                            if (client_ && client_[0])
                                client = client_[0]['fullname'] || client_[0]['name'];
                            emailService.send({
                                to: user.email,
                                subject: `Pending ${stage.name} Notification`,
                                template: 'default',
                                context: {
                                    name: user.fullname,
                                    message: `Application for ${client} with Loan ID#: 
                                        ${functions.padWithZeroes(process.applicationID, 9)} 
                                        is pending ${stage.name}!`
                                }
                            });
                            callback_user();
                        });
                    }, data => {
                        callback();
                    });
                });
            }, data => {
                connection.release();
            });
        });
    });
};

functions.formatJSONP = function (body) {
    const jsonpData = body;
    let json;
    try {
        json = JSON.parse(jsonpData);
    } catch (e) {
        const startPos = jsonpData.indexOf('({'),
            endPos = jsonpData.indexOf('})'),
            jsonString = jsonpData.substring(startPos + 1, endPos + 1);
        try {
            json = JSON.parse(jsonString);
        } catch (e) {
            json = {};
        }
    }
    return json;
};

functions.setUpMandate = function (payload, callback) {
    let date = new Date(moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'));
    payload.merchantId = process.env.REMITA_MERCHANT_ID;
    payload.serviceTypeId = process.env.REMITA_SERVICE_TYPE_ID;
    payload.requestId = date.getTime();
    payload.hash = SHA512(payload.merchantId + payload.serviceTypeId + payload.requestId + payload.amount + process.env.REMITA_API_KEY);
    request.post(
        {
            url: `${process.env.REMITA_BASE_URL}/setup`,
            body: payload,
            json: true
        },
        (error, res, body) => {
            if (error) {
                return callback(payload, error);
            }
            callback(payload, functions.formatJSONP(body));
        })
};

functions.mandateStatus = function (payload, callback) {
    payload.merchantId = process.env.REMITA_MERCHANT_ID;
    payload.hash = SHA512(payload.mandateId + payload.merchantId + payload.requestId + process.env.REMITA_API_KEY);
    if (!payload.mandateId || !payload.requestId)
        return callback({});
    request.post(
        {
            url: `${process.env.REMITA_BASE_URL}/status`,
            body: payload,
            json: true
        },
        (error, res, body) => {
            if (error) {
                return callback(error);
            }
            callback(functions.formatJSONP(body));
        })
};

functions.padWithZeroes = function (n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

functions.remitaTimeStampFormat = function (date) {
    let dd = functions.padWithZeroes(date.getDate(), 2),
        mm = functions.padWithZeroes(date.getMonth() + 1, 2),
        yyyy = date.getFullYear(),
        hours = date.getUTCHours(),
        minutes = date.getUTCMinutes(),
        seconds = date.getUTCSeconds();
    return yyyy + '-' + mm + '-' + dd + 'T' + hours + ':' + minutes + ':' + seconds + '+000000';
};

functions.authorizeMandate = function (payload, type, callback) {
    if (type === 'FORM') {
        return callback({
            statuscode: "00",
            status: "SUCCESS",
            requestId: payload.requestId,
            mandateId: payload.mandateId,
            remitaTransRef: "0000000000000"
        });
    }
    let headers = {},
        date = new Date(moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'));
    headers.REQUEST_ID = date.getTime();
    headers.API_KEY = process.env.REMITA_API_KEY;
    headers.MERCHANT_ID = process.env.REMITA_MERCHANT_ID;
    headers.API_DETAILS_HASH = SHA512(headers.API_KEY + headers.REQUEST_ID + process.env.REMITA_API_TOKEN);
    headers.REQUEST_TS = functions.remitaTimeStampFormat(date);
    request.post(
        {
            url: `${process.env.REMITA_BASE_URL}/requestAuthorization`,
            headers: headers,
            body: payload,
            json: true
        },
        (error, res, body) => {
            if (error) {
                return callback(error);
            }
            return callback(functions.formatJSONP(body));
        })
};

functions.validateMandate = function (payload, type, callback) {
    let headers = {},
        date = new Date(moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'));
    headers.REQUEST_ID = date.getTime();
    headers.API_KEY = process.env.REMITA_API_KEY;
    headers.MERCHANT_ID = process.env.REMITA_MERCHANT_ID;
    headers.API_DETAILS_HASH = SHA512(headers.API_KEY + headers.REQUEST_ID + process.env.REMITA_API_TOKEN);
    headers.REQUEST_TS = functions.remitaTimeStampFormat(date);
    switch (type) {
        case 'OTP': {
            delete payload.id;
            delete payload.host;
            request.post(
                {
                    url: `${process.env.REMITA_BASE_URL}/validateAuthorization`,
                    headers: headers,
                    body: payload,
                    json: true
                },
                (error, res, body) => {
                    if (error) {
                        return callback(error);
                    }
                    return callback(functions.formatJSONP(body));
                });
            break;
        }
        case 'FORM': {
            request.get(
                {
                    url: `${payload.host}/preapproved-loan/mandate/get/${payload.id}`
                },
                (error, res, body) => {
                    if (error) {
                        return callback(error);
                    }
                    return callback((JSON.parse(body)).data);
                });
            break;
        }
    }
};

functions.sendDebitInstruction = function (payload, callback) {
    let date = new Date(moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'));
    payload.merchantId = process.env.REMITA_MERCHANT_ID;
    payload.serviceTypeId = process.env.REMITA_SERVICE_TYPE_ID;
    payload.requestId = date.getTime();
    payload.hash = SHA512(payload.merchantId + payload.serviceTypeId + payload.requestId + payload.totalAmount + process.env.REMITA_API_KEY);
    request.post(
        {
            url: `${process.env.REMITA_BASE_URL}/payment/send`,
            body: payload,
            json: true
        },
        (error, res, body) => {
            if (error) {
                return callback(error);
            }
            callback(functions.formatJSONP(body));
        })
};
functions.mandatePaymentHistory = function (payload, callback) {
    payload.merchantId = process.env.REMITA_MERCHANT_ID;
    payload.hash = SHA512(payload.mandateId + payload.merchantId + payload.requestId + process.env.REMITA_API_KEY);
    request.post(
        {
            url: `${process.env.REMITA_BASE_URL}/payment/history`,
            body: payload,
            json: true
        },
        (error, res, body) => {
            if (error) {
                return callback(error);
            }
            callback(functions.formatJSONP(body));
        })
};

functions.debitInstructionStatus = function (payload, callback) {
    payload.merchantId = process.env.REMITA_MERCHANT_ID;
    payload.hash = SHA512(payload.mandateId + payload.merchantId + payload.requestId + process.env.REMITA_API_KEY);
    request.post(
        {
            url: `${process.env.REMITA_BASE_URL}/payment/status`,
            body: payload,
            json: true
        },
        (error, res, body) => {
            if (error) {
                return callback(error);
            }
            callback(functions.formatJSONP(body));
        })
};

functions.cancelDebitInstruction = function (payload, callback) {
    payload.merchantId = process.env.REMITA_MERCHANT_ID;
    payload.hash = SHA512(payload.transactionRef + payload.merchantId + payload.requestId + process.env.REMITA_API_KEY);
    request.post(
        {
            url: `${process.env.REMITA_BASE_URL}/payment/stop`,
            body: payload,
            json: true
        },
        (error, res, body) => {
            if (error) {
                return callback(error);
            }
            callback(functions.formatJSONP(body));
        })
};

functions.stopMandate = function (payload, callback) {
    payload.merchantId = process.env.REMITA_MERCHANT_ID;
    payload.hash = SHA512(payload.mandateId + payload.merchantId + payload.requestId + process.env.REMITA_API_KEY);
    request.post(
        {
            url: `${process.env.REMITA_BASE_URL}/stop`,
            body: payload,
            json: true
        },
        (error, res, body) => {
            if (error) {
                return callback(error);
            }
            callback(functions.formatJSONP(body));
        })
};

functions.numberToCurrencyFormatter = function (value) {
    if (!value)
        return value;
    if (value.constructor === 'String'.constructor)
        value = parseFloat(value);
    return value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
};

functions.currencyToNumberFormatter = function (value) {
    if (!value && isNaN(value))
        return value;
    return Number(value.replace(/[^0-9.-]+/g, ''));
};

functions.verifyJWT = function (req, res, next) {
    let token = req.headers['x-access-token'];
    if (!token) return res.send({
        "status": 500,
        "error": null,
        "response": "No token provided!"
    });

    jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
        if (err) return res.send({
            "status": 500,
            "error": err,
            "response": "Failed to authenticate token!"
        });

        if (req.params.id && parseInt(req.params.id) !== decoded.ID)
            return res.send({
                "status": 500,
                "error": err,
                "response": "Unauthorized operation!"
            });

        req.user = decoded;
        next();
    });
};

functions.removeFileDuplicates = (folder_path, files) => {
    let check = {},
        files_ = [];
    for (let i = 0; i < files.length; i++) {
        let file = files[i],
            file__ = file.split('.')[functions.getClientFilenameIndex(folder_path, file)];
        if (!file__) continue;
        let file_ = file__.split('_');
        file_.shift();
        name = file_.join('_');
        datetime = fs.statSync(path.join(folder_path, file)).ctime;
        if (check.name === name) {
            if ((new Date(datetime) > new Date(check.datetime))) {
                files_[files_.indexOf(check.file)] = file;
                check.name = name;
                check.datetime = datetime;
                check.file = file;
            }
        } else {
            check.name = name;
            check.datetime = datetime;
            check.file = file;
            files_.push(file);
        }
    }
    return files_;
}

functions.getClientFilenameIndex = (folder_path, file) => {
    return (folder_path.indexOf('files/users/') > -1 && file.split('.').length - 1 > 1) ? 1 : 0;
}

functions.getFilesInformation = (folder_path, files) => {
    let check = {};
    for (let i = 0; i < files.length; i++) {
        let file = files[i],
            file__ = file.split('.')[functions.getClientFilenameIndex(folder_path, file)];
        if (!file__) continue;
        let file_ = file__.split('_');
        file_.shift();
        const info = {
            name: file_.join('_'),
            datetime: fs.statSync(path.join(folder_path, file)).ctime,
            file: `${process.env.HOST}/${folder_path}${file}`
        };
        
        check[info.name] = info;
    }
    return check;
}

Number.prototype.round = function (p) {
    p = p || 10;
    return parseFloat(parseFloat(this).toFixed(p));
};

String.prototype.round = function (p) {
    p = p || 10;
    return parseFloat(this).toFixed(p);
};

functions.calculatePaystackFee = value => {
    if (!value) return value;
    if (value.constructor === 'String'.constructor)
        value = parseFloat(value);
    let fee = 0;
    if (value > 126666) {
        fee = 2000;
    } else if (value < 2500) {
        fee = 0.0156 * value;
    } else {
        fee = (0.01523 * value) + 102;
    }
    return Math.ceil(fee > 2000 ? 2000 : fee);
};

functions.resolveBVN = (bvn, callback) => {
    request.get(
        {
            url: `${process.env.PAYSTACK_BASE_URL}/bank/resolve_bvn/${bvn}`,
            headers: {
                'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY2 || process.env.PAYSTACK_SECRET_KEY}`
            }
        },
        (error, res, body) => {
            if (error) return callback(error);
            return callback(JSON.parse(body));
        });
};

functions.resolveAccount = (payload, callback) => {
    request.get(
        {
            url: `${process.env.PAYSTACK_BASE_URL}/bank/resolve?account_number=${payload.account}&bank_code=${payload.bank}`,
            headers: {
                'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
            }
        },
        (error, res, body) => {
            if (error) return callback(error);
            return callback(JSON.parse(body));
        });
};

functions.phoneMatch = (phone1, phone2) => {
    let phone1_ = phone1.toString().trim().toLowerCase();
    let phone2_ = phone2.toString().trim().toLowerCase();
    return phone1_.substr(-10) === phone2_.substr(-10);
};

functions.sendSMS = function (payload, callback) {
    request.post(
        {
            url: `${process.env.EBULKSMS_BASE_URL}/sendsms.json`,
            json: true,
            body: {
                'SMS': {
                    'auth': {
                        'username': process.env.EBULKSMS_USERNAME,
                        'apikey': process.env.EBULKSMS_API_KEY
                    },
                    'message': {
                        'sender': process.env.TENANT,
                        'messagetext': payload.message,
                        'flash': '0'
                    },
                    'recipients':
                    {
                        "gsm": [
                            {
                                "msidn": payload.phone
                            }
                        ]
                    }
                }
            }
        },
        (error, res, body) => {
            if (error) return callback(error);
            return callback(body);
        })
};

functions.formatToNigerianPhone = (phone) => {
    return `234${phone.toString().trim().toLowerCase().substr(-10)}`;
};

functions.chargePaymentMethod = (payload, callback) => {
    const fee = functions.calculatePaystackFee(payload.amount);
    payload.amount = Number(Number(payload.amount) + fee) * 100;
    paystack.transaction.charge(payload)
        .then(body => {
            body.amount = payload.amount;
            body.fee = fee;
            callback(body);
        })
        .catch(error => {
            callback(error);
        });
};

functions.paymentChargeStatus = (reference, callback) => {
    paystack.transaction.verify(reference)
        .then(body => {
            callback(body);
        })
        .catch(error => {
            callback(error);
        });
};

functions.generateOTP = () => Math.floor(100000 + Math.random() * 900000);

functions.getMyXalaryEmployee = (company_id, employee_id) => {
    return new Promise(resolve => {
        request.get(
            {
                url: `${process.env.MYXALARY_BASE_URL}/myx3/employee/get/${company_id}/${employee_id}`,
                headers: {
                    'Authorization': `Bearer ${process.env.MYXALARY_SECRET_KEY}`
                },
                json: true
            },
            (error, res, body) => resolve(body.employee || false))
    });
};

functions.syncMyXalaryClient = (client_id, employee_id, client_payload) => {
    return new Promise((resolve, reject) => {
        request.put(
            {
                url: `${process.env.MYXALARY_BASE_URL}/myx3/client/sync/${client_id}/${employee_id}`,
                headers: {
                    'Authorization': `Bearer ${process.env.MYXALARY_SECRET_KEY}`
                },
                body: client_payload,
                json: true
            },
            (error, res, body) => {
                if (error) reject(error);
                resolve(body);
            })
    });
};

functions.getMyXalaryClient = client_id => {
    return new Promise(resolve => {
        request.get(
            {
                url: `${process.env.MYXALARY_BASE_URL}/myx3/client/get/${client_id}`,
                headers: {
                    'Authorization': `Bearer ${process.env.MYXALARY_SECRET_KEY}`
                },
                json: true
            },
            (error, res, body) => resolve(body.response || false))
    });
};

functions.getMyXalaryEmployeePayslips = employee_id => {
    return new Promise(resolve => {
        request.get(
            {
                url: `${process.env.MYXALARY_BASE_URL}/myx3/employee/payslips/get/${employee_id}`,
                headers: {
                    'Authorization': `Bearer ${process.env.MYXALARY_SECRET_KEY}`
                },
                json: true
            },
            (error, res, body) => resolve(body.response || false))
    });
};

functions.setupMyXalaryEmployeeBankAccount = (employee_id, bankaccount) => {
    return new Promise((resolve, reject) => {
        request.patch(
            {
                url: `${process.env.MYXALARY_BASE_URL}/myx3/employee/bankaccount/setup/${employee_id}`,
                headers: {
                    'Authorization': `Bearer ${process.env.MYXALARY_SECRET_KEY}`
                },
                body: bankaccount,
                json: true
            },
            (error, res, body) => {
                if (error) reject(error);
                resolve(body);
            })
    });
};

functions.getMyXalaryPayroll = payroll_id => {
    return new Promise(resolve => {
        request.get(
            {
                url: `${process.env.MYXALARY_BASE_URL}/myx3/payroll/get/${payroll_id}`,
                headers: {
                    'Authorization': `Bearer ${process.env.MYXALARY_SECRET_KEY}`
                },
                json: true
            },
            (error, res, body) => resolve(body.response || false))
    });
};

functions.getMyXalaryProcessedPayrolls = () => {
    return new Promise(resolve => {
        request.get(
            {
                url: `${process.env.MYXALARY_BASE_URL}/myx3/payroll/processed/get`,
                headers: {
                    'Authorization': `Bearer ${process.env.MYXALARY_SECRET_KEY}`
                },
                json: true
            },
            (error, res, body) => resolve(body.response || false))
    });
};

functions.completeMyXalaryPayrollPayment = (payroll_id, split_id) => {
    return new Promise((resolve, reject) => {
        let url = `${process.env.MYXALARY_BASE_URL}/myx3/payroll/payment/complete/${payroll_id}?`;
        if (split_id) url = url.concat(`splitID=${split_id}`);
        request.get(
            {
                url: url,
                headers: {
                    'Authorization': `Bearer ${process.env.MYXALARY_SECRET_KEY}`
                },
                json: true
            },
            (error, res, body) => {
                if (error) reject(error);
                resolve(body);
            })
    });
};

functions.verifySecretKey = (req, res, next) => {
    try {
        const secret_key = req.header('Authorization').replace('Bearer ', '');
        if (secret_key !== process.env.SECRET_KEY)
            return res.status(400).send({ message: 'Invalid Secret Key' });
        next();
    } catch (error) {
        return res.status(400).send({ message: 'Authentication required' });
    }
}

// functions.getClientDueLoans = client_id => {
//     return new Promise(resolve => {
//         const query = `SELECT * FROM applications WHERE userID = ${client_id} AND status = 2 AND close_status = 0`;
//         db.query()
//     });
// };

functions.getMyXalaryAttendanceDashboard = employee_id => {
    return new Promise(resolve => {
        request.get(
            {
                url: `${process.env.MYXALARY_BASE_URL}/myx3/attendance/dashboard/get/${employee_id}`,
                headers: {
                    'Authorization': `Bearer ${process.env.MYXALARY_SECRET_KEY}`
                },
                json: true
            },
            (error, res, body) => resolve(body.response || false))
    });
};

module.exports = functions;