$(document).ready(function() {
    getUsers();
    getTargets();
    $('#team_targets').DataTable();
    $('#members').DataTable();
    $('#bootstrap-data-table-export').DataTable();
});

function check(){
    if (localStorage.getItem('role') !== 1){
        jQuery('#car-models').hide();
        jQuery('#new-user').hide();
        jQuery('#models-card').hide();
        jQuery('#user').html(localStorage.getItem("name"));
    }
    else{
        jQuery('#user').html(localStorage.getItem("name"));
    }
}

function loadTeams(){
    $.ajax({
        'url': '/user/teams-list',
        'type': 'get',
        'success': function (data) {
            let teams = data.response;
            populateDataTable(teams);
        },
        'error': function (err) {
            console.log(err);
        }
    });
}

function read_write(){
    let w;
    var perms = JSON.parse(localStorage.getItem("permissions"));
    var page = (window.location.pathname.split('/')[1].split('.'))[0];
    perms.forEach(function (k,v){
        if (k.module_name === page){
            w = $.grep(perms, function(e){return e.id === parseInt(k.id);});
        }
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1)){
        $(".write").hide();
    }
}

function loadMenus(){
    let modules = {};
    modules = JSON.parse(localStorage.getItem("modules"));
    modules.forEach(function(k, v){
        if (k.menu_name === 'Sub Menu'){
            let main = $.grep(modules, function(e){return e.id === parseInt(k.main_menu);});
            $('#'+$(main[0]['module_tag']).attr('id') + ' > .sub-menu').append(k.module_tag);
        }else if(k.menu_name === 'Main Menu'){
            $('#sidebar').append(k.module_tag);
            $('#'+$(k.module_tag).attr('id')).append('<ul class="sub-menu children dropdown-menu"></ul>');
        }else{
            $('#'+k.module_name).show();
        }
    });
    $.ajax({
        type: "GET",
        url: "/user/all-requests",
        success: function (response) {
            $.each(response, function(k,v){
                $('#requests-badge').html(v.requests);
            });
        }
    });
    $.ajax({
        type: "GET",
        url: "/user/all-applications",
        success: function (response) {
            $.each(response, function(k,v){
                $('#applications-badge').html(v.applications);
            });
        }
    });
}

function getUsers(){
    $.ajax({
        type: "GET",
        url: "/user/users-list",
        success: function (response) {
            $.each(JSON.parse(response), function (key, val) {
                $("#user_list").append('<option value = "' + val.ID + '">' + val.fullname + '</option>');
            });
            $("#user_list").select2();
        }
    });
}

let target_id;
$('#target_list').on('change', function() {
    target_id = $("#target_list").find("option:selected").val();
    getPeriods(target_id);
    getLimit(target_id);
});

let targets;
function getTargets(){
    $.ajax({
        type: "GET",
        url: "/targets",
        success: function (data) {
            targets = data.response;
            $.each(data.response, function (key, val) {
                $("#target_list").append('<option value = "' + val.ID + '">' + val.title + '</option>');
            });
            $("#target_list").select2();
        }
    });
}

let target_limit;
$('#target_limit').text('');
function getLimit(id){
    if (id && id !== '-- Select Target --'){
        $.ajax({
            type: "GET",
            url: "/user/target/limit/"+id,
            success: function (data) {
                target_limit = parseFloat(data.response.unallocated);
                $('#target_limit').text('Total unallocated target is ₦'+(target_limit.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')));
            }
        });
    } else {
        $('#target_limit').text('');
    }
}

$("#sub_period_list").html('<option selected="selected">-- Select Target Period --</option>');
function getPeriods(id){
    if (id && id !== '-- Select Target --'){
        $('#wait').show();
        $.ajax({
            type: "GET",
            url: "/target/sub_periods/"+id,
            success: function (data) {
                $('#wait').hide();
                $("#sub_period_list").prop('disabled',false);
                $("#sub_period_list").html('<option selected="selected">-- Select Target Period --</option>');
                $.each(data.response, function (key, val) {
                    $("#sub_period_list").append('<option value = "' + val.ID + '">' + val.name + '</option>');
                });
                $("#sub_period_list").select2();
            }
        });
    }
}

let teamid;

function populateDataTable(data) {
    $("#bootstrap-data-table").dataTable().fnClearTable();
    $.each(data, function(k, v){
        $('#bootstrap-data-table').dataTable().fnAddData( [
            v.name,
            v.supervisor,
            v.members,
            '<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#myModal" onclick="openMembersModal('+v.ID+')"><i class="fa fa-users"></i> Add/View Members</button>'+
            '<button type="button" class="btn btn-info" data-toggle="modal" data-target="#targetsModal" onclick="openTargetsModal('+v.ID+')"><i class="fa fa-bullseye"></i> Add/View Targets</button>'
        ]);
    });
}

let team_id;
function openMembersModal(id) {
    team_id = id;
    $.ajax({
        type: "GET",
        url: "/user/team/members/"+id,
        success: function (data) {
            populateMembers(data);
        }
    });
}

function openTargetsModal(id) {
    team_id = id;
    $.ajax({
        type: "GET",
        url: "/user/team/targets/"+id,
        success: function (data) {
            populateTargets(data);
        }
    });
}

function populateMembers(data){
    $("#members").dataTable().fnClearTable();
    $.each(data.response, function(k, v){
        teamid = v.teamID;
        $('#members').dataTable().fnAddData( [
            v.member,
            '<button type="button" class="btn btn-danger" onclick="removeMember('+v.ID+')"><i class="fa fa-remove"></i> Remove</button> &nbsp; &nbsp; &nbsp;'+
            '<button type="button" class="btn btn-primary" onclick="viewActivities(\''+v.memberID+'\')"><i class="fa fa-eye"></i> View Activities</button>'
        ]);
    });
}

function populateTargets(data){
    $("#team_targets").dataTable().fnClearTable();
    $.each(data.response, function(k, v){
        $('#team_targets').dataTable().fnAddData( [
            v.target,
            v.period,
            '₦'+((parseFloat(v.value)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')),
            '<button type="button" class="btn btn-danger" onclick="removeTarget('+v.ID+')"><i class="fa fa-remove"></i> Remove</button>'
        ]);
    });
}

function assignMember() {
    let obj = {};
    if ($('#user_list').val() === '-- Select User --')
        return swal('Kindly select the user to be added','','warning');
    obj.teamID = team_id;
    obj.memberID = $('#user_list').val();
    $('#wait').show();
    $.ajax({
        'url': '/user/team/members',
        'type': 'post',
        'data': obj,
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                swal(response.error,"","error");
            } else{
                $('#user_list').val('-- Select User --').trigger('change');
                swal("Member assigned successfully!","","success");
                populateMembers(response);
                loadTeams();
            }
        }
    });
}

function assignTarget() {
    let obj = {};
    obj.userID = team_id;
    obj.targetID = $('#target_list').val();
    obj.sub_periodID = $('#sub_period_list').val();
    obj.value = $('#target_value').val();
    if (obj.targetID === '-- Select Target --' || obj.sub_periodID === '-- Select Target Period --' || !obj.value)
        return swal('Kindly fill all required field(s)','','warning');
    if (parseFloat(obj.value) > target_limit)
        return swal('Insufficient unallocated target ('+target_limit+')','','warning');
    obj.periodID = ($.grep(targets, function(e){return e.ID === parseInt(target_id);}))[0]['period'];
    $('#wait').show();
    $.ajax({
        'url': '/user/team/targets',
        'type': 'post',
        'data': obj,
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                swal(response.error,"","error");
            } else{
                swal("Target assigned successfully!","","success");
                populateTargets(response);
                getLimit(obj.targetID);
            }
        }
    });
}

function removeMember(id) {
    $('#wait').show();
    $.ajax({
        'url': '/user/team/members/'+id+'/'+team_id,
        'type': 'delete',
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                swal("No internet connection","","error");
            } else{
                swal("Member deleted successfully!","","success");
                populateMembers(response);
                loadTeams();
            }
        }
    });
}

function removeTarget(id) {
    $('#wait').show();
    $.ajax({
        'url': '/user/team/targets/'+id+'/'+team_id,
        'type': 'delete',
        'success': function (response) {
            $('#wait').hide();
            if(response.status === 500){
                swal("No internet connection","","error");
            } else{
                swal("Target deleted successfully!","","success");
                populateTargets(response);
                loadTeams();
            }
        }
    });
}

function viewActivities(id){
    window.location.href = "/activity?id="+id+"&&team="+teamid;
}