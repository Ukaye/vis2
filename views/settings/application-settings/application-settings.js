$(document).ready(function () {
    getLoanPurposes();
    getLoanBusinesses();
    getApplicationSettings();
});

$(document).ajaxStart(function () {
    $("#wait").css("display", "block");
});

$(document).ajaxComplete(function () {
    $("#wait").css("display", "none");
});

$("#loan_requested_min").on("keyup", function () {
    let val = $("#loan_requested_min").val();
    $("#loan_requested_min").val(numberToCurrencyformatter(val));
});

$("#loan_requested_max").on("keyup", function () {
    let val = $("#loan_requested_max").val();
    $("#loan_requested_max").val(numberToCurrencyformatter(val));
});

$("#tenor_min").on("keyup", function () {
    let val = $("#tenor_min").val();
    $("#tenor_min").val(numberToCurrencyformatter(val));
});

$("#tenor_max").on("keyup", function () {
    let val = $("#tenor_max").val();
    $("#tenor_max").val(numberToCurrencyformatter(val));
});

$("#interest_rate_min").on("keyup", function () {
    let val = $("#interest_rate_min").val();
    $("#interest_rate_min").val(numberToCurrencyformatter(val));
});

$("#interest_rate_max").on("keyup", function () {
    let val = $("#interest_rate_max").val();
    $("#interest_rate_max").val(numberToCurrencyformatter(val));
});

function getApplicationSettings() {
    $('#wait').show();
    $.ajax({
        type: "GET",
        url: "/settings/application",
        success: function (data) {
            let settings_obj = data.response;
            $('#wait').hide();
            if (settings_obj) {
                $('#loan_requested_min').val(numberToCurrencyformatter(settings_obj.loan_requested_min));
                $('#loan_requested_max').val(numberToCurrencyformatter(settings_obj.loan_requested_max));
                $('#tenor_min').val(numberToCurrencyformatter(settings_obj.tenor_min));
                $('#tenor_max').val(numberToCurrencyformatter(settings_obj.tenor_max));
                $('#interest_rate_min').val(numberToCurrencyformatter(settings_obj.interest_rate_min));
                $('#interest_rate_max').val(numberToCurrencyformatter(settings_obj.interest_rate_max));
            }
        }
    });
}

function saveApplicationSettings() {
    let settings_obj = {};
    settings_obj.loan_requested_min = currencyToNumberformatter($('#loan_requested_min').val());
    settings_obj.loan_requested_max = currencyToNumberformatter($('#loan_requested_max').val());
    settings_obj.tenor_min = currencyToNumberformatter($('#tenor_min').val());
    settings_obj.tenor_max = currencyToNumberformatter($('#tenor_max').val());
    settings_obj.interest_rate_min = currencyToNumberformatter($('#interest_rate_min').val());
    settings_obj.interest_rate_max = currencyToNumberformatter($('#interest_rate_max').val());
    settings_obj.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;
    if (settings_obj.loan_requested_min <= 0)
        return notification('Invalid loan requested min','','warning');
    if (settings_obj.loan_requested_max <= 0)
        return notification('Invalid loan requested max','','warning');
    if (settings_obj.tenor_min <= 0)
        return notification('Invalid tenor min','','warning');
    if (settings_obj.tenor_max <= 0)
        return notification('Invalid tenor max','','warning');
    if (settings_obj.interest_rate_min <= 0)
        return notification('Invalid interest rate min','','warning');
    if (settings_obj.interest_rate_max <= 0)
        return notification('Invalid interest rate max','','warning');
    $('#wait').show();
    $.ajax({
        'url': '/settings/application',
        'type': 'post',
        'data': settings_obj,
        'success': function (data) {
            $('#wait').hide();
            if (data.status === 200) {
                notification('Application settings saved successfully!', '', 'success');
                window.location.reload();
            } else {
                notification(data.error, '', 'error');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            notification('No internet connection', '', 'error');
        }
    });
}

function getLoanPurposes(){
    $.ajax({
        'url': '/settings/application/loan_purpose',
        'type': 'get',
        'success': function (data) {
            let purposes = data.response;
            populateLoanPurposes(purposes);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function addLoanPurpose() {
    let purpose = {};
    purpose.title = $('#purpose_of_loan').val();
    if (!purpose.title)
        return notification('Kindly input a title','','warning');
    purpose.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;
    $('#wait').show();
    $.ajax({
        'url': '/settings/application/loan_purpose',
        'type': 'post',
        'data': purpose,
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification(response.error, "", "error");
            } else{
                $('#purpose_of_loan').val('');
                notification("Loan purpose added successfully!", "", "success");
                populateLoanPurposes(response.response);
            }
        }
    });
}

function populateLoanPurposes(data){
    let $purposes = $("#purposes");
    $purposes.DataTable().clear();
    let purposes = [];
    $.each(data, function(k, v){
        v.actions = '<button type="button" class="btn btn-danger" onclick="removeLoanPurpose('+v.ID+')"><i class="fa fa-remove"></i></button>';
        purposes.push(v);
    });
    $purposes.DataTable({
        dom: 'Bfrtip',
        bDestroy: true,
        data: purposes,
        buttons: [],
        columns: [
            { data: "title" },
            { data: "actions" }
        ]
    });
}

function removeLoanPurpose(id) {
    $('#wait').show();
    $.ajax({
        'url': '/settings/application/loan_purpose/'+id,
        'type': 'delete',
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification("No internet connection", "", "error");
            } else{
                notification("Loan purpose deleted successfully!", "", "success");
                populateLoanPurposes(response.response);
            }
        }
    });
}

function getLoanBusinesses(){
    $.ajax({
        'url': '/settings/application/business',
        'type': 'get',
        'success': function (data) {
            let businesses = data.response;
            populateLoanBusinesses(businesses);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function addLoanBusiness() {
    let business = {};
    business.name = $('#nature_of_business').val();
    if (!business.name)
        return notification('Kindly input a business','','warning');
    business.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;
    $('#wait').show();
    $.ajax({
        'url': '/settings/application/business',
        'type': 'post',
        'data': business,
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification(response.error, "", "error");
            } else{
                $('#nature_of_business').val('');
                notification("Loan business added successfully!", "", "success");
                populateLoanBusinesses(response.response);
            }
        }
    });
}

function populateLoanBusinesses(data){
    let $businesses = $("#businesses");
    $businesses.DataTable().clear();
    let businesses = [];
    $.each(data, function(k, v){
        v.actions = '<button type="button" class="btn btn-danger" onclick="removeLoanBusiness('+v.ID+')"><i class="fa fa-remove"></i></button>';
        businesses.push(v);
    });
    $businesses.DataTable({
        dom: 'Bfrtip',
        bDestroy: true,
        data: businesses,
        buttons: [],
        columns: [
            { data: "name" },
            { data: "actions" }
        ]
    });
}

function removeLoanBusiness(id) {
    $('#wait').show();
    $.ajax({
        'url': '/settings/application/business/'+id,
        'type': 'delete',
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification("No internet connection", "", "error");
            } else{
                notification("Loan business deleted successfully!", "", "success");
                populateLoanBusinesses(response.response);
            }
        }
    });
}
