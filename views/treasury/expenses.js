$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    getExpenses();
});

$("#submit-expense").click(function () {
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
    if ($('#expense_name').val() == "" || $('#expense_name').val() == null || $('#amount').val() == "" || $('#amount').val() == null || $('#date_of_spend').val() == "" || $('#date_of_spend').val() == null) {
        return swal('Empty field(s)!', 'Description and Minimum Days Fields are required.', 'warning');
    } else {
        saveNewExpense();
    }
}

function saveNewExpense(){
    var obj = {};
    obj.expense_name = $('#expense_name').val();
    obj.amount = $('#amount').val()
    obj.date_of_spend = $('#date_of_spend').val();
    var test={};
    $.ajax({
        'url': '/user/new-expense/',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.message){
                $('#description').val("");
                return swal("Unable to Complete","An expense with this name already exists!","error");
            }
            else if(test.status == 500){
                $('#description').val("");
                swal("Failed","Unable to save new expense. Please Try Again!","error");
            }
            else
            {$('#expense_name').val(""); $('#amount').val(""); $('#date_of_spend').val(""); swal("Success","New Expense Created!","success"); getExpenses();}
        }
    });
}

var myTable = $('#expense-table')
    .DataTable({
        bAutoWidth: false,
        "aoColumns": [
            { "bSortable": true }, { "bSortable": true }, null, null
            //null, null, null, { "bSortable": false },
        ],
        "aaSorting": [],
        "bSearchable": true,
        select: {
            style: 'multi'
        }
    });

const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NGN'
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

function edit(role, name){
    $('#selectedName').html(': '+name);
}

let glob={};

function getExpenses(){
    $.ajax({
        type: "GET",
        url: "/user/expenses/",
        data: '{}',
        success: function (response) {
            glob = JSON.parse(response);
            $("#role-table").dataTable().fnClearTable();
            $.each(JSON.parse(response), function (key, val) {
                let actions, max_days;
                if (val.status === "1"){
                    var disable = '<button name="'+val.id+'" onclick="confirm('+val.id+')" class="write btn btn-danger "><i class="fa fa-trash"></i> Disable Expense</button>'
                }
                else {
                    var disable = '<button name="'+val.id+'" onclick="confirmEnable('+val.id+')" class="write btn btn-success "><i class="fa fa-lightbulb-o"></i> Enable Expense</button>'
                }
                $('#expense-table').dataTable().fnAddData( [
                    val.expense_name,
                    formatter.format(val.amount),
                    date_of_spend,
                    disable
                ]);
            });
        }
    });
}

function confirm(id) {
    // approveInspection(status, "Passed");
    swal({
        title: "Disable this expense?",
        text: "Click OK to continue",
        //icon: "input",
        //content: "input",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                disableExpense(id);
            }
        });
}

function disableExpense(id){
    var test = {};
    $.ajax({
        'url': '/user/del-expense/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Failed!", 'Unable to submit request.', 'error');
            }
            else{
                swal("Expense Disabled Successfully!", '', 'success');
                getExpenses();
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
        title: "Re-enable this Expense?",
        text: "Click OK to continue",
        //icon: "input",
        //content: "input",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                enableExpense(id);
            }
        });
}

function enableExpense(id){
    var test = {};
    $.ajax({
        'url': '/user/en-expense/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Failed!", 'Unable to submit request', 'error');
            }
            else{
                swal("Expense Re - Enabled Successfully!", '', 'success');
                getExpenses();
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