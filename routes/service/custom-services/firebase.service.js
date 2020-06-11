const firebase = {},
    FCM = require('fcm-node'),
    db = require('../../../db'),
    serverKey = require('../../../firebase-key.json'),
    fcm = new FCM(serverKey);

firebase.send = payload => {
    if (!payload.to) return;
    const query = `SELECT firebase_token FROM clients 
        WHERE username = "${payload.to}" OR email = "${payload.to}" OR phone = "${payload.to}"`;
    db.query(query, (error, client) => {
        client = client[0];
        if (!client || !client.firebase_token) return;
        let message = {
            to: client.firebase_token,
            notification: {
                title: payload.subject,
                body: (payload.context && payload.context.message)? payload.context.message : ''
            }
        };
        if (payload.data) message.data = payload.data;
        fcm.send(message, (error, response) => {
            if (error) console.log(error);
            console.log(response)
        });
    });
};

module.exports = firebase;