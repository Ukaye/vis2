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
        return swal('Kindly fill all required fields!');
    data.workflow = workflow;
    data.stages = stages;
    if (($.grep(data.stages,function(e){return e.stage_name==='Application Start'})).length > 1)
        data.stages.shift();

    $('#wait').show();
    $.ajax({
        type: 'POST',
        url: '/workflows',
        data: data,
        success: function (data) {
            localStorage.removeItem('local_stages');
            $('#process-name').val("");
            $('#wait').hide();
            swal(data.message);
            window.location.href = "/all-workflow";
        },
        'error': function (err) {
            console.log(err);
            $('#wait').hide();
            swal('No internet connection','','error');
        }
    });
}