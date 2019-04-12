$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    getRoles();
    loadModules(function () {});
});

$("#submit-activity").click(function () {
    validateActivity();
});

function validateActivity(){
    if ($('#new-role').val() == "" || $('#new-role').val() == null){
        swal('Empty field!', 'Enter a Valid Activity Name.', 'warning');
    }else{
        saveNewActivityType();
    }
}

function saveNewActivityType(){
    var obj = {};
    obj.role = $('#new-role').val();
    var test={};
    $.ajax({
        'url': '/user/new-activity-type/',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.message){
                $('#role').val("");
                swal("Activity type already exists!","","error");
            }
            else if(test.status == 500){
                $('#role').val("");
                swal("Please recheck entered values!","","error");
            }
            else
            {$('#role').val(""); swal("New Activity Type Registered!","","success"); getActivityTypes();}
        }
    });
}

var myTable = $('#role-table')
    .DataTable({
        bAutoWidth: false,
        "aoColumns": [
            { "bSortable": true }, { "bSortable": false }
            //null, null, null, { "bSortable": false },
        ],
        "aaSorting": [],
        "bSearchable": true,
        select: {
            style: 'multi'
        }
    });

var myTable2 = $('#module-table')
    .DataTable({
        bAutoWidth: false,
        "aoColumns": [
            { "bSortable": true },
            null, { "bSortable": false },{ "bSortable": false }
            // , null, { "bSortable": false },
        ],
        "aaSorting": [],
        "bSearchable": false,
        "bFilter": false,
        // "bInfo" : false,
        select: {
            style: 'multi'
        },
        "paging": false
    });

let role = localStorage.getItem("selectedRole");

$(document).on('change', '.RosaCheck', function() {
    let parent = $(this).attr('parent'); let me = $(this).attr('id');
    if (parent === 'null'){
        $('#'+me+'-write').prop('checked', true);
        $('.RosaCheck').each(function () {
            if ($(this).attr('parent') === me){
                $(this).prop('checked', false);
                $('#'+me+'-write').prop('checked', false);
                let ws = $(this).attr('id')+'-write';
                $('#'+ws).prop('checked', false);
            }
        })
    }
    if(this.checked) {
        // checkbox is checked
        if (!(parent === null)){
            $('#'+parent).prop('checked', true);
        }
    }
});

$(document).on('change', '.WriteCheck', function() {
    let parent = $(this).attr('parent'); let read_sibling = $(this).attr('di');
    if(this.checked) {
        // checkbox is checked
        $('#'+read_sibling).prop('checked', true);
        $('#'+parent).prop('checked', true);
        $('#'+parent+'-write').prop('checked', true);
    }
});

$(document).on("click", "#submit", function (e) {
    (selectedRole === 0) ? swal('No role chosen!', 'Please select a role.', 'warning') : saveRolePermissions(selectedRole);
});

let modules;

function saveRolePermissions(r){
    var obj = {};
    var arr = [];
    var i = 0; var j = 0;

//        $('.RosaCheck').each(function () {
//            if ($(this). prop("checked") === true){
//                arr[i++] = [$(this).attr('di'), 1];
//            }
//            else{
//                arr[i++] = [$(this).attr('di'), 0];
//            }
//        });
//        $('.WriteCheck').each(function(){
//            if ($(this).prop("checked") === true){
//                arr[j][2] = 1;
//                j++;
//            }
//            else{
//                arr[j][2] = 0;
//                j++;
//            }
//        });
    for (let a = 0; a < modules.length; a++){
        let rd; let wt;
        rd = ($('#'+modules[a]["id"]).prop('checked'))? 1 : 0;
        wt = ($('#'+modules[a]["id"]+'-write').prop('checked'))? 1 : 0;
        arr[a]=[modules[a]["id"], rd, wt];
    }

    obj.role = r;
    obj.modules = arr;
    var test = [];
    $.ajax({
        'url': '/submitPermission/'+r+'/',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(data, function (key, val) {
                test[key] = val;
            });
//                console.log(test);
            if(test.status == 500){
                swal("Failed!", "Error encountered. Please try again.", 'error');
            }
            else {
                selectedRole = 0;
                selectedName = '';
                swal("Success!", "Views and Read / Write Permissions set for Role.", 'success');
                loadModules(function () {});
            }
        }
    });
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

function edit(role, name){
    $('#selectedName').html(': '+name);
}

let glob={};
function getRoles(){
    $.ajax({
        type: "GET",
        url: "/user/roles/"+JSON.parse(localStorage.user_obj).user_role,
        data: '{}',
        success: function (response) {
            // role.empty().append('<option selected="selected" id="0">-- Choose User Role --</option>');
            glob = JSON.parse(response);
            $("#role-table").dataTable().fnClearTable();
            $.each(JSON.parse(response), function (key, val) {
                let actions;
                if (val.status === "1"){
                    var action = '<a href="#" class="btn btn-info" onclick="loadRolePermissions('+val.id+')" name="'+val.role_name+'" title="Click to edit"><i class="ace-icon fa fa-pencil bigger-130"></i></a> &nbsp; &nbsp;'
                    var disable = '<button name="'+val.id+'" onclick="confirm('+val.id+')" class="write btn btn-danger "><i class="fa fa-trash"></i> Disable Role</button>'
                }
                else {
                    var action = " ";
                    var disable = '<button name="'+val.id+'" onclick="confirmEnable('+val.id+')" class="write btn btn-success "><i class="fa fa-lightbulb-o"></i> Enable Role</button>'
                }
                $('#role-table').dataTable().fnAddData( [
                    val.role_name, action + disable
                    // "Make",
                    // "Make",
                    // action
                ]);
            });
        }
    });
}

function confirm(id) {
    // approveInspection(status, "Passed");
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
                disableRole(id);
            }
        });
}

function disableRole(id){
    var test = {};
    $.ajax({
        'url': '/user/del-role/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Please Retry Action!");
            }
            else{
                swal("Role Disabled Successfully!");
                getRoles();
            }
        },
        'error': function(e){
            swal('Internet Connection Error!');
        }
    });
}

function confirmEnable(id) {
    // approveInspection(status, "Passed");
    swal({
        title: "Enable this role?",
        text: "Click OK to continue",
        //icon: "input",
        //content: "input",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                enableRole(id);
            }
        });
}

function enableRole(id){
    var test = {};
    $.ajax({
        'url': '/user/en-role/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Please Retry Action!");
            }
            else{
                swal("Role Enabled Successfully!");
                getRoles();
            }
        },
        'error': function(e){
            swal('Internet Connection Error!');
        }
    });
}

let selectedRole, selectedName;
function loadRolePermissions(id){
//        localStorage.setItem("selectedRole", id);
    selectedRole = id;
    let roleP = {}; let name;
    roleP = $.grep(glob, function(e){return e.id === id;});
    $.each(roleP, function(k, v){
        name = v.role_name;
    });
    $('#selectedName').html('- '+name);
    let readCheck; let writeCheck; let reads = {}; let writes = {}; let r = 0; let w = 0;
   loadModules(function(){
       $.ajax({
           type: "GET",
           url: "/permissions/"+id+"/",
           data: '{}',
           success: function (response) {
               if (!(JSON.parse(response).length === 0)){
                   $.each(JSON.parse(response), function(key, val){
                       reads[r++] = [val.module_id, val.read_only];
                       writes[w++] = [val.module_id, val.editable];
                   });
                   $.each(reads, function(key, val){
                       let id = '#'+val[0]; //console.log(id);
                       if (parseInt(val[1]) === 1){
                           $(id).prop('checked', true);
                       }
                   });

                   $.each(writes, function(key, val){
                       let id = '#'+val[0]+'-write'; //console.log(id);
                       if (parseInt(val[1]) === 1){
                           $(id).prop('checked', true);
                       }
                   });
               }
               else{
                   // $("#module-table").dataTable().fnClearTable();
                   selectedName = '- '+name;
               }
           }
       });
   });
}

let mods;

function loadModules(callback){
    $('#selectedName').html(selectedName);
    $.ajax({
        type: "GET",
        url: "/modules/",
        data: '{}',
        success: function (response) {
            $('#module-table').dataTable().fnClearTable();
            modules = JSON.parse(response);
            let write;
            mods = JSON.parse(response); //console.log(mods);
            $.each(JSON.parse(response), function (key, val) {
                var action = '<input type="checkbox" id="'+val.id+'" di="'+val.id+'" class="ace RosaCheck" parent="'+val.main_menu+'">';
                if (val.menu_name == 'Others' || val.menu_name == 'Main Menu'){
                    write = '<input type="checkbox" id="'+val.id+'-write" di="'+val.id+'" class="WriteCheck" parent="'+val.main_menu+'" disabled="disabled">';
                }else{
                    var write = '<input type="checkbox" id="'+val.id+'-write" di="'+val.id+'" class="WriteCheck" parent="'+val.main_menu+'">';
                }
                $('#module-table').dataTable().fnAddData( [
                    val.name, val.menu_name, action, write
                ]);
            });
            callback();
        }
    });
}

let results;

function formatDate(timestamp) {
    timestamp = parseInt(timestamp);
    let date =  new Date(timestamp);
    return date.toLocaleString();
}

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

function validate(){
    if ($('#role').val() == "" || $('#role').val() == null){
        swal('Empty field!', 'Please type in a valid role', 'warning');
//            $('#role-error').html("Enter a valid role name");
//            $('#role-error').css("color", "red");
//            $('#submit-error').css("color", "red");
//            $('#submit-error').html("Unable to submit. Check information entered.");
    }else{
        saveNewRole();
    }
}

function saveNewRole(){
    var obj = {};
    obj.role = $('#role').val();
    var test={};
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
                swal("Role already exists!");
            }
            else if(test.status == 500){
                $('#role').val("");
                swal("Please recheck entered values!");
            }
            else
            {$('#role').val(""); swal("New Role Registered!"); getRoles();}
        }
    });
}