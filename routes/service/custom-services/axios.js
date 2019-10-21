const db = require('../../../db');

var Axios = {
    get: (url, params_) => {
        return new Promise((resolve, reject) => {
            db.query(params_.params.query, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        data: response
                    });
                }
            });
        });
    },
    post: (url, data) => {
        return new Promise((resolve, reject) => {
            db.query(url.split('?query=')[1], data, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        data: response
                    });
                }
            });
        });
    }
}

module.exports = Axios;