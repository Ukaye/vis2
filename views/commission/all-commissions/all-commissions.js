$(document).ready(function() {
    $('#commissions-export').DataTable();
    $("#filter_type").select2();
    getCommissionList();
    getTargetList();
    getUserList();
    read_write_custom();
});

let commissionsList;
function read_write_custom(){
    let w,
        perms = JSON.parse(localStorage.getItem("permissions")),
        page = (window.location.pathname.split('/')[1].split('.'))[0],
        reversePayment = ($.grep(perms, function(e){return e.module_name === 'reversePayment';}))[0];
    commissionsList = ($.grep(perms, function(e){return e.module_name === 'commissionsList';}))[0];
    perms.forEach(function (k){
        if (k.module_name === page)
            w = $.grep(perms, function(e){return e.id === parseInt(k.id);});
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1))
        $(".write").hide();

    if (reversePayment && reversePayment['read_only'] === '0')
        $('.reversePayment').hide();

    if (commissionsList && commissionsList['read_only'] === '1'){
        getCommissions();
    } else {
        getCommissions((JSON.parse(localStorage.user_obj)).ID);
    }
}

let results;
function getCommissions(id){
    let uid = id || '';
    $.ajax({
        'url': '/user/commissions-list/'+uid,
        'type': 'GET',
        'success': function (data) {
            let commissions = data.response;
            results = commissions;
            populateDataTable(commissions);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

$('#filter_target_list').on('change', function() {
    let target_id = $("#filter_target_list").find("option:selected").val();
    getPeriods(target_id);
});

function getTargetList(){
    $.ajax({
        type: "GET",
        url: "/targets",
        success: function (data) {
            $.each(data.response, function (key, val) {
                $("#filter_target_list").append('<option value = "' + val.ID + '">' + val.title + '</option>');
            });
            $("#filter_target_list").select2();
        }
    });
}

function getCommissionList(){
    $.ajax({
        type: "GET",
        url: "/commissions",
        success: function (data) {
            $.each(data.response, function (key, val) {
                $("#filter_commission_list").append('<option value = "' + val.ID + '">' + val.title + '</option>');
            });
            $("#filter_commission_list").select2();
        }
    });
}

function getUserList(){
    $.ajax({
        type: "GET",
        url: "/user/users-list",
        success: function (data) {
            $.each(JSON.parse(data), function (key, val) {
                $("#filter_user_list").append('<option value = "' + val.ID + '">' + val.fullname + '</option>');
            });
            $("#filter_user_list").select2();
        }
    });
}

$("#filter_sub_period").html('<option selected="selected">Select Period</option>');
function getPeriods(id){
    if (id && id !== 'Select Target'){
        $('#wait').show();
        $.ajax({
            type: "GET",
            url: "/target/sub_periods/"+id,
            success: function (data) {
                $('#wait').hide();
                $("#filter_sub_period").prop('disabled',false);
                $("#filter_sub_period").html('<option selected="selected">Select Period</option>');
                $.each(data.response, function (key, val) {
                    $("#filter_sub_period").append('<option value = "' + val.ID + '">' + val.name + '</option>');
                });
                $("#filter_sub_period").select2();
            }
        });
    }
}

$("#filter").submit(function (e) {
    e.preventDefault();

    let id = '';
    if (!(commissionsList && commissionsList['read_only'] === '1'))
        id = (JSON.parse(localStorage.user_obj)).ID;

    let filter = {},
        url = '/user/commissions-list/'+id,
        filter_type = $("#filter_type").val(),
        filter_user_list = $("#filter_user_list").val(),
        filter_sub_period = $("#filter_sub_period").val(),
        filter_target_list = $("#filter_target_list").val(),
        filter_commission_list = $("#filter_commission_list").val();
    if (filter_type !== 'Select Type')
        filter.type = filter_type;
    if (filter_user_list !== 'Select User')
        filter.user = filter_user_list;
    if (filter_sub_period !== 'Select Period')
        filter.sub_period = filter_sub_period;
    if (filter_target_list !== 'Select Target')
        filter.target = filter_target_list;
    if (filter_commission_list !== 'Select Commission')
        filter.commission = filter_commission_list;
    if (!$.isEmptyObject(filter))
        url = url.concat('?'+$.param(filter));
    $.ajax({
        'url': url,
        'type': 'get',
        'success': function (data) {
            let commissions = data.response;
            results = commissions;
            populateDataTable(commissions);
        },
        'error': function (err) {
            console.log(err);
        }
    });
});

function populateDataTable(data) {
    console.log("populating data table...");
    $("#commissions").dataTable().fnClearTable();
    $.each(data, function(k, v){
        let table = [
            v.user,
            v.commission,
            '₦'+(parseFloat(v.value)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'),
            v.type,
            v.target,
            v.period,
            '<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#viewCommissionModal" ' +
            'onclick="openCommissionModal(\''+v.ID+','+v.userID+','+v.commissionID+','+v.targetID+','+v.value+','+v.type+ ','+v.rate+','+v.threshold+
            ','+v.target_value+','+v.accelerator+','+v.accelerator_type+','+v.accelerator_threshold+','+v.start+','+v.end+'\')">' +
            '<i class="fa fa-eye"></i> View Details</button>'
        ];
        $('#commissions').dataTable().fnAddData(table);
    });
}

let earnings;
function openCommissionModal(owner) {
    let values = owner.split(','),
        ID = values[0],
        userID = values[1],
        commissionID = values[2],
        targetID = values[3],
        paid = values[4],
        type = values[5],
        rate = values[6],
        threshold_rate = values[7],
        target_value = values[8],
        accelerator = values[9],
        accelerator_type = values[10],
        accelerator_threshold_rate = values[11],
        start = values[12],
        end = values[13];
    earnings = 0;
    $.ajax({
        type: "GET",
        url: "/user/committals/user/"+type+"/"+userID+"/"+targetID+"?start="+start+"&&end="+end,
        success: function (response) {
            $('#commission-paid').text('₦'+(parseFloat(paid)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
            let data = response.response;
            data.total = data.total || 0;
            let accelerator_threshold = (parseFloat(accelerator_threshold_rate)/100) * parseFloat(target_value),
                threshold = (parseFloat(threshold_rate)/100) * parseFloat(target_value),
                progress = (parseFloat(data.total)/parseFloat(target_value)) * 100;
            if (parseFloat(data.total) >= threshold){
                if ((accelerator !== 'null') &&
                    (accelerator_type !== 'null') &&
                    (accelerator_threshold_rate !== 'null') &&
                    (progress >= accelerator_threshold_rate)
                ) {
                    switch (accelerator_type) {
                        case 'all': {
                            earnings = (parseInt(accelerator)/100) * parseFloat(data.total);
                            break;
                        }
                        case 'additional': {
                            let excess = parseFloat(data.total) - accelerator_threshold,
                                earnings_ = (parseInt(rate)/100) * accelerator_threshold,
                                earnings_excess = (parseInt(accelerator)/100) * excess;
                            earnings = earnings_ + earnings_excess;
                            break;
                        }
                    }
                } else {
                    earnings = (parseInt(rate)/100) * parseFloat(data.total);
                }
            }
            processCommission(ID,earnings,paid);
        }
    });
}

let processed_commission;
function processCommission(id,earnings,paid) {
    processed_commission = 0;
    $.ajax({
        type: "GET",
        url: "/user/commission/processes/"+id,
        success: function (data) {
            let process_amount = 0;
            $("#process-history").dataTable().fnClearTable();
            $.each(data.response, function(k, v){
                let amount = parseFloat((parseFloat(v.amount)).toFixed(2));
                process_amount += amount;
            });
            if (process_amount !== 0)
                processed_commission = parseFloat(earnings) - parseFloat(paid) + process_amount;
            processed_commission = processed_commission.toFixed(2);
            $('#commission-processed').text('₦'+processed_commission.replace(/\d(?=(\d{3})+\.)/g, '$&,'));
        }
    });
}