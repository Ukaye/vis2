let results,
    table = {},
    loan_officer,
    $wait = $('#wait'),
    url = '/application/get?';
$(document).ready(function() {
    read_write_custom();
});

let applicationsList;
function read_write_custom() {
    let w,
        perms = JSON.parse(localStorage.getItem("permissions")),
        page = (window.location.pathname.split('/')[1].split('.'))[0];
    applicationsList = ($.grep(perms, function(e){return e.module_name === 'applicationsList';}))[0];
    perms.forEach(function (k){
        if (k.module_name === page)
            w = $.grep(perms, function(e){return e.id === parseInt(k.id);});
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1))
        $(".write").hide();

    if (!(applicationsList && applicationsList['read_only'] === '1'))
        loan_officer = JSON.parse(localStorage.user_obj).ID;
    loadApplications();
}


function loadApplications() {
    table = $('#applications').DataTable({
        dom: 'Blfrtip',
        bProcessing: true,
        bServerSide: true,
        buttons: [
            {
                extend: 'copy',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6]
                }
            },
            {
                extend: 'csv',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6]
                }
            }, 
            {
                extend: 'excel',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6]
                }
            },
            {
                extend: 'pdf',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6]
                }
            },
            {
                extend: 'print',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6]
                }
            }
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [
                {
                    name: 'ID',
                    query: `ORDER BY a.ID ${aoData[2].value[0].dir}`
                },
                {
                    name: 'loanCirrusID',
                    query: `ORDER BY a.loanCirrusID ${aoData[2].value[0].dir}`
                },
                {
                    name: 'fullname',
                    query: `ORDER BY u.fullname ${aoData[2].value[0].dir}`
                },
                {
                    name: 'loan_amount',
                    query: `ORDER BY a.loan_amount ${aoData[2].value[0].dir}`
                },
                {
                    name: 'date_created',
                    query: `ORDER BY a.date_created ${aoData[2].value[0].dir}`
                },
                {
                    name: 'action',
                    query: `ORDER BY a.ID ${aoData[2].value[0].dir}`
                }
            ];
            $wait.show();
            if (loan_officer) url = url.concat(`&loan_officer=${loan_officer}`);
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
                    results = data.data;
                }
            });
        },
        aaSorting: [
            [5, 'desc']
        ],
        aoColumnDefs: [
            {
                sClass: "numericCol",
                aTargets: [3],
                sType: "numeric"
            }
        ],
        columns: [
            {
                width: "10%",
                className: "text-right",
                mRender: function (data, type, full) {
                    return padWithZeroes(full.ID, 9);
                }
            },
            {
                width: "10%",
                mRender: function (data, type, full) {
                    return full.loanCirrusID || 'N/A';
                }
            },
            {
                width: "20%",
                mRender: function (data, type, full) {
                    return full.fullname || full.name;
                }
            },
            {
                width: "15%",
                className: "text-right",
                mRender: function (data, type, full) {
                    return numberToCurrencyformatter(full.loan_amount);
                }
            },
            {
                width: "5%",
                className: "text-right",
                mRender: function (data, type, full) {
                    return full.product || 'preapproved';
                }
            },
            {
                width: "10%",
                data: "date_created"
            },
            {
                width: "10%",
                mRender: function (data, type, full) {
                    let status = full.current_stage;
                    if (full.close_status === 0) {
                        if (full.status === 1){
                            switch (full.current_stage){
                                case 2: {
                                    status = '<span class="badge badge-info">Pending Approval</span>';
                                    break;
                                }
                                case 3: {
                                    status = '<span class="badge badge-info">Pending Disbursal</span>';
                                    break;
                                }
                                default: {
                                    status = '<span class="badge badge-primary">Started</span>';
                                }
                            }
                        } else if (full.status === 2){
                            status = '<span class="badge badge-success">Active</span>';
                        } else {
                            status = '<span class="badge badge-danger">Not Active</span>';
                        }
                    } else {
                        status = '<span class="badge badge-warning">Closed</span>';
                    }
                    if (full.reschedule_amount) {
                        status = status.concat('<span class="badge badge-pill badge-secondary">Rescheduled</span>');
                    } else {
                        if (full.reschedule_status === 1)
                            status = status.concat('<span class="badge badge-pill badge-secondary">Pending Reschedule</span>');
                    }
                    if (full.client_applications_status === 2 && full.information_request_status === 1 && full.status === 1)
                        status = status.concat('<span class="badge badge-pill badge-warning">More Info Required</span>');
                    if (full.client_applications_status === 3 && full.status === 1)
                        status = status.concat('<span class="badge badge-pill badge-warning">Pending Client <br> Acceptance</span>');
                    if (full.client_applications_status === 5 && full.status === 1)
                        status = status.concat('<span class="badge badge-pill badge-danger">Client Declined</span>');
                        
                    return status;
                }
            },
            {
                width: "10%",
                mRender: function (data, type, full) {
                     let action = `<div class="dropdown-container"><button type="button" class="btn btn-primary btn-sm dropdown-toggle" data-toggle="dropdown">
                                        More </button><div class="dropdown-menu">`;
                     action = action.concat(`<a class="dropdown-item" href="/client-info?id=${full.userID}"><i class="fa fa-eye"></i> View Client</a>`);
                     if (full.comment){
                        let view_comment_button = `<a class="dropdown-item" href="#" data-toggle="modal" data-target="#viewCommentModal" onclick="openViewCommentModal(${full.ID})"><i class="fa fa-eye"></i> View Comment</a>`;
                        action = action.concat(view_comment_button);
                    } else {
                        let add_comment_button = `<a class="dropdown-item write" href="#" data-toggle="modal" data-target="#addCommentModal" onclick="openAddCommentModal(${full.ID})"><i class="fa fa-plus"></i> Add Comment</a>`;
                        action = action.concat(add_comment_button);
                    }
                    if (full.workflowID){
                        let view_workflow_button;
                        if (full.status === 2){
                            view_workflow_button = `<a class="dropdown-item" href="#" data-toggle="modal" data-target="#viewWorkflowModal" onclick="openViewWorkflowModal(${full.ID})"><i class="fa fa-eye"></i> View Loan</a>`;
                        } else {
                            view_workflow_button = `<a class="dropdown-item" href="#" data-toggle="modal" data-target="#viewWorkflowModal" onclick="openViewWorkflowModal(${full.ID})"><i class="fa fa-eye"></i> View Application</a>`;
                        }
                        action = action.concat(view_workflow_button);
                    } else {
                        let add_workflow_button = `<a class="dropdown-item" href="#" data-toggle="modal" data-target="#addWorkflowModal" onclick="openAddWorkflowModal(${full.ID})"><i class="fa fa-plus"></i> Assign Loan Process</a>`;
                        action = action.concat(add_workflow_button);
                    }

                    action = action.concat('</div></div>');
                    return action;
                }
            }
        ]
    });
}

function openViewCommentModal(id) {
    localStorage.setItem("application_id",id);
    let data = ($.grep(results, function(e){ return e.ID === id; }))[0],
        tbody = $("#view_comment"),
        tr = "";
    tbody.empty();
    if (data.comment)
        tr += "<tr><td>Comment</td></tr><tr><td>"+data.comment+"</td></tr>";
    tbody.html(tr);
}

function openAddCommentModal(id) {
    localStorage.setItem("application_id",id);
}

function openViewWorkflowModal(id) {
    window.location.href = "/application?id="+id;
}

function openAddWorkflowModal(id) {
    localStorage.setItem("application_id",id);
}

function comment() {
    let $comment = $("#comment"),
        comment = $comment.val();
    if (!comment || comment === "")
        return notification('Kindly type a brief comment');
    $('#wait').show();
    $.ajax({
        'url': '/user/applications/comment/'+localStorage.getItem("application_id"),
        'type': 'post',
        'data': {comment: comment},
        'success': function (data) {
            $('#wait').hide();
            $comment.val("");
            notification('Comment saved successfully');
            window.location.reload();
        },
        'error': function (err) {
            $('#wait').hide();
            $comment.val("");
            notification('Oops! An error occurred while saving comment');
        }
    });
}

$("#filter").submit(function (e) {
    e.preventDefault();
    let end = $("#endDate").val(),
        start = $("#startDate").val(),
        type = $("#type-filter").val();
    if (!start || !end) return table.ajax.reload(null, false);
    url = '/application/get?';
    url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    if (type) url = url.concat(`&type=${type}`);
    return table.ajax.reload(null, false);
});

function filterType() {
    let end = $("#endDate").val(),
        start = $("#startDate").val(),
        type = $("#type-filter").val();
    url = '/application/get?';
    if (start && end) url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    if (type) url = url.concat(`&type=${type}`);
    return table.ajax.reload(null, false);
}