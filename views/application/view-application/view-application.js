$(document).ready(function() {
    loadComments();
    read_write_1();
    getFundingSource();
});

function getFundingSource() {
    $.ajax({
        type: "GET",
        url: "/settings/application/funding_source",
        success: function (data) {
            $.each(data.response, function (key, funding_source) {
                $('#funding').append(`<option value="${funding_source.Code}">${funding_source.Name} 
                    (${funding_source.Type})</option>`);
            });
        }
    });
}

const urlParams = new URLSearchParams(window.location.search);
const application_id = urlParams.get('id');

let workflow,
    application,
    settings_obj = {
        loan_requested_min: 1,
        loan_requested_max: 100000000,
        tenor_min: 1,
        tenor_max: 60,
        interest_rate_min: 1,
        interest_rate_max: 1000
    };

$("#disbursement-fees").on("keyup", function () {
    let val = $("#disbursement-fees").val();
    $("#disbursement-fees").val(numberToCurrencyformatter(val));
});

$("#disbursement-vat").on("keyup", function () {
    let val = $("#disbursement-vat").val();
    $("#disbursement-vat").val(numberToCurrencyformatter(val));
});

function goToLoanRepayment() {
    window.location.href = '/loan-repayment?id='+application_id;
}

function getApplicationSettings(application) {
    $('#wait').show();
    $.ajax({
        type: "GET",
        url: "/settings/application",
        success: function (data) {
            if (data.response) {
                settings_obj = data.response;
                if (settings_obj.loan_requested_min)
                    $('#loan_requested_min').text(numberToCurrencyformatter(settings_obj.loan_requested_min));
                if (settings_obj.loan_requested_max)
                    $('#loan_requested_max').text(numberToCurrencyformatter(settings_obj.loan_requested_max));
                if (settings_obj.tenor_min)
                    $('#tenor_min').text(numberToCurrencyformatter(settings_obj.tenor_min));
                if (settings_obj.tenor_max)
                    $('#tenor_max').text(numberToCurrencyformatter(settings_obj.tenor_max));
                if (settings_obj.interest_rate_min)
                    $('#interest_rate_min').text(numberToCurrencyformatter(settings_obj.interest_rate_min));
                if (settings_obj.interest_rate_max)
                    $('#interest_rate_max').text(numberToCurrencyformatter(settings_obj.interest_rate_max));
            }
            getFeeSettings();
            initCSVUpload(application);
            initCSVUpload2(application, settings_obj);
        }
    });
}

function getFeeSettings() {
    $.ajax({
        type: "GET",
        url: "/settings/fees",
        success: function (data) {
            let settings_obj = data.response,
                $vat = $('#disbursement-vat'),
                $fees = $('#disbursement-fees');
            if (settings_obj) {
                if (settings_obj.fees_type === 'automatic') {
                    let fees = calculateFee(parseFloat(application.loan_amount), settings_obj.grades),
                        vat = calculateVAT(fees, settings_obj.vat);
                    $vat.val(numberToCurrencyformatter(vat));
                    $fees.val(numberToCurrencyformatter(fees));
                    $fees.prop('disabled', true);
                } else {
                    $fees.keyup(function (e) {
                        let fees = currencyToNumberformatter(e.target.value),
                            vat = calculateVAT(fees, settings_obj.vat);
                        $vat.val(numberToCurrencyformatter(vat));
                    });
                }
            }
        }
    });
}

function calculateVAT(fees, rate) {
    return (fees * (parseFloat(rate) / 100)).round(2);
}

function calculateFee(amount, grades) {
    let fee = 0,
        grade = getFeeGrade(amount, grades);
    if (grade) {
        grade.amount = parseFloat(grade.amount);
        switch (grade.type) {
            case 'fixed': {
                fee = grade.amount;
                break;
            }
            case 'percentage': {
                fee = (amount * (grade.amount / 100)).round(2);
                break;
            }
        }
    }
    return fee;
}

function getFeeGrade(amount, grades) {
    let result;
    for (let i=0; i<grades.length; i++) {
        let grade = grades[i];
        if (amount >= parseFloat(grade.lower_limit) && amount <= parseFloat(grade.upper_limit)) {
            result = grade;
            break;
        }
    }
    return result;
}

$('#fees-check').click(function () {
    if ($('#fees-check').is(':checked')) {
        $('#fees-div').show();
    } else {
        $('#fees-div').hide();
    }
});

function loadApplication(user_id){
    $.ajax({
        'url': '/user/application-id/'+application_id,
        'type': 'get',
        'success': function (result) {
            let data = result.response,
                file_names = Object.keys(data.files),
                files_count = file_names.length,
                $carousel_inner = $('.carousel-inner'),
                $carousel_indicators = $('.carousel-indicators');

            if (user_id && data.loan_officer !== user_id && data.supervisor !== user_id)
                return window.location.href = "/logon";

            application = data;
            getWorkflows(application);
            loadWorkflowState();
            if (application.client_type === 'corporate') {
                $('#client-id').text(padWithZeroes(application.contactID, 6));
                $('#client-id-label').text('Contact ID#:');
            } else {
                $('#client-id').text(padWithZeroes(application.userID, 6));
            }
            $('#application-id').text(padWithZeroes(application.ID, 9));
            if (application.reschedule_amount){
                $('#reschedule-info').show();
                $('#reschedule-info').text('Reschedule Add-on amount is ₦'+(parseFloat(application.reschedule_amount)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')+
                    ' last updated on '+application.date_modified);
            }

            application.loanCirrusID = application.loanCirrusID || 'N/A';
            $('#loancirrus-id').text(application.loanCirrusID);

            if (application.schedule && application.schedule[0]){
                $("#generate-schedule").hide();
                $("#schedule").show();
            } else {
                $("#generate-schedule").show();
            }

            if (files_count < 1){
                $carousel_inner.append('<h3>No Documents Uploaded Yet!</h3>');
            } else {
                let count = 0,
                    pages = parseInt(((files_count).roundTo(4))/4);
                for (let i=1; i<=pages; i++){
                    if (i === 1){
                        $carousel_inner.append('<div class="item active"><div class="row page-1"></div></div>');
                        $carousel_indicators.append('<li data-target="#Carousel" data-slide-to="1" class="active"></li>');
                    } else {
                        $carousel_inner.append('<div class="item"><div class="row page-'+i+'"></div></div>');
                        $carousel_indicators.append('<li data-target="#Carousel" data-slide-to="'+i+'"></li>');
                    }
                    for (let j=0; j<4; j++){
                        if (count < files_count){
                            let file_name = file_names[count],
                                file = "/"+application.files[file_name];
                            if (isUriImage(file)){
                                $('.page-'+i).append('<div class="col-md-3"><a class="thumbnail grouped_elements" rel="grouped_elements" data-toggle="tooltip" data-placement="bottom" title="Click to Expand!" href="'+file+'"><img src="'+file+'" alt="'+file_name.replace(/_/g, ' ')+'" style="max-width:100%; height: 200px;"></a><p style="text-align: center;">'+file_name.replace(/_/g, ' ')+'</p></div>');
                            } else {
                                $('.page-'+i).append('<div class="col-md-3"><a class="thumbnail" data-target="_blank" data-toggle="tooltip" data-placement="bottom" title="Click to Download!" href="'+file+'" style="padding: 25px 0;"><i class="fa fa-file" style="font-size: 150px; display: block; text-align: center;"></i></a><p style="text-align: center;">'+file_name.replace(/_/g, ' ')+'</p></div>');
                            }
                        }
                        count++;
                        if (count === files_count){
                            $("a.grouped_elements").fancybox();
                            $('.thumbnail').tooltip();
                        }
                    }
                }
            }

            getApplicationSettings(application);
            checkForExistingMandate(application);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function goToClientProfile() {
    if (application.client_type === 'corporate'){
        window.location.href = '/client-info?id='+application.contactID;
    } else {
        window.location.href = '/client-info?id='+application.userID;
    }
}

function getWorkflows(data){
    $.ajax({
        type: "GET",
        url: "/workflows-all",
        success: function (response) {
            localStorage.setItem("workflows",JSON.stringify(response.response));
            let fullname = data.fullname || '';
            workflow = (response.response)? ($.grep(response.response, function(e){ return e.ID === data.workflowID; }))[0] : {name:'Workflow'};
            $("#workflow-div-title").text(fullname.toUpperCase()+" ("+workflow.name+")");
        }
    });
}

let workflow_comments;
function loadComments(comments) {
    if (comments && comments[0]){
        workflow_comments = comments;
        let $comments = $('#comments');
        $comments.html('');
        comments.forEach(function (comment) {
            $comments.append('<div class="row">\n' +
                '    <div class="col-sm-2">\n' +
                '        <div class="thumbnail"><img class="img-responsive user-photo" src="https://ssl.gstatic.com/accounts/ui/avatar_2x.png"></div>\n' +
                '    </div>\n' +
                '    <div class="col-sm-10">\n' +
                '        <div class="panel panel-default">\n' +
                '            <div class="panel-heading"><strong>'+comment.fullname+'</strong> <span class="text-muted">commented on '+comment.date_created+'</span></div>\n' +
                '            <div class="panel-body">'+comment.text+'</div>\n' +
                '        </div>\n' +
                '    </div>\n' +
                '</div>');
        });
    } else {
        $('#generateLoanFile').prop('disabled', true);
        $.ajax({
            'url': '/user/application/comments/'+application_id,
            'type': 'get',
            'success': function (data) {
                let comments = data.response,
                    $comments = $('#comments');
                workflow_comments = comments;
                $comments.html('');
                $('#generateLoanFile').prop('disabled', false);
                if (!comments[0]) return $comments.append('<h2 style="margin: auto;">No comments available yet!</h2>');
                comments.forEach(function (comment) {
                    $comments.append('<div class="row">\n' +
                        '    <div class="col-sm-2">\n' +
                        '        <div class="thumbnail"><img class="img-responsive user-photo" src="https://ssl.gstatic.com/accounts/ui/avatar_2x.png"></div>\n' +
                        '    </div>\n' +
                        '    <div class="col-sm-10">\n' +
                        '        <div class="panel panel-default">\n' +
                        '            <div class="panel-heading"><strong>'+comment.fullname+'</strong> <span class="text-muted">commented on '+comment.date_created+'</span></div>\n' +
                        '            <div class="panel-body">'+comment.text+'</div>\n' +
                        '        </div>\n' +
                        '    </div>\n' +
                        '</div>');
                });
            },
            'error': function (err) {
                console.log(err);
                notification('No internet connection','','error');
            }
        });
    }
}

let stage_documents = [];
$('.next').hide();
$('.previous').hide();
$('#next-actions').hide();
$('#current_stage').hide();
function loadWorkflowStages(state) {
    $.ajax({
        'url': '/workflow-stages/'+state.workflowID,
        'type': 'get',
        'success': function (data) {
            let count = 0,
                workflow_stages = data.response;
            workflow_stages.push({name:"Denied",stageID:4,stage_name:"Denied",workflowID:state.workflowID,approverID:1});

            let ul = document.getElementById('workflow-ul-list'),
                $last_btn = $("#btn-"+workflow_stages[workflow_stages.length-1]['stageID']),
                stage = ($.grep(workflow_stages, function(e){ return e.stageID === state.current_stage; }))[0];

            if ((!stage.actions || !stage.actions[0]) && (stage.stage_name !== 'Disbursal'))
                $('.next').show();
            $('.previous').show();
            $('#next-actions').show();
            $('#current_stage').show();

            $last_btn.hide();
            $('#current_stage').text(stage.name);
            if (stage.stage_name === 'Application Start' && (!application.schedule || !application.schedule[0])){
                $('#schedule').hide();
                $('#generate-schedule').show();
            }

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
                    if (stage_template){
                        $('#stage-actions').append('<a href="#" class="dropdown-item" id="stage-action-'+stage_template.stageID+'">'
                            +stage_template.name+' ('+stage_template.stage_name+')</a>');
                    }
                });
            }

            $("#stage-actions").on('click', function (e) {
                let id = (e.target.id.split('-'))[2];
                if (id) {
                    if (id === 'default'){
                        nextStage(state);
                    } else if (id !== '0'){
                        nextStage(state, workflow_stages, id);
                    }
                }
            });

            workflow_stages.forEach(function (stage) {
                if (stage.stage_name !== 'Denied'){
                    let index =  workflow_stages.map(function(e) { return e.stageID; }).indexOf(state.current_stage),
                        li = document.createElement('li');
                    if (count === index){
                        li.className = "active";
                        if (count === 0)
                            $(".previous").hide();
                        if (count === workflow_stages.length-1)
                            $(".next").hide();
                    } else if (count > index) {
                        li.className = "disabled";
                    }
                    ul.appendChild(li);
                    count++;
                    li.innerHTML += '<a><h4 class="list-group-item-heading">Step '+count+'</h4>\n' +
                        '<p class="list-group-item-text">'+stage.name+'<br> ('+stage.stage_name+')</p></a>';}
            });

            if (stage.stage_name === 'Denied'){
                $("#current_stage").hide();
                $("#next-actions").hide();
                $("#schedule").hide();
                $("#denied").show();
                $("#files").hide();
                $(".next").hide();

                $('.previous').append('<span> RE-OPEN</span>');

                let li = document.createElement('li');
                li.className = "active";
                ul.appendChild(li);
                li.innerHTML += '<a><h4 class="list-group-item-heading">Step '+(count+1)+'</h4>\n' +
                    '<p class="list-group-item-text">'+stage.name+'<br> ('+stage.stage_name+')</p></a>';
            }

            if (application.status === 0){
                $("#next-actions").hide();
                $('.previous').hide();
                $('.cancel').hide();
                $(".next").hide();
                $("#current_stage").html('<span>CANCELLED</span>');
            }

            if (stage.stage_name === 'Final Approval')
                $('.next').text('Disbursal (Disbursal)');

            if (stage.stage_name === 'Disbursal' || application.status === 2){
                $('#disbursement-amount').val((parseFloat(application.loan_amount)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
                $('#stage-actions').append('<a href="#" id="stage-action-0" class="dropdown-item" data-toggle="modal" data-target="#disburseModal">Disburse Loan</a>');
            }

            if (application.status === 2){
                $('#collect-payment-button').show();
                $('#generate-schedule-v2').show();
                $('#principal-total-text').hide();
                $('#disbursement-cards').show();
                $('#disburse-alert').show();
                $("#current_stage").hide();
                $("#next-actions").hide();
                $(".previous").hide();
                $(".cancel").hide();
                $(".next").hide();

                if (application.close_status === 0){
                    $('#close_loan').show();
                } else {
                    $('#loan_closed').show();
                    $('#collect-payment-button').text('View Collection');
                    $('#collect-payment-button').addClass('btn-secondary');
                    $('#collect-payment-button').removeClass('btn-primary');
                    switch (application.close_status){
                        case 1: {
                            $('#loan_closed').html('<strong>CLOSED </strong> | PAID OFF');
                            break;
                        }
                        case 2: {
                            $('#loan_closed').html('<strong>CLOSED </strong> | WRITTEN OFF');
                            break;
                        }
                        case 3: {
                            $('#loan_closed').html('<strong>CLOSED </strong>');
                            break;
                        }
                    }
                }
                checkTotalDue();
            }

            loadAllWorkflowState(workflow_stages);
        },
        'error': function (err) {
            console.log(err);
            notification('No internet connection','','error');
        }
    });
}

$('.cancel').on('click', function(e) {
    swal({
        title: "Are you sure?",
        text: "Once cancelled, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                $.ajax({
                    'url': '/user/application/cancel/'+application_id,
                    'type': 'get',
                    'success': function (data) {
                        notification('Loan cancelled successfully','','success');
                        window.location.reload();
                    },
                    'error': function (err) {
                        console.log(err);
                        notification('No internet connection','','error');
                    }
                });
            }
        });
});


function loadWorkflowState() {
    $.ajax({
        'url': '/user/workflow_process/'+application_id,
        'type': 'get',
        'success': function (data) {
            let states = data.response,
                state = states[states.length-1],
                allWells = $('.setup-content');

            loadWorkflowStages(state);
            allWells.hide();

            $('.previous').on('click', function(e) {
                previousStage(state,states);
            });

            $('#schedule').show();
            $('#files').show();
        },
        'error': function (err) {
            console.log(err);
            notification('No internet connection','','error');
        }
    });
}

let workflow_processes;
function loadAllWorkflowState(workflow_stages) {
    $.ajax({
        'url': '/user/workflow_process_all/'+application_id,
        'type': 'get',
        'success': function (data) {
            let states = data.response,
                $processes = $('#processes');
            workflow_processes = states;

            $processes.html('');
            if (!states[0])
                return $processes.append('<h3 style="margin: auto;">No transitions available yet!</h3>');
            states.forEach(function (state) {
                let previous_stage = ($.grep(workflow_stages, function(e){ return e.stageID === state.previous_stage; }))[0] || {stage_name:'N/A'},
                    current_stage = ($.grep(workflow_stages, function(e){ return e.stageID === state.current_stage; }))[0] || {stage_name:''},
                    by = (state.agentID)? ' by '+state.agent : '';
                $processes.append('<li>\n' +
                    '    <p><a href="#">'+current_stage.stage_name+'</a></p>\n' +
                    '    <p><a href="#">'+state.date_created+'</a></p>\n' +
                    '    <p>Moved from '+previous_stage.stage_name+' to '+current_stage.stage_name+by+'</p>\n' +
                    '</li>');
            });

            read_write_2();
        },
        'error': function (err) {
            console.log(err);
            notification('No internet connection','','error');
        }
    });
}

function nextStage(state, workflow_stages, action_stage) {
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
    if (!application.schedule || (application.schedule && !application.schedule[0]))
        return notification('Kindly upload loan schedule to proceed!','','warning');
    $('#wait').show();
    updatePreapplicationStatus(application.preapplicationID, state.next_stage, () => {
        $.ajax({
            'url': '/user/workflow_process/'+application_id+'/'+state.workflowID,
            'type': 'post',
            'data': {stage: stage, user_role:localStorage.getItem('role'), agentID:(JSON.parse(localStorage.getItem("user_obj"))).ID},
            'success': function (data) {
                $('#wait').hide();
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
                $('#wait').hide();
                console.log(err);
                notification('No internet connection','','error');
            }
        });
    });
}

function previousStage(state,states) {
    $.ajax({
        'url': '/user/revert_workflow_process/'+application_id,
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

function comment(){
    let $comment = $("#comment"),
        comment = $comment.val();
    if (!comment || comment === "")
        return notification('Kindly type a brief comment','','error');
    $('#wait').show();
    $('#addCommentModal').modal('hide');
    $.ajax({
        'url': '/user/application/comments/'+application_id+'/'+(JSON.parse(localStorage.getItem('user_obj')))['ID'],
        'type': 'post',
        'data': {text: comment},
        'success': function (data) {
            $('#wait').hide();
            let comments = data.response;
            results = comments;
            loadComments(comments);
            $comment.val("");
            notification('Comment saved successfully','','success');
        },
        'error': function (err) {
            $('#wait').hide();
            $comment.val("");
            notification('Oops! An error occurred while saving comment','','error');
        }
    });
}

let stage_file_name,
    document_others = false;
$('#fileupload').click(function () {
    let document = $('#stage-documents').val(),
        $others = $('#stage-documents-others');

    if (!document || (document === '-- Choose Document --'))
        return notification('Ensure you choose documents to be uploaded from the list','','warning');

    if ((document === 'others') && !$others.val())
        return notification('Ensure you input the document title','','warning');
});

function setDocumentTitle() {
    let $title = $('#others-document-title');
    if (!$title.val())
        return notification('Document title cannot be empty','','warning');
    $('#addDocumentModal').modal('hide');
    $('#stage-documents-others').val($title.val());
    fileUpload($title.val());
}

$('#stage-documents-others').click(function () {
    $('#addDocumentModal').modal('show');
});

$('#stage-documents').change(function () {
    let $othersModal = $('#addDocumentModal'),
        $others = $('#stage-documents-others');
    if (this.value === "others"){
        $others.show();
        $others.val('');
        document_others = true;
        $othersModal.modal('show');
    } else {
        $others.hide();
        document_others = false;
    }
    stage_file_name = this.value;
    fileUpload(this.value);
});

function formatBytes(a,b){if(0==a)return"0 Bytes";var c=1024,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]}

$('#document-file').change(function () {
    let _self = this,
        $images_preview = $('#images-preview'),
        $files_preview = $('#files-preview');
    if (this.files[0].type && (this.files[0].type).split('/') && ((this.files[0].type).split('/'))[0]){
        if (((this.files[0].type).split('/'))[0] !== 'image'){
            $images_preview.hide();
            $files_preview.show();
            $files_preview.find('tbody').html('');
            $images_preview.find('tbody').html('');
            $files_preview.find('tbody').append('<tr class="template-upload fade in">\n' +
                '    <td><span class="preview"><i style="font-size:70px" class="fa fa-file"></i></span></td>\n' +
                '    <td><p class="name">'+this.files[0].name+'</p></td>\n' +
                '    <td><p class="size">'+formatBytes(this.files[0].size)+'</p><div class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-bar progress-bar-success" style="width:0%;"></div></div></td>\n' +
                '    <td><button class="btn btn-primary start"><i class="glyphicon glyphicon-upload"></i><span>Start</span></button>\n' +
                '        <button class="btn btn-warning cancel"><i class="glyphicon glyphicon-ban-circle"></i><span>Cancel</span></button></td>\n' +
                '</tr>');

            $('.start').click(function (e) {
                e.preventDefault();

                let stage_document_name,
                    formData = new FormData(),
                    document = stage_file_name,
                    others = $('#stage-documents-others').val();

                if (document_others){
                    stage_document_name = (others)? others.replace(/ /g, '_') : '';
                } else {
                    stage_document_name = (document && document !== '-- Choose Document --')? document.replace(/ /g, '_') : '';
                }

                formData.append('files[]', _self.files[0]);
                $.ajax({
                    url: '/document-upload/'+application_id+'/'+stage_document_name,
                    type: "POST",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(response) {
                        notification("File uploaded successfully!","","success");
                        window.location.reload();
                    },
                    error: function() {
                        notification("Error! Please Try Again","","error");
                    }
                });
            });

            $('.cancel').click(function (e) {
                e.preventDefault();
                $files_preview.find('tbody').html('');
            });
        } else {
            $images_preview.show();
            $files_preview.hide();
            $files_preview.find('tbody').html('');
            $images_preview.find('tbody').html('');
        }
    } else {
        return notification('Kindly upload a valid file format','','warning');
    }
});

function fileUpload(document) {
    let stage_document_name,
        $fileupload = $('#fileupload'),
        others = $('#stage-documents-others').val();

    if (document_others){
        stage_document_name = (others)? others.replace(/ /g, '_') : '';
    } else {
        stage_document_name = (document && document !== '-- Choose Document --')? document.replace(/ /g, '_') : '';
    }

    $fileupload.fileupload({
        url: '/document-upload/'+application_id+'/'+stage_document_name,
        disableImageResize: /Android(?!.*Chrome)|Opera/
            .test(window.navigator.userAgent),
        maxFileSize: 999000,
        acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i
    });

    $fileupload.addClass('fileupload-processing');
    $.ajax({
        url: $fileupload.fileupload('option', 'url'),
        context: $fileupload[0]
    }).always(function () {
        $(this).removeClass('fileupload-processing');
    }).done(function (result) {
        $(this).fileupload('option', 'done')
            .call(this, $.Event('done'), {result: result});
    });
}

function initCSVUpload(application) {
    let schedule = [],
        $dvCSV = $("#dvCSV"),
        $saveCSV = $("#saveCSV"),
        $csvUpload = $("#csvUpload"),
        $uploadCSV = $("#uploadCSV"),
        $csvLoader = $("#csvLoader");

    $uploadCSV.bind("click", function () {
        schedule = [];
        let regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv|.txt)$/;
        if (regex.test($csvUpload.val().toLowerCase())) {
            if (typeof (FileReader) !== "undefined") {
                let reader = new FileReader();
                reader.onload = function (e) {
                    let table = $("<table border='1' style='text-align: center;'/>"),
                        rows = e.target.result.split("\n");
                    for (let i = 0; i < rows.length; i++) {
                        let invoice = {},
                            row = $("<tr />"),
                            cells = (rows[i].split(",").length > 7)? rows[i].split(",").slice(0, 7) : rows[i].split(",");
                        if (i === 0) {
                            cells = ["PRINCIPAL","INTEREST","BALANCE"];
                        } else if (i === 1) {
                            cells = ["INVOICE DATE","COLLECTION DATE","AMOUNT","INVOICE DATE","COLLECTION DATE","AMOUNT","AMOUNT"];
                        }
                        if (cells.join(' ').length > 10) {
                            for (let j = 0; j < cells.length; j++) {
                                cells[j] = (cells[j]) ? (cells[j]).trim() : cells[j];
                                if (!cells[j])
                                    continue;
                                let cell = $("<td />");
                                if (i === 0) {
                                    if (cells[j] === "PRINCIPAL" || cells[j] === "INTEREST")
                                        cell = $("<td colspan='3' />");
                                }
                                if (i > 1) {
                                    if (j === 0 || j === 1 || j === 3 || j === 4) {
                                        cell.html('<input id="invoice-' + i + '-' + j + '" type="date" value="' + cells[j] + '" />');
                                    } else {
                                        cell.html('<span id="invoice-' + i + '-' + j + '">' + cells[j] + '</span>');
                                    }
                                } else {
                                    cell.html(cells[j]);
                                }
                                row.append(cell);
                                switch (j) {
                                    case 0: {
                                        invoice.payment_create_date = cells[j];
                                        break;
                                    }
                                    case 1: {
                                        invoice.payment_collect_date = cells[j];
                                        break;
                                    }
                                    case 2: {
                                        invoice.payment_amount = cells[j];
                                        break;
                                    }
                                    case 3: {
                                        invoice.interest_create_date = cells[j];
                                        break;
                                    }
                                    case 4: {
                                        invoice.interest_collect_date = cells[j];
                                        break;
                                    }
                                    case 5: {
                                        invoice.interest_amount = cells[j];
                                        break;
                                    }
                                    case 6: {
                                        invoice.balance = cells[j];
                                        break;
                                    }
                                }
                            }
                        }
                        if (i>1 && cells.length === 7 && !$.isEmptyObject(invoice))
                            schedule.push(invoice);
                        table.append(row);
                    }
                    $dvCSV.html('');
                    $dvCSV.append(table);
                };
                reader.readAsText($csvUpload[0].files[0]);
            } else {
                return notification('This browser does not support HTML5.','','warning');
            }
        } else {
            return notification('Please select a valid CSV file.','','warning');
        }
    });

    $saveCSV.bind("click", function () {
        if (!schedule[0])
            return notification('Please upload a valid CSV file.','','warning');

        validateSchedule(schedule, function (validation) {
            if (validation.status){
                let schedule = validation.data;
                $csvLoader.show();
                $.ajax({
                    'url': '/user/application/schedule/'+application_id,
                    'type': 'post',
                    'data': {schedule:schedule},
                    'success': function (data) {
                        $csvLoader.hide();
                        $csvUpload.val('');
                        notification('Schedule saved successfully','','success');
                        window.location.reload();
                    },
                    'error': function (err) {
                        $csvLoader.hide();
                        $csvUpload.val('');
                        notification('Oops! An error occurred while saving schedule','','error');
                    }
                });
            } else {
                notification('There are error(s) in the uploaded schedule!','','error');
            }
        });
    });

    let $loanSchedule = $("#loanSchedule");
    if (application.schedule && application.schedule[0]){
        let total_principal = 0,
            table = $("<table border='1' style='text-align: center;'/>");
        for (let i = 0; i < application.schedule.length+2; i++) {
            let row,
                cells = [];
            if (i <= 1){
                row = $('<tr style="font-weight: bold;" />');
            } else {
                row = $("<tr />");
                if (application.schedule[i - 2]['status'] === 2)
                    continue;
                if (parseInt(application.schedule[i - 2]['status']) === 0)
                    row = $("<tr style='background-color: #aaaaaa; text-decoration: line-through;' />");
            }
            if (i === 0) {
                cells = ["PRINCIPAL","INTEREST","BALANCE","COLLECTION","TOTAL"];
            } else if (i === 1) {
                cells = ["INVOICE DATE","COLLECTION DATE","AMOUNT","INVOICE DATE","COLLECTION DATE","AMOUNT","AMOUNT","STATUS","ACTION","AMOUNT"];
            } else {
                cells[0] = application.schedule[i - 2]['payment_create_date'];
                cells[1] = application.schedule[i - 2]['payment_collect_date'];
                cells[2] = application.schedule[i - 2]['payment_amount'];
                cells[3] = application.schedule[i - 2]['interest_create_date'];
                cells[4] = application.schedule[i - 2]['interest_collect_date'];
                cells[5] = application.schedule[i - 2]['interest_amount'];
                cells[6] = application.schedule[i - 2]['balance'];
                cells[7] = cells[8] = application.schedule[i - 2]['payment_status'];
                cells[9] = (parseFloat(cells[2]) + parseFloat(cells[5])).round(2);
                let amount_paid = 0,
                    interest_paid = 0,
                    payment_history = $.grep(application.payment_history,function(e) {return (e.invoiceID===application.schedule[i - 2]['ID'] && e.status===1)});
                for (let k = 0; k < payment_history.length; k++){
                    amount_paid += parseFloat(payment_history[k]['payment_amount']);
                    interest_paid += parseFloat(payment_history[k]['interest_amount']);
                }
                let amount_owed = parseFloat(cells[2]) - amount_paid;
                let interest_owed = parseFloat(cells[5]) - interest_paid;
                if (amount_paid <= 0 && interest_paid <= 0){
                    cells[7] = 0;
                } else if (amount_owed <= 0 && interest_owed <= 0){
                    cells[7] = 1;
                } else if ((amount_paid + interest_paid).round(2) > 0 && (amount_owed + interest_owed).round(2) > 0){
                    cells[7] = 2;
                }
                if (application.schedule[i - 2]['payment_status'] === 2)
                    cells[7] = 1;
                if (application.schedule[i - 2]['status'] && cells[2])
                    total_principal += parseFloat(cells[2]);
            }
            for (let j = 0; j < cells.length; j++) {
                let cell = $("<td />");
                if (i === 0){
                    if (cells[j] === "PRINCIPAL" || cells[j] === "INTEREST")
                        cell = $("<td colspan='3' />");
                    if (cells[j] === "COLLECTION")
                        cell = $("<td colspan='2' />");
                }
                if (j === cells.length-2 && i>1){
                    cell.html('<div class="btn-group">\n' +
                        '    <button type="button" class="btn btn-info dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\n' +
                        '        <i class="fa fa-list"></i>\n' +
                        '    </button>\n' +
                        '    <div class="dropdown-menu">\n' +
                        '        <a class="dropdown-item" data-toggle="modal" data-target="#invoiceHistory" href="#" onclick="invoiceHistory('+application.schedule[i - 2]['ID']+')">Payment History</a>\n' +
                        '        <a class="dropdown-item" data-toggle="modal" data-target="#editHistory" href="#" onclick="editHistory('+application.schedule[i - 2]['ID']+')">Edit History</a>\n' +
                        '    </div>\n' +
                        '</div>');
                } else if (j === cells.length-3 && i>1){
                    switch (cells[j]){
                        case 0: {
                            cell.html('<span class="badge badge-danger">Not Paid</span>');
                            break;
                        }
                        case 1: {
                            cell.html('<span class="badge badge-success">Paid</span>');
                            break;
                        }
                        case 2: {
                            cell.html('<span class="badge badge-warning">Part Paid</span>');
                            break;
                        }
                    }
                } else {
                    if (cells[j]){
                        if (i > 1 && (j === 2 || j === 5 || j === 6 || j === 9)) {
                            cell.html(numberToCurrencyformatter(cells[j]));
                        } else {
                            cell.html(cells[j]);
                        }
                    } else {
                        cell.html('--');
                    }
                }
                row.append(cell);
            }
            table.append(row);
        }
        $loanSchedule.html('');
        $loanSchedule.append(table);
        initLoanSummary(total_principal);
    }
}

function invoiceHistory(invoice_id) {
    $.ajax({
        'url': '/user/application/invoice-history/'+invoice_id,
        'type': 'get',
        'success': function (data) {
            $("#invoice-history").dataTable().fnClearTable();
            $.each(data.response, function(k, v){
                let table = [
                    v.ID,
                    v.payment_amount,
                    v.interest_amount,
                    v.fees_amount,
                    v.penalty_amount,
                    v.agent,
                    v.date_created
                ];
                $('#invoice-history').dataTable().fnAddData(table);
                $('#invoice-history').dataTable().fnSort([[0,'desc']]);
            });
        },
        'error': function (err) {
            notification('No internet connection','','error');
        }
    });
}

function editHistory(invoice_id) {
    $.ajax({
        'url': '/user/application/edit-schedule-history/'+invoice_id,
        'type': 'get',
        'success': function (data) {
            $("#edit-history").dataTable().fnClearTable();
            $.each(data.response, function(k, v){
                let table = [
                    v.payment_amount,
                    v.interest_amount,
                    v.fees_amount,
                    v.penalty_amount,
                    v.payment_collect_date,
                    v.modified_by,
                    v.date_modified
                ];
                $('#edit-history').dataTable().fnAddData(table);
                $('#edit-history').dataTable().fnSort([[6,'desc']]);
            });
        },
        'error': function (err) {
            notification('No internet connection','','error');
        }
    });
}

let total_due_amount;
function initLoanSummary(total_prinicipal) {
    let payment_history = [],
        total_principal = total_prinicipal,
        invoices = $.grep(application.schedule,function(e){return e.status===1});
    $('#loan-amount-text').text('₦'+(parseFloat(application.loan_amount)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
    $('#principal-total-text').text('Disbursed Amount: ₦'+total_principal.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
    for (let i=0; i<invoices.length; i++){
        let payments = $.grep(application.payment_history,function(e){return e.invoiceID===invoices[i]['ID']});
        payment_history = payment_history.concat(payments);
    }
    if (!payment_history || !payment_history[0]){
        total_due_amount = total_prinicipal;
        $('#total-due-text').text('₦'+total_principal.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
        $('#last-payment-text').text('N/A');
    } else {
        let count = 0,
            amount = total_principal;
        payment_history.forEach(function (payment) {
            count++;
            amount = (amount - parseFloat(payment.payment_amount)).round(2);
            if (count === payment_history.length){
                total_due_amount = amount;
                $('#total-due-text').text(`₦${numberToCurrencyformatter(amount)}`);
            }
        });
        $('#last-payment-text').text(((payment_history[0]['date_created']).split(' '))[0]);
    }
    let next_payment_date = $.grep(application.schedule,function(e){return (e.payment_status===0 && e.status===1)});
    if (next_payment_date && next_payment_date[0]){
        $('#next-payment-date-text').text(next_payment_date[0]['payment_collect_date']);
    } else {
        $('#next-payment-date-text').text('N/A');
    }
}

function checkTotalDue() {
    if (total_due_amount === 0){
        $('#close_loan').hide();
        $('#loan_closed').show();
        $('#collect-payment-button').text('View Collection');
        $('#collect-payment-button').addClass('btn-secondary');
        $('#collect-payment-button').removeClass('btn-primary');
        $('#generate-schedule-v2').hide();
        if (application.close_status === 0){
            $('#loan_closed').html('<strong>REPAYMENT COMPLETED</strong>');
            swal({
                title: "Would you like to close this loan?",
                text: "All repayments for this loan application has been made",
                icon: "warning",
                buttons: true,
                dangerMode: true
            })
                .then((yes) => {
                    if (yes) {
                        $.ajax({
                            'url': '/user/application/close/'+application_id,
                            'type': 'post',
                            'data': {close_comment:'closed'},
                            'success': function (data) {
                                notification('Loan closed successfully','','success');
                                window.location.reload();
                            },
                            'error': function (err) {
                                notification('Oops! An error occurred while closing loan','','error');
                            }
                        });
                    }
                });
        }
    }
}

function disburse() {
    let disbursal = {};
    disbursal.funding_source = $('#funding').val();
    disbursal.disbursement_channel = $('#channel').val();
    disbursal.disbursement_date = $('#disbursement-date').val();
    if (disbursal.funding_source === "-- Select a Funding Source --" || disbursal.disbursement_channel === "-- Select a Channel --" || !disbursal.disbursement_date)
        return notification('Kindly fill all required fields!','','warning');
    if ($('#fees-check').is(':checked')) {
        let $fees = $('#disbursement-fees');
        if (!$fees.val())
            return notification('The fees amount is not valid!','','warning');
        disbursal.fees = currencyToNumberformatter($fees.val());
        disbursal.vat = currencyToNumberformatter($('#disbursement-vat').val());
        disbursal.fees_payment = $('#fees-payment').val();
    }
    $('#wait').show();
    $('#disburseModal').modal('hide');
    $.ajax({
        'url': '/user/application/disburse/'+application_id,
        'type': 'post',
        'data': disbursal,
        'success': function (data) {
            $('#wait').hide();
            notification('Loan disbursed successfully','','success');
            window.location.reload();
        },
        'error': function (err) {
            $('#wait').hide();
            notification('Oops! An error occurred while disbursing loan','','error');
        }
    });
}

$('#term').keyup(function () {
    triggerAmortization();
});
$('#amount').keyup(function () {
    triggerAmortization();
});
$('#interest-rate').keyup(function () {
    triggerAmortization();
});
$('#repayment-date').change(function () {
    triggerAmortization();
});

function triggerAmortization() {
    if ($('#amortization').val() === 'standard')
        $('#amortization').val('standard').trigger('change');
}

function processSchedule(schedule) {
    let result = [],
        total_principal = 0,
        amount = $('#amount').val(),
        date = $('#repayment-date').val();
    for (let i=-2; i<schedule.length-1; i++){
        if (i === -2){
            result.push("PRINCIPAL,,,INTEREST,,,BALANCE");
        } else if (i === -1){
            result.push("INVOICE DATE,COLLECTION DATE,AMOUNT,INVOICE DATE,COLLECTION DATE,AMOUNT,AMOUNT");
        } else {
            total_principal = (total_principal + schedule[i][1]).round(2);
            amount = parseFloat(amount);
            if (i === schedule.length-2){
                let excess = (total_principal > amount)? (total_principal - amount).round(2) : (amount - total_principal).round(2);
                schedule[i][2] = (schedule[i][2] + schedule[i][3] + excess).round(2);
                schedule[i][1] = (schedule[i][1] - excess).round(2);
                schedule[i][3] = 0;
            }
            let cells;
            if (date){
                cells = date+","+date+","+schedule[i][1]+","+date+","+date+","+schedule[i][2]+","+schedule[i][3];
                let date_array = date.split('-');
                date = new Date(date_array[0], (parseInt(date_array[1])-1), date_array[2]);
                date.setMonth(date.getMonth()+1);
                date = formatDate(date);
            } else {
                cells = "0,0,"+schedule[i][1]+",0,0,"+schedule[i][2]+","+schedule[i][3];
            }
            result.push(cells);
        }
    }
    return result;
}

function initCSVUpload2(application, settings) {
    let schedule = [],
        loan_amount = 0,
        $dvCSV = $("#dvCSV2"),
        $saveCSV = $("#saveCSV2"),
        $csvUpload = $("#csvUpload2"),
        $uploadCSV = $("#uploadCSV2"),
        $csvLoader = $("#csvLoader2"),
        $rejectCSV = $("#rejectCSV2"),
        $approveCSV = $("#approveCSV2"),
        $message = $("#schedule-error-message");

    $('#amortization').change(function () {
        $dvCSV.html('');
        schedule = [];
        loan_amount = 0;
        if (this.value === 'standard'){
            $('#uploadCSV2').hide();
            $('#csvUpload2').hide();
            $('.amortization-div').show();
            let loanAmount = $('#amount').val(),
                interestRate = $('#interest-rate').val(),
                duration = $('#term').val();
            if (!loanAmount || !interestRate || !duration)
                return $message.text('Kindly fill all required fields!','','warning');
            duration = parseFloat(duration);
            loanAmount = parseFloat(loanAmount);
            interestRate = parseFloat(interestRate);
            if (duration < settings.tenor_min || duration > settings.tenor_max)
                return $message.text(`Minimum tenor is ${numberToCurrencyformatter(settings.tenor_min)} (month)
                     and Maximum is ${numberToCurrencyformatter(settings.tenor_max)} (months)`,'','warning');
            if (interestRate < settings.interest_rate_min || interestRate > settings.interest_rate_max)
                return $message.text(`Minimum interest rate is ${numberToCurrencyformatter(settings.interest_rate_min)}% 
                    and Maximum is ${numberToCurrencyformatter(settings.interest_rate_max)}%`,'','warning');
            if (loanAmount < settings.loan_requested_min || loanAmount > settings.loan_requested_max)
                return $message.text(`Minimum loan amount is ₦${numberToCurrencyformatter(settings.loan_requested_min)} 
                    and Maximum is ₦${numberToCurrencyformatter(settings.loan_requested_max)}`,'','warning');
            $message.hide();

            let years = duration/12,
                paymentsPerYear = 12,
                rate_ = (interestRate/100)/paymentsPerYear,
                numberOfPayments = paymentsPerYear * years,
                payment = (pmt(rate_, numberOfPayments, -loanAmount)).toFixed(2),
                schedule_ = computeSchedule(loanAmount, interestRate, paymentsPerYear, years, parseFloat(payment)),
                table = $("<table border='1' style='text-align: center; width: 100%;'/>"),
                rows = processSchedule(schedule_);
            $('#payment-amount').val(payment);
            for (let i = 0; i < rows.length; i++) {
                let invoice = {},
                    row = $("<tr />"),
                    cells = (rows[i].split(",").length > 7)? rows[i].split(",").slice(0, 7) : rows[i].split(",");
                if (i === 0) {
                    cells = ["PRINCIPAL","INTEREST","BALANCE"];
                } else if (i === 1) {
                    cells = ["INVOICE DATE","COLLECTION DATE","AMOUNT","INVOICE DATE","COLLECTION DATE","AMOUNT","AMOUNT"];
                }
                if (cells.join(' ').length > 10) {
                    for (let j = 0; j < cells.length; j++) {
                        cells[j] = (cells[j]) ? (cells[j]).trim() : cells[j];
                        if (!cells[j])
                            continue;
                        let cell = $("<td />");
                        if (i === 0) {
                            if (cells[j] === "PRINCIPAL" || cells[j] === "INTEREST")
                                cell = $("<td colspan='3' />");
                        }
                        if (i > 1) {
                            if (j === 0 || j === 1 || j === 3 || j === 4) {
                                cell.html('<input id="invoice-' + i + '-' + j + '" type="date" value="' + cells[j] + '" />');
                            } else {
                                cell.html('<span id="invoice-' + i + '-' + j + '">' + cells[j] + '</span>');
                            }
                        } else {
                            cell.html(cells[j]);
                        }
                        row.append(cell);
                        switch (j) {
                            case 0: {
                                invoice.payment_create_date = cells[j];
                                break;
                            }
                            case 1: {
                                invoice.payment_collect_date = cells[j];
                                break;
                            }
                            case 2: {
                                if (i > 1)
                                    loan_amount = (loan_amount + parseFloat(cells[j])).round(2);
                                invoice.payment_amount = cells[j];
                                break;
                            }
                            case 3: {
                                invoice.interest_create_date = cells[j];
                                break;
                            }
                            case 4: {
                                invoice.interest_collect_date = cells[j];
                                break;
                            }
                            case 5: {
                                invoice.interest_amount = cells[j];
                                break;
                            }
                            case 6: {
                                invoice.balance = cells[j];
                                break;
                            }
                        }
                    }
                }
                if (i>1 && cells.length === 7 && !$.isEmptyObject(invoice))
                    schedule.push(invoice);
                table.append(row);
            }
            $dvCSV.html('');
            $dvCSV.append(table);
        } else {
            $('#uploadCSV2').show();
            $('#csvUpload2').show();
            $('.amortization-div').hide();
        }
    });

    $uploadCSV.bind("click", function () {
        schedule = [];
        loan_amount = 0;
        let regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv|.txt)$/;
        if (regex.test($csvUpload.val().toLowerCase())) {
            if (typeof (FileReader) !== "undefined") {
                let reader = new FileReader();
                reader.onload = function (e) {
                    let table = $("<table border='1' style='text-align: center;'/>"),
                        rows = e.target.result.split("\n");
                    for (let i = 0; i < rows.length; i++) {
                        let invoice = {},
                            row = $("<tr />"),
                            cells = (rows[i].split(",").length > 7)? rows[i].split(",").slice(0, 7) : rows[i].split(",");
                        if (i === 0) {
                            cells = ["PRINCIPAL","INTEREST","BALANCE"];
                        } else if (i === 1) {
                            cells = ["INVOICE DATE","COLLECTION DATE","AMOUNT","INVOICE DATE","COLLECTION DATE","AMOUNT","AMOUNT"];
                        }
                        if (cells.join(' ').length > 10) {
                            for (let j = 0; j < cells.length; j++) {
                                cells[j] = (cells[j]) ? (cells[j]).trim() : cells[j];
                                if (!cells[j])
                                    continue;
                                let cell = $("<td />");
                                if (i === 0) {
                                    if (cells[j] === "PRINCIPAL" || cells[j] === "INTEREST")
                                        cell = $("<td colspan='3' />");
                                }
                                if (i > 1) {
                                    if (j === 0 || j === 1 || j === 3 || j === 4) {
                                        cell.html('<input id="invoice-' + i + '-' + j + '" type="date" value="' + cells[j] + '" />');
                                    } else {
                                        cell.html('<span id="invoice-' + i + '-' + j + '">' + cells[j] + '</span>');
                                    }
                                } else {
                                    cell.html(cells[j]);
                                }
                                row.append(cell);
                                switch (j) {
                                    case 0: {
                                        invoice.payment_create_date = cells[j];
                                        break;
                                    }
                                    case 1: {
                                        invoice.payment_collect_date = cells[j];
                                        break;
                                    }
                                    case 2: {
                                        if (i > 1)
                                            loan_amount = (loan_amount + parseFloat(cells[j])).round(2);
                                        invoice.payment_amount = cells[j];
                                        break;
                                    }
                                    case 3: {
                                        invoice.interest_create_date = cells[j];
                                        break;
                                    }
                                    case 4: {
                                        invoice.interest_collect_date = cells[j];
                                        break;
                                    }
                                    case 5: {
                                        invoice.interest_amount = cells[j];
                                        break;
                                    }
                                    case 6: {
                                        invoice.balance = cells[j];
                                        break;
                                    }
                                }
                            }
                        }
                        if (i>1 && cells.length === 7 && !$.isEmptyObject(invoice))
                            schedule.push(invoice);
                        table.append(row);
                    }
                    $dvCSV.html('');
                    $dvCSV.append(table);
                };
                reader.readAsText($csvUpload[0].files[0]);
            } else {
                return notification('This browser does not support HTML5.','','warning');
            }
        } else {
            return notification('Please select a valid CSV file.','','warning');
        }
    });

    $saveCSV.bind("click", function () {
        if (!schedule[0])
            return notification('Please preview the schedule to be uploaded.','','warning');

        validateSchedule(schedule, function (validation) {
            if (validation.status){
                if (loan_amount.round(2) < total_due_amount.round(2))
                    return notification('Total principal on the new schedule must be greater than Principal balance','','warning');

                let schedule = validation.data;
                $csvLoader.show();
                $.ajax({
                    'url': '/user/application/add-schedule/'+application_id,
                    'type': 'post',
                    'data': {schedule:schedule},
                    'success': function (data) {
                        $csvLoader.hide();
                        $csvUpload.val('');
                        notification('Reschedule added successfully','','success');
                        window.location.reload();
                    },
                    'error': function (err) {
                        $csvLoader.hide();
                        $csvUpload.val('');
                        notification('Oops! An error occurred while adding reschedule','','error');
                    }
                });
            } else {
                notification('There are error(s) in the uploaded schedule!','','warning');
            }
        });
    });

    let total_new_schedule = 0,
        new_reschedule = $.grep(application.schedule,function(e){return e.status===2});
    if (new_reschedule && new_reschedule[0]){
        let table = $("<table border='1' style='text-align: center;'/>");
        for (let i = 0; i < new_reschedule.length+2; i++) {
            let row,
                cells = [];
            if (i <= 1){
                row = $('<tr style="font-weight: bold;" />');
            } else {
                row = $("<tr />");
            }
            if (i === 0) {
                cells = ["PRINCIPAL","INTEREST","BALANCE"];
            } else if (i === 1) {
                cells = ["INVOICE DATE","COLLECTION DATE","AMOUNT","INVOICE DATE","COLLECTION DATE","AMOUNT","AMOUNT"];
            } else {
                cells[0] = new_reschedule[i - 2]['payment_create_date'];
                cells[1] = new_reschedule[i - 2]['payment_collect_date'];
                cells[2] = new_reschedule[i - 2]['payment_amount'];
                cells[3] = new_reschedule[i - 2]['interest_create_date'];
                cells[4] = new_reschedule[i - 2]['interest_collect_date'];
                cells[5] = new_reschedule[i - 2]['interest_amount'];
                cells[6] = new_reschedule[i - 2]['balance'];
            }
            for (let j = 0; j < cells.length; j++) {
                let cell = $("<td />");
                if (i === 0){
                    if (cells[j] === "PRINCIPAL" || cells[j] === "INTEREST")
                        cell = $("<td colspan='3' />");
                }
                if (cells[j]){
                    if (i > 1 && (j === 2 || j === 5 || j === 6)) {
                        cell.html(numberToCurrencyformatter(cells[j]));
                    } else {
                        cell.html(cells[j]);
                    }
                } else {
                    cell.html('--');
                }
                if (j === 2){
                    if (i > 1)
                        total_new_schedule = (total_new_schedule + parseFloat(cells[j])).round(2);
                }
                row.append(cell);
            }
            table.append(row);
        }
        $dvCSV.html('');
        $dvCSV.append(table);
        $('#amortization').hide();
        $('#reschedule-total-text').text('Disbursed Amount: ₦'+total_new_schedule.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
    }

    $approveCSV.bind("click", function () {
        if (!new_reschedule || !new_reschedule[0])
            return notification('There is no reschedule available for approval!','','error');

        swal({
            title: "Are you sure?",
            text: "Once started, this process is not reversible!",
            icon: "warning",
            buttons: true,
            dangerMode: true
        })
            .then((yes) => {
                if (yes) {
                    $csvLoader.show();
                    let reschedule_amount = (total_new_schedule-total_due_amount).round(2),
                        loan_amount_update = (parseFloat(application.loan_amount)+reschedule_amount).round(2);
                    $.ajax({
                        'url': '/user/application/approve-schedule/'+application_id,
                        'type': 'post',
                        'data': {reschedule_amount:reschedule_amount,loan_amount_update:loan_amount_update},
                        'success': function (data) {
                            $csvLoader.hide();
                            notification('Reschedule approved successfully','','success');
                            window.location.reload();
                        },
                        'error': function (err) {
                            $csvLoader.hide();
                            notification('Oops! An error occurred while approving reschedule','','error');
                        }
                    });
                }
            });
    });

    $rejectCSV.bind("click", function () {
        if (!new_reschedule || !new_reschedule[0])
            return notification('There is no reschedule available to delete!','','error');

        $csvLoader.show();
        $.ajax({
            'url': '/user/application/reject-schedule/'+application_id,
            'type': 'get',
            'success': function (data) {
                $csvLoader.hide();
                notification('Reschedule deleted successfully','','success');
                window.location.reload();
            },
            'error': function (err) {
                $csvLoader.hide();
                notification('Oops! An error occurred while deleting reschedule','','error');
            }
        });
    });
}

function validateSchedule(schedule, callback) {
    let errors = [],
        validated_schedule = [];
    for (let i=0; i<schedule.length; i++){
        let invoice = {},
            $col0 = $('#invoice-'+(i+2)+'-0'),
            $col1 = $('#invoice-'+(i+2)+'-1'),
            $col2 = $('#invoice-'+(i+2)+'-2'),
            $col3 = $('#invoice-'+(i+2)+'-3'),
            $col4 = $('#invoice-'+(i+2)+'-4'),
            $col5 = $('#invoice-'+(i+2)+'-5'),
            $col6 = $('#invoice-'+(i+2)+'-6'),
            a = $col0.val(),
            b = $col1.val(),
            c = schedule[i]['payment_amount'],
            d = $col3.val(),
            e = $col4.val(),
            f = schedule[i]['interest_amount'],
            g = schedule[i]['balance'];
        if (isValidDate(a)){
            $col0.removeClass('invalid');
            invoice.payment_create_date = a;
        } else {
            $col0.addClass('invalid');
            errors.push(a+' is not a valid date');
        }
        if (isValidDate(b)){
            $col1.removeClass('invalid');
            invoice.payment_collect_date = b;
        } else {
            $col1.addClass('invalid');
            errors.push(b+' is not a valid date');
        }
        if (!isNaN(c)){
            $col2.removeClass('invalid');
            invoice.payment_amount = c;
        } else {
            $col2.addClass('invalid');
            errors.push(c+' is not a valid number');
        }
        if (isValidDate(d)){
            $col3.removeClass('invalid');
            invoice.interest_create_date = d;
        } else {
            $col3.addClass('invalid');
            errors.push(d+' is not a valid date');
        }
        if (isValidDate(e)){
            $col4.removeClass('invalid');
            invoice.interest_collect_date = e;
        } else {
            $col4.addClass('invalid');
            errors.push(e+' is not a valid date');
        }
        if (!isNaN(f)){
            $col5.removeClass('invalid');
            invoice.interest_amount = f;
        } else {
            $col5.addClass('invalid');
            errors.push(f+' is not a valid number');
        }
        if (!isNaN(g)){
            $col6.removeClass('invalid');
            invoice.balance = g;
        } else {
            $col6.addClass('invalid');
            errors.push(g+' is not a valid number');
        }
        validated_schedule.push(invoice);
    }
    if (errors[0]){
        callback({status: false, data: errors});
    } else {
        callback({status: true, data: validated_schedule});
    }
}

function openPayOffModal() {
    $('#payoff-amount').val($('#total-due-text').text());
    let interest = 0;
    let invoices = $.grep(application.schedule,function (e) {return (parseInt(e.status)===1 && parseInt(e.payment_status)===0)});
    if (invoices && invoices[0]){
        invoices.forEach(function (invoice) {
            interest += parseFloat(invoice.interest_amount);
            $('#payoff-interest').val(interest);
        });
    } else {
        $('#payoff-interest').val(0);
    }
}

function openWriteOffModal() {
    $('#writeoff-name').val(application.fullname);
    $('#writeoff-amount').val($('#total-due-text').text());
}

function writeOffLoan() {
    $.ajax({
        'url': '/user/application/write-off/'+application_id+'/'+(JSON.parse(localStorage.user_obj)).ID,
        'type': 'post',
        'data': {close_comment:$('#writeoff-notes').val()},
        'success': function (data) {
            notification('Loan closed successfully','','success');
            window.location.reload();
        },
        'error': function (err) {
            notification('Oops! An error occurred while closing loan','','error');
        }
    });
}

function payOffLoan() {
    let payoff = {};
    payoff.close_interest = $('#payoff-interest').val();
    payoff.close_date = $('#payoff-date').val();
    payoff.close_channel = $('#payoff-channel').val();
    payoff.close_comment = $('#payoff-notes').val();
    if ($('input[name=payoff-include-interest]:checked').val())
        payoff.close_include_interest = $('input[name=payoff-include-interest]:checked').val();
    if (!payoff.close_interest || !payoff.close_date || !payoff.close_channel)
        return notification('Kindly fill all required inputs to close loan','','warning');
    $.ajax({
        'url': '/user/application/pay-off/'+application_id+'/'+(JSON.parse(localStorage.user_obj)).ID,
        'type': 'post',
        'data': payoff,
        'success': function (data) {
            notification('Loan closed successfully','','success');
            window.location.reload();
        },
        'error': function (err) {
            notification('Oops! An error occurred while closing loan','','error');
        }
    });
}

function checkForExistingMandate(data) {
    $.ajax({
        type: 'GET',
        url: `/preapproved-loan/get/${application_id}?key=applicationID`,
        success: function (response) {
            let mandate = response.data;
            const HOST = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
            if (mandate && mandate.ID) {
                $('#viewMandate').show();
                $('#setupDirectDebit').hide();
                $('#mandateId').text(mandate.mandateId || 'N/A');
                $('#requestId').text(mandate.requestId || 'N/A');
                $('#isActive').text(mandate.remita.isActive || 'N/A');
                $('#remitaTransRef').text(mandate.remitaTransRef || 'N/A');
                $('#registrationDate').text(mandate.remita.registrationDate || 'N/A');
                $('#mandateLink').val(`${HOST}/offer?t=${encodeURIComponent(mandate.hash)}&i=${application_id}`);
            } else {
                let today = new Date(),
                    schedule = $.grep(data.schedule, (e) => { return e.status === 1 }),
                    date1 = new Date(schedule[0]['payment_collect_date']),
                    date2 = new Date(schedule[0]['interest_collect_date']);
                today.setHours(0,0,0,0);
                if (date1 < today || date2 < today) {
                    $('#setupDirectDebit').hide();
                } else {
                    $('#setupDirectDebit').show();
                }
                $('#viewMandate').hide();
            }
        }
    });
}

function copyLink() {
    let text = document.getElementById("mandateLink");
    text.select();
    document.execCommand("copy");
    notification('Link copied!', text.value, 'success');
}

$("#setupDirectDebit").click(function () {
    swal({
        title: "Are you sure?",
        text: "Once initiated, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                let obj = {};
                obj.userID = application.userID;
                obj.workflowID = application.workflowID;
                obj.loan_amount = application.loan_amount;
                obj.interest_rate = application.interest_rate;
                obj.duration = application.duration;
                obj.repayment_date = application.repayment_date;
                obj.agentID = (JSON.parse(localStorage.getItem("user_obj"))).ID;

                let preapproved_loan = Object.assign({}, obj);
                delete preapproved_loan.agentID;
                preapproved_loan.client = application.fullname;
                preapproved_loan.average_loan = '';
                preapproved_loan.credit_score = '';
                preapproved_loan.defaults = '';
                preapproved_loan.invoices_due = '';
                preapproved_loan.offer_duration = application.duration;
                preapproved_loan.offer_loan_amount = application.loan_amount;
                preapproved_loan.offer_first_repayment_date = application.repayment_date;
                preapproved_loan.offer_interest_rate = application.interest_rate;
                preapproved_loan.months_left = '';
                preapproved_loan.salary_loan = '';
                preapproved_loan.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;

                $('#wait').show();
                $.ajax({
                    'url': '/preapproved-loan/create',
                    'type': 'post',
                    'data': {
                        application: obj,
                        email: application.email,
                        applicationID: application.ID,
                        fullname: application.fullname,
                        preapproved_loan: preapproved_loan
                    },
                    'success': function (response) {
                        $('#wait').hide();
                        if(response.status === 500) {
                            notification('No internet connection', '', 'error');
                        } else {
                            notification(`Offer successfully sent to ${application.email}`,'','success');
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

function generateLoanFile() {
    const loanFile = {
        id: application_id,
        request_date: application.date_created,
        customer_name: application.fullname,
        incorporation_date: application.incorporation_date,
        line_of_business: application.industry,
        initiating_officer: workflow_processes[0]['agent'],
        client_date_created: application.client_date_created,
        registration_number: application.registration_number,
        loan_amount: application.loan_amount,
        interest_rate: application.interest_rate,
        fees: application.fees,
        tenor: application.duration,
        loan_purpose: application.loan_purpose,
        documents: application.documents,
        customer_details_request: (workflow_comments[0])? workflow_comments[0]['text'] : '',
        transaction_dynamics: (workflow_comments[1])? workflow_comments[1]['text'] : '',
        kyc: `${($.isEmptyObject(application.files))? 'Not':'Yes'} Attached`,
        security: `${($.isEmptyObject(application.files))? 'Not':'Yes'} Attached`,
        workflow_processes: workflow_processes
    };
    localStorage.loanFile = encodeURIComponent(JSON.stringify(loanFile));
    return window.open(`/loan-file?id=${application_id}`, '_blank');
}

function updatePreapplicationStatus(id, stage, callback) {
    if (stage !== 2) return callback();
    $.ajax({
        'url': `/client/application/complete/${id}`,
        'type': 'get',
        'success': function (data) {
            if (data.status === 500) console.log(data.error);
            callback();
        },
        'error': function (err) {
            console.log(err);
            callback();
        }
    });
}

function read_write_1(){
    let perms = JSON.parse(localStorage.getItem("permissions")),
        applicationView = ($.grep(perms, function(e){return e.module_name === 'app-page';}))[0];

    if (applicationView && applicationView['read_only'] === '1'){
        loadApplication();
    } else {
        loadApplication((JSON.parse(localStorage.user_obj)).ID);
    }
}

function read_write_2(){
    let w,
        perms = JSON.parse(localStorage.getItem("permissions")),
        page = (window.location.pathname.split('/')[1].split('.'))[0];
    perms.forEach(function (k){
        if (k.module_name === page)
            w = $.grep(perms, function(e){return e.id === parseInt(k.id);});
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1))
        $(".write").hide();

    if (($.grep(perms, function(e){return e.module_name === 'collectPaymentButton';}))[0]['read_only'] === '0')
        $('#collect-payment-button').hide();
    if (($.grep(perms, function(e){return e.module_name === 'uploadCSV2';}))[0]['read_only'] === '0')
        $('#uploadCSV2').hide();
    if (($.grep(perms, function(e){return e.module_name === 'saveCSV2';}))[0]['read_only'] === '0')
        $('#saveCSV2').hide();
    if (($.grep(perms, function(e){return e.module_name === 'approveCSV2';}))[0]['read_only'] === '0')
        $('#approveCSV2').hide();
    if (($.grep(perms, function(e){return e.module_name === 'rejectCSV2';}))[0]['read_only'] === '0')
        $('#rejectCSV2').hide();
    if (($.grep(perms, function(e){return e.module_name === 'close-loan';}))[0]['read_only'] === '0')
        $('#close_loan').hide();
}