$(document).ready(function() {
    getRemitaLogs();
});

function getRemitaLogs() {
    $.ajax({
        type: 'get',
        url: `/remita/logs/get`,
        success: function (data) {
            if (data.status !== 500){
                populateDataTable(data);
            } else {
                console.log(data.error);
            }
        }
    });
}

$("#filter").submit(function (e) {
    e.preventDefault();
    let start = $("#startDate").val(),
        end = $("#endDate").val(),
        url = `/remita/logs/get?start=${processDate(start)}&&end=${processDate(end)}`;
    if (!start || !end)
        return notification('Kindly input both start date and end date', '', 'warning');

    $.ajax({
        url: url,
        type: 'get',
        success: function (data) {
            if (data.status !== 500){
                populateDataTable(data);
            } else {
                console.log(data.error);
            }
        }
    });
});

function populateDataTable(data) {
    $('#remita-logs').dataTable().fnClearTable();
    $.each(data.response, (k, v) => {
        let table = [
            v.client,
            `₦${numberToCurrencyformatter(v.totalAmount)}`,
            v.RRR || 'N/A',
            v.date_created,
            v.initiator,
            JSON.parse(v.response).status,
            `<a class="btn btn-primary btn-sm" href="/loan-repayment?id=${v.applicationID}">View Loan</a>
             <a class="btn btn-outline-info btn-sm" onclick="getRemitaStatus(${v.applicationID})">View Status</a>`
        ];
        $('#remita-logs').dataTable().fnAddData(table);
        $('#remita-logs').dataTable().fnSort([[3,'desc']]);
    });
}

function getRemitaStatus(id) {
    $('#wait').show();
    $.ajax({
        type: 'get',
        url: `/remita/payment/status/get/${id}`,
        success: function (data) {
            $('#wait').hide();
            alert(data.response || data.error);
        }
    });
}