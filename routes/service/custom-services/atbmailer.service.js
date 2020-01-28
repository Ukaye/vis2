const express = require('express');
const router = express.Router();
const extract = require('mention-hashtag');
const replaceOnce = require('replace-once')
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

    let msg
    let mailData = req.body,

                unsterilizedMsg = mailData.emailContent,
                subject = mailData.emailSubject,
                mentions = extract(unsterilizedMsg, { unique: true, symbol: false}),
                mentionsWithSymbol = extract(unsterilizedMsg, { unique: true, symbol: true}),
                mentionsList = mentions.toString(),
                recipients = mailData.emailRecipients,
                recipientsArray = (recipients).split(',');
                console.log(unsterilizedMsg)
    
                recipientsArray.forEach((recipient)=> {
                    
                    if(mentions.length > 0) {
                        let query = `select ${mentionsList} from clients where email = '${recipient}'`;
                        db.query(query, function(error, results) {
                            if(error) {
                                return console.log(error);
                            } else {
                                results.map(liveData => {
                                    let find = mentionsWithSymbol;
                                    let replace = Object.values(liveData)
                                    let sterilizedMsg = replaceOnce(unsterilizedMsg, find, replace, 'gi')
                                    msg = {
                                        to: recipient,
                                        subject,
                                        from: 'no-reply@app.finratus.com',
                                        html: sterilizedMsg
                                        };
                                        emailService.sendHtmlByDomain(msg)
                                });
                            }
                        })
                    } else {

                        msg = {
                            to: recipient,
                            subject,
                            from: 'no-reply@app.finratus.com',
                            html: unsterilizedMsg
                            };
                            emailService.sendHtmlByDomain(msg)                        
                    }
            })
            res.send({
                status: 200,
                error: null,
                response: 'Email succesfully sent.'
            })

})



module.exports = router;