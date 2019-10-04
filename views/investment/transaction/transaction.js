var table = {};
let selectedInvestment = {};
let data_row = {};
let opsObj = {};
let product_config = {};
let offset = 0;
let isWalletPage = 1;
let sPageURL = '';
let sURLVariables = "";
let selectedOpsRequirement = [];
let clientWalletBalance = 0;
let maturityAlert = 0;
$(document).ready(function () {
    $('#bootstrap-data-table-export').DataTable();
    sPageURL = window.location.search.substring(1);
    isWalletPage = (sPageURL.includes('clientId')) ? 1 : 0;
    decideListOfAccounts(0);
    if (sPageURL !== "") {
        sURLVariables = sPageURL.split('=')[1].split('&')[0];
        if (sURLVariables !== "") {
            controlVisibility();
            bindDataTable(sURLVariables);
            let currentDate = new Date();
            let _cmax = `${currentDate.getUTCFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;
            $('#input_txn_date').attr('max', _cmax);
        }
    }
    read_write_custom(isWalletPage);
});

let products = [];
let selectedAccount = {};

function decideListOfAccounts(id) {
    selectedAccount = $('#list_accounts').select2({
        allowClear: true,
        placeholder: (id === 1) ? "Search by Name/Code" : "Search by Name",
        ajax: {
            url: `/investment-txns/investment-accounts/${id}`,
            dataType: "json",
            delay: 250,
            data: function (params) {
                params.page = (params.page === undefined || params.page === null) ? 0 : params.page;
                return {
                    limit: 10,
                    page: params.page,
                    search_string: params.term,
                    clientId: (isWalletPage === 1) ? sURLVariables : selectedInvestment.clientId,
                    excludedItem: (isWalletPage === 0) ? selectedInvestment.investmentId : 0
                };
            },
            processResults: function (data, params) {
                if (data.length > 0) {
                    products.push(...data);
                }
                params.page = params.page || 1;
                if (data.error) {
                    return {
                        results: []
                    };
                } else {
                    return {

                        results: data.map((item) => {
                            return {
                                id: item.ID,
                                text: `${item.code}-${item.productName}-(${item.name})`,
                                item: item
                            };
                        }),
                        pagination: {
                            more: params.page * 10
                        }
                    };
                }
            },
            cache: true
        }
    });
}

function getInvestmentMaturity() {
    if (isWalletPage === 0) {
        if (selectedInvestment.maturityDays === true && selectedInvestment.isClosed === 0) {
            const cBal = parseInt(selectedInvestment.txnCurrentBalance.toString().split(',').join(''));
            if (cBal !== 0) {
                if (maturityAlert === 0) {

                    $('#btnTransfer').attr('disabled', false);
                    $('#btnWithdrawal').attr('disabled', false);
                    $('#btnDeposit').attr('disabled', true);
                    $('#btnCompInterestInvestment').attr('disabled', true);
                    $('#btnTerminateInvestment').attr('disabled', true);
                    $('#chk_investment_accounts').attr('disabled', true);
                    $('#chk_own_accounts').attr('checked', false);
                    $('#chk_own_accounts').attr('disabled', true);
                    $('#chk_client_wallet').attr('checked', true);
                    $('#list_accounts').attr('disabled', true);
                    const finalTotalBalance = formater(selectedInvestment.txnCurrentBalance.toString());
                    $('#input_transfer_amount').val(finalTotalBalance);
                    $('#input_amount').val(finalTotalBalance);
                    maturityAlert = 1;
                    $('#wait').show();
                    $('#maturityAlert').attr('hidden', false);
                    if (selectedInvestment.isLastMaturedTxnExist === 0) {
                        let _mRoleId = [];
                        let mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === 2 && status === 1);
                        if (mRoleId.length === 0) {
                            _mRoleId.push({
                                roles: "[]",
                                operationId: 2
                            });
                        } else {
                            _mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === 2 && status === 1);
                        }
                        let investmentOps = {
                            amount: selectedInvestment.txnCurrentBalance,
                            description: `MOVE FUND FROM INVESTMENT ACCT. TO CLIENT'S WALLET`,
                            investmentId: selectedInvestment.investmentId,
                            code: selectedInvestment.acctNo,
                            interest_rate: selectedInvestment.interest_rate,
                            investment_mature_date: selectedInvestment.investment_mature_date,
                            investment_start_date: selectedInvestment.investment_start_date,
                            interest_moves_wallet: selectedInvestment.interest_moves_wallet,
                            is_credit: 0,
                            operationId: 2,
                            isCharge: 0,
                            is_capital: 0,
                            isApproved: 0,
                            isMoveFundTransfer: 1,
                            approvedBy: '',
                            isTransfer: 1,
                            clientId: selectedInvestment.clientId,
                            createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
                            roleIds: _mRoleId,
                            beneficialInvestmentId: selectedInvestment.investmentId,
                            productId: selectedInvestment.productId,
                            isWallet: isWalletPage,
                            isInvestmentMatured: (selectedInvestment.maturityDays === true) ? 1 : 0,
                            interest_disbursement_time: selectedInvestment.interest_disbursement_time,
                            isInvestmentTerminated: 0
                        };
                        $.ajax({
                            url: `investment-txns/compute-mature-investment`,
                            'type': 'post',
                            'data': investmentOps,
                            'success': function (data) {
                                $('#wait').hide();
                                $('#maturityAlert').attr('hidden', true);
                                table.ajax.reload(null, false);
                            },
                            'error': function (err) {
                                $('#wait').hide();
                                $('#maturityAlert').attr('hidden', true);
                            }
                        });
                    }
                }
            }
        }
    }
}

function bindWalletTransaction() {
    let url = `./investment-transactions?clientId=${selectedInvestment.clientId}&clientName=${selectedInvestment.fullname}`;
    // $(location).attr('href', url);
    window.open(url);
}

$("#chk_own_accounts").on('change',
    function () {
        let status = $('#chk_own_accounts').is(':checked');
        if (status) {
            products = [];
            $('#chk_investment_accounts').attr('checked', false);
            $('#chk_client_wallet').attr('checked', false);
            decideListOfAccounts(0);
        }
    });


$("#chk_investment_accounts").on('change',
    function () {
        let status = $('#chk_investment_accounts').is(':checked');
        if (status) {
            products = [];
            $('#chk_client_wallet').attr('checked', false);
            $('#chk_own_accounts').attr('checked', false);
            $('#list_accounts').attr('disabled', false);
            decideListOfAccounts(1);
        }
    });

$("#chk_client_wallet").on('change',
    function () {
        let status = $('#chk_client_wallet').is(':checked');
        if (status === true) {
            products = [];
            $('#chk_own_accounts').attr('checked', false);
            $('#chk_investment_accounts').attr('checked', false);
            $('#list_accounts').attr('disabled', true);
        }
    });


$("#input_transfer_amount").on("keyup", function (event) {
    let val = $("#input_transfer_amount").val();
    $("#input_transfer_amount").val(formater(val));
});

$("#input_transfer_amount").on("change", function (event) {
    validateObject($("#input_transfer_amount").val(), $("#list_accounts").val(), $("#input_transfer_description").val());
});

$("#list_accounts").on("change", function (event) {
    validateObject($("#input_transfer_amount").val(), $("#list_accounts").val(), $("#input_transfer_description").val());
});

$("#input_transfer_description").on("change", function (event) {
    validateObject($("#input_transfer_amount").val(), $("#list_accounts").val(), $("#input_transfer_description").val());
});

function validateObject(amount, account, descriotion) {
    if (amount !== '' && amount !== ' ' && account !== '' && descriotion !== '' && descriotion !== ' ') {
        $("#btnTransferModal").attr('disabled', false);
    } else {
        $("#btnTransferModal").attr('disabled', true);
    }
}


function controlVisibility() {
    if (isWalletPage === 1) {
        $('#spanProductName').html('');
        $('#spanAccountNo').html('');
        $('#lblViewInterestTxns').html('');
        $('#btnOperations').attr('hidden', true);
        $('#btnDeposit').attr('hidden', true);
        $('#lblViewWalletTxns').attr('hidden', true);

        $('#main_menu').html('Clients');
        $('#sub_menu').html('Wallet');
    }
}

function getMaturedMonths() {
    $.ajax({
        url: `investment-txns/mature-interest-months/${selectedInvestment.investmentId}`,
        'type': 'get',
        'success': function (data) {
            if (data.status === undefined) {
                $('#wait').hide();
                if (data.length > 0) {
                    $("#maturedInterestMonths").html('');
                    data.forEach((element, i) => {
                        $("#maturedInterestMonths").append(`<button id="btnCmptInt_${i}" class="dropdown-item"  onclick="onComputeInterest({startDate:'${element.startDate}',endDate:'${element.endDate}',btnName:'btnCmptInt_${i}'})">${element.startDate + ' - ' + element.endDate}</button>`).trigger('change');
                    });
                }
            }
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}

let _table = $('#bootstrap-data-table-export').DataTable();

function bindDataTable(id) {
    table = $('#bootstrap-data-table2').DataTable({
        dom: 'Blfrtip',
        destroy: true,
        bProcessing: true,
        bServerSide: true,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [{
                name: "txn_date",
                query: `ORDER BY STR_TO_DATE(v.created_date, '%Y-%m-%d') ${aoData[2].value[0].dir}`
            },
            {
                name: "txn_date",
                query: `ORDER BY STR_TO_DATE(v.txn_date, '%Y-%m-%d') ${aoData[2].value[0].dir}`
            },
            {
                name: "ref_no",
                query: `ORDER BY v.ref_no ${aoData[2].value[0].dir}`
            },
            {
                name: "description",
                query: `ORDER BY v.description ${aoData[2].value[0].dir}`
            },
            {
                name: "amount",
                query: `ORDER BY amount ${aoData[2].value[0].dir}`
            }, {
                name: "amount",
                query: `ORDER BY v.amount ${aoData[2].value[0].dir}`
            }, {
                name: "balance",
                query: `ORDER BY v.balance ${aoData[2].value[0].dir}`
            }, {
                name: "action",
                query: ``
            }
            ];
            $.ajax({
                dataType: 'json',
                type: "GET",
                url: (isWalletPage === 0) ? `/investment-service/client-investments/${id}` : `/investment-txns/client-wallets/${id}`,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value, // (isInitialLoad === true) ? aoData[3].value : offset,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    if (data.data.length > 0) {
                        selectedInvestment = data.data[data.data.length - 1];
                        if (selectedInvestment.canTerminate === 0 || selectedInvestment.canTerminate === null) {
                            $('#btnTerminateInvestment').attr('disabled', true);
                        }
                        if ((selectedInvestment.acct_allows_withdrawal === 0 || selectedInvestment.acct_allows_withdrawal === null) && isWalletPage === 0) {
                            $('#btnTransfer').attr('disabled', true);
                            $('#btnWithdrawal').attr('disabled', true);
                        }
                        if ((selectedInvestment.isMatured === 1 || selectedInvestment.isTerminated === 1 || selectedInvestment.isClosed === 1) && isWalletPage === 0) {
                            $('#btnWithdrawal').attr('disabled', true);
                            $('#btnDeposit').attr('disabled', true);
                            $('#btnCompInterestInvestment').attr('disabled', true);
                            $('#btnTerminateInvestment').attr('disabled', true);
                            // $('#btnInvestmentStatement').attr('disabled', true);
                            $('#btnComputeInterest').attr('hidden', true);
                        }
                        $("#client_name").html((isWalletPage === 1) ? sPageURL.split('=')[2].split('%20').join(' ') : data.data[0].fullname);
                        $("#inv_name").html(`${data.data[0].name} (${data.data[0].code})`);
                        $("#inv_acct_no").html(`${data.data[0].acctNo}`);
                        selectedInvestment.txnCurrentBalance = data.txnCurrentBalance;
                        selectedInvestment.isLastMaturedTxnExist = data.isLastMaturedTxnExist;
                        selectedInvestment.maturityDays = data.maturityDays;
                        selectedInvestment.balance = (data.txnCurrentBalanceWithoutInterest !== undefined) ? data.txnCurrentBalanceWithoutInterest : data.txnCurrentBalance;
                        let sign = '';
                        data.txnCurrentBalance = (data.txnCurrentBalance === null) ? '0.00' : data.txnCurrentBalance;
                        if (data.txnCurrentBalance.toString().includes('-')) {
                            sign = '-';
                            selectedInvestment.txnCurrentBalance = '-' + data.txnCurrentBalance;
                        }
                        let total_balance_ = Number(data.txnCurrentBalance.toString().split(',').join('')).toFixed(2);
                        $("#inv_bal_amount").html(`${(parseInt(total_balance_.toString()) === 0) ? '' : sign}₦${formater(total_balance_.toString())}`);

                        if (data.data[0].interest_disbursement_time === 'Up-Front' || data.data[0].interest_disbursement_time === 'End-of-Tenure') {
                            $('#btnComputeInterest').attr('hidden', true);
                        }

                        if (data.data[0].investment_mature_date === '' || data.data[0].investment_mature_date === null) {
                            $('#btnTerminateInvestment').attr('hidden', true);
                        }
                        getInvestmentMaturity();
                    } else {
                        if (sPageURL.split('=')[2] !== undefined) {
                            $("#client_name").html(sPageURL.split('=')[2].split('%20').join(' '));// replace('%20', ' '));
                            $("#inv_bal_amount").html(`₦0.00`);
                        }
                    }
                    fnCallback(data)
                },

            });
        },
        aoColumnDefs: [{
            sClass: "numericCol",
            aTargets: [5]
        },

        {
            sClass: "numericCol",
            aTargets: [7]
        },
        {
            className: "text-center",
            aTargets: [8]
        }
        ],
        columns: [{
            width: "auto",
            "mRender": function (data, type, full) {
                let strStatus = '';
                if (full.isApproved === 1 && full.postDone === 1) {
                    strStatus = 'Approved';
                } else if (full.isDeny === 1) {
                    strStatus = 'Denied';
                } else {
                    strStatus = 'Pending Approval';
                }
                return `<span class="badge badge-pill ${(full.isApproved === 1) ? 'badge-primary' : 'badge-danger'}">${strStatus}</span>`;
            }
        },
        {
            width: "auto",
            data: "created_date"
        },
        {
            width: "auto",
            data: "txn_date"
        },
        {
            data: "ref_no",
            width: "auto"
        },
        {
            data: "description",
            width: "auto"
        },
        {
            width: "auto",
            "mRender": function (data, type, full) {
                let _amount = full.amount.split(',').join('');
                return `<span style="color:green">${(full.is_credit === 1 && !full.amount.toString().includes('-')) ?
                    (formater(_amount).includes('.') ? formater(_amount) : formater(_amount) + '.00') : ""}</span>`;
            }
        }, {
            width: "auto",
            "mRender": function (data, type, full) {
                return `<span style="color:red;float: right">${(full.is_credit === 0 || full.amount.toString().includes('-')) ?
                    (formater(full.amount.split(',').join('')).includes('.') ? formater(full.amount.split(',').join('')) :
                        formater(full.amount.split(',').join('')) + '.00') : ""}</span>`;
            }
        },
        {
            width: "auto",
            "mRender": function (data, type, full) {
                let sign = '';
                if (full.txnBalance.toString().includes('-')) {
                    sign = '-';
                }
                return `<span><strong>${sign}${(formater(full.txnBalance.split(',').join('')).includes('.') ? formater(full.txnBalance.split(',').join('')) :
                    formater(full.txnBalance.split(',').join('')) + '.00')}</strong></span>`;
            }
        },
        {//selectedInvestment.isMatured === 1 || selectedInvestment.isTerminated === 1
            width: "auto",
            "mRender": function (data, type, full) {
                return `<div class="btn-group">
                            <button class="btn btn-primary btn-sm" type="button">
                                more
                            </button>
                        <button type="button" class="btn btn-sm btn-secondary dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            <span class="sr-only">Toggle Dropdown</span>
                        </button>
                        <div class="dropdown-menu">
                            <button class="dropdown-item" id="dropdownItemDoc" data-toggle="modal" data-target="#viewListDocModal">Document</button>
                            <button ${(selectedInvestment.isMatured === 1 || selectedInvestment.isTerminated === 1) ? 'disabled' : ''}  class="dropdown-item" id="dropdownItemRevert" ${(selectedInvestment.maturityDays === true) ? 'disabled' : ''} ${(full.isWallet === 1 || full.isTransfer === 1) ? 'disabled' : ''} ${(full.isDeny === 0) ? '' : 'disabled'} ${(full.postDone === 1 && full.is_capital === 0) ? '' : 'disabled'}>Reverse</button>
                            <button class="dropdown-item" id="dropdownItemReview" data-toggle="modal" data-target="#viewReviewModal" ${(full.isDeny === 0) ? '' : 'disabled'} ${(full.reviewDone === 0) ? '' : 'disabled'}>Review</button>
                            <button class="dropdown-item" id="dropdownItemApproval" data-toggle="modal" data-target="#viewListApprovalModal" ${(full.isDeny === 0) ? '' : 'disabled'} ${(full.reviewDone === 1) ? '' : 'disabled'} ${(full.approvalDone === 0) ? '' : 'disabled'}>Approval</button>
                            <button class="dropdown-item" id="dropdownItemPost" data-toggle="modal" data-target="#viewPostModal" ${(full.isDeny === 0) ? '' : 'disabled'} ${(full.reviewDone === 1 && full.approvalDone === 1) ? '' : 'disabled'} ${(full.postDone === 0) ? '' : 'disabled'}>Post</button>
                        </div>
                    </div>`;
            }
        }]
    });
}
let interestTable = {};
let statementTable = {};
let viewStatement = false;

$('#dtStatementStart').on('change',
    function () {
        let _dt = new Date($('#dtStatementStart').val());
        let _dt2 = new Date($('#dtStatementEnds').val());
        if (_dt < _dt2) {
            $('#btnStatement').attr('disabled', false);
            // bindStatementDataTable();
        } else {
            $('#btnStatement').attr('disabled', true);
        }
    });

$('#dtStatementEnds').on('change',
    function () {
        let _dt = new Date($('#dtStatementStart').val());
        let _dt2 = new Date($('#dtStatementEnds').val());
        if (_dt < _dt2) {
            $('#btnStatement').attr('disabled', false);
            // bindStatementDataTable();
        } else {
            $('#btnStatement').attr('disabled', true);
        }
    });

function bindInterestDataTable() {

    interestTable = $('#bootstrap-data-interest').DataTable({
        dom: 'Blfrtip2',
        destroy: true,
        bProcessing: true,
        bServerSide: true,
        buttons: [],
        fnServerData: function (sSource, aoData, fnCallback) {
            // if (isInitialLoad) {
            //     offset = aoData[3].value;
            // }
            let tableHeaders = [{
                name: "interestDate",
                query: `ORDER BY STR_TO_DATE(interestDate, '%Y-%m-%d') ${aoData[2].value[0].dir}`
            },
            {
                name: "amount",
                query: `ORDER BY amount ${aoData[2].value[0].dir}`
            }
            ];
            $.ajax({
                dataType: 'json',
                type: "GET",
                url: `/investment-txns/client-interests/${selectedInvestment.investmentId}`,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    fnCallback(data)
                }
            });
        },
        aoColumnDefs: [{
            sClass: "numericCol",
            aTargets: [1]
        }],
        columns: [{
            width: "auto",
            "mRender": function (data, type, full) {
                let st = new Date(full.interestDate);
                return `Balance as @${st.toDateString()} <strong>${formater(full.balance)}</strong>`;
            }
        },
        {
            width: "auto",
            "mRender": function (data, type, full) {
                return formater(full.amount);
            }
        }
        ]
    });
}

// function bindStatementDataTable() {
//     let _dt = new Date($('#dtStatementStart').val());
//     let _dt2 = new Date($('#dtStatementEnds').val());
//     statementTable = $('#bootstrap-data-statement').DataTable({
//         dom: 'Blfrtip3',
//         destroy: true,
//         bProcessing: true,
//         bServerSide: true,
//         buttons: ['excel', 'pdf', 'print'],
//         fnServerData: function (sSource, aoData, fnCallback) {
//             let tableHeaders = [{
//                     name: "updated_date",
//                     query: `ORDER BY STR_TO_DATE(v.updated_date, '%Y-%m-%d') ${aoData[2].value[0].dir}`
//                 },
//                 {
//                     name: "ref_no",
//                     query: `ORDER BY v.ref_no ${aoData[2].value[0].dir}`
//                 },
//                 {
//                     name: "description",
//                     query: `ORDER BY v.description ${aoData[2].value[0].dir}`
//                 },
//                 {
//                     name: "amount",
//                     query: `ORDER BY amount ${aoData[2].value[0].dir}`
//                 }, {
//                     name: "amount",
//                     query: `ORDER BY v.amount ${aoData[2].value[0].dir}`
//                 }, {
//                     name: "balance",
//                     query: `ORDER BY v.balance ${aoData[2].value[0].dir}`
//                 }
//             ];
//             $.ajax({
//                 dataType: 'json',
//                 type: "GET",
//                 url: `/investment-txns/investment-statements/${selectedInvestment.investmentId}`,
//                 data: {
//                     limit: aoData[4].value,
//                     offset: aoData[3].value,
//                     draw: aoData[0].value,
//                     search_string: aoData[5].value.value,
//                     order: tableHeaders[aoData[2].value[0].column].query,
//                     startDate: `${_dt.getFullYear()}-${_dt.getMonth()+1}-${_dt.getDate()}`,
//                     endDate: `${_dt2.getFullYear()}-${_dt2.getMonth()+1}-${_dt2.getDate()}`
//                 },
//                 success: function (data) {
//                     fnCallback(data)
//                 }
//             });
//         },
//         aoColumnDefs: [{
//                 sClass: "numericCol",
//                 aTargets: [3]
//             },
//             {
//                 className: "numericCol",
//                 aTargets: [5]
//             }
//         ],
//         columns: [{
//                 width: "auto",
//                 data: "updated_date"
//             },
//             {
//                 data: "ref_no",
//                 width: "auto"
//             },
//             {
//                 data: "description",
//                 width: "20%"
//             },
//             {
//                 width: "auto",
//                 "mRender": function (data, type, full) {
//                     return `<span style="color:green">${(full.is_credit === 1) ? 
//                         (formater(full.amount.split(',').join('')).includes('.')?formater(full.amount.split(',').join('')):
//                         formater(full.amount.split(',').join(''))+'.00') : ""}</span>`;
//                 }
//             }, {
//                 width: "auto",
//                 "mRender": function (data, type, full) {
//                     return `<span style="color:red;float: right">${(full.is_credit === 0) ? 
//                         (formater(full.amount.split(',').join('')).includes('.')?formater(full.amount.split(',').join('')):
//                         formater(full.amount.split(',').join(''))+'.00') : ""}</span>`;
//                 }
//             },
//             {
//                 width: "16%",
//                 "mRender": function (data, type, full) {
//                     return `<span><strong>${(formater(full.balance.split(',').join('')).includes('.')?formater(full.balance.split(',').join('')):
//                         formater(full.balance.split(',').join(''))+'.00')}</strong></span>`;
//                 }
//             }

//         ]
//     });
// }


function onViewInvestmentStatement() {
    let strUrl = `./investment-statements/${selectedInvestment.investmentId}?startDate=${$('#dtStatementStart').val()}&endDate=${$('#dtStatementEnds').val()}`;
    // $(location).attr('href', strUrl);
    window.open(strUrl);
}



function pad(d) {
    return (parseInt(d) < 10) ? '0' + d.toString() : d.toString();
}
let selectedConfig = {};
$("#idChkForceTerminate").on('change',
    function () {
        let status = $('#idChkForceTerminate').is(':checked');
        $('#notice_date').val('');
        if (status) {
            $('#notice_date').attr('disabled', true);
            $('#notice_date').val('');
        } else {
            $('#notice_date').attr('disabled', false);
            let date = new Date();
            let extendedDays = (selectedInvestment.min_days_termination !== '') ?
                parseInt(selectedInvestment.min_days_termination) :
                parseInt(selectedConfig.investment_termination_days.toString());
            date.setDate(date.getDate() + extendedDays);
            let minDate = `${date.getUTCFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
            $('#notice_date').attr('min', minDate);

            let endDate = new Date(selectedInvestment.investment_mature_date);
            endDate.setDate(endDate.getDate() - 1);
            let minDate2 = `${endDate.getUTCFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;
            $('#notice_date').attr('max', minDate2);
        }
    });

function getConfigItems() {
    $.ajax({
        url: `investment-service/get-configs`,
        'type': 'get',
        'success': function (data) {
            $('#wait').hide();
            selectedConfig = data;
            let date = new Date();
            let extendedDays = (selectedInvestment.min_days_termination !== '') ?
                parseInt(selectedInvestment.min_days_termination) :
                parseInt(selectedConfig.investment_termination_days.toString());
            date.setDate(date.getDate() + extendedDays);
            let minDate = `${date.getUTCFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
            $('#notice_date').attr('min', minDate);
            let endDate = new Date(selectedInvestment.investment_mature_date);
            endDate.setDate(endDate.getDate() - 1);
            let minDate2 = `${endDate.getUTCFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;
            $('#notice_date').attr('max', minDate2);
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}

function onTerminateInvest() {
    swal({
        title: "Are you sure?",
        text: "Once terminated, you will not be able to reverse this transaction!",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((willDelete) => {
            if (willDelete) {
                $("#idBtnTerminate").attr('disabled', true);
                let _mRoleId = [];
                let withdrawalOperation = 3;
                let mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === withdrawalOperation && status === 1);
                if (mRoleId.length === 0) {
                    _mRoleId.push({
                        roles: "[]",
                        operationId: withdrawalOperation
                    });
                } else {
                    _mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === withdrawalOperation && status === 1);
                }
                let date = new Date();
                let investmentOps = {
                    description: 'Terminate Investment',
                    is_credit: 0,
                    amount: selectedInvestment.txnCurrentBalance,
                    investmentId: selectedInvestment.investmentId,
                    isWithdrawal: 1,
                    operationId: withdrawalOperation,
                    is_capital: 0,
                    isApproved: 0,
                    status: 0,
                    isTerminated: 1,
                    isInvestmentTerminated: 1,
                    approvedBy: '',
                    isWallet: 0,
                    createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
                    roleIds: _mRoleId,
                    productId: selectedInvestment.productId,
                    isForceTerminate: ($('#notice_date').val() === '') ? 1 : (($('#idChkForceTerminate').is(':checked') === true) ? 1 : 0),
                    expectedTerminationDate: ($('#notice_date').val() === '') ? date.toLocaleString() : $('#notice_date').val(),
                    clientId: selectedInvestment.clientId
                };
                $.ajax({
                    url: `investment-txns/create`,
                    'type': 'post',
                    'data': investmentOps,
                    'success': function (data) {
                        $("#idBtnTerminate").attr('disabled', false);
                        if (data.status === undefined) {
                            $('#wait').hide();
                            $("#input_amount").val('');
                            $("#input_description").val('');
                            swal('Investment termination initiated successfully', '', 'success');
                            // bindDataTable(selectedInvestment.investmentId, false);
                            table.ajax.reload(null, false);
                        } else {
                            $('#wait').hide();
                            swal('Oops! An error occurred while executing investment termination', '', 'error');
                        }
                    },
                    'error': function (err) {
                        $("#idBtnTerminate").attr('disabled', false);
                        $('#wait').hide();
                        swal('Oops! An error occurred while executing investment termination', '', 'error');
                    }
                });
            } else {
                swal("Investment remains active!");
            }
        });
}

$(document).ready(function () { });

function getClientAccountBalance() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/investment-txns/client-wallet-balance/${selectedInvestment.clientId}`,
            'type': 'get',
            'success': function (data) {
                $('#wait').hide();
                resolve(data);
            },
            'error': function (err) {
                $('#wait').hide();
                reject(err);
            }
        });
    });
}

async function onOpenMode(name, operationId, is_credit) {

    if (name === 'Transfer') {
        // $("#chk_own_accounts").attr('checked', false);
        // $("#chk_own_accounts").attr('hidden', true);
        // $("#lbl_chk_own_accounts").attr('hidden', true);

        if (isWalletPage === 1) {
            $("#chk_client_wallet").attr('hidden', true);
            $("#lbl_chk_client_wallet").attr('hidden', true);
        }
        $('#opt_payment_made_by').attr('disabled', true);
    } else if (name === 'Withdraw') {
        $('#opt_payment_made_by').html('');
        $('#opt_payment_made_by').attr('disabled', true);
    } else if (name === 'Deposit') {
        $('#opt_payment_made_by').attr('disabled', false);
        $('#opt_payment_made_by').html('');
        const _acctBal = await getClientAccountBalance();
        clientWalletBalance = _acctBal.currentWalletBalance;
        let sign = '';
        _acctBal.balance = (_acctBal.balance === undefined || _acctBal.balance === '') ? 0.00 : _acctBal.balance;
        if (_acctBal.balance.toString().includes('-')) {
            sign = '-';
        }
        $('<option/>').val('1').html(`Wallet <strong>(₦${sign}${formater(Number(_acctBal.currentWalletBalance).toFixed(2).toString())})</strong>`).appendTo(
            '#opt_payment_made_by');
        $('<option/>').val('0').html(`Cash`).appendTo(
            '#opt_payment_made_by');
    }

    selectedInvestment._operationId = operationId;
    selectedInvestment._is_credit = is_credit;
    opsObj.is_credit = is_credit;
    opsObj.operationId = operationId;

    $("#viewOperationModalHeader").html(name + " Operation");
    $("#btnTransaction").html(name);
    $("#role_list_group").empty();

    $.ajax({
        url: `investment-txns/get-product-configs/${selectedInvestment.investmentId}`,
        'type': 'get',
        'success': function (data) {
            product_config = data[0];
            if (data.status === undefined && product_config !== undefined) {
                $('#wait').hide();
                $("#input_amount").attr('disabled', false);
                $("#input_description").attr('disabled', false);
                $("#input_txn_date").attr('disabled', false);
                let hint = '';
                if (operationId === '1') {
                    hint = `Min.: ${product_config.investment_min} - Max.: ${product_config.investment_max}`;//freq_withdrawal
                } else if (operationId === '3') {
                    hint = `Max. withdrawal#: ${product_config.freq_withdrawal} - Over.: ${product_config.withdrawal_freq_duration}`
                }
                $("#spanAmountRange").html(hint);
                $("#btnTransaction").attr('disabled', false);

            } else {
                if (isWalletPage === 1) {
                    $('#wait').hide();
                    $("#input_amount").attr('disabled', false);
                    $("#input_description").attr('disabled', false);
                    $("#input_txn_date").attr('disabled', false);
                    $("#btnTransaction").attr('disabled', false);
                } else {
                    $('#wait').hide();
                    $("#input_amount").attr('disabled', true);
                    $("#btnTransaction").attr('disabled', true);
                    $("#input_description").attr('disabled', true);
                    $("#input_txn_date").attr('disabled', true);
                    swal(`Oops! An error occurred while initiating ${name} dialog, please refresh your this page`, '', 'error');
                }
            }
        },
        'error': function (err) {
            if (isWalletPage === 1) {
                $('#wait').hide();
                $("#input_amount").attr('disabled', false);
                $("#input_description").attr('disabled', false);
                $("#input_txn_date").attr('disabled', false);
                $("#btnTransaction").attr('disabled', false);
            } else {
                $('#wait').hide();
                $("#input_amount").attr('disabled', true);
                $("#btnTransaction").attr('disabled', true);
                $("#input_description").attr('disabled', true);
                $("#input_txn_date").attr('disabled', true);
            }
        }
    });
}
$("#input_amount").on("keyup", function (event) {
    let val = $("#input_amount").val();
    $("#input_amount").val(formater(val));
});

$("#input_amount").on("focusout", function (event) {
    if (selectedInvestment._is_credit.toString() === '1') {
        let min = parseFloat(product_config.investment_min.split(',').join(''));
        let max = parseFloat(product_config.investment_max.split(',').join(''));
        let val = "";
        if (parseFloat($("#input_amount").val().split(',').join('')) < min) {
            val = "";
        } else if (parseFloat($("#input_amount").val().split(',').join('')) > max) {
            val = "";
        } else {
            val = $("#input_amount").val();
        }
        $("#input_amount").val(val);
    }
});



function setReviewRequirements(value) {
    let pbody = $("#transactionDetails");
    let tr = "";
    pbody.empty();
    tr += "<tr><td><strong>Created By</strong></td><td>" + value.createdByName + "</td></tr>";
    tr += "<tr><td><strong>Amount</strong></td><td>" + formater(value.amount) + "</td></tr>";
    tr += "<tr><td><strong>Type</strong></td><td>" + (value.is_credit === 1) ? 'Credit' : 'Debit' + "</td></tr>";
    tr += "<tr><td><strong>Dated</strong></td><td>" + value.txn_date + "</td></tr>";
    pbody.html(tr);
    $("#review_list_group").html('');
    $.ajax({
        url: `investment-txns/get-txn-user-roles/${value.ID}?method='REVIEW'&userId=${(JSON.parse(localStorage.getItem("user_obj"))).ID}`,
        'type': 'get',
        'success': function (data) {
            if (data.length > 0) {
                selectedOpsRequirement = data;
                if (data.status === undefined) {
                    $('#viewReviewModalHeader').html(data[0].description);
                    $('#viewReviewModalHeader2').html(data[0].ref_no);
                    $('#wait').hide();
                    if (data.length > 0) {
                        data.forEach((element, index) => {
                            if (element.method === 'REVIEW') {
                                $("#review_list_group").append(`<li class="list-group-item">
                                <div class="row">
                                    <div class="form-group col-6">
                                        <div class="form-group">
                                            <label class="form-control-label"><strong>${(element.role_name === null) ? 'Role Not Required' : element.role_name}</strong></label>
                                            <div class="form-control-label">
                                                <small>Amount: </small><small class="text-muted">${formater(element.amount.toString())}</small>
                                            </div>
                                            <div class="form-control-label">
                                                <small>Verified By: </small><small class="text-muted">${(element.fullname === null) ? 'Not Specified' : element.fullname}</small>
                                            </div>
                                            <div class="form-control-label">
                                                <small>Dated: </small><small class="text-muted">${element.txn_date}</small>
                                            </div>
                                            
                                        </div>
                                    </div>
                                    <div class="form-group col-6" style="vertical-align: middle">
                                        <button type="button" ${(element.isDeny === 1) ? 'disabled' : ''} ${(element.isReviewed === 1) ? 'disabled' : ''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled' : ''} class="btn btn-success btn-sm" onclick="onReviewed(${1},${element.approvalId},${element.txnId},${element.ID},0)">Review</button>
                                        <button type="button" ${(element.isDeny === 1) ? 'disabled' : ''} ${(element.isReviewed === 1) ? 'disabled' : ''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled' : ''} class="btn btn-danger btn-sm" onclick="onReviewed(${0},${element.approvalId},${element.txnId},${element.ID},1)">Deny</button>
                                    </div>
                                </div>
                            </li>`).trigger('change');
                            }
                        });
                    }
                } else {
                    $('#wait').hide();
                }
            } else {
                $('#wait').hide();
            }
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}

async function getWithdrawalStatus() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `investment-service/get-investment-withdrawal-status/${selectedInvestment.investmentId}`,
            'type': 'get',
            'success': function (data) {
                $('#wait').hide();
                resolve(data);
            },
            'error': function (err) {
                $('#wait').hide();
                resolve({});
            }
        });
    });
}


async function onExecutiveTransaction() {
    let _mRoleId = [];
    let mAmount_ = $("#input_amount").val().toString().split(',').join('');
    if (parseFloat(clientWalletBalance.toString()) < parseFloat(mAmount_) && opsObj.operationId === '1' && $('#opt_payment_made_by').val() === '1') {
        swal('Insufficent wallet balance for this transaction', '', 'error');
        return;
    } else if (parseFloat(selectedInvestment.txnCurrentBalance.toString()) < parseFloat(mAmount_) && opsObj.operationId !== '1') {
        swal('Insufficent account balance for this transaction', '', 'error');
        return;
    } else if (parseFloat(mAmount_) === 0) {
        swal('Invalid amount', '', 'error');
        return;
    }
    $("#btnTransaction").attr('disabled', true);
    if ($("#input_amount").val() !== '' &&
        $("#input_amount").val() !== ' ' &&
        $("#input_txn_date").val() !== '' &&
        $("#input_txn_date").val() !== ' ' &&
        $("#input_description").val() !== '' &&
        $("#input_description").val() !== ' ') {
        let mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === opsObj.operationId && status === 1);
        if (mRoleId.length === 0) {
            _mRoleId.push({
                roles: "[]",
                operationId: opsObj.operationId
            });
        } else {
            _mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === opsObj.operationId && status === 1);
        }
        let investmentOps = {
            amount: $("#input_amount").val(),
            description: $("#input_description").val(),
            is_credit: opsObj.is_credit,
            isWithdrawal: (opsObj.operationId === '3') ? 1 : 0,
            isDeposit: (opsObj.operationId === '1') ? 1 : 0,
            isTransfer: (opsObj.operationId === '2') ? 1 : 0,
            investmentId: (isWalletPage === 0) ? selectedInvestment.investmentId : '',
            operationId: opsObj.operationId,
            is_capital: 0,
            isApproved: 0,
            approvedBy: '',
            createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
            roleIds: _mRoleId,
            productId: selectedInvestment.productId,
            isWallet: isWalletPage,
            clientId: sURLVariables,
            txn_date: $('#input_txn_date').val(),
            isPaymentMadeByWallet: $('#opt_payment_made_by').val(),
            isInvestmentMatured: (selectedInvestment.maturityDays === true) ? 1 : 0
        };
        investmentOps.clientId = (investmentOps.isPaymentMadeByWallet === 1) ? selectedInvestment.clientId : sURLVariables;

        const canWithdrawStatus = await getWithdrawalStatus();
        if (canWithdrawStatus.canWithdraw === 1 || investmentOps.is_credit.toString() === '1' || investmentOps.isTransfer.toString() === '1' || isWalletPage === 1) {
            $.ajax({
                url: `investment-txns/create`,
                'type': 'post',
                'data': investmentOps,
                'success': function (data) {
                    $("#btnTransaction").attr('disabled', false);
                    if (data.status === undefined) {
                        $('#wait').hide();
                        $("#input_amount").val('');
                        $("#input_description").val('');
                        swal(`${(investmentOps.isDeposit === 1) ? 'Deposit' : 'Withdrawal'} transaction successful!`, '', 'success');
                        // bindDataTable(selectedInvestment.investmentId, false);
                        table.ajax.reload(null, false);
                    } else {
                        $('#wait').hide();
                        swal(`Oops! An error occurred while executing ${(investmentOps.isDeposit === 1) ? 'Deposit' : 'Withdrawal'} transaction`, '', 'error');
                    }
                },
                'error': function (err) {
                    $('#wait').hide();
                    swal(`Oops! An error occurred while executing ${(investmentOps.isDeposit === 1) ? 'Deposit' : 'Withdrawal'} transaction`, '', 'error');
                }
            });
        } else {
            $("#btnTransaction").attr('disabled', false);
            swal('Oops! Withdrawal limit exceded, please uncheck enforce count to proceed  ', '', 'error');
        }
    } else {
        $("#btnTransaction").attr('disabled', false);
        swal('Oops! Missing required field(s)', '', 'error');
    }
}

function onCreateNewAcct() {
    window.open(`/add-investments`);
}

// $('#bootstrap-data-table2 tbody').on('click', '.dropdown-item', function () {
//     data_row = table.row($(this).parents('tr')).data();
//     setApprovalRequirements(data_row);
//     setReviewRequirements(data_row);
//     setPostRequirements(data_row);
// });dropdownItemPost

$('#bootstrap-data-table2 tbody').on('click', '#dropdownItemRevert', function () {
    data_row = table.row($(this).parents('tr')).data();
    if (data_row.isReversedTxn === 1) {
        swal('You can not reverse a reversed transaction, please create a new transaction', '', 'error');
    } else {
        $.ajax({
            url: `investment-txns/check-reverse-txns/${data_row.ID}`,
            'type': 'get',
            'success': function (payload) {
                if (payload.status === undefined) {
                    if (payload.isApproved === 1) {
                        swal('Approved reversed transaction exists', '', 'error');
                    } else if (payload.isApproved === 0) {
                        swal('Pending reverse transaction exists', '', 'error');
                    } else {
                        let _iscredit = (data_row.is_credit === 1) ? 0 : 1;
                        let _operationId = (data_row.is_credit === 1) ? 3 : 1;
                        let _mRoleId = [];
                        let mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === _operationId && status === 1);
                        swal({
                            title: "Are you sure?",
                            text: "You want to reverse this transaction!",
                            icon: "warning",
                            buttons: true,
                            dangerMode: true,
                        })
                            .then((willDelete) => {
                                if (willDelete) {
                                    if (mRoleId.length === 0) {
                                        _mRoleId.push({
                                            roles: "[]",
                                            operationId: _operationId
                                        });
                                    }
                                    let comment = data_row.description.split(':');
                                    let _description = (comment.length > 1) ? comment[1] : data_row.description;
                                    let investmentOps = {
                                        amount: data_row.amount,
                                        description: `Reversal: ${_description}`,
                                        is_credit: _iscredit,
                                        investmentId: selectedInvestment.investmentId,
                                        operationId: _operationId,
                                        isCharge: 1,
                                        isDeposit: (data_row.isDeposit === 1) ? 0 : 1,
                                        isWithdrawal: (data_row.isWithdrawal === 1) ? 0 : 1,
                                        is_capital: 0,
                                        isApproved: 0,
                                        approvedBy: '',
                                        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
                                        roleIds: _mRoleId,
                                        productId: selectedInvestment.productId,
                                        isReversedTxn: 1,
                                        ref_no: data_row.ref_no,
                                        parentTxnId: data_row.ID,
                                        isWallet: data_row.isWallet,
                                        clientId: data_row.clientId
                                    };
                                    $.ajax({
                                        url: `investment-txns/create`,
                                        'type': 'post',
                                        'data': investmentOps,
                                        'success': function (data) {
                                            if (data.status === undefined) {
                                                $('#wait').hide();
                                                $("#input_amount").val('');
                                                $("#input_description").val('');
                                                swal('Transaction reversed initiated successfully!', '', 'success');
                                                // bindDataTable(selectedInvestment.investmentId, false);
                                                table.ajax.reload(null, false);
                                            } else {
                                                $('#wait').hide();
                                                swal('Oops! An error occurred while executing transaction reversal', '', 'error');
                                            }
                                        },
                                        'error': function (err) {
                                            $('#wait').hide();
                                            swal('Oops! An error occurred while executing transaction reversal', '', 'error');
                                        }
                                    });
                                } else {
                                    swal("Transaction remains active!");
                                }
                            });
                    }
                } else {
                    swal('Something went error while reversing transaction', '', 'error');
                }
            },
            'error': function (err) {
                $('#wait').hide();
            }
        });
    }
});

$('#bootstrap-data-table2 tbody').on('click', '#dropdownItemDoc', function () {
    data_row = table.row($(this).parents('tr')).data();
    $("#viewListDocModalHeader").html(data_row.description);
    $("#viewListDocModalHeader2").html(data_row.ref_no);
    getProductDocRequirements(0);
});
let reqDocumentItems = [];

function getProductDocRequirements(verify) {
    $.ajax({
        type: "GET",
        url: `investment-products/get-txn-doc-requirements/${data_row.ID}`,
        data: {},
        success: function (response) {
            reqDocumentItems = response;
            $('#wait').hide();
            $("#tbodyDocs").html('');
            $("#tbodyUploadedDocs").html('');

            $("#review_list_doc").html('');
            let uploadItemData = [];
            response.forEach(element => {
                if (verify === 0) {
                    // let item = uploadItemData.filter(x => x.txnId === element.txnId);
                    // if (item.length === 0) {
                    //     uploadItemData.push(element);

                    // }
                    let statusHtml = '';
                    if (element.status.toString() === '1') {
                        statusHtml = `<span style="color:Green"><strong>UPLOADED</strong></span>`
                    } else {
                        statusHtml = `<span style="color:Red"><strong>NOT FOUND</strong></span>`
                    }
                    $("#tbodyDocs").append(`<tr>
                    <td><span>${element.name}</span></td>
                    <td><input id="id_file_${element.id}" ${(data_row.isApproved === 1) ? 'disabled' : ''} ${(selectedInvestment.isClosed === 1) ? 'disabled' : ''} class="image admin-img" type="file" tabindex="6"></td>
                    <td>
                    ${statusHtml}
                    </td>
                    <td>
                        <button type="button" class="btn btn-primary btn-sm" ${(data_row.isApproved === 1) ? 'disabled' : ''} ${(selectedInvestment.isClosed === 1) ? 'disabled' : ''} onclick="onAddDoc(${element.id},${element.status},${element.docRequirementId},${element.txnId})">${(element.status.toString() === '1') ? 'Update' : 'Add'} File</button>
                    </td>
                </tr>`).trigger('change');

                    if (element.status.toString() === '1') {
                        $("#tbodyUploadedDocs").append(`<tr>
                        <td><span>${element.name} (<button type="button" class="btn btn-link" onclick="onViewDocFile('${element.filePath}')">View File</button>)</span></td>
                        <td>
                        ${element.createdAt}
                        </td>
                    </tr>`).trigger('change');
                    }
                } else {
                    $("#review_list_doc").append(`<li class="list-group-item">
                    <div class="row">
                        <div class="form-group col-6">
                            <div class="form-group">
                                <label class="form-control-label"><strong>Document</strong></label>
                                <div class="form-control-label">
                                    <small>File Name: </small><small class="text-muted">${element.name}</small>
                                </div>
                                <div class="form-control-label">
                                ${(element.status.toString() === '1') ?
                            `<button type="button" class="btn btn-link" onclick="onViewDocFile('${element.filePath}')">View File</button>`
                            :
                            `<a class="badge badge-light">File Not Found</a>`}                                
                                </div>
                            </div>
                        </div>
                    </div>
                </li>`).trigger('change');
                }
            });
        }
    });
}

function onViewDocFile(path) {
    window.open(`/files${path}`);
}

function onOpenMandate() {
    let mandataData = [];
    $.ajax({
        url: `investment-service/get-mandates/${selectedInvestment.investmentId}`,
        'type': 'get',
        'success': function (data) {
            let passPortData = data.filter(x => x.isPassport === 1);
            let signatureData = data.filter(x => x.isSignature === 1);
            let instructionData = data.filter(x => x.isInstruction === 1);
            mandataData.push(...passPortData);
            mandataData.push(...signatureData);
            mandataData.push(...instructionData);
            let htmlTags = '';
            mandataData.forEach(item => {
                let type_ = '';
                let path = '';
                if (item.isInstruction === 1) {
                    type_ = "Instruction";
                    path = item.instruction;
                } else if (item.isPassport === 1) {
                    type_ = "Passport";
                    path = item.passportPath;
                } else if (item.isSignature === 1) {
                    type_ = "Signature";
                    path = item.signaturePath;
                }
                htmlTags += `<tr>
                    <td><strong>${type_}</strong></td>
                    <td>${item.name}</td>
                    <td><div class="button" style="text-decoration: underline" onclick="onViewPassport('${path}',${item.isInstruction}, '${item.name}')">View</div></td>
                </tr>`
            });
            $("#idListMandates").html(htmlTags);
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}

function onViewPassport(path, statusImage, title) {
    if (statusImage === 1) {
        swal({
            title: title,
            text: path
        });
    } else {
        window.open(`/files${path}`);
    }
}


async function onAddDoc(id, status, docRequirementId, txnId) {
    if ($(`#id_file_${id}`)[0].files[0] !== undefined) {
        let dt = new Date();
        let imgId = `${dt.getFullYear()}${dt.getMonth()}${dt.getDate()}${dt.getHours()}${dt.getMinutes()}${dt.getSeconds()}${dt.getMilliseconds()}`;
        let ext_ = $(`#id_file_${id}`)[0].files[0].type.split('/')[1];
        ext_ = (ext_ === 'jpeg') ? 'jpg' : ext_;
        let filePath = `/organisations/investment-doc/${imgId}.${ext_}`;
        let uploadItem = await upload('organisations', 'investment-doc', $(`#id_file_${id}`)[0].files[0], imgId);
        if (uploadItem === 1) {
            let updateData = {
                id: id,
                status: 1,
                filePath: filePath,
                isReplaced: status,
                docRequirementId: docRequirementId,
                txnId: txnId
            };
            uploadDocRequirement(updateData);
        } else {
            swal('Oops! An error occurred while uploading file', '', 'error');
        }
    }
}

function upload(parentFolder, subFolderName, file, imgId) {
    return new Promise((resolve, reject) => {
        let formData = new FormData();
        formData.append('file', file);
        $.ajax({
            url: `/investment-service/upload-file/${imgId}/${parentFolder}/${subFolderName}`,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                resolve(1)
            },
            error: function () {
                reject(error);
            }
        });
    });
}

function uploadDocRequirement(data) {
    $.ajax({
        url: `/investment-products/update-txn-doc-requirements`,
        type: "POST",
        data: data,
        success: function (response) {
            $('#wait').hide();
            swal('File uploaded successfully!', '', 'success');
            getProductDocRequirements(0);
        },
        error: function () {
            $('#wait').hide();
            swal('Oops! An error occurred while uploading file', '', 'error');
        }
    });
}



$('#bootstrap-data-table2 tbody').on('click', '#dropdownItemReview', function () {
    data_row = table.row($(this).parents('tr')).data();
    let mOperationId = 0;
    if (data_row.isDeposit === 1) {
        mOperationId = 1;
    } else if (data_row.isTransfer === 1) {
        mOperationId = 2;
    } else if (data_row.isWithdrawal === 1) {
        mOperationId = 3;
    }
    $("#post_list_group").html('');
    $.ajax({
        url: `investment-txns/verify-doc-uploads?productId=${data_row.productId}&operationId=${mOperationId}&txnId=${data_row.ID}`,
        'type': 'get',
        'success': function (data) {
            if (data.status === undefined) {
                if (data[0].total_doc_required === data[0].total_uploaded) {
                    setReviewRequirements(data_row);
                    getProductDocRequirements(1);
                } else {
                    swal('Oops! Please kindly upload required document(s) before REVIEW', '', 'error');
                }
            }
        }
    });
    // else {
    //     setReviewRequirements(data_row);
    //     getProductDocRequirements(1);
    // }
});

$('#bootstrap-data-table2 tbody').on('click', '#dropdownItemApproval', function () {
    data_row = table.row($(this).parents('tr')).data();
    setApprovalRequirements(data_row);
});

$('#bootstrap-data-table2 tbody').on('click', '#dropdownItemPost', function () {
    data_row = table.row($(this).parents('tr')).data();
    setPostRequirements(data_row);
});

function setApprovalRequirements(value) {
    $("#role_list_group").html('');
    $.ajax({
        url: `investment-txns/get-txn-user-roles/${value.ID}?method='APPROVAL'&userId=${(JSON.parse(localStorage.getItem("user_obj"))).ID}`,
        'type': 'get',
        'success': function (data) {
            selectedOpsRequirement = data;
            if (data.length > 0) {
                if (data.status === undefined) {
                    $('#viewListApprovalModalHeader').html(data[0].description);
                    $('#viewListApprovalModalHeader2').html(data[0].ref_no);
                    $('#wait').hide();
                    if (data.length > 0) {
                        data.forEach(element => {
                            if (element.method === 'APPROVAL') {
                                $("#role_list_group").append(`<li class="list-group-item">
                                <div class="row">
                                    <div class="form-group col-6">
                                        <div class="form-group">
                                            <label class="form-control-label"><strong>${(element.role_name === null) ? 'Role Not Required' : element.role_name}</strong></label>
                                            <div class="form-control-label">
                                                <small>Amount: </small><small class="text-muted">${formater(element.amount.toString())}</small>
                                            </div>
                                            <div class="form-control-label">
                                                <small>Verified By: </small><small class="text-muted">${(element.fullname === null) ? 'Not Specified' : element.fullname}</small>
                                            </div>
                                            <div class="form-control-label">
                                                <small>Dated: </small><small class="text-muted">${element.txn_date}</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group col-6" style="vertical-align: middle">
                                        <button type="button" ${(element.isDeny === 1) ? 'disabled' : ''} ${(element.isApproved === 1) ? 'disabled' : ''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled' : ''} class="btn btn-success btn-sm" onclick="onApproved(${1},${element.approvalId},${element.txnId},${element.ID},0)">Approve</button>
                                        <button type="button" ${(element.isDeny === 1) ? 'disabled' : ''} ${(element.isApproved === 1) ? 'disabled' : ''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled' : ''} class="btn btn-danger btn-sm" onclick="onApproved(${0},${element.approvalId},${element.txnId},${element.ID},1)">Deny</button>
                                    </div>
                                </div>
                            </li>`).trigger('change');
                            }
                        });
                    }
                } else {
                    $('#wait').hide();
                }
            } else {
                $('#wait').hide();
            }
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}

function setPostRequirements(value) {
    $("#post_list_group").html('');
    $.ajax({
        url: `investment-txns/get-txn-user-roles/${value.ID}?method='POST'&userId=${(JSON.parse(localStorage.getItem("user_obj"))).ID}`,
        'type': 'get',
        'success': function (data) {
            if (data.status === undefined) {
                $('#viewPostModalHeader').html(data[0].description);
                $('#viewPostModalHeader2').html(data[0].ref_no);
                $('#wait').hide();
                if (data.length > 0) {
                    selectedOpsRequirement = data;
                    data.forEach(element => {
                        if (element.method === 'POST') {
                            $("#post_list_group").append(`<li class="list-group-item">
                            <div class="row">
                                <div class="form-group col-8">
                                    <div class="form-group">
                                        <label class="form-control-label"><strong>${(element.role_name === null) ? 'Role Not Required' : element.role_name}</strong></label>
                                        <div class="form-control-label">
                                            <small>Amount: </small><small class="text-muted">${formater(element.amount.toString())}</small>
                                        </div>
                                        <div class="form-control-label">
                                            <small>Verified By: </small><small class="text-muted">${(element.fullname === null) ? 'Not Specified' : element.fullname}</small>
                                        </div>
                                        <div class="form-control-label">
                                            <small>Transaction Dated: </small><small class="text-muted">${element.txn_date}</small>
                                        </div>
                                        
                                    </div>
                                </div>
                                <div class="form-group col-4" style="vertical-align: middle">
                                    <button type="button" ${(element.isDeny === 1) ? 'disabled' : ''} ${(element.isPosted === 1) ? 'disabled' : ''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled' : ''} class="btn btn-success btn-sm" onclick="onPost(${1},${element.approvalId},${element.txnId},${element.ID},0)">Post</button>
                                    <button type="button" ${(element.isDeny === 1) ? 'disabled' : ''} ${(element.isPosted === 1) ? 'disabled' : ''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled' : ''} class="btn btn-danger btn-sm" onclick="onPost(${0},${element.approvalId},${element.txnId},${element.ID},1)">Deny</button>
                                </div>
                            </div>
                        </li>`).trigger('change');
                        }
                    });
                }
            } else {
                $('#wait').hide();
            }
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}

function onCloseApproval() {
    $("#role_list_group").html('');
}

function onApproved(value, approvedId, txnId, id, isDeny) {

    if (data_row.is_credit === 0) {
        const _mAmt = data_row.amount.toString().split(',').join('');
        const _mBal = data_row.txnBalance.toString().split(',').join('');
        if (parseFloat(_mAmt) > parseFloat(_mBal)) {
            swal(`Oops! Client has insufficient balance to carry out this transaction`, '', 'error');
            return;
        }
    }

    let priority = selectedOpsRequirement.find(x => x.ID === id).priority;
    let _data = {
        status: value,
        id: approvedId,
        txnId: txnId,
        isCredit: data_row,
        amount: data_row.amount,
        balance: data_row.txnBalance,
        userId: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        priority: priority,
        isDeny: isDeny
    }
    $.ajax({
        url: `investment-txns/approves`,
        'type': 'post',
        'data': _data,
        'success': function (data) {
            if (data.status === undefined) {
                $('#wait').hide();
                swal('Approved successfully!', '', 'success');
                $("#role_list_group").html('');
                setApprovalRequirements(data_row);
                // bindDataTable(selectedInvestment.investmentId, false);
                table.ajax.reload(null, false);
            } else {
                $('#wait').hide();
                swal('Oops! An error occurred while executing action', '', 'error');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Oops! An error occurred while  executing action', '', 'error');
        }
    });
}

function onReviewed(value, approvedId, txnId, id, isDeny) {
    let priority = selectedOpsRequirement.find(x => x.ID === id).priority;
    if (data_row.is_credit === 0) {
        const _mAmt = data_row.amount.toString().split(',').join('');
        const _mBal = data_row.txnBalance.toString().split(',').join('');
        if (parseFloat(_mAmt) > parseFloat(_mBal)) {
            swal(`Oops! Client has insufficient balance to carry out this transaction`, '', 'error');
            return;
        }
    }


    let _data = {
        status: value,
        id: approvedId,
        txnId: txnId,
        isCredit: data_row.is_credit,
        amount: data_row.amount,
        balance: data_row.txnBalance,
        userId: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        priority: priority,
        isDeny: isDeny
    }
    $.ajax({
        url: `investment-txns/reviews`,
        'type': 'post',
        'data': _data,
        'success': function (data) {
            if (data.status === undefined) {
                $('#wait').hide();
                swal('Reviewed successfully!', '', 'success');
                $("#review_list_group").html('');
                setReviewRequirements(data_row);
                table.ajax.reload(null, false);
            } else {
                $('#wait').hide();
                swal('Oops! An error occurred while executing action', '', 'error');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Oops! An error occurred while  executing action', '', 'error');
        }
    });
}

function onTransactionTimeline() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    let splittedDate = selectedInvestment.invCreatedAt.split(' ');
    let dt = new Date(selectedInvestment.invCreatedAt);
    $('#idInvestmentCreator').html(selectedInvestment.invCreator);
    $('#idInvestmentCreatedAt').html(`${dt.getDate()} ${monthNames[dt.getMonth()]}, ${dt.getFullYear()} ${splittedDate[1]} ${splittedDate[2].toUpperCase()}`);
    let timelineTags = '';
    $.ajax({
        url: `investment-txns/transaction-timelines/${selectedInvestment.investmentId}`,
        'type': 'get',
        'success': function (data) {
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const _splittedDate = element.createdAt.split(' ');
                const _dt = new Date(element.createdAt);

                element.method = element.method.toUpperCase();
                timelineTags += `<li>
                                            <a target="_blank">${element.method} OPERATION</a>
                                            <a href="#" class="float-right">${_dt.getDate()} ${monthNames[_dt.getMonth()]}, ${_dt.getFullYear()} ${_splittedDate[1]} ${_splittedDate[2].toUpperCase()}</a>
                                            <p><strong>Transaction by: </strong><span>${element.createdByName}</span><br/>
                                            <strong>Description: </strong><span>${element.description}</span>
                                            </p>
                                        </li>`;
            }
            $('#idTimeLine').html(timelineTags);
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}



function onPost(value, approvedId, txnId, id, isDeny) {
    if (data_row.is_credit === 0) {
        const _mAmt = data_row.amount.toString().split(',').join('');
        const _mBal = data_row.txnBalance.toString().split(',').join('');
        if (parseFloat(_mAmt) > parseFloat(_mBal)) {
            swal(`Oops! Client has insufficient balance to carry out this transaction`, '', 'error');
            return;
        }
    }
    let priority = selectedOpsRequirement.find(x => x.ID === id).priority;
    let _data = {
        status: value,
        id: approvedId,
        method: 'POST',
        txnId: txnId,
        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        productId: selectedInvestment.productId,
        code: selectedInvestment.acctNo,
        isCredit: data_row.is_credit,
        amount: data_row.amount,
        balance: data_row.txnBalance,
        isTransfer: data_row.isTransfer,
        beneficialInvestmentId: data_row.beneficialInvestmentId,
        description: data_row.description,
        investmentId: data_row.investmentId,
        userId: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        isReversedTxn: data_row.isReversedTxn,
        refId: data_row.ref_no,
        isInvestmentTerminated: data_row.isInvestmentTerminated,
        isForceTerminate: data_row.isForceTerminate,
        expectedTerminationDate: data_row.expectedTerminationDate,
        created_date: data_row.created_date,
        isMoveFundTransfer: data_row.isMoveFundTransfer,
        isWallet: data_row.isWallet,
        clientId: (isWalletPage === 1) ? sURLVariables : data_row.clientId,
        isPaymentMadeByWallet: data_row.isPaymentMadeByWallet,
        priority: priority,
        isDeny: isDeny,
        isPaymentMadeByWallet: data_row.isPaymentMadeByWallet,
        interest_disbursement_time: data_row.interest_disbursement_time,
        interest_moves_wallet: data_row.interest_moves_wallet,
        is_capital: data_row.is_capital,
        investment_mature_date: data_row.investment_mature_date,
        investment_start_date: data_row.investment_start_date,
        interest_rate: (data_row.isInvestmentTerminated === 1) ? data_row.premature_interest_rate : data_row.interest_rate,
        isInvestmentMatured: data_row.isInvestmentMatured,
        useTxnDateAsPostDate: 1,
        investment_mature_date: selectedInvestment.investment_mature_date,
        investment_start_date: selectedInvestment.investment_start_date,
        txn_date: data_row.txn_date
    }
    $.ajax({
        url: `investment-txns/posts`,
        'type': 'post',
        'data': _data,
        'success': function (data) {
            if (data.status === undefined) {
                $('#wait').hide();
                swal('Posted successfully!', '', 'success');
                $("#post_list_group").html('');
                setPostRequirements(data_row);
                // bindDataTable(selectedInvestment.investmentId, false);
                table.ajax.reload(null, false);
            } else {
                $('#wait').hide();
                swal('Oops! An error occurred while executing action', '', 'error');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Oops! An error occurred while  executing action', '', 'error');
        }
    });
}

function onComputeInterest(value) {
    $(`#${value.btnName}`).attr('disabled', true);
    let _data = {
        interest_moves_wallet: selectedInvestment.interest_moves_wallet,
        clientId: selectedInvestment.clientId,
        investmentId: selectedInvestment.investmentId,
        investment_start_date: selectedInvestment.investment_start_date,
        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        productId: selectedInvestment.productId,
        startDate: value.startDate,
        endDate: value.endDate,
        interest_rate: selectedInvestment.interest_rate
    }
    $.ajax({
        url: `investment-txns/compute-interest`,
        'type': 'post',
        'data': _data,
        'success': function (data) {
            $(`#${value.btnName}`).attr('disabled', false);
            if (data.status === undefined) {
                $('#wait').hide();
                swal('Interest computed successfully', '', 'success');
                $("#maturedInterestMonths").html('');
                table.ajax.reload(null, true);
            } else {
                $('#wait').hide();
                swal('Oops! An error occurred while computing interest', '', 'error');
            }
        },
        'error': function (err) {
            $(`#${value.btnName}`).attr('disabled', false);
            $('#wait').hide();
            swal('Oops! An error occurred while computing interest', '', 'error');
        }
    });
}
///transfer-fund-wallet
function onFundWalletOperation() {
    let amount = $("#input_transfer_amount").val();
    let desc = $("#input_transfer_description").val();
    // selectedAccount = products.find(x => x.ID.toString() === $("#list_accounts").val());
    let _mRoleId = [];
    let mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === 2 && status === 1);
    if (mRoleId.length === 0) {
        _mRoleId.push({
            roles: "[]",
            operationId: 2
        });
    } else {
        _mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === 2 && status === 1);
    }
    let investmentOps = {
        amount: amount,
        description: `MOVE FUND FROM INVESTMENT ACCT. TO CLIENT'S WALLET`,
        investmentId: selectedInvestment.investmentId,
        is_credit: 0,
        operationId: 2,
        isCharge: 0,
        is_capital: 0,
        isApproved: 0,
        isMoveFundTransfer: 1,
        approvedBy: '',
        isTransfer: 1,
        clientId: selectedInvestment.clientId,
        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        roleIds: _mRoleId,
        beneficialInvestmentId: selectedInvestment.investmentId,
        productId: selectedInvestment.productId,
        isWallet: isWalletPage,
        isInvestmentMatured: (selectedInvestment.maturityDays === true) ? 1 : 0
    };
    $.ajax({
        url: `investment-txns/create`,
        'type': 'post',
        'data': investmentOps,
        'success': function (data) {
            $('#wait').hide();
            swal('Transfer operation initiated successfully', '', 'success');
            $("#input_transfer_amount").val('');
            $("#input_transfer_description").val('');
            $("#chk_own_accounts").attr('checked', false);
            $("#chk_investment_accounts").attr('checked', false);
            $("#chk_client_wallet").attr('checked', false);
            $("#list_accounts").val(null).trigger('change');
            table.ajax.reload(null, false);
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Something went wrong while executing transfer operation', '', 'error');
        }
    });
}




function onTransferOperation() {
    let amount = $("#input_transfer_amount").val();
    let mAmount_ = amount.toString().split(',').join('');
    if (parseFloat(selectedInvestment.balance.toString()) < parseFloat(mAmount_)) {
        swal('Insufficent balance', '', 'error');
        return;
    } else if (parseFloat(amount) === 0) {
        swal('Invalid amount', '', 'error');
        return;
    }

    $("#btnTransferModal").attr('disabled', true);

    if ($('#chk_client_wallet').is(':checked') === true) {
        onFundWalletOperation();
        $("#btnTransferModal").attr('disabled', false);
    } else {
        let desc = $("#input_transfer_description").val();
        selectedAccount = products.find(x => x.ID.toString() === $("#list_accounts").val());
        let _mRoleId = [];
        let mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === 2 && status === 1);
        if (mRoleId.length === 0) {
            _mRoleId.push({
                roles: "[]",
                operationId: 2
            });
        } else {
            _mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === 2 && status === 1);
        }
        let investmentOps = {
            amount: amount,
            description: `TRANSFER BETWEEN CLIENTS ACCOUNT; TRANSFER FROM : ${(isWalletPage === 1) ? sPageURL.split('=')[2].split('%20').join(' ') : `${selectedInvestment.acctNo} (${selectedInvestment.fullname})`} TO ${selectedAccount.code}(${selectedAccount.name})`,
            investmentId: (isWalletPage === 0) ? selectedInvestment.investmentId : '',
            is_credit: 0,
            operationId: 2,
            isCharge: 0,
            is_capital: 0,
            isApproved: 0,
            isTransfer: 1,
            approvedBy: '',
            createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
            roleIds: _mRoleId,
            beneficialInvestmentId: selectedAccount.ID,
            productId: selectedInvestment.productId,
            isWallet: isWalletPage,
            clientId: (isWalletPage === 1) ? sURLVariables : selectedAccount.clientId
        };
        $.ajax({
            url: `investment-txns/create`,
            'type': 'post',
            'data': investmentOps,
            'success': function (data) {
                $("#btnTransferModal").attr('disabled', false);
                $('#wait').hide();
                swal('Transfer operation initiated successfully', '', 'success');
                $("#input_transfer_amount").val('');
                $("#input_transfer_description").val('');
                $("#chk_own_accounts").attr('checked', false);
                $("#chk_investment_accounts").attr('checked', false);
                $("#chk_client_wallet").attr('checked', false);
                $("#list_accounts").val(null).trigger('change');
                table.ajax.reload(null, false);
            },
            'error': function (err) {
                $("#btnTransferModal").attr('disabled', false);
                $('#wait').hide();
                swal('Something went wrong while executing transfer operation', '', 'error');
            }
        });
    }
}

function onTransferToInvestments(amount, desc, is_credit, investmentId) {
    new Promise((resolve, reject) => {
        let _mRoleId = [];
        let mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === 2 && status === 1);
        if (mRoleId.length === 0) {
            _mRoleId.push({
                roles: "[]",
                operationId: 2
            });
        } else {
            _mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === 2 && status === 1);
        }
        let investmentOps = {
            amount: amount,
            description: desc,
            is_credit: is_credit,
            investmentId: investmentId,
            is_capital: 0,
            isApproved: 0,
            approvedBy: '',
            createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
            roleIds: _mRoleId,
            operationId: 2,
            productId: selectedAccount.productId
        };
        $.ajax({
            url: `investment-txns/create`,
            'type': 'post',
            'data': investmentOps,
            'success': function (data) {
                if (data.status === undefined) {
                    resolve(data);
                } else {
                    reject(data);
                }
            },
            'error': function (err) {
                reject(data);
            }
        });
    });
}

// function onTransferOperation() {
//     try {
//         selectedAccount = products.find(x => x.ID.toString() === $("#list_accounts").val());
//         $('#wait').show();
//         let sender = onTransferOperation($("#input_transfer_amount").val(),
//             $("#input_transfer_description").val(),
//             0,
//             selectedInvestment.investmentId);
//         if (sender.status === undefined) {
//             let receiver = onTransferOperation($("#input_transfer_amount").val(),
//                 $("#input_transfer_description").val(),
//                 1,
//                 selectedAccount.ID);
//             if (receiver.status === undefined) {
//                 $('#wait').hide();
//                 swal('Transfer operation completed successfully', '', 'success');
//                 $(".input").val('');
//                 table.ajax.reload(null, true);
//             } else {
//                 $('#wait').hide();
//             }
//         } else {
//             $('#wait').hide();
//         }
//     } catch (error) {
//         $('#wait').hide();
//         swal('Something went wrong while executing transfer operation', '', 'error');
//     }
// }

function read_write_custom(isWalletPage) {
    let perms = JSON.parse(localStorage.getItem("permissions"));
    let lblViewWalletTxns = ($.grep(perms, function (e) { return e.module_name === 'lblViewWalletTxns'; }))[0];
    let investment_transactions = ($.grep(perms, function (e) { return e.module_name === 'client-investment-transactions'; }))[0];
    let investment_wallet = ($.grep(perms, function (e) { return e.module_name === 'client-investment-wallet'; }))[0];
    let btnMandateInvestment = ($.grep(perms, function (e) { return e.module_name === 'btnMandateInvestment'; }))[0];
    let btnInvestmentStatement = ($.grep(perms, function (e) { return e.module_name === 'btnInvestmentStatement'; }))[0];
    let btnComputeInterest = ($.grep(perms, function (e) { return e.module_name === 'btnComputeInterest'; }))[0];
    let btnTransfer = ($.grep(perms, function (e) { return e.module_name === 'btnTransfer'; }))[0];
    let btnWithdrawal = ($.grep(perms, function (e) { return e.module_name === 'btnWithdrawal'; }))[0];
    let btnDeposit = ($.grep(perms, function (e) { return e.module_name === 'btnDeposit'; }))[0];
    $('#btnMandateInvestment').hide();
    if (btnMandateInvestment && btnMandateInvestment['read_only'] === '1') $('#btnMandateInvestment').show();
    $('#btnInvestmentStatement').hide();
    if (btnInvestmentStatement && btnInvestmentStatement['read_only'] === '1') $('#btnInvestmentStatement').show();
    $('#btnComputeInterest').hide();
    if (btnComputeInterest && btnComputeInterest['read_only'] === '1') $('#btnComputeInterest').show();
    $('#btnTransfer').hide();
    if (btnTransfer && btnTransfer['read_only'] === '1') $('#btnTransfer').show();
    $('#btnWithdrawal').hide();
    if (btnWithdrawal && btnWithdrawal['read_only'] === '1') $('#btnWithdrawal').show();
    $('#btnDeposit').hide();
    if (btnDeposit && btnDeposit['read_only'] === '1') $('#btnDeposit').show();
    $('#lblViewWalletTxns').hide();
    if (lblViewWalletTxns && lblViewWalletTxns['read_only'] === '1') $('#lblViewWalletTxns').show();
    if (isWalletPage === 1) {
        if (!investment_wallet || investment_wallet['read_only'] !== '1') return window.location.href = '/';
    } else {
        if (!investment_transactions || investment_transactions['read_only'] !== '1') return window.location.href = '/';
    }
}