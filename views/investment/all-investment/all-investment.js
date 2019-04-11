var table = {};
$(document).ready(function () {
    $('#bootstrap-data-table-export').DataTable();
    bindDataTable();
});

function padReferenceNo(value) {
    if (value.length < 8) {
        value = String('00000000' + value).slice(-8);
    }
    return value;
}

let _table = $('#bootstrap-data-table-export').DataTable();

function bindDataTable() {
    table = $('#bootstrap-data-table2').DataTable({
        dom: 'Blfrtip',
        bProcessing: true,
        bServerSide: true,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [{
                    name: "ID",
                    query: `ORDER BY ID desc`
                }, {
                    name: "client",
                    query: `ORDER BY client ${aoData[2].value[0].dir}`
                },
                {
                    name: "investment",
                    query: `ORDER BY investment ${aoData[2].value[0].dir}`
                },
                {
                    name: "amount",
                    query: `ORDER BY CAST(REPLACE(v.amount, ',', '') AS DECIMAL) ${aoData[2].value[0].dir}`
                },
                {
                    name: "investment_start_date",
                    query: `ORDER BY STR_TO_DATE(v.investment_start_date, '%Y-%m-%d') ${aoData[2].value[0].dir}`
                }, {
                    name: "investment_mature_date",
                    query: `ORDER BY STR_TO_DATE(v.investment_mature_date, '%Y-%m-%d') ${aoData[2].value[0].dir}`
                }, {
                    name: "status",
                    query: `ORDER BY v.status ${aoData[2].value[0].dir}`
                }
            ];
            $.ajax({
                dataType: 'json',
                type: "GET",
                url: `/investment-service/get-investments`,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    fnCallback(data)
                }
            });
        },
        aoColumnDefs: [{
            sClass: "numericCol",
            aTargets: [3],
            sType: "numeric"
        }],
        columns: [{
                width: "auto",
                "mRender": function (data, type, full) {
                    return full.code;
                }
            },
            {
                data: "client",
                width: "15%"
            },
            {
                data: "investment",
                width: "15%"
            },
            {
                data: "amount",
                width: "15%"
            },
            {
                data: "investment_start_date",
                width: "15%"
            }, {
                data: "investment_mature_date",
                width: "15%"
            },
            {
                width: "15%",
                "mRender": function (data, type, full) {
                    return `<a class="btn btn-info btn-sm" href="./investment-transactions?id=${full.ID}">View Transaction</a>`;
                }
            }
        ]
    });
}
$(document).ready(function () {});