$(document).ready(function() {
    getStages();
    getRoles();
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
        '<select class="form-control local-stages-new"><option selected="selected" value="-- Choose Action --">-- Choose Action --</option>' +
        '</select><i class="fa fa-times" style="margin: 10px; color: #dc3545;" onclick="removeAction(this)"></i></div>');
    getLocalStages();
});

function removeAction(element) {
    archiveWorkflow();
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
    archiveWorkflow();
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

    $local_stages.html('<option selected="selected" value="-- Choose Action --">-- Choose Action --</option>');
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
            localStorage.setItem('stages',JSON.stringify(response));
            init(response);
        }
    });
}

localStorage.archive_workflow = 'false';
$('#process-name').click(function (e) {
    archiveWorkflow(e);
});
$('#stage-name').click(function (e) {
    archiveWorkflow(e);
});
$('#stage-template').click(function (e) {
    archiveWorkflow(e);
});
$('#more-actions-link').click(function (e) {
    archiveWorkflow(e);
});
$('#stage-action-div').on('click','.local-stages-new', function (e) {
    archiveWorkflow(e);
});
$('#document-upload').click(function (e) {
    archiveWorkflow(e);
});
$('#document-upload-div').on('click','.document-upload-text', function (e) {
    archiveWorkflow(e);
});
$('#document-download').click(function (e) {
    archiveWorkflow(e);
});
$('#document-download-div').on('click','.document-download-text', function (e) {
    archiveWorkflow(e);
});
$('.todolist').on('click','.remove-item', function (e) {
    archiveWorkflow(e);
});
$('#process-image-upload').click(function (e) {
    archiveWorkflow(e);
});
$('#process-description').click(function (e) {
    archiveWorkflow(e);
});
$('#client-information-div').click(function (e) {
    archiveWorkflow(e);
});
$('#client-email').click(e => {
    archiveWorkflow(e);
});
$('#admin-email').click(e => {
    archiveWorkflow(e);
});
$('#loan_requested_min').click(e => {
    archiveWorkflow(e);
});
$('#loan_requested_max').click(e => {
    archiveWorkflow(e);
});
$('#tenor_min').click(e => {
    archiveWorkflow(e);
});
$('#tenor_max').click(e => {
    archiveWorkflow(e);
});
$('#interest_rate_min').click(e => {
    archiveWorkflow(e);
});
$('#interest_rate_max').click(e => {
    archiveWorkflow(e);
});
$('#admin-application-override').click(e => {
    archiveWorkflow(e);
});
$('#enable-client-product').click(e => {
    archiveWorkflow(e);
});
$('#enable-client-product').click(e => {
    archiveWorkflow(e);
});
$('#application-settings-option').click(e => {
    archiveWorkflow(e);
    if (localStorage.archive_workflow === 'true') {
        if ($('#application-settings-option').is(':checked')) {
            $('#application-settings-div').show();
        } else {
            $('#application-settings-div').hide();
        }
    }
});
$('#terms').click(e => {
    archiveWorkflow(e);
});

function archiveWorkflow(e) {
    if (localStorage.archive_workflow === 'false'){
        if (e) e.preventDefault();
        swal({
            title: "Are you sure?",
            text: "Only Approval Rights are editable. Any other changes to this workflow would be saved as a new copy.\n\n" +
            "Once started, this process is not reversible!\n\n"+
            "Please note that all files attached to this workflow would be lost and require reuploading.",
            icon: "warning",
            buttons: true,
            dangerMode: true
        })
            .then((yes) => {
                if (yes) {
                    localStorage.archive_workflow = 'true';
                }
            });
    }
}

const urlParams = new URLSearchParams(window.location.search);
const workflow_id = urlParams.get('id');

function addProcess() {
    let stages,
        data = {},
        workflow = {},
        url = '/workflows/';
    workflow.name = $('#process-name').val();
    stages = $('.stage-items').map(function() {
        return JSON.parse(decodeURIComponent(this.value));
    }).get();

    if (!workflow.name || !stages[0])
        return notification('Kindly fill all required fields!','','warning');
    data.workflow = workflow;
    data.stages = stages;
    if (($.grep(data.stages,function(e){return e.stage_name==='Application Start'})).length > 1)
        data.stages.shift();
    if ($('#process-description').val())
        workflow.description = $('#process-description').val();
    if ($('#client-information').val())
        workflow.client_information = $('#client-information').val().join();
    workflow.client_email = ($('#client-email').is(':checked'))? 1 : 0;
    workflow.admin_email = ($('#admin-email').is(':checked'))? 1 : 0;
    workflow.application_settings_option = ($('#application-settings-option').is(':checked'))? 1 : 0;
    if (workflow.application_settings_option === 1) {
        workflow.loan_requested_min = currencyToNumberformatter($('#loan_requested_min').val());
        workflow.loan_requested_max = currencyToNumberformatter($('#loan_requested_max').val());
        workflow.tenor_min = currencyToNumberformatter($('#tenor_min').val());
        workflow.tenor_max = currencyToNumberformatter($('#tenor_max').val());
        workflow.interest_rate_min = currencyToNumberformatter($('#interest_rate_min').val());
        workflow.interest_rate_max = currencyToNumberformatter($('#interest_rate_max').val());
        workflow.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;
        workflow.admin_application_override = ($('#admin-application-override').is(':checked'))? 1 : 0;
        workflow.enable_client_product = ($('#enable-client-product').is(':checked'))? 1 : 0;
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
    workflow.terms = $('#terms').summernote('code');
    $('#terms').summernote('destroy');
    if (localStorage.archive_workflow === 'false')
        url = '/edit-workflows/';

    $('#wait').show();
    $.ajax({
        type: 'POST',
        url: url+workflow_id,
        data: JSON.stringify(data),
        contentType: "application/json",
        success: function (data) {
            uploadImage(data.response, () => {
                localStorage.removeItem('local_stages');
                $('#process-name').val("");
                $('#process-description').val("");
                $('#wait').hide();
                notification(data.message);
                // window.location.href = "/all-workflow";
            });
        },
        'error': function (err) {
            console.log(err);
            $('#wait').hide();
            notification('No internet connection','','error');
        }
    });
}

function init(stages){
    $.ajax({
        'url': '/workflows/'+workflow_id,
        'type': 'get',
        'success': function (data) {
            let workflow = data.response;
            $('#process-name').val(workflow.name);
            if (workflow.description) $('#process-description').val(workflow.description);
            if (workflow.image) {
                $('#process-image').html(`<hr><a class="thumbnail grouped_elements" rel="grouped_elements" data-toggle="tooltip" 
                    data-placement="bottom" title="Click to Expand!" href="/${workflow.image}">
                        <img src="/${workflow.image}" alt="Image"></a>`);
            }
            $('a.grouped_elements').fancybox();
            $('.thumbnail').tooltip();
            if (workflow.client_information) {
                $('#client-information').val(workflow.client_information.split(','));
                $('#client-information').multiselect("refresh");
            }
            if (workflow.client_email === 1) $('#client-email').prop('checked', true);
            if (workflow.admin_email === 1) $('#admin-email').prop('checked', true);
            if (workflow.admin_email === 1) $('#admin-email').prop('checked', true);
            if (workflow.application_settings_option === 1) {
                $('#application-settings-option').prop('checked', true);
                $('#application-settings-div').show();
            }
            if (workflow.loan_requested_min) $('#loan_requested_min').val(numberToCurrencyformatter(workflow.loan_requested_min));
            if (workflow.loan_requested_max) $('#loan_requested_max').val(numberToCurrencyformatter(workflow.loan_requested_max));
            if (workflow.tenor_min) $('#tenor_min').val(numberToCurrencyformatter(workflow.tenor_min));
            if (workflow.tenor_max) $('#tenor_max').val(numberToCurrencyformatter(workflow.tenor_max));
            if (workflow.interest_rate_min) $('#interest_rate_min').val(numberToCurrencyformatter(workflow.interest_rate_min));
            if (workflow.interest_rate_max) $('#interest_rate_max').val(numberToCurrencyformatter(workflow.interest_rate_max));
            if (workflow.admin_application_override === 1) $('#admin-application-override').prop('checked', true);
            if (workflow.enable_client_product === 1) $('#enable-client-product').prop('checked', true);
            if (workflow.terms) $('#terms').html(workflow.terms);
            $('#terms').summernote({focus: true});
            $('.note-icon-caret').hide();
            $('.note-popover').hide();
            $('.note-insert').hide();
            $('.note-view').hide();

            $.ajax({
                'url': '/workflow-stages/'+workflow_id,
                'type': 'get',
                'success': function (data) {
                    initDefaultStages(stages, data.response);
                    getFileDownloads(workflow);
                    $.each(data.response, function (key, stagex) {
                        let stage = {
                            action_names: [],
                            actions: stagex.actions,
                            approverID: stagex.approverID,
                            description: stagex.description,
                            document: stagex.document,
                            download: stagex.download,
                            name: stagex.name,
                            stageID: stagex.stageID,
                            stage_name: stagex.stage_name,
                            onLoad: true
                        };
                        if (stagex.stage_name === 'Application Start' || stagex.stage_name === 'Pending Approval' || stagex.stage_name === 'Approved')
                            stage.disabled = true;
                        if (stage.actions){
                            let actions_array = stage.actions.split(',');
                            actions_array.forEach(function (action_id) {
                                let action = ($.grep(stages, function(e){return e.ID === parseInt(action_id);}))[0];
                                stage.action_names.push(action.name);
                            });
                        }
                        if (stage.download){
                            let downloads = stage.download.split(',');
                            downloads.forEach(function (download) {
                                if (download.trim().replace(/ /g, '_') in workflow.file_downloads){
                                    $('#stage-downloads').append(`<option value = "${download}">${download} &nbsp; (&check;)</option>`);
                                } else {
                                    $('#stage-downloads').append(`<option value = "${download}">${download}</option>`);
                                }
                            });
                        }
                        createTodo(stage);
                        if (key === data.response.length-1)
                            return getLocalStages();
                    });
                },
                'error': function (err) {
                    console.log(err);
                }
            });
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function initDefaultStages(response,workflow_stages) {
    let local_stages = [];
    $.each(response, function (key, val) {
        let valx = $.grep(workflow_stages, function(e){return e.stageID === val.ID});
        if (val.type === 1){
            if (valx && valx[0]){
                val.approverID = valx[0]['approverID'];
            } else {
                val.approverID = '1';
            }
            val.stageID = val.ID;
            val.stage_name = val.name;
            local_stages.push(val);
        }
        if (val.name === 'Approved'){
            $("#stage-template").append('<option class="disabled" value = "'+encodeURIComponent(JSON.stringify(val))+'">'+val.name+'</option>');
        } else {
            $("#stage-template").append('<option value = "'+encodeURIComponent(JSON.stringify(val))+'">'+val.name+'</option>');
        }
    });

    let local_stages_sorted = local_stages.sort(function(a, b) { return a.stageID - b.stageID; });
    localStorage.setItem('local_stages', JSON.stringify(local_stages_sorted));
}

function getFileDownloads(workflow) {
    let downloads = workflow.file_downloads,
        $downloads = $('#downloads');
    $downloads.html('');
    if ($.isEmptyObject(downloads)) return $downloads.append('<h2 style="margin: auto;">No file downloads available yet!</h2>');
    Object.keys(downloads).forEach(function (key) {
        let preview = `<img class="img-responsive user-photo" src="/${downloads[key]}">`;
        if (!isUriImage(`/${downloads[key]}`)) preview = '<i class="fa fa-file" style="font-size: 100px;"></i>';
        $downloads.append('<div class="row">\n' +
            '    <div class="col-sm-2">\n' +
            '        <div class="thumbnail">'+preview+'</div>\n' +
            '    </div>\n' +
            '    <div class="col-sm-10">\n' +
            '        <div class="panel panel-default">\n' +
            '            <div class="panel-heading"><strong>'+key+'</strong></div>\n' +
            '            <div class="panel-body"><a href="/'+downloads[key]+'" target="_blank">Click to download file</a></div>\n' +
            '        </div>\n' +
            '    </div>\n' +
            '</div>');
    });
}

function uploadFile() {
    let file = $(`#file-upload`)[0].files[0],
        filename = $('#stage-downloads').val();
    if (!file || filename === '-- Choose Document --')
        return notification('Kindly choose file to upload!', '', 'warning');
    let formData = new FormData();
    formData.append('file', file);
    $.ajax({
        url: `/upload/document/${workflow_id}/${filename}/workflow_download-${workflow_id}`,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
            let preview = `<img class="img-responsive user-photo" src="/${response.file}">`;
            if (!isUriImage(`/${response.file}`)) preview = '<i class="fa fa-file" style="font-size: 100px;"></i>';
            $('#downloads').append('<div class="row">\n' +
                '    <div class="col-sm-2">\n' +
                '        <div class="thumbnail">'+preview+'</div>\n' +
                '    </div>\n' +
                '    <div class="col-sm-10">\n' +
                '        <div class="panel panel-default">\n' +
                '            <div class="panel-heading"><strong>'+filename+'</strong></div>\n' +
                '            <div class="panel-body"><a href="/'+response.file+'" target="_blank">Click to download file</a></div>\n' +
                '        </div>\n' +
                '    </div>\n' +
                '</div>');
            return notification('File uploaded successfully!', '', 'success');
        },
        error: function () {
            notification('Oops! An error occurred while uploading file', '', 'error');
        }
    });
};

function uploadImage(workflow, callback) {
    const file = $(`#process-image-upload`)[0].files[0],
        name = workflow.name.trim().replace(/ /g, '_');
    if (!file) return callback();
    const formData = new FormData();
    formData.append('file', file);
    $.ajax({
        url: `/upload/document/${workflow.ID}/${name}/workflow_images`,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: () => {
            callback();
        },
        error: error => {
            notification(error, '', 'error');
        }
    });
};