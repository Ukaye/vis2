let $wait = $('#wait'),
    table_collections = {},
    table_investments = {},
    url = '/audit/get/collections?';
$(document).ready(function () {
    getCollections();
    getInvestments();
});

function getCollections() {
    table_collections = $('#collections').DataTable({
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
                    name: 'bank',
                    query: `ORDER BY bank ${aoData[2].value[0].dir}`
                },
                {
                    name: 'payment_date',
                    query: `ORDER BY payment_date ${aoData[2].value[0].dir}`
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
            [6, 'desc']
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
                    return payment.join(',<br>');
                }
            },
            {
                width: "20%",
                mRender: function (data, type, full) {
                    return `<a href="/client-info?id=${full.clientID}">${full.client}</a>`;
                }
            },
            {
                data: "type",
                width: "5%"
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
                width: "15%",
                mRender: function (data, type, full) {
                    return full.bank || '--';
                }
            },
            {
                width: "15%",
                mRender: function (data, type, full) {
                    if (full.payment_date) return moment(new Date(full.payment_date)).format('LLLL');
                    return '--';
                }
            },
            {
                width: "5%",
                mRender: function (data, type, full) {
                    return (full.status === 1)? `<a class="btn btn-success btn-sm" onclick="confirm(${full.ID})">
                               Confirm <i class="fa fa-check"></i></a>` : '';
                }
            }
        ]
    });
}

function getInvestments() {
    table_investments = $('#investments').DataTable({
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
                    name: 'client',
                    query: `ORDER BY client ${aoData[2].value[0].dir}`
                },
                {
                    name: 'type',
                    query: `ORDER BY type ${aoData[2].value[0].dir}`
                },
                {
                    name: 'account_no',
                    query: `ORDER BY account_no ${aoData[2].value[0].dir}`
                },
                {
                    name: 'payment_date',
                    query: `ORDER BY payment_date ${aoData[2].value[0].dir}`
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
                url: `/audit/get/investments`,
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
            [4, 'desc']
        ],
        aoColumnDefs: [
            {
                sClass: "numericCol",
                aTargets: [0],
                sType: "numeric"
            }
        ],
        columns: [
            {
                width: "15%",
                className: "text-right",
                mRender: function (data, type, full) {
                    if (full.amount)
                        return numberToCurrencyformatter(full.amount.round(2));
                    return '--';
                }
            },
            {
                data: "client",
                width: "30%"
            },
            {
                data: "type",
                width: "15%"
            },
            {
                data: "account_no",
                width: "20%",
                className: "text-right"
            },
            {
                data: "payment_date",
                width: "20%"
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
        'url': `/audit/confirm/${id}`,
        'type': 'post',
        'data': {
            approved_by: JSON.parse(localStorage.user_obj).ID
        },
        'success': function (data) {
            $wait.hide();
            notification('Audit confirmed successfully', '', 'success');
            return table_collections.ajax.reload(null, false);
        },
        'error': function (err) {
            $wait.hide();
            notification('Oops! An error occurred while confirming audit','','error');
        }
    });
}

$("#filter").submit(function (e) {
    e.preventDefault();
    let end = $("#endDate").val(),
        start = $("#startDate").val(),
        type = $("#type-filter").val();
    if (!start || !end) return table_collections.ajax.reload(null, false);
    url = '/audit/get/collections?';
    url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    if (type) url = url.concat(`&type=${type}`);
    return table_collections.ajax.reload(null, false);
});

function filterType() {
    let end = $("#endDate").val(),
        start = $("#startDate").val(),
        type = $("#type-filter").val();
    url = '/audit/get/collections?';
    if (start && end) url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    if (type) url = url.concat(`&type=${type}`);
    return table_collections.ajax.reload(null, false);
}