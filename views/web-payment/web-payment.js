let table = {},
    $wait = $('#wait'),
    url = '/payment/get/web?';
$(document).ready(function () {
    getWebPayments();
});

function getWebPayments() {
    table = $('#web_payments').DataTable({
        dom: 'Blfrtip',
        bProcessing: true,
        bServerSide: true,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [
                {
                    name: 'amount',
                    query: `ORDER BY amount ${aoData[2].value[0].dir}`
                },
                {
                    name: 'amount',
                    query: `ORDER BY amount ${aoData[2].value[0].dir}`
                },
                {
                    name: 'client',
                    query: `ORDER BY client ${aoData[2].value[0].dir}`
                },
                {
                    name: 'type',
                    query: `ORDER BY type ${aoData[2].value[0].dir}`
                },
                {
                    name: 'loanID',
                    query: `ORDER BY loanID ${aoData[2].value[0].dir}`
                },
                {
                    name: 'date_created',
                    query: `ORDER BY date_created ${aoData[2].value[0].dir}`
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
            [5, 'desc']
        ],
        aoColumnDefs: [
            {
                sClass: "numericCol",
                aTargets: [0, 1],
                sType: "numeric"
            }
        ],
        columns: [
            {
                width: "10%",
                className: "text-right",
                mRender: function (data, type, full) {
                    if (full.amount)
                        return numberToCurrencyformatter(full.amount.round(2));
                    return '--';
                }
            },
            {
                width: "20%",
                className: "text-right",
                mRender: function (data, type, full) {
                    let payment = [];
                    if (full.interest_amount > 0)
                        payment.push(`Interest - ${numberToCurrencyformatter(full.interest_amount.round(2))}`);
                    if (full.principal_amount > 0)
                        payment.push(`Principal - ${numberToCurrencyformatter(full.principal_amount.round(2))}`);
                    if (full.escrow_amount > 0)
                        payment.push(`Overpayment - ${numberToCurrencyformatter(full.escrow_amount.round(2))}`);
                    return payment.join(',\n');
                }
            },
            {
                width: "30%",
                mRender: function (data, type, full) {
                    return `<a href="/client-info?id=${full.clientID}">${full.client}</a>`;
                }
            },
            {
                data: "type",
                width: "10%"
            },
            {
                width: "10%",
                className: "text-right",
                mRender: function (data, type, full) {
                    if (full.loanID)
                        return `<a href="/application?id=${full.loanID}">${padWithZeroes(full.loanID, 9)}</a>`;
                    return '--';
                }
            },
            {
                width: "20%",
                mRender: function (data, type, full) {
                    return moment(new Date(full.date_created)).format('LLLL');;
                }
            },
            {
                width: "10%",
                mRender: function (data, type, full) {
                    return (full.status === 1)? `<a class="btn btn-success btn-sm" onclick="confirm(${full.ID})">
                               Confirm <i class="fa fa-check"></i></a>` : '';
                }
            }
        ]
    });
}

function confirm(id) {
    $wait.show();
    $.ajax({
        'url': `/payment/confirm/${id}`,
        'type': 'post',
        'data': {
            approved_by: JSON.parse(localStorage.user_obj).ID
        },
        'success': function (data) {
            $wait.hide();
            notification('Audit confirmed successfully', '', 'success');
            return table.ajax.reload(null, false);
        },
        'error': function (err) {
            $wait.hide();
            notification('Oops! An error occurred while confirming payment','','error');
        }
    });
}

$("#filter").submit(function (e) {
    e.preventDefault();
    let end = $("#endDate").val(),
        start = $("#startDate").val(),
        type = $("#type-filter").val();
    if (!start || !end) return table.ajax.reload(null, false);
    url = '/payment/get/web?';
    url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    if (type) url = url.concat(`&type=${type}`);
    return table.ajax.reload(null, false);
});

function filterType() {
    let end = $("#endDate").val(),
        start = $("#startDate").val(),
        type = $("#type-filter").val();
    url = '/payment/get/web?';
    if (start && end) url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    if (type) url = url.concat(`&type=${type}`);
    return table.ajax.reload(null, false);
}