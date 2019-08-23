let xero = {},
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

xero.authorizeRedirect = async function (req, res, returnTo) {
    var xeroClient = getXeroClient(req.session);
    let requestToken = await xeroClient.oauth1Client.getRequestToken();

    var authoriseUrl = xeroClient.oauth1Client.buildAuthoriseUrl(requestToken);
    req.session.oauthRequestToken = requestToken;
    req.session.returnTo = returnTo;
    res.redirect(authoriseUrl);
};

xero.authorizedOperation = function (req, res, returnTo, callback) {
    if (req.session.accessToken) {
        callback(getXeroClient(req.session.accessToken));
    } else {
        authorizeRedirect(req, res, returnTo);
    }
};

xero.handleErr = function (err, req, res, returnTo) {
    console.log(err);
    if (err.data && err.data.oauth_problem && err.data.oauth_problem === 'token_rejected') {
        authorizeRedirect(req, res, returnTo);
    } else {
        res.redirect('error', err);
    }
};

module.exports = xero;