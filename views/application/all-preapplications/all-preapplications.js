let table = {},
    $wait = $('#wait');
$(document).ready(function () {
    bindDataTable();
});

function bindDataTable() {
    table = $('#preapplications').DataTable({
        dom: 'Blfrtip',
        bProcessing: true,
        bServerSide: true,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [
                {
                    name: 'ID',
                    query: `ORDER BY ID ${aoData[2].value[0].dir}`
                },
                {
                    name: 'fullname',
                    query: `ORDER BY fullname ${aoData[2].value[0].dir}`
                },
                {
                    name: 'phone',
                    query: `ORDER BY phone ${aoData[2].value[0].dir}`
                },
                {
                    name: 'loan_amount',
                    query: `ORDER BY loan_amount ${aoData[2].value[0].dir}`
                },
                {
                    name: 'product',
                    query: `ORDER BY product ${aoData[2].value[0].dir}`
                },
                {
                    name: 'status',
                    query: `ORDER BY status ${aoData[2].value[0].dir}`
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
                url: `/preapplication/get`,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    $wait.hide();
                    fnCallback(data)
                }
            });
        },
        aaSorting: [
            [0, 'desc']
        ],
        aoColumnDefs: [
            {
                sClass: "numericCol",
                aTargets: [2,3],
                sType: "numeric"
            }
        ],
        columns: [
            {
                data: "ID",
                width: "2%"
            },
            {
                data: "fullname",
                width: "33%"
            },
            {
                data: "phone",
                width: "10%",
                className: "text-right"
            },
            {
                width: "15%",
                className: "text-right",
                mRender: function (data, type, full) {
                    if (full.loan_amount)
                        return numberToCurrencyformatter(full.loan_amount.round(2));
                    return '--';
                }
            },
            {
                data: "product",
                width: "10%"
            },
            {
                width: "10%",
                className: "text-right",
                mRender: function (data, type, full) {
                    switch (full.status){
                        case 1: {
                            return '<span class="badge badge-primary">Pending Approval</span>'
                        }
                        case 2: {
                            return '<span class="badge badge-success">Approved</span>'
                        }
                    }
                }
            },
            {
                data: "date_created",
                width: "20%"
            },
            {
                width: "10%",
                mRender: function (data, type, full) {
                     return `<a class="btn btn-info btn-sm" href="/add-application?id=${full.ID}">View <i class="fa fa-eye"></i></a>`;
                }
            }
        ]
    });
}

$(document).ready(function () {});