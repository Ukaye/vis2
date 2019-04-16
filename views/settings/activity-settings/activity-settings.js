$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    getRoles();
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
                $('#new-role').val("");
                swal("Activity type already exists!","","error");
            }
            else if(test.status == 500){
                $('#new-role').val("");
                swal("Please recheck entered values!","","error");
            }
            else
            {$('#new-role').val(""); swal("New Activity Type Registered!","","success"); getRoles();}
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

let role = localStorage.getItem("selectedRole");

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
        url: "/user/activity-types-full/",
        data: '{}',
        success: function (response) {
            // role.empty().append('<option selected="selected" id="0">-- Choose User Role --</option>');
            glob = JSON.parse(response);
            $("#role-table").dataTable().fnClearTable();
            $.each(JSON.parse(response), function (key, val) {
                let actions;
                if (val.status === "1"){
                    var action = '<a href="#" class="btn btn-info" onclick="loadRolePermissions('+val.id+')" name="'+val.role_name+'" title="Click to edit"><i class="ace-icon fa fa-pencil bigger-130"></i></a> &nbsp; &nbsp;'
                    var disable = '<button name="'+val.id+'" onclick="confirm('+val.id+')" class="write btn btn-danger "><i class="fa fa-trash"></i> Disable Activity</button>'
                }
                else {
                    var action = " ";
                    var disable = '<button name="'+val.id+'" onclick="confirmEnable('+val.id+')" class="write btn btn-success "><i class="fa fa-lightbulb-o"></i> Enable Activity</button>'
                }
                $('#role-table').dataTable().fnAddData( [
                    val.activity_name, disable
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
        title: "Disable this activity?",
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
        'url': '/user/del-act-type/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Failed!", 'Unable to submit request.', 'error');
            }
            else{
                swal("Activity Disabled Successfully!", '', 'success');
                getRoles();
            }
        },
        'error': function(e){
            swal('Error', 'Internet Connection Error!', 'error');
        }
    });
}

function confirmEnable(id) {
    // approveInspection(status, "Passed");
    swal({
        title: "Re-enable this Activity?",
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
        'url': '/user/en-act-type/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Failed!", 'Unable to submit request', 'error');
            }
            else{
                swal("Activity Enabled Successfully!", '', 'success');
                getRoles();
            }
        },
        'error': function(e){
            swal('Error', 'Internet Connection Error!', 'error');
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