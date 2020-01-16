const express = require('express');
const router = express.Router();
const extract = require('mention-hashtag');
const fs = require('fs');
const axios = require('axios');
const db = require('../../../db');

router.post('/trigger/save', function(req, res, next) {

    //save trigger content to db
    let mailData = req.body,
        query = `INSERT into email_templates SET trigger_name = '${mailData.triggerName}', trigger_subject = '${mailData.triggerSubject}', trigger_content = '${mailData.triggerContent}'`
        db.query(query, function (error, response) {
            if(error) {
                res.send({
                    status: 500,
                    error,
                    response: null
                })
            }

            res.send({
                status: 201,
                error: null,
                response: "Trigger saved successfully"
            })
        })

        next
})

router.post('/trigger/send', function(req, res, next) {

    const mailData = req.body

    let query = `SELECT trigger_subject, trigger_content FROM email_templates WHERE trigger_name = '${mailData.triggerName}'`
        db.query(query, function(error, results) {
            if(error) {
                res.send({
                    status: 500,
                    error,
                    result: null
                })
            }

            let data = results[0]
                sterilizedMsg = data.trigger_content,
                subject = data.trigger_subject,
                mentions = extract(sterilizedMsg, { unique: true, symbol: false});
                recipients = mailData.recipients;
                recipientsArray = (recipients).split(',');
    
                recipientsArray.every((recipient)=> {
            
                    //replace placeholder with live data
                    if(mentions.length > 0) {
                        let i = 0;
                
                        mentions.forEach(element => {
                            let query = `select ${element} from users where email = '${recipient}'`;
                                db.query(query, function(error, results) {
                                    if(error) {
                                        return console.log(error);
                                    } else {
                                        results.map(liveData => {
                                            let regex = new RegExp('@'+element, 'gi');
                                            sterilizedMsg = sterilizedMsg.replace(regex, liveData[element]);
                                        });
                                        i++;
                
                                        if(i === mentions.length) {
                
                                            let msg = {
                                                to: recipient,
                                                from: 'noreply@atbtechsoft.com',
                                                subject,
                                                text: 'hi',
                                                html: sterilizedMsg,
                                                };
                                            
                                                axios({
                                                    method: 'post',
                                                    url: 'http://localhost:5000/api/send',
                                                    data: msg
                                                }).then(function(response) {
                                                    if(response.status === 200) {
                                                        res.json(response.data);
                                                    }
                                                }).catch(function(error) {
                                                    return res.json(JSON.stringify(error));
                                                });
                                        }
                                    }
                                })
                        });
                
                    }
            })
        })

})


module.exports = router;