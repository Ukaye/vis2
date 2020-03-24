const firebase = {},
    FCM = require('fcm-node'),
    db = require('../../../db'),
    serverKey = require('../../../firebase-key.json'),
    fcm = new FCM(serverKey);

firebase.send = payload => {
    if (!payload.to) return;
    const query = `SELECT firebase_token FROM clients WHERE email = "${payload.to}"`;
    db.query(query, (error, client) => {
        client = client[0];
        if (!client || !client.firebase_token) return;
        var message = {
            to: client.firebase_token,
            notification: {
                title: payload.subject,
                body: (payload.context && payload.context.message)? payload.context.message : ''
            },
            data: {
                name: 'Ola badoo'
            }
        };
        fcm.send(message, (error, response) => {
            if (error) console.log(error);
        });
    });
};

module.exports = firebase;