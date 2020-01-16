const express = require('express');
const router = express.Router();
const extract = require('mention-hashtag');
const fs = require('fs');
const axios = require('axios');
const db = require('../../../db');

router.post('/trigger/save', function(req, res, next) {

    //save content to db
    let mailData = req.body,
        query = `INSERT into email_templates SET trigger_name = ${mailData.triggerName}, trigger_subject = ${mailData.triggerSubject}, trigger_content = ${mailData.triggerContent}`
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

    let query = `SELECT trigger_recipient, trigger_content FROM email_templates WHERE trigger_name = ${mailData.triggerName}`,
        data = db.query(query, function(error, results) {
            if(error) {
                res.send({
                    status: 500,
                    error,
                    result: null
                })
            }
            return results
        })
        
    let sterilizedMsg = data.trigger_content,
        subject = data.trigger_subject,
        mentions = extract(sterilizedMsg, { unique: true, symbol: false});
    let recipients = mailData.recipients;
    let recipientsArray = (recipients).split(',');

    recipientsArray.every((recipient)=> {
    
        //proposal
        
        if(mentions.length > 0) {
            //let i = mentions.length - 1;
            let i = 0;
    
            mentions.forEach(element => {
                let query = `select ${element} from users where email = '${recipient}'`;
                    db.query(query, function(error, results) {
                        if(error) {
                            return console.log(error);
                        } else {
                            results.map(liveData => {
                                console.log(liveData[element]);
                                //for(mentions[i] in unsterilizedMsg) 
                                let regex = new RegExp('@'+element, 'gi');
                                sterilizedMsg = sterilizedMsg.replace(regex, liveData[element]);
                            });
                            i++;
    
                            if(i === mentions.length) {
                                //console.log(sterilizedMsg);
    
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
                                        //console.log(response);
                                        if(response.status === 200) {
                                            res.json(response.data);
                                        }
                                    }).catch(function(error) {
                                        //return error;
                                        res.json(JSON.stringify(error));
                                    });
    
                                    console.log(sterilizedMsg);
                            }
                        }
                    })
            });
    
        }
    })
/*

    if(mailData.template !== '') {
        fs.writeFileSync(`views/atbmailer/templates/${mailData.template}.html`, mailData.content);
    }

    let sterilizedMsg = mailData.content;
    let mentions = extract(sterilizedMsg, { unique: true, symbol: false});
    let { recipients, subject } = mailData;
    let recipientsArray = (recipients).split(',');

    //proposal
    
    if(mentions.length > 0) {
        //let i = mentions.length - 1;
        let i = 0;

        mentions.forEach(element => {
            let query = `select ${element} from users where email = '${recipientsArray[0]}'`;
                db.query(query, function(error, results) {
                    if(error) {
                        console.log(error);
                    } else {
                        results.map(liveData => {
                            console.log(liveData[element]);
                            //for(mentions[i] in unsterilizedMsg) 
                            let regex = new RegExp('@'+element, 'gi');
                            sterilizedMsg = sterilizedMsg.replace(regex, liveData[element]);
                        });
                        i++;

                        if(i === mentions.length) {
                            //console.log(sterilizedMsg);

                             let msg = {
                                to: recipientsArray,
                                from: 'noreply@atbtechsoft.com',
                                subject: subject,
                                text: 'hi',
                                html: sterilizedMsg,
                                };
                            
                                axios({
                                    method: 'post',
                                    url: 'http://localhost:5000/api/send',
                                    data: msg
                                }).then(function(response) {
                                    //console.log(response);
                                    if(response.status === 200) {
                                        res.json(response.data);
                                    }
                                }).catch(function(error) {
                                    //return error;
                                    res.json(JSON.stringify(error));
                                });

                                console.log(sterilizedMsg);
                        }
                    }
                })
        });

    }

    */
/*     let msg = {
        to: recipientsArray,
        from: 'service@atb.com',
        subject: subject,
        text: 'hi',
        html: sterilizedMsg,
        };
    
        axios({
            method: 'post',
            url: 'http://localhost:5000/api/send',
            data: msg
        }).then(function(response) {
            //console.log(response);
            if(response.status === 200) {
                res.json(response.data);
            }
        }).catch(function(error) {
            //return error;
            res.json(JSON.stringify(error));
        });

        console.log(sterilizedMsg); */
    

    //if recipients are more than one

    //db.query(query);

})


module.exports = router;