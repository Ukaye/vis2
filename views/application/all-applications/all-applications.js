$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    read_write_custom();
});

let applicationsList;
function read_write_custom(){
    let w,
        perms = JSON.parse(localStorage.getItem("permissions")),
        page = (window.location.pathname.split('/')[1].split('.'))[0];
    applicationsList = ($.grep(perms, function(e){return e.module_name === 'applicationsList';}))[0];
    perms.forEach(function (k){
        if (k.module_name === page)
            w = $.grep(perms, function(e){return e.id === parseInt(k.id);});
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1))
        $(".write").hide();

    if (applicationsList && applicationsList['read_only'] === '1'){
        loadApplications();
    } else {
        loadApplications((JSON.parse(localStorage.user_obj)).ID);
    }
}


let results;
$('#wait').show();
function loadApplications(id){
    let uid = id || '';
    $.ajax({
        'url': '/user/applications/'+uid,
        'type': 'get',
        'success': function (data) {
            $('#wait').hide();
            let applications = data.response;
            results = applications;
            populateDataTable(applications);
        },
        'error': function (err) {
            $('#wait').hide();
            console.log(err);
        }
    });
}

function populateDataTable(data) {
    console.log("populating data table...");
    $("#bootstrap-data-table").dataTable().fnClearTable();
    $.each(data, function(k, v){
        let table = [
            padWithZeroes(v.ID,9),
            v.loanCirrusID || 'N/A',
            (v.client_type === 'corporate')? v.corporate_name : v.fullname,
            v.phone,
            numberToCurrencyformatter(v.loan_amount),
            v.product || 'preapproved',
            v.date_created,
            v.current_stage,
            '<button type="button" class="btn btn-info btn-sm" data-toggle="modal" data-target="#myModal" onclick="openModal('+v.ID+')"><i class="fa fa-eye"></i> View Client</button>'
        ];
        if (v.close_status === 0) {
            if (v.status === 1){
                switch (v.current_stage){
                    case 2: {
                        table[table.length-2] = '<span class="badge badge-info">Pending Approval</span>';
                        break;
                    }
                    case 3: {
                        table[table.length-2] = '<span class="badge badge-info">Pending Disbursal</span>';
                        break;
                    }
                    default: {
                        table[table.length-2] = '<span class="badge badge-primary">Started</span>';
                    }
                }
            } else if (v.status === 2){
                table[table.length-2] = '<span class="badge badge-success">Active</span>';
            } else {
                table[table.length-2] = '<span class="badge badge-danger">Not Active</span>';
            }
        } else{
            table[table.length-2] = '<span class="badge badge-warning">Closed</span>';
        }
        if (v.reschedule_amount){
            table[table.length-2] = table[table.length-2].concat('<span class="badge badge-pill badge-secondary">Rescheduled</span>');
        } else {
            if (v.reschedule_status === 1)
                table[table.length-2] = table[table.length-2].concat('<span class="badge badge-pill badge-secondary">Pending Reschedule</span>');
        }
        if (v.comment){
            let view_comment_button = ' <button type="button" class="btn btn-primary btn-sm" data-toggle="modal" data-target="#viewCommentModal" onclick="openViewCommentModal('+v.ID+')"><i class="fa fa-eye"></i> View Comment</button>';
            table[table.length-1] = table[table.length-1].concat(view_comment_button);
        } else {
            let add_comment_button = ' <button type="button" class="btn btn-success btn-sm write" data-toggle="modal" data-target="#addCommentModal" onclick="openAddCommentModal('+v.ID+')"><i class="fa fa-plus"></i> Add Comment</button>';
            table[table.length-1] = table[table.length-1].concat(add_comment_button);
        }
        if (v.workflowID){
            let view_workflow_button;
            if (v.status === 2){
                view_workflow_button = ' <button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal" data-target="#viewWorkflowModal" onclick="openViewWorkflowModal('+v.ID+')"><i class="fa fa-eye"></i> View Loan</button>';
            } else {
                view_workflow_button = ' <button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal" data-target="#viewWorkflowModal" onclick="openViewWorkflowModal('+v.ID+')"><i class="fa fa-eye"></i> View Application</button>';
            }
            table[table.length-1] = table[table.length-1].concat(view_workflow_button);
        } else {
            let add_workflow_button = ' <button type="button" class="btn btn-outline-success btn-sm" data-toggle="modal" data-target="#addWorkflowModal" onclick="openAddWorkflowModal('+v.ID+')"><i class="fa fa-plus"></i> Assign Loan Process</button>';
            table[table.length-1] = table[table.length-1].concat(add_workflow_button);
        }
        $('#bootstrap-data-table').dataTable().fnAddData(table);
        $('#bootstrap-data-table').dataTable().fnSort([[6,'desc']]);
    });
}

function openModal(id) {
    localStorage.setItem("application_id",id);
    let data = ($.grep(results, function(e){ return e.ID === id; }))[0],
        tbody = $("#application"),
        tr = "";
    tbody.empty();
    if (data.client_type === 'corporate') {
        data.fullname = data.corporate_name;
        data.phone = data.corporate_phone;
        data.email = data.corporate_email;
    }
    if (data.fullname)
        tr += "<tr><td>Name</td><td>"+data.fullname+"</td></tr>";
    if (data.phone)
        tr += "<tr><td>Phone Number</td><td>"+data.phone+"</td></tr>";
    if (data.email)
        tr += "<tr><td>Email</td><td>"+data.email+"</td></tr>";
    if (data.loan_amount)
        tr += "<tr><td>Loan Amount</td><td>"+data.loan_amount+"</td></tr>";
    if (data.collateral)
        tr += "<tr><td>Collateral</td><td>"+data.collateral+"</td></tr>";
    if (data.jewelry)
        tr += "<tr><td>Jewelry</td><td>"+data.jewelry+"</td></tr>";
    if (data.brand)
        tr += "<tr><td>Brand</td><td>"+data.brand+"</td></tr>";
    if (data.model)
        tr += "<tr><td>Model</td><td>"+data.model+"</td></tr>";
    if (data.year)
        tr += "<tr><td>Year</td><td>"+data.year+"</td></tr>";
    if (data.date_created)
        tr += "<tr><td>Date Created</td><td>"+processDate(data.date_created)+"</td></tr>";
    tbody.html(tr);
}

function openViewCommentModal(id) {
    localStorage.setItem("application_id",id);
    let data = ($.grep(results, function(e){ return e.ID === id; }))[0],
        tbody = $("#view_comment"),
        tr = "";
    tbody.empty();
    if (data.comment)
        tr += "<tr><td>Comment</td></tr><tr><td>"+data.comment+"</td></tr>";
    tbody.html(tr);
}

function openAddCommentModal(id) {
    localStorage.setItem("application_id",id);
}

function openViewWorkflowModal(id) {
    window.location.href = "/application?id="+id;
}

function openAddWorkflowModal(id) {
    localStorage.setItem("application_id",id);
}

function archive(){
    $('#wait').show();
    $.ajax({
        'url': '/user/applications/delete/'+localStorage.getItem("application_id"),
        'type': 'get',
        'success': function (data) {
            $('#wait').hide();
            let applications = data.response;
            results = applications;
            notification('Application archived successfully');
            window.location.reload();
        },
        'error': function (err) {
            $('#wait').hide();
            notification('Oops! An error occurred during archiving');
        }
    });
}

function comment(){
    let $comment = $("#comment"),
        comment = $comment.val();
    if (!comment || comment === "")
        return notification('Kindly type a brief comment');
    $('#wait').show();
    $.ajax({
        'url': '/user/applications/comment/'+localStorage.getItem("application_id"),
        'type': 'post',
        'data': {comment: comment},
        'success': function (data) {
            $('#wait').hide();
            let applications = data.response;
            results = applications;
            $comment.val("");
            notification('Comment saved successfully');
            window.location.reload();
        },
        'error': function (err) {
            $('#wait').hide();
            $comment.val("");
            notification('Oops! An error occurred while saving comment');
        }
    });
}

$("#filter").submit(function (e) {
    e.preventDefault();
    let id = '';
    if (!(applicationsList && applicationsList['read_only'] === '1'))
        id = (JSON.parse(localStorage.user_obj)).ID;

    let start = $("#startDate").val(),
        end = $("#endDate").val(),
        type = $("#type-filter").val(),
        url = '/user/applications/'+id+'?start='+processDate(start)+'&&end='+processDate(end);
    if (!start || !end)
        return loadApplications();
    if (type)
        url = url.concat('&&type='+type);

    $.ajax({
        'url': url,
        'type': 'get',
        'success': function (data) {
            let applications = data.response;
            results = applications;
            populateDataTable(applications);
        },
        'error': function (err) {
            console.log(err);
        }
    });
});

function filterType(type) {
    let id = '';
    if (!(applicationsList && applicationsList['read_only'] === '1'))
        id = (JSON.parse(localStorage.user_obj)).ID;

    let start = $("#startDate").val(),
        end = $("#endDate").val(),
        url = '/user/applications/'+id+'?';
    if (start && end)
        url = url.concat('start='+processDate(start)+'&&end='+processDate(end)+'&&');
    url = url.concat('type='+type.value);

    $.ajax({
        'url': url,
        'type': 'get',
        'success': function (data) {
            let applications = data.response;
            results = applications;
            populateDataTable(applications);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}