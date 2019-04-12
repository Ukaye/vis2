$(document).ready(function() {
    loadUsers();
    getRoles();
    getTargets();
    getCommissions();
    $('#user_targets').DataTable();
    $('#user_commissions').DataTable();
    $('#bootstrap-data-table-export').DataTable();
});

$("#cpassword").change(function(){
    confirmPassword();
});

let results;

var table = $('#bootstrap-data-table-export').DataTable();

function confirmPassword(){
    if ($('#cpassword').val() === "" || $('#cpassword').val() != $('#new-password').val()){
        return swal('Password Mismatch', 'Passwords Must Match', 'error');
    }
}

function validatePassword(){
    if ($('#new-password').val() === "" || $('#new-password').val() === null){
        return swal('', 'Password field cannot be empty!', 'warning');
    }
    else {
        changePassword();
    }
}

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

function loadUsers(){

    $.ajax({
        'url': '/user/users-list-full',
        'type': 'get',
        'data': {},
        'success': function (data) {
            let users = JSON.parse(data);
            results = users;
            populateDataTable(users);
        },
        'error': function (err) {
            console.log(err);
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

function formatDate(timestamp) {
    timestamp = parseInt(timestamp);
    let date =  new Date(timestamp);
    return date.toLocaleString();
}

function populateDataTable(data) {
    $("#bootstrap-data-table").DataTable().clear();
    let processed_data = [];
    $.each(data, function(k, v){
        let actions;
        if (v.status === "1"){
            if (v.loan_officer_status === 1){
                actions = '<button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> Choose Action </button>\n' +
                    '<div class="dropdown-menu">\n' +
                    '    <a href="#" class="write dropdown-item" data-toggle="modal" data-target="#myModal" onclick="openDetailsModal('+v.ID+')"><i class="fa fa-eye"></i> View More</a>\n' +
                    '    <a href="#" class="write dropdown-item" data-toggle="modal" data-target="#targetsModal" onclick="openTargetsModal('+v.ID+')"><i class="fa fa-bullseye"></i> Add/View Target</a>\n' +
                    '    <a href="#" class="write dropdown-item" data-toggle="modal" data-target="#commissionsModal" onclick="openCommissionsModal('+v.ID+')"><i class="fa fa-line-chart"></i> Add/View Commission</a>\n' +
                    '    <a href="#" class="write dropdown-item" onclick="activities('+v.ID+')"><i class="fa fa-tasks"></i> View Activities</a>\n' +
                    '    <a href="#" class="write dropdown-item" data-toggle="modal" data-target="#myModal1" onclick="openPasswordModal('+v.ID+')"><i class="fa fa-lock"></i> Change Password</a>\n' +
                    '    <a href="#" class="write dropdown-item" id="'+v.ID+'" name="'+v.ID+'" onclick="confirm('+v.ID+')"><i class="fa fa-trash"></i> Disable User</a>\n' +
                    '</div>';
            } else {
                actions = '<button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> Choose Action </button>\n' +
                    '<div class="dropdown-menu">\n' +
                    '    <a href="#" class="write dropdown-item" data-toggle="modal" data-target="#myModal" onclick="openDetailsModal('+v.ID+')"><i class="fa fa-eye"></i> View More</a>\n' +
                    '    <a href="#" class="write dropdown-item" data-toggle="modal" data-target="#myModal1" onclick="openPasswordModal('+v.ID+')"><i class="fa fa-lock"></i> Change Password</a>\n' +
                    '    <a href="#" class="write dropdown-item" id="'+v.ID+'" name="'+v.ID+'" onclick="confirm('+v.ID+')"><i class="fa fa-trash"></i> Disable User</a>\n' +
                    '</div>';
            }
        }
        else {
            actions = '<button id="'+v.ID+'" name="'+v.ID+'" onclick="confirmEnable('+v.ID+')" class="write btn btn-success "><i class="fa fa-lightbulb-o"></i> Enable User</button>';
        }
        v.actions = actions;
        processed_data.push(v);
    });
    $('#bootstrap-data-table').DataTable({
        dom: 'Blfrtip',
        bDestroy: true,
        data: processed_data,
        search: {search: ' '},
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        columns: [
            { data: "username" },
            { data: "fullname" },
            { data: "Role" },
            { data: "actions" }
        ]
    });
}

function confirm(id) {
    swal({
        title: "Disable this user?",
        text: "Click OK to continue",
        //icon: "input",
        //content: "input",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                disableUser(id);
            }
        });
}

function confirmEnable(id) {
    swal({
        title: "Make this user active again?",
        text: "Click OK to continue",
        //icon: "input",
        //content: "input",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                enableUser(id);
            }
        });
}

function openDetailsModal(id) {
    localStorage.setItem("user_id",id);
    let data = ($.grep(results, function(e){ return e.ID === id; }))[0],
        loan_officer_status = '',
        tbody = $("#details"),
        tr = "";
    tbody.empty();
    if (data.loan_officer_status === 1)
        loan_officer_status = ' (Loan Officer)';
    if (data.fullname)
        tr += "<tr><td><strong>Fullname</strong></td><td>"+data.fullname+"</td></tr>";
    if (data.username)
        tr += "<tr><td><strong>Username</strong></td><td>"+data.username+"</td></tr>";
    if (data.email)
        tr += "<tr><td><strong>Email</strong></td><td>"+data.email+"</td></tr>";
    if (data.phone)
        tr += "<tr><td><strong>Phone</strong></td><td>"+data.phone+"</td></tr>";
    if (data.address)
        tr += "<tr><td><strong>Address</strong></td><td>"+data.address+"</td></tr>";
    if (data.Role)
        tr += "<tr><td><strong>User Role</strong></td><td>"+data.Role+loan_officer_status+"</td></tr>";
    if (data.date_created)
        tr += "<tr><td><strong>Date Created</strong></td><td>"+formatDate(data.date_created)+"</td></tr>";
    if (data.supervisor)
        tr += "<tr><td><strong>Supervisor</strong></td><td>"+data.supervisor+"</td></tr>";
    tbody.html(tr);
}

function openPasswordModal(id) {
    localStorage.setItem("id",id);
    let data = ($.grep(results, function(e){ return e.ID === id; }))[0];
    $("#username").val(data.fullname);
}

function changePassword(){
    let obj = {};
    if ($('#cpassword').val() !== $('#new-password').val())
        return swal('Password Mismatch', 'Passwords Must Match', 'error');
    obj.password = $('#cpassword').val();
    $.ajax({
        'url': '/user/changePassword/'+localStorage.getItem("id"),
        'type': 'post',
        'data': obj,
        'success': function (data) {
            swal('User password updated successfully!','','success');
            $('#cpassword').val('');
            $('#new-password').val('');
        },
        'error': function (err) {
            swal('Oops! An error occurred. Try Again.','','error');
        }
    });
}

function getRoles(){
    $.ajax({
        type: "GET",
        url: "/user/user-roles/",
        data: '{}',
        success: function (response) {
            var role = $("[id=role]");
            // role.empty().append('<option selected="selected" id="0">-- Choose User Role --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#role").append('<option class="deptSp" value = "' + val.id + '" id="' + val.id + '">' + val.role_name + '</option>');
            });
            getBranches();
        }
    });
}

function setSelectedIndex(s, valsearch){
    // Loop through all the items in drop down list
    for (i = 0; i< s.options.length; i++){
        if (s.options[i].value == valsearch){
            // Item is found. Set its property and exit
            s.options[i].selected = true;
            break;
        }
    }
    return;
}

function edit(){
    $.ajax({
        'url': '/user/user-dets/'+localStorage.getItem("user_id"),
        'type': 'get',
        'success': function (data) {
            $('#user-form').slideDown();
            $('#user-table').slideToggle();
            $('#fullname').val(data[0].fullname);
            $('#user-name').val(data[0].username);
            $('#phone').val(data[0].phone);
            $('#address').val(data[0].address);
            $('#email').val(data[0].email);
            $('#role').val(data[0].user_role);
            $('#branch').val(data[0].branch);
            // $('.select2-selection__rendered').html(data[0].Super);
            $('#supervisor').val(data[0].supervisor)
            $('#supervisor').select2('destroy');
            $('#supervisor').select2();
            if (data[0].loan_officer_status === 1)
                $('#loan_officer_status').prop('checked','checked');
        },
        'error': function (err) {
            swal('Oops! An error occurred while retrieving details.','','error');
        }
    });
}

function submitDetails(){
    let obj = {},
        test = {};
    obj.username = $('#user-name').val();
    obj.fullname = $('#fullname').val();
    obj.email = $('#email').val();
    obj.user_role = $('#role').find('option:selected').attr('id');
    obj.branch = $('#branch').find('option:selected').attr('id');
    if ($('#supervisor').val() !== '-- Choose Supervisor --')
        obj.supervisor = $('#supervisor').val();
    obj.loan_officer_status = 0;
    if ($('#loan_officer_status').is(':checked'))
        obj.loan_officer_status = 1;
    $.ajax({
        'url': '/user/edit-user/'+localStorage.getItem("user_id")+'/'+JSON.parse(localStorage.user_obj).ID,
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.response === null){
                swal("Communication Error! Please try again","","error");
            }
            else{
                notification();
                swal("User Details Updated!","","success");
                window.location.href = "./all-users";
            }

        },
        'error': function (err) {
            swal('Connection Error. Please try again.','','error');
        }
    });
}

function disableUser(id){
    let test = {};
    $.ajax({
        'url': '/user/del-user/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Please Retry Action!","","error");
            }
            else{
                swal("User Disabled Successfully!","","success");
                loadUsers();
            }
        },
        'error': function(e){
            swal('Internet Connection Error!','','error');
        }
    });
}

function enableUser(id){
    let test = {};
    $.ajax({
        'url': '/user/en-user/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Please try again!","","error");
            }
            else{
                swal("User Reactivated Successfully!","","success");
                loadUsers();
            }
        },
        'error': function(e){
            swal('Internet Connection Error!','','error');
        }
    });
}

function getBranches(){
    $.ajax({
        type: "GET",
        url: "/user/branches",
        success: function (response) {
            let branch = $("[id=branch]");
            branch.empty().append('<option id="0">-- Select a Branch --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#branch").append('<option value = "' + val.id + '" id="' + val.id + '">' + val.branch_name + '</option>');
            });
            getUsers();
        }
    });
}

function getUsers(){
    $.ajax({
        type: "GET",
        url: "/user/users-list",
        success: function (response) {
            $.each(JSON.parse(response), function (key, val) {
                $("#supervisor").append('<option value = "' + val.ID + '">' + val.fullname + '</option>');
            });
            $("#supervisor").select2();
        }
    });
}

function validate(){
    if ($('#fullname').val() == "" || $('#fullname').val() == null)
        return swal('Kindly enter a valid fullname','','warning');
    if ($('#email').val() == "" || $('#email').val() == null)
        return swal('Kindly enter the an email address for the user','','warning');
    if (validateEmail($('#email').val()) === false)
        return swal('Kindly enter a valid email address','','warning');
    if ($('#role').find('option:selected').attr('id') == 0)
        return swal('Kindly select a role for this user','','warning');
    if ($('#branch').val() === '-- Select a Branch --')
        return swal('Kindly choose a branch','','warning');
    if ($('#supervisor').val() === '-- Choose Supervisor --')
        return swal('Kindly select a supervisor','','warning');
    submitDetails();
}

function validateRole(){
    if ($('#new-role').val() === "" || $('#new-role').val() === null){
        return swal('', 'Enter a valid role name.', 'warning')
    }else{
        saveNewRole();
    }
}

function saveNewRole(){
    let obj = {},
        test = {};
    obj.role = $('#new-role').val();
    $.ajax({
        'url': '/user/new-role/',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.message){
                $('#new-role').val("");
                swal("Role already exists!","","error");
            }
            else if(test.status === 500){
                $('#new-role').val("");
                swal("Please recheck entered values!","","error");
            }
            else
            {$('#new-role').val(""); swal("New Role Registered!","","success"); getRoles();}
        }
    });
}

let target_id;
$('#target_list').on('change', function() {
    target_id = $("#target_list").find("option:selected").val();
    getPeriods(target_id);
    getLimit(target_id);
});

let targets;
function getTargets(){
    $.ajax({
        type: "GET",
        url: "/targets",
        success: function (data) {
            targets = data.response;
            $.each(data.response, function (key, val) {
                $("#target_list").append('<option value = "' + val.ID + '">' + val.title + '</option>');
            });
            $("#target_list").select2();
        }
    });
}

let assigned_targets;
function getAssignedTarget(user_id){
    $.ajax({
        type: "GET",
        url: "/user/user-assigned-target/"+user_id,
        success: function (data) {
            assigned_targets = data.response;
            $("#commission_target").html('<option value="-- Select Target --" selected="selected">-- Select Target --</option>');
            $.each(data.response, function (key, val) {
                $("#commission_target").append('<option value = "' + val.ID + '">' + val.target + '</option>');
            });
            $("#commission_target").select2();
        }
    });
}

$('#commission_target').on('change', function() {
    let id = $("#commission_target").find("option:selected").val();
    getCommissionPeriods(id);
});

let commissions;
function getCommissions(){
    $.ajax({
        type: "GET",
        url: "/commissions",
        success: function (data) {
            commissions = data.response;
            $.each(data.response, function (key, val) {
                $("#commission_list").append('<option value = "' + val.ID + '">' + val.title + '</option>');
            });
            $("#commission_list").select2();
        }
    });
}

let target_limit;
$('#target_limit').text('');
function getLimit(id){
    if (id && id !== '-- Select Target --'){
        $.ajax({
            type: "GET",
            url: "/user/target/limit/"+id,
            success: function (data) {
                target_limit = parseFloat(data.response.unallocated);
                $('#target_limit').text('Total unallocated target is ₦'+(target_limit.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')));
            }
        });
    } else {
        $('#target_limit').text('');
    }
}

$("#sub_period_list").html('<option selected="selected">-- Select Target Period --</option>');
function getPeriods(id){
    if (id && id !== '-- Select Target --'){
        $('#wait').show();
        $.ajax({
            type: "GET",
            url: "/target/sub_periods/"+id,
            success: function (data) {
                $('#wait').hide();
                $("#sub_period_list").prop('disabled',false);
                $("#sub_period_list").html('<option selected="selected">-- Select Target Period --</option>');
                $.each(data.response, function (key, val) {
                    $("#sub_period_list").append('<option value = "' + val.ID + '">' + val.name + '</option>');
                });
                $("#sub_period_list").select2();
            }
        });
    }
}

let assigned_periods;
$("#commission_period").html('<option selected="selected">-- Select Period -</option>');
function getCommissionPeriods(id){
    if (id && id !== '-- Select Target --'){
        $('#wait').show();
        $.ajax({
            type: "GET",
            url: "/user/user-assigned-period/"+localStorage.user_commission_id+"/"+id,
            success: function (data) {
                $('#wait').hide();
                assigned_periods = data.response;
                $("#commission_period").prop('disabled',false);
                $("#commission_period").html('<option selected="selected">-- Select Period -</option>');
                $.each(assigned_periods, function (key, val) {
                    $("#commission_period").append('<option value = "' + val.ID + '">' + val.name + '</option>');
                });
                $("#commission_period").select2();
            }
        });
    }
}

let commission_period_value;
$('#commission_period_value').text('');
$('#commission_period').on('change', function() {
    let commission_period = $("#commission_period").find("option:selected").val();
    if (commission_period && commission_period !== '-- Select Period -'){
        commission_period_value = parseFloat(($.grep(assigned_periods, function(e){return e.ID === parseInt(commission_period);}))[0]['value']);
        $('#commission_period_value').text('Max rate is 100% (₦'+(commission_period_value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'))+')');
    } else {
        $('#commission_period_value').text('');
    }
});

$('#commission_list').on('change', function() {
    let commission_id = $("#commission_list").find("option:selected").val();
    if (commission_id && commission_id !== '-- Select Commission -'){
        let commission = ($.grep(commissions, function(e){return e.ID === parseInt(commission_id);}))[0];
        if (commission && commission.accelerator){
            $('#accelerator_threshold_div').show();
        } else {
            $('#accelerator_threshold_div').hide();
        }
    }
});

function openTargetsModal(id) {
    localStorage.user_target_id = id;
    $.ajax({
        type: "GET",
        url: "/user/user-targets/"+id,
        success: function (data) {
            populateTargets(data);
        }
    });
}

function populateTargets(data){
    $("#user_targets").dataTable().fnClearTable();
    $.each(data.response, function(k, v){
        $('#user_targets').dataTable().fnAddData( [
            v.target,
            v.period,
            v.type,
            '₦'+((parseFloat(v.value)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')),
            '<button type="button" class="btn btn-danger" onclick="removeTarget('+v.ID+','+v.targetID+')"><i class="fa fa-remove"></i> Remove</button>'
        ]);
    });
}

function openCommissionsModal(id) {
    localStorage.user_commission_id = id;
    getAssignedTarget(id);
    $.ajax({
        type: "GET",
        url: "/user/user-commissions/"+id,
        success: function (data) {
            populateCommissions(data);
        }
    });
}

function populateCommissions(data){
    $("#user_commissions").dataTable().fnClearTable();
    $.each(data.response, function(k, v){
        $('#user_commissions').dataTable().fnAddData( [
            v.commission,
            v.target,
            v.period,
            v.type,
            v.threshold,
            v.accelerator_threshold || '--',
            '<button type="button" class="btn btn-danger" onclick="removeCommission('+v.ID+')"><i class="fa fa-remove"></i> Remove</button>'
        ]);
    });
}

function assignTarget() {
    let obj = {};
    obj.userID = localStorage.user_target_id;
    obj.targetID = $('#target_list').val();
    obj.sub_periodID = $('#sub_period_list').val();
    obj.value = $('#target_value').val();
    if (obj.targetID === '-- Select Target --' || obj.sub_periodID === '-- Select Target Period --' || !obj.value)
        return swal('Kindly fill all required field(s)','','warning');
    if (parseFloat(obj.value) > target_limit)
        return swal('Insufficient unallocated target ('+target_limit+')','','warning');
    obj.periodID = ($.grep(targets, function(e){return e.ID === parseInt(target_id);}))[0]['period'];
    $('#wait').show();
    $.ajax({
        'url': '/user/user-targets',
        'type': 'post',
        'data': obj,
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification(response.error,"","error");
            } else{
                notification("Target assigned successfully!","","success");
                populateTargets(response);
                getLimit(obj.targetID);
            }
        }
    });
}

function removeTarget(id,targetID) {
    $('#wait').show();
    $.ajax({
        'url': '/user/user-targets/'+id+'/'+localStorage.user_target_id,
        'type': 'delete',
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification("No internet connection","","error");
            } else{
                notification("Target deleted successfully!","","success");
                populateTargets(response);
                getLimit(targetID);
            }
        }
    });
}

function assignCommission() {
    let obj = {};
    obj.userID = localStorage.user_commission_id;
    obj.targetID = $('#commission_target').val();
    obj.commissionID = $('#commission_list').val();
    obj.sub_periodID = $('#commission_period').val();
    obj.threshold = $('#commission_threshold').val();
    obj.accelerator_threshold = $('#accelerator_threshold').val();
    if (obj.targetID === '-- Select Target --' || obj.commissionID === '-- Select Commission --' || obj.sub_periodID === '-- Select Period -' || !obj.threshold)
        return swal('Kindly fill all required field(s)','','warning');
    if (parseFloat(obj.threshold) < 1 || parseFloat(obj.threshold) > 100)
        return swal('Commission threshold rate ('+obj.threshold+'%) must be at least 1% and at most 100%. (Total allocated target is valued at '+commission_period_value+')','','warning');
    if (obj.accelerator_threshold){
        if (parseFloat(obj.accelerator_threshold) <= parseFloat(obj.threshold))
            return swal('Accelerator threshold ('+obj.accelerator_threshold+'%) must be greater than '+parseFloat(obj.threshold)+'%.','','warning');
    }
    obj.type = ($.grep(commissions, function(e){return e.ID === parseInt(obj.commissionID);}))[0]['type'];
    let target = ($.grep(assigned_targets, function(e){return e.ID === parseInt(obj.targetID);}))[0],
        period = ($.grep(assigned_periods, function(e){return e.ID === parseInt(obj.sub_periodID);}))[0];
    if (obj.type !== target.type)
        return swal('Commission and Target must be of the same type','','warning');
    obj.periodID = target.period;
    obj.target_value = period.value;
    obj.threshold = parseFloat(obj.threshold);
    $('#wait').show();
    $.ajax({
        'url': '/user/user-commissions',
        'type': 'post',
        'data': obj,
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification(response.error,"","error");
            } else{
                notification("Commission assigned successfully!","","success");
                populateCommissions(response);
            }
        }
    });
}

function removeCommission(id) {
    $('#wait').show();
    $.ajax({
        'url': '/user/user-commissions/'+id+'/'+localStorage.user_commission_id,
        'type': 'delete',
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification("No internet connection","","error");
            } else{
                notification("Commission deleted successfully!","","success");
                populateCommissions(response);
            }
        }
    });
}

function activities(id){
    window.location.href = '/activity?officer='+id;
}

function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function notification(title,text,type) {
    return swal({title: title, text: text, icon: type, timer: 1000});
}