const express = require('express');
const router = express.Router();
const extract = require('mention-hashtag');
const fs = require('fs');
const axios = require('axios');

router.post('/send', function(req, res, next) {
    let mailData = req.body;

    if(mailData.template !== '') {
        fs.writeFileSync(`views/atbmailer/templates/${mailData.template}.html`, mailData.content);
    }

    const unsterilizedMsg = mailData.content;
    let mentions = extract(unsterilizedMsg, { unique: false, symbol: false});
    let mentionsQuery = `select ${mentions.join()}`;

    console.log(mentionsQuery);
    let { recipients, content, subject } = mailData;
    let recipientsArray = (recipients).split(',');
    let msg = {
    to: recipientsArray,
    from: 'noreply@atbtechsoft.com',
    subject: subject,
    text: 'hi',
    html: content,
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

})


module.exports = router;