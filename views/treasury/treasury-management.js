const urlParams = new URLSearchParams(window.location.search);
const application_id = urlParams.get('id');
var tableData = {};
$(document).ready(function () {
    loadInvestments();
    // loadLoans();
    // loadPredictedDisbursements();
});

var myTable = $('#payouts-table')
    .DataTable({
        bAutoWidth: false,
        "aoColumns": [{
            "bSortable": true
        }, {
            "bSortable": false
        }, null, null
            //null, null, null, { "bSortable": false },
        ],
        "aaSorting": [],
        "bSearchable": false,
        select: {
            style: 'multi'
        }
    });

var myTable2 = $('#interests-table')
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

var myTable3 = $('#receivables-table')
    .DataTable({
        bAutoWidth: true,
        "aoColumns": [{
            "bSortable": true
        },
            null, {
                "bSortable": false
            }, {
                "bSortable": false
            }, null
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

$(document).on('click', '#agg-button', function(e){
    aggregate();
    $('#agg-reveal').slideDown();
});

$(document).on('click', '#payouts-button', function(e){
    loadPayouts($('#period').val());
    $('#payouts-div').show();
    $('#interests-div').hide();
    $('#receivables-div').hide();
});

$(document).on('click', '#interests-button', function(e){
    loadInterests($('#period').val());
    $('#payouts-div').hide();
    $('#interests-div').show();
    $('#receivables-div').hide();
});

$(document).on('click', '#receivables-button', function(e){
    loadReceivables($('#period').val());
    $('#payouts-div').hide();
    $('#interests-div').hide();
    $('#receivables-div').show();
});

$('#expenses').keyup(function () {
    let exp = parseFloat($('#expenses').val());
    let new_outs = total_outs + exp;
    $('#total_outs').html(formatter.format(new_outs));

});

function padWithZeroes(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function changePeriod(period){
    let p = period.value;
    reloadInvestments(p);
    // reloadLoans(p);
    // reloadPredictedDisbursements(p);
}

let payouts, interests, receivables, pred_disbursements, total_ins = 0, total_outs = 0;
function loadInvestments(){
    $.ajax({
        'url': '/user/investment-figures/' ,
        'type': 'get',
        'data': {},
        'success': function (data) {
            if (data.message){
                payouts = parseFloat(data.message.capital[0].amount);
                total_outs += payouts;
                interests = parseFloat(data.message.interests[0].amount);
                total_ins += interests;
                $('#payouts').html(formatter.format(data.message.capital[0].amount));
                $('#interests').html(formatter.format(data.message.interests[0].amount));
            }
            loadLoans();
        },
        'error': function (err) {
            swal('Oops! An error occurred while retrieving details.');
        }
    });
}

function loadLoans() {
    $.ajax({
        'url': '/user/loan-figures/' ,
        'type': 'get',
        'data': {},
        'success': function (data) {
            if (data.message){
                receivables = parseFloat(data.message.capital[0].due) === NaN ? 0 :parseFloat(data.message.capital[0].due);
                total_ins += receivables;
                $('#receivables').html(formatter.format(data.message.capital[0].due));
            }
            loadPredictedDisbursements();
        },
        'error': function (err) {
            swal('Oops! An error occurred while retrieving details.');
        }
    });
}

function loadPredictedDisbursements(){
    $.ajax({
        'url': '/user/predicted-loan-figures/' ,
        'type': 'get',
        'data': {},
        'success': function (data) {
            if (data.message){
                pred_disbursements = data.message[0].average === 'No Previous History For This Date' ? 0 : parseFloat(data.message[0].average);
                total_outs += data.message[0].average === 'No Previous History For This Date' ? 0 : payouts;
                $('#disbursements').html(data.message[0].average === 'No Previous History For This Date' ? 'No Previous History For This Date' : formatter.format(data.message[0].average));
            }
            aggregate();
        },
        'error': function (err) {
            swal('Oops! An error occurred while retrieving details.');
        }
    });
}

function aggregate(){
    console.log(payouts)
    $('#total_ins').html(total_ins);
    $('#total_outs').html(total_outs);
}

function reloadInvestments(period){
    total_ins = 0; total_outs = 0; payouts = 0; interests = 0;
    $.ajax({
        'url': '/user/investment-figures?period='+period ,
        'type': 'get',
        'data': {},
        'success': function (data) {
            if (data.message){
                payouts = parseFloat(data.message.capital[0].amount);
                total_outs += payouts;
                interests = parseFloat(data.message.interests[0].amount);
                total_ins += interests;
                console.log(total_ins);
                console.log(total_outs);
                $('#payouts').html(formatter.format(data.message.capital[0].amount));
                $('#interests').html(formatter.format(data.message.interests[0].amount));
            }
            reloadLoans(period);
        },
        'error': function (err) {
            swal('Oops! An error occurred while retrieving details.');
        }
    });
}

function reloadLoans(period) {
    receivables = 0;
    $.ajax({
        'url': '/user/loan-figures?period='+period ,
        'type': 'get',
        'data': {},
        'success': function (data) {
            if (data.message){
                receivables = isNaN(parseFloat(data.message.capital[0].due)) ? 0 :parseFloat(data.message.capital[0].due);
                total_ins += receivables;
                console.log(total_ins);
                console.log(total_outs);
                $('#receivables').html(formatter.format(data.message.capital[0].due));
            }
            reloadPredictedDisbursements(period);
        },
        'error': function (err) {
            swal('Oops! An error occurred while retrieving details.');
        }
    });
}

function reloadPredictedDisbursements(period){
    pred_disbursements = 0;
    $.ajax({
        'url': '/user/predicted-loan-figures?period='+period ,
        'type': 'get',
        'data': {},
        'success': function (data) {
            if (data.message){
                pred_disbursements = data.message[0].average === 'No Previous History For This Date' ? 0 : parseFloat(data.message[0].average);
                total_outs += data.message[0].average === 'No Previous History For This Date' ? 0 : pred_disbursements;
                console.log(total_ins);
                console.log(total_outs);
                $('#disbursements').html(data.message[0].average === 'No Previous History For This Date' ? 'No Previous History For This Date' : formatter.format(data.message[0].average));
            }
            $('#total_ins').html(total_ins);
            $('#total_outs').html(total_outs);
        },
        'error': function (err) {
            swal('Oops! An error occurred while retrieving details.');
        }
    });
}

function loadPayouts(period){
    let url;
    if (!period)
        url = '/user/investment-payouts/';
    else
        url = '/user/investment-payouts?period='+period;
    $.ajax({
        'url': url,
        'type': 'get',
        'data': {},
        'success': function (data) {
            populatePayoutsTable(data.message);
        },
        'error': function (err) {
            //alert ('Error');
            console.log(err);
        }
    });
}

function populatePayoutsTable(dets) {
    if (dets.length === 0) {
        $("#loan-table").dataTable().fnClearTable();
    } else {
        let data = [];
        jQuery.each(dets, function (k, v) {
            console.log(v);
            v.investid = padWithZeroes(v.id, 6);
            v.amt = formatter.format(v.amount);
            data.push(v);
        });
        $('#payouts-table').DataTable({
            dom: 'Blfrtip',
            bDestroy: true,
            data: data,
            search: {search: ' '},
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
            columns: [
                { data: "investid" },
                { data: "client" },
                { data: "amt" },
                { data: "interest" },
                { data: "investment_mature_date" }
            ]
        });
    }
}

function loadInterests(period){
    let url;
    if (!period)
        url = '/user/investment-interests/';
    else
        url = '/user/investment-interests?period='+period;
    $.ajax({
        'url': url,
        'type': 'get',
        'data': {},
        'success': function (data) {
            populateInterestsTable(data.message);
        },
        'error': function (err) {
            //alert ('Error');
            console.log(err);
        }
    });
}

function populateInterestsTable(dets) {
    if (dets.length === 0) {
        $("#interests-table").dataTable().fnClearTable();
    } else {
        let data = [];
        jQuery.each(dets, function (k, v) {
            console.log(v);
            v.investid = padWithZeroes(v.investmentid, 6);
            v.amt = formatter.format(v.amount);
            data.push(v);
        });
        $('#interests-table').DataTable({
            dom: 'Blfrtip',
            bDestroy: true,
            data: data,
            search: {search: ' '},
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
            columns: [
                { data: "investid" },
                { data: "client" },
                { data: "amt" },
                { data: "investment_mature_date" }
            ]
        });
    }
}

function loadReceivables(period){
    let url;
    if (!period)
        url = '/user/loan-receivables/';
    else
        url = '/user/loan-receivables?period='+period;
    $.ajax({
        'url': url,
        'type': 'get',
        'data': {},
        'success': function (data) {
            populateReceivablesTable(data.message);
        },
        'error': function (err) {
            //alert ('Error');
            console.log(err);
        }
    });
}

function populateReceivablesTable(dets) {
    if (dets.length === 0) {
        $("#loan-table").dataTable().fnClearTable();
    } else {
        let data = [];
        jQuery.each(dets, function (k, v) {
            console.log(v);
            v.id = padWithZeroes(v.applicationID, 6);
            v.principal = formatter.format(v.payment_amount);
            v.interest = formatter.format(v.interest_amount);
            data.push(v);
            // $("#loan-table").dataTable().fnAddData([formatter.format(v.loan_amount), (v.date_created), stat, view]);
        });
        $('#receivables-table').DataTable({
            dom: 'Blfrtip',
            bDestroy: true,
            data: data,
            search: {search: ' '},
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
            columns: [
                { data: "id" },
                { data: "client" },
                { data: "principal" },
                { data: "interest" },
                { data: "payment_collect_date" }
            ]
        });
    }
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
            getBanks();
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