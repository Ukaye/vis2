$(document).ready(function() {
    getStages();
    getRoles();
});

$('#application-settings-option').click(e => {
    if ($('#application-settings-option').is(':checked')) {
        $('#application-settings-div').show();
    } else {
        $('#application-settings-div').hide();
    }
});

$("#loan_requested_min").on("keyup", e => {
    $("#loan_requested_min").val(numberToCurrencyformatter(e.target.value));
});

$("#loan_requested_max").on("keyup", e => {
    $("#loan_requested_max").val(numberToCurrencyformatter(e.target.value));
});

$("#tenor_min").on("keyup", e => {
    $("#tenor_min").val(numberToCurrencyformatter(e.target.value));
});

$("#tenor_max").on("keyup", e => {
    $("#tenor_max").val(numberToCurrencyformatter(e.target.value));
});

$("#interest_rate_min").on("keyup", e => {
    $("#interest_rate_min").val(numberToCurrencyformatter(e.target.value));
});

$("#interest_rate_max").on("keyup", e => {
    $("#interest_rate_max").val(numberToCurrencyformatter(e.target.value));
});

$('#client-information').multiselect({
    includeSelectAllOption: true
});

$("#more-actions-link").click(function() {
    $("#stage-action-div").append('<div class="input-group" style="margin-bottom: 15px;">\n' +
        '<select class="form-control local-stages-new"><option selected="selected">-- Choose Action --</option>' +
        '</select><i class="fa fa-times" style="margin: 10px; color: #dc3545;" onclick="removeAction(this)"></i></div>');
    getLocalStages();
});

function removeAction(element) {
    $(element).parent().remove();
}

$("#document-upload").click(function() {
    $("#document-upload-div").append('<div class="input-group" style="margin-bottom: 15px;">\n' +
        '    <div class="input-group-addon"><i class="fa fa-upload"></i></div>\n' +
        '    <input type="text" class="form-control document-upload-text" placeholder="Document Upload Caption" max="50">\n' +
        '<i class="fa fa-times" style="margin: 10px; color: #dc3545;" onclick="removeDocumentAction(this)"></i></div>');
});

$("#document-download").click(function() {
    $("#document-download-div").append('<div class="input-group" style="margin-bottom: 15px;">\n' +
        '    <div class="input-group-addon"><i class="fa fa-download"></i></div>\n' +
        '    <input type="text" class="form-control document-download-text" placeholder="Document Download Caption" max="50">\n' +
        '<i class="fa fa-times" style="margin: 10px; color: #dc3545;" onclick="removeDocumentAction(this)"></i></div>');
});

function removeDocumentAction(element) {
    $(element).parent().remove();
}

function resetMultiselect() {
    $('#process-rights').multiselect("clearSelection");
}

function refreshMultiselect() {
    $('#process-rights').multiselect("refresh");
}

function getLocalStages(){
    let $local_stages = $(".local-stages-new"),
        count = $("#sortable").find("li").length;
    $('.count-todos').html(count);

    $local_stages.html('<option selected="selected">-- Choose Action --</option>');
    $.each(JSON.parse(localStorage.getItem('stages')), function (key, val) {
        if (val.name === 'Application Start'){
            $local_stages.append('<option class="disabled" disabled="disabled" value = "'+encodeURIComponent(JSON.stringify(val))+'">'+val.name+'</option>');
        } else {
            $local_stages.append('<option value = "'+encodeURIComponent(JSON.stringify(val))+'">'+val.name+'</option>');
        }
    });
}

function getRoles(){
    $.ajax({
        type: "GET",
        url: "/user/user-roles/",
        success: function (response) {
            $.each(JSON.parse(response), function (key, val) {
                $("#process-rights").append('<option value = "'+val.id+'">'+val.role_name+'</option>');
            });
            $('#process-rights').multiselect({
                includeSelectAllOption: true
            });
        }
    });
}

function getStages(){
    $.ajax({
        type: "GET",
        url: "/stages",
        success: function (response) {
            let local_stages = [],
                stages = JSON.parse(JSON.stringify(response));
            localStorage.setItem('stages',JSON.stringify(stages));
            $.each(response, function (key, val) {
                if (val.type === 1){
                    val.approverID = '1';
                    val.stageID = val.ID;
                    delete val.ID;
                    val.stage_name = val.name;
                    local_stages.push(val);
                }
                if (val.name === 'Disbursal'){
                    $("#stage-template").append('<option class="disabled" value = "'+encodeURIComponent(JSON.stringify(val))+'">'+val.name+'</option>');
                } else {
                    $("#stage-template").append('<option value = "'+encodeURIComponent(JSON.stringify(val))+'">'+val.name+'</option>');
                }
                if (key === response.length-1){
                    let local_stages_sorted = local_stages.sort(function(a, b) { return a.stageID - b.stageID; });
                    localStorage.setItem('local_stages', JSON.stringify(local_stages_sorted));
                    $.each(local_stages_sorted, function (key, val) {
                        let stage_name, action_names;
                        switch (val.name){
                            case 'Application Start':{
                                stage_name = "Application Start";
                                action_names = ['Final Approval']; break;
                            }
                            case 'Final Approval':{
                                stage_name = "Final Approval";
                                action_names = ['Disbursal']; break;
                            }
                            case 'Disbursal':{
                                stage_name = "Disbursal";
                                action_names = ['Disbursed']; break;
                            }
                        }
                        val.action_names = action_names;
                        let markup = '<li class="ui-state-default disabled"><span>'+val.name+' <small> '+stage_name+' → '+action_names.join(" → ")+'</small></span><input class="stage-items" value="' + encodeURIComponent(JSON.stringify(val)) + '" style="display: none;"/>' +
                            '<button class="edit-item edit-item-disabled btn btn-outline-info btn-xs pull-right" id="'+encodeURIComponent(JSON.stringify(val))+'" data-toggle="modal" data-target="#addStage"><span class="fa fa-edit"></span></button></li>';
                        $('#sortable').append(markup);
                        if (key === local_stages_sorted.length-1)
                            return getLocalStages();
                    });
                }
            });
        }
    });
}

function addProcess() {
    let stages,
        data = {},
        workflow = {};
    workflow.name = $('#process-name').val();
    stages = $('.stage-items').map(function() {
        return JSON.parse(decodeURIComponent(this.value));
    }).get();

    if (!workflow.name || !stages[0])
        return notification('Kindly fill all required fields!', '', 'warning');
    data.workflow = workflow;
    data.stages = stages;
    if (($.grep(data.stages,function(e){return e.stage_name==='Application Start'})).length > 1)
        data.stages.shift();
    if ($('#client-information').val()) 
        workflow.client_information = $('#client-information').val().join();
    workflow.client_email = ($('#client-email').is(':checked'))? 1 : 0;
    workflow.admin_email = ($('#admin-email').is(':checked'))? 1 : 0;
    workflow.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;
    workflow.application_settings_option = ($('#application-settings-option').is(':checked'))? 1 : 0;
    if (workflow.application_settings_option === 1) {
        workflow.loan_requested_min = currencyToNumberformatter($('#loan_requested_min').val());
        workflow.loan_requested_max = currencyToNumberformatter($('#loan_requested_max').val());
        workflow.tenor_min = currencyToNumberformatter($('#tenor_min').val());
        workflow.tenor_max = currencyToNumberformatter($('#tenor_max').val());
        workflow.interest_rate_min = currencyToNumberformatter($('#interest_rate_min').val());
        workflow.interest_rate_max = currencyToNumberformatter($('#interest_rate_max').val());
        workflow.admin_application_override = ($('#admin-application-override').is(':checked'))? 1 : 0;
        if (!workflow.loan_requested_min || workflow.loan_requested_min <= 0)
            return notification('Invalid loan requested min','','warning');
        if (!workflow.loan_requested_max || workflow.loan_requested_max <= 0)
            return notification('Invalid loan requested max','','warning');
        if (!workflow.tenor_min || workflow.tenor_min <= 0)
            return notification('Invalid tenor min','','warning');
        if (!workflow.tenor_max || workflow.tenor_max <= 0)
            return notification('Invalid tenor max','','warning');
        if (!workflow.interest_rate_min || workflow.interest_rate_min <= 0)
            return notification('Invalid interest rate min','','warning');
        if (!workflow.interest_rate_max || workflow.interest_rate_max <= 0)
            return notification('Invalid interest rate max','','warning');
    }

    $('#wait').show();
    $.ajax({
        type: 'POST',
        url: '/workflows',
        data: data,
        success: function (data) {
            localStorage.removeItem('local_stages');
            $('#process-name').val("");
            $('#wait').hide();
            notification(data.message, '', 'success');
            window.location.href = "/all-workflow";
        },
        'error': function (err) {
            console.log(err);
            $('#wait').hide();
            notification('No internet connection','','error');
        }
    });
}