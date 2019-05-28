var table = {};
let selectedInvestment = {};
let data_row = {};
let opsObj = {};
let product_config = {};
let offset = 0;
let isWalletPage = 1;
let sPageURL = '';
$(document).ready(function () {
    console.log('Entering transactions')
    $('#bootstrap-data-table-export').DataTable();
    sPageURL = window.location.search.substring(1);
    isWalletPage = (sPageURL.includes('clientId')) ? 1 : 0;
    console.log(sPageURL);
    decideListOfAccounts(0);
    if (sPageURL !== "") {
        var sURLVariables = sPageURL.split('=')[1].split('&')[0];
        console.log(sURLVariables);
        if (sURLVariables !== "") {
            controlVisibility();
            bindDataTable(sURLVariables);
        }
    }

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
                    clientId: selectedInvestment.clientId
                };
            },
            processResults: function (data, params) {
                console.log(data);
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

                        results: data.map(function (item) {
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

$("#chk_own_accounts").on('change',
    function () {
        let status = $('#chk_own_accounts').is(':checked');
        console.log('Wallet checked');
        if (status) {
            products = [];
            $('#chk_investment_accounts').attr('checked', false);
            decideListOfAccounts(0);
        }
    });


$("#chk_investment_accounts").on('change',
    function () {
        let status = $('#chk_investment_accounts').is(':checked');
        console.log('list of investments');
        if (status) {
            products = [];
            $('#chk_own_accounts').attr('checked', false);
            decideListOfAccounts(1);
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
        $('#lblViewInterestTxns').html('');
        $('#btnOperations').attr('hidden', true);

        $('#btnWithdrawal').attr('hidden', true);
        $('#btnDeposit').attr('hidden', true);

        $('#main_menu').html('Clients');
        $('#sub_menu').html('Wallet');
    } else {
        // $('#btnTransfer').attr('hidden', true);
        // $('#lblViewInterestTxns').html('');
    }
}

function getMaturedMonths() {
    console.log("Zjn fbhjkefed ", selectedInvestment.investmentId);
    $.ajax({
        url: `investment-txns/mature-interest-months/${selectedInvestment.investmentId}`,
        'type': 'get',
        'success': function (data) {
            if (data.status === undefined) {
                $('#wait').hide();
                if (data.length > 0) {
                    $("#maturedInterestMonths").html('');
                    data.forEach(element => {
                        $("#maturedInterestMonths").append(`<button class="dropdown-item"  onclick="onComputeInterest({day:${element.day},month:${element.month},year:${element.year}})">${element.month+'/'+element.year}</button>`).trigger('change');
                    });
                }
            }
        },
        'error': function (err) {
            console.log(err);
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
            // if (isInitialLoad) {
            //     offset = aoData[3].value;
            // }
            let tableHeaders = [{
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
                    console.log(data);
                    if (data.data.length > 0) {
                        selectedInvestment = data.data[0];
                        console.log(data.data[0]);
                        if (selectedInvestment.isMatured === 1 || selectedInvestment.isTerminated === 1) {
                            $('#btnWithdrawal').attr('disabled', true);
                            $('#btnDeposit').attr('disabled', true);
                            $('#btnCompInterestInvestment').attr('disabled', true);
                            $('#btnTerminateInvestment').attr('disabled', true);
                            $('#btnInvestmentStatement').attr('disabled', true);
                        }
                        $("#client_name").html(data.data[0].fullname);
                        $("#inv_name").html(`${data.data[0].name} (${data.data[0].code})`);
                        $("#inv_bal_amount").html(`${formater(data.data[data.data.length - 1].balance)}`);

                    } else {
                        $("#client_name").html(sPageURL.split('=')[2]);
                        // $("#inv_name").html(`${data.data[0].name} (${data.data[0].code})`);
                        $("#inv_bal_amount").html(`0.00`);
                    }
                    fnCallback(data)
                }
            });
        },
        aoColumnDefs: [{
                sClass: "numericCol",
                aTargets: [4]
            },

            {
                sClass: "numericCol",
                aTargets: [6]
            },
            {
                className: "text-center",
                aTargets: [7]
            }
        ],
        columns: [{
                width: "auto",
                "mRender": function (data, type, full) {
                    return `<span class="badge badge-pill ${(full.isApproved===1)?'badge-primary':'badge-danger'}">${(full.isApproved===1)?'Approved':'Pending Approval'}</span>`;
                }
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
                    return `<span style="color:green">${(full.is_credit === 1) ? 
                        (formater(_amount).includes('.')?formater(_amount): formater(_amount)+'.00') : ""}</span>`;
                }
            }, {
                width: "auto",
                "mRender": function (data, type, full) {
                    return `<span style="color:red;float: right">${(full.is_credit === 0) ? 
                        (formater(full.amount.split(',').join('')).includes('.')?formater(full.amount.split(',').join('')):
                        formater(full.amount.split(',').join(''))+'.00') : ""}</span>`;
                }
            },
            {
                width: "auto",
                "mRender": function (data, type, full) {
                    return `<span><strong>${(formater(full.balance.split(',').join('')).includes('.')?formater(full.balance.split(',').join('')):
                        formater(full.balance.split(',').join(''))+'.00')}</strong></span>`;
                }
            },
            {
                width: "auto",
                "mRender": function (data, type, full) {
                    if (isWalletPage === 0) {
                        return `<div class="dropdown dropleft">
                        <i class="fa fa-ellipsis-v" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        </i> 
                        <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                          <button class="dropdown-item" id="dropdownItemRevert" ${(full.postDone === 1 && full.is_capital === 0)?'':'disabled'}>Reverse</button>
                          <button class="dropdown-item" id="dropdownItemReview" data-toggle="modal" data-target="#viewReviewModal">Review</button>
                          <button class="dropdown-item" id="dropdownItemApproval" data-toggle="modal" data-target="#viewListApprovalModal" ${(full.reviewDone === 1)?'':'disabled'}>Approval</button>
                          <button class="dropdown-item" id="dropdownItemPost" data-toggle="modal" data-target="#viewPostModal"${(full.reviewDone === 1 && full.approvalDone === 1)?'':'disabled'}>Post</button>
                        </div>
                      </div>`;
                    } else {
                        return `<div class="dropdown dropleft">
                        <i class="fa fa-ellipsis-v" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        </i> 
                        <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                        </div>
                      </div>`;
                    }

                }
            }

        ]
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
                    return `Balance ${full.balance} @${st.toDateString()}`;
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
//                     console.log(data.data);
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
    $(location).attr('href', strUrl);
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
            let date = new Date();
            let minDate = `${date.getUTCFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
            console.log(minDate);
            $('#notice_date').attr('min', minDate);
            $('#notice_date').val(date).trigger('change');
        } else {
            let date = new Date();
            date.setDate(date.getDate() + selectedConfig.investment_termination_days);
            console.log(date);
            let minDate = `${date.getUTCFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

            console.log(minDate);
            $('#notice_date').attr('min', minDate);
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
            date.setDate(date.getDate() + data.investment_termination_days);
            console.log(date);
            let minDate = `${date.getUTCFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

            console.log(minDate);
            $('#notice_date').attr('min', minDate);
        },
        'error': function (err) {
            console.log(err);
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
                let investmentOps = {
                    description: 'Terminate Investment',
                    is_credit: 0,
                    investmentId: selectedInvestment.investmentId,
                    operationId: withdrawalOperation,
                    is_capital: 0,
                    isApproved: 0,
                    status: 0,
                    isterminate: 1,
                    approvedBy: '',
                    createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
                    roleIds: _mRoleId,
                    productId: selectedInvestment.productId,
                    isForceTerminate: ($('#idChkForceTerminate').is(':checked') === true) ? 1 : 0,
                    expectedTerminationDate: $('#notice_date').val()
                };

                $.ajax({
                    url: `investment-txns/terminate`,
                    'type': 'post',
                    'data': investmentOps,
                    'success': function (data) {
                        if (data.status === undefined) {
                            $('#wait').hide();
                            $("#input_amount").val('');
                            $("#input_description").val('');
                            swal('Investment terminate successful!', '', 'success');
                            bindDataTable(selectedInvestment.investmentId, false);
                        } else {
                            $('#wait').hide();
                            swal('Oops! An error occurred while executing terminating investment', '', 'error');
                        }
                    },
                    'error': function (err) {
                        $('#wait').hide();
                        swal('Oops! An error occurred while executing terminating investment', '', 'error');
                    }
                });
            } else {
                swal("Investment remains active!");
            }
        });
}

$(document).ready(function () {});

function onOpenMode(name, operationId, is_credit) {
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
            if (data.status === undefined) {
                $('#wait').hide();
                $("#input_amount").attr('disabled', false);
                $("#input_description").attr('disabled', false);
                let hint = '';
                if (operationId === '1') {
                    hint = `Min.: ${product_config.investment_min} - Max.: ${product_config.investment_max}`;
                } else if (operationId === '2') {
                    hint = `Max. withdrawal#: ${product_config.freq_withdrawal} - Over.: ${product_config.withdrawal_freq_duration}`
                } else {

                }
                $("#spanAmountRange").html(hint);
                $("#btnTransaction").attr('disabled', false);

            } else {
                $('#wait').hide();
                $("#input_amount").attr('disabled', true);
                $("#btnTransaction").attr('disabled', true);
                $("#input_description").attr('disabled', true);
                swal('Oops! An error occurred while initiating deposit dialog', '', 'error');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            $("#input_amount").attr('disabled', true);
            $("#btnTransaction").attr('disabled', true);
            $("#input_description").attr('disabled', true);
            swal('Oops! An error occurred while initiating deposit dialog', '', 'error');
        }
    });
}
$("#input_amount").on("keyup", function (event) {
    let val = $("#input_amount").val();
    $("#input_amount").val(formater(val));
});

$("#input_amount").on("focusout", function (event) {
    console.log(selectedInvestment._is_credit);
    if (selectedInvestment._is_credit === 1) {
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
    console.log('a');
    let pbody = $("#transactionDetails");
    console.log('b');
    let tr = "";
    console.log('c');
    pbody.empty();
    console.log('d');
    tr += "<tr><td><strong>Created By</strong></td><td>" + value.fullname + "</td></tr>";
    console.log('f');
    tr += "<tr><td><strong>Amount</strong></td><td>" + formater(value.amount) + "</td></tr>";
    console.log('g');
    tr += "<tr><td><strong>Type</strong></td><td>" + (value.is_credit === 1) ? 'Credit' : 'Debit' + "</td></tr>";
    console.log('h');
    tr += "<tr><td><strong>Dated</strong></td><td>" + value.txn_date + "</td></tr>";
    console.log('i');
    pbody.html(tr);
    console.log('j');
    $("#review_list_group").html('');
    console.log('k');
    $.ajax({
        url: `investment-txns/get-txn-user-roles/${value.ID}?method='REVIEW'&userId=${(JSON.parse(localStorage.getItem("user_obj"))).ID}`,
        'type': 'get',
        'success': function (data) {
            console.log('l');
            console.log(data);
            if (data.length > 0) {
                if (data.status === undefined) {
                    $('#viewReviewModalHeader').html(data[0].description);
                    $('#viewReviewModalHeader2').html(data[0].ref_no);
                    $('#wait').hide();
                    console.log('m');
                    console.log(data);
                    console.log('n');
                    if (data.length > 0) {
                        console.log('o');
                        data.forEach((element, index) => {
                            console.log('p');
                            if (element.method === 'REVIEW') {
                                console.log('q');
                                $("#review_list_group").append(`<li class="list-group-item">
                                <div class="row">
                                    <div class="form-group col-6">
                                        <div class="form-group">
                                            <label class="form-control-label"><strong>${(element.role_name===null)?'Role Not Required':element.role_name}</strong></label>
                                            <div class="form-control-label">
                                                <small>Amount: </small><small class="text-muted">${element.amount}</small>
                                            </div>
                                            <div class="form-control-label">
                                                <small>Verified By: </small><small class="text-muted">${(element.fullname===null)?'Not Specified':element.fullname}</small>
                                            </div>
                                            <div class="form-control-label">
                                                <small>Dated: </small><small class="text-muted">${element.txn_date}</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group col-6" style="vertical-align: middle">
                                        <button type="button" ${(element.isReviewed===1)?'disabled':''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled':''} class="btn btn-success btn-sm" onclick="onReviewed(${1},${element.approvalId},${element.txnId})">Review</button>
                                        <button type="button" ${(element.isReviewed===0)?'disabled':''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled':''} class="btn btn-danger btn-sm" onclick="onReviewed(${0},${element.approvalId},${element.txnId})">Deny</button>
                                    </div>
                                </div>
                            </li>`).trigger('change');
                                console.log('r');
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

function onExecutiveTransaction() {
    let _mRoleId = [];
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
        investmentId: selectedInvestment.investmentId,
        operationId: opsObj.operationId,
        is_capital: 0,
        isApproved: 0,
        approvedBy: '',
        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        roleIds: _mRoleId,
        productId: selectedInvestment.productId,
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
                swal('Deposit transaction successfully!', '', 'success');
                bindDataTable(selectedInvestment.investmentId, false);
            } else {
                $('#wait').hide();
                swal('Oops! An error occurred while executing deposit transaction', '', 'error');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Oops! An error occurred while executing deposit transaction', '', 'error');
        }
    });
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
                        swal('Approved reversed transaction exist', '', 'error');
                    } else if (payload.isApproved === 0) {
                        swal('Pending reverse transaction exist', '', 'error');
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
                                        is_capital: 0,
                                        isApproved: 0,
                                        approvedBy: '',
                                        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
                                        roleIds: _mRoleId,
                                        productId: selectedInvestment.productId,
                                        isReversedTxn: 1,
                                        ref_no: data_row.ref_no,
                                        parentTxnId: data_row.ID
                                    };
                                    console.log(investmentOps);
                                    $.ajax({
                                        url: `investment-txns/create`,
                                        'type': 'post',
                                        'data': investmentOps,
                                        'success': function (data) {
                                            console.log(data);
                                            if (data.status === undefined) {
                                                $('#wait').hide();
                                                $("#input_amount").val('');
                                                $("#input_description").val('');
                                                swal('Reversal transaction successful!', '', 'success');
                                                // bindDataTable(selectedInvestment.investmentId, false);
                                                table.ajax.reload(null, false);
                                            } else {
                                                $('#wait').hide();
                                                swal('Oops! An error occurred while executing reversal transaction', '', 'error');
                                            }
                                        },
                                        'error': function (err) {
                                            console.log(err);
                                            $('#wait').hide();
                                            swal('Oops! An error occurred while executing reversal transaction', '', 'error');
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

$('#bootstrap-data-table2 tbody').on('click', '#dropdownItemReview', function () {
    data_row = table.row($(this).parents('tr')).data();
    setReviewRequirements(data_row);
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
            console.log(data);
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
                                            <label class="form-control-label"><strong>${(element.role_name===null)?'Role Not Required':element.role_name}</strong></label>
                                            <div class="form-control-label">
                                                <small>Amount: </small><small class="text-muted">${element.amount}</small>
                                            </div>
                                            <div class="form-control-label">
                                                <small>Verified By: </small><small class="text-muted">${(element.fullname===null)?'Not Specified':element.fullname}</small>
                                            </div>
                                            <div class="form-control-label">
                                                <small>Dated: </small><small class="text-muted">${element.txn_date}</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group col-6" style="vertical-align: middle">
                                        <button type="button" ${(element.isApproved===1)?'disabled':''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled':''} class="btn btn-success btn-sm" onclick="onApproved(${1},${element.approvalId},${element.txnId})">Approve</button>
                                        <button type="button" ${(element.isApproved===0)?'disabled':''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled':''} class="btn btn-danger btn-sm" onclick="onApproved(${0},${element.approvalId},${element.txnId})">Deny</button>
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
                    data.forEach(element => {
                        if (element.method === 'POST') {
                            $("#post_list_group").append(`<li class="list-group-item">
                            <div class="row">
                                <div class="form-group col-6">
                                    <div class="form-group">
                                        <label class="form-control-label"><strong>${(element.role_name===null)?'Role Not Required':element.role_name}</strong></label>
                                        <div class="form-control-label">
                                            <small>Amount: </small><small class="text-muted">${element.amount}</small>
                                        </div>
                                        <div class="form-control-label">
                                            <small>Verified By: </small><small class="text-muted">${(element.fullname===null)?'Not Specified':element.fullname}</small>
                                        </div>
                                        <div class="form-control-label">
                                            <small>Dated: </small><small class="text-muted">${element.txn_date}</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group col-6" style="vertical-align: middle">
                                    <button type="button" ${(element.isPosted===1)?'disabled':''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled':''} class="btn btn-success btn-sm" onclick="onPost(${1},${element.approvalId},${element.txnId})">Post</button>
                                    <button type="button" ${(element.isPosted===0)?'disabled':''} ${(element.roleId !== null && parseInt(element.userViewRole) !== element.roleId) ? 'disabled':''} class="btn btn-danger btn-sm" onclick="onPost(${0},${element.approvalId},${element.txnId})">Deny</button>
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

function onApproved(value, approvedId, txnId) {
    let _data = {
        status: value,
        id: approvedId,
        txnId: txnId,
        isCredit: data_row,
        amount: data_row.amount,
        balance: data_row.balance,
        userId: (JSON.parse(localStorage.getItem("user_obj"))).ID
    }
    $.ajax({
        url: `investment-txns/approves`,
        'type': 'post',
        'data': _data,
        'success': function (data) {
            if (data.status === undefined) {
                console.log('11');
                $('#wait').hide();
                console.log('22');
                swal('Execution successful!', '', 'success');
                console.log('33');
                $("#role_list_group").html('');
                console.log('44');
                setApprovalRequirements(data_row);
                console.log('55');
                // bindDataTable(selectedInvestment.investmentId, false);
                table.ajax.reload(null, false);
                console.log('66');
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

function onReviewed(value, approvedId, txnId) {
    let _data = {
        status: value,
        id: approvedId,
        txnId: txnId,
        isCredit: data_row,
        amount: data_row.amount,
        balance: data_row.balance,
        userId: (JSON.parse(localStorage.getItem("user_obj"))).ID
    }
    $.ajax({
        url: `investment-txns/reviews`,
        'type': 'post',
        'data': _data,
        'success': function (data) {
            if (data.status === undefined) {
                console.log(1);
                $('#wait').hide();
                console.log(2);
                swal('Execution successful!', '', 'success');
                console.log(3);
                $("#review_list_group").html('');
                console.log(4);
                setReviewRequirements(data_row);
                console.log(5);
                // bindDataTable(selectedInvestment.investmentId, false);
                table.ajax.reload(null, false);
                // location.reload();
                console.log(6);
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

function onPost(value, approvedId, txnId) {
    let _data = {
        status: value,
        id: approvedId,
        method: 'POST',
        txnId: txnId,
        isCredit: data_row.is_credit,
        amount: data_row.amount,
        balance: data_row.balance,
        investmentId: data_row.investmentId,
        userId: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        isReversedTxn: data_row.isReversedTxn
    }
    $.ajax({
        url: `investment-txns/posts`,
        'type': 'post',
        'data': _data,
        'success': function (data) {
            if (data.status === undefined) {
                $('#wait').hide();
                swal('Execution successful!', '', 'success');
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
    let _data = {
        investmentId: selectedInvestment.investmentId,
        investment_start_date: selectedInvestment.investment_start_date,
        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        productId: selectedInvestment.productId,
        month: value.month,
        year: value.year,
        startDay: value.day
    }
    console.log(_data);
    $.ajax({
        url: `investment-txns/compute-interest`,
        'type': 'post',
        'data': _data,
        'success': function (data) {
            console.log(data);
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
            $('#wait').hide();
            swal('Oops! An error occurred while computing interest', '', 'error');
        }
    });
}



function onTransferOperation() {
    let amount = $("#input_transfer_amount").val();
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
        description: desc,
        investmentId: selectedInvestment.investmentId,
        is_credit: 0,
        operationId: 2,
        isCharge: 0,
        is_capital: 0,
        isApproved: 0,
        approvedBy: '',
        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        roleIds: _mRoleId
    };

    $.ajax({
        url: `investment-txns/create`,
        'type': 'post',
        'data': investmentOps,
        'success': function (data) {
            console.log(data);
            investmentOps = {
                amount: amount,
                description: desc,
                investmentId: selectedAccount.ID,
                is_credit: 1,
                operationId: 2,
                isCharge: 0,
                is_capital: 0,
                isApproved: 0,
                approvedBy: '',
                createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
                roleIds: _mRoleId
            };

            console.log(investmentOps);
            $.ajax({
                url: `investment-txns/create`,
                'type': 'post',
                'data': investmentOps,
                'success': function (data2) {
                    console.log(data2);
                    $('#wait').hide();
                    swal('Transfer operation completed successfully', '', 'success');
                    $(".input").val('');
                },
                'error': function (err1) {
                    $('#wait').hide();
                    swal('Something went wrong while executing transfer operation', '', 'error');
                }
            });
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Something went wrong while executing transfer operation', '', 'error');
        }
    });
}

function onTransferToInvestments(amount, desc, is_credit, investmentId) {
    new Promise((resolve, reject) => {
        console.log(selectedInvestment);
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
        console.log(investmentOps);
        $.ajax({
            url: `investment-txns/create`,
            'type': 'post',
            'data': investmentOps,
            'success': function (data) {
                console.log(data);
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
//         console.log(error);
//         $('#wait').hide();
//         swal('Something went wrong while executing transfer operation', '', 'error');
//     }
// }