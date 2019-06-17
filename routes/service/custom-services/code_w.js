async function chargeForceTerminate(data, HOST) {
    if (data.isInvestmentTerminated === '1') {
        let query = `SELECT t.*,p.*,v.description,v.amount as txnAmount,
        v.balance as txnBalance,v.isApproved,v.isInterestCharged,v.is_credit FROM investments t 
        left join investment_products p on p.ID = t.productId
        left join investment_txns v on v.investmentId = t.ID
        WHERE v.investmentId = ${data.investmentId} AND p.status = 1 AND v.isApproved = 1 ORDER BY v.ID DESC LIMIT 1`;
        console.log(query);
        let endpoint = '/core-service/get';
        let url = `${HOST}${endpoint}`;
        axios.get(url, {
            params: {
                query: query
            }
        }).then(response => {
            console.log(response.data);
            if (response.data.status === undefined) {
                let configData = response.data[0];
                let balance = data.balance.split(',').join('');
                let configAmount = (configData.opt_on_min_days_termination == 'Fixed') ? configData.min_days_termination_charge : (configData.min_days_termination_charge * parseFloat(Math.round(balance).toFixed(2))) / 100;

                let inv_txn = {
                    txn_date: dt,
                    description: `CHARGE ON INVESTMENT TERMINATION`,
                    amount: configAmount,
                    is_credit: 0,
                    created_date: dt,
                    balance: parseFloat(Math.round(balance).toFixed(2)) - configAmount,
                    is_capital: 0,
                    isCharge: 1,
                    isApproved: 1,
                    postDone: 1,
                    reviewDone: 1,
                    investmentId: data.investmentId,
                    approvalDone: 1,
                    ref_no: _refId,
                    updated_date: dt,
                    createdBy: data.createdBy
                };
                query = `INSERT INTO investment_txns SET ?`;
                endpoint = `/core-service/post?query=${query}`;
                url = `${host}${endpoint}`;
                try {
                    const result = axios.post(url, inv_txn);
                    deductVatTax(HOST, data, configAmount, inv_txn, balance);
                    return result;
                } catch (error) {
                    return error;
                }
            }
        }, err => {})

    }
}

async function reverseEarlierInterest(data, HOST) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `SELECT t.*,p.*,v.description,v.amount as txnAmount,
         v.balance as txnBalance,v.isApproved,v.isInterest,v.isInterestCharged,v.is_credit FROM investments t 
         left join investment_products p on p.ID = t.productId
         left join investment_txns v on v.investmentId = t.ID
         WHERE v.investmentId = ${data.investmentId} AND p.status = 1 AND v.isApproved = 1`;
    let endpoint = `/core-service/get`;
    let url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response_prdt_ => {
        console.log(response_prdt_.data);
        let totalInterestAmount = 0; //premature_interest_rate:
        let reduceInterestRateApplied = response_prdt_.data.filter(x => x.premature_interest_rate !== '' && x.premature_interest_rate !== undefined && x.premature_interest_rate.toString() !== '0');
        if (reduceInterestRateApplied.length > 0) {
            response_prdt_.data.map(item => {
                if (item.isInterest === 1) {
                    totalInterestAmount += parseFloat(item.txnAmount.toString());
                }
            });

            let total = 0;
            response_prdt_.data.map(x => {
                let _x = x.txnAmount.split(',').join('');
                if (x.is_credit.toString() === '1') {
                    total += parseFloat(_x);
                } else {
                    total -= parseFloat(_x);
                }
            });
            let refId = moment().utcOffset('+0100').format('x');
            inv_txn = {
                txn_date: dt,
                description: 'Reverse: ' + 'Interest on investment',
                amount: Math.round(totalInterestAmount).toFixed(2),
                is_credit: 0,
                isCharge: 1,
                created_date: dt,
                balance: Math.round(total - totalInterestAmount).toFixed(2),
                is_capital: 0,
                isApproved: 1,
                postDone: 1,
                reviewDone: 1,
                approvalDone: 1,
                ref_no: `${refId}-R`,
                updated_date: dt,
                investmentId: data.investmentId,
                createdBy: data.createdBy
            };

            query = `INSERT INTO investment_txns SET ?`;
            endpoint = `/core-service/post?query=${query}`;
            let url = `${HOST}${endpoint}`;
            axios.post(url, inv_txn)
                .then(_payload_interest => {
                    dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    let daysInYear = 365;
                    if (isLeapYear(new Date())) {
                        daysInYear = 366;
                    }
                    let totalInvestedAmount = total - totalInterestAmount;

                    let interestInDays = response_prdt_.data[0].premature_interest_rate / daysInYear;
                    let SI = (totalInvestedAmount * interestInDays) / 100;
                    let _amount = parseFloat(Math.round(SI * 100) / 100).toFixed(2);
                    let diffInDays = differenceInDays(
                        new Date(),
                        new Date(response_prdt_.data[0].investment_start_date)
                    )
                    let interestAmount = diffInDays * _amount;
                    inv_txn = {
                        txn_date: dt,
                        description: 'Investment termination interest',
                        amount: interestAmount,
                        is_credit: 1,
                        isCharge: 1,
                        created_date: dt,
                        balance: totalInvestedAmount + interestAmount,
                        is_capital: 0,
                        isApproved: 1,
                        postDone: 1,
                        reviewDone: 1,
                        approvalDone: 1,
                        ref_no: refId,
                        updated_date: dt,
                        investmentId: data.investmentId,
                        createdBy: data.createdBy
                    };

                    query = `INSERT INTO investment_txns SET ?`;
                    endpoint = `/core-service/post?query=${query}`;
                    let url = `${HOST}${endpoint}`;
                    axios.post(url, inv_txn)
                        .then(_payload_interest_2 => {
                            //interest_forfeit_charge interest_forfeit_charge_opt
                            dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                            let configData = response_prdt_.data[0];
                            let configAmount = (configData.interest_forfeit_charge_opt == 'Fixed') ? configData.interest_forfeit_charge : (configData.interest_forfeit_charge * parseFloat(Math.round(totalInvestedAmount + interestAmount).toFixed(2))) / 100;
                            let inv_txn = {
                                txn_date: dt,
                                description: `CHARGE ON TERMINATION OF INVESTMENT`,
                                amount: configAmount,
                                is_credit: 0,
                                created_date: dt,
                                balance: (totalInvestedAmount + interestAmount) - configAmount,
                                is_capital: 0,
                                isCharge: 1,
                                isApproved: 1,
                                postDone: 1,
                                reviewDone: 1,
                                investmentId: data.investmentId,
                                approvalDone: 1,
                                ref_no: _refId,
                                updated_date: dt,
                                createdBy: data.createdBy,
                                isVat: 1
                            };
                            setInvestmentTxns(HOST, inv_txn).then(payload => {
                                deductVatTax(HOST, data, configAmount, inv_txn, (balance - configAmount));
                                return {};
                            }, err1 => {});

                        }, err => {});
                }, err => {});
        } else {
            let configData = response_prdt_.data[0];
            let totalInvestedAmount = configData.balance.split(',').join('');
            let configAmount = (configData.interest_forfeit_charge_opt == 'Fixed') ? configData.interest_forfeit_charge : (configData.interest_forfeit_charge * parseFloat(Math.round(totalInvestedAmount).toFixed(2))) / 100;
            let inv_txn = {
                txn_date: dt,
                description: `CHARGE ON TERMINATION OF INVESTMENT`,
                amount: configAmount,
                is_credit: 0,
                created_date: dt,
                balance: totalInvestedAmount - configAmount,
                is_capital: 0,
                isCharge: 1,
                isApproved: 1,
                postDone: 1,
                reviewDone: 1,
                investmentId: data.investmentId,
                approvalDone: 1,
                ref_no: _refId,
                updated_date: dt,
                createdBy: data.createdBy,
                isVat: 1
            };
            setInvestmentTxns(HOST, inv_txn).then(payload_2 => {
                deductVatTax(HOST, data, configAmount, inv_txn, (balance - configAmount));
                return {};
            }, err2 => {});

        }
    }, err => {});
}



router.post('/terminate', function (req, res, next) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let data = req.body;
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let refId = moment().utcOffset('+0100').format('x');
    let query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance FROM investments t 
    left join investment_products p on p.ID = t.productId
    left join investment_txns v on v.investmentId = t.ID
    WHERE t.ID = ${data.investmentId} AND p.status = 1`;
    let endpoint = `/core-service/get`;
    url = `${HOST}${endpoint}`;
    axios.get(url, {
        params: {
            query: query
        }
    }).then(response_product => {

        //Charge for deposit
        let chargeForDeposit = response_product.data.filter(x => x.interest_forfeit_charge !== '0' && x.interest_forfeit_charge !== '');
        if (chargeForDeposit.length > 0) {
            let total = parseFloat(chargeForDeposit[chargeForDeposit.length - 1].txnBalance.split(',').join(''));
            let chargedCost = 0;
            if (data.isForceTerminate === 0) {
                chargedCost = (chargeForDeposit[0].opt_on_min_days_termination === 'Fixed') ? parseFloat(chargeForDeposit[0].interest_forfeit_charge.split(',').join('')) : ((parseFloat(chargeForDeposit[0].interest_forfeit_charge.split(',').join('')) / 100) * total);
            } else {
                chargedCost = (chargeForDeposit[0].interest_forfeit_charge_opt === 'Fixed') ?
                    parseFloat(chargeForDeposit[0].min_days_termination_charge.split(',').join('')) :
                    ((parseFloat(chargeForDeposit[0].min_days_termination_charge.split(',').join('')) / 100) * total);
            }

            let inv_txn = {
                txn_date: dt,
                description: 'CHARGE ON INVESTMENT TERMINATION',
                amount: Math.round(chargedCost).toFixed(2),
                is_credit: 0,
                isCharge: 1,
                created_date: dt,
                balance: Math.round(total - chargedCost).toFixed(2),
                is_capital: 0,
                isApproved: 1,
                postDone: 1,
                reviewDone: 1,
                approvalDone: 1,
                ref_no: refId,
                updated_date: dt,
                investmentId: data.investmentId,
                createdBy: data.createdBy,
                expectedTerminationDate: data.expectedTerminationDate
            };

            query = `INSERT INTO investment_txns SET ?`;
            endpoint = `/core-service/post?query=${query}`;
            url = `${HOST}${endpoint}`;
            axios.post(url, inv_txn)
                .then(function (payload) {
                    deductVatTax(HOST, data, Math.round(chargedCost).toFixed(2), inv_txn, Math.round(total - chargedCost).toFixed(2));
                    dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    refId = moment().utcOffset('+0100').format('x'); //date_modified
                    query = `UPDATE investments SET status = ${data.status},isterminated=${data.isterminate}, 
                    date_modified ='${dt.toString()}' WHERE ID =${data.investmentId}`;
                    let endpoint = "/core-service/get";
                    let url = `${HOST}${endpoint}`;
                    axios.get(url, {
                        params: {
                            query: query
                        }
                    }).then(function (_response_) {
                        if (_response_.data.status === undefined) {
                            query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE investmentId = ${data.investmentId} AND isApproved = 1`;
                            let endpoint = "/core-service/get";
                            let url = `${HOST}${endpoint}`;
                            axios.get(url, {
                                    params: {
                                        query: query
                                    }
                                })
                                .then(function (response) {
                                    if (response.data.length > 0) {
                                        let total = 0;
                                        response.data.map(x => {
                                            if (x.isApproved === 1) {
                                                let _x = x.amount.split(',').join('');
                                                if (x.is_credit.toString() === '1') {
                                                    total += parseFloat(_x);
                                                } else {
                                                    total -= parseFloat(_x);
                                                }
                                            }
                                        });
                                        query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, 
                                                    v.balance as txnBalance,v.isApproved,v.isInterestCharged,v.is_credit FROM investments t 
                                                    left join investment_products p on p.ID = t.productId
                                                    left join investment_txns v on v.investmentId = t.ID
                                                    WHERE t.ID = ${data.investmentId} AND p.status = 1`;
                                        endpoint = `/core-service/get`;
                                        url = `${HOST}${endpoint}`;
                                        axios.get(url, {
                                            params: {
                                                query: query
                                            }
                                        }).then(response_prdt_ => {
                                            console.log(response_prdt_.data);
                                            let totalInterestAmount = 0; //premature_interest_rate:
                                            let reduceInterestRateApplied = response_prdt_.data.filter(x => x.premature_interest_rate !== undefined && x.premature_interest_rate.toString() !== '0');
                                            if (reduceInterestRateApplied.length > 0) {
                                                response_prdt_.data.map(item => {
                                                    if (item.isInterestCharge === 1) {
                                                        totalInterestAmount += parseFloat(item.txnAmount.toString());
                                                    }
                                                });

                                                total = 0;
                                                response_prdt_.data.map(x => {
                                                    if (x.isApproved === 1) {
                                                        let _x = x.txnAmount.split(',').join('');
                                                        if (x.is_credit.toString() === '1') {
                                                            total += parseFloat(_x);
                                                        } else {
                                                            total -= parseFloat(_x);
                                                        }
                                                    }
                                                });
                                                refId = moment().utcOffset('+0100').format('x');
                                                inv_txn = {
                                                    txn_date: dt,
                                                    description: 'Reverse: ' + 'Interest on investment',
                                                    amount: Math.round(totalInterestAmount).toFixed(2),
                                                    is_credit: 0,
                                                    isCharge: 1,
                                                    created_date: dt,
                                                    balance: Math.round(total - totalInterestAmount).toFixed(2),
                                                    is_capital: 0,
                                                    isApproved: 1,
                                                    postDone: 1,
                                                    reviewDone: 1,
                                                    approvalDone: 1,
                                                    ref_no: `${refId}-R`,
                                                    updated_date: dt,
                                                    investmentId: data.investmentId,
                                                    createdBy: data.createdBy
                                                };

                                                query = `INSERT INTO investment_txns SET ?`;
                                                endpoint = `/core-service/post?query=${query}`;
                                                let url = `${HOST}${endpoint}`;
                                                axios.post(url, inv_txn)
                                                    .then(_payload_interest => {
                                                        query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance,
                                                                    v.isApproved,v.isInterestCharged,v.is_credit FROM investments t 
                                                                    left join investment_products p on p.ID = t.productId
                                                                    left join investment_txns v on v.investmentId = t.ID
                                                                    WHERE t.ID = ${data.investmentId} AND p.status = 1`;
                                                        endpoint = `/core-service/get`;
                                                        url = `${HOST}${endpoint}`;
                                                        axios.get(url, {
                                                            params: {
                                                                query: query
                                                            }
                                                        }).then(response_prdt_2 => {
                                                            let terminatedInterestRate = response_prdt_2.data[0].premature_interest_rate;
                                                            let monthCount = differenceInMonths(
                                                                new Date(response_prdt_2.data[0].investment_mature_date.toString()),
                                                                new Date(response_prdt_2.data[0].investment_start_date.toString())
                                                            );
                                                            totalInterestAmount = 0;
                                                            response_prdt_2.data.map(item => {
                                                                if (item.isInterestCharge === 1 && item.isApproved === 1) {
                                                                    totalInterestAmount += parseFloat(item.txnAmount.toString());
                                                                }
                                                            });

                                                            total = 0;
                                                            response_prdt_2.data.map(x => {
                                                                if (x.isApproved === 1) {
                                                                    let _x = x.txnAmount.split(',').join('');
                                                                    if (x.is_credit.toString() === '1') {
                                                                        total += parseFloat(_x);
                                                                    } else {
                                                                        total -= parseFloat(_x);
                                                                    }
                                                                }
                                                            });
                                                            let SI = (parseFloat(response_prdt_2.data[0].amount.split(',').join('')) * parseFloat(terminatedInterestRate.split(',').join('')) * (monthCount / 12)) / 100;
                                                            let _totalInterestAmount = SI * monthCount;
                                                            refId = moment().utcOffset('+0100').format('x');
                                                            inv_txn = {
                                                                txn_date: dt,
                                                                description: 'Investment termination interest',
                                                                amount: _totalInterestAmount,
                                                                is_credit: 1,
                                                                isCharge: 1,
                                                                created_date: dt,
                                                                balance: total + _totalInterestAmount,
                                                                is_capital: 0,
                                                                isApproved: 1,
                                                                postDone: 1,
                                                                reviewDone: 1,
                                                                approvalDone: 1,
                                                                ref_no: refId,
                                                                updated_date: dt,
                                                                investmentId: data.investmentId,
                                                                createdBy: data.createdBy
                                                            };

                                                            query = `INSERT INTO investment_txns SET ?`;
                                                            endpoint = `/core-service/post?query=${query}`;
                                                            let url = `${HOST}${endpoint}`;
                                                            axios.post(url, inv_txn)
                                                                .then(_payload_interest_2 => {
                                                                    let inv_txn = {
                                                                        txn_date: dt,
                                                                        description: data.description,
                                                                        amount: Math.round(total + _totalInterestAmount).toFixed(2),
                                                                        is_credit: data.is_credit,
                                                                        created_date: dt,
                                                                        balance: Math.round(total + _totalInterestAmount).toFixed(2),
                                                                        is_capital: 0,
                                                                        ref_no: refId,
                                                                        investmentId: data.investmentId,
                                                                        createdBy: data.createdBy
                                                                    };
                                                                    query = `INSERT INTO investment_txns SET ?`;
                                                                    endpoint = `/core-service/post?query=${query}`;
                                                                    url = `${HOST}${endpoint}`;
                                                                    axios.post(url, inv_txn)
                                                                        .then(function (_response) {
                                                                            if (_response.data.status === undefined) {
                                                                                query = `SELECT * FROM investment_product_requirements
                                                                                            WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
                                                                                endpoint = "/core-service/get";
                                                                                url = `${HOST}${endpoint}`;
                                                                                axios.get(url, {
                                                                                        params: {
                                                                                            query: query
                                                                                        }
                                                                                    }).then(function (response2) {
                                                                                        if (response2.data.length > 0) {
                                                                                            let result = response2.data[0];
                                                                                            let pasrsedData = JSON.parse(result.roleId);
                                                                                            pasrsedData.map(role => {
                                                                                                let invOps = {
                                                                                                    investmentId: data.investmentId,
                                                                                                    operationId: data.operationId,
                                                                                                    roleId: role,
                                                                                                    isAllRoles: result.isAllRoles,
                                                                                                    createdAt: dt,
                                                                                                    updatedAt: dt,
                                                                                                    createdBy: data.createdBy,
                                                                                                    txnId: _response.data.insertId,
                                                                                                    priority: result.priority,
                                                                                                    method: 'APPROVAL'
                                                                                                };

                                                                                                query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                                endpoint = `/core-service/post?query=${query}`;
                                                                                                url = `${HOST}${endpoint}`;
                                                                                                try {
                                                                                                    axios.post(url, invOps);
                                                                                                } catch (error) {}

                                                                                            });
                                                                                        } else {
                                                                                            let invOps = {
                                                                                                investmentId: data.investmentId,
                                                                                                operationId: data.operationId,
                                                                                                roleId: '',
                                                                                                createdAt: dt,
                                                                                                updatedAt: dt,
                                                                                                createdBy: data.createdBy,
                                                                                                txnId: _response.data.insertId,
                                                                                                method: 'APPROVAL'
                                                                                            };

                                                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                            endpoint = `/core-service/post?query=${query}`;
                                                                                            url = `${HOST}${endpoint}`;
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}
                                                                                        }
                                                                                    })
                                                                                    .catch(function (error) {});


                                                                                query = `SELECT * FROM investment_product_reviews
                                                                                            WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
                                                                                endpoint = "/core-service/get";
                                                                                url = `${HOST}${endpoint}`;
                                                                                axios.get(url, {
                                                                                        params: {
                                                                                            query: query
                                                                                        }
                                                                                    })
                                                                                    .then(function (response2) {
                                                                                        if (response2.data.length > 0) {
                                                                                            let result = response2.data[0];
                                                                                            let pasrsedData = JSON.parse(result.roleId);
                                                                                            pasrsedData.map((role) => {
                                                                                                let invOps = {
                                                                                                    investmentId: data.investmentId,
                                                                                                    operationId: data.operationId,
                                                                                                    roleId: role,
                                                                                                    isAllRoles: result.isAllRoles,
                                                                                                    createdAt: dt,
                                                                                                    updatedAt: dt,
                                                                                                    createdBy: data.createdBy,
                                                                                                    txnId: _response.data.insertId,
                                                                                                    priority: result.priority,
                                                                                                    method: 'REVIEW'
                                                                                                };

                                                                                                query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                                endpoint = `/core-service/post?query=${query}`;
                                                                                                url = `${HOST}${endpoint}`;
                                                                                                try {
                                                                                                    axios.post(url, invOps);
                                                                                                } catch (error) {}

                                                                                            });
                                                                                        } else {
                                                                                            let invOps = {
                                                                                                investmentId: data.investmentId,
                                                                                                operationId: data.operationId,
                                                                                                roleId: '',
                                                                                                createdAt: dt,
                                                                                                updatedAt: dt,
                                                                                                createdBy: data.createdBy,
                                                                                                txnId: _response.data.insertId,
                                                                                                method: 'REVIEW'
                                                                                            };

                                                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                            endpoint = `/core-service/post?query=${query}`;
                                                                                            url = `${HOST}${endpoint}`;
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}
                                                                                        }
                                                                                    })
                                                                                    .catch(function (error) {});

                                                                                query = `SELECT * FROM investment_product_posts
                                                                                            WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
                                                                                endpoint = "/core-service/get";
                                                                                url = `${HOST}${endpoint}`;
                                                                                axios.get(url, {
                                                                                        params: {
                                                                                            query: query
                                                                                        }
                                                                                    })
                                                                                    .then(function (response2) {
                                                                                        if (response2.data.length > 0) {
                                                                                            let result = response2.data[0];
                                                                                            let pasrsedData = JSON.parse(result.roleId);
                                                                                            pasrsedData.map(role => {
                                                                                                let invOps = {
                                                                                                    investmentId: data.investmentId,
                                                                                                    operationId: data.operationId,
                                                                                                    roleId: role,
                                                                                                    isAllRoles: result.isAllRoles,
                                                                                                    createdAt: dt,
                                                                                                    updatedAt: dt,
                                                                                                    createdBy: data.createdBy,
                                                                                                    txnId: _response.data.insertId,
                                                                                                    priority: result.priority,
                                                                                                    method: 'POST'
                                                                                                };

                                                                                                query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                                endpoint = `/core-service/post?query=${query}`;
                                                                                                url = `${HOST}${endpoint}`;
                                                                                                try {
                                                                                                    axios.post(url, invOps);
                                                                                                } catch (error) {}

                                                                                            });
                                                                                        } else {
                                                                                            let invOps = {
                                                                                                investmentId: data.investmentId,
                                                                                                operationId: data.operationId,
                                                                                                roleId: '',
                                                                                                createdAt: dt,
                                                                                                updatedAt: dt,
                                                                                                createdBy: data.createdBy,
                                                                                                txnId: _response.data.insertId,
                                                                                                method: 'POST'
                                                                                            };

                                                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                            endpoint = `/core-service/post?query=${query}`;
                                                                                            url = `${HOST}${endpoint}`;
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}
                                                                                        }
                                                                                    })
                                                                                    .catch(function (error) {});
                                                                                res.send({});
                                                                            } else {
                                                                                res.send({
                                                                                    status: 500,
                                                                                    error: '',
                                                                                    response: null
                                                                                });
                                                                            }
                                                                        })
                                                                        .catch(function (error) {
                                                                            res.send({
                                                                                status: 500,
                                                                                error: error,
                                                                                response: null
                                                                            });
                                                                        });
                                                                }, err => {});
                                                        }, err => {});
                                                    }, err => {});
                                            }
                                        }, err => {});
                                    } else {
                                        res.send({
                                            status: 500,
                                            error: 'Investment has no initial transaction',
                                            response: null
                                        });
                                    }
                                })
                                .catch(function (error) {
                                    res.send({
                                        status: 500,
                                        error: error,
                                        response: null
                                    });
                                });
                        } else {
                            res.send({
                                status: 500,
                                error: error,
                                response: null
                            });
                        }
                    });
                }, err => {});
        } else {

            query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance FROM investments t 
            left join investment_products p on p.ID = t.productId
            left join investment_txns v on v.investmentId = t.ID
            WHERE t.ID = ${data.investmentId} AND p.status = 1`;
            endpoint = `/core-service/get`;
            url = `${HOST}${endpoint}`;
            axios.get(url, {
                params: {
                    query: query
                }
            }).then(response_product_ => {
                chargeForDeposit = response_product_.data.filter(x => x.minimum_bal_charges !== '0' && x.minimum_bal_charges !== '');
                if (chargeForDeposit.length > 0) {
                    total = parseFloat(chargeForDeposit[0].txnBalance.split(',').join(''));
                    chargedCost = (chargeForDeposit[0].minimum_bal_charges_opt === 'Fixed') ? parseFloat(chargeForDeposit[0].minimum_bal_charges_opt.split(',').join('')) : ((parseFloat(chargeForDeposit[0].minimum_bal_charges_opt.split(',').join('')) / 100) * total);


                    inv_txn = {
                        txn_date: dt,
                        description: 'Charge: ' + 'Withdrawal below minimum balance',
                        amount: Math.round(chargedCost).toFixed(2),
                        is_credit: 0,
                        isCharge: 1,
                        created_date: dt,
                        balance: Math.round(total - chargedCost).toFixed(2),
                        is_capital: 0,
                        isApproved: 1,
                        postDone: 1,
                        reviewDone: 1,
                        approvalDone: 1,
                        ref_no: refId,
                        updated_date: dt,
                        investmentId: data.investmentId,
                        createdBy: data.createdBy
                    };

                    query = `INSERT INTO investment_txns SET ?`;
                    endpoint = `/core-service/post?query=${query}`;
                    let url = `${HOST}${endpoint}`;
                    axios.post(url, inv_txn)
                        .then(function (payload_) {
                            deductVatTax(HOST, data, Math.round(chargedCost).toFixed(2), inv_txn, Math.round(total - chargedCost).toFixed(2));
                            query = `SELECT amount,is_credit,isApproved FROM investment_txns WHERE investmentId = ${data.investmentId} AND isApproved = 1`;
                            let endpoint = "/core-service/get";
                            let url = `${HOST}${endpoint}`;
                            axios.get(url, {
                                    params: {
                                        query: query
                                    }
                                })
                                .then(function (response) {
                                    if (response.data.length > 0) {
                                        let total = 0;
                                        response.data.map(x => {
                                            if (x.isApproved === 1) {
                                                let _x = x.amount.split(',').join('');
                                                if (x.is_credit.toString() === '1') {
                                                    total += parseFloat(_x);
                                                } else {
                                                    total -= parseFloat(_x);
                                                }
                                            }
                                        });
                                        query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance,
                                                    v.isApproved,v.isInterestCharged,v.is_credit FROM investments t 
                                                    left join investment_products p on p.ID = t.productId
                                                    left join investment_txns v on v.investmentId = t.ID
                                                    WHERE t.ID = ${data.investmentId} AND p.status = 1`;
                                        endpoint = `/core-service/get`;
                                        url = `${HOST}${endpoint}`;
                                        axios.get(url, {
                                            params: {
                                                query: query
                                            }
                                        }).then(response_prdt_ => {
                                            console.log(response_prdt_.data);
                                            let totalInterestAmount = 0;
                                            let reduceInterestRateApplied = response_prdt_.data.filter(x => x.premature_interest_rate !== undefined && x.premature_interest_rate.toString() !== '0');
                                            if (reduceInterestRateApplied.length > 0) {
                                                response_prdt_.data.map(item => {
                                                    if (item.isInterestCharge.toString() === '1') {
                                                        totalInterestAmount += parseFloat(item.txnAmount.toString());
                                                    }
                                                });

                                                total = 0;
                                                response_prdt_.data.map(x => {
                                                    if (x.isApproved === 1) {
                                                        let _x = x.txnAmount.split(',').join('');
                                                        if (x.is_credit.toString() === '1') {
                                                            total += parseFloat(_x);
                                                        } else {
                                                            total -= parseFloat(_x);
                                                        }
                                                    }
                                                });
                                                refId = moment().utcOffset('+0100').format('x');
                                                inv_txn = {
                                                    txn_date: dt,
                                                    description: 'Reverse: ' + 'Interest on investment',
                                                    amount: totalInterestAmount,
                                                    is_credit: 0,
                                                    isCharge: 1,
                                                    created_date: dt,
                                                    balance: Math.round(total - totalInterestAmount).toFixed(2),
                                                    is_capital: 0,
                                                    isApproved: 1,
                                                    postDone: 1,
                                                    reviewDone: 1,
                                                    approvalDone: 1,
                                                    ref_no: `${refId}-R`,
                                                    updated_date: dt,
                                                    investmentId: data.investmentId,
                                                    createdBy: data.createdBy
                                                };

                                                query = `INSERT INTO investment_txns SET ?`;
                                                endpoint = `/core-service/post?query=${query}`;
                                                let url = `${HOST}${endpoint}`;
                                                axios.post(url, inv_txn)
                                                    .then(_payload_interest => {


                                                        // post new interest

                                                        query = `SELECT t.*,p.*,v.description,v.amount as txnAmount, v.balance as txnBalance,
                                                                    v.isApproved, v.isInterestCharged, v.is_credit FROM investments t 
                                                                    left join investment_products p on p.ID = t.productId
                                                                    left join investment_txns v on v.investmentId = t.ID
                                                                    WHERE t.ID = ${data.investmentId} AND p.status = 1`;
                                                        endpoint = `/core-service/get`;
                                                        url = `${HOST}${endpoint}`;
                                                        axios.get(url, {
                                                            params: {
                                                                query: query
                                                            }
                                                        }).then(response_prdt_2 => {
                                                            let terminatedInterestRate = response_prdt_2.data[0].premature_interest_rate;
                                                            let monthCount = differenceInMonths(
                                                                new Date(response_prdt_2.data[0].investment_mature_date.toString()),
                                                                new Date(response_prdt_2.data[0].investment_start_date.toString())
                                                            );


                                                            totalInterestAmount = 0;
                                                            response_prdt_2.data.map(item => {
                                                                if (item.isInterestCharge === 1 && item.isApproved === 1) {
                                                                    totalInterestAmount += parseFloat(item.txnAmount.toString());
                                                                }
                                                            });

                                                            total = 0;
                                                            response_prdt_2.data.map(x => {
                                                                if (x.isApproved === 1) {
                                                                    let _x = x.txnAmount.split(',').join('');
                                                                    if (x.is_credit.toString() === '1') {
                                                                        total += parseFloat(_x);
                                                                    } else {
                                                                        total -= parseFloat(_x);
                                                                    }
                                                                }
                                                            });

                                                            let SI = (parseFloat(response_prdt_2.data[0].amount.split(',').join('')) * parseFloat(terminatedInterestRate.split(',').join('')) * (monthCount / 12)) / 100;
                                                            let _totalInterestAmount = SI * monthCount;


                                                            refId = moment().utcOffset('+0100').format('x');
                                                            inv_txn = {
                                                                txn_date: dt,
                                                                description: 'Investment termination interest',
                                                                amount: _totalInterestAmount,
                                                                is_credit: 1,
                                                                isCharge: 1,
                                                                created_date: dt,
                                                                balance: total + _totalInterestAmount,
                                                                is_capital: 0,
                                                                isApproved: 1,
                                                                postDone: 1,
                                                                reviewDone: 1,
                                                                approvalDone: 1,
                                                                ref_no: refId,
                                                                updated_date: dt,
                                                                investmentId: data.investmentId,
                                                                createdBy: data.createdBy
                                                            };

                                                            query = `INSERT INTO investment_txns SET ?`;
                                                            endpoint = `/core-service/post?query=${query}`;
                                                            let url = `${HOST}${endpoint}`;
                                                            axios.post(url, inv_txn)
                                                                .then(_payload_interest_2 => {
                                                                    let inv_txn = {
                                                                        txn_date: dt,
                                                                        description: data.description,
                                                                        amount: total + _totalInterestAmount,
                                                                        is_credit: data.is_credit,
                                                                        created_date: dt,
                                                                        balance: total + _totalInterestAmount,
                                                                        is_capital: 0,
                                                                        ref_no: refId,
                                                                        investmentId: data.investmentId,
                                                                        createdBy: data.createdBy
                                                                    };
                                                                    query = `INSERT INTO investment_txns SET ?`;
                                                                    endpoint = `/core-service/post?query=${query}`;
                                                                    url = `${HOST}${endpoint}`;
                                                                    axios.post(url, inv_txn)
                                                                        .then(function (_res_ponse) {
                                                                            query = `SELECT * FROM investment_product_requirements
                                                                                    WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
                                                                            endpoint = "/core-service/get";
                                                                            url = `${HOST}${endpoint}`;
                                                                            axios.get(url, {
                                                                                    params: {
                                                                                        query: query
                                                                                    }
                                                                                })
                                                                                .then(function (response2) {
                                                                                    if (response2.data.length > 0) {
                                                                                        let result = response2.data[0];
                                                                                        let pasrsedData = JSON.parse(result.roleId);
                                                                                        pasrsedData.map(role => {
                                                                                            let invOps = {
                                                                                                investmentId: data.investmentId,
                                                                                                operationId: data.operationId,
                                                                                                roleId: role,
                                                                                                isAllRoles: result.isAllRoles,
                                                                                                createdAt: dt,
                                                                                                updatedAt: dt,
                                                                                                createdBy: data.createdBy,
                                                                                                txnId: _res_ponse.data.insertId,
                                                                                                priority: result.priority,
                                                                                                method: 'APPROVAL'
                                                                                            };

                                                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                            endpoint = `/core-service/post?query=${query}`;
                                                                                            url = `${HOST}${endpoint}`;
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}

                                                                                        });
                                                                                    } else {
                                                                                        let invOps = {
                                                                                            investmentId: data.investmentId,
                                                                                            operationId: data.operationId,
                                                                                            roleId: '',
                                                                                            createdAt: dt,
                                                                                            updatedAt: dt,
                                                                                            createdBy: data.createdBy,
                                                                                            txnId: _res_ponse.data.insertId,
                                                                                            method: 'APPROVAL'
                                                                                        };

                                                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                        endpoint = `/core-service/post?query=${query}`;
                                                                                        url = `${HOST}${endpoint}`;
                                                                                        try {
                                                                                            axios.post(url, invOps);
                                                                                        } catch (error) {}
                                                                                    }
                                                                                })
                                                                                .catch(function (error) {});


                                                                            query = `SELECT * FROM investment_product_reviews
                                                                                    WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
                                                                            endpoint = "/core-service/get";
                                                                            url = `${HOST}${endpoint}`;
                                                                            axios.get(url, {
                                                                                    params: {
                                                                                        query: query
                                                                                    }
                                                                                })
                                                                                .then(function (response2) {
                                                                                    if (response2.data.length > 0) {
                                                                                        let result = response2.data[0];
                                                                                        let pasrsedData = JSON.parse(result.roleId);
                                                                                        pasrsedData.map((role) => {
                                                                                            let invOps = {
                                                                                                investmentId: data.investmentId,
                                                                                                operationId: data.operationId,
                                                                                                roleId: role,
                                                                                                isAllRoles: result.isAllRoles,
                                                                                                createdAt: dt,
                                                                                                updatedAt: dt,
                                                                                                createdBy: data.createdBy,
                                                                                                txnId: _res_ponse.data.insertId,
                                                                                                priority: result.priority,
                                                                                                method: 'REVIEW'
                                                                                            };

                                                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                            endpoint = `/core-service/post?query=${query}`;
                                                                                            url = `${HOST}${endpoint}`;
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}

                                                                                        });
                                                                                    } else {
                                                                                        let invOps = {
                                                                                            investmentId: data.investmentId,
                                                                                            operationId: data.operationId,
                                                                                            roleId: '',
                                                                                            createdAt: dt,
                                                                                            updatedAt: dt,
                                                                                            createdBy: data.createdBy,
                                                                                            txnId: _res_ponse.data.insertId,
                                                                                            method: 'REVIEW'
                                                                                        };

                                                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                        endpoint = `/core-service/post?query=${query}`;
                                                                                        url = `${HOST}${endpoint}`;
                                                                                        try {
                                                                                            axios.post(url, invOps);
                                                                                        } catch (error) {}
                                                                                    }
                                                                                })
                                                                                .catch(function (error) {});
                                                                            query = `SELECT * FROM investment_product_posts
                                                                                    WHERE productId = ${data.productId} AND operationId = ${data.operationId} AND status = 1`;
                                                                            endpoint = "/core-service/get";
                                                                            url = `${HOST}${endpoint}`;
                                                                            axios.get(url, {
                                                                                    params: {
                                                                                        query: query
                                                                                    }
                                                                                })
                                                                                .then(function (response2) {
                                                                                    if (response2.data.length > 0) {
                                                                                        let result = response2.data[0];
                                                                                        let pasrsedData = JSON.parse(result.roleId);
                                                                                        pasrsedData.map(role => {
                                                                                            let invOps = {
                                                                                                investmentId: data.investmentId,
                                                                                                operationId: data.operationId,
                                                                                                roleId: role,
                                                                                                isAllRoles: result.isAllRoles,
                                                                                                createdAt: dt,
                                                                                                updatedAt: dt,
                                                                                                createdBy: data.createdBy,
                                                                                                txnId: _res_ponse.data.insertId,
                                                                                                priority: result.priority,
                                                                                                method: 'POST'
                                                                                            };

                                                                                            query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                            endpoint = `/core-service/post?query=${query}`;
                                                                                            url = `${HOST}${endpoint}`;
                                                                                            try {
                                                                                                axios.post(url, invOps);
                                                                                            } catch (error) {}

                                                                                        });
                                                                                    } else {
                                                                                        let invOps = {
                                                                                            investmentId: data.investmentId,
                                                                                            operationId: data.operationId,
                                                                                            roleId: '',
                                                                                            createdAt: dt,
                                                                                            updatedAt: dt,
                                                                                            createdBy: data.createdBy,
                                                                                            txnId: _res_ponse.data.insertId,
                                                                                            method: 'POST'
                                                                                        };

                                                                                        query = `INSERT INTO investment_op_approvals SET ?`;
                                                                                        endpoint = `/core-service/post?query=${query}`;
                                                                                        url = `${HOST}${endpoint}`;
                                                                                        try {
                                                                                            axios.post(url, invOps);
                                                                                        } catch (error) {}
                                                                                    }
                                                                                })
                                                                                .catch(function (error) {});
                                                                            res.send({});

                                                                        }, err => {
                                                                            res.send({
                                                                                status: 500,
                                                                                error: '',
                                                                                response: null
                                                                            });
                                                                        })
                                                                }, err => {});
                                                        }, err => {});
                                                    }, err => {});
                                            }
                                        }, err => {});
                                    }
                                })
                        }, err => {});
                }
            })
        }
    }, err => {});
});


//Select balance from investment_txns where clientId = ${req.params.id} ORDER BY ID DESC LIMIT 1