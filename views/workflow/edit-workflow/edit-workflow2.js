$(document).ready(function() {
    getStages();
    getRoles();
});

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
$('.todolist').on('click','.remove-item', function (e) {
    archiveWorkflow(e);
});

function archiveWorkflow(e) {
    if (localStorage.archive_workflow === 'false'){
        e.preventDefault();
        swal({
            title: "Are you sure?",
            text: "Only Approval Rights are editable. Any other changes to this workflow would be saved as a new copy.\n\n" +
            "Once started, this process is not reversible!",
            icon: "warning",
            buttons: true,
            dangerMode: true,
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
    if (localStorage.archive_workflow === 'false')
        url = '/edit-workflows/';

    $('#wait').show();
    $.ajax({
        type: 'POST',
        url: url+workflow_id,
        data: data,
        success: function (data) {
            localStorage.removeItem('local_stages');
            $('#process-name').val("");
            $('#wait').hide();
            notification(data.message);
//                window.location.href = "/all-workflow";
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
        },
        'error': function (err) {
            console.log(err);
        }
    });
    $.ajax({
        'url': '/workflow-stages/'+workflow_id,
        'type': 'get',
        'success': function (data) {
            let transitions = [];
            initDefaultStages(stages, data.response);
            data.response.forEach(function (stagex) {
                let stage = {
                    action_names: [],
                    actions: stagex.actions,
                    approverID: stagex.approverID,
                    description: stagex.description,
                    document: stagex.document,
                    name: stagex.name,
                    stageID: stagex.stageID,
                    stage_name: stagex.stage_name
                };
                if (stage.stage_name !== 'Application Start' && stage.stage_name !== 'Final Approval' && stage.stage_name !== 'Disbursal'){
                    if (stage.actions){
                        let actions_array = stage.actions.split(',');
                        actions_array.forEach(function (action_id) {
                            let action = ($.grep(stages, function(e){return e.ID === parseInt(action_id);}))[0];
                            stage.action_names.push(action.name);
                        });
                    }
                    transitions.push(stage);
                    createTodo(stage);
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