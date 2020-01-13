$(document).ready(function() {
    getInvoices();
    $('#min_balance').keyup(e => {
        $("#min_balance").val(numberToCurrencyformatter($("#min_balance").val()));
    });
});

let allInvoices_,
    allInvoices = [],
    selectedInvoices = [];

$('#status').change((e) => {
    let invoices;
    switch (e.target.value) {
        case '0': {
            invoices = allInvoices_;
            break;
        }
        case '1': {
            invoices = $.grep(allInvoices_, (e) => { return !e.response });
            break;
        }
        case '2': {
            invoices = $.grep(allInvoices_, (e) => { return !!e.response });
            break;
        }
    }
    allInvoices = invoices;
    $('#invoices').html('');
    selectedInvoices = [];
    $.each(allInvoices, function (key, val) {
        displayInvoice(val);
    });
});

function getInvoices(){
    $('#wait').show();
    $.ajax({
        type: 'get',
        url: `/collection/paystack/invoices/due/${JSON.parse(localStorage.user_obj).ID}`,
        success: function (data) {
            getMinBalance();
            let response = data.response;
            allInvoices = response;
            allInvoices_ = allInvoices;
            $('#invoices').html('');
            selectedInvoices = [];
            $.each(response, function (key, val) {
                displayInvoice(val);
            });
            $('#wait').hide();
        }
    });
}

function getMinBalance(){
    $.ajax({
        type: 'get',
        url: `/collection/paystack/settings/${JSON.parse(localStorage.user_obj).ID}`,
        success: function (data) {
            let settings = data.response,
                min_balance = settings.min_balance || '0';
            $('#min_balance').val(numberToCurrencyFormatter_(min_balance));
        }
    });
}

function displayInvoice(val) {
    let status;
    switch (val.payment_status) {
        case 0: {
            status = '<span class="badge badge-danger">Not Paid</span>';
            break;
        }
        case 1: {
            status = '<span class="badge badge-warning">Part Paid</span>';
            break;
        }
    }
    $('#invoices').append(`
        <li id="invoice-${val.ID}" class="ui-state-default">
            <div class="row">
                <div class="col-lg-9">
                    <p><strong>Name: </strong>${val.client} <strong>#INV-${padWithZeroes(val.ID, 6)}</strong></p>
                    <p><strong>Date: </strong>${val.payment_collect_date} ${status}</p>
                    <p><strong>Balance: </strong>${numberToCurrencyFormatter_(val.payment_amount)}
                        <small class="text-muted"><strong>Invoice Amt: </strong>${numberToCurrencyFormatter_(val.invoice_amount)} 
                            <strong>Total Paid: </strong>${numberToCurrencyFormatter_(val.total_paid)}
                        </small></p>
                </div>
                <div class="col-lg-3">
                    ${(!!val.response)? `<i class="fa fa-info-circle tool-tip" data-toggle="tooltip" data-placement="top" title="${JSON.parse(val.response).status}"></i>` : ''}
                    <p><input class="form-control" type="checkbox" onclick="selectInvoice('${encodeURIComponent(JSON.stringify(val))}')" /></p>
                    <p>
                        <a class="btn btn-primary btn-sm" href="/loan-repayment?id=${val.applicationID}">View Loan</a>
                        <a class="btn btn-danger btn-sm" onclick="disablePaystack('${encodeURIComponent(JSON.stringify(val))}')"><i class="fa fa-trash"></i></a>
                    </p>
                </div>
            </div>
        </li>`);
}

function selectInvoice(obj) {
    let invoice = JSON.parse(decodeURIComponent(obj)),
        $checkbox = $(`#invoice-${invoice.ID}`).find('input[type="checkbox"]');
    if ($checkbox.is(':checked')) {
        selectedInvoices.push(invoice);
    } else {
        selectedInvoices.splice(selectedInvoices.findIndex((e) => { return e.ID === invoice.ID; }), 1);
    }
}

function validatePayment() {
    if (selectedInvoices.length < 1) return notification('No invoice has been selected yet!', '', 'warning');

    swal({
        title: 'Are you sure?',
        text: `Once initiated, direct debit instructions would be sent!`,
        icon:  'warning',
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                postPayment();
            }
        });
}

function postPayment() {
    $('#wait').show();
    $.ajax({
        'url': '/paystack/payments/create',
        'type': 'post',
        'data': {
            invoices: selectedInvoices,
            created_by: (JSON.parse(localStorage.getItem('user_obj')))['ID']
        },
        'success': function (data) {
            const invoice_count = selectedInvoices.length;
            for (let i=0; i<invoice_count; i++) {
                let inv = selectedInvoices[0];
                $(`#invoice-${inv['ID']}`).remove();
                selectedInvoices.splice(selectedInvoices.findIndex((e) => { return e.ID === inv['ID']; }), 1);
            }
            $('#wait').hide();
            notification(data.response, '', 'success');
        },
        'error': function (err) {
            $('#wait').hide();
            notification('Oops! An error occurred while posting payment(s)', '', 'error');
        }
    });
}

$('#selectInvoices').change((e) => {
    let $invoiceCheckboxes = $('li[id^="invoice-"]').find('input[type="checkbox"]');
    if ($('#selectInvoices').is(':checked')) {
        selectedInvoices = allInvoices;
        $invoiceCheckboxes.prop('checked', true);
    } else {
        selectedInvoices = [];
        $invoiceCheckboxes.prop('checked', false);
    }
});

function disablePaystack(invoice) {
    swal({
        title: "Are you sure?",
        text: "Once removed, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                let inv = JSON.parse(decodeURIComponent(invoice));
                $('#wait').show();
                $.ajax({
                    'url': '/paystack/invoices/disable',
                    'type': 'delete',
                    'data': {invoices: [inv]},
                    'success': function (data) {
                        $(`#invoice-${inv['ID']}`).remove();
                        selectedInvoices.splice(selectedInvoices.findIndex((e) => { return e.ID === inv['ID']; }), 1);
                        $('#wait').hide();
                        notification(data.response, '', 'success');
                    },
                    'error': function (err) {
                        $('#wait').hide();
                        notification('Oops! An error occurred while posting payment(s)', '', 'error');
                    }
                });
            }
        });
}
function disableMultiplePaystack() {
    if (!selectedInvoices[0]) return notification('No invoice has been selected!', '', 'warning');
    swal({
        title: "Are you sure?",
        text: "Once removed, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                $('#wait').show();
                $.ajax({
                    'url': `/paystack/invoices/disable`,
                    'type': 'delete',
                    'data': {invoices: selectedInvoices},
                    'success': function (data) {
                        const invoice_count = selectedInvoices.length;
                        for (let i=0; i<invoice_count; i++) {
                            let inv = selectedInvoices[0];
                            $(`#invoice-${inv['ID']}`).remove();
                            selectedInvoices.splice(selectedInvoices.findIndex((e) => { return e.ID === inv['ID']; }), 1);
                        }
                        $('#wait').hide();
                        notification(data.response, '', 'success');
                    },
                    'error': function (err) {
                        console.log(err);
                        notification('No internet connection', '', 'error');
                    }
                });
            }
        });
}

function setMinBalance() {
    if (!$('#min_balance').val())
        return ('Kindly specify a value for minimum balance!', '', 'warning');
    let payload = {};
    payload.min_balance = currencyToNumberformatter($('#min_balance').val());
    $('#wait').show();
    $.ajax({
        'url': `/collection/paystack/settings/${JSON.parse(localStorage.user_obj).ID}`,
        'type': 'post',
        'data': payload,
        'success': function (data) {
            $('#wait').hide();
            notification('Minimum balance updated successfully!', '', 'success');
            window.location.reload();
        },
        'error': function (err) {
            $('#wait').hide();
            notification('Oops! An error occurred while setting minimum balance', '', 'error');
        }
    });
}