const db = require('../../db');

var sRequest = {
    get: function (query) {
        return new Promise((resolve, reject) => {
            db.query(query, function (error, results, fields) {
                if (error && error !== null) {
                    reject({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    resolve(results);
                }
            });
        });
    },
    post: function (query, data) {
        return new Promise((resolve, reject) => {
            db.query(query, data, function (error, results, fields) {
                if (error && error !== null) {
                    reject({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    resolve(results);
                }
            });
        });
    }
}

module.exports = sRequest;