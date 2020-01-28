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
                sterilizedMsg = mailData.triggerContent,
                subject = mailData.triggerSubject,
                mentions = extract(sterilizedMsg, { unique: true, symbol: false});
                mentionsList = mentions.toString();
                recipients = mailData.triggerRecipients;
                recipientsArray = (recipients).split(',');
    
                recipientsArray.forEach((recipient)=> {
            
                    //New TEst replace placeholder with live data
/*                     
                    if(mentions.length > 0) {
                        let query = `select ${mentionsList} from clients where email = '${recipient}'`;
                        console.log(query)
                        db.query(query, function(error, results) {
                            if(error) {
                                return console.log(error);
                            } else {
                                results.map(liveData => {
                                    //console.log(liveData.username)
                                    mentions.forEach(element => {
                                        let regex = new RegExp('@'+element, 'gi');
                                        sterilizedMsg = sterilizedMsg.replace(regex, liveData[element]);
                                    })
                                    //let regex = new RegExp('@'+element, 'gi');
                                    //sterilizedMsg = sterilizedMsg.replace(regex, liveData[element]);
                                });
                                console.log(sterilizedMsg)
                            }
                        }) */

                        //end of new test

                        let i = 0;
                
                        mentions.forEach(element => {
                            let query = `select ${element} from clients where email = '${recipient}'`;
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
                                                console.log(sterilizedMsg)
                                                emailService.sendHtmlByDomain(msg)
                                        }
                                    }
                                })
                        });
                
                    //}
            })
            res.status(200).send()
        })

})



module.exports = router;