var table = {};
let selectedInvestment = {};
let data_row = {};
let opsObj = {};
let product_config = {};
let offset = 0;
$(document).ready(function () {
    $('#bootstrap-data-table-export').DataTable();
    var sPageURL = window.location.search.substring(1);
    if (sPageURL !== "") {
        var sURLVariables = sPageURL.split('=')[1];
        if (sURLVariables !== "") {
            bindDataTable(sURLVariables);
        }
    }

});

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
                url: `/investment-service/client-investments/${id}`,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value, // (isInitialLoad === true) ? aoData[3].value : offset,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    if (aoData[3].value === 0) {
                        selectedInvestment = data.data[0];
                        $("#client_name").html(data.data[0].fullname);
                        $("#inv_name").html(`${data.data[0].name} (${data.data[0].code})`);
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
                    return `<span style="color:green">${(full.is_credit === 1) ? 
                        (formater(full.amount.split(',').join('')).includes('.')?formater(full.amount.split(',').join('')):
                        formater(full.amount.split(',').join(''))+'.00') : ""}</span>`;
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
                    return `<div class="dropdown dropleft">
                    <i class="fa fa-ellipsis-v" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    </i> 
                    <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                      <button class="dropdown-item" id="dropdownItemRevert" ${(full.postDone === 1)?'':'disabled'}>Revert</button>
                      <button class="dropdown-item" id="dropdownItemReview" data-toggle="modal" data-target="#viewReviewModal">Review</button>
                      <button class="dropdown-item" id="dropdownItemApproval" data-toggle="modal" data-target="#viewListApprovalModal" ${(full.reviewDone === 1)?'':'disabled'}>Approval</button>
                      <button class="dropdown-item" id="dropdownItemPost" data-toggle="modal" data-target="#viewPostModal"${(full.reviewDone === 1 && full.approvalDone === 1)?'':'disabled'}>Post</button>
                    </div>
                  </div>`;
                }
            }

        ]
    });
}



$(document).ready(function () {});

$(document).ajaxStart(function () {
    $("#wait").css("display", "block");
});

$(document).ajaxComplete(function () {
    $("#wait").css("display", "none");
});

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
});


function setReviewRequirements(value) {
    let pbody = $("#transactionDetails");
    let tr = "";
    pbody.empty();
    tr += "<tr><td><strong>Created By</strong></td><td>" + value.fullname + "</td></tr>";
    tr += "<tr><td><strong>Amount</strong></td><td>" + formater(value.amount) + "</td></tr>";
    tr += "<tr><td><strong>Type</strong></td><td>" + (value.is_credit === 1) ? 'Credit' : 'Debit' + "</td></tr>";
    tr += "<tr><td><strong>Dated</strong></td><td>" + value.txn_date + "</td></tr>";
    pbody.html(tr);

    $("#review_list_group").html('');

    $.ajax({
        url: `investment-txns/get-txn-user-roles/${value.ID}`,
        'type': 'get',
        'success': function (data) {
            console.log(data);
            if (data.length > 0) {
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
                                            <label class="form-control-label"><strong>${(element.review_role_name===null)?'Role Not Required':element.review_role_name}</strong></label>
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
                                        <button type="button" ${(element.isReviewed===1)?'disabled':''} class="btn btn-success btn-sm" onclick="onReviewed(${1},${element.approvalId},${element.txnId})">Approve</button>
                                        <button type="button" ${(element.isReviewed===0)?'disabled':''} class="btn btn-danger btn-sm" onclick="onReviewed(${0},${element.approvalId},${element.txnId})">Deny</button>
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
            console.log(err);
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
    let _iscredit = (data_row.is_credit === 1) ? 0 : 1;
    let _operationId = (data_row.is_credit === 1) ? 3 : 1;
    let _mRoleId = [];
    let mRoleId = selectedInvestment.roleIds.filter(x => x.operationId === _operationId && status === 1);
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
        description: 'Reversal: ' + _description,
        is_credit: _iscredit,
        investmentId: selectedInvestment.investmentId,
        operationId: _operationId,
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
                swal('Reversal transaction successful!', '', 'success');
                // bindDataTable(selectedInvestment.investmentId, false);
                table.ajax.reload(null, false);
            } else {
                $('#wait').hide();
                swal('Oops! An error occurred while executing reversal transaction', '', 'error');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Oops! An error occurred while executing reversal transaction', '', 'error');
        }
    });
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
        url: `investment-txns/get-txn-user-roles/${value.ID}`,
        'type': 'get',
        'success': function (data) {
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
                                        <button type="button" ${(element.isApproved===1)?'disabled':''} class="btn btn-success btn-sm" onclick="onApproved(${1},${element.approvalId},${element.txnId})">Approve</button>
                                        <button type="button" ${(element.isApproved===0)?'disabled':''} class="btn btn-danger btn-sm" onclick="onApproved(${0},${element.approvalId},${element.txnId})">Deny</button>
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
        url: `investment-txns/get-txn-user-roles/${value.ID}`,
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
                                        <label class="form-control-label"><strong>${(element.post_role_name===null)?'Role Not Required':element.post_role_name}</strong></label>
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
                                    <button type="button" ${(element.isPosted===1)?'disabled':''} class="btn btn-success btn-sm" onclick="onPost(${1},${element.approvalId},${element.txnId})">Approve</button>
                                    <button type="button" ${(element.isPosted===0)?'disabled':''} class="btn btn-danger btn-sm" onclick="onPost(${0},${element.approvalId},${element.txnId})">Deny</button>
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
                $('#wait').hide();
                swal('Execution successful!', '', 'success');
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
                $('#wait').hide();
                swal('Execution successful!', '', 'success');
                $("#review_list_group").html('');
                setReviewRequirements(data_row);
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
        userId: (JSON.parse(localStorage.getItem("user_obj"))).ID
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