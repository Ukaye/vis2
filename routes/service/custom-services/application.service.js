const fs = require('fs'),
    async = require('async'),
    axios = require('axios'),
    moment = require('moment'),
    db = require('../../../db'),
    express = require('express'),
    router = express.Router(),
    enums = require('../../../enums'),
    notificationsService = require('../../notifications-service'),
    emailService = require('../../service/custom-services/email.service');

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
                let preapplication = {
                    date_modified: date,
                    status: enums.CLIENT_APPLICATION.STATUS.COMPLETED
                };
                connection.query(`UPDATE preapplications Set ? WHERE ID = ${app[0]['preapplicationID']}`, preapplication, (error) => {
                    if(error) return res.send({
                            "status": 500,
                            "error": error,
                            "response": null
                        });
                    
                    let update = {
                        status: 0,
                        date_modified: date
                    };
                    connection.query(`UPDATE application_schedules SET ? WHERE applicationID = ${req.params.id} AND status = 1`, update, (error) => {
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
                            emailService.send({
                                to: app[0]['email'],
                                subject: 'New Loan Offer',
                                template: 'default',
                                context: {
                                    name: app[0]['fullname'],
                                    message: 'There is a new loan offer available for you!'
                                }
                            });
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