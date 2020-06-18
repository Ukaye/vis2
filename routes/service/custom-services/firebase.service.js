const firebase = {},
    FCM = require('fcm-node'),
    db = require('../../../db'),
    OneSignal = require('onesignal-node'),
    serverKey = require('../../../firebase-key.json'),
    fcm = new FCM(serverKey),
    oneSignal = new OneSignal.Client(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_API_KEY);

firebase.send = payload => {
    if (!payload.to) return;
    const query = `SELECT onesignal_id FROM clients 
        WHERE username = "${payload.to}" OR email = "${payload.to}" OR phone = "${payload.to}"`;
    db.query(query, async (error, client) => {
        client = client[0];
        if (!client || !client.onesignal_id) return;

        let notification = {
            headings: {
              'en': payload.subject,
            },
            contents: {
              'en': (payload.context && payload.context.message)? payload.context.message : ''
            },
            include_player_ids: [client.onesignal_id]
        };
        if (payload.data) notification.data = payload.data;
        const response = await oneSignal.createNotification(notification);
    });
};

firebase.sendV2 = payload => {
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
        });
    });
};

module.exports = firebase;