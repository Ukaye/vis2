
let config = {};

config.test = {
    host: '140.86.3.6',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'test',
    charset: 'utf8mb4',
    insecureAuth: true
};

config.staging = {
    host: '140.86.3.6',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'staging',
    charset: 'utf8mb4',
    insecureAuth: true
};

config.live = {
    host: '140.86.3.6',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'loan35',
    charset: 'utf8mb4',
    insecureAuth: true
};

config.production = {
    host: '52.151.98.246',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'loan35',
    charset: 'utf8mb4',
    insecureAuth: true
};

module.exports = config;