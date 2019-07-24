const urlParams = new URLSearchParams(window.location.search);
const application_id = urlParams.get('id');
var tableData = {};
$(document).ready(function () {
    income();
    // loadInvestments();
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
let totalexpenses, totalincome;
function income(period){
    let url;
    if (!period)
        url = '/user/income/';
    else
        url = '/user/income?period='+period;
    $('#income-table').empty();
    $.ajax({
        'url': url ,
        'type': 'get',
        'data': {},
        'success': function (data) {
            if (data.message){
                let principal = isNaN(parseFloat(data.message.capital[0].due))? 0 :parseFloat(data.message.capital[0].due);
                let interest = isNaN(parseFloat(data.message.interests[0].due))? 0 :parseFloat(data.message.interests[0].due);
                totalincome = parseFloat(principal + interest);
                $('#receivables').html(formatter.format(data.message.capital[0].due));
                $('#income-table').append('<tr><td>Loan Principal</td><td>'+formatter.format(principal)+'</td></tr>');
                $('#income-table').append('<tr><td>Loan Interest</td><td>'+formatter.format(interest)+'</td></tr>');
                $('#income-table').append('<tr><td><strong>Total</strong></td><td>'+formatter.format(parseFloat(principal + interest))+'</td></tr>');
            }
            expenses(period);
        },
        'error': function (err) {
            swal('Oops! An error occurred while retrieving details.');
        }
    });
};

function expenses(period){
    let url;
    if (!period)
        url = '/user/expenses/';
    else
        url = '/user/expenses?period='+period;
    $('#expenses-table').empty();
    $.ajax({
        'url': url ,
        'type': 'get',
        'data': {},
        'success': function (data) {
            if (data.message){
                let savings = isNaN(parseFloat(data.message.capital[0].due))? 0 :parseFloat(data.message.capital[0].due);
                let interest = isNaN(parseFloat(data.message.interests[0].due))? 0 :parseFloat(data.message.interests[0].due);
                let disbursements = isNaN(parseFloat(data.message.disbursements[0].average))? 0 :parseFloat(data.message.disbursements[0].average);
                totalexpenses = parseFloat(savings + interest + disbursements);
                $('#expenses-table').append('<tr><td>Savings Payout</td><td>'+formatter.format(savings)+'</td></tr>');
                $('#expenses-table').append('<tr><td>Interests Payout</td><td>'+formatter.format(interest)+'</td></tr>');
                $('#expenses-table').append('<tr><td>Possible Disbursements</td><td>'+formatter.format(disbursements)+'</td></tr>');
                let expenses = data.message.expenses;
                for (let i = 0; i < expenses.length; i++){
                    val = expenses[i];
                    totalexpenses+=parseFloat(val.amount);
                    $('#expenses-table').append('<tr><td>'+val.expense_name+'</td><td>'+formatter.format(val.amount)+'</td></tr>');
                    if (i === expenses.length - 1){
                        $('#expenses-table').append('<tr><td><strong>Total</strong></td><td>'+formatter.format(totalexpenses)+'</td></tr>');
                    }
                }
            }
            agg();
        },
        'error': function (err) {
            swal('Oops! An error occurred while retrieving details.');
        }
    });
};

function agg(){
    $('#aggregates-table').empty();
    $('#aggregates-table').append('<tr><td><strong>Income</strong></td><td>'+formatter.format(totalincome)+'</td></tr>');
    $('#aggregates-table').append('<tr><td><strong>Expenses</strong></td><td>'+formatter.format(totalexpenses)+'</td></tr>');
    inference();
};

function inference(){
    $('#results-table').empty();
    let surplus = parseFloat(totalincome) > parseFloat(totalexpenses) ? formatter.format(parseFloat(totalincome - totalexpenses)) : 'N / A';
    let needed = parseFloat(totalincome) > parseFloat(totalexpenses) ?  'N / A' : formatter.format(Math.abs(parseFloat(totalincome - totalexpenses)));
    $('#results-table').append('<tr><td><strong>Cash Surplus</strong></td><td>'+surplus+'</td></tr>');
    $('#results-table').append('<tr><td><strong>Cash Needed</strong></td><td>'+needed+'</td></tr>');
};

function changePeriod(period){
    let p = period.value;
    // reloadInvestments(p);
    income(p);
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