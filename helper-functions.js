let functions = {},
    fs = require('fs'),
    db = require('./db'),
    path = require('path'),
    moment = require('moment'),
    request = require('request'),
    SHA512 = require('js-sha512'),
    jwt = require('jsonwebtoken');


functions.getNextWorkflowProcess = function(application_id, workflow_id, stage, callback) {
    db.query('SELECT * FROM workflow_stages WHERE workflowID=? ORDER BY ID asc',[workflow_id], function (error, stages, fields) {
        if(stages){
            stages.push({name:"Denied",stageID:4,stage_name:"Denied",workflowID:workflow_id,approverID:1});
            if(application_id && !stage){
                db.query('SELECT * FROM workflow_processes WHERE ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=? AND status=1)',[application_id], function (error, application_last_process, fields) {
                    if (application_last_process){
                        let next_stage_index = stages.map(function(e) { return e.stageID; }).indexOf(parseInt(application_last_process[0]['next_stage'])),
                            current_stage_index = stages.map(function(e) { return e.stageID; }).indexOf(parseInt(application_last_process[0]['current_stage']));
                        if (stages[next_stage_index+1]){
                            if (application_last_process[0]['next_stage'] !== stages[next_stage_index+1]['stageID']){//current stage must not be equal to next stage
                                callback({previous_stage:application_last_process[0]['current_stage'],current_stage:application_last_process[0]['next_stage'],next_stage:stages[next_stage_index+1]['stageID'], approver_id:stages[current_stage_index]['approverID']});
                            } else {
                                if (stages[next_stage_index+2]){
                                    callback({previous_stage:application_last_process[0]['current_stage'],current_stage:application_last_process[0]['next_stage'],next_stage:stages[next_stage_index+2]['stageID'], approver_id:stages[current_stage_index]['approverID']});
                                } else {
                                    callback({previous_stage:application_last_process[0]['current_stage'],current_stage:application_last_process[0]['next_stage'], approver_id:stages[current_stage_index]['approverID']});
                                }
                            }
                        } else {
                            callback({previous_stage:application_last_process[0]['current_stage'],current_stage:application_last_process[0]['next_stage'], approver_id:stages[current_stage_index]['approverID']});
                        }
                    } else {
                        callback({});
                    }
                });
            } else if(application_id && stage){
                let previous_stage_index = stages.map(function(e) { return e.stageID; }).indexOf(parseInt(stage['previous_stage'])),
                    current_stage_index = stages.map(function(e) { return e.stageID; }).indexOf(parseInt(stage['current_stage'])),
                    next_stage_index = current_stage_index+1;
                if (stage['next_stage']){
                    callback({previous_stage:stage['previous_stage'],current_stage:stage['current_stage'],next_stage:stage['next_stage'], approver_id:stages[previous_stage_index]['approverID']});
                }else if (stages[next_stage_index]){
                    if (stage['current_stage'] !== stages[next_stage_index]['stageID']){
                        callback({previous_stage:stage['previous_stage'],current_stage:stage['current_stage'],next_stage:stages[next_stage_index]['stageID'], approver_id:stages[previous_stage_index]['approverID']});
                    } else {
                        if (stages[next_stage_index+1]){
                            callback({previous_stage:stage['previous_stage'],current_stage:stage['current_stage'],next_stage:stages[next_stage_index+1]['stageID'], approver_id:stages[previous_stage_index]['approverID']});
                        } else {
                            callback({previous_stage:stage['previous_stage'],current_stage:stage['current_stage'], approver_id:stages[previous_stage_index]['approverID']});
                        }
                    }
                } else {
                    callback({previous_stage:stage['previous_stage'],current_stage:stage['current_stage'], approver_id:stages[previous_stage_index]['approverID']});
                }
            } else {
                callback({current_stage:stages[0]['stageID'],next_stage:stages[1]['stageID']});
            }
        } else {
            callback({})
        }
    });
};

functions.formatJSONP = function (body) {
    const jsonpData = body;
    let json;
    try {
        json = JSON.parse(jsonpData);
    } catch(e) {
        const startPos = jsonpData.indexOf('({'),
            endPos = jsonpData.indexOf('})'),
            jsonString = jsonpData.substring(startPos+1, endPos+1);
        try {
            json = JSON.parse(jsonString);
        } catch(e) {
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
    console.log(payload)
    console.log(process.env)
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
    return yyyy+'-'+mm+'-'+dd+'T'+hours+':'+minutes+':'+seconds+'+000000';
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

    jwt.verify(token, process.env.SECRET_KEY, function(err, decoded) {
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
        req.HOST = `${req.protocol}://${req.get('host')}`;
        next();
    });
};

functions.removeFileDuplicates = (folder_path, files) => {
    let check = {},
        files_ = [];
    for (let i=0; i<files.length; i++) {
        let file = files[i],
            file_ = file.split('.')[0].split('_');
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

module.exports = functions;