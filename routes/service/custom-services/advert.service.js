const
    fs = require('fs'),
    axios = require('./axios'),
    async = require('async'),
    moment = require('moment'),
    db = require('../../../db'),
    express = require('express'),
    router = express.Router(),
    enums = require('../../../enums'),
    emailService = require('./email.service'),
    helperFunctions = require('../../../helper-functions');

router.post('/create', function (req, res, next) {
    let payload = req.body,
        query =  'INSERT INTO adverts Set ?';
    payload.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, payload, error => {
        if(error) return res.send({
            status: 500,
            error: error,
            response: null
        });

        query = `SELECT * from adverts WHERE ID = (SELECT MAX(ID) from adverts)`;
        db.query(query, (error, advert) => {
            if(error) return res.send({
                status: 500,
                error: error,
                response: null
            });
            res.send({
                status: 200,
                error: null,
                response: advert[0]
            });
        });
    });
});

router.get('/get', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT a.* FROM adverts a 
                 WHERE upper(a.title) LIKE "${search_string}%" ${order} LIMIT ${limit} OFFSET ${offset}`;
    let endpoint = '/core-service/get';
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        query = `SELECT count(*) AS recordsTotal, (SELECT count(*) FROM adverts a WHERE upper(a.title) LIKE "${search_string}%") 
            as recordsFiltered FROM adverts`;
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
    let advert_id = req.params.id,
        path = `files/advert_images/`,
        query = `SELECT p.*, c.fullname, c.email, c.phone FROM adverts p 
                INNER JOIN clients c ON p.userID = c.ID WHERE p.ID = ${advert_id} AND p.creator_type = 'admin'`;
    db.query(query, (error, advert) => {
        if(error) return res.send({
            status: 500,
            error: error,
            response: null
        });
        
        advert = advert[0];
        if(!advert) return res.send({
            status: 500,
            error: "Advert does not exist!",
            response: null
        });

        if (!fs.existsSync(path)) {
            advert.files = {};
            res.send({
                status: 200,
                error: null,
                response: advert
            });
        } else {
            fs.readdir(path, (err, files) => {
                if (err) files = [];
                files = helperFunctions.removeFileDuplicates(path, files);
                const image = (files.filter(file => {
                    return file.indexOf(`${advert_id}_${advert.title.trim().replace(/ /g, '_')}`) > -1;
                }))[0];
                advert.image = `${path}${image}`;
                res.send({
                    "status": 200,
                    "error": null,
                    "response": advert
                });
            });
        }
    });
});

router.get('/activate/:id', (req, res) => {
    let payload = {},
        id = req.params.id,
        query =  `UPDATE adverts Set ? WHERE ID = ${id}`;
    payload.status = enums.ADVERT.STATUS.ACTIVE;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, error => {
        if (error)
            return res.send({status: 500, error: error, response: null});
        return res.send({status: 200, error: null, response: 'Advert activated successfully!'});
    });
});

router.get('/deactivate/:id', (req, res) => {
    let payload = {},
        id = req.params.id,
        query =  `UPDATE adverts Set ? WHERE ID = ${id}`;
    payload.status = enums.ADVERT.STATUS.INACTIVE;
    payload.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.query(query, payload, error => {
        if (error)
            return res.send({status: 500, error: error, response: null});
        return res.send({status: 200, error: null, response: 'Advert deactivated successfully!'});
    });
});

module.exports = router;