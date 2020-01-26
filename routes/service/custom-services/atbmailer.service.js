const express = require('express');
const router = express.Router();
const extract = require('mention-hashtag');
const fs = require('fs');
const axios = require('axios');
const db = require('../../../db');
const emailService = require('./email.service')

router.post('/trigger/save', function(req, res, next) {

    let mailData = req.body,

        query = `SELECT count(*) as rows FROM email_templates WHERE trigger_name = '${mailData.triggerName.trim()}'`
        db.query(query, function (error, results) {
            if(results[0].rows > 0) {
                //update content if trigger exists
                query = `UPDATE email_templates SET trigger_subject = '${mailData.triggerSubject}', trigger_content = '${mailData.triggerContent}' WHERE trigger_name = '${mailData.triggerName.trim()}'`
                db.query(query, function (error, results) {
                    if(error) {
                        res.send({
                            status: 500,
                            error,
                            response: null
                        })
                    }
        
                    res.send({
                        status: 200,
                        error: null,
                        response: "Trigger Updated"
                    })
                })
            } else {

                //save trigger if name does not exist
                query = `INSERT into email_templates SET trigger_name = '${mailData.triggerName.trim()}', trigger_subject = '${mailData.triggerSubject}', trigger_content = '${mailData.triggerContent}'`
                db.query(query, function (error, results) {
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
                        response: "Trigger Saved"
                    })
                })
            }

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
    
                recipientsArray.forEach((recipient)=> {
            
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
                                                subject,
                                                from: 'no-reply@app.finratus.com',
                                                html: sterilizedMsg
                                                };

                                                emailService.sendHtmlByDomain(msg)
                                        }
                                    }
                                })
                        });
                
                    }
            })
            res.status(200).send()
        })

})

router.get('/send', (req, res)=> {
    
})


module.exports = router;