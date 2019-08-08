const
    axios = require('axios'),
    moment = require('moment'),
    db = require('../../../db'),
    express = require('express'),
    router = express.Router(),
    xeroClient = require('xero-node').AccountingAPIClient,
    helperFunctions = require('../../../helper-functions'),
    config = {
        appType : process.env.XERO_APP_TYPE,
        consumerKey: process.env.XERO_CONSUMER_KEY,
        consumerSecret: process.env.XERO_CONSUMER_SECRET,
        callbackUrl: process.env.XERO_CALLBACK_URL
    },
    xero = new xeroClient(config);

let xeroRequestToken,
    connectPageUrl;
router.get('/connect', async (req, res) => {
    const HOST = `${req.protocol}://${req.get('host')}`;
    connectPageUrl = `${HOST}/integrations`;
    xeroRequestToken = await xero.oauth1Client.getRequestToken();
    let authoriseURL = xero.oauth1Client.buildAuthoriseUrl(xeroRequestToken);
    if (req.query.url) connectPageUrl = req.query.url;
    res.redirect(authoriseURL);
});

router.get('/callback', async (req, res) => {
    let oauthVerifier = req.query.oauth_verifier,
        accessToken = await xero.oauth1Client.swapRequestTokenforAccessToken(xeroRequestToken, oauthVerifier);
    res.redirect(connectPageUrl.concat(`?x=1`));
});

module.exports = router;