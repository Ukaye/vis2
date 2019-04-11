$(document).ready(function () {
    $('#commissions').DataTable();
    getCommissions();
});

$(document).on("click", "#accelerator", function (e) {
    $('.accelerator').toggle();
});

$("#submit-commission").click(function () {
    let commission = {};
    commission.title = $('#commission-title').val();
    commission.type = $('#commission-type').val();
    commission.rate = $('#commission-rate').val();
    if (!commission.title || commission.type === '-- Select Type --' || !commission.rate)
        return notification('Kindly fill all required field(s)','','warning');
    if ($('#accelerator').is(':checked')){
        commission.accelerator = $('#accelerator-rate').val();
        commission.accelerator_type = $('#accelerator-type').val();
        if (!commission.accelerator || commission.accelerator_type === '-- Select Type --')
            return notification('Kindly fill all required field(s)','','warning');
        commission.accelerator = parseFloat(commission.accelerator);
    }
    commission.rate = parseFloat(commission.rate);
    $('#wait').show();
    $.ajax({
        'url': '/commissions',
        'type': 'post',
        'data': commission,
        'success': function (data) {
            $('#wait').hide();
            notification('Commission saved successfully','','success');
            window.location.reload();
        },
        'error': function (err) {
            $('#wait').hide();
            notification('Oops! An error occurred while saving commission','','error');
        }
    });
});

function getCommissions(){
    $.ajax({
        'url': '/commissions',
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
function populateDataTable(data) {
    console.log("populating data table...");
    $("#commissions").dataTable().fnClearTable();
    $.each(data, function(k, v){
        let table = [
            v.title,
            v.type,
            v.rate
        ];
        if (v.accelerator){
            table.push(v.accelerator+' ('+v.accelerator_type+')');
        } else {
            table.push('--');
        }
        $('#commissions').dataTable().fnAddData(table);
    });
}