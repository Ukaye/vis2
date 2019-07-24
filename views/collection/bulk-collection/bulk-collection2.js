$(document).ready(function() {
    getInvoices();
    getStatements();
});

function getStatements(){
    $.ajax({
        type: 'GET',
        url: '/collection/bulk_upload/history',
        success: function (data) {
            $.each(data.response, function (key, val) {
                $('#statement').append(`<option value="${val.ID}">${val.name} (${val.start} to ${val.end})</option>`);
            });
        }
    });
}

$('#statement').change((e) => {
    getPayments(e.target.value);
});


let allInvoices = [],
    allPayments = [],
    matchedInvoices = [],
    matchedPayments = [],
    selectedInvoices = [],
    selectedPayments = [],
    unmatchedInvoices = [],
    unmatchedPayments = [];

function getInvoices(){
    $('#wait').show();
    $.ajax({
        type: 'GET',
        url: '/collection/invoices/due',
        success: function (data) {
            let response = data.response;
            allInvoices = response;
            $('#invoices').html('');
            unmatchedInvoices = [];
            selectedInvoices = [];
            getPayments();
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
                    <p><strong>Name: </strong>${val.client}</p>
                    <p><strong>Date: </strong>${val.payment_collect_date} ${status}</p>
                    <p><strong>Amount: </strong>${numberToCurrencyFormatter_(val.payment_amount)} (${val.type})</p>
                </div>
                <div class="col-lg-3">
                    <p><input class="form-control" type="checkbox" onclick="selectInvoice('${encodeURIComponent(JSON.stringify(val))}')" /></p>
                    <p><a class="btn btn-primary btn-sm" href="/application?id=${val.applicationID}">View Loan</a></p>
                </div>
            </div>
        </li>`);
}

function getPayments(id){
    let url = '/collection/bulk_upload';
    if (id && id !== '0') url = url.concat(`?history=${id}`);
    $.ajax({
        type: 'GET',
        url: url,
        success: function (data) {
            let response = data.response;
            allPayments = response;
            $('#payments').html('');
            unmatchedPayments = [];
            selectedPayments = [];
            $('#wait').hide();
            $.each(response, function (key, val) {
                displayPayment(val);
            });
        }
    });
}

function displayPayment(val) {
    let type,
        amount = currencyToNumberformatter(val.credit) - currencyToNumberformatter(val.debit);
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
                    <p><strong>Amount: </strong>${numberToCurrencyFormatter_(amount)}
                        <small class="text-muted"><strong>Allocated: </strong>${numberToCurrencyFormatter_(val.allocated)} 
                            <strong>Unallocated: </strong>${numberToCurrencyFormatter_(val.unallocated)}
                        </small></p>
                    <p><strong>Date: </strong>${val.value_date} ${type}</p>
                    <p><strong>Description: </strong>${val.description}</p>
                </div>
                <div class="col-lg-2">
                    <p><input class="form-control" type="checkbox" onclick="selectPayment('${encodeURIComponent(JSON.stringify(val))}')" /></p>
                    <p><a class="btn btn-danger btn-sm" onclick="removePayment('${encodeURIComponent(JSON.stringify(val))}')"><i class="fa fa-trash"></i></a></p>
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
            console.log(selectedInvoices)
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
        totalPayment = sumArrayObjects(selectedPayments, 'unallocated'),
        overpayment = (totalPayment - totalInvoice).round(2);

    if (overpayment > 0 && selectedInvoices.length === 1) {
        swal({
            title: 'Are you sure?',
            text: `Overpayment of ₦${numberToCurrencyFormatter_(overpayment)} would be saved to escrow`,
            icon:  'warning',
            buttons: true,
            dangerMode: true
        })
            .then((yes) => {
                if (yes) {
                    postPayment(overpayment, true);
                } else {
                    swal({
                        title: 'Are you sure?',
                        text: `₦${numberToCurrencyFormatter_(overpayment)} will remain unallocated`,
                        icon:  'warning',
                        buttons: true,
                        dangerMode: true
                    })
                        .then((yes) => {
                            if (yes) {
                                postPayment(overpayment);
                            }
                        });
                }
            });
    } else {
        postPayment(overpayment);
    }
}

function postPayment(overpayment, escrow) {
    $('#wait').show();
    $.ajax({
        'url': '/collection/bulk_upload/confirm-payment',
        'type': 'post',
        'data': {
            escrow: escrow,
            overpayment: overpayment,
            invoices: selectedInvoices,
            payments: selectedPayments,
            created_by: (JSON.parse(localStorage.getItem('user_obj')))['ID']
        },
        'success': function (data) {
            if (overpayment > 0 && selectedInvoices.length === 1) {
                $('#wait').hide();
                notification(data.response, '', 'success');
                return window.location.reload();
            }
            const invoice_count = selectedInvoices.length,
                payment_count = selectedPayments.length;
            for (let i=0; i<invoice_count; i++) {
                let inv = selectedInvoices[0];
                $(`#invoice-${inv['type']}-${inv['ID']}`).remove();
                selectedInvoices.splice(selectedInvoices.findIndex((e) => { return e.ID === inv['ID']; }), 1);
            }
            for (let i=0; i<payment_count; i++) {
                // $(`#payment-${selectedPayments[i]['ID']} small`).html(`
                //         <strong>Allocated: </strong>${numberToCurrencyFormatter_(totalInvoice)}
                //         <strong>Unallocated: </strong>${numberToCurrencyFormatter_(overpayment)}`);
                // let payment_update = selectedPayments[i];
                // payment_update.allocated = totalInvoice;
                // payment_update.unallocated = overpayment;
                // selectedPayments.splice(selectedPayments.findIndex((e) => { return e.ID === payment_update.ID; }), 0, payment_update);
                // allPayments.splice(allPayments.findIndex((e) => { return e.ID === payment_update.ID; }), 0, payment_update);

                let pay = selectedPayments[0];
                $(`#payment-${pay['ID']}`).remove();
                selectedPayments.splice(selectedPayments.findIndex((e) => { return e.ID === pay['ID']; }), 1);
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

function findMatches() {
    swal({
        title: "Are you sure?",
        text: "Kindly relax, this might take a while",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                $('#invoices').html('');
                $('#payments').html('');
                matchedInvoices = [];
                unmatchedInvoices = [];
                unmatchedPayments = allPayments;
                $('#wait').show();
                for (let i=0; i<allInvoices.length; i++) {
                    let invoice = allInvoices[i],
                        check = searchForKeywords(invoice);
                    if (!check) {
                        unmatchedInvoices.push(invoice);
                    } else {
                        let type,
                            payment = check.payment,
                            checkMatchedInvoices = ($.grep(matchedInvoices, (e) => { return e.ID === invoice.ID }))[0],
                            amount = currencyToNumberformatter(payment.credit) - currencyToNumberformatter(payment.debit);
                        if (!checkMatchedInvoices) {
                            if (amount >= 0) {
                                type = '<span class="badge badge-success">CREDIT</span>';
                            } else {
                                type = '<span class="badge badge-danger">DEBIT</span>';
                                amount = -amount;
                            }
                            matchedInvoices.push(invoice);
                            unmatchedPayments.splice(unmatchedPayments.findIndex((e) => { return e.ID === payment.ID; }), 1);
                            $('#invoices').append(`
                                <li id="invoice-${invoice.type}-${invoice.ID}" class="ui-state-default invoice-match">
                                    <div class="row">
                                        <div class="col-lg-9">
                                            <p><strong>Name: </strong>${invoice.client} <span class="badge badge-warning" style="float: right;">
                                                <i class="fa fa-link"></i> ${check.value}</span></p>
                                            <p><strong>Date: </strong>${invoice.payment_collect_date}</p>
                                            <p><strong>Amount: </strong>${numberToCurrencyFormatter_(invoice.payment_amount)} (${invoice.type})</p>
                                        </div>
                                        <div class="col-lg-3">
                                            <p><input class="form-control" type="checkbox" onclick="selectInvoice('${encodeURIComponent(JSON.stringify(invoice))}')" /></p>
                                            <p><a class="btn btn-primary btn-sm" href="/application?id=${invoice.applicationID}">View Loan</a></p>
                                        </div>
                                    </div>
                                </li>`);
                            $('#payments').append(`
                                <li id="payment-${payment.ID}" class="ui-state-default payment-match">
                                    <div class="row">
                                        <div class="col-lg-10">
                                            <p><strong>Amount: </strong>${numberToCurrencyFormatter_(amount)} <span class="badge badge-warning" style="float: right;">
                                                <i class="fa fa-link"></i> ${check.value}</span></p>
                                            <p><strong>Date: </strong>${payment.value_date} ${type}</p>
                                            <p><strong>Description: </strong>${payment.description}</p>
                                        </div>
                                        <div class="col-lg-2">
                                            <p><input class="form-control" type="checkbox" onclick="selectPayment('${encodeURIComponent(JSON.stringify(payment))}')" /></p>
                                            <p><a class="btn btn-danger btn-sm" onclick="removePayment('${encodeURIComponent(JSON.stringify(payment))}')">
                                                <i class="fa fa-trash"></i></a></p>
                                        </div>
                                    </div>
                                </li>`);
                        }
                    }
                }
                if (matchedInvoices.length === 0) notification('No match found!', '', 'warning');
                for (let i=0; i<unmatchedInvoices.length; i++) {
                    displayInvoice(unmatchedInvoices[i]);
                }
                for (let i=0; i<unmatchedPayments.length; i++) {
                    displayPayment(unmatchedPayments[i]);
                }
                $('#wait').hide();
            }
        });
}

function searchForKeywords(invoice) {
    let allPayments_ = $.grep(allPayments, (e) => { return e.allocated === 0 });
    let phoneMatch = ($.grep(allPayments_, (e) => {
            if (!invoice.phone) return false;
            let desc = e.description.toLowerCase(),
                exp = new RegExp(invoice.phone, 'gi'),
                exp_ = new RegExp(invoice.phone.substr(4, invoice.phone.length), 'gi');
            return desc.match(exp) || desc.match(exp_);
        }))[0],
        firstnameMatch = ($.grep(allPayments_, (e) => {
            if (!invoice.first_name) return false;
            let desc = e.description.toLowerCase(),
                exp = new RegExp(invoice.first_name.toLowerCase(), 'gi'),
                exp_ = new RegExp(invoice.first_name.toLowerCase().substr(0, 4), 'gi'),
                exp__ = new RegExp(invoice.first_name.toLowerCase().substr(invoice.first_name.length - 4), 'gi');
            return desc.match(exp) || desc.match(exp_) || desc.match(exp__);
        }))[0],
        middlenameMatch = ($.grep(allPayments_, (e) => {
            if (!invoice.middle_name) return false;
            let desc = e.description.toLowerCase(),
                exp = new RegExp(invoice.middle_name.toLowerCase(), 'gi'),
                exp_ = new RegExp(invoice.middle_name.toLowerCase().substr(0, 4), 'gi'),
                exp__ = new RegExp(invoice.middle_name.toLowerCase().substr(invoice.middle_name.length - 4), 'gi');
            return desc.match(exp) || desc.match(exp_) || desc.match(exp__);
        }))[0],
        lastnameMatch = ($.grep(allPayments_, (e) => {
            if (!invoice.last_name) return false;
            let desc = e.description.toLowerCase(),
                exp = new RegExp(invoice.last_name.toLowerCase(), 'gi'),
                exp_ = new RegExp(invoice.last_name.toLowerCase().substr(0, 4), 'gi'),
                exp__ = new RegExp(invoice.last_name.toLowerCase().substr(invoice.last_name.length - 4), 'gi');
            return desc.match(exp) || desc.match(exp_) || desc.match(exp__);
        }))[0],
        amountMatch = ($.grep(allPayments_, (e) => {
            if (!invoice.payment_amount) return false;
            let invoice_amt = currencyToNumberformatter(e.credit).toString(),
                payment_amt = currencyToNumberformatter(invoice.payment_amount).toString(),
                exp = new RegExp(payment_amt, 'gi');
            return invoice_amt.match(exp);
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

function findReversals() {
    swal({
        title: "Are you sure?",
        text: "Kindly relax, this might take a while",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                $('#invoices').html('');
                $('#payments').html('');
                matchedPayments = [];
                unmatchedPayments = [];
                $('#wait').show();
                for (let i=0; i<allPayments.length; i++) {
                    let check = searchForReversal(allPayments[i]);
                    if (!check) {
                        if (allPayments[i]['reversal']) {
                            displayReversal(allPayments[i]);
                        } else {
                            unmatchedPayments.push(allPayments[i]);
                        }
                    } else {
                        displayReversal(allPayments[i]);
                        displayReversal(check.payment);
                    }
                }
                if (matchedPayments.length === 0) notification('No reversals found!', '', 'warning');
                for (let i=0; i<allInvoices.length; i++) {
                    displayInvoice(allInvoices[i]);
                }
                for (let i=0; i<unmatchedPayments.length; i++) {
                    displayPayment(unmatchedPayments[i]);
                }
                $('#wait').hide();
            }
        });
}

function searchForReversal(payment) {
    let allPayments_ = $.grep(allPayments, (e) => { return e.allocated === 0 });
    let amountMatch = ($.grep(allPayments_, (e) => {
            if (!payment.credit && !payment.debit) return false;
            let debit_amt = currencyToNumberformatter(e.debit).toString(),
                credit_amt = currencyToNumberformatter(e.credit).toString(),
                debit_amt_ = currencyToNumberformatter(payment.debit).toString(),
                credit_amt_ = currencyToNumberformatter(payment.credit).toString();
            return (credit_amt === debit_amt_ && credit_amt > 0) || (debit_amt === credit_amt_ && debit_amt > 0);
        }))[0];
    let status = false,
        result = {};
    if (amountMatch) {
        status = true;
        result.payment = amountMatch;
    }
    if (!status)
        return false;
    return result;
}

function displayReversal(payment) {
    let type,
        checkMatchedPayments = ($.grep(matchedPayments, (e) => { return e.ID === payment.ID }))[0],
        amount = currencyToNumberformatter(payment.credit) - currencyToNumberformatter(payment.debit);
    if (!checkMatchedPayments) {
        if (amount >= 0) {
            type = '<span class="badge badge-success">CREDIT</span>';
        } else {
            type = '<span class="badge badge-danger">DEBIT</span>';
            amount = -amount;
        }
        matchedPayments.push(payment);
        allPayments.splice(allPayments.findIndex((e) => { return e.ID === payment.ID; }), 1);
        $('#invoices').append('<li class="ui-state-empty"></li>');
        $('#payments').append(`
            <li id="payment-${payment.ID}" class="ui-state-default payment-match">
                <div class="row">
                    <div class="col-lg-10">
                        <p><strong>Amount: </strong>${numberToCurrencyFormatter_(amount)}</p>
                        <p><strong>Date: </strong>${payment.value_date} ${type}</p>
                        <p><strong>Description: </strong>${payment.description}</p>
                    </div>
                    <div class="col-lg-2">
                        <p><input class="form-control" type="checkbox" onclick="selectPayment('${encodeURIComponent(JSON.stringify(payment))}')" /></p>
                        <p><a class="btn btn-danger btn-sm" onclick="removePayment('${encodeURIComponent(JSON.stringify(payment))}')">
                            <i class="fa fa-trash"></i></a></p>
                    </div>
                </div>
            </li>`);
    }
}

$('#selectPayments').change((e) => {
    let $paymentCheckboxes = $('li[id^="payment-"]').find('input[type="checkbox"]');
    if ($('#selectPayments').is(':checked')) {
        selectedPayments = allPayments;
        $paymentCheckboxes.prop('checked', true);
    } else {
        selectedPayments = [];
        $paymentCheckboxes.prop('checked', false);
    }
});

function removePayments() {
    if (!selectedPayments[0]) return notification('No payment has been selected!', '', 'warning');
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
                    'url': `/collection/bulk_upload/records`,
                    'type': 'delete',
                    'data': {records: selectedPayments},
                    'success': function (data) {
                        $('#wait').hide();
                        if (data.status === 200) {
                            notification(data.response, '', 'success');
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