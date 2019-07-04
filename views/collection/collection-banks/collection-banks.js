$(document).ready(function () {
    getBanks();
});

$('#account').on('keyup', function () {
    $('#account').val(integerFormat($(this).val()));
});

let banks;

function getBanks(){
    $.ajax({
        type: 'GET',
        url: '/user/banks',
        success: function (response) {
            banks = response;
            $.each(response, function (key, val) {
                $('#bank').append(`<option value="${val.code}">${val.name}</option>`);
            });
            getCollectionBanks();
        }
    });
}

function getCollectionBanks(){
    $.ajax({
        'url': '/collection/collection_bank',
        'type': 'get',
        'success': function (data) {
            populateCollectionBanks(data.response);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function addCollectionBank() {
    let payload = {};
    payload.account = $('#account').val();
    payload.bank = $('#bank').val();
    if (!payload.account || payload.bank === 'Select Bank')
        return notification('Kindly fill all required field(s)','','warning');
    payload.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;
    $('#wait').show();
    $.ajax({
        'url': '/collection/collection_bank',
        'type': 'post',
        'data': payload,
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification(response.error, "", "error");
            } else{
                $('#account').val('');
                $('#bank').val('Select Bank');
                notification("Collection bank added successfully!", "", "success");
                populateCollectionBanks(response.response);
            }
        }
    });
}

function populateCollectionBanks(data){
    let $table = $("#collection_banks");
    $table.DataTable().clear();
    let tableData = [];
    $.each(data, function(k, v){
        v.bank = ($.grep(banks, function (e) { return e.code === v.bank }))[0]['name'];
        v.actions = '<button type="button" class="btn btn-danger" onclick="removeCollectionBank('+v.ID+')"><i class="fa fa-remove"></i></button>';
        tableData.push(v);
    });
    $table.DataTable({
        dom: 'Bfrtip',
        bDestroy: true,
        data: tableData,
        buttons: [],
        columns: [
            { data: "account" },
            { data: "bank" },
            { data: "actions" }
        ]
    });
}

function removeCollectionBank(id) {
    $('#wait').show();
    $.ajax({
        'url': '/collection/collection_bank/'+id,
        'type': 'delete',
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification("No internet connection", "", "error");
            } else{
                notification("Collection bank deleted successfully!", "", "success");
                populateCollectionBanks(response.response);
            }
        }
    });
}