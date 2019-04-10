const express = require('express');
const axios = require('axios');

let token,
    fs = require('fs'),
    db = require('../db'),
    _ = require('lodash'),
    path = require('path'),
    route = express.Router(),
    async = require('async'),
    mac = require('getmac'),
    moment  = require('moment');

let middlewares = {};
middlewares.log = function log(req, payload) {
    let result;
    const HOST = `${req.protocol}://${req.get('host')}`;
    var data = req.body
    // const HOST = 'http://localhost:4000'
    payload.status = 1;
    payload.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    payload.ip_address = req.header('x-forwarded-for') || req.connection.remoteAddress;
    let query = `INSERT INTO notifications SET ?`;
    const endpoint = `/core-service/post?query=${query}`;
    const url = `${HOST}${endpoint}`;
    axios.post(url, payload)
        .then(function (response) {
            result = response.data;
            // res.send(response.data);
            if (result.insertId){
                let query2 = 'insert into pending_records set ?';
                const address = `/core-service/post?query=${query2}`;
                const uri = `${HOST}${address}`;
                const info = {}
                info.notification_id = result.insertId
                info.notification_category = payload.category;
                info.view_status = 1
                axios.post(uri, info)
                    .then(function (response) {
                        let query1 = 'select id from users where status = 1'
                        const apj = `/core-service/get?query=${query1}`;
                        const urj = `${HOST}${apj}`;
                        axios.get(urj)
                            .then(function (response) {
                                let datum = response.data
                                for (let i = 0; i < datum.length; i++){
                                    let dets = {};
                                    let query3 = 'insert into user_notification_rel set ? ';
                                    dets.userid = datum[i]['id'];
                                    if (result.insertId !== null)
                                        dets.notificationid = result.insertId
                                    else
                                        return res.send(JSON.stringify({"status": 500, "error": error, "response": 'Failed to Log Action.'}));
                                    dets.view_status = 1
                                    dets.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                    db.query(query3, dets, function (error, results, fields) {
                                        if(error){
                                            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                                        } else {
                                            // console.log(dets)
                                            // res.send(JSON.stringify({"status": 200, "error": null, "response": "Category Disabled!"}));
                                        }
                                    });
                                }
                                // res.send(response.data);
                            }, err => {
                                res.send({
                                    status: 500,
                                    error: error,
                                    response: null
                                });
                            })
                            .catch(function (error) {
                                res.send({
                                    status: 500,
                                    error: error,
                                    response: null
                                });
                            });
                    }, err => {
                        res.send({
                            status: 500,
                            error: error,
                            response: null
                        });
                    })
                    .catch(function (error) {
                        res.send({
                            status: 500,
                            error: error,
                            response: null
                        });
                    });
            }
        }, err => {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });

};

module.exports = middlewares;