$(document).ready(function() {
    getPayments();
    getInvoices();
});

let allInvoices = [],
    allPayments = [],
    matchedInvoices = [],
    matchedPayments = [],
    selectedInvoices = [],
    selectedPayments = [];

function getInvoices(){
    $.ajax({
        type: 'GET',
        url: '/collection/invoices/due',
        success: function (data) {
            let response = data.response;
            allInvoices = response;
            $.each(response, function (key, val) {
                $('#invoices').append(`
                    <li id="invoice-${val.ID}" class="ui-state-default">
                        <div class="row">
                            <div class="col-lg-9">
                                <p><strong>Name: </strong>${val.client}</p>
                                <p><strong>Date: </strong>${val.payment_collect_date}</p>
                                <p><strong>Amount: </strong>${numberToCurrencyformatter(val.payment_amount)} (${val.type})</p>
                            </div>
                            <div class="col-lg-3">
                                <p><input class="form-control" type="checkbox" onclick="selectInvoice('${encodeURIComponent(JSON.stringify(val))}')" /></p>
                                <p><a class="btn btn-primary btn-sm" href="/application?id=${val.applicationID}">View Loan</a></p>
                            </div>
                        </div>
                    </li>`);
            });
        }
    });
}

function getPayments(){
    $.ajax({
        type: 'GET',
        url: '/collection/bulk_upload',
        success: function (data) {
            let response = data.response;
            allPayments = response;
            $.each(response, function (key, val) {
                let type,
                    amount = val.credit - val.debit;
                if (amount >= 0) {
                    type = '<span class="badge badge-success">CREDIT</span>';
                } else {
                    type = '<span class="badge badge-danger">DEBIT</span>';
                    amount = -amount;
                }
                $('#payments').append(`
                    <li id="payment-${val.ID}" class="ui-state-default">
                        <div class="row">
                            <div class="col-lg-10">
                                <p><strong>Amount: </strong>${numberToCurrencyformatter(amount)} ${type}</p>
                                <p><strong>Date: </strong>${val.value_date}</p>
                                <p><strong>Description: </strong>${val.description}</p>
                            </div>
                            <div class="col-lg-2">
                                <p><input class="form-control" type="checkbox" onclick="selectPayment('${encodeURIComponent(JSON.stringify(val))}')" /></p>
                                <p><a class="btn btn-danger btn-sm" onclick="removePayment('${encodeURIComponent(JSON.stringify(val))}')"><i class="fa fa-trash"></i></a></p>
                            </div>
                        </div>
                    </li>`);
            });
        }
    });
}

function selectInvoice(obj) {
    let invoice = JSON.parse(decodeURIComponent(obj)),
        $checkbox = $(`#invoice-${invoice.ID}`).find('input[type="checkbox"]');
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

function selectPayment(obj) {
    let payment = JSON.parse(decodeURIComponent(obj)),
        $checkbox = $(`#payment-${payment.ID}`).find('input[type="checkbox"]');
    if ($checkbox.is(':checked')) {
        if (selectedInvoices.length <= 1) {
            selectedPayments.push(payment);
        } else {
            if (selectedPayments.length === 0) {
                selectedPayments.push(payment);
            } else {
                $checkbox.prop('checked', false);
                return notification('Payment has already been selected for multiple invoices!', '', 'warning');
            }
        }
    } else {
        selectedPayments.splice(selectedPayments.findIndex((e) => { return e.ID === payment.ID; }), 1);
    }
}

function removePayment(obj) {
    let payment = JSON.parse(decodeURIComponent(obj));
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
                    'url': `/collection/bulk_upload/record/${payment.ID}`,
                    'type': 'delete',
                    'success': function (data) {
                        $('#wait').hide();
                        if (data.status === 200) {
                            notification('Payment record removed successfully', '', 'success');
                            $(`#payment-${payment.ID}`).remove();
                        } else {
                            console.log(data.error);
                            notification(data.error, '', 'error');
                        }
                    },
                    'error': function (err) {
                        console.log(err);
                        notification('No internet connection', '', 'error');
                    }
                });
            }
        });
}

function validatePayment() {
    if (selectedInvoices.length < 1)
        return notification('No invoice has been selected yet!', '', 'warning');
    if (selectedPayments.length < 1)
        return notification('No payment has been selected yet!', '', 'warning');

    let totalInvoice = sumArrayObjects(selectedInvoices, 'payment_amount'),
        totalPayment = sumArrayObjects(selectedPayments, 'credit'),
        overpayment = (totalPayment - totalInvoice).round(2);

    if (overpayment > 0) {
        swal({
            title: 'Are you sure?',
            text: `Overpayment of ₦${numberToCurrencyformatter(overpayment)} would be saved to escrow`,
            icon:  'warning',
            buttons: true,
            dangerMode: true
        })
            .then((yes) => {
                if (yes) {
                    postPayment(overpayment);
                }
            });
    } else {
        postPayment(overpayment);
    }
}

function postPayment(overpayment) {
    $('#wait').show();
    $.ajax({
        'url': '/collection/bulk_upload/confirm-payment',
        'type': 'post',
        'data': {
            overpayment: overpayment,
            invoices: selectedInvoices,
            payments: selectedPayments,
            created_by: (JSON.parse(localStorage.getItem('user_obj')))['ID']
        },
        'success': function (data) {
            for (let i=0; i<selectedInvoices.length; i++) {
                $(`#invoice-${selectedInvoices[i]['ID']}`).remove();
                selectedInvoices.splice(selectedInvoices.findIndex((e) => { return e.ID === selectedInvoices[i]['ID']; }), 1);
            }
            for (let i=0; i<selectedPayments.length; i++) {
                $(`#payment-${selectedPayments[i]['ID']}`).remove();
                selectedPayments.splice(selectedPayments.findIndex((e) => { return e.ID === selectedPayments[i]['ID']; }), 1);
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

function findMatch() {
    $('#invoices').html('');
    $('#payments').html('');
    matchedInvoices = [];
    matchedPayments = [];
    selectedInvoices = [];
    selectedPayments = [];
    for (let i=0; i<allInvoices.length; i++) {
        let invoice = allInvoices[i],
            check = searchForKeywords(invoice);
        if (check){
            console.log(invoice)
            console.log(check)
            matchedInvoices.push(invoice);
            matchedInvoices.push(invoice);
        }

    }
}

function searchForKeywords(invoice) {
    let phoneMatch = ($.grep(allPayments, (e) => {
            let exp = new RegExp(invoice.phone, 'gi');
            return e.description.match(exp);
        }))[0],
        firstnameMatch = ($.grep(allPayments, (e) => {
            if (!invoice.first_name) return false;
            let exp = new RegExp(invoice.first_name.toLowerCase(), 'gi');
            return e.description.toLowerCase().match(exp);
        }))[0],
        middlenameMatch = ($.grep(allPayments, (e) => {
            if (!invoice.middle_name) return false;
            let exp = new RegExp(invoice.middle_name.toLowerCase(), 'gi');
            return e.description.toLowerCase().match(exp);
        }))[0],
        lastnameMatch = ($.grep(allPayments, (e) => {
            if (!invoice.last_name) return false;
            let exp = new RegExp(invoice.last_name.toLowerCase(), 'gi');
            return e.description.toLowerCase().match(exp);
        }))[0],
        amountMatch = ($.grep(allPayments, (e) => {
            if (!invoice.payment_amount) return false;
            let exp = new RegExp(invoice.payment_amount, 'gi');
            return e.credit.match(exp);
        }))[0];

    let status = false,
        result = {};
    if (phoneMatch) {
        status = true;
        result.key = 'phone';
        result.value = invoice.phone;
        result.payment = phoneMatch;
    } else if (firstnameMatch) {
        status = true;
        result.key = 'first_name';
        result.value = invoice.first_name;
        result.payment = firstnameMatch;
    } else if (middlenameMatch) {
        status = true;
        result.key = 'middle_name';
        result.value = invoice.middle_name;
        result.payment = middlenameMatch;
    } else if (lastnameMatch) {
        status = true;
        result.key = 'last_name';
        result.value = invoice.last_name;
        result.payment = lastnameMatch;
    } else if (amountMatch) {
        status = true;
        result.key = 'amount';
        result.value = invoice.payment_amount;
        result.payment = amountMatch;
    }
    if (!status)
        return false;
    return result;
}

function removeDebits() {
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
                    'url': `/collection/bulk_upload/records/debit`,
                    'type': 'delete',
                    'success': function (data) {
                        $('#wait').hide();
                        if (data.status === 200) {
                            notification('Debit payments removed successfully', '', 'success');
                            window.location.reload();
                        } else {
                            console.log(data.error);
                            notification(data.error, '', 'error');
                        }
                    },
                    'error': function (err) {
                        console.log(err);
                        notification('No internet connection', '', 'error');
                    }
                });
            }
        });
}