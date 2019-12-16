const express = require('express');
const router = express.Router();
const extract = require('mention-hashtag');
const fs = require('fs');
const axios = require('axios');
const db = require('../../../db');

router.post('/send', function(req, res, next) {
    let mailData = req.body;

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
            let query = `select ${element} from users where email = '${mailData.recipients}'`;
                db.query(query, function(error, results) {
                    if(error) {
                        console.log(error);
                    } else {
                        results.map(liveData => {
                            //console.log(liveData[element]);
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
    

    //if recipients are more than one

    //db.query(query);

})


module.exports = router;