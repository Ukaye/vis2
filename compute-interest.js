const express = require('express');
const moment = require('moment');
const db = require('./db');
const differenceInCalendarDays = require('date-fns/difference_in_calendar_days');
const differenceInMonths = require('date-fns/difference_in_months');
const isLeapYear = require('date-fns/is_leap_year');
const isValid = require('date-fns/is_valid');

let _module = {};

_module.computeInvestmentInterest = function () {
    const dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(`SELECT i.ID, i.investment_mature_date,i.investment_start_date,p.interest_rate,i.clientId, t.amount,t.is_credit, t.ID as txnId, p.interest_disbursement_time FROM investments i 
    LEFT JOIN investment_txns t on t.investmentId = i.ID
    LEFT JOIN investment_products p on p.ID = i.productId WHERE i.isTerminated = 0 AND i.isMatured = 0 AND t.isInterest = 0`, function (error, resultItem, fields) {
        if (resultItem !== undefined && resultItem.length > 0) {
            let result = resultItem.filter(x => x.interest_disbursement_time === 'Monthly');
            if (result.length > 0) {
                result.map(x => {
                    let interestInDays = 0;
                    let T = differenceInCalendarDays(
                        new Date(x.investment_mature_date.toString()),
                        new Date(x.investment_start_date.toString())
                    );
                    if (T !== 0) {
                        interestInDays = 1 / 365;
                        let SI = (parseFloat(x.amount.split(',').join('')) * parseFloat(x.interest_rate.split(',').join('')) * interestInDays) / 100;
                        let _data = {
                            clientId: x.clientId,
                            investmentId: x.ID,
                            createdAt: dt,
                            updatedAt: dt,
                            amount: SI
                        }
                        db.query('INSERT INTO investment_interests SET ?', _data, function (error, insertedData, fields) {});
                    }
                });

                let strDate = new Date();
                db.query(`SELECT i.ID,i.investment_start_date,i.investment_mature_date, v.amount as txnAmount, v.is_credit, v.isApproved FROM investments i 
                        LEFT JOIN investment_txns v on v.investmentId = i.ID where i.isTerminated = 0`, function (error, result_, fields) {
                    result_.map(item => {
                        db.query(`SELECT * FROM investment_interests where isPosted = 0 AND investmentId = ${item.ID} 
                    ORDER BY STR_TO_DATE(createdAt, '%Y-%m-%d')`, function (error, result_2, fields) {
                            if (result_2 !== undefined && result_2.length > 0) {
                                let minCreatedAt = result_2[0].createdAt;
                                let maxCreatedAt = result_2[result_2.length - 1].createdAt;
                                let noOfMonths = differenceInMonths(
                                    new Date(maxCreatedAt),
                                    new Date(minCreatedAt)
                                );
                                if (noOfMonths >= 1) {
                                    let total = 0;
                                    result_.map(x => {
                                        if (x.isApproved === 1) {
                                            let _x = x.txnAmount.split(',').join('');
                                            if (x.is_credit.toString() === '1') {
                                                total += parseFloat(_x);
                                            } else {
                                                total -= parseFloat(_x);
                                            }
                                        }
                                    });
                                    let totalAmount = 0;
                                    result_2.map(x => {
                                        let _x = x.amount.split(',').join('');
                                        totalAmount += parseFloat(_x);
                                    });
                                    let refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                    let _data = {
                                        txn_date: dt,
                                        description: `Interest for ${strDate.toDateString()}`,
                                        amount: totalAmount,
                                        is_credit: 1,
                                        isInterest: 1,
                                        isInterestCharged: 1,
                                        created_date: dt,
                                        balance: total,
                                        is_capital: 0,
                                        ref_no: refId,
                                        updated_date: dt,
                                        investmentId: item.ID
                                    };
                                    db.query('INSERT INTO investment_txns SET ?', _data, function (error, results, fields) {
                                        result_2.map(x => {
                                            db.query(`DELETE FROM investment_interests WHERE ID =${x.ID}`, function (error, udatedData, fields) {});
                                        });
                                    });
                                }
                            }
                        });
                    });
                });
            }
            let resultEndOfTenure = resultItem.filter(x => x.interest_disbursement_time === 'End-of-Tenure');
            if (resultEndOfTenure.length > 0) {
                resultEndOfTenure.map(item => {
                    let strDate = new Date();
                    let monthlyMatureDate = `${strDate.getUTCFullYear()}-${strDate.getMonth() + 1}-${strDate.getDate()}`;
                    db.query(`SELECT i.ID,i.investment_start_date,i.investment_mature_date, v.amount as txnAmount,p.interest_rate,
                            v.is_credit, v.isApproved FROM investments i LEFT JOIN investment_txns v on v.investmentId = i.ID 
                            LEFT JOIN investment_products p on p.ID = i.productId 
                            WHERE i.isTerminated = 0 AND isMatured = 0 AND i.ID = ${item.ID} 
                            AND STR_TO_DATE(i.investment_mature_date, '%Y-%m-%d') = '${monthlyMatureDate}'`, function (error, _result_, fields) {
                        _result_.map(item => {
                            let total = 0;
                            _result_.map(x => {
                                if (x.isApproved === 1) {
                                    let _x = x.txnAmount.split(',').join('');
                                    if (x.is_credit.toString() === '1') {
                                        total += parseFloat(_x);
                                    } else {
                                        total -= parseFloat(_x);
                                    }
                                }
                            });


                            let T = differenceInCalendarDays(
                                new Date(_result_[0].investment_mature_date.toString()),
                                new Date(_result_[0].investment_start_date.toString())
                            );

                            let interestInDays = T / 365;
                            let SI = (total * parseFloat(_result_[0].interest_rate.split(',').join('')) * interestInDays) / 100;
                            if (SI !== 0) {
                                let refId = moment().utcOffset('+0100').format('YYMMDDhmmss');
                                let _data = {
                                    txn_date: dt,
                                    description: `Interest for ${strDate.toDateString()}`,
                                    amount: SI,
                                    is_credit: 1,
                                    isInterest: 1,
                                    isInterestCharged: 1,
                                    created_date: dt,
                                    balance: total,
                                    is_capital: 0,
                                    ref_no: refId,
                                    updated_date: dt,
                                    investmentId: item.ID
                                };
                                db.query('INSERT INTO investment_txns SET ?', _data, function (error, results, fields) {
                                    if (error && error !== null) {} else {
                                        db.query(`UPDATE investments SET isMatured = ${1}`, _data, function (error, results, fields) {});
                                    }
                                });
                            }
                        });
                    });
                });
            }
        }
    });

}

module.exports = _module;



dailyMaturedInvestmentTxns(HOST, data.investmentId, formatedDate).then(payload => {
    console.log("------------dailyMaturedInvestmentTxns-----------");
    console.log(payload.data);
    console.log("------------dailyMaturedInvestmentTxns Ends-----------");
    if (payload.data.status === undefined) {
        if (payload.data.length > 0) {
            let daysInYear = 365;
            if (isLeapYear(new Date(formatedDate))) {
                daysInYear = 366;
            }
            let totalInvestedAmount = 0;
            payload.data.map(x => {
                if (x.isApproved === 1) {
                    let _x = x.amount.split(',').join('');
                    if (x.is_credit.toString() === '1') {
                        totalInvestedAmount += parseFloat(_x);
                    } else {
                        totalInvestedAmount -= parseFloat(_x);
                    }
                }
            });
            let interestInDays = payload.data[0].interest_rate / daysInYear;
            let SI = (totalInvestedAmount * interestInDays) / 100;
            let _amount = parseFloat(Math.round(SI * 100) / 100).toFixed(2);
            sumUpInvestmentInterest(HOST, data.investmentId).then(payload1 => {
                console.log("------------sumUpInvestmentInterest-----------");
                console.log(payload1.data);
                console.log("------------sumUpInvestmentInterest Ends-----------");
                let dailyInterest = {
                    clientId: payload.data[0].clientId,
                    investmentId: data.investmentId,
                    createdAt: dt,
                    interestDate: formatedDate,
                    amount: Math.round(_amount).toFixed(2),
                    year: data.year,
                    month: data.month,
                    balance: payload1.data[0].total + Math.round(_amount).toFixed(2)
                }
                setInvestmentInterest(HOST, dailyInterest).then(payload2 => {
                    if (index === daysInMonth) {
                        if (payload2.data.status === undefined) {
                            if (response3.data[0].interest_moves_wallet === 1) {
                                sumAllWalletInvestmentTxns(HOST, payload.data[0].clientId).then(payload3 => {
                                    let inv_txn = {
                                        txn_date: dt,
                                        description: `Balance@ ${formatedDate} ${payload1.data[0].balance + Math.round(_amount).toFixed(2)}`,
                                        amount: Math.round(payload2.data[0].total).toFixed(2),
                                        is_credit: 1,
                                        created_date: dt,
                                        balance: response2_counter.data[0].total + Math.round(payload2.data[0].total).toFixed(2),
                                        is_capital: 0,
                                        isCharge: 0,
                                        isApproved: 1,
                                        postDone: 1,
                                        reviewDone: 1,
                                        approvalDone: 1,
                                        ref_no: refId,
                                        updated_date: dt,
                                        investmentId: data.investmentId,
                                        createdBy: data.createdBy,
                                        clientId: response3.data[0].clientId,
                                        isWallet: 1
                                    };
                                    setInvestmentTxns(HOST, inv_txn).then(payload4 => {
                                        let _formatedDate = new Date(formatedDate);
                                        let query = `UPDATE investment_interests SET isPosted = 1 
                                    WHERE id <> 0 AND investmentId = ${data.investmentId} 
                                    AND month = ${_formatedDate.getMonth()} 
                                    AND year = ${_formatedDate.getFullYear()}`;
                                        console.log(query);
                                        endpoint = '/core-service/get';
                                        url = `${HOST}${endpoint}`;
                                        axios.get(url, {
                                            params: {
                                                query: query
                                            }
                                        }).then(_payload_2 => {

                                        }, err => {

                                        });
                                    }, err => {})
                                }, err => {})
                            } else {
                                let inv_txn = {
                                    txn_date: dt,
                                    description: `Investment interest@ ${data.month}/${currentDate.getUTCFullYear()}`,
                                    amount: Math.round(payload2.data[0].total).toFixed(2),
                                    is_credit: 1,
                                    created_date: dt,
                                    balance: totalInvestedAmount,
                                    is_capital: 0,
                                    isCharge: 0,
                                    isApproved: 1,
                                    postDone: 1,
                                    reviewDone: 1,
                                    approvalDone: 1,
                                    ref_no: refId,
                                    updated_date: dt,
                                    investmentId: data.investmentId,
                                    createdBy: data.createdBy
                                };
                                setInvestmentTxns(HOST, inv_txn).then(payload4 => {
                                    let _formatedDate = new Date(formatedDate);
                                    query = `UPDATE investment_interests SET isPosted = 1 
                            WHERE id <> 0 AND investmentId = ${data.investmentId} 
                            AND month = ${_formatedDate.getMonth()} 
                            AND year = ${_formatedDate.getFullYear()}`;
                                    console.log(query);
                                    endpoint = '/core-service/get';
                                    url = `${HOST}${endpoint}`;
                                    axios.get(url, {
                                        params: {
                                            query: query
                                        }
                                    }).then(_payload_2 => {

                                    }, err => {

                                    });
                                }, err => {

                                });
                            }
                        }
                    }
                }, err => {});
            }, err => {});
        }
    }
}, err => {
    console.log(role);
});