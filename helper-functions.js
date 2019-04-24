let functions = {},
    db = require('./db'),
    moment = require('moment'),
    request = require('request'),
    SHA512 = require('js-sha512');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
    try
    {
        json = JSON.parse(jsonpData);
    }
    catch(e)
    {
        const startPos = jsonpData.indexOf('({'),
            endPos = jsonpData.indexOf('})'),
            jsonString = jsonpData.substring(startPos+1, endPos+1);
        json = JSON.parse(jsonString);
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
    return yyyy+'-'+mm+'-'+dd+'T'+hours+':'+minutes+':'+seconds+'+000000';
};

functions.authorizeMandate = function (payload, callback) {
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
            console.log(error)
            console.log('===========================================')
            console.log(body)
            console.log('===========================================')
            console.log(payload)
            console.log('===========================================')
            console.log(headers)
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
                    url: `${payload.host}/client/mandate/get/${payload.id}`
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

module.exports = functions;