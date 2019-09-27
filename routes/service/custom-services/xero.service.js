const
    express = require('express'),
    router = express.Router(),
    xeroFunctions = require('../../xero');

router.get('/connect', async (req, res) => {
    xeroFunctions.authorizedOperation(req, res, null, async (xeroClient) => {
        if (xeroClient) {
            res.send({
                "status": 200,
                "response": "Xero is already connected!"
            });
        } else {
            xeroFunctions.authorizeRedirect(req, res);
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

module.exports = router;