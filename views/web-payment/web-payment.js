let table,
    application,
    web_payments,
    $wait = $('#wait'),
    url = '/payment/get/paystack?';
$(document).ready(function () {
    getXeroConfig();
    getWebPayments();
});

let xero_config;
function getXeroConfig() {
    $.ajax({
        type: "GET",
        url: "/settings/xero",
        success: function (data) {
            if (data.status === 200) {
                xero_config = data.response;
                if (xero_config) {
                    if (xero_config.xero_collection_description === 1) 
                        $('#collection-description-required').show();
                    if (xero_config.xero_collection_bank === 1) {
                        getCollectionBanks();
                        $('#collection-bank-div').show();
                    }
                }
            }
        }
    });
}

function getCollectionBanks() {
    $.ajax({
        type: "GET",
        url: "/settings/collection_bank",
        success: function (data) {
            $.each(data.response, function (key, collection_bank) {
                $('#collection_bank').append(`<option value="${collection_bank.Code}">${collection_bank.Name}</option>`);
                $('#refund_overpayment_bank').append(`<option value="${collection_bank.Code}">${collection_bank.Name}</option>`);
            });
        }
    });
}

function getWebPayments() {
    table = $('#web_payments').DataTable({
        dom: 'Blfrtip',
        bProcessing: true,
        bServerSide: true,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [
                {
                    name: 'actual_amount',
                    query: `ORDER BY actual_amount ${aoData[2].value[0].dir}`
                },
                {
                    name: 'actual_amount',
                    query: `ORDER BY actual_amount ${aoData[2].value[0].dir}`
                },
                {
                    name: 'client',
                    query: `ORDER BY client ${aoData[2].value[0].dir}`
                },
                {
                    name: 'applicationID',
                    query: `ORDER BY applicationID ${aoData[2].value[0].dir}`
                },
                {
                    name: 'date_created',
                    query: `ORDER BY date_created ${aoData[2].value[0].dir}`
                },
                {
                    name: 'action',
                    query: `ORDER BY ID ${aoData[2].value[0].dir}`
                }
            ];
            $wait.show();
            $.ajax({
                dataType: 'json',
                type: "GET",
                url: url,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    web_payments = data.data;
                    $wait.hide();
                    fnCallback(data);
                }
            });
        },
        aaSorting: [
            [4, 'desc']
        ],
        aoColumnDefs: [
            {
                sClass: "numericCol",
                aTargets: [0, 1],
                sType: "numeric"
            }
        ],
        columns: [
            {
                width: "15%",
                className: "text-right",
                mRender: function (data, type, full) {
                    return numberToCurrencyformatter(full.actual_amount.round(2));
                }
            },
            {
                width: "25%",
                className: "text-right",
                mRender: function (data, type, full) {
                    if (full.status === 2) return numberToCurrencyformatter(full.actual_amount.round(2));

                    let payment = [];
                    if (full.interest_amount > 0)
                        payment.push(`Interest - ${numberToCurrencyformatter(full.interest_amount.round(2))}`);
                    if (full.payment_amount > 0)
                        payment.push(`Principal - ${numberToCurrencyformatter(full.payment_amount.round(2))}`);
                    if (full.escrow_amount > 0)
                        payment.push(`Overpayment - ${numberToCurrencyformatter(full.escrow_amount.round(2))}`);
                    if (full.fees_amount > 0)
                        payment.push(`Fee - ${numberToCurrencyformatter(full.fees_amount.round(2))}`);
                    if (full.penalty_amount > 0)
                        payment.push(`Penalty - ${numberToCurrencyformatter(full.penalty_amount.round(2))}`);
                    return payment.join(',<br>');
                }
            },
            {
                width: "30%",
                mRender: function (data, type, full) {
                    return `<a href="/client-info?id=${full.clientID}">${full.client}</a>`;
                }
            },
            {
                width: "10%",
                className: "text-right",
                mRender: function (data, type, full) {
                    return `<a href="/application?id=${full.applicationID}">${padWithZeroes(full.applicationID, 9)}</a>`;
                }
            },
            {
                width: "20%",
                mRender: function (data, type, full) {
                    // return moment(new Date(full.date_created)).format('LLLL');
                    return full.date_created;
                }
            },
            {
                width: "10%",
                mRender: function (data, type, full) {
                    return (full.status === 2)? `<a class="btn btn-success btn-sm" onclick="confirmPaymentModal(${full.invoiceID},${full.ID})">
                               Apply <i class="fa fa-check"></i></a>` : '';
                }
            }
        ]
    });
}

$("#filter").submit(function (e) {
    e.preventDefault();
    let end = $("#endDate").val(),
        start = $("#startDate").val(),
        type = $("#type-filter").val();
    if (!start || !end) return table.ajax.reload(null, false);
    url = '/payment/get/paystack?';
    url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    if (type) url = url.concat(`&type=${type}`);
    return table.ajax.reload(null, false);
});

function filterType() {
    let end = $("#endDate").val(),
        start = $("#startDate").val(),
        type = $("#type-filter").val();
    url = '/payment/get/paystack?';
    if (start && end) url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    if (type) url = url.concat(`&type=${type}`);
    return table.ajax.reload(null, false);
}

let remita_id,
    invoice_id,
    payment_id,
    paystack_id,
    web_payment,
    invoice_history,
    expected_invoice,
    selected_schedule;
function confirmPaymentModal(id, id2) {
    invoice_id = id;
    payment_id = id2;
    web_payment = ($.grep(web_payments, e => {return (e.ID === parseInt(payment_id))}))[0];
    $('#wait').show();
    $.ajax({
        type: 'get',
        url: `user/application-id/${web_payment.applicationID}`,
        success: data => {
            application = data.response;
            let invoice_obj = ($.grep(application.schedule, e => { return Number(e.ID) === Number(invoice_id) }))[0],
            invoice = $.extend({},invoice_obj);
            selected_schedule = invoice_obj;
            let payment_history = $.grep(application.payment_history, e => { return (e.invoiceID === Number(invoice_id) && e.status === 1)});
            for (let k = 0; k < payment_history.length; k++){
                invoice.payment_amount -= parseFloat(payment_history[k]['payment_amount']);
                invoice.interest_amount -= parseFloat(payment_history[k]['interest_amount']);
            }
            expected_invoice = invoice;
            $('#message').text('');
            $('#overpayment-message').text('');
            $('#principal').attr({max:invoice.payment_amount});
            $('#interest').attr({max:invoice.interest_amount});
            $('#principal-payable').text(`₦${numberToCurrencyformatter(invoice.payment_amount)}`);
            $('#interest-payable').text(`₦${numberToCurrencyformatter(invoice.interest_amount)}`);
            $('#source').val('paystack').prop('disabled', true);
            $('#payment').val(web_payment.actual_amount);
            $('#principal').val(web_payment.payment_amount);
            $('#interest').val(web_payment.interest_amount);
            $('#fees').val(web_payment.fees_amount);
            $('#penalty').val(web_payment.penalty_amount);
            $('#repayment-date').val(web_payment.payment_date);
            if (xero_config.xero_web_collection_bank)
                $('#collection_bank').val(xero_config.xero_web_collection_bank);
            $('#collection_bank').prop('disabled', true);
            $('#confirmPayment').modal('show');
            $('#wait').hide();
        }
    });
}

function confirmPayment() {
    let invoice = {};
    invoice.actual_amount = $('#payment').val() || '0';
    invoice.actual_payment_amount = $('#principal').val() || '0';
    invoice.actual_interest_amount = $('#interest').val() || '0';
    invoice.actual_fees_amount = $('#fees').val() || '0';
    invoice.actual_penalty_amount = $('#penalty').val() || '0';
    invoice.payment_source = $('#source').val();
    invoice.payment_date = $('#repayment-date').val();
    if (invoice.payment_source === 'remita' && remita_id) invoice.remitaPaymentID = remita_id;
    if ($('#collection_bank').val() !== '000') {
        invoice.xeroCollectionBankID = $('#collection_bank').val();
        invoice.xeroCollectionBank = $('#collection_bank').find(":selected").text();
    }
    if ($('#collection_description').val()) invoice.xeroCollectionDescription = $('#collection_description').val();
    let total_payment = (parseFloat(invoice.actual_payment_amount) +
                        parseFloat(invoice.actual_interest_amount) +
                        parseFloat(invoice.actual_fees_amount) +
                        parseFloat(invoice.actual_penalty_amount)).round(2);
    let overpayment = (invoice.actual_amount - total_payment).round(2);
    invoice.escrow_amount = overpayment;
    if (!invoice.payment_date)
        return notification('Kindly specify a payment date to proceed','','warning');
    if (invoice.payment_source === '0')
        return notification('Kindly select a payment source to proceed','','warning');
    if (overpayment < 0)
        return notification(`Actual payment amount should be ₦${numberToCurrencyformatter(total_payment)}`,'','warning');
    if (xero_config && xero_config.xero_collection_description === 1 && 
        invoice.payment_source !== 'escrow' && !$('#collection_description').val()) {
            return notification('Kindly specify a statement description to proceed','','warning');
    }
    invoice.agentID = (JSON.parse(localStorage.getItem('user_obj')))['ID'];
    if (xero_config && xero_config.xero_collection_bank === 1 && !selected_schedule.interest_invoice_no)
        return notification('Xero invoice no is required','Kindly update this invoice with the xero invoice no','warning');
    $('#confirmPayment').modal('hide');
    $('#wait').show();
    if (overpayment > 0) {
        $('#wait').hide();
        swal({
            title: "Are you sure?",
            text: `Overpayment of ₦${numberToCurrencyformatter(overpayment)} would be saved to overpayment`,
            icon: "warning",
            buttons: true,
            dangerMode: true
        })
            .then(yes => {
                if (yes) {
                    $.ajax({
                        'url': `/user/application/invoice-history/${payment_id}/${invoice_id}`,
                        'type': 'put',
                        'data': invoice,
                        'success': function (data) {
                            return escrow(overpayment, invoice.xeroCollectionBankID, invoice.payment_date);
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
            'url': `/user/application/invoice-history/${payment_id}/${invoice_id}`,
            'type': 'put',
            'data': invoice,
            'success': function (data) {
                $('#wait').hide();
                notification('Payment confirmed successfully','','success');
                return table.ajax.reload(null, false);
            },
            'error': function (err) {
                $('#wait').hide();
                notification('Oops! An error occurred while confirming payment','','error');
            }
        });
    }
}

$('.validate').keyup(function () {
    validation();
});

function validation() {
    let invoice = {},
        $message = $('#message'),
        $payment = $('#payment'),
        $interest = $('#interest'),
        $principal = $('#principal'),
        $message2 = $('#overpayment-message'),
        $button = $('#confirm-payment-button');

    if ($('#source').val() === 'escrow') {
        $payment.val(parseFloat($principal.val() || 0) + parseFloat($interest.val() || 0));
    }

    let payment = ($payment.val())? parseFloat($payment.val()) : 0;
    invoice.actual_payment_amount = ($principal.val())? parseFloat($principal.val()) : 0;
    invoice.actual_interest_amount = ($interest.val())? parseFloat($interest.val()) : 0;

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
        $message2.text(`Overpayment = ₦${numberToCurrencyformatter(overpayment)}`);
    } else if (overpayment < 0){
        $message2.text(`Underpayment = ₦${numberToCurrencyformatter(overpayment)}`);
    } else {
        $message2.text('');
    }
}

function escrow(amount, bank, date) {
    $.ajax({
        'url': '/user/application/escrow',
        'type': 'post',
        'data': {
            clientID:application.userID,
            amount:amount,
            xeroCollectionBankID: bank,
            payment_date: date
        },
        'success': function (data) {
            $('#wait').hide();
            notification('Payment confirmed successfully',`Overpayment of ₦${numberToCurrencyformatter(amount)} has been credited to escrow`,'success');
            return table.ajax.reload(null, false);
        },
        'error': function (err) {
            notification('Oops! An error occurred while processing overpayment','','error');
        }
    });
}