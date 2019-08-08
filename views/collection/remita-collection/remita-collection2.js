$(document).ready(function() {
    getInvoices();
});


let allInvoices = [],
    selectedInvoices = [],
    selectedPayments = [];

function getInvoices(){
    $('#wait').show();
    $.ajax({
        type: 'GET',
        url: '/collection/remita/invoices/due',
        success: function (data) {
            let response = data.response;
            allInvoices = response;
            $('#invoices').html('');
            selectedInvoices = [];
            $.each(response, function (key, val) {
                displayInvoice(val);
            });
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
        <li id="invoice-${val.type}-${val.ID}" class="ui-state-default">
            <div class="row">
                <div class="col-lg-9">
                    <p><strong>Name: </strong>${val.client} <strong>#INV-${padWithZeroes(val.ID, 6)}</strong></p>
                    <p><strong>Date: </strong>${val.payment_collect_date} (${val.type}) ${status}</p>
                    <p><strong>Balance: </strong>${numberToCurrencyFormatter_(val.payment_amount)}
                        <small class="text-muted"><strong>Invoice Amt: </strong>${numberToCurrencyFormatter_(val.invoice_amount)} 
                            <strong>Total Paid: </strong>${numberToCurrencyFormatter_(val.total_paid)}
                        </small></p>
                </div>
                <div class="col-lg-3">
                    <p><input class="form-control" type="checkbox" onclick="selectInvoice('${encodeURIComponent(JSON.stringify(val))}')" /></p>
                    <p><a class="btn btn-primary btn-sm" href="/application?id=${val.applicationID}">View Loan</a></p>
                </div>
            </div>
        </li>`);
}

function selectInvoice(obj) {
    let invoice = JSON.parse(decodeURIComponent(obj)),
        $checkbox = $(`#invoice-${invoice.type}-${invoice.ID}`).find('input[type="checkbox"]');
    if ($checkbox.is(':checked')) {
        if (selectedPayments.length <= 1) {
            selectedInvoices.push(invoice);
        } else {
            if (selectedInvoices.length === 0) {
                selectedInvoices.push(invoice);
            } else {
                $checkbox.prop('checked', false);
                return notification('Invoice has already been selected for multiple payments!', '', 'warning');
            }
        }
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
        'url': '/remita/payments/create',
        'type': 'post',
        'data': {
            invoices: selectedInvoices,
            created_by: (JSON.parse(localStorage.getItem('user_obj')))['ID']
        },
        'success': function (data) {
            const invoice_count = selectedInvoices.length;
            for (let i=0; i<invoice_count; i++) {
                let inv = selectedInvoices[0];
                $(`#invoice-${inv['type']}-${inv['ID']}`).remove();
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