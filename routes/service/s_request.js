const db = require('../../db');
const emailService = require('../service/custom-services/email.service');

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
    UpdateAndAlert: function (query, id, isWallet) {
        return new Promise((resolve, reject) => {
            db.query(query, function (error, results, fields) {
                if (error && error !== null) {
                    reject({
                        "status": 500,
                        "error": error,
                        "response": null
                    });
                } else {
                    transactionalAlert(id, isWallet);
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
                    if (query.toLowerCase().includes('investment_txns') &&
                        query.toLowerCase().includes('insert') &&
                        data.isApproved === 1 &&
                        data.postDone === 1) {
                        const isWallet_ = (data.isWallet === undefined) ? 0 : data.isWallet;
                        const _id = (isWallet_ === 0) ? data.investmentId : data.clientId;
                        transactionalAlert(_id, isWallet_);
                        resolve(results);
                    } else {
                        resolve(results);
                    }
                }
            });
        });
    }
}


function getRecentTxns(id, isWallet) {
    return new Promise((resolve, reject) => {
        const query = (isWallet.toString() === '0') ? `SELECT 
    v.ID,v.ref_no,c.fullname,c.email,v.description,v.amount,v.balance as txnBalance,v.ref_no,v.txn_date,p.ID as productId,u.fullname as createdByName, v.isDeny,
    v.approvalDone,v.reviewDone,v.created_date,v.postDone,p.code,p.name,i.investment_start_date, v.ref_no, v.isApproved,v.is_credit,v.updated_date,p.chkEnforceCount,
    i.clientId,v.isMoveFundTransfer,v.isWallet,v.isWithdrawal,isDeposit,v.isDocUploaded,p.canTerminate,i.isPaymentMadeByWallet,p.acct_allows_withdrawal,p.min_days_termination,
    v.is_capital,v.investmentId,i.isTerminated,i.isMatured,v.isForceTerminate,v.isReversedTxn,v.isInvestmentTerminated,v.expectedTerminationDate,p.inv_moves_wallet,
    v.isPaymentMadeByWallet,p.interest_disbursement_time,p.interest_moves_wallet,i.investment_mature_date,p.interest_rate,v.isInvestmentMatured,i.isClosed,p.premature_interest_rate,
    i.code as acctNo, v.isTransfer, v.beneficialInvestmentId FROM investment_txns v
    left join investments i on v.investmentId = i.ID
    left join clients c on i.clientId = c.ID
    left join users u on u.ID = v.createdBy
    left join investment_products p on i.productId = p.ID
    WHERE v.isWallet = 0 AND v.postDone = 1 AND v.investmentId = ${id} ORDER BY ID DESC LIMIT 5 OFFSET 0` :
            `SELECT 
            v.ID,v.ref_no,c.fullname,c.email,v.description,v.created_date,v.amount,v.balance as txnBalance,v.txn_date,u.fullname as createdByName,
            v.isDeny,v.isPaymentMadeByWallet,v.isReversedTxn,v.isTransfer,v.isMoveFundTransfer,v.beneficialInvestmentId,
            v.approvalDone,v.reviewDone,v.postDone,v.ref_no, v.isApproved,v.is_credit,v.isInvestmentTerminated,
            v.isForceTerminate,v.isInvestmentMatured,v.clientId,v.is_capital,v.investmentId,v.isWallet, v.updated_date FROM investment_txns v 
            left join clients c on v.clientId = c.ID
            left join users u on u.ID = v.createdBy
            WHERE v.isWallet = 1 AND v.postDone = 1 AND v.clientId = ${id} ORDER BY ID DESC LIMIT 5 OFFSET 0`;
        db.query(query, function (error, results, fields) {
            if (error && error !== null) {
                resolve([]);
            } else {
                resolve(results);
            }
        });
    });
}

/** Function call to compute the current investment/savings account balance with interest **/
function computeAccountBalanceIncludeInterest(id) {
    return new Promise((resolve, reject) => {
        let query = `Select amount, is_credit from investment_txns 
        WHERE isWallet = 0 AND investmentId = ${id} 
        AND isApproved = 1 AND postDone = 1`;
        db.query(query, function (error, results, fields) {
            let total = 0;
            if (error && error !== null) {
                resolve(total);
            } else {
                results.map(x => {
                    if (x.is_credit === 1) {
                        total += parseFloat(x.amount.toString());
                    } else {
                        total -= parseFloat(x.amount.toString());
                    }
                });
                let result = parseFloat(Number(total).toFixed(2));
                resolve(result);
            }
        });
    });
}

/** Function call to compute the current investment/savings account balance without interest **/
function computeCurrentBalance(id, isWallet) {
    return new Promise((resolve, reject) => {
        let query = (isWallet.toString() === '0') ? `Select amount, is_credit from investment_txns WHERE isWallet = 0 AND isInterest = 0 AND investmentId = ${id} 
        AND isApproved = 1 AND postDone = 1`:
            `Select amount, is_credit from investment_txns WHERE isWallet = 1 AND clientId = ${id} 
        AND isApproved = 1 AND postDone = 1`;
        db.query(query, function (error, results, fields) {
            let total = 0;
            if (error && error !== null) {
                resolve(total);
            } else {
                results.map(x => {
                    if (x.is_credit === 1) {
                        total += parseFloat(x.amount.toString());
                    } else {
                        total -= parseFloat(x.amount.toString());
                    }
                });
                let result = parseFloat(Number(total).toFixed(2));
                resolve(result);
            }
        });
    });
}

function getOrganisationDetails() {
    return new Promise((resolve, reject) => {
        let query = `SELECT name,state,country FROM investment_config ORDER BY ID DESC LIMIT 1`;
        db.query(query, function (error, results, fields) {
            resolve(results);
        }, err => {
            resolve({});
        });
    });
}

async function transactionalAlert(id, isWallet) {
    let data = await getRecentTxns(id, isWallet);
    let acctBalWithInterest = await computeAccountBalanceIncludeInterest(id);
    let acctBal = await computeCurrentBalance(id, isWallet);
    const orgName = await getOrganisationDetails();
    if (data.length > 0) {
        data.map(x => {
            x.amount = formater(x.amount.toString());
            const _description = x.description.split('<strong>');
            x.description = _description[0];
            x.referenceId = (_description.length > 1) ? x.ref_no : '';
        });
        let emailObject = {
            fullname: (data[0].fullname !== '') ? data[0].fullname : data[data.length - 1].fullname,
            recentTxnAmount: formater(data[0].amount.toString()),
            status: (data[0].is_credit.toString() === '1') ? 'Credited' : 'Debited',
            acctNo: (isWallet.toString() === '0') ? data[0].acctNo : 'WALLET',
            code: (isWallet.toString() === '0') ? data[0].code : '',
            description: data[0].description,
            product: (isWallet.toString() === '0') ? data[0].name : '',
            state: (orgName[0] !== undefined) ? orgName[0].state : '',
            country: (orgName[0] !== undefined) ? orgName[0].country : '',
            txnDate: data[0].txn_date,
            postDate: data[0].updated_date,
            balance: (isWallet.toString() === '0') ?
                ((data[0].interest_moves_wallet.toString() === '1') ?
                    formater(acctBal.toString()) : formater(acctBalWithInterest.toString())) : formater(acctBal.toString()),
            transactions: data
        };

        const emailAdress = data.find(x => x.email !== '' && x.email !== undefined && x.email !== null);
        if (!emailAdress.email) {
            emailService.send({
                to: emailAdress.email,
                subject: (isWallet.toString() === '0') ?
                    `${orgName[0].name} ${data[0].name} Transaction Alert` :
                    `${orgName[0].name} Wallet Transaction Alert`,
                template: 'txn-alert',
                context: emailObject
            });
        }
    }

    return {};
}

function formater(value) {
    if (value === '0')
        return '0.00';

    var _n = value.split(".");
    var _n2 = (_n[1] !== undefined) ? _n[0] + "." + _n[1] : _n[0];
    var n = _n2.split(".");
    n[0] = n[0].replace(/[\D\s\._\-]+/g, "");
    for (let index = 2; index < n.length; index++) {
        const element = n[index];
        n[1] += element;
        delete n[index];
    }
    if (n[1] !== undefined) {
        n[1] = n[1].replace(/[\D\s\._\-]+/g, "");
    }
    n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return n.join(".");
}

module.exports = sRequest;