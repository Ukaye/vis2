jQuery(document).ready(function() {
    getRoles();
    getUsers();
    getBranches();
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

$("#addUser").click(function () {
    validate();
});

$("#cpassword").change(function(){
    confirmPassword();
});

function confirmPassword(){
    if ($('#cpassword').val() === "" || $('#cpassword').val() != $('#password').val()){
        return swal('Password Mismatch', 'Passwords Must Match', 'error');
    }
}

function validate(){
    if ($('#fullname').val() == "" || $('#fullname').val() == null)
        return swal('Kindly enter a valid fullname','','warning');
    if ($('#email').val() == "" || $('#email').val() == null)
        return swal('Kindly enter the an email address for the user','','warning');
    if (validateEmail($('#email').val()) === false)
        return swal('Kindly enter a valid email address','','warning');
    if ($('#password').val() == "" || $('#password').val() == null)
        return swal('Kindly type in a password','','warning');
    if ($('#role').find('option:selected').attr('id') == 0)
        return swal('Kindly select a role for this user','','warning');
    if ($('#branch').val() === '-- Select a Branch --')
        return swal('Kindly choose a branch','','warning');
    if ($('#supervisor').val() === '-- Choose Supervisor --')
        return swal('Kindly select a supervisor','','warning');
    createUser();
}

function getRoles(){
    $.ajax({
        type: "GET",
        url: "/user/user-roles",
        success: function (response) {
            var role = $("[id=role]");
            role.empty().append('<option selected="selected" id="0">-- Choose User Role --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#role").append('<option class="deptSp" value = "' + val.id + '" id="' + val.id + '">' + val.role_name + '</option>');
            });
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
                $("#team_supervisor").append('<option value = "' + val.ID + '">' + val.fullname + '</option>');
            });
            $("#supervisor").select2();
            $("#team_supervisor").select2();
        }
    });
}

function createUser(){
    let obj = {},
        test = {};
    obj.username = $('#email').val();
    obj.password = $('#password').val();
    obj.fullname = $('#fullname').val();
    obj.email = $('#email').val();
    obj.user_role = $('#role').find('option:selected').attr('id');
    obj.branch = $('#branch').find('option:selected').attr('id');
    obj.supervisor = $('#supervisor').val();
    if (obj.supervisor === '-- Choose Supervisor --')
        return swal('Kindly select a supervisor','','warning');
    if ($('#loan_officer_status').is(':checked'))
        obj.loan_officer_status = 1;
    $('#wait').show();
    $.ajax({
        'url': '/user/new-user',
        'type': 'post',
//                'xhrFields': '{withCredentials: true}',
//                'crossDomain': true,
        'data': obj,
        'success': function (data) {
            $('#wait').hide();
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.message){
                swal("Username already exists!","","error");
            }
            else if(test.status === 500){
                swal("Failed!","Unable to submit","error");
            }
            else{
                swal("User Registered!","","success");
                $('#email').val('');
                $('#password').val('');
                $('#cpassword').val('');
                $('#fullname').val('');
                $('#email').val('');
                $('#role').val(0);
                $('#branch').val(0);
                $('#supervisor').val(0);
//                        window.location.href = "/all-users";
            }
        }
    });
}

function createTeam(){
    let obj = {};
    obj.name = $('#team_name').val();
    obj.supervisor = $('#team_supervisor').val();
    if (!obj.name || obj.supervisor === '-- Choose Supervisor --')
        return swal('Kindly fill all required field(s)','','warning');
    $('#wait').show();
    $.ajax({
        'url': '/user/new-team',
        'type': 'post',
        'data': obj,
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                swal(response.error,"","error");
            } else{
                $('#team_name').val('');
                $('#team_supervisor').val('-- Choose Supervisor --').trigger('change');
                swal("Team Registered!","","success");
                window.location.href = "/all-teams";
            }
        }
    });
}

function validateRole(){
    if ($('#new-role').val() == "" || $('#new-role').val() == null){
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
                $('#role').val("");
                swal("Role already exists!","","error");
            }
            else if(test.status === 500){
                $('#role').val("");
                swal("Please recheck entered values!","","error");
            }
            else
            {$('#role').val(""); swal("New Role Registered!","","success"); getRoles();}
        }
    });
}

function getBranches(){
    $.ajax({
        type: "GET",
        url: "/user/branches",
        success: function (response) {
            var branch = $("[id=branch]");
            branch.empty().append('<option selected="selected" id="0">-- Select a Branch --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#branch").append('<option value = "' + val.id + '" id="' + val.id + '">' + val.branch_name + '</option>');
            });
        }
    });
}

function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}