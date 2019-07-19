$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    getClassifications();
});

$("#submit-classification").click(function () {
    validateFields();
});

$("#min-days").on("keyup", function () {
    let val = $("#min-days").val();
    $("#min-days").val(numbersOnly(val));
});

$(document).on('change', '#un-max', function() {
    ($(this).prop('checked')) ? $('#max-days').attr('disabled', 'disabled') : $('#max-days').attr('disabled', false);
});

$("#max-days").on("keyup", function () {
    let val = $("#max-days").val();
    $("#max-days").val(numbersOnly(val));
});

function validateFields(){
    if (!($('#un-max').prop('checked'))) {
        if ($('#description').val() == "" || $('#description').val() == null || $('#min-days').val() == "" || $('#min-days').val() == null || $('#max-days').val() == "" || $('#max-days').val() == null) {
            return swal('Empty field(s)!', 'All fields are required.', 'warning');
        } else {
            if (parseFloat($('#min-days').val()) > parseFloat($('#max-days').val())) {
                return swal('Disallowed', 'Minimum cannot be greater than Maximum.', 'warning');
            }
            saveNewClassification();
        }
    } else {
        if ($('#description').val() == "" || $('#description').val() == null || $('#min-days').val() == "" || $('#min-days').val() == null) {
            return swal('Empty field(s)!', 'Description and Minimum Days Fields are required.', 'warning');
        } else {
            saveNewClassification();
        }
    }
}

function saveNewClassification(){
    var obj = {};
    obj.description = $('#description').val();
    obj.min_days = numbersOnly($('#min-days').val());
    obj.max_days = ($('#un-max').prop('checked')) ? 0 : numbersOnly($('#max-days').val());
    obj.un_max = ($('#un-max').prop('checked')) ? 1 : 0;
    var test={};
    $.ajax({
        'url': '/user/new-classification-type/',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.message){
                $('#description').val("");
                return swal("Unable to Complete","A classification with this description already exists!","error");
            }
            else if(test.status == 500){
                $('#description').val("");
                swal("Failed","Unable to save new classification. Please Try Again!","error");
            }
            else
            {$('#description').val(""); $('#min-days').val(""); $('#max-days').val(""); swal("Success","New Loan Classification Registered!","success"); getClassifications();}
        }
    });
}

var myTable = $('#role-table')
    .DataTable({
        bAutoWidth: false,
        "aoColumns": [
            { "bSortable": true }, { "bSortable": true }, null, { "bSortable": false }
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

// function edit(role, name){
//     $('#selectedName').html(': '+name);
// }
let class_id;
function edit(id){
    class_id = id;
    $('#submit-classification').hide();
    $('#submit-edit').show();
    $.ajax({
        'url': '/user/class-dets/'+id,
        'type': 'get',
        'success': function (data) {
            $('#wait').hide();
            $('#description').val(data[0].description);
            numbersOnly($('#min-days').val(data[0].min_days));
            if (data[0].un_max === '1'){
                numbersOnly($('#max-days').val(''));
                $('#max-days').attr('disabled', 'disabled');
                $('#un-max').prop('checked', true);
            }
            else {
                $('#max-days').prop('checked', false);
                $('#max-days').attr('disabled', false);
                numbersOnly($('#max-days').val(data[0].max_days));
            }
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Oops! An error occurred while retrieving details.');
        }
    });
}

$("#submit-edit").click(function () {
    validateEdit(class_id);
});

function validateEdit(id){
    if (!($('#un-max').prop('checked'))) {
        if ($('#description').val() == "" || $('#description').val() == null || $('#min-days').val() == "" || $('#min-days').val() == null || $('#max-days').val() == "" || $('#max-days').val() == null) {
            return swal('Empty field(s)!', 'All fields are required.', 'warning');
        } else {
            if (parseFloat($('#min-days').val()) > parseFloat($('#max-days').val())) {
                return swal('Disallowed', 'Minimum cannot be greater than Maximum.', 'warning');
            }
            submitEditDetails(id);
        }
    } else {
        if ($('#description').val() == "" || $('#description').val() == null || $('#min-days').val() == "" || $('#min-days').val() == null) {
            return swal('Empty field(s)!', 'Description and Minimum Days Fields are required.', 'warning');
        } else {
            submitEditDetails(id);
        }
    }
}

function submitEditDetails(id){
    var obj = {};
    obj.description = $('#description').val();
    obj.min_days = numbersOnly($('#min-days').val());
    obj.max_days = ($('#un-max').prop('checked')) ? 0 : numbersOnly($('#max-days').val());
    obj.un_max = ($('#un-max').prop('checked')) ? 1 : 0;
    let test={};
    $.ajax({
        'url': '/user/edit-classification/'+id,
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.response === null){
                swal('Error!', "Action could not be completed! Please try again", 'error');
            }
            else{
                swal('Success!', "Loan Classification Updated!", 'success');
                $('#submit-classification').show();
                $('#submit-edit').hide();
                getClassifications();
            }
            window.location.href = "./loan-classification-settings";
        },
        'error': function (err) {
            swal('Error!', 'No Internet Connection.', 'error');
        }
    });
}

let glob={};

function getClassifications(){
    $.ajax({
        type: "GET",
        url: "/user/classification-types-full/",
        data: '{}',
        success: function (response) {
            glob = JSON.parse(response);
            $("#role-table").dataTable().fnClearTable();
            $.each(JSON.parse(response), function (key, val) {
                let actions, max_days;
                actions = '<button onclick="edit('+val.id+')" class="btn btn-primary"><i class="fa fa-pencil" width="80"></i></button>'
                if (val.status === "1"){
                    var disable = '<button name="'+val.id+'" onclick="confirm('+val.id+')" class="write btn btn-danger "><i class="fa fa-trash"></i> Disable Classification</button>'
                }
                else {
                    var disable = '<button name="'+val.id+'" onclick="confirmEnable('+val.id+')" class="write btn btn-success "><i class="fa fa-lightbulb-o"></i> Enable Classification</button>'
                }
                if (val.un_max === '1'){
                    max_days = 'Unlimited'
                }
                else {
                    max_days = val.max_days;
                }
                let buttons = disable + '&nbsp; &nbsp;' + actions;
                $('#role-table').dataTable().fnAddData( [
                    val.description,
                    val.min_days,
                    max_days,
                    buttons
                ]);
            });
        }
    });
}

function confirm(id) {
    // approveInspection(status, "Passed");
    swal({
        title: "Disable this classification?",
        text: "Click OK to continue",
        //icon: "input",
        //content: "input",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                disableClassification(id);
            }
        });
}

function disableClassification(id){
    var test = {};
    $.ajax({
        'url': '/user/del-class-type/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Failed!", 'Unable to submit request.', 'error');
            }
            else{
                swal("Loan Classification Disabled Successfully!", '', 'success');
                getClassifications();
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
        title: "Re-enable this Classification?",
        text: "Click OK to continue",
        //icon: "input",
        //content: "input",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                enableClassification(id);
            }
        });
}

function enableClassification(id){
    var test = {};
    $.ajax({
        'url': '/user/en-class-type/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Failed!", 'Unable to submit request', 'error');
            }
            else{
                swal("Loan Classification Re - Enabled Successfully!", '', 'success');
                getClassifications();
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