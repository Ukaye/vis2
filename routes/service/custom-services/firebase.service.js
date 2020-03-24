const firebase = {},
    FCM = require('fcm-node'),
    db = require('../../../db'),
    serverKey = require('../../../firebase-key.json'),
    fcm = new FCM(serverKey);

firebase.send = payload => {
    console.log(payload)
    if (!payload.to) return;
    const query = `SELECT firebase_token FROM clients WHERE email = "${payload.to}"`;
    db.query(query, client => {
        console.log(client)
        client = client[0];
        if (!client || !client.firebase_token) return;
        var message = {
            to: client.firebase_token,
            notification: {
                title: payload.subject,
                body: (payload.context && payload.context.message)? payload.context.message : ''
            }
        };
        console.log('done')
        fcm.send(message, (error, response) => {
            console.log('finished')
            if (error) console.log(error);
            console.log(response);
        });
    });
};

module.exports = firebase;