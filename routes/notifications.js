const express = require('express');
const axios = require('axios');
const CronJob = require('cron').CronJob;
let token,
    fs = require('fs'),
    db = require('../db'),
    _ = require('lodash'),
    path = require('path'),
    route = express.Router(),
    async = require('async'),
    mac = require('getmac'),
    moment  = require('moment');

var mac_address;
mac.getMac(function(err, macAddress){
    if (err)  throw err
    mac_address = macAddress;
});
// const job = new CronJob('* * * * * *', function(res, req, err) {

route.get('/new-updates', function(req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let user = req.query.bug
    let query_ = 'select id from notification_preferences where userid = '+user+''
    // let query = `select notification_id, category, description, date_created, (select fullname from users where users.id = userid) user from pending_records inner join notifications on notification_id = notifications.id where status = 1 and view_status in (1,2) order by notification_id desc`;
    const endpoint = `/core-service/get?query=${query_}`;
    const url = `${HOST}${endpoint}`;
    axios.get(url)
        .then(function (response) {
            let query;
            if (response.data.length > 0){
                query = 'select notificationid, category, description, unr.date_created, nt.userid, (select fullname from users where users.id = nt.userid) user \n' +
                    'from user_notification_rel unr inner join notifications nt on notificationid = nt.id \n' +
                    'where status = 1 and view_status = 1 and unr.userid = '+user+'\n' +
                    'and nt.userid <> '+user+' \n'+
                    'and category in \n' +
                    '(select category_name from notification_categories nc where nc.id in \n' +
                    '(select np.category from notification_preferences np where status = 1 and np.userid = '+user+'))\n' +
                    'and (select compulsory from notification_categories where category = category_name) = 1\n' +
                    'order by notificationid desc'
            }
            else {
                query = 'select notification_id, category, description, date_created, view_status, (select fullname from users where users.id = userid) user \n'+
                'from pending_records inner join notifications on notification_id = notifications.id \n'+
                'where status = 1 and userid <> '+user+' and view_status in (1,2) order by notification_id desc';
            }
            const api = `/core-service/get?query=${query}`;
            const uri = `${HOST}${api}`;
            axios.get(uri)
                .then(function (response) {
                    // if (response.data)
                    res.send(response.data);
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
});

route.get('/application-updates', function(req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let user = req.query.bug
    let role = req.query.bugger
    let query_ = 'select id from notification_preferences where userid = '+user+''
    // let query = `select notification_id, category, description, date_created, (select fullname from users where users.id = userid) user from pending_records inner join notifications on notification_id = notifications.id where status = 1 and view_status in (1,2) order by notification_id desc`;
    const endpoint = `/core-service/get?query=${query_}`;
    const url = `${HOST}${endpoint}`;
    axios.get(url)
        .then(function (response) {
            let query, word = 'Applications'
            if (response.data.length > 0){
                query = 'select notificationid, category, \n' +
                    'created_application, \n' +
                    '(select GROUP_CONCAT(distinct(approverid)) as approvers from workflow_stages where workflowid = (select workflowid from applications where id = created_application) group by workflowid) approvers,\n' +
                    'description, unr.date_created, nt.userid, (select fullname from users where users.id = nt.userid) user \n' +
                    'from user_notification_rel unr inner join notifications nt on notificationid = nt.id \n' +
                    'where status = 1 and view_status = 1 and unr.userid = '+user+'\n' +
                    'and nt.userid <> '+user+' \n'+
                    'and nt.category = ? and \n' +
                    '(select np.status from notification_preferences np where np.category = \n' +
                    '\t(select nc.id from notification_categories nc where nc.category_name = ?) \n' +
                    'and np.userid = '+user+' and np.date_created = (select max(npf.date_created) from notification_preferences npf where npf.userid = '+user+')) = 1 \n' +
                    'and (select compulsory from notification_categories where category_name = ?) = 1\n' +
                    'order by notificationid desc'
            }
            else {
                query = 'select notification_id, category, description, date_created, view_status, (select fullname from users where users.id = userid) user \n'+
                    'from pending_records inner join notifications on notification_id = notifications.id \n'+
                    'where status = 1 and userid <> '+user+' and category = '+word+' and view_status in (1,2) order by notification_id desc';
            }
            const api = `/core-service/post?query=${query}`;
            const uri = `${HOST}${api}`;
            axios.post(uri, [word, word, word])
                .then(function (response) {
                    let data = {}
                    for (let i = 0; i < response.data.length; i++){
                        let dets = response.data[i]
                        if (Array.from(new Set(dets.approvers.split(','))).includes(role)){
                            data[i] = response.data[i]
                        }
                    }
                    res.send(data);
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
});

route.get('/all-updates', function(req, res){
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
                res.send({"status": 500, "error": error, "response": null});
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

    // axios.get(url)
    //     .then(function (response) {
    //         let query;
    //         if (response.data.length > 0){
    //             query = 'select *, notificationid as ID, category, description, unr.date_created, nt.userid, (select fullname from users where users.id = nt.userid) user \n' +
    //                 'from user_notification_rel unr inner join notifications nt on notificationid = nt.id \n' +
    //                 'where status = 1 and view_status = 1 and unr.userid = '+user+'\n' +
    //                 'and nt.userid <> '+user+' \n'+
    //                 'and ' +
    //                 // '(category in \n' +
    //                 // '(select category_name from notification_categories nc where nc.id in \n' +
    //                 // '(select np.category from notification_preferences np where status = 1 and np.userid = '+user+'))\n' +
    //                 // 'or category in (select category_name from notification_categories where compulsory = 1))\n' +
    //                 '(select np.status from notification_preferences np where np.category = \n' +
    //                 '\t(select nc.id from notification_categories nc where nc.category_name = category) \n' +
    //                 'and np.userid = '+user+' and timestamp(np.date_created) = ' +
    //                 '(select max(timestamp(npf.date_created)) from notification_preferences npf where npf.userid = '+user+')) = 1 \n' +
    //                 'and category <> ?\n'+
    //                 'order by nt.id desc'
    //         }
    //         else {
    //             query = 'select *, notification_id as ID, category, description, date_created, view_status, (select fullname from users where users.id = userid) user \n'+
    //                 'from pending_records inner join notifications on notification_id = notifications.id \n'+
    //                 'where status = 1 and userid <> '+user+' and category <> ? and view_status in (1,2) order by notifications.id desc';
    //         }
    //         // console.log(query)
    //         const api = `/core-service/post?query=${query}`;
    //         const uri = `${HOST}${api}`;
    //         axios.post(uri, ['Application'])
    //             .then(function (response) {
    //                 load.all = response.data
    //                 let query_ = 'select id from notification_preferences where userid = '+user+''
    //                 // let query = `select notification_id, category, description, date_created, (select fullname from users where users.id = userid) user from pending_records inner join notifications on notification_id = notifications.id where status = 1 and view_status in (1,2) order by notification_id desc`;
    //                 const end = `/core-service/get?query=${query_}`;
    //                 const url2 = `${HOST}${end}`;
    //                 axios.get(url2)
    //                     .then(function (response) {
    //                         let query2;
    //                         if (response.data.length > 0){
    //                             query2 = 'select *, notificationid as ID, category, \n' +
    //                                 '(select GROUP_CONCAT(distinct(approverid)) from workflow_stages where workflowid = (select workflowid from applications where applications.id = affected)) approvers,\n' +
    //                                 'description, unr.date_created, nt.userid, (select fullname from users where users.id = nt.userid) user \n' +
    //                                 'from user_notification_rel unr inner join notifications nt on notificationid = nt.id \n' +
    //                                 'where status = 1 and view_status = 1 and unr.userid = '+user+'\n' +
    //                                 'and nt.userid <> '+user+' \n'+
    //                                 'and nt.category = ? and \n' +
    //                                 '(select np.status from notification_preferences np where np.category = \n' +
    //                                 '\t(select nc.id from notification_categories nc where nc.category_name = ?) \n' +
    //                                 'and np.userid = '+user+' and timestamp(np.date_created) = ' +
    //                                 '(select max(timestamp(npf.date_created)) from notification_preferences npf where npf.userid = '+user+')) = 1 \n' +
    //                                 // 'and (select compulsory from notification_categories where category_name = ?) = 1\n' +
    //                                 'order by nt.id desc'
    //                         }
    //                         else {
    //                             query2 = `select *, notification_id as ID, category, description, date_created, view_status, (select fullname from users where users.id = userid) user, \n`+
    //                                 `(select GROUP_CONCAT(distinct(approverid)) as approvers from workflow_stages where workflowid = (select workflowid from applications where applications.id = affected)) approvers, `+
    //                                 `affected  `+
    //                                 `from pending_records inner join notifications on notification_id = notifications.id \n`+
    //                                 `where status = 1 and userid <> ${user} and category = ? and view_status in (1,2) order by notifications.id desc`;
    //                         }
    //                         const api2 = `/core-service/post?query=${query2}`;
    //                         const uri2 = `${HOST}${api2}`;
    //                         axios.post(uri2, [word, word, word])
    //                             .then(function (response) {
    //                                 for (let i = 0; i < response.data.length; i++){
    //                                     let dets = response.data[i]
    //                                     if (dets.approvers !== null){
    //                                         if (Array.from(new Set(dets.approvers.split(','))).includes(role)){
    //                                             data.push(dets)
    //                                         }
    //                                     }
    //                                 }
    //                                 let results = _.orderBy(load.all.concat(data), ['id'], ['desc']);
    //                                 res.send(results);
    //                             }, err => {
    //                                 res.send({
    //                                     status: 500,
    //                                     error: error,
    //                                     response: null
    //                                 });
    //                             })
    //                             .catch(function (error) {
    //                                 res.send({
    //                                     status: 500,
    //                                     error: error,
    //                                     response: null
    //                                 });
    //                             });
    //                     }, err => {
    //                         res.send({
    //                             status: 500,
    //                             error: error,
    //                             response: null
    //                         });
    //                     })
    //                     .catch(function (error) {
    //                         res.send({
    //                             status: 500,
    //                             error: error,
    //                             response: null
    //                         });
    //                     });
    //                 // res.send(response.data);
    //             }, err => {
    //                 res.send({
    //                     status: 500,
    //                     error: error,
    //                     response: null
    //                 });
    //             })
    //             .catch(function (error) {
    //                 res.send({
    //                     status: 500,
    //                     error: error,
    //                     response: null
    //                 });
    //             });
    //     }, err => {
    //         res.send({
    //             status: 500,
    //             error: error,
    //             response: null
    //         });
    //     })
    //     .catch(function (error) {
    //         res.send({
    //             status: 500,
    //             error: error,
    //             response: null
    //         });
    //     });
});

route.get('/update-pr', function(req, res) {
    let user = req.query.user;
    let id = req.query.notification_id;
    let val = req.query.val;
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query
    // let query = 'update pending_records set view_status = '+val+' where notification_id = '+id+' ';
    query = 'update user_notification_rel set view_status = '+val+' where userid = '+user+ ''
    if (id)
        query = 'update user_notification_rel set view_status = '+val+' where notificationid = '+id+' and userid = '+user+ '';
    const endpoint = `/core-service/get?query=${query}`;
    const url = `${HOST}${endpoint}`;
    axios.get(url)
        .then(function (response) {
            // console.log(response)
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        })
        .catch(function (error) {
            // console.log(error)
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

route.get('/categories', function(req, res, next) {
    let id = req.query.bug,
        query1,
        role = req.query.role;
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = 'select id from notification_preferences where userid = '+id+''
    const endpoint = `/core-service/get?query=${query}`;
    const url = `${HOST}${endpoint}`;
    axios.get(url)
        .then(function (response) {
            if (response.data.length > 0){
                // query1 = 'select category, category_name, compulsory, np.status as state from notification_categories nc inner join notification_preferences np on \n'+
                // 'nc.id = np.category where np.userid = '+id+' and timestamp(np.date_created) = (select max(timestamp(date_created)) from notification_preferences where userid = '+id+')'
                query1 = 'select id as category, category_name, compulsory, \n' +
                    '(select case when \n' +
                    '((select np.status from notification_preferences np \n' +
                    'where nc.id = np.category and np.userid = '+id+' and np.date_created = \n' +
                    '(select date_created from notification_preferences npf where npf.id = (select max(id) from notification_preferences npp where npp.category = nc.id)))) \n' +
                    'is null then 0\n' +
                    'else \n' +
                    '(select np.status from notification_preferences np \n' +
                    'where nc.id = np.category and np.userid = '+id+' and np.date_created = \n' +
                    '(select date_created from notification_preferences npf where npf.id = (select max(id) from notification_preferences npp where npp.category = nc.id))) \n' +
                    'ENd) as state,\n' +
                    '(select visible from notification_roles_rel nr where nr.role_id = '+role+' and nr.category = nc.id \n' +
                    'and nr.date_created = (select date_created from notification_roles_rel nrr where nrr.id = \n' +
                    '(select max(id) from notification_roles_rel ntr where ntr.category = nc.id))) as visible,\n' +
                    '(select mandatory from notification_roles_rel nr where nr.role_id = '+role+' and nr.category = nc.id \n' +
                    'and nr.date_created = (select date_created from notification_roles_rel nrr where nrr.id = \n' +
                    '(select max(id) from notification_roles_rel ntr where ntr.category = nc.id))) as mandatory\n' +
                    'from notification_categories nc'
            } else {
                query1 = 'SELECT id as category, category_name, compulsory from notification_categories';
            }
            const api = `/core-service/get?query=${query1}`;
            const uri = `${HOST}${api}`;
            axios.get(uri)
                .then(function (response) {
                    // if (response.data)
                    res.send(response.data);
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
            // console.log(err)
            res.send({
                status: 500,
                error: error,
                response: null
            });
        })
        .catch(function (error) {
            // console.log(error)
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

route.get('/categories-list', function(req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = 'select * from notification_categories order by id asc'
    const endpoint = `/core-service/get?query=${query}`;
    const url = `${HOST}${endpoint}`;
    axios.get(url)
        .then(function (response) {
            res.send(response.data)
        }, err => {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        })
        .catch(function (error) {
            // console.log(error)
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

route.get('/notification-roles-config', function(req, res, next) {
    let category = req.query.bugger;
    const HOST = `${req.protocol}://${req.get('host')}`;
    let query = 'select * from notification_roles_rel where category = '+category+'';
    const endpoint = `/core-service/get?query=${query}`;
    const url = `${HOST}${endpoint}`;
    axios.get(url)
        .then(function (response) {
            let query1;
            if (response.data.length > 0){
                query1 = 'select *, (select role_name from user_roles ur where ur.id = role_id) role_name ' +
                    'from notification_roles_rel where category = '+category+' ' +
                    'and date_created = (select nrr.date_created from notification_roles_rel nrr where nrr.id = (select max(id) from notification_roles_rel nr where nr.category = '+category+'))'
            } else {
                query1 = 'select id as role_id, role_name from user_roles where status = 1';
            }
            const api = `/core-service/get?query=${query1}`;
            const uri = `${HOST}${api}`;
            axios.get(uri)
                .then(function (response) {
                    // if (response.data)
                    res.send(response.data);
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
            // console.log(error)
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

route.post('/new-category', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO notification_categories Set ?',
        query2 = 'select * from notification_categories where category_name = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.role, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Category already exists!"}));
        db.query(query,{"category_name":postData.cat, "compulsory": postData.compulsory, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New Category Added!"}));
            }
        });
    });
});

route.post('/del-category/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update notification_categories SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Category Disabled!"}));
        }
    });
});

route.post('/en-category/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update notification_categories SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Category Re-enabled!"}));
        }
    });
});

route.post('/savePreferences/:user', function(req, res, next) {
    let ids = req.body,
        userid = ids.userid,
        count = 0,
        status = true;
    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(ids.cats, function (id, callback) {
            let category = id[0],
                status = id[1],
                query = 'INSERT INTO notification_preferences SET ?';
            connection.query(query, {userid:userid, category:category, status:status, date_created:moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')}, function (error, results, fields) {
                if(error){
                    console.log(error)
                    status = false;
                    callback({"status": 500, "error": error, "response": null});
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            connection.release();
            if(status === false)
                return res.send(data);
            res.send({"status": 200, "error": null, "message": "User Preferences Set!"});
        })
    });
});

route.post('/saveConfig/:user', function(req, res, next) {
    let ids = req.body,
        category = ids.category,
        count = 0,
        status = true;
    // db.getConnection(function(err, connection) {
    //     if (err) throw err;
    //
    //     async.forEach(ids.cats, function (id, callback) {
    //         let role_id = id[0],
    //             state = id[1],
    //             query = 'INSERT INTO notification_roles_rel SET ?';
    //         connection.query(query, {role_id:role_id, category:category, state:state, date_created:moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')}, function (error, results, fields) {
    //             if(error){
    //                 status = false;
    //                 callback({"status": 500, "error": error, "response": null});
    //             } else {
    //                 count++;
    //             }
    //             callback();
    //         });
    //     }, function (data) {
    //         connection.release();
    //         if(status === false)
    //             return res.send(data);
    //         res.send({"status": 200, "error": null, "message": "Category Configuration Set!"});
    //     })
    // });
    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(ids.cats, function (id, callback) {
            let role_id = id[0],
                visible = id[1],
                state = id[2],
                query = 'INSERT INTO notification_roles_rel SET ?';
            connection.query(query, {role_id:role_id, category:category, mandatory:state, visible:visible, date_created:moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')}, function (error, results, fields) {
                if(error){
                    status = false;
                    callback({"status": 500, "error": error, "response": null});
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            connection.release();
            if(status === false)
                return res.send(data);
            res.send({"status": 200, "error": null, "message": "Category Configuration Set!"});
        })
    });
});

route.post('/updateCategories/', function(req, res, next) {
    let ids = req.body,
        category = ids.category,
        count = 0,
        status = true;
    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(ids.cats, function (id, callback) {
            let idc = id[0],
                state = id[1],
                // query = 'INSERT INTO notification_roles_rel SET ?';
                query = 'update notification_categories set compulsory = '+state+' where id = '+idc+'';
            connection.query(query, {date_modified:moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')}, function (error, results, fields) {
                if(error){
                    console.log(error)
                    status = false;
                    callback({"status": 500, "error": error, "response": null});
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            connection.release();
            if(status === false)
                return res.send(data);
            res.send({"status": 200, "error": null, "message": "Category Configuration Set!"});
        })
    });
});

route.get('/category-dets/:id', function(req, res, next) {
    let query = 'SELECT * from notification_categories where id = ? order by ID desc ';
    db.query(query, req.params.id, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send(results);
        }
    });
});

// job.start();
module.exports = route;