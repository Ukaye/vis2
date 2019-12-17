
let config = {};

config.test = {
    host: '142.93.35.233',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'test',
    charset: 'utf8mb4',
    insecureAuth: true
};

config.staging = {
    host: '142.93.35.233',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'staging',
    charset: 'utf8mb4',
    insecureAuth: true
};

config.live = {
    host: '142.93.35.233',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'loan35',
    charset: 'utf8mb4',
    insecureAuth: true
};

config.production = {
    host: '178.62.4.168',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'loan35',
    charset: 'utf8mb4',
    insecureAuth: true
};

module.exports = config;