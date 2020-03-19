function getReschedule(rescheduleID, workflows) {
    $.ajax({
        type: "get",
        url: `/user/application-id/${rescheduleID}`,
        success: data => {
            application2 = data.response;
            const workflow = ($.grep(workflows, function(e){ return e.ID === application2.workflowID; }))[0];
            $('#reschedule-title').html(`Disbursed Amount: ₦${numberToCurrencyFormatter_(application2.loan_amount)} (${workflow.name})`);
            loadWorkflowState2();
        }
    });
}

$('.next2').hide();
$('.previous2').hide();
$('#next-actions2').hide();
$('#current_stage2').hide();
function loadWorkflowStages2(state) {
    $.ajax({
        'url': '/workflow-stages/'+state.workflowID,
        'type': 'get',
        'success': function (data) {
            let count = 0,
                workflow_stages = data.response,
                denied_stage_id = ($.grep(stages_, e => {return e.name === 'Denied';}))[0]['ID'],
                disburse_stage_id = ($.grep(stages_, e => {return e.name === 'Disbursed';}))[0]['ID'];
            workflow_stages.push({
                approverID: 1,
                name: "Denied",
                stage_name: "Denied",
                stageID: denied_stage_id,
                workflowID:state.workflowID
            });
            workflow_stages.push({
                approverID: 1,
                name: "Disbursed",
                stage_name: "Disbursed",
                stageID: disburse_stage_id,
                workflowID:state.workflowID
            });
            workflow_stages_ = workflow_stages;

            let ul = document.getElementById('workflow-ul-list2'),
                $last_btn = $("#btn-"+workflow_stages[workflow_stages.length-1]['stageID']),
                stage = ($.grep(workflow_stages, function(e){ return e.stageID === state.current_stage; }))[0];

            if ((!stage.actions || !stage.actions[0]) && stage.stage_name !== 'Approved' && stage.stage_name !== 'Disbursed')
                $('.next2').show();

            $('.previous2').show();
            $('#next-actions2').show();
            $('#current_stage2').show();
            $last_btn.hide();
            $('#current_stage2').text(stage.name);

            if (stage.document){
                let documents = stage.document.split(',');
                $('#document-upload').show();
                $('#document-upload-text').append('<i class="fa fa-warning"></i> Kindly upload '+documents.join(', '));
                documents.forEach(function (document) {
                    if (document.trim().replace(/ /g, '_') in application.files){
                        $('#stage-documents').append('<option value = "'+document+'">'+document+' &nbsp; (&check;)</option>');
                    } else {
                        $('#stage-documents').append('<option value = "'+document+'">'+document+'</option>');
                    }
                    stage_documents.push(document);
                });
                $('#stage-documents').append('<option value = "others">Others</option>');
                fileUpload();
            }

            if (stage.actions){
                let actions = stage.actions.split(',');
                actions.forEach(function (id) {
                    let stage_template = ($.grep(workflow_stages, function(e){ return e.stageID === parseInt(id); }))[0];
                    if (stage_template && stage_template.stage_name !== 'Disbursed') {
                        $('#stage-actions2').append('<a href="#" class="dropdown-item" id="stage-action2-'+stage_template.stageID+'">'
                            +stage_template.name+' ('+stage_template.stage_name+')</a>');
                    }
                });
            }

            $('#stage-actions2').on('click', function (e) {
                let id = (e.target.id.split('-'))[2];
                if (id) {
                    if (id === 'default'){
                        nextStage2(state);
                    } else if (id !== '0'){
                        nextStage2(state, workflow_stages, id);
                    }
                }
            });

            workflow_stages.forEach(function (stage) {
                if (stage.stage_name === 'Denied' || stage.stage_name === 'Disbursed') return;
                let index =  workflow_stages.map(function(e) { return e.stageID; }).indexOf(state.current_stage),
                    li = document.createElement('li');
                if (count === index) {
                    li.className = "active";
                    if (count === 0)
                        $('.previous2').hide();
                    if (count === workflow_stages.length-1)
                        $('.next2').hide();
                } else if (count > index) {
                    li.className = "disabled";
                }
                ul.appendChild(li);
                count++;
                li.innerHTML += '<a><h4 class="list-group-item-heading">Step '+count+'</h4>\n' +
                    '<p class="list-group-item-text">'+stage.name+'<br> ('+stage.stage_name+')</p></a>';
            });

            if (stage.stage_name === 'Pending Approval')
                $('.next2').text('Approved (Approved)');
            
            if (stage.stage_name === 'Approved' || stage.stage_name === 'Disbursed' || application2.status === 2)
                $('#stage-actions2').append('<a href="#" id="approveRescheduleModalBtn" class="dropdown-item">Disburse Loan</a>');
        },
        'error': function (err) {
            console.log(err);
            notification('No internet connection','','error');
        }
    });
}

$('.previous2').on('click', function(e) {
    previousStage();
});

function loadWorkflowState2() {
    $.ajax({
        'url': '/user/workflow_process/'+application2.ID,
        'type': 'get',
        'success': function (data) {
            let states = data.response,
                state = states[states.length-1];
            loadWorkflowStages2(state);
        },
        'error': function (err) {
            console.log(err);
            notification('No internet connection','','error');
        }
    });
}

function nextStage2(state, workflow_stages, action_stage, callback) {
    let stage = {};
    if (workflow_stages && action_stage){
        stage.previous_stage = state.current_stage;
        stage.current_stage = parseInt(action_stage);
    }
    if (stage_documents[0]){
        for (let i=0; i<stage_documents.length; i++){
            if (!(stage_documents[i].trim().replace(/ /g, '_') in application.files))
                return notification('Kindly upload required document ('+stage_documents+')','','warning');
        }
    }
    $('#wait').show();
    $.ajax({
        'url': '/user/workflow_process/'+application2.ID+'/'+state.workflowID,
        'type': 'post',
        'data': {stage: stage, user_role:localStorage.getItem('role'), agentID:(JSON.parse(localStorage.getItem("user_obj"))).ID},
        'success': function (data) {
            $('#wait').hide();
            if (data.status === 200){
                if (typeof callback === "function") return callback();
                $('#document-upload').hide();
                $('#document-upload-text').text('');
                notification('Workflow updated successfully!','','success');
                window.location.reload();
            } else {
                if (data.message){
                    notification(data.message,'','info');
                } else {
                    notification('No internet connection','','error');
                }
            }
        },
        'error': function (err) {
            $('#wait').hide();
            console.log(err);
            notification('No internet connection','','error');
        }
    });
}

function previousStage() {
    $.ajax({
        'url': '/user/revert_workflow_process/'+application2.ID,
        'type': 'get',
        'success': function (data) {
            if (data.status === 200){
                $('#document-upload').hide();
                $('#document-upload-text').text('');
                notification('Workflow updated successfully!','','success');
                window.location.reload();
            } else {
                if (data.message){
                    notification(data.message,'','info');
                } else {
                    notification('No internet connection','','error');
                }
            }
        },
        'error': function (err) {
            console.log(err);
            notification('No internet connection','','error');
        }
    });
}