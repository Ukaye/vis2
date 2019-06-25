$(document).ready(function () {
    getLoanPurposes();
    getLoanBusinesses();
    getBadChequeReasons();
    getFeeSettings();
    getApplicationSettings();
    const $body = $('body');
    $body.delegate('input[name^="lower-"]', 'keyup', function(e) {
        let val = $(`input[name="${e.target.name}"]`).val();
        $(`input[name="${e.target.name}"]`).val(numberToCurrencyformatter(val));
    });
    $body.delegate('input[name^="upper-"]', 'keyup', function(e) {
        let val = $(`input[name="${e.target.name}"]`).val();
        $(`input[name="${e.target.name}"]`).val(numberToCurrencyformatter(val));
    });
    $body.delegate('select[name^="type-"]', 'change', function(e) {
        let i = (e.target.name.split('-'))[1];
        $(`input[name="amount-${i}"]`).val('');
    });
    $body.delegate('input[name^="amount-"]', 'keyup', function(e) {
        let val = $(`input[name="${e.target.name}"]`).val();
        $(`input[name="${e.target.name}"]`).val(numberToCurrencyformatter(val));
    });
});

let counter = 1;

$("#addFeeGrade").on("click", function () {
    counter++;
    let newRow = $("<tr>");
    let cols = "";
    cols += `<td><input type="text" name="lower-${counter}" title="lower limit" placeholder="0" /></td>`;
    cols += `<td><input type="text" name="upper-${counter}" title="upper limit" placeholder="0" /></td>`;
    cols += `<td>
                <select name="type-${counter}" title="fee type">
                    <option value="fixed" selected="selected">Fixed</option>
                    <option value="percentage">Percentage</option>
                </select>   
             </td>`;
    cols += `<td><input type="text" name="amount-${counter}" title="fee amount" placeholder="0" /></td>`;
    cols += `<td><a class="deleteFeeGrade btn btn-sm btn-danger"><span class="fa fa-remove"></span></a></td>`;
    newRow.append(cols);
    $("table.fees_grades").append(newRow);
});

$("table.fees_grades").on("click", "a.deleteFeeGrade", function (event) {
    $(this).closest("tr").remove();
});

function getGradedFees() {
    let grades = [],
        status = true;
    $("table.fees_grades").find('input[name^="amount-"]').each(function () {
        let grade = {},
            i = ($(this).attr('name').split('-'))[1],
            $lower = $(`input[name="lower-${i}"]`),
            $upper = $(`input[name="upper-${i}"]`),
            $type = $(`select[name="type-${i}"]`),
            $amount = $(`input[name="amount-${i}"]`),
            lower_limit = currencyToNumberformatter($lower.val()),
            upper_limit = currencyToNumberformatter($upper.val()),
            type = $type.val(),
            amount = currencyToNumberformatter($amount.val());
        if (!lower_limit) {
            status = false;
            $lower.addClass('invalid');
        } else {
            $lower.removeClass('invalid');
        }
        if (!upper_limit) {
            status = false;
            $upper.addClass('invalid');
        } else {
            $upper.removeClass('invalid');
        }
        if (!type) {
            status = false;
            $type.addClass('invalid');
        } else {
            $type.removeClass('invalid');
        }
        if (!amount) {
            status = false;
            $amount.addClass('invalid');
        } else {
            $amount.removeClass('invalid');
        }
        grade.lower_limit = lower_limit;
        grade.upper_limit = upper_limit;
        grade.type = type;
        grade.amount = amount;
        grades.push(grade);
    });
    return {status: status, grades: grades};
}

$('#fees_type').change(function (e) {
    switch (e.target.value) {
        case 'manual': {
            $('#fees_grades_div').hide();
            $('#fees_automatic_div').hide();
            break;
        }
        case 'automatic': {
            if ($('#fees_automatic_type').val() === 'graded')
                $('#fees_grades_div').show();
            $('#fees_automatic_div').show();
            break;
        }
    }
});

$('#fees_automatic_type').change(function (e) {
    switch (e.target.value) {
        case 'flat': {
            $('#fees_flat_div').show();
            $('#fees_grades_div').hide();
            break;
        }
        case 'graded': {
            $('#fees_flat_div').hide();
            $('#fees_grades_div').show();
            break;
        }
    }
});

$('#fee_type').change(function (e) {
    $('#fee_amount').val('');
});

$("#vat").on("keyup", function () {
    let val = $("#vat").val();
    $("#vat").val(numberToCurrencyformatter(val));
});

$("#fee_amount").on("keyup", function () {
    let val = $("#fee_amount").val();
    $("#fee_amount").val(numberToCurrencyformatter(val));
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

function getFeeSettings() {
    $('#wait').show();
    $.ajax({
        type: "GET",
        url: "/settings/fees",
        success: function (data) {
            let settings_obj = data.response;
            $('#wait').hide();
            if (settings_obj) {
                $('#vat').val(numberToCurrencyformatter(settings_obj.vat));
                $('#fees_type').val(settings_obj.fees_type).trigger('change');
                if (settings_obj.fees_automatic_type) {
                    $('#fees_automatic_type').val(settings_obj.fees_automatic_type).trigger('change');
                    if (settings_obj.fees_automatic_type === 'flat') {
                        $('#fee_type').val(settings_obj['grades'][0]['type']);
                        $('#fee_amount').val(numberToCurrencyformatter(settings_obj['grades'][0]['amount']));
                    } else {
                        counter = 0;
                        $("table.fees_grades > tbody").html("");
                        for (let i=0; i<settings_obj['grades'].length; i++){
                            let grade = settings_obj['grades'][i];
                            let newRow = $("<tr>");
                            let cols = "";
                            counter++;
                            cols += `<td><input type="text" name="lower-${counter}" title="lower limit" placeholder="0" /></td>`;
                            cols += `<td><input type="text" name="upper-${counter}" title="upper limit" placeholder="0" /></td>`;
                            cols += `<td>
                            <select name="type-${counter}" title="fee type">
                                <option value="fixed" selected="selected">Fixed</option>
                                <option value="percentage">Percentage</option>
                            </select>   
                         </td>`;
                            cols += `<td><input type="text" name="amount-${counter}" title="fee amount" placeholder="0" /></td>`;
                            cols += `<td><a class="deleteFeeGrade btn btn-sm btn-danger"><span class="fa fa-remove"></span></a></td>`;
                            newRow.append(cols);
                            $("table.fees_grades").append(newRow);
                            $(`input[name="lower-${counter}"]`).val(grade.lower_limit);
                            $(`input[name="upper-${counter}"]`).val(grade.upper_limit);
                            $(`select[name="type-${counter}"]`).val(grade.type);
                            $(`input[name="amount-${counter}"]`).val(grade.amount);
                        }
                    }
                }
            }
        }
    });
}

function getApplicationSettings() {
    $.ajax({
        type: "GET",
        url: "/settings/application",
        success: function (data) {
            let settings_obj = data.response;
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
    if (!settings_obj.loan_requested_min || settings_obj.loan_requested_min <= 0)
        return notification('Invalid loan requested min','','warning');
    if (!settings_obj.loan_requested_max || settings_obj.loan_requested_max <= 0)
        return notification('Invalid loan requested max','','warning');
    if (!settings_obj.tenor_min || settings_obj.tenor_min <= 0)
        return notification('Invalid tenor min','','warning');
    if (!settings_obj.tenor_max || settings_obj.tenor_max <= 0)
        return notification('Invalid tenor max','','warning');
    if (!settings_obj.interest_rate_min || settings_obj.interest_rate_min <= 0)
        return notification('Invalid interest rate min','','warning');
    if (!settings_obj.interest_rate_max || settings_obj.interest_rate_max <= 0)
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

function saveFeesSettings() {
    let payload = {};
    payload.fees_type = $('#fees_type').val();
    payload.vat = currencyToNumberformatter($('#vat').val());
    if (payload.fees_type === '-- Select Fees Type --' || !payload.vat)
        return notification('Kindly fill all required inputs','','warning');
    if (payload.fees_type === 'automatic') {
        payload.fees_automatic_type = $('#fees_automatic_type').val();
        if (payload.fees_automatic_type === 'flat') {
            let fee_type = $('#fee_type').val(),
                fee_amount = currencyToNumberformatter($('#fee_amount').val());
            if (fee_type && fee_amount) {
                payload.grades = [
                    {
                        lower_limit: '0',
                        upper_limit: '999999999999',
                        type: fee_type,
                        amount: fee_amount
                    }
                ];
            } else {
                return notification('Kindly specify flat fee amount','','warning');
            }
        } else {
            $('#fees_grades_div').show();
            if (getGradedFees().status) {
                payload.grades = getGradedFees().grades;
            } else {
                return notification('Oops! There are some error(s) in your graded fees','','warning');
            }
        }
    }
    payload.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;
    $('#wait').show();
    $.ajax({
        'url': '/settings/fees',
        'type': 'post',
        'data': payload,
        'success': function (data) {
            $('#wait').hide();
            if (data.status === 200) {
                notification('Fees settings saved successfully!', '', 'success');
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

function getBadChequeReasons(){
    $.ajax({
        'url': '/settings/application/bad_cheque_reason',
        'type': 'get',
        'success': function (data) {
            let reasons = data.response;
            populateBadChequeReasons(reasons);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function addBadChequeReason() {
    let reason = {};
    reason.title = $('#reason_bad_cheque').val();
    if (!reason.title)
        return notification('Kindly input a title','','warning');
    reason.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;
    $('#wait').show();
    $.ajax({
        'url': '/settings/application/bad_cheque_reason',
        'type': 'post',
        'data': reason,
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification(response.error, "", "error");
            } else{
                $('#reason_bad_cheque').val('');
                notification("Bad cheque reason added successfully!", "", "success");
                populateBadChequeReasons(response.response);
            }
        }
    });
}

function populateBadChequeReasons(data){
    let $reasons = $("#reasons");
    $reasons.DataTable().clear();
    let reasons = [];
    $.each(data, function(k, v){
        if (v.type === 'default') {
            v.actions = '<i class="fa fa-lg fa-lock"></i>';
        } else {
            v.actions = '<button type="button" class="btn btn-danger" onclick="removeBadChequeReason('+v.ID+')"><i class="fa fa-remove"></i></button>';
        }
        reasons.push(v);
    });
    $reasons.DataTable({
        dom: 'Bfrtip',
        bDestroy: true,
        data: reasons,
        buttons: [],
        columns: [
            { data: "title" },
            { data: "actions" }
        ]
    });
}

function removeBadChequeReason(id) {
    $('#wait').show();
    $.ajax({
        'url': '/settings/application/bad_cheque_reason/'+id,
        'type': 'delete',
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification("No internet connection", "", "error");
            } else{
                notification("Bad cheque reason deleted successfully!", "", "success");
                populateBadChequeReasons(response.response);
            }
        }
    });
}