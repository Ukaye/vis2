const urlParams = new URLSearchParams(window.location.search);
const application_id = urlParams.get('id');
var tableData = {};
$(document).ready(function () {
    loadApplications();
    loadInfo();
    loadActivities();
    bindInvestmentDataTable(application_id);
    getBanks();
});

var myTable = $('#vehicles-table')
    .DataTable({
        bAutoWidth: false,
        "aoColumns": [{
                "bSortable": true
            }, {
                "bSortable": false
            }
            //null, null, null, { "bSortable": false },
        ],
        "aaSorting": [],
        "bSearchable": false,
        select: {
            style: 'multi'
        }
    });

var myTable2 = $('#loan-table')
    .DataTable({
        bAutoWidth: true,
        "aoColumns": [{
                "bSortable": true
            },
            null, {
                "bSortable": false
            }, {
                "bSortable": false
            }
            // , null, { "bSortable": false },
        ],
        "aaSorting": [],
        "bFilter": true,
        "bSearchable": false,
        // "bInfo" : false,
        select: {
            style: 'multi'
        },
        "paging": true
    });

const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NGN'
});

function padWithZeroes(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function newApplication() {
    window.location.href = './add-application?id=' + application_id;
}

function editUser() {
    window.location.href = './all-clients?id=' + application_id;
}

function loadDetails() {
    $.ajax({
        'url': '/user/user-dets/' + application_id,
        'type': 'get',
        'data': {},
        'success': function (data) {
            $('#user-form').slideDown();
            $('#user-table').slideToggle();
            var fullname = data[0].fullname;
            $('#first_name').val(fullname.split(' ')[0]);
            $('#middle_name').val(fullname.split(' ')[1]);
            $('#last_name').val(fullname.split(' ')[2]);
            $('#phone').val(data[0].phone);
            $('#address').val(data[0].address);
            $('#email').val(data[0].email);
            $('#dob').val(data[0].dob);
            $('#gender').val(data[0].gender);
            $('#postcode').val(data[0].postcode);
            $('#client_country').val(data[0].client_country);
            $('#marital_status').val(data[0].marital_status);
            $('#loan_officer').val(data[0].loan_officer);
            $('#client_state').val(data[0].client_state);
            $('#years_add').val(data[0].years_add);
            $('#ownership').val(data[0].ownership);
            $('#employer_name').val(data[0].employer_name);
            $('#industry').val(data[0].industry);
            $('#job').val(data[0].job);
            $('#job_country').val(data[0].job_country);
            $('#off_address').val(data[0].off_address);
            $('#off_state').val(data[0].off_state);
            $('#doe').val(data[0].doe);
            $('#guarantor_name').val(data[0].guarantor_name);
            $('#guarantor_occupation').val(data[0].guarantor_occupation);
            $('#relationship').val(data[0].relationship);
            $('#years_known').val(data[0].years_known);
            $('#guarantor_phone').val(data[0].guarantor_phone);
            $('#guarantor_email').val(data[0].guarantor_email);
            $('#guarantor_address').val(data[0].guarantor_address);
            $('#gua_country').val(data[0].gua_country);

            // var applications = data.message;
            // results = applications;
            // populateDataTable(applications);
            // swal('Application archived successfully');
        },
        'error': function (err) {
            swal('Oops! An error occurred while retrieving details.');
        }
    });
}

let client_det;

function loadInfo() {
    $.ajax({
        'url': 'user/client-dets/' + application_id,
        'type': 'get',
        'data': {},
        'success': function (data) {
            //                var details = JSON.parse(data);
            client_det = data;
            populateCards(client_det);
        },
        'error': function (err) {
            //alert ('Error');
            console.log(err);
        }
    });
}

function populateCards(data) {

    let obj = data[0];
    if (obj.escrow)
        $('.escrow-balance').text(parseFloat(obj.escrow).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
    let folder = obj.fullname + '_' + obj.email;
    loadImages(obj.images_folder);
    // loadImages(obj.phone, obj.fullname);
    $('#fullname').html(obj.fullname);
    $('#phone').html(' ' + obj.phone);
    $('#email').html(' ' + obj.email);
    $('#client_id').html(padWithZeroes(obj.ID, 6));
    $('#loan_officer').html(obj.officer);
    $('#branch').html(obj.branchname);
    $('#total_loans').html(obj.total_loans === null ? formatter.format(0) : formatter.format(parseFloat(obj.total_loans)));
    $('#total_balance').html(obj.total_balance === null ? formatter.format(0) : formatter.format(parseFloat(obj.total_balance)));
    $('#total_interest').html(obj.total_interests === null ? formatter.format(0) : formatter.format(parseFloat(obj.total_interests)));
    let pbody = $("#personal");
    let ebody = $("#employment");
    let rbody = $("#reference"),
        tr = "";
    let te = "";
    let tp = "";
    pbody.empty();
    ebody.empty();
    rbody.empty();

    // Personal Info Card
    if (obj.fullname)
        tr += "<tr><td><strong>Fullname</strong></td><td>" + obj.fullname + "</td></tr>";
    if (obj.username)
        tr += "<tr><td><strong>Username</strong></td><td>" + obj.username + "</td></tr>";
    if (obj.email)
        tr += "<tr><td><strong>Email</strong></td><td>" + obj.email + "</td></tr>";
    if (obj.phone)
        tr += "<tr><td><strong>Phone</strong></td><td>" + obj.phone + "</td></tr>";
    if (obj.address)
        tr += "<tr><td><strong>Address</strong></td><td>" + obj.address + "</td></tr>";
    if (obj.date_created)
        tr += "<tr><td><strong>Date Created</strong></td><td>" + formatDate(obj.date_created) + "</td></tr>";
    pbody.html(tr);

    // Employment Info Card
    if (obj.job)
        te += "<tr><td><strong>Job Description</strong></td><td>" + obj.job + "</td></tr>";
    if (obj.employer_name)
        te += "<tr><td><strong>Employer</strong></td><td>" + obj.employer_name + "</td></tr>";
    if (obj.off_address)
        te += "<tr><td><strong>Office Address</strong></td><td>" + obj.off_address + "</td></tr>";
    if (obj.doe)
        te += "<tr><td><strong>Date of Employment</strong></td><td>" + obj.doe + "</td></tr>";
    ebody.html(te);

    // Reference Info Card
    if (obj.guarantor_name)
        tp += "<tr><td><strong>Reference Name</strong></td><td>" + obj.guarantor_name + "</td></tr>";
    if (obj.guarantor_occupation)
        tp += "<tr><td><strong>Occupation</strong></td><td>" + obj.guarantor_occupation + "</td></tr>";
    if (obj.relationship)
        tp += "<tr><td><strong>Relationship</strong></td><td>" + obj.relationship + "</td></tr>";
    if (obj.guarantor_phone)
        tp += "<tr><td><strong>Phone</strong></td><td>" + obj.guarantor_phone + "</td></tr>";
    if (obj.guarantor_email)
        tp += "<tr><td><strong>Email</strong></td><td>" + obj.guarantor_email + "</td></tr>";
    rbody.html(tp);
}

function loadApplications() {
    $.ajax({
        'url': 'user/user-applications/' + application_id,
        'type': 'get',
        'data': {},
        'success': function (data) {
            populateLoanTable(data);
        },
        'error': function (err) {
            //alert ('Error');
            console.log(err);
        }
    });
}

function loadActivities() {
    $.ajax({
        'url': 'user/client-activities?id=' + application_id,
        'type': 'get',
        'data': {},
        'success': function (data) {
            displayActivities(data);
        },
        'error': function (err) {
            //alert ('Error');
            console.log(err);
        }
    });
}

function displayActivities(data) {
    let $feed = $('#feed');
    $feed.html('');
    $.each(data, function (k, v) {
        $feed.append('<div id="feed' + v.ID + '" class="row">\n' +
            //                '    <div class="col-sm-1">\n' +
            //                '        <div class="thumbnail" style="border-radius: 50%; width: 100px; height: 100px; background: #9fcdff; text-align: center">' +
            //                '           <div id="name" style="display: inline-block; margin: 0 auto; padding-top: 20px"><h1>'+getInitials(v.user)+'</h1></div>'+
            //                '        </div>\n' +
            //                '    </div>\n' +
            '    <div class="col-sm-12" style="padding-left: 30px">\n' +
            '        <div class="panel panel-default col-sm-12" style="background: #e9ecef; padding-left: 10px; border-radius: 4px">\n' +
            '            <div class="panel-heading"><i class="fa fa-users"></i> Activity by <span class="text-muted">' + v.user + '</span></div>' +
            //            '               <button type="button" class="btn btn-outline-primary pull-right" onclick="viewActivity('+v.ID+')"><i class="fa fa-eye"></i> View More</button>\n' +
            '            <div class="panel-body">' + v.activity + ' ' +
            '               <i class="fa fa-user"></i><span> ' + v.client_name + '</span>&nbsp;|&nbsp;' +
            '               <i class="fa fa-phone"></i><span> ' + v.client_phone + '</span>&nbsp;|&nbsp;<i class="fa fa-envelope"></i><span> ' + v.client_email + '</span><br/>\n' +
            '            </div>\n' +
            '            <div class="panel-footer">' + v.activity_description + '<br/><span class="text-muted"><small>created on ' + v.date_created + '</small></span></div>\n' +
            //                '            <div class="input-group"><div class="input-group-addon"><i class="fa fa-comment"></i></div><input type="text" id="act'+v.ID+'" maxlength="250" class="form-control"/></div><button onclick="savecomment('+v.ID+')" class ="btn btn-info" style="float: right; border-radius: 4px" data-toggle="modal" data-target="#addCommentModal">Add Comment <i class="fa fa-comment"></i></button>'+
            '        </div>\n' +
            '    </div>\n' +
            '</div><br/>');
    });
}

function loadImages(folder) {
    var test = {};
    $.ajax({
        'url': '/profile-images/' + folder + '/',
        'type': 'get',
        'data': {},
        'success': function (data) {
            // $.each(data[0], function (key, val) {
            //     test[key] = val;
            // });
            let res = JSON.parse(data);
            if (res.status == 500) {
                //                    swal("No Profile Image Uploaded!");
                $('#pic').append('<img src="assets/default_user_logo.png" width="180" height="170"/>');
            } else {
                let image =
                    '<a href="#">' +
                    '<img src="' + res['response']['Image'] + '" alt="Profile Pic ' + name + '" style="max-width:100%;" height = 150 width = 150>' +
                    // '<div style = "background-image: url("'+res['response']['Image']+'"); max-width:100%;" height = 150 width = 150></div>'+
                    '</a>';
                $('#pic').append(image);
            }
        },
        'error': function (data) {

        }
    });

}

function populateLoanTable(dets) {
    if (dets.length === 0) {
        $("#loan-table").dataTable().fnClearTable();
    } else {
        jQuery.each(dets, function (k, v) {
            //alert(k);
            //alert(d1.toString('dd/mm/yyyy'));
            let stat;
            let view = ' <button type="button" class="btn btn-outline-primary" onclick="openViewWorkflowModal(' + v.ID + ')"><i class="fa fa-eye"></i> View Application</button>';
            if (v.close_status === 0) {
                if (v.status === 1) {
                    stat = '<span class="label label-primary" style="background-color:blue; color:white; padding: 5px; border-radius: 5px">Pending Approval</span>';
                } else if (v.status === 2) {
                    stat = '<span class="label label-success" style="background-color:green; color:white; padding: 5px; border-radius: 5px">Active</span>';
                    view = ' <button type="button" class="btn btn-outline-primary" onclick="openViewWorkflowModal(' + v.ID + ')"><i class="fa fa-eye"></i> View Loan</button>';
                } else {
                    stat = '<span class="label label-danger" style="background-color:red; color:white; padding: 5px; border-radius: 5px">Not Active</span>';
                }
            } else {
                stat = '<span class="label label-warning" style="background-color:orange; color:white; padding: 5px; border-radius: 5px">Closed</span>';
            }
            $("#loan-table").dataTable().fnAddData([formatter.format(v.loan_amount), (v.date_created), stat, view]);
        });
    }
}

function openViewWorkflowModal(id) {
    window.location.href = './application?id=' + id;
}

function formatDate(date) {
    let separator;
    if (date.indexOf('-') > -1) {
        separator = '-';
    } else if (date.indexOf('/') > -1) {
        separator = '/';
    } else {
        return date;
    }
    let date_array = date.split(separator);
    return date_array[0] + '-' + date_array[1] + '-' + date_array[2];
}

function escrowHistory() {
    $.ajax({
        'url': '/user/application/escrow-history/' + application_id,
        'type': 'get',
        'success': function (data) {
            $("#escrow-history").dataTable().fnClearTable();
            $.each(data.response, function (k, v) {
                let table = [
                    v.amount,
                    v.type,
                    v.date_created
                ];
                if (v.status === 0) {
                    table.push('Payment Reversed');
                } else if (v.status === 1) {
                    table.push('<button class="btn btn-danger" onclick="reverseEscrowPayment(' + v.ID + ')"><i class="fa fa-remove"></i> Reverse</button>');
                }
                $('#escrow-history').dataTable().fnAddData(table);
                $('#escrow-history').dataTable().fnSort([
                    [2, 'desc']
                ]);
            });
        },
        'error': function (err) {
            swal('No internet connection', '', 'error');
        }
    });
}

function bindInvestmentDataTable(id) {
    tableData = $('#investment-data-table').DataTable({
        dom: 'Blfrtip',
        bProcessing: true,
        bServerSide: true,
        buttons: [],
        fnServerData: function (sSource, aoData, fnCallback) {
            console.log(aoData);

            let tableHeaders = [{

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
                url: `/investment-service/get-investments/${id}`,
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
            aTargets: [1],
            sType: "numeric"
        }],
        columns: [{

                data: "investment",
                width: "auto"
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
                    return `<a class="btn btn-info btn-sm">View Form</a>`;
                }
            }
        ]
    });
}
function onViewWalletBalance() {
    let url = `./investment-transactions?clientId=${application_id}&clientName=${$('#fullname').html()}`;
    console.log(url);
    $(location).attr('href', url);
}

$("#cheque-no").on("keyup", function (event) {
    let val = $("#cheque-no").val();
    $("#cheque-no").val(integerFormat(val));
});

$("#cheque-account").on("keyup", function (event) {
    let val = $("#cheque-account").val();
    $("#cheque-account").val(integerFormat(val));
});

let banks,
    reasons;

function getBanks(){
    $.ajax({
        type: 'GET',
        url: '/user/banks',
        success: function (response) {
            banks = response;
            $.each(response, function (key, val) {
                $('#cheque-bank').append(`<option value="${val.code}">${val.name}</option>`);
            });
            getBadChequeReasons();
        }
    });
}

function getBadChequeReasons() {
    $.ajax({
        type: 'GET',
        url: '/settings/application/bad_cheque_reason',
        success: function (response) {
            reasons = response.response;
            $.each(response.response, function (key, val) {
                $('#cheque-reason').append(`<option value="${val.ID}">${val.title}</option>`);
            });
            getBadCheques();
        }
    });
}

function getBadCheques() {
    $.ajax({
        type: 'GET',
        url: '/client/bad_cheque',
        success: function (response) {
            populateBadChequeReasons(response.response);
        }
    });
}

$("#cheque-form").submit(function (e) {
    e.preventDefault();
    let cheque = {};
    cheque.name = $('#cheque-name').val();
    cheque.number = $('#cheque-no').val();
    cheque.bank = $('#cheque-bank').val();
    cheque.account = $('#cheque-account').val();
    cheque.reason = $('#cheque-reason').val();
    if (!cheque.name || !cheque.number || cheque.bank === 'Select Bank' || !cheque.account || cheque.reason === 'Select Reason')
        return notification('Kindly fill all required field(s)','','warning');
    cheque.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;

    $('#wait').show();
    $.ajax({
        'url': '/client/bad_cheque',
        'type': 'post',
        'data': cheque,
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                notification(response.error, "", "error");
            } else{
                $('#reason_bad_cheque').val('');
                notification("Bad cheque added successfully!", "", "success");
                populateBadChequeReasons(response.response);
            }
        }
    });
});

function populateBadChequeReasons(data){
    let $cheques = $("#bad-cheques");
    $cheques.DataTable().clear();
    let cheques = [];
    $.each(data, function(k, v){
        v.bank = ($.grep(banks, function (e) { return e.code === v.bank }))[0]['name'];
        v.reason = ($.grep(reasons, function (e) { return e.ID === v.reason }))[0]['title'];
        v.actions = '<button type="button" class="btn btn-danger" onclick="removeBadChequeReason('+v.ID+')"><i class="fa fa-remove"></i></button>';
        cheques.push(v);
    });
    $cheques.DataTable({
        dom: 'Bfrtip',
        bDestroy: true,
        data: cheques,
        buttons: [],
        columns: [
            { data: "name" },
            { data: "number" },
            { data: "bank" },
            { data: "account" },
            { data: "reason" },
            { data: "actions" }
        ]
    });
}

function removeBadChequeReason(id) {
    swal({
        title: "Are you sure?",
        text: "Once deleted, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                $('#wait').show();
                $.ajax({
                    'url': '/client/bad_cheque/'+id,
                    'type': 'delete',
                    'success': function (response) {
                        $('#wait').hide();
                        if(response.status === 500){
                            notification("No internet connection", "", "error");
                        } else{
                            notification("Bad cheque deleted successfully!", "", "success");
                            populateBadChequeReasons(response.response);
                        }
                    }
                });
            }
        });
}