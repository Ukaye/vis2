$(document).ready(function() {
    xeroStatus();
});

function xeroStatus() {
    $('#wait').show();
    $.ajax({
        'type': 'get',
        'url': `/xero/status/get`,
        'success': function (data) {
            $('#wait').hide();
            if (data) {
                getAccounts();
                $('#xeroConfig .modal-footer .btn-success').hide();
            } else {
                $('#xeroConfig .modal-footer .btn-primary').hide();
                $('#xeroConfig .modal-body').html(`      
                    <div class="alert alert-danger" role="alert" style="margin-top: 15px;">
                        <h3 class="alert-heading">Xero is not connected!</h3>
                        <p>Your account needs to be connected to xero before setting up configurations.</p>
                        <hr>
                        <p class="mb-0">Please contact the admin for any related issues.</p>
                    </div>
                `);
            }
        }
    });
}

function connectXero() {
    notification('Please wait a moment!', '', 'info');
    $('#wait').show();
    $.ajax({
        'type': 'get',
        'url': `/xero/connect`,
        'success': function (data) {
            $('#wait').hide();
            return notification(data.response, '', 'info')
        }
    });
}

$('#xero_loan_account').click(function (e) {
    if ($('#xero_loan_account').is(':checked')) {
        $('#xero_loan_account_status').prop('disabled', false);
        $('#xero_disbursement_account').prop('disabled', false);
        $('#xero_principal_account').prop('disabled', false);
        $('#xero_interest_account').prop('disabled', false);
        $('#xero_web_principal_account').prop('disabled', false);
        $('#xero_web_interest_account').prop('disabled', false);
    } else {
        $('#xero_loan_account_status').prop('disabled', true);
        $('#xero_disbursement_account').prop('disabled', true);
        $('#xero_principal_account').prop('disabled', true);
        $('#xero_interest_account').prop('disabled', true);
        $('#xero_web_principal_account').prop('disabled', true);
        $('#xero_web_interest_account').prop('disabled', true);
    }
});

$('#xero_writeoff').click(function (e) {
    if ($('#xero_writeoff').is(':checked')) {
        $('#xero_writeoff_account').prop('disabled', false);
    } else {
        $('#xero_writeoff_account').prop('disabled', true);
    }
});

$('#xero_collection_bank').click(function (e) {
    if ($('#xero_collection_bank').is(':checked')) {
        $('#xero_collection_description').parent().show();
    } else {
        $('#xero_collection_description').parent().hide();
    }
});

function getAccounts() {
    $.ajax({
        'type': 'get',
        'url': "/settings/accounts",
        'success': function (data) {
            $.each(data.response, function (key, account) {
                if (account.Type === 'CURRENT') {
                    $('#xero_disbursement_account').append(`<option value="${account.Code}">${account.Name}</option>`);
                    $('#xero_principal_account').append(`<option value="${account.Code}">${account.Name}</option>`);
                    $('#xero_web_principal_account').append(`<option value="${account.Code}">${account.Name}</option>`);
                }
                if (account.Class === 'REVENUE') {
                    $('#xero_interest_account').append(`<option value="${account.Code}">${account.Name} (${account.Type})</option>`);
                    $('#xero_web_interest_account').append(`<option value="${account.Code}">${account.Name} (${account.Type})</option>`);
                }
                if (account.Class === 'EXPENSE')
                    $('#xero_writeoff_account').append(`<option value="${account.Code}">${account.Name} (${account.Type})</option>`);
            });
            getUsers();
        }
    });
}

function getUsers(){
    $.ajax({
        'type': 'get',
        'url': '/user/get',
        'success': function (data) {
            $.each(data.response, function (key, val) {
                $("#xero_users").append(`<option value = "${val.ID}">${val.fullname}</option>`);
            });
            $('#xero_users').multiselect({
                includeSelectAllOption: true
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
            if (!config) return;
            if (config.xero_client) $('#xero_client').prop('checked', true);
            if (config.xero_loan_account) {
                $('#xero_loan_account').prop('checked', true);
                $('#xero_loan_account_status').prop('disabled', false);
                $('#xero_disbursement_account').prop('disabled', false);
                $('#xero_principal_account').prop('disabled', false);
                $('#xero_interest_account').prop('disabled', false);
                $('#xero_web_principal_account').prop('disabled', false);
                $('#xero_web_interest_account').prop('disabled', false);
            }
            if (config.xero_loan_account_status) $('#xero_loan_account_status').val(config.xero_loan_account_status);
            if (config.xero_disbursement_account) $('#xero_disbursement_account').val(config.xero_disbursement_account);
            if (config.xero_principal_account) $('#xero_principal_account').val(config.xero_principal_account);
            if (config.xero_interest_account) $('#xero_interest_account').val(config.xero_interest_account);
            if (config.xero_web_principal_account) $('#xero_web_principal_account').val(config.xero_web_principal_account);
            if (config.xero_web_interest_account) $('#xero_web_interest_account').val(config.xero_web_interest_account);
            if (config.xero_collection_bank) {
                $('#xero_collection_bank').prop('checked', true);
                $('#xero_collection_description').parent().show();
            }
            if (config.xero_collection_description) $('#xero_collection_description').prop('checked', true);
            if (config.xero_escrow) $('#xero_escrow').prop('checked', true);
            if (config.xero_writeoff) {
                $('#xero_writeoff').prop('checked', true);
                $('#xero_writeoff_account').prop('disabled', false);
            }
            if (config.xero_writeoff_account) $('#xero_writeoff_account').val(config.xero_writeoff_account);
            if (config.xero_users) {
                $('#xero_users').val(config.xero_users.split(','));
                $('#xero_users').multiselect("refresh");
            }
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function saveXeroConfig() {
    let config = {};
    if ($('#xero_loan_account').is(':checked')) {
        config.xero_loan_account = 1;
        config.xero_loan_account_status = $('#xero_loan_account_status').val();
        if ($('#xero_disbursement_account').val() === '000')
            return notification('Kindly select a disbursement account!', '', 'warning');
        config.xero_disbursement_account = $('#xero_disbursement_account').val();
        if ($('#xero_principal_account').val() === '000')
            return notification('Kindly select a principal account!', '', 'warning');
        config.xero_principal_account = $('#xero_principal_account').val();
        if ($('#xero_interest_account').val() === '000')
            return notification('Kindly select a interest account!', '', 'warning');
        config.xero_interest_account = $('#xero_interest_account').val();
        if ($('#xero_web_principal_account').val() === '000')
            return notification('Kindly select a web principal account!', '', 'warning');
        config.xero_web_principal_account = $('#xero_web_principal_account').val();
        if ($('#xero_web_interest_account').val() === '000')
            return notification('Kindly select a web interest account!', '', 'warning');
        config.xero_web_interest_account = $('#xero_web_interest_account').val();
    }
    if ($('#xero_writeoff').is(':checked')) {
        if ($('#xero_writeoff_account').val() === '000')
            return notification('Kindly select a write off account!', '', 'warning');
        config.xero_writeoff = 1;
        config.xero_writeoff_account = $('#xero_writeoff_account').val();
    }
    if ($('#xero_client').is(':checked')) config.xero_client = 1;
    if ($('#xero_collection_bank').is(':checked')) {
        config.xero_collection_bank = 1;
        if ($('#xero_collection_description').is(':checked')) config.xero_collection_description = 1;
    }
    if ($('#xero_escrow').is(':checked')) config.xero_escrow = 1;
    if ($('#xero_users').val()) config.xero_users = ($('#xero_users').val()).join();
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