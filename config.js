let config = {};

config.test = {
    host     : '40.68.3.130',
    port     : '3306',
    user     : 'loan35dbadmin',
    password : 'Loan35Pass@word2018',
    database : 'test',
    insecureAuth: true
};

config.staging = {
    host     : '40.68.3.130',
    port     : '3306',
    user     : 'loan35dbadmin',
    password : 'Loan35Pass@word2018',
    database : 'staging',
    insecureAuth: true
};

config.live = {
    host     : '40.68.3.130',
    port     : '3306',
    user     : 'loan35dbadmin',
    password : 'Loan35Pass@word2018',
    database : 'loan35',
    insecureAuth: true
};

config.production = {
    host     : '140.86.3.244',
    port     : '3306',
    user     : 'loan35admin',
    password : 'Pass@word1',
    database : 'loan35',
    insecureAuth: true
};

module.exports = config;