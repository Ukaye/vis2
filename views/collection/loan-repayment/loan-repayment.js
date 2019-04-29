$(document).ready(function() {
    getApplication();
    getComments();
});

const urlParams = new URLSearchParams(window.location.search);
const application_id = urlParams.get('id');

function goToLoanOverview() {
    window.location.href = '/application?id='+application_id;
}

$("#remita-amount").on("keyup", function () {
    let val = $("#remita-amount").val();
    $("#remita-amount").val(numberToCurrencyformatter(val));
});

let application;
function getApplication(){
    $.ajax({
        'url': '/user/application-id/'+application_id,
        'type': 'get',
        'success': function (result) {
            let data = result.response,
                fullname = data.fullname || '';
            application = data;
            $('#client-id').text(padWithZeroes(application.userID,6));
            $('#application-id').text(padWithZeroes(application.ID,9));
            if (application.escrow)
                $('.escrow-balance').text(parseFloat(application.escrow).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
            initRepaymentSchedule(application);
            $("#workflow-div-title").text(fullname.toUpperCase());
            if (application.mandateId) {
                $('#remitaPaymentButton').show();
                getRemitaPayments();
                getMandateStatus();
            }
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function getMandateStatus(){
    $.ajax({
        'url': `/remita/mandate/get/${application_id}`,
        'type': 'get',
        'success': function (data) {
            if (!data.data.isActive) {
                $('#stopMandateBtn').text('MANDATE STOPPED');
                $('#stopMandateBtn').prop('disabled', true);
                $('#makeRemitaPayment').prop('disabled', true);
                $('.cancelRemitaPaymentBtn').removeClass('reversePayment');
                $('.cancelRemitaPaymentBtn').prop('disabled', true);
            }
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function goToClientProfile() {
    window.location.href = '/client-info?id='+application.userID;
}

function getComments(comments) {
    if (comments && comments[0]){
        let $comments = $('#comments');
        $comments.html('');
        comments.forEach(function (comment) {
            $comments.append('<div class="row">\n' +
                '    <div class="col-sm-1">\n' +
                '        <div class="thumbnail"><img class="img-responsive user-photo" src="https://ssl.gstatic.com/accounts/ui/avatar_2x.png"></div>\n' +
                '    </div>\n' +
                '    <div class="col-sm-11">\n' +
                '        <div class="panel panel-default">\n' +
                '            <div class="panel-heading"><strong>'+comment.fullname+'</strong> <span class="text-muted">commented on '+comment.date_created+'</span></div>\n' +
                '            <div class="panel-body">'+comment.text+'</div>\n' +
                '        </div>\n' +
                '    </div>\n' +
                '</div>');
        });
    } else {
        $.ajax({
            'url': '/user/application/comments/'+application_id,
            'type': 'get',
            'success': function (data) {
                let comments = data.response,
                    $comments = $('#comments');
                $comments.html('');
                if (!comments[0])
                    return $comments.append('<h2 style="margin: auto;">No comments available yet!</h2>');
                comments.forEach(function (comment) {
                    $comments.append('<div class="row">\n' +
                        '    <div class="col-sm-1">\n' +
                        '        <div class="thumbnail"><img class="img-responsive user-photo" src="https://ssl.gstatic.com/accounts/ui/avatar_2x.png"></div>\n' +
                        '    </div>\n' +
                        '    <div class="col-sm-11">\n' +
                        '        <div class="panel panel-default">\n' +
                        '            <div class="panel-heading"><strong>'+comment.fullname+'</strong> <span class="text-muted">commented on '+comment.date_created+'</span></div>\n' +
                        '            <div class="panel-body">'+comment.text+'</div>\n' +
                        '        </div>\n' +
                        '    </div>\n' +
                        '</div>');
                });
            },
            'error': function (err) {
                console.log(err);
                notification('No internet connection','','error');
            }
        });
    }
}

function comment(){
    let $comment = $("#comment"),
        comment = $comment.val();
    if (!comment || comment === "")
        return notification('Kindly type a brief comment','','warning');
    $('#wait').show();
    $('#addCommentModal').modal('hide');
    $.ajax({
        'url': '/user/application/comments/'+application_id+'/'+(JSON.parse(localStorage.getItem('user_obj')))['ID'],
        'type': 'post',
        'data': {text: comment},
        'success': function (data) {
            $('#wait').hide();
            let comments = data.response;
            results = comments;
            getComments(comments);
            $comment.val("");
            notification('Comment saved successfully','','success');
        },
        'error': function (err) {
            $('#wait').hide();
            $comment.val("");
            notification('Oops! An error occurred while saving comment','','error');
        }
    });
}

function initRepaymentSchedule(application) {
    let $loanCollectionSchedule = $("#loanCollectionSchedule");
    if (application.schedule && application.schedule[0]){
        let table = $("<table border='1' style='text-align: center;'/>"),
            total = ['TOTAL',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        for (let i = 0; i < application.schedule.length+2; i++) {
            let row,
                cells = [];
            if (i <= 1){
                row = $('<tr style="font-weight: bold;" />');
            } else {
                row = $("<tr />");
                if (application.schedule[i - 2]['status'] === 2)
                    continue;
                if (parseInt(application.schedule[i - 2]['status']) === 0)
                    row = $("<tr style='background-color: #aaaaaa; text-decoration: line-through;' />");
            }
            if (i === 0) {
                cells = ["","","","SCHEDULED PAYMENTS","ACTUAL PAYMENTS","AMOUNT DUE"];
            } else if (i === 1) {
                cells = ["DUE","STATUS","ACTION","PRINCIPAL","INTEREST","FEES","PENALTY","TOTAL","PRINCIPAL","INTEREST","FEES","PENALTY","TOTAL","PRINCIPAL","INTEREST","FEES","PENALTY","TOTAL"];
            } else {
                application.schedule[i - 2]['actual_fees_amount'] = application.schedule[i - 2]['actual_fees_amount'] || "0";
                application.schedule[i - 2]['actual_interest_amount'] = application.schedule[i - 2]['actual_interest_amount'] || "0";
                application.schedule[i - 2]['actual_payment_amount'] = application.schedule[i - 2]['actual_payment_amount'] || "0";
                application.schedule[i - 2]['actual_penalty_amount'] = application.schedule[i - 2]['actual_penalty_amount'] || "0";
                application.schedule[i - 2]['applicationID'] = application.schedule[i - 2]['applicationID'] || "0";
                application.schedule[i - 2]['balance'] = application.schedule[i - 2]['balance'] || "0";
                application.schedule[i - 2]['fees_amount'] = application.schedule[i - 2]['fees_amount'] || "0";
                application.schedule[i - 2]['interest_amount'] = application.schedule[i - 2]['interest_amount'] || "0";
                application.schedule[i - 2]['payment_amount'] = application.schedule[i - 2]['payment_amount'] || "0";
                application.schedule[i - 2]['penalty_amount'] = application.schedule[i - 2]['penalty_amount'] || "0";
                cells[0] = application.schedule[i - 2]['payment_collect_date'];
                cells[1] = cells[2] = application.schedule[i - 2]['payment_status'];
                cells[3] = application.schedule[i - 2]['payment_amount'];
                cells[4] = application.schedule[i - 2]['interest_amount'];
                cells[5] = application.schedule[i - 2]['fees_amount'];
                cells[6] = application.schedule[i - 2]['penalty_amount'];
                cells[7] = totalPayment(application.schedule[i - 2]);
                let payment_history = $.grep(application.payment_history,function(e) {return (e.invoiceID===application.schedule[i - 2]['ID'] && e.status===1)});
                cells[8] = 0;
                cells[9] = 0;
                cells[10] = 0;
                cells[11] = 0;
                for (let k = 0; k < payment_history.length; k++){
                    cells[8] += parseFloat(payment_history[k]['payment_amount']);
                    cells[9] += parseFloat(payment_history[k]['interest_amount']);
                    cells[10] += parseFloat(payment_history[k]['fees_amount']);
                    cells[11] += parseFloat(payment_history[k]['penalty_amount']);
                }
                cells[8] = (cells[8]).toString();
                cells[9] = (cells[9]).toString();
                cells[10] = (cells[10]).toString();
                cells[11] = (cells[11]).toString();
                cells[12] = totalActualPayment({actual_payment_amount:cells[8],actual_interest_amount:cells[9],actual_fees_amount:cells[10],actual_penalty_amount:cells[11]});
                cells[13] = ((parseFloat(cells[3])-parseFloat(cells[8])).round(2)).toString();
                cells[14] = ((parseFloat(cells[4])-parseFloat(cells[9])).round(2)).toString();
                cells[15] = (parseFloat(cells[5])-parseFloat(cells[10]) > 0)?((parseFloat(cells[5])-parseFloat(cells[10])).round(2)).toString():'0';
                cells[16] = (parseFloat(cells[6])-parseFloat(cells[11]) > 0)?((parseFloat(cells[6])-parseFloat(cells[11])).round(2)).toString():'0';
                cells[17] = ((parseFloat(cells[13])+parseFloat(cells[14])+parseFloat(cells[15])+parseFloat(cells[16])).round(2)).toString();
                if ((parseFloat(cells[8]) <= 0) && (parseFloat(cells[9]) <= 0)){
                    cells[1] = cells[2] = 0;
                } else if ((parseFloat(cells[13]) <= 0) && (parseFloat(cells[14]) <= 0)){
                    cells[1] = cells[2] = 1;
                } else if ((parseFloat(cells[8]) + parseFloat(cells[9])).round(2) > 0 && (parseFloat(cells[13]) + parseFloat(cells[14])).round(2) > 0) {
                    cells[1] = cells[2] = 2;
                }
                if (application.schedule[i - 2]['payment_status'] === 2)
                    cells[1] = cells[2] = 1;
                if (application.schedule[i - 2]['status'] === 1){
                    total[3] += parseFloat(cells[3]);
                    total[4] += parseFloat(cells[4]);
                    total[5] += parseFloat(cells[5]);
                    total[6] += parseFloat(cells[6]);
                    total[7] += parseFloat(cells[7]);
                    total[8] += parseFloat(cells[8]);
                    total[9] += parseFloat(cells[9]);
                    total[10] += parseFloat(cells[10]);
                    total[11] += parseFloat(cells[11]);
                    total[12] += parseFloat(cells[12]);
                    total[13] += parseFloat(cells[13]);
                    total[14] += parseFloat(cells[14]);
                    total[15] += parseFloat(cells[15]);
                    total[16] += parseFloat(cells[16]);
                    total[17] += parseFloat(cells[17]);
                }
            }
            let interest_invoice_no = (i > 0 && application.schedule[i - 2])? application.schedule[i - 2]['interest_invoice_no'] : '',
                principal_invoice_no = (i > 0 && application.schedule[i - 2])? application.schedule[i - 2]['principal_invoice_no'] : '';
            cells.push(principal_invoice_no);
            cells.push(interest_invoice_no);
            for (let j = -2; j < cells.length-2; j++) {
                let cell = $("<td />");
                if (i === 0){
                    if (j === -2){
                        cell = $("<td colspan='2' />");
                        cell.html('INVOICE NO');
                    } else if (j === -1){
                        cell = '';
                    } else {
                        cells[j] = cells[j] || "";
                        if (cells[j] !== ""){
                            cell = $("<td colspan='5' />");
                            cell.html(cells[j]);
                        }
                    }
                } else if (i === 1){
                    if (j === -2){
                        cell.html('PRINCIPAL');
                    } else if (j === -1){
                        cell.html('INTEREST');
                    } else {
                        cell.html(cells[j]);
                    }
                } else {
                    if (j === -2 && i>1){
                        cell.html(cells[18] || 'N/A');
                    } else if (j === -1 && i>1){
                        cell.html(cells[19] || 'N/A');
                    } else if (j === 0 && i>1){
                        cell.html(cells[j]);
                    } else if (j === 1 && i>1){
                        switch (cells[j]){
                            case 0: {
                                cell.html('<span class="badge badge-danger">Not Paid</span>');
                                break;
                            }
                            case 1: {
                                cell.html('<span class="badge badge-success">Paid</span>');
                                break;
                            }
                            case 2: {
                                cell.html('<span class="badge badge-warning">Part Paid</span>');
                                break;
                            }
                        }
                    } else if (j === 2 && i>1) {
                        if ((parseInt(application.schedule[i - 2]['status']) !== 0) && (parseInt(cells[j]) !== 1)){
                            if (parseInt(cells[j]) === 0){
                                cell.html('<div class="btn-group">\n' +
                                    '    <button type="button" class="btn btn-info dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\n' +
                                    '        <i class="fa fa-list"></i>\n' +
                                    '    </button>\n' +
                                    '    <div class="dropdown-menu">\n' +
                                    '        <a class="dropdown-item" href="#" data-toggle="modal" data-target="#confirmPayment" onclick="confirmPaymentModal('+application.schedule[i - 2]['ID']+')">Confirm Payment</a>\n' +
                                    '        <div class="dropdown-divider"></div>\n' +
                                    '        <a class="dropdown-item" href="#" data-toggle="modal" data-target="#editSchedule" onclick="editScheduleModal('+application.schedule[i - 2]['ID']+')">Edit Schedule</a>\n' +
                                    '        <a class="dropdown-item" data-toggle="modal" data-target="#invoiceHistory" href="#" onclick="invoiceHistory('+application.schedule[i - 2]['ID']+')">Payment History</a>\n' +
                                    '        <a class="dropdown-item" data-toggle="modal" data-target="#editHistory" href="#" onclick="editHistory('+application.schedule[i - 2]['ID']+')">Edit History</a>\n' +
                                    '        <a class="dropdown-item" href="#" onclick="writeOff('+application.schedule[i - 2]['ID']+')">Write Off</a>\n' +
                                    '    </div>\n' +
                                    '</div>');
                            } else {
                                cell.html('<div class="btn-group">\n' +
                                    '    <button type="button" class="btn btn-info dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\n' +
                                    '        <i class="fa fa-list"></i>\n' +
                                    '    </button>\n' +
                                    '    <div class="dropdown-menu">\n' +
                                    '        <a class="dropdown-item" href="#" data-toggle="modal" data-target="#confirmPayment" onclick="confirmPaymentModal('+application.schedule[i - 2]['ID']+')">Confirm Payment</a>\n' +
                                    '        <div class="dropdown-divider"></div>\n' +
                                    '        <a class="dropdown-item" data-toggle="modal" data-target="#invoiceHistory" href="#" onclick="invoiceHistory('+application.schedule[i - 2]['ID']+')">Payment History</a>\n' +
                                    '        <a class="dropdown-item" data-toggle="modal" data-target="#editHistory" href="#" onclick="editHistory('+application.schedule[i - 2]['ID']+')">Edit History</a>\n' +
                                    '        <a class="dropdown-item" href="#" onclick="writeOff('+application.schedule[i - 2]['ID']+')">Write Off</a>\n' +
                                    '    </div>\n' +
                                    '</div>');
                            }
                        } else {
                            cell.html('<div class="btn-group">\n' +
                                '    <button type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\n' +
                                '        <i class="fa fa-list"></i>\n' +
                                '    </button>\n' +
                                '    <div class="dropdown-menu">\n' +
                                '        <a class="dropdown-item" href="#" data-toggle="modal" data-target="#invoiceHistory" onclick="invoiceHistory('+application.schedule[i - 2]['ID']+')">Payment History</a>\n' +
                                '        <a class="dropdown-item" data-toggle="modal" data-target="#editHistory" href="#" onclick="editHistory('+application.schedule[i - 2]['ID']+')">Edit History</a>\n' +
                                '    </div>\n' +
                                '</div>');
                        }
                    } else {
                        if (cells[j] !== "0" && cells[j] !== "0.00" && cells[j] !== 0 && cells[j] !== 0.00){
                            cell = $("<td style='font-size: 14px;' />");
                            cell.html('₦'+(parseFloat(cells[j])).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
                        } else {
                            cell.html('--');
                        }
                    }
                }
                row.append(cell);
            }
            table.append(row);
        }
        let row = $('<tr style="font-weight: bold;" />');
        for (let i = 0; i<total.length; i++){
            let cell = $("<td />");
            if (i === 0){
                cell = $("<td colspan='5' />");
                cell.html(total[i]);
                row.append(cell);
            } else if (i > 2){
                cell.html('₦'+(parseFloat(total[i])).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
                row.append(cell);
            }
        }
        table.append(row);
        $loanCollectionSchedule.html('');
        $loanCollectionSchedule.append(table);
    }
}

function totalPayment(a){
    return ((parseFloat(a.payment_amount)+parseFloat(a.interest_amount)+parseFloat(a.fees_amount)+parseFloat(a.penalty_amount)).round(2)).toString();
}

function totalActualPayment(a){
    return ((parseFloat(a.actual_payment_amount)+parseFloat(a.actual_interest_amount)+parseFloat(a.actual_fees_amount)+parseFloat(a.actual_penalty_amount)).round(2)).toString();
}

let invoice_id,
    expected_invoice;
function confirmPaymentModal(id) {
    invoice_id = id;
    let invoice_obj = ($.grep(application.schedule, function (e) { return parseInt(e.ID) === parseInt(invoice_id) }))[0],
        invoice = $.extend({},invoice_obj);
    let payment_history = $.grep(application.payment_history,function(e) {return (e.invoiceID===parseInt(invoice_id) && e.status===1)});
    for (let k = 0; k < payment_history.length; k++){
        invoice.payment_amount -= parseFloat(payment_history[k]['payment_amount']);
        invoice.interest_amount -= parseFloat(payment_history[k]['interest_amount']);
    }
    expected_invoice = invoice;
    $('#source').val(0);
    $('#message').text('');
    $('#overpayment-message').text('');
    // $('#repayment-date').val(new Date().toDateInputValue());
    $('#principal').attr({max:invoice.payment_amount});
    $('#interest').attr({max:invoice.interest_amount});
    $('#principal-payable').text('₦'+(parseFloat(invoice.payment_amount)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
    $('#interest-payable').text('₦'+(parseFloat(invoice.interest_amount)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
}

$('#source').change(function () {
    let $payment = $('#payment'),
        $message2 = $('#overpayment-message');
    validation();
    if (this.value === 'escrow'){
        $payment.val(0);
        $message2.text('');
        $payment.prop('disabled',true);
    } else {
        $payment.prop('disabled',false);
    }
});

$('.validate').keyup(function () {
    validation();
});

function validation() {
    let invoice = {},
        $message = $('#message'),
        $interest = $('#interest'),
        $principal = $('#principal'),
        $message2 = $('#overpayment-message'),
        $button = $('#confirm-payment-button'),
        payment = ($('#payment').val())? parseFloat($('#payment').val()) : 0;
    invoice.actual_payment_amount = ($('#principal').val())? parseFloat($('#principal').val()) : 0;
    invoice.actual_interest_amount = ($('#interest').val())? parseFloat($('#interest').val()) : 0;

    if (invoice.actual_payment_amount > (parseFloat(expected_invoice.payment_amount)).round(2)){
        $message.text('Principal cannot be greater than '+expected_invoice.payment_amount);
        $button.prop('disabled', true);
        $interest.removeClass('error');
        $principal.addClass('error');
        $message.addClass('error');
    } else if (invoice.actual_interest_amount > (parseFloat(expected_invoice.interest_amount)).round(2)){
        $message.text('Interest cannot be greater than '+expected_invoice.interest_amount);
        $button.prop('disabled', true);
        $principal.removeClass('error');
        $interest.addClass('error');
        $message.addClass('error');
    } else {
        $button.prop('disabled', false);
        $principal.removeClass('error');
        $interest.removeClass('error');
        $message.text('');
    }

    let overpayment = (payment - (invoice.actual_payment_amount + invoice.actual_interest_amount)).round(2);
    if (overpayment > 0){
        $message2.text('Overpayment = ₦'+(parseFloat(overpayment).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')));
    } else if (overpayment < 0){
        $message2.text('Underpayment = ₦'+((-1*parseFloat(overpayment)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')));
    } else {
        $message2.text('');
    }
}

function confirmPayment() {
    let invoice = {},
        payment = parseFloat($('#payment').val() || '0');
    invoice.actual_payment_amount = $('#principal').val() || '0';
    invoice.actual_interest_amount = $('#interest').val() || '0';
    invoice.actual_fees_amount = $('#fees').val() || '0';
    invoice.actual_penalty_amount = $('#penalty').val() || '0';
    invoice.payment_source = $('#source').val();
    invoice.payment_date = $('#repayment-date').val();
    let total_payment = (parseFloat(invoice.actual_payment_amount)+parseFloat(invoice.actual_interest_amount)+parseFloat(invoice.actual_fees_amount)+parseFloat(invoice.actual_penalty_amount)).round(2);
    if (!invoice.payment_date)
        return notification('Kindly specify a payment date to proceed','','warning');
    if (invoice.payment_source === '0')
        return notification('Kindly select a payment source to proceed','','warning');
    application.escrow = application.escrow || "0";
    if (invoice.payment_source === 'escrow' && (total_payment > (parseFloat(application.escrow)).round(2)))
        return notification('Insufficient escrow funds ('+parseFloat(application.escrow).round(2)+')','','warning');
    $('#wait').show();
    $('#confirmPayment').modal('hide');
    updateEscrow(invoice.payment_source, total_payment, function () {
        let overpayment = (payment - (parseFloat(invoice.actual_payment_amount) + parseFloat(invoice.actual_interest_amount))).round(2);
        if (overpayment > 0){
            $('#wait').hide();
            swal({
                title: "Are you sure?",
                text: "Overpayment of ₦"+(parseFloat(overpayment).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'))+" would be saved to escrow",
                icon: "warning",
                buttons: true,
                dangerMode: true,
            })
                .then((yes) => {
                    if (yes) {
                        $('#wait').show();
                        $.ajax({
                            'url': '/user/application/confirm-payment/'+invoice_id+'/'+application_id+'/'+(JSON.parse(localStorage.getItem('user_obj')))['ID'],
                            'type': 'post',
                            'data': invoice,
                            'success': function (data) {
                                $('#wait').hide();
                                return escrow(overpayment);
                            },
                            'error': function (err) {
                                $('#wait').hide();
                                notification('Oops! An error occurred while confirming payment','','error');
                            }
                        });
                    }
                });
        } else {
            $.ajax({
                'url': '/user/application/confirm-payment/'+invoice_id+'/'+application_id+'/'+(JSON.parse(localStorage.getItem('user_obj')))['ID'],
                'type': 'post',
                'data': invoice,
                'success': function (data) {
                    $('#wait').hide();
                    notification('Payment confirmed successfully','','success');
                    window.location.reload();
                },
                'error': function (err) {
                    $('#wait').hide();
                    notification('Oops! An error occurred while confirming payment','','error');
                }
            });
        }
    });
}

function updateEscrow(source, amount, callback) {
    if (source === 'escrow'){
        $.ajax({
            'url': '/user/application/escrow',
            'type': 'post',
            'data': {clientID:application.userID,amount:amount*-1,type:'debit'},
            'success': function (data) {
                callback();
            },
            'error': function (err) {
                notification('Oops! An error occurred while processing escrow payment','','error');
            }
        });
    } else {
        callback();
    }
}

function escrow(amount) {
    $.ajax({
        'url': '/user/application/escrow',
        'type': 'post',
        'data': {clientID:application.userID,amount:amount},
        'success': function (data) {
            notification('Payment confirmed successfully','Overpayment of ₦'+(parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'))+' has been credited to escrow','success');
            window.location.reload();
        },
        'error': function (err) {
            notification('Oops! An error occurred while processing overpayment','','error');
        }
    });
}

let edit_invoice_id;
function editScheduleModal(id) {
    edit_invoice_id = id;
    let $interest_invoice_div = $('#edit-interest-invoice-div'),
        $principal_invoice_div = $('#edit-principal-invoice-div'),
        invoice = ($.grep(application.schedule, function (e) { return parseInt(e.ID) === parseInt(edit_invoice_id) }))[0];
    if (invoice.principal_invoice_no){
        $principal_invoice_div.hide();
    } else {
        $principal_invoice_div.show();
    }
    if (invoice.interest_invoice_no){
        $interest_invoice_div.hide();
    } else {
        $interest_invoice_div.show();
    }
    $('#edit-principal').val(invoice.payment_amount);
    $('#edit-interest').val(invoice.interest_amount);
    $('#edit-fees').val(invoice.fees_amount);
    $('#edit-penalty').val(invoice.penalty_amount);
    $('#edit-principal-payment-date').val(invoice.payment_collect_date);
    $('#edit-principal-invoice-date').val(invoice.payment_create_date);
    $('#edit-interest-payment-date').val(invoice.interest_collect_date);
    $('#edit-interest-invoice-date').val(invoice.interest_create_date);
}

function editSchedule() {
    let invoice = {},
        $interest_invoice_no = $('#edit-interest-invoice-no'),
        $principal_invoice_no = $('#edit-principal-invoice-no');
    if ($interest_invoice_no.val())
        invoice.interest_invoice_no = $interest_invoice_no.val();
    if ($principal_invoice_no.val())
        invoice.principal_invoice_no = $principal_invoice_no.val();
    invoice.payment_amount = $('#edit-principal').val();
    invoice.interest_amount = $('#edit-interest').val();
    invoice.fees_amount = $('#edit-fees').val();
    invoice.penalty_amount = $('#edit-penalty').val();
    invoice.payment_collect_date = $('#edit-principal-payment-date').val();
    invoice.payment_create_date = $('#edit-principal-invoice-date').val();
    invoice.interest_collect_date = $('#edit-interest-payment-date').val();
    invoice.interest_create_date = $('#edit-interest-invoice-date').val();
    $('#wait').show();
    $('#editSchedule').modal('hide');
    $.ajax({
        'url': '/user/application/edit-schedule/'+edit_invoice_id+'/'+(JSON.parse(localStorage.getItem('user_obj')))['ID'],
        'type': 'post',
        'data': invoice,
        'success': function (data) {
            $('#wait').hide();
            notification('Schedule updated successfully','','success');
            window.location.reload();
        },
        'error': function (err) {
            $('#wait').hide();
            notification('Oops! An error occurred while confirming payment','','error');
        }
    });
}

function invoiceHistory(invoice_id) {
    $.ajax({
        'url': '/user/application/invoice-history/'+invoice_id,
        'type': 'get',
        'success': function (data) {
            $("#invoice-history").dataTable().fnClearTable();
            $.each(data.response, function(k, v){
                let table = [
                    v.ID,
                    v.payment_amount,
                    v.interest_amount,
                    v.fees_amount,
                    v.penalty_amount,
                    v.agent,
                    v.payment_date,
                    v.date_created
                ];
                if (v.status === 0){
                    table.push('Payment Reversed');
                } else if (v.status === 1){
                    table.push('<button class="btn btn-danger reversePayment" onclick="reversePayment('+v.ID+','+v.invoiceID+')"><i class="fa fa-remove"></i> Reverse</button>');
                }
                $('#invoice-history').dataTable().fnAddData(table);
                $('#invoice-history').dataTable().fnSort([[0,'desc']]);
                read_write_custom();
            });
        },
        'error': function (err) {
            notification('No internet connection','','error');
        }
    });
}

function escrowHistory() {
    $.ajax({
        'url': '/user/application/escrow-history/'+application.userID,
        'type': 'get',
        'success': function (data) {
            $("#escrow-history").dataTable().fnClearTable();
            $.each(data.response, function(k, v){
                let table = [
                    v.amount,
                    v.type,
                    v.date_created
                ];
                if (v.status === 0){
                    table.push('Payment Reversed');
                } else if (v.status === 1){
                    table.push('<button class="btn btn-danger reversePayment" onclick="reverseEscrowPayment('+v.ID+')"><i class="fa fa-remove"></i> Reverse</button>');
                }
                $('#escrow-history').dataTable().fnAddData(table);
                $('#escrow-history').dataTable().fnSort([[2,'desc']]);
                read_write_custom();
            });
        },
        'error': function (err) {
            notification('No internet connection','','error');
        }
    });
}

function editHistory(invoice_id) {
    $.ajax({
        'url': '/user/application/edit-schedule-history/'+invoice_id,
        'type': 'get',
        'success': function (data) {
            $("#edit-history").dataTable().fnClearTable();
            $.each(data.response, function(k, v){
                let table = [
                    v.payment_amount,
                    v.interest_amount,
                    v.fees_amount,
                    v.penalty_amount,
                    v.payment_collect_date,
                    v.modified_by,
                    v.date_modified
                ];
                $('#edit-history').dataTable().fnAddData(table);
                $('#edit-history').dataTable().fnSort([[6,'desc']]);
            });
        },
        'error': function (err) {
            notification('No internet connection','','error');
        }
    });
}

function writeOff(invoice_id) {
    swal({
        title: "Are you sure?",
        text: "Once started, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((yes) => {
            if (yes) {
                $.ajax({
                    'url': '/user/application/schedule-history/write-off/'+invoice_id,
                    'type': 'get',
                    'success': function (data) {
                        notification('Invoice write off successful','','success');
                        window.location.reload();
                    },
                    'error': function (err) {
                        notification('No internet connection','','error');
                    }
                });
            }
        });
}

function reversePayment(payment_id,invoice_id) {
    $.ajax({
        'url': '/user/application/payment-reversal/'+payment_id+'/'+invoice_id,
        'type': 'get',
        'success': function (data) {
            notification('Payment reversed successfully','','success');
            window.location.reload();
        },
        'error': function (err) {
            notification('No internet connection','','error');
        }
    });
}

function reverseEscrowPayment(payment_id) {
    $.ajax({
        'url': '/user/application/escrow-payment-reversal/'+payment_id,
        'type': 'get',
        'success': function (data) {
            notification('Payment reversed successfully','','success');
            window.location.reload();
        },
        'error': function (err) {
            notification('No internet connection','','error');
        }
    });
}

function addPayment() {
    let payment = {};
    payment.interest_amount = $('#payment-interest').val();
    // payment.actual_interest_amount = $('#payment-interest').val();
    payment.interest_collect_date = $('#payment-date').val();
    payment.comment = $('#payment-notes').val();
    if (!payment.interest_amount || !payment.interest_collect_date)
        return notification('Kindly fill all required fields!','','warning');
    $.ajax({
        'url': '/user/application/add-payment/'+application_id+'/'+(JSON.parse(localStorage.getItem('user_obj')))['ID'],
        'type': 'post',
        'data': payment,
        'success': function (data) {
            notification('Payment added successfully','','success');
            window.location.reload();
        },
        'error': function (err) {
            notification('No internet connection','','error');
        }
    });
}

function makeRemitaPayment() {
    swal({
        title: "Are you sure?",
        text: "Once started, this process may not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((yes) => {
            if (yes) {
                $('#wait').show();
                let payment = {};
                payment.mandateId = application.mandateId;
                payment.fundingAccount = application.payerAccount;
                payment.fundingBankCode = application.payerBankCode;
                payment.totalAmount = currencyToNumberformatter($('#remita-amount').val());
                payment.created_by = (JSON.parse(localStorage.getItem('user_obj')))['ID'];
                if (!payment.totalAmount)
                    return notification('Kindly fill payment amount!','','warning');
                if (!payment.mandateId)
                    return notification('Oops! remita mandate has not been setup for this application!','','warning');
                $.ajax({
                    'url': `/remita/payment/create`,
                    'type': 'post',
                    'data': payment,
                    'success': function (data) {
                        $('#wait').hide();
                        if (data.status !== 500) {
                            notification('Remita payment request was successful','','info');
                            window.location.reload();
                        } else {
                            console.log(data.error);
                            notification(data.error.status,'','error');
                        }
                    },
                    'error': function (err) {
                        notification('No internet connection','','error');
                    }
                });
            }
        });
}

function getRemitaPayments() {
    $.ajax({
        type: 'get',
        url: `/remita/payments/get/${application_id}`,
        success: function (data) {
            if (data.status !== 500){
                $('#remita-total-amount').text(`₦${numberToCurrencyformatter(data.response.totalAmount || 0)}`);
                $('#remita-transaction-count').text(`${numberToCurrencyformatter(data.response.totalTransactionCount || 0)}`);
                $("#remita-payments").dataTable().fnClearTable();
                $.each(data.response.paymentDetails, function(k, v){
                    let table = [
                        `₦${numberToCurrencyformatter(v.amount)}`,
                        v.RRR,
                        v.transactionRef,
                        v.status,
                        v.lastStatusUpdateTime
                    ];
                    if (v.statuscode === '072'){
                        table.push('<button class="btn btn-danger reversePayment cancelRemitaPaymentBtn" ' +
                            'onclick="cancelRemitaPayment('+v.transactionRef+')"><i class="fa fa-remove"></i> Cancel</button>');
                    } else {
                        table.push('Payment Cancelled');
                    }
                    $('#remita-payments').dataTable().fnAddData(table);
                    $('#remita-payments').dataTable().fnSort([[4,'desc']]);
                });
            } else {
                console.log(data.error);
            }
        }
    });
}

function cancelRemitaPayment(transactionRef) {
    swal({
        title: "Are you sure?",
        text: "Once cancelled, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((yes) => {
            if (yes) {
                $('#wait').show();
                let payment = {};
                payment.transactionRef = transactionRef;
                $.ajax({
                    'url': `/remita/payment/cancel`,
                    'type': 'post',
                    'data': payment,
                    'success': function (data) {
                        $('#wait').hide();
                        if (data.status !== 500) {
                            notification(data.response.status,'','success');
                            window.location.reload();
                        } else {
                            console.log(data.error);
                            notification(data.error.status,'','error');
                        }
                    },
                    'error': function (err) {
                        notification('No internet connection','','error');
                    }
                });
            }
        });
}

function stopMandate() {
    swal({
        title: "Are you sure?",
        text: "Once stopped, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((yes) => {
            if (yes) {
                $('#wait').show();
                $.ajax({
                    'url': `/client/mandate/stop/${application_id}`,
                    'type': 'get',
                    'success': function (data) {
                        $('#wait').hide();
                        if (data.status !== 500) {
                            notification(data.response.status,'','info');
                            window.location.reload();
                        } else {
                            console.log(data.error);
                            notification(data.error.status,'','error');
                        }
                    },
                    'error': function (err) {
                        notification('No internet connection','','error');
                    }
                });
            }
        });
}

function read_write_custom(){
    let w,
        perms = JSON.parse(localStorage.getItem("permissions")),
        page = (window.location.pathname.split('/')[1].split('.'))[0],
        reversePayment = ($.grep(perms, function(e){return e.module_name === 'reversePayment';}))[0];
    perms.forEach(function (k){
        if (k.module_name === page)
            w = $.grep(perms, function(e){return e.id === parseInt(k.id);});
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1))
        $(".write").hide();

    if (reversePayment && reversePayment['read_only'] === '0')
        $('.reversePayment').hide();
}