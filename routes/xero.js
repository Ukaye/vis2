let xero = {},
    db = require('../db'),
    XeroClient = require('xero-node').AccountingAPIClient;

xero.getXeroClient = function (session) {
    let config = {
        appType : process.env.XERO_APP_TYPE,
        consumerKey: process.env.XERO_CONSUMER_KEY,
        consumerSecret: process.env.XERO_CONSUMER_SECRET,
        callbackUrl: process.env.XERO_CALLBACK_URL
    };
    return new XeroClient(config, session);
};

xero.authorizeRedirect = async function (req, res) {
    var xeroClient = xero.getXeroClient(req.session);
    let requestToken = await xeroClient.oauth1Client.getRequestToken();

    var authoriseUrl = xeroClient.oauth1Client.buildAuthoriseUrl(requestToken);
    req.session.oauthRequestToken = requestToken;
    req.session.returnTo = req.headers.referer;
    res.status(400).json({url: authoriseUrl, code: 'xero'});
};

xero.authorizedOperation = function (req, res, module, callback) {
    db.query('SELECT * FROM integrations WHERE ID = (SELECT MAX(ID) FROM integrations)', 
    (error, integration_) => {
        const integration = integration_[0];
        if (integration && integration[module] === 1) {
            if (req.session.accessToken) {
                callback(xero.getXeroClient(req.session.accessToken));
            } else {
                xero.authorizeRedirect(req, res);
            }
        } else {
            callback(false);
        }
    });
};

xero.handleErr = function (err, req, res) {
    if (err.data && err.data.oauth_problem && err.data.oauth_problem === 'token_rejected') {
        xero.authorizeRedirect(req, res);
    } else {
        console.log(err);
    }
};

module.exports = xero;