$(document).ready(function() {
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

$("#amount").on("keyup", function () {
    $("#amount").val(numberToCurrencyformatter($(this).val()));
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
    obj.amount = currencyToNumberformatter($('#amount').val());
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
        ],
        "aaSorting": [],
        "bSearchable": true,
        select: {
            style: 'multi'
        }
    });

let glob={};

function getExpenses(){
    $('#expense-table').dataTable().fnClearTable();
    $.ajax({
        type: "GET",
        url: "/user/expenses/",
        success: function (response) {
            glob = JSON.parse(response);
            $("#role-table").dataTable().fnClearTable();
            $.each(JSON.parse(response), function (key, val) {
                let actions, max_days;
                if (val.status === "1"){
                    var disable = '<button name="'+val.id+'" onclick="confirm('+val.id+')" class="write btn btn-danger "><i class="fa fa-trash"></i> Disable</button>'
                }
                else {
                    var disable = '<button name="'+val.id+'" onclick="confirmEnable('+val.id+')" class="write btn btn-success "><i class="fa fa-lightbulb-o"></i> Enable</button>'
                }
                $('#expense-table').dataTable().fnAddData( [
                    val.expense_name,
                    `₦${numberToCurrencyformatter(val.amount)}`,
                    val.date_of_spend,
                    disable
                ]);
            });
        }
    });
}

function confirm(id) {
    swal({
        title: "Disable this expense?",
        text: "Click OK to continue",
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
    swal({
        title: "Re-enable this Expense?",
        text: "Click OK to continue",
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