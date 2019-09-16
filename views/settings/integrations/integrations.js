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

function getAccounts() {
    $.ajax({
        'type': 'get',
        'url': "/settings/accounts",
        'success': function (data) {
            $.each(data.response, function (key, account) {
                $('#xero_escrow_account').append(`<option value="${account.Code}">${account.Name} 
                    (${account.Type})</option>`);
            });
            getXeroConfig();
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
            if (config.xero_escrow) $('#xero_escrow').prop('checked', true);
            if (config.xero_escrow_account) $('#xero_escrow_account').val(config.xero_escrow_account);
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