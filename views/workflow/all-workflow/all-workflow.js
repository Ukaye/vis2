$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    $('#stages').DataTable({"bFilter": false, "bInfo" : false});
    loadProcesses();
    getStages();
});

let results;
function loadProcesses(){
    $.ajax({
        'url': '/workflows',
        'type': 'get',
        'data': {},
        'success': function (data) {
            let processes = data.response;
            results = processes;
            populateDataTable(processes);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function getStages(){
    $.ajax({
        type: "GET",
        url: "/stages",
        success: function (response) {
            $("#stages").dataTable().fnClearTable();
            $.each(response, function (key, val) {
                if (parseInt(val.type) < 2){
                    $('#stages').dataTable().fnAddData([val.name+' <i class="fa fa-lock"></i>']);
                } else {
                    $('#stages').dataTable().fnAddData([val.name]);
                }
            });
        }
    });
}

function addNewStage() {
    let $name = $('#new-stage-name');
    if (!$name.val())
        return notification('Kindly input a stage name','','warning');
    if (($name.val()).length > 50)
        return notification('Stage name cannot be more than 50 characters','','warning');
    $.ajax({
        'url': '/stages',
        'type': 'post',
        'data': {name:$name.val()},
        'success': function (data) {
            $name.val('');
            notification('Stage saved successfully','','success');
        },
        'error': function (err) {
            $name.val('');
            notification('Oops! An error occurred while saving stage','','error');
        }
    });
}

function populateDataTable(data) {
    console.log("populating data table...");
    $("#bootstrap-data-table").dataTable().fnClearTable();
    $.each(data, function(k, v){
        let table = [
            v.ID,
            v.name,
            v.date_created,
            // '<button type="button" class="btn btn-info" data-toggle="modal" data-target="#viewProcess" onclick="openModal('+v.ID+')"><i class="fa fa-eye"></i> View Stages</button> ' +
            '<button type="button" class="btn btn-primary" onclick="goToEditWorkflow('+v.ID+')"><i class="fa fa-edit"></i> Edit</button>'
        ];
        $('#bootstrap-data-table').dataTable().fnAddData(table);
    });
}

function goToEditWorkflow(id) {
    window.location.href = '/edit-workflow?id='+id;
}

function openModal(id) {
    $.ajax({
        'url': '/workflow-stages/'+id,
        'type': 'get',
        'success': function (data) {
            $("#stages-table").dataTable().fnClearTable();
            $.each(data.response, function(k, v){
                let table = [
                    v.ID,
                    v.name,
                    v.stage_name
                ];
                $('#stages-table').dataTable().fnAddData(table);
                $('#stages-table').dataTable().fnSort([[0,'asc']]);
            });
        },
        'error': function (err) {
            notification('No internet connection','','error');
        }
    });
}