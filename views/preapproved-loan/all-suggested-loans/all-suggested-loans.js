$(document).ready(function () {
    bindDataTable();
});

function bindDataTable() {
    $.ajax({
        dataType: 'json',
        type: "GET",
        url: `/preapproved-loan/recommendations/get`,
        success: function (data) {
            $('#preapproved-loans').DataTable({
                dom: 'Blfrtip',
                bDestroy: true,
                data: data.data,
                order: [[ 1, "desc" ]],
                search: {search: ' '},
                buttons: [
                    'copy', 'csv', 'excel', 'pdf', 'print'
                ],
                aoColumnDefs: [
                    {
                        sClass: "numericCol",
                        aTargets: [1,2],
                        sType: "numeric"
                    }
                ],
                columns: [
                    {
                        data: "client",
                        width: "40%"
                    },
                    {
                        data: "credit_score",
                        width: "20%",
                        className: "text-right"
                    },
                    {
                        width: "20%",
                        className: "text-right",
                        mRender: function (data, type, full) {
                            return numberToCurrencyformatter(full.loan_amount.toFixed(2));
                        }
                    },
                    {
                        width: "20%",
                        mRender: function (data, type, full) {
                            return `<a class="btn btn-info btn-md" href="/edit-preapproved-loan?id=${full.userID}">Process</a>`;
                        }
                    }
                ]
            });
        }
    });
}
$(document).ready(function () {});