let table = {},
    $wait = $('#wait');
$(document).ready(function () {
    bindDataTable();
});

function bindDataTable() {
    table = $('#preapproved-loans').DataTable({
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
                    name: 'credit_score',
                    query: `ORDER BY credit_score ${aoData[2].value[0].dir}`
                },
                {
                    name: 'loan_amount',
                    query: `ORDER BY loan_amount ${aoData[2].value[0].dir}`
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
                url: `/preapproved-loan/get`,
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
                width: "32%"
            },
            {
                data: "credit_score",
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
                    if (full.expiry_date){
                        let today = new Date(),
                            expiry = new Date(full.expiry_date);
                        if (expiry < today)
                            full.status = 4;
                    }
                    switch (full.status){
                        case 0: {
                            return `<span class="badge badge-danger">Rejected</span>`
                        }
                        case 1: {
                            return '<span class="badge badge-primary">Awaiting Acceptance</span>'
                        }
                        case 2: {
                            return '<span class="badge badge-success">Accepted</span>'
                        }
                        case 3: {
                            return '<span class="badge badge-danger">Declined</span>'
                        }
                        case 4: {
                            return '<span class="badge badge-secondary">Expired</span>'
                        }
                    }
                }
            },
            {
                data: "date_created",
                width: "15%"
            },
            {
                width: "18%",
                mRender: function (data, type, full) {
                    let actions = `<a class="btn btn-info btn-sm" href="/view-preapproved-loan?id=${full.ID}">View</a> `;
                    if (full.status === 2){
                        actions = actions.concat(`<a class="btn btn-success btn-sm" data-toggle="modal" data-target="#disburseModal" 
                                    onclick="openDisburseModal('${full.ID}-${full.applicationID}-${full.loan_amount}')">Disburse</a>`);
                    } else {
                        actions = actions.concat(`<a class="btn btn-danger btn-sm" onclick="deletePreapprovedLoan(${full.ID})">Delete</a>`);
                    }
                    return actions;
                }
            }
        ]
    });
}

let preapproved_loan;
function openDisburseModal(id) {
    let id_array = id.split('-');
    preapproved_loan = {
        ID: id_array[0],
        applicationID: id_array[1]
    };
    $('#disbursement-amount').val(numberToCurrencyformatter(id_array[2]));
}

function disburse() {
    let disbursal = {};
    disbursal.funding_source = $('#funding').val();
    disbursal.disbursement_channel = $('#channel').val();
    disbursal.disbursement_date = $('#disbursement-date')  .val();
    if (disbursal.funding_source === "-- Select a Funding Source --" || disbursal.disbursement_channel === "-- Select a Channel --" || !disbursal.disbursement_date)
        return notification('Kindly fill all required fields!','','warning');
    swal({
        title: "Are you sure?",
        text: "Once disbursed, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                $('#wait').show();
                $('#disburseModal').modal('hide');
                $.ajax({
                    'url': `/user/application/disburse/${preapproved_loan.applicationID}`,
                    'type': 'post',
                    'data': disbursal,
                    'success': function (data) {
                        $.ajax({
                            'url': `/preapproved-loan/delete/${preapproved_loan.ID}`,
                            'type': 'get',
                            'success': function (data) {
                                $('#wait').hide();
                                notification('Loan disbursed successfully','','success');
                                window.location.reload();
                            },
                            'error': function (err) {
                                console.log(err);
                                notification('No internet connection','','error');
                            }
                        });
                    },
                    'error': function (err) {
                        $('#wait').hide();
                        notification('Oops! An error occurred while disbursing loan','','error');
                    }
                });
            }
        });
}

function deletePreapprovedLoan(id) {
    swal({
        title: "Are you sure?",
        text: "Once deleted, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                $.ajax({
                    'url': `/preapproved-loan/delete/${id}`,
                    'type': 'get',
                    'success': function (data) {
                        notification('Loan deleted successfully','','success');
                        window.location.reload();
                    },
                    'error': function (err) {
                        console.log(err);
                        notification('No internet connection','','error');
                    }
                });
            }
        });
}

$(document).ready(function () {});