let config = {};

config.test = {
    host: '13.73.183.125',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'test',
    charset: 'utf8mb4',
    insecureAuth: true
};

config.staging = {
    host: '13.73.183.125',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'staging',
    charset: 'utf8mb4',
    insecureAuth: true
};

config.live = {
    host: '13.73.183.125',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'loan35',
    charset: 'utf8mb4',
    insecureAuth: true
};

config.production = {
    host: '13.94.142.82',
    port: '3306',
    user: 'loan35admin',
    password: 'Loan35Pass@word2018',
    database: 'loan35',
    charset: 'utf8mb4',
    insecureAuth: true
};

module.exports = config;