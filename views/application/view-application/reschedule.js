let state2,
    workflow_stages2,
    denied_stage_id2,
    approved_stage_id2,
    disburse_stage_id2;

function getReschedule(rescheduleID, workflows) {
    $.ajax({
        type: "get",
        url: `/user/application-id/${rescheduleID}`,
        success: data => {
            application2 = data.response;
            const workflow = ($.grep(workflows, function(e){ return e.ID === application2.workflowID; }))[0];
            $('#reschedule-title').html(`Total Amount: ₦${numberToCurrencyFormatter_(application2.loan_amount)} (${workflow.name})`);
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
                workflow_stages = data.response;
            denied_stage_id = ($.grep(stages_, e => {return e.name === 'Denied';}))[0]['ID'],
            approved_stage_id = ($.grep(stages_, e => {return e.name === 'Approved';}))[0]['ID']
            disburse_stage_id = ($.grep(stages_, e => {return e.name === 'Disbursed';}))[0]['ID'];
            denied_stage_id2 = denied_stage_id;
            approved_stage_id2 = approved_stage_id;
            disburse_stage_id2 = disburse_stage_id;
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
            workflow_stages2 = workflow_stages;

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

            if (stage.stage_name === 'Approved') {
                $('#autoDeny2').hide();
                $('#autoDisburse2').prop('disabled', false);
            }

            if (stage.stage_name === 'Pending Approval')
                $('.next2').text('Approved (Approved)');
            
            if (stage.stage_name === 'Approved' || stage.stage_name === 'Disbursed' || application2.status === 2) {
                $('#stage-actions2').append('<a href="#" id="approveRescheduleModalBtn" class="dropdown-item">Disburse Loan</a>');
                $('#autoApprove2').hide();
                $('#autoDeny2').hide();
            }
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
            state2 = state;
            loadWorkflowStages2(state);
        },
        'error': function (err) {
            console.log(err);
            notification('No internet connection','','error');
        }
    });
}

function nextStage2(state, workflow_stages, action_stage, callback) {
    if (stage_documents[0] && action_stage !== 'denied_stage_id'){
        for (let i=0; i<stage_documents.length; i++){
            if (!(stage_documents[i].trim().replace(/ /g, '_') in application.files))
                return notification('Kindly upload required document ('+stage_documents+')','','warning');
        }
    }
    if (!state || !workflow_stages || !action_stage)
        return notification('Kindly try again, page is not fully loaded yet!','','warning');
    state = state2 || state;
    workflow_stages = workflow_stages2 || workflow_stages;
    if (action_stage === 'denied_stage_id') {
        action_stage = denied_stage_id2;
    } else if (action_stage === 'disburse_stage_id') {
        action_stage =  disburse_stage_id2;
    }
    let stage = {};
    if (workflow_stages && action_stage){
        stage.previous_stage = state.current_stage;
        stage.current_stage = parseInt(action_stage);
    }
    if (!callback) $('#wait').show();
    $.ajax({
        'url': '/user/workflow_process/'+application2.ID+'/'+state.workflowID,
        'type': 'post',
        'data': {stage: stage, user_role:localStorage.getItem('role'), agentID:(JSON.parse(localStorage.getItem("user_obj"))).ID},
        'success': function (data) {
            if (!callback) $('#wait').hide();
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

$('#autoApprove2').click(() => {
    swal({
        title: "Are you sure?",
        text: "Proceed to move this reschedule to stage 'Approved'",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then(yes => {
            if (yes) {
                if (!state_ || !workflow_stages_ || !approved_stage_id2)
                    return notification('Kindly try again, page is not fully loaded yet!','','warning');
                nextStage2(state_, workflow_stages_, approved_stage_id2);
            }
        });
});

$('#autoDeny2').click(() => {
    swal({
        title: "Are you sure?",
        text: "Proceed to move this reschedule to stage 'Denied'",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then(yes => {
            if (yes) {
                if (!state_ || !workflow_stages_ || !denied_stage_id2)
                    return notification('Kindly try again, page is not fully loaded yet!', '', 'warning');
                $('#wait').show();
                nextStage2(state_, workflow_stages_, 'denied_stage_id', () => {
                    $.ajax({
                        'url': `/user/application/reschedule/${application_id}/${application.rescheduleID}`,
                        'type': 'delete',
                        'success': function (data) {
                            $('#wait').show();
                            notification('Reschedule denied successfully', '', 'success');
                            window.location.reload();
                        },
                        'error': function (err) {
                            $('#wait').show();
                            notification('Oops! An error occurred while denying reschedule', '', 'error');
                        }
                    });
                });
            }
        });
});

$("#setupDirectDebitBtn2").click(function () {
    swal({
        title: "Are you sure?",
        text: "Once initiated, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then(yes => {
            if (yes) {
                let obj = {};
                obj.userID = application2.userID;
                obj.workflowID = application2.workflowID;
                obj.loan_amount = application2.loan_amount;
                obj.interest_rate = application2.interest_rate;
                obj.duration = application2.duration;
                obj.repayment_date = application2.repayment_date;
                obj.agentID = (JSON.parse(localStorage.getItem("user_obj"))).ID;

                let preapproved_loan = Object.assign({}, obj);
                delete preapproved_loan.agentID;
                preapproved_loan.client = application2.fullname;
                preapproved_loan.average_loan = '';
                preapproved_loan.credit_score = '';
                preapproved_loan.defaults = '';
                preapproved_loan.invoices_due = '';
                preapproved_loan.offer_duration = application2.duration;
                preapproved_loan.offer_loan_amount = application2.loan_amount;
                preapproved_loan.offer_first_repayment_date = application2.repayment_date;
                preapproved_loan.offer_interest_rate = application2.interest_rate;
                preapproved_loan.months_left = '';
                preapproved_loan.salary_loan = '';
                preapproved_loan.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;

                $('#wait').show();
                $.ajax({
                    'url': '/preapproved-loan/create',
                    'type': 'post',
                    'data': {
                        application: obj,
                        email: application2.email,
                        applicationID: application.ID,
                        fullname: application2.fullname,
                        preapproved_loan: preapproved_loan
                    },
                    'success': function (response) {
                        $('#wait').hide();
                        if(response.status === 500) {
                            notification('No internet connection', '', 'error');
                        } else {
                            notification(`Offer successfully sent to ${application2.email}`,'','success');
                            window.location.reload();
                        }
                    },
                    'error': function (err) {
                        console.log(err);
                        $('#wait').hide();
                        notification('No internet connection','','error');
                    }
                });
            }
        });
});