const
    audit = {},
    db = require('../db'),
    moment = require('moment');

audit.log = (audit) => {
    let query = 'INSERT INTO audit_logs Set ?';
    audit.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, audit, function (error, results) {
        if(error) return //console.log(error);
    });
};

module.exports = audit;