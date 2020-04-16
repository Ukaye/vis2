const fs = require('fs'),
    async = require('async'),
    axios = require('./axios'),
    moment = require('moment'),
    db = require('../../../db'),
    express = require('express'),
    router = express.Router(),
    enums = require('../../../enums'),
    notificationsService = require('../../notifications-service'),
    emailService = require('../../service/custom-services/email.service'),
    firebaseService = require('../../service/custom-services/firebase.service');

router.get('/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let end = req.query.end;
    let type = req.query.type;
    let draw = req.query.draw;
    let start = req.query.start;
    let order = req.query.order;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let loan_officer = req.query.loan_officer;
    let search_string = req.query.search_string.toUpperCase();
    let query_condition = `FROM clients u, workflow_processes w, applications a LEFT JOIN corporates c ON a.userID = c.ID WHERE u.ID=a.userID 
         AND w.ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=a.ID AND status=1)
        AND (upper(a.ID) LIKE "%${search_string}%" OR upper(u.fullname) LIKE "%${search_string}%" OR upper(u.phone) LIKE "%${search_string}%" 
        OR upper(a.loan_amount) LIKE "%${search_string}%" OR upper(a.date_created) LIKE "%${search_string}%") AND a.status <> ${enums.APPLICATION.STATUS.RESCHEDULE} `;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");

    if (type){
        switch (type){
            case '0': {
                query_condition = query_condition.concat(`AND a.status = ${enums.APPLICATION.STATUS.CANCELLED} `);
                break;
            }
            case '1': {
                //do nothing
                break;
            }
            case '2': {
                query_condition = query_condition.concat(`AND a.status = ${enums.APPLICATION.STATUS.ACTIVE} AND a.close_status = 0 AND w.current_stage <> 2  AND w.current_stage <> 3 `);
                break;
            }
            case '3': {
                query_condition = query_condition.concat(`AND a.status = ${enums.APPLICATION.STATUS.ACTIVE} AND a.close_status = 0 AND w.current_stage = 2 `);
                break;
            }
            case '4': {
                query_condition = query_condition.concat(`AND a.status = ${enums.APPLICATION.STATUS.ACTIVE} AND a.close_status = 0 AND w.current_stage = 3 `);
                break;
            }
            case '5': {
                query_condition = query_condition.concat(`AND a.status = ${enums.APPLICATION.STATUS.DISBURSED}  AND a.close_status = 0 `);
                break;
            }
            case '6': {
                query_condition = query_condition.concat('AND a.close_status <> 0 ');
                break;
            }
        }
    }
    if (start && end)
        query_condition = query_condition.concat(`AND TIMESTAMP(a.date_created) < TIMESTAMP('${end}') AND TIMESTAMP(a.date_created) >= TIMESTAMP('${start}') `);

    let query = `SELECT u.fullname, u.name, a.ID, a.userID, a.status, a.date_created, a.workflowID, a.loan_amount, a.comment, 
        a.close_status, a.loanCirrusID, a.reschedule_amount, w.current_stage, (SELECT product FROM preapplications WHERE ID = a.preapplicationID) product, 
        (SELECT status FROM preapplications WHERE ID = a.preapplicationID AND creator_type = "client") client_applications_status, 
        (CASE WHEN (SELECT COUNT(*) FROM application_information_requests WHERE applicationID = a.ID) > 0 THEN 1 ELSE 0 END) information_request_status, 
        (SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) reschedule_status ${query_condition}`,
        query2 = query.concat(`AND u.loan_officer = ${loan_officer} `),
        query3 = query.concat(`AND (SELECT supervisor FROM users WHERE users.id = u.loan_officer) = ${loan_officer} `);
    if (loan_officer)
        query = query2;
    query = query.concat(`${order} LIMIT ${limit} OFFSET ${offset}`);
    if (loan_officer) {
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response1 => {
            let data1 = (response1.data === undefined) ? [] : response1.data;
            query = `SELECT count(*) recordsTotal, (SELECT count(*) ${query_condition} AND u.loan_officer = ${loan_officer}) recordsFiltered 
                FROM applications WHERE status <> 0`;
            endpoint = '/core-service/get';
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(payload1 => {
                axios.get(url, {
                    params: {
                        query: query3
                    }
                }).then(response2 => {
                    let data2 = (response2.data === undefined) ? [] : response2.data;
                    query3 = `SELECT count(*) recordsTotal, (SELECT count(*) ${query_condition} 
                        AND (SELECT supervisor FROM users WHERE users.id = u.loan_officer) = ${loan_officer}) recordsFiltered 
                        FROM applications WHERE status <> 0`;
                    endpoint = '/core-service/get';
                    url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query3
                        }
                    }).then(payload2 => {
                        res.send({
                            draw: draw,
                            recordsTotal: payload1.data[0].recordsTotal,
                            recordsFiltered: payload1.data[0].recordsFiltered + payload2.data[0].recordsFiltered,
                            data: data1.concat(data2)
                        });
                    });
                });
            });
        });
    } else {
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response => {
            query = `SELECT count(*) recordsTotal, (SELECT count(*) ${query_condition}) recordsFiltered 
                FROM applications WHERE status <> 0`;
            endpoint = '/core-service/get';
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(payload => {
                res.send({
                    draw: draw,
                    recordsTotal: payload.data[0].recordsTotal,
                    recordsFiltered: payload.data[0].recordsFiltered,
                    data: (response.data === undefined) ? [] : response.data
                });
            });
        });
    }
});

router.post('/upload/:id/:name/:folder?', (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let	name = req.params.name,
        folder = req.params.folder,
        application_id = req.params.id,
        sampleFile = req.files.file,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1],
        query = `SELECT * FROM applications WHERE ID = ${application_id}`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    if (extension) extension = extension.toLowerCase();

    if (!name) return res.status(400).send('No files were uploaded.');
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params || !application_id || !name) return res.status(400).send('Required parameter(s) not sent!');

    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let application = response.data;
        if (!application || !application[0]) {
            res.send({"status": 500, "error": "Application does not exist", "response": null});
        } else {
            const file_folder = `files/${folder || `application-${application_id}`}/`;
            fs.stat(file_folder, function(err) {
                if (err && (err.code === 'ENOENT'))
                    fs.mkdirSync(file_folder);

                const file_url = `${file_folder}${application_id}_${name}.${extension}`;
                fs.stat(file_url, function (err) {
                    if (err) {
                        sampleFile.mv(file_url, function(err) {
                            if (err) return res.status(500).send(err);
                            res.send({
                                file:file_url, 
                                data: sampleFile
                            });
                        });
                    } else {
                        fs.unlink(file_url,function(err){
                            if(err){
                                return console.log(err);
                            } else {
                                sampleFile.mv(file_url, function(err) {
                                    if (err)
                                        return res.status(500).send(err);
                                    res.send({
                                        file:file_url, 
                                        data: sampleFile
                                    });
                                });
                            }
                        });
                    }
                });
            });
        }
    });
});

router.post('/loan-offer/:id', (req, res) => {
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(`SELECT a.preapplicationID, c.email, c.fullname FROM applications a, clients c 
        WHERE a.ID = ${req.params.id} AND a.userID = c.ID`, (error, app) => {
            if(error) return res.send({
                    "status": 500,
                    "error": error,
                    "response": null
                });
            if(!app[0]) return res.send({
                "status": 500,
                "error": null,
                "response": 'Application does not exist!'
            });
            let schedule = req.body.schedule,
                application = req.body.application,
                date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            application.date_modified = date;
            connection.query(`UPDATE applications Set ? WHERE ID = ${req.params.id}`, application, (error) => {
                if(error) return res.send({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                const  preapplication = {
                    loan_amount: application.loan_amount,
                    tenor: application.duration,
                    rate: application.interest_rate,
                    repayment_date: application.repayment_date,
                    date_modified: application.date_modified
                };
                connection.query(`UPDATE preapplications Set ? WHERE ID = ${app[0]['preapplicationID']}`, preapplication, (error) => {
                    if(error) return res.send({
                            "status": 500,
                            "error": error,
                            "response": null
                        });
                    
                    connection.query(`DELETE FROM application_schedules WHERE applicationID = ${req.params.id} AND status = 1`, (error) => {
                        if(error) return res.send({
                                "status": 500,
                                "error": error,
                                "response": null
                            });
                    
                        let count = 0;
                        async.forEach(schedule, (obj, callback) => {
                            obj.applicationID = req.params.id;
                            obj.status = 1;
                            obj.date_created = date;
                            connection.query('INSERT INTO application_schedules SET ?', obj, (error) => {
                                if(!error)
                                    count++;
                                callback();
                            });
                        }, function (data) {
                            connection.release();
                            let payload = {};
                            payload.category = 'Application';
                            payload.userid = req.cookies.timeout;
                            payload.description = 'New Schedule Uploaded for Loan Application';
                            payload.affected = req.params.id;
                            notificationsService.log(req, payload);
                            const options = {
                                to: app[0]['email'],
                                subject: 'New Loan Offer',
                                template: 'default',
                                context: {
                                    name: app[0]['fullname'],
                                    message: 'There is a new loan offer available for you!'
                                }
                            }
                            emailService.send(options);
                            firebaseService.send(options);
                            return res.send({
                                "status": 200,
                                "error": null,
                                "response": `Loan offer with ${count} invoice(s) saved successfully!`
                            });
                        });
                    });
                });
            });
        });
    });
});



module.exports = router;