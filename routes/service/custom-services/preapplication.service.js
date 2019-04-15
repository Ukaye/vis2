const
    fs = require('fs'),
    axios = require('axios'),
    request = require('request'),
    async = require('async'),
    moment = require('moment'),
    express = require('express'),
    router = express.Router(),
    enums = require('../../../enums');

router.post('/create', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let postData = req.body,
        query =  'INSERT INTO preapplications Set ?',
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    postData.status = enums.PREAPPLICATION.STATUS.ACTIVE;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    request.post(
        {
            url: url,
            body: postData
        },
        (error, res, body) => {
            console.log(error);
            console.log(body);
        });
    axios.post(url, postData)
        .then(response => {
            query = `SELECT * from preapplications WHERE ID = (SELECT MAX(ID) from preapplications)`;
            endpoint = `/core-service/get`;
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(response_ => {
                return res.send(response_['data'][0]);
            }, err => {
                res.send({status: 500, error: error, response: null});
            })
            .catch(error => {
                res.send({status: 500, error: error, response: null});
            });
        }, err => {
            res.send({status: 500, error: error, response: null});
        })
        .catch(error => {
            res.send({status: 500, error: error, response: null});
        });
});

router.get('/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT p.*, c.fullname, c.phone FROM preapplications p, clients c 
                 WHERE p.userID = c.ID AND p.status in (1,2) AND (upper(p.name) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
                 OR upper(p.ID) LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM preapplications p 
                 WHERE p.status in (1,2) AND (upper(p.name) LIKE "${search_string}%" OR upper(p.loan_amount) LIKE "${search_string}%" 
                 OR upper(p.ID) LIKE "${search_string}%")) as recordsFiltered FROM preapproved_loans WHERE status in (1,2)`;
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
});

router.get('/get/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`,
        path = `files/preapplication-${req.params.id}/`;
    let query = `SELECT p.*, c.fullname, c.email, c.phone FROM preapplications p 
                INNER JOIN clients c ON p.userID = c.ID WHERE p.ID = ${req.params.id}`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let obj = {},
            result = (response.data === undefined) ? {} : response.data[0];
        if (!fs.existsSync(path)) {
            result.files = {};
            res.send(result);
        } else {
            fs.readdir(path, function (err, files){
                async.forEach(files, function (file, callback){
                    let filename = file.split('.')[0].split('_');
                    filename.shift();
                    obj[filename.join('_')] = path+file;
                    callback();
                }, function(data){
                    result.files = obj;
                    res.send(result);
                });
            });
        }
    });
});

router.post('/approve/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = req.body,
        id = req.params.id,
        query =  `UPDATE preapplications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = enums.PREAPPLICATION.STATUS.APPROVED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    axios.post(url, payload)
        .then(response => {
            res.send(response.data);
        }, err => {
            res.send({status: 500, error: error, response: null});
        })
        .catch(error => {
            res.send({status: 500, error: error, response: null});
        });
});

router.get('/complete/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.id,
        query =  `UPDATE preapplications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = enums.PREAPPLICATION.STATUS.COMPLETED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    axios.post(url, payload)
        .then(function (response) {
            res.send(response.data);
        }, err => {
            res.send({status: 500, error: error, response: null});
        })
        .catch(function (error) {
            res.send({status: 500, error: error, response: null});
        });
});

router.get('/reject/:id', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let payload = {},
        id = req.params.id,
        query =  `UPDATE preapplications Set ? WHERE ID = ${id}`,
        endpoint = `/core-service/post?query=${query}`,
        url = `${HOST}${endpoint}`;
    payload.status = enums.PREAPPLICATION.STATUS.REJECTED;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    axios.post(url, payload)
        .then(function (response) {
            res.send(response.data);
        }, err => {
            res.send({status: 500, error: error, response: null});
        })
        .catch(function (error) {
            res.send({status: 500, error: error, response: null});
        });
});

router.post('/upload/:id/:name', function(req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let	name = req.params.name,
        preapplication_id = req.params.id,
        sampleFile = req.files.file,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1],
        query = `SELECT * FROM preapplications WHERE ID = ${preapplication_id}`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;

    if (!name) return res.status(400).send('No files were uploaded.');
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params || !preapplication_id || !name) return res.status(400).send('No parameters specified!');

    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let preapplication = response.data;
        if (!preapplication || !preapplication[0]) {
            res.send({"status": 500, "error": "Preapplication does not exist", "response": null});
        } else {
            const file_folder = `files/preapplication-${preapplication_id}/`;
            fs.stat(file_folder, function(err) {
                if (err && (err.code === 'ENOENT'))
                    fs.mkdirSync(file_folder);

                const file_url = `${file_folder}${preapplication_id}_${name}.${extension}`;
                fs.stat(file_url, function (err) {
                    if (err) {
                        sampleFile.mv(file_url, function(err) {
                            if (err) return res.status(500).send(err);
                            res.send({file:file_url, data: sampleFile});
                        });
                    } else {
                        fs.unlink(file_url,function(err){
                            if(err){
                                return console.log(err);
                            } else {
                                sampleFile.mv(file_url, function(err) {
                                    if (err)
                                        return res.status(500).send(err);
                                    res.send({file:file_url, data: sampleFile});
                                });
                            }
                        });
                    }
                });
            });
        }
    });
});

module.exports = router;