let $wait = $('#wait'),
    table_paystack = {},
    url = '/paystack/logs/get?';
$(document).ready(() => {
    getPaystackLogs();
});

function getPaystackLogs() {
    table_paystack = $('#paystack-logs').DataTable({
        dom: 'Blfrtip',
        bProcessing: true,
        bServerSide: true,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [
                {
                    name: 'client',
                    query: `ORDER BY client ${aoData[2].value[0].dir}`
                },
                {
                    name: 'totalAmount',
                    query: `ORDER BY totalAmount ${aoData[2].value[0].dir}`
                },
                {
                    name: 'RRR',
                    query: `ORDER BY RRR ${aoData[2].value[0].dir}`
                },
                {
                    name: 'date_created',
                    query: `ORDER BY date_created ${aoData[2].value[0].dir}`
                },
                {
                    name: 'initiator',
                    query: `ORDER BY initiator ${aoData[2].value[0].dir}`
                },
                {
                    name: 'response',
                    query: `ORDER BY response ${aoData[2].value[0].dir}`
                },
                {
                    name: 'action',
                    query: `ORDER BY ID ${aoData[2].value[0].dir}`
                }
            ];
            $wait.show();
            $.ajax({
                dataType: 'json',
                type: "GET",
                url: url,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    $wait.hide();
                    fnCallback(data);
                }
            });
        },
        aaSorting: [
            [3, 'desc']
        ],
        aoColumnDefs: [
            {
                sClass: "numericCol",
                aTargets: [1],
                sType: "numeric"
            }
        ],
        columns: [
            {
                width: "20%",
                data: "client"
            },
            {
                width: "10%",
                className: "text-right",
                mRender: (data, type, full) => {
                    return `₦${numberToCurrencyformatter(full.totalAmount)}`;
                }
            },
            {
                width: "10%",
                mRender: (data, type, full) => {
                    return full.RRR || 'N/A';
                }
            },
            {
                width: "20%",
                mRender: function (data, type, full) {
                    if (full.date_created) return moment(new Date(full.date_created)).format('LLLL');
                    return '--';
                }
            },
            {
                width: "15%",
                mRender: (data, type, full) => {
                    return full.initiator;
                }
            },
            {
                width: "20%",
                mRender: function (data, type, full) {
                    return JSON.parse(full.response).status || 'N/A';
                }
            },
            {
                width: "5%",
                mRender: function (data, type, full) {
                    return `<a class="btn btn-primary btn-sm" href="/loan-repayment?id=${full.applicationID}">View Loan</a>
                    <a class="btn btn-outline-info btn-sm" onclick="getPaystackStatus(${full.ID})">View Status</a>`;
                }
            }
        ]
    });
}

$("#filter").submit(e => {
    e.preventDefault();
    let start = $("#startDate").val(),
        end = $("#endDate").val();
    if (!start || !end) return table_paystack.ajax.reload(null, false);
    url = '/paystack/logs/get?';
    url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    return table_paystack.ajax.reload(null, false);
});

function getPaystackStatus(id) {
    $('#wait').show();
    $.ajax({
        type: 'get',
        url: `/paystack/payment/status/get/${id}`,
        success: function (data) {
            $('#wait').hide();
            alert(data.response || data.error);
        }
    });
}
