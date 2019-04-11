$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    getWorkflows();
    loadUsers();
    read_write();
});

function check(){
    if (localStorage.getItem('role') !== 1){
        jQuery('#car-models').hide();
        jQuery('#new-user').hide();
        jQuery('#models-card').hide();
        jQuery('#user').html(localStorage.getItem("name"));
    }
    else{
        jQuery('#user').html(localStorage.getItem("name"));
    }
}

function loadMenus(){
    let modules = {};
    modules = JSON.parse(localStorage.getItem("modules"));
    modules.forEach(function(k, v){
        if (k.menu_name === 'Sub Menu'){
            let main = $.grep(modules, function(e){return e.id === parseInt(k.main_menu);});
            $('#'+$(main[0]['module_tag']).attr('id') + ' > .sub-menu').append(k.module_tag);
        }else if(k.menu_name === 'Main Menu'){
            $('#sidebar').append(k.module_tag);
            $('#'+$(k.module_tag).attr('id')).append('<ul class="sub-menu children dropdown-menu"></ul>');
        }else{
            $('#'+k.module_name).show();
        }
    });
    $.ajax({
        type: "GET",
        url: "/user/all-requests",
        success: function (response) {
            $.each(response, function(k,v){
                $('#requests-badge').html(v.requests);
            });
        }
    });
    $.ajax({
        type: "GET",
        url: "/user/all-applications",
        success: function (response) {
            $.each(response, function(k,v){
                $('#applications-badge').html(v.applications);
            });
        }
    });
}

function read_write(){
    let w;
    var perms = JSON.parse(localStorage.getItem("permissions"));
    var page = (window.location.pathname.split('/')[1].split('.'))[0];
    perms.forEach(function (k,v){
        if (k.module_name === page){
            w = $.grep(perms, function(e){return e.id === parseInt(k.id);});
        }
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1)){
        $(".write").hide();
    }
}

let results;

function loadUsers(){
    $.ajax({
        'url': '/user/requests',
        'type': 'get',
        'data': {},
        'success': function (data) {
            var applications = data.response;
            results = applications;
            populateDataTable(applications);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function getWorkflows(){
    $.ajax({
        type: "GET",
        url: "/workflows",
        success: function (response) {
            localStorage.setItem("workflows",JSON.stringify(response.response));
            $.each(response.response, function (key, val) {
                $("#workflows").append('<option class="deptSp" value = "'+val.ID+'"">'+val.name+'</option>');
            });
        }
    });
}

function populateDataTable(data) {
    console.log("populating data table...");
    $("#bootstrap-data-table").dataTable().fnClearTable();
    $.each(data, function(k, v){
        let table = [
            v.fullname,
            v.phone,
            v.collateral,
            v.loan_amount,
            v.date_created,
            '<button type="button" class="btn btn-info" data-toggle="modal" data-target="#myModal" onclick="openModal('+v.ID+')"><i class="fa fa-eye"></i> View Client</button>'
        ];
        if (v.comment){
            let view_comment_button = ' <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#viewCommentModal" onclick="openViewCommentModal('+v.ID+')"><i class="fa fa-eye"></i> View Comment</button>';
            table[table.length-1] = table[table.length-1].concat(view_comment_button);
        } else {
            let add_comment_button = ' <button type="button" class="btn btn-success write" data-toggle="modal" data-target="#addCommentModal" onclick="openAddCommentModal('+v.ID+')"><i class="fa fa-plus"></i> Add Comment</button>';
            table[table.length-1] = table[table.length-1].concat(add_comment_button);
        }
//                if (v.workflowID){
//                    let view_workflow_button = ' <button type="button" class="btn btn-outline-primary" data-toggle="modal" data-target="#viewWorkflowModal" onclick="openViewWorkflowModal('+v.ID+')"><i class="fa fa-eye"></i> View Application</button>';
//                    table[table.length-1] = table[table.length-1].concat(view_workflow_button);
//                } else {
//                    let add_workflow_button = ' <button type="button" class="btn btn-outline-success" data-toggle="modal" data-target="#addWorkflowModal" onclick="openAddWorkflowModal('+v.ID+')"><i class="fa fa-plus"></i> Assign Loan Process</button>';
//                    table[table.length-1] = table[table.length-1].concat(add_workflow_button);
//                }
        $('#bootstrap-data-table').dataTable().fnAddData(table);
        $('#bootstrap-data-table').dataTable().fnSort([[4,'desc']]);
    });
}

//        function formatDate(timestamp) {
//            timestamp = parseInt(timestamp);
//            let date =  new Date(timestamp);
//            return date.toLocaleString();
//        }

function openModal(id) {
    localStorage.setItem("application_id",id);
    let data = ($.grep(results, function(e){ return e.ID === id; }))[0],
        tbody = $("#application"),
        tr = "";
    tbody.empty();
    if (data.fullname)
        tr += "<tr><td>Fullname</td><td>"+data.fullname+"</td></tr>";
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
        tr += "<tr><td>Date Created</td><td>"+formatDate(data.date_created)+"</td></tr>";
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
    $('#myModal').modal('hide');
    $.ajax({
        'url': '/user/requests/delete/'+localStorage.getItem("application_id"),
        'type': 'get',
        'data': {},
        'success': function (data) {
            $('#wait').hide();
            let applications = data.response;
            results = applications;
            populateDataTable(applications);
            swal('Application archived successfully','','success');
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Oops! An error occurred during archiving','','error');
        }
    });
}

function comment(){
    let $comment = $("#comment"),
        comment = $comment.val();
    if (!comment || comment === "")
        return swal('Kindly type a brief comment','','warning');
    $('#wait').show();
    $('#addCommentModal').modal('hide');
    $.ajax({
        'url': '/user/requests/comment/'+localStorage.getItem("application_id"),
        'type': 'post',
        'data': {comment: comment},
        'success': function (data) {
            $('#wait').hide();
            let applications = data.response;
            results = applications;
            populateDataTable(applications);
            $comment.val("");
            swal('Comment saved successfully','','success');
            window.location.reload();
        },
        'error': function (err) {
            $('#wait').hide();
            $comment.val("");
            swal('Oops! An error occurred while saving comment','','error');
            window.location.reload();
        }
    });
}

function assignWorkflow(){
    let workflow_id = $("#workflows").val();
    if (workflow_id === "-- Choose Workflow Process --")
        return swal('Kindly select a workflow for assignment','','warning');
    $('#wait').show();
    $('#addWorkflowModal').modal('hide');
    $.ajax({
        'url': '/user/request/assign_workflow/'+localStorage.getItem("application_id")+'/'+workflow_id,
        'type': 'get',
        'success': function (data) {
            $('#wait').hide();
            let applications = data.response;
            results = applications;
            populateDataTable(applications);
            $("#workflows").val("");
            swal('Workflow assigned successfully','','success');
        },
        'error': function (err) {
            $('#wait').hide();
            $("#workflows").val("");
            swal('Oops! An error occurred while assigning workflow','','error');
        }
    });
}

$("#filter").submit(function (e) {
    e.preventDefault();

    let start = $("#startDate").val(),
        end = $("#endDate").val();
    if (!start || !end)
        return loadUsers();

    $.ajax({
        'url': '/user/requests/filter/'+formatDate(start)+'/'+formatDate(end),
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

function formatDate(date) {
    let separator;
    if (date.indexOf('-') > -1){
        separator = '-';
    } else if (date.indexOf('/') > -1){
        separator = '/';
    } else {
        return date;
    }
    let date_array = date.split(separator);
    return date_array[0]+'-'+date_array[1]+'-'+date_array[2];
}