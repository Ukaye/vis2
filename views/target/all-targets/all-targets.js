$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    getTargets();
    $("#datepicker").datepicker({
        format: "mm-yyyy",
        startView: "months",
        minViewMode: "months"
    }).on("change", function() {
        Date.prototype.addDays = function(days) {
            let date = new Date(this.valueOf());
            date.setDate(date.getDate() + days);
            return date;
        };

        let start_ = ($('#new-period-start-2').val()).split('-'),
            start__ = start_[1]+'-'+start_[0]+'-01',
            start_month = parseInt(start_[0]),
            start_year = parseInt(start_[1]),
            start = new Date(start__),
            annual_days = 364;
        if (isLeapYear(start_year) && start_month < 3)
            annual_days = 365;
        if (isLeapYear((start_year + 1)) && start_month >= 3)
            annual_days = 365;

        let end_ = (start.addDays(annual_days)).toISOString().split('T')[0],
            end__ = (end_).split('-'),
            end = end__[1]+'-'+end__[0];

        $('#new-period-start').val(start__);
        $('#new-period-end').val(end_);
        $('#new-period-end-2').val(end);
    });
});

let results, targets;
function getTargets(){
    $.ajax({
        'url': '/targets',
        'type': 'GET',
        'success': function (data) {
            getPeriods();
            targets = data.response;
            results = targets;
            populateDataTable(targets);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function getPeriods(){
    $.ajax({
        url: '/periods',
        type: 'GET',
        success: function (response) {
            $.each(response.response, function (key, val) {
                let assigned_interest = ($.grep(targets, function(e){return (e.period === val.ID && e.type === "interest");}))[0],
                    assigned_disbursement = ($.grep(targets, function(e){return (e.period === val.ID && e.type === "disbursement");}))[0];
                if (assigned_interest && assigned_disbursement){
                    $("#new-target-period").append('<option value = "' + val.ID + '" class="disabled" disabled="disabled">' + val.name + '</option>');
                } else {
                    $("#new-target-period").append('<option value = "' + val.ID + '">' + val.name + '</option>');
                }
            });
        }
    });
}

function addNewTarget() {
    let target = {};
    target.title = $('#new-target-title').val();
    target.description = $('#new-target-description').val();
    target.period = $('#new-target-period').val();
    target.type = $('#new-target-type').val();
    target.value = $('#new-target-value').val();
    if (!target.title || !target.description || !target.value || target.period === '-- Select Target Period --' || target.type === '-- Select Target Type --')
        return notification('Kindly fill all required field(s)','','warning');
    $('#wait').show();
    $.ajax({
        'url': '/targets',
        'type': 'post',
        'data': target,
        'success': function (data) {
            $('#wait').hide();
            if (data.status === 200){
                notification('Target saved successfully','','success');
                window.location.reload();
            } else {
                notification(data.error,'','error');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            notification('Oops! An error occurred while saving target','','error');
        }
    });
}

function addNewPeriod() {
    let period = {};
    period.name = $('#new-period-name').val();
    period.start = $('#new-period-start').val();
    period.end = $('#new-period-end').val();
    period.type = $('#new-period-type').val();
    if (!period.name || !period.start || !period.end || period.type === '-- Select Sub Period --')
        return notification('Kindly fill all required field(s)','','warning');
    $('#wait').show();
    $.ajax({
        'url': '/periods',
        'type': 'post',
        'data': period,
        'success': function (data) {
            $('#wait').hide();
            if (data.status === 200){
                notification('Period saved successfully','','success');
                window.location.reload();
            } else {
                notification(data.error,'','error');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            notification('Oops! An error occurred while saving period','','error');
        }
    });
}

function populateDataTable(data) {
    console.log("populating data table...");
    $("#bootstrap-data-table").dataTable().fnClearTable();
    $.each(data, function(k, v){
        let table = [
            v.ID,
            v.title,
            '₦'+(parseFloat(v.value)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'),
            v.start,
            v.end,
            '<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#myModal" ' +
            'onclick="openDetailsModal(\''+v.ID+','+v.start+','+v.end+','+v.value+','+v.type+'\')">' +
            '<i class="fa fa-eye"></i> View Details</button>'+
            '<button type="button" class="btn btn-danger" onclick="deleteTarget('+v.ID+')">' +
            '<i class="fa fa-trash"></i> Delete</button>'
        ];
        $('#bootstrap-data-table').dataTable().fnAddData(table);
    });
}

function deleteTarget(id) {
    swal({
        title: "Are you sure?",
        text: "Once deleted, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((yes) => {
            if (yes) {
                $('#wait').show();
                $.ajax({
                    type: "DELETE",
                    url: "/target/delete/"+id,
                    success: function (data) {
                        $('#wait').hide();
                        if (data.status === 200){
                            notification('Target deleted successfully!','','success');
                            window.location.reload();
                        } else {
                            notification(data.error,'','error');
                        }
                    }
                });
            }
        });
}

function openDetailsModal(owner) {
    let values = owner.split(','),
        id = values[0],
        start = values[1],
        end = values[2],
        goal = values[3],
        type = values[4];
    $.ajax({
        type: "GET",
        url: "/user/committals/"+type+"/"+id+"?start="+start+"&&end="+end,
        success: function (response) {
            let data = response.response;
            $('#target-value').text('₦'+(parseFloat(goal)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
            $('#committal-count').text(data.count);
            data.total = data.total || 0;
            $('#committal-total').text('₦'+(parseFloat(data.total)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
            let rate = parseInt((parseFloat(data.total)/parseFloat(goal)) * 100);
            $('#committal-rate').text(rate+'%');
            initTargetGuage(rate);
        }
    });
    $.ajax({
        type: "GET",
        url: "/user/target/details/"+id,
        success: function (response) {
            let series = [],
                data = response.response,
                $allocationPiechart = $('#allocationPiechart'),
                $allocationPlaceholder = $('#allocationPlaceholder');
            $('#allocation-count').text(data.count);
            data.total = data.total || 0;
            $('#allocation-total').text('₦'+(parseFloat(data.total)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
            for (let i=0; i<data.data.length; i++){
                let portion = data.data[i],
                    plot = {
                        values : [portion.value],
                        text: portion.owner,
                        backgroundColor: generateColour()
                    };
                series.push(plot);
            }
            if (series[0]){
                $allocationPiechart.show();
                $allocationPlaceholder.hide();
                initAllocationPiechart(series);
            } else {
                $allocationPiechart.hide();
                $allocationPlaceholder.show();
            }
        }
    });
}

function initTargetGuage(value) {
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
        id: 'targetGuage',
        data: myConfig,
    });
}

function initAllocationPiechart(series) {
    let myConfig = {
        type: "pie",
        backgroundColor: "#fff",
        plot: {
            borderColor: "#fff",
            borderWidth: 2,
            valueBox: {
                placement: 'out',
                text: '%t\n%npv%',
                fontFamily: "Open Sans"
            },
            tooltip:{
                fontSize: '18',
                fontFamily: "Open Sans",
                padding: "5 10",
                text: "%npv%"
            },
            animation:{
                effect: 2,
                method: 5,
                speed: 500,
                sequence: 1
            }
        },
        plotarea: {
            margin: "0 0 0 0"
        },
        series : series
    };

    zingchart.THEME = "classic";
    zingchart.render({
        id : 'allocationPiechart',
        data : myConfig
    });
}