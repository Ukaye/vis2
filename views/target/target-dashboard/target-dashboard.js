$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    $("#filter_type").select2();
    getTargetList();
    read_write_custom();
});

let targetsList;
function read_write_custom(){
    let w,
        perms = JSON.parse(localStorage.getItem("permissions")),
        page = (window.location.pathname.split('/')[1].split('.'))[0];
    targetsList = ($.grep(perms, function(e){return e.module_name === 'targetsList';}))[0];
    perms.forEach(function (k){
        if (k.module_name === page)
            w = $.grep(perms, function(e){return e.id === parseInt(k.id);});
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1))
        $(".write").hide();

    if (targetsList && targetsList['read_only'] === '1'){
        getTargets();
    } else {
        getTargets((JSON.parse(localStorage.user_obj)).ID);
    }
}

let results;
function getTargets(id){
    let uid = id || '';
    $.ajax({
        'url': '/user/targets-list/'+uid,
        'type': 'GET',
        'success': function (data) {
            let targets = data.response;
            results = targets;
            populateDataTable(targets);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

$('#filter_target_list').on('change', function() {
    let target_id = $("#filter_target_list").find("option:selected").val();
    getPeriods(target_id);
});

function getTargetList(){
    $.ajax({
        type: "GET",
        url: "/targets",
        success: function (data) {
            $.each(data.response, function (key, val) {
                $("#filter_target_list").append('<option value = "' + val.ID + '">' + val.title + '</option>');
            });
            $("#filter_target_list").select2();
        }
    });
}

$("#filter_sub_period").html('<option selected="selected">-- Select Period --</option>');
function getPeriods(id){
    if (id && id !== '-- Select Target --'){
        $('#wait').show();
        $.ajax({
            type: "GET",
            url: "/target/sub_periods/"+id,
            success: function (data) {
                $('#wait').hide();
                $("#filter_sub_period").prop('disabled',false);
                $("#filter_sub_period").html('<option selected="selected">-- Select Period --</option>');
                $.each(data.response, function (key, val) {
                    $("#filter_sub_period").append('<option value = "' + val.ID + '">' + val.name + '</option>');
                });
                $("#filter_sub_period").select2();
            }
        });
    }
}

$("#filter").submit(function (e) {
    e.preventDefault();

    let id = '';
    if (!(targetsList && targetsList['read_only'] === '1'))
        id = (JSON.parse(localStorage.user_obj)).ID;

    let filter = {},
        url = '/user/targets-list/'+id,
        filter_type = $("#filter_type").val(),
        filter_target_list = $("#filter_target_list").val(),
        filter_sub_period = $("#filter_sub_period").val();
    if (filter_type !== '-- Select Type --')
        filter.type = filter_type;
    if (filter_target_list !== '-- Select Target --')
        filter.target = filter_target_list;
    if (filter_sub_period !== '-- Select Period --')
        filter.sub_period = filter_sub_period;
    if (!$.isEmptyObject(filter))
        url = url.concat('?'+$.param(filter));
    $.ajax({
        'url': url,
        'type': 'get',
        'success': function (data) {
            let targets = data.response;
            results = targets;
            populateDataTable(targets);
        },
        'error': function (err) {
            console.log(err);
        }
    });
});

function populateDataTable(data) {
    console.log("populating data table...");
    $("#bootstrap-data-table").dataTable().fnClearTable();
    $.each(data, function(k, v){
        let table = [
            v.owner,
            v.user_type,
            '₦'+(parseFloat(v.value)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'),
            v.type,
            v.period,
            v.start,
            v.end,
            '<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#myModal" ' +
            'onclick="openCommittalsModal(\''+v.userID+','+v.user_type+','+v.start+','+v.end+','+v.value+','+v.type+'\')">' +
            '<i class="fa fa-eye"></i> View Details</button>'+
            '<button type="button" class="btn btn-danger" onclick="deleteTargetAssigned('+v.ID+')">' +
            '<i class="fa fa-trash"></i> Delete</button>'
        ];
        $('#bootstrap-data-table').dataTable().fnAddData(table);
    });
}

function openCommittalsModal(owner) {
    let values = owner.split(','),
        id = values[0],
        user_type = values[1],
        start = values[2],
        end = values[3],
        goal = values[4],
        type = values[5];
    $.ajax({
        type: "GET",
        url: "/user/committals/"+user_type+"/"+type+"/"+id+"?start="+start+"&&end="+end,
        success: function (response) {
            let data = response.response;
            $('#target-value').text('₦'+(parseFloat(goal)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
            $('#committal-count').text(data.count);
            data.total = data.total || 0;
            $('#committal-total').text('₦'+(parseFloat(data.total)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
            let rate = parseInt((parseFloat(data.total)/parseFloat(goal)) * 100);
            $('#committal-rate').text(rate+'%');
            initGuage(rate);
            populateCommittals(data);
        }
    });
}

function deleteTargetAssigned(id) {
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
                    type: "DELETE",
                    url: "/user/targets-list/delete/"+id,
                    success: function (data) {
                        $('#wait').hide();
                        if (data.status === 200){
                            notification('Assigned target deleted successfully!','','success');
                            window.location.reload();
                        } else {
                            notification(data.error,'','error');
                        }
                    }
                });
            }
        });
}

function populateCommittals(data){
    $("#committals").dataTable().fnClearTable();
    $.each(data.data, function(k, v){
        $('#committals').dataTable().fnAddData( [
            v.client,
            v.amount,
            v.duration,
            v.channel,
            v.date
        ]);
    });
}

function initGuage(value) {
    value = (value > 100)? 100 : value;
    let myConfig = {
        "graphset": [{
            "type": "gauge",
            "background-color": "#fff",
            "plot": {
                "background-color": "#666"
            },
            "plotarea": {
                "margin": "0 0 0 0"
            },
            "scale": {
                "size-factor": 1.25,
                "offset-y": 120
            },
            "tooltip": {
                "background-color": "black"
            },
            "scale-r": {
                "values": "0:100:10",
                "border-color": "#b3b3b3",
                "border-width": "2",
                "background-color": "#eeeeee,#b3b3b3",
                "ring": {
                    "size": 10,
                    "offset-r": "130px",
                    "rules": [{
                        "rule": "%v >=0 && %v < 20",
                        "background-color": "#FB0A02"
                    }, {
                        "rule": "%v >= 20 && %v < 40",
                        "background-color": "#EC7928"
                    }, {
                        "rule": "%v >= 40 && %v < 60",
                        "background-color": "#FAC100"
                    }, {
                        "rule": "%v >= 60 && %v < 80",
                        "background-color": "#B1AD00"
                    }, {
                        "rule": "%v >= 80",
                        "background-color": "#348D00"
                    }]
                }
            },
            "labels": [{
                "id": "lbl1",
                "x": "50%",
                "y": "90%",
                "width": 80,
                "offsetX": 160,
                "textAlign": "center",
                "padding": 10,
                "anchor": "c",
                "text": "Very High",
                "backgroundColor": "#348D00",
                "tooltip": {
                    "padding": 10,
                    "backgroundColor": "#237b00",
                    "text": "< 80 <br>Percent",
                    "shadow": 0
                }
            }, {
                "id": "lbl2",
                "x": "50%",
                "y": "90%",
                "width": 80,
                "offsetX": 80,
                "textAlign": "center",
                "padding": 10,
                "anchor": "c",
                "text": "High",
                "backgroundColor": "#B1AD00",
                "tooltip": {
                    "padding": 10,
                    "backgroundColor": "#a09c00",
                    "text": "> 60 < 80<br>Percent",
                    "shadow": 0
                }
            }, {
                "id": "lbl3",
                "x": "50%",
                "y": "90%",
                "width": 80,
                "offsetX": 0,
                "textAlign": "center",
                "padding": 10,
                "anchor": "c",
                "text": "Medium",
                "backgroundColor": "#FAC100",
                "tooltip": {
                    "padding": 10,
                    "backgroundColor": "#e9b000",
                    "text": "> 40 < 60<br>Percent",
                    "shadow": 0
                }
            }, {
                "id": "lbl4",
                "x": "50%",
                "y": "90%",
                "width": 80,
                "offsetX": -80,
                "textAlign": "center",
                "padding": 10,
                "anchor": "c",
                "text": "Low",
                "backgroundColor": "#EC7928",
                "tooltip": {
                    "padding": 10,
                    "backgroundColor": "#da6817",
                    "text": "> 20 < 40<br>Percent",
                    "shadow": 0
                }
            }, {
                "id": "lbl5",
                "x": "50%",
                "y": "90%",
                "width": 80,
                "offsetX": -160,
                "textAlign": "center",
                "padding": 10,
                "anchor": "c",
                "text": "Very Low",
                "backgroundColor": "#FB0A02",
                "tooltip": {
                    "padding": 10,
                    "backgroundColor": "#ea0901",
                    "text": "< 20<br>Percent",
                    "shadow": 0
                }
            }],
            "series": [{
                "values": [value],
                "animation": {
                    "method": 5,
                    "effect": 2,
                    "speed": 2500
                }
            }],
            "alpha": 1
        }]
    };

    zingchart.THEME = "classic";
    zingchart.render({
        id: 'myChart',
        data: myConfig,
    });
}