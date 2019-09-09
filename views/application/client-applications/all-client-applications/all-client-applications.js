let table = {},
    $wait = $('#wait');
$(document).ready(function () {
    bindDataTable();
});

function bindDataTable() {
    table = $('#client_applications').DataTable({
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
                url: `/client/applications/get`,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    $wait.hide();
                    fnCallback(data.response)
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
                width: "10%",
                className: "text-right",
                mRender: function (data, type, full) {
                    switch (full.status){
                        case 1: {
                            return '<span class="badge badge-primary">Pending Review</span>'
                        }
                        case 2: {
                            return '<span class="badge badge-success">Application Reviewed</span>'
                        }
                        case 4: {
                            return '<span class="badge badge-info">Client Accepted</span>'
                        }
                        case 5: {
                            return '<span class="badge badge-danger">Client Declined</span>'
                        }
                    }
                }
            },
            {
                data: "date_created",
                width: "30%"
            },
            {
                width: "10%",
                mRender: function (data, type, full) {
                     return `<a class="btn btn-info btn-sm" href="/view-client-application?id=${full.ID}&&type=${full.client_type || 'non_corporate'}">
                                View <i class="fa fa-eye"></i></a>`;
                }
            }
        ]
    });
}

$(document).ready(function () {});