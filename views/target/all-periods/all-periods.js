$(document).ready(function() {
    getPeriods();
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

let results;
function getPeriods(){
    $.ajax({
        'url': '/periods',
        'type': 'GET',
        'success': function (data) {
            let periods = data.response;
            results = periods;
            populateDataTable(periods);
        },
        'error': function (err) {
            console.log(err);
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
            v.name,
            v.type,
            v.start,
            v.end,
            '<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#myModal" ' +
            'onclick="openSubPeriodsModal('+v.ID+')">' +
            '<i class="fa fa-eye"></i> View Sub Periods</button>'+
            '<button type="button" class="btn btn-danger" onclick="deletePeriod('+v.ID+')">' +
            '<i class="fa fa-trash"></i> Delete</button>'
        ];
        $('#bootstrap-data-table').dataTable().fnAddData(table);
    });
}

function openSubPeriodsModal(id) {
    $.ajax({
        type: "GET",
        url: "/period/sub_periods/"+id,
        success: function (response) {
            let data = response.response;
            $("#sub_periods").dataTable().fnClearTable();
            $.each(data, function(k, v){
                let table = [
                    v.ID,
                    v.name,
                    v.type,
                    v.start,
                    v.end
                ];
                $('#sub_periods').dataTable().fnAddData(table);
            });
        }
    });
}

function deletePeriod(id) {
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
                    url: "/period/delete/"+id,
                    success: function (data) {
                        $('#wait').hide();
                        if (data.status === 200){
                            notification('Period deleted successfully!','','success');
                            window.location.reload();
                        } else {
                            notification(data.error,'','error');
                        }
                    }
                });
            }
        });
}