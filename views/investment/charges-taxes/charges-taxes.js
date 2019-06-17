$(document).ready(function () {
    bindDataTable();
    getSumTotalChargeTaxes();
});

function bindDataTable() {
    console.log('Am here');
    let table = $('#bootstrap-data-charges').DataTable({
        dom: 'Blfrtip3',
        destroy: true,
        bProcessing: true,
        bServerSide: true,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [{
                    name: "txn_date",
                    query: `ORDER BY ID DESC`
                },
                {
                    name: "txn_date",
                    query: `ORDER BY ID ${aoData[2].value[0].dir}`
                },
                {
                    name: "ref_no",
                    query: `ORDER BY ref_no ${aoData[2].value[0].dir}`
                },
                {
                    name: "description",
                    query: `ORDER BY description ${aoData[2].value[0].dir}`
                },
                {
                    name: "amount",
                    query: `ORDER BY amount ${aoData[2].value[0].dir}`
                }, {
                    name: "amount",
                    query: `ORDER BY amount ${aoData[2].value[0].dir}`
                }
            ];
            $.ajax({
                dataType: 'json',
                type: "GET",
                url: `/investment-txns/get-organisation-taxes`,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    console.log(data.data);
                    if (data.data.length > 0) {

                    }
                    fnCallback(data)
                }
            });
        },
        aoColumnDefs: [],
        columns: [{
                width: "auto",
                "mRender": function (data, type, full) {
                    return `<span class="badge badge-pill ${(full.isApproved===1)?'badge-primary':'badge-danger'}">${(full.isApproved===1)?'Approved':'Pending Approval'}</span>`;
                }
            },
            {
                width: "auto",
                data: "txn_date"
            },
            {
                data: "ref_no",
                width: "auto"
            },
            {
                data: "description",
                width: "auto"
            },
            {
                width: "auto",
                "mRender": function (data, type, full) {
                    let _amount = full.amount.split(',').join('');
                    return `<span style="color:green">${(full.is_credit === 1) ? 
                        (formater(_amount).includes('.')?formater(_amount): formater(_amount)+'.00') : ""}</span>`;
                }
            }, {
                width: "auto",
                "mRender": function (data, type, full) {
                    return `<span style="color:red;float: right">${(full.is_credit === 0) ? 
                        (formater(full.amount.split(',').join('')).includes('.')?formater(full.amount.split(',').join('')):
                        formater(full.amount.split(',').join(''))+'.00') : ""}</span>`;
                }
            }

        ]
    });
}

function getSumTotalChargeTaxes() {
    $.ajax({
        type: "GET",
        url: "/investment-txns/get-sum-charges",
        data: '{}',
        success: function (response) {
            console.log(response);
            $("#idChargeTotal").html(formater(response.chargeTotal.toString()));
            $("#idVatTotal").html(formater(response.vatTotal.toString()));

            $("#idWithHoldingTax").html(formater(response.withHoldingTaxTotal.toString()));
            let balance = response.vatTotal + response.withHoldingTaxTotal + response.chargeTotal;
            $("#idTotalBalance").html(formater(balance.toString()));
        }
    });
}