$(document).ready(function() {
    getAccounts();
});

function connectXero() {
    notification('Please wait a moment!', '', 'info');
    $('#wait').show();
    $.ajax({
        'type': 'get',
        'url': `/xero/connect`,
        'success': function (data) {
            $('#wait').hide();
            return notification(data.response, '', 'info')
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

$('#xero_escrow').click(function (e) {
    if ($('#xero_escrow').is(':checked')) {
        $('#xero_escrow_account').prop('disabled', false);
    } else {
        $('#xero_escrow_account').prop('disabled', true);
    }
});

$('#xero_payoff').click(function (e) {
    if ($('#xero_payoff').is(':checked')) {
        $('#xero_payoff_account').prop('disabled', false);
    } else {
        $('#xero_payoff_account').prop('disabled', true);
    }
});

$('#xero_writeoff').click(function (e) {
    if ($('#xero_writeoff').is(':checked')) {
        $('#xero_writeoff_account').prop('disabled', false);
    } else {
        $('#xero_writeoff_account').prop('disabled', true);
    }
});

function getAccounts() {
    $.ajax({
        'type': 'get',
        'url': "/settings/accounts",
        'success': function (data) {
            if (data && data.response && data.response[0]) {
                $.each(data.response, function (key, account) {
                    $('#xero_escrow_account').append(`<option value="${account.Code}">${account.Name} 
                        (${account.Type})</option>`);
                    if (account.Type === 'BANK')
                        $('#xero_payoff_account').append(`<option value="${account.Code}">${account.Name}</option>`);
                    if (account.Class === 'EXPENSE')
                        $('#xero_writeoff_account').append(`<option value="${account.Code}">${account.Name} (${account.Type})</option>`);
                });
                getXeroConfig();
            } else {
                $('#xeroConfig .modal-footer .btn-primary').hide();
                $('#xeroConfig .modal-body').html(`      
                    <div class="alert alert-danger" role="alert" style="margin-top: 15px;">
                        <h3 class="alert-heading">Xero is not connected yet!</h3>
                        <p>Your account needs to be connected to xero before setting up configurations.</p>
                        <hr>
                        <p class="mb-0">Please contact the admin for any related issues.</p>
                    </div>
                `);
            }
        }
    });
}

function getXeroConfig() {
    $.ajax({
        'type': 'get',
        'url': '/settings/xero',
        'success': function (data) {
            let config = data.response;
            if (config.xero_client) $('#xero_client').prop('checked', true);
            if (config.xero_loan_account) $('#xero_loan_account').prop('checked', true);
            if (config.xero_collection_bank) $('#xero_collection_bank').prop('checked', true);
            if (config.xero_escrow) {
                $('#xero_escrow').prop('checked', true);
                $('#xero_escrow_account').prop('disabled', false);
            }
            if (config.xero_escrow_account) $('#xero_escrow_account').val(config.xero_escrow_account);
            if (config.xero_payoff) {
                $('#xero_payoff').prop('checked', true);
                $('#xero_payoff_account').prop('disabled', false);
            }
            if (config.xero_payoff_account) $('#xero_payoff_account').val(config.xero_payoff_account);
            if (config.xero_writeoff) {
                $('#xero_writeoff').prop('checked', true);
                $('#xero_writeoff_account').prop('disabled', false);
            }
            if (config.xero_writeoff_account) $('#xero_writeoff_account').val(config.xero_writeoff_account);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function saveXeroConfig() {
    let config = {};
    if ($('#xero_escrow').is(':checked')) {
        if ($('#xero_escrow_account').val() === '000')
            return notification('Kindly select an escrow account!', '', 'warning');
        config.xero_escrow = 1;
        config.xero_escrow_account = $('#xero_escrow_account').val();
    }
    if ($('#xero_payoff').is(':checked')) {
        if ($('#xero_payoff_account').val() === '000')
            return notification('Kindly select a pay off account!', '', 'warning');
        config.xero_payoff = 1;
        config.xero_payoff_account = $('#xero_payoff_account').val();
    }
    if ($('#xero_writeoff').is(':checked')) {
        if ($('#xero_writeoff_account').val() === '000')
            return notification('Kindly select a write off account!', '', 'warning');
        config.xero_writeoff = 1;
        config.xero_writeoff_account = $('#xero_writeoff_account').val();
    }
    if ($('#xero_client').is(':checked')) config.xero_client = 1;
    if ($('#xero_loan_account').is(':checked')) config.xero_loan_account = 1;
    if ($('#xero_collection_bank').is(':checked')) config.xero_collection_bank = 1;
    config.created_by = (JSON.parse(localStorage.user_obj)).ID;
    $('#wait').show();
    $.ajax({
        'type': 'post',
        'url': '/settings/xero',
        'data': config,
        'success': function (data) {
            $('#wait').hide();
            return notification('Xero configuration saved successfully!', '', 'success');
        },
        'error': function (err) {
            console.log(err);
        }
    });
}