$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    loadCollections();
});

function loadCollections(){
    $.ajax({
        'url': '/user/collections/filter?type=overdue&&range=61',
        'type': 'get',
        'success': function (data) {
            let collections = data.response;
            populateDataTable(collections);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function populateDataTable(data) {
    console.log("populating data table...");
    $("#bootstrap-data-table").DataTable().clear();
    let processed_data = [];
    $.each(data, function(k, v){
        let table = {
            a:padWithZeroes(v.applicationID, 9),
            b:v.client,
            c:'₦' + (parseFloat(v.payment_amount)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')+' ('+v.type+')',
            d:v.payment_collect_date,
            e:'<button type="button" class="btn btn-info" data-toggle="modal" data-target="#myModal" onclick="goToApplication(' + v.applicationID + ')"><i class="fa fa-eye"></i> View Loan</button>'
        };
        processed_data.push(table);
    });
    $('#bootstrap-data-table').DataTable({
        dom: 'Blfrtip',
        bDestroy: true,
        data: processed_data,
        order: [[ 3, "asc" ]],
        search: {search: ' '},
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        columns: [
            { data: "a" },
            { data: "b" },
            { data: "c" },
            { data: "d" },
            { data: "e" }
        ]
    });
}

function goToApplication(id) {
    window.location.href = "/application?id="+id;
}

$("#filter").submit(function (e) {
    e.preventDefault();

    let due = $("#due-filter").val(),
        type = $("#type-filter").val(),
        overdue = $("#overdue-filter").val(),
        url = '/user/collections/filter?';
    if (type){
        url = url.concat('&&type='+type);
        if (type === 'due'){
            url = url.concat('&&range='+due);
        } else if (type === 'overdue'){
            url = url.concat('&&range='+overdue);
        }
    } else {
        return notification('Kindly select a collection type!','','warning');
    }

    $.ajax({
        'url': url,
        'type': 'get',
        'success': function (data) {
            let collections = data.response;
            populateDataTable(collections);
        },
        'error': function (err) {
            console.log(err);
        }
    });
});