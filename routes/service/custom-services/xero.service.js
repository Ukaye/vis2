const
    axios = require('axios'),
    moment = require('moment'),
    express = require('express'),
    router = express.Router(),
    db = require('../../../db'),
    xeroFunctions = require('../../xero'),
    XeroClient = require('xero-node').AccountingAPIClient,
    helperFunctions = require('../../../helper-functions');

router.get('/connect', async (req, res) => {
    xeroFunctions.authorizedOperation(req, res, '/integrations', async function(xeroClient) {
        try {
            let organisations = await xeroClient.organisations.get()
            res.render('organisations', {
                organisations: organisations.Organisations,
                active: {
                    organisations: true,
                    nav: {
                        accounting: true
                    }
                }
            })
        } catch (err) {
            handleErr(err, req, res, 'organisations');
        }

    })
});

router.get('/callback', async (req, res) => {
    var xeroClient = xeroFunctions.getXeroClient();

    let savedRequestToken = req.session.oauthRequestToken;
    let oauth_verifier = req.query.oauth_verifier;
    let accessToken = await xeroClient.oauth1Client.swapRequestTokenforAccessToken(savedRequestToken, oauth_verifier);

    req.session.accessToken = accessToken;
    res.redirect(req.session.returnTo || '/');
});

// (async function init () {
//     const result = await xero.invoices.get();
//     console.log('Number of invoices:', result.Invoices.length);
// })();

module.exports = router;