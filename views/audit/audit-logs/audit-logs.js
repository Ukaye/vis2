let table = {},
    $wait = $('#wait');
$(document).ready(function () {
    getCollections();
    getInvestments();
});

function getCollections() {
    table = $('#collections').DataTable({
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
                url: `/audit/get/collections`,
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
                width: "20%",
                className: "text-right",
                mRender: function (data, type, full) {
                    if (full.loanID)
                        return padWithZeroes(full.loanID, 9);
                    return '--';
                }
            },
            {
                data: "date_created",
                width: "20%"
            },
            {
                width: "10%",
                mRender: function (data, type, full) {
                     return `<a class="btn btn-success btn-sm" onclick="confirm(${full.ID})">
                                Confirm <i class="fa fa-check"></i></a>`;
                }
            }
        ]
    });
}

function getInvestments() {
    table = $('#investments').DataTable({
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
                data: "date_created",
                width: "20%"
            },
            {
                width: "10%",
                mRender: function (data, type, full) {
                     return `<a class="btn btn-success btn-sm" onclick="confirm(${full.ID})">
                                Confirm <i class="fa fa-check"></i></a>`;
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
            window.location.reload();
        },
        'error': function (err) {
            $wait.hide();
            notification('Oops! An error occurred while confirming audit','','error');
        }
    });
}