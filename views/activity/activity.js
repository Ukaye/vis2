jQuery(document).ready(function() {
//        notifications();
    checkForEdit();
    window.emojiPicker.discover();
    getClients(JSON.parse(localStorage.user_obj).ID, 0);
    getTeams();
    getActivityTypes();
    check();
    loadMenus();
    read_write();
});

$(document).on("click", "#allActivities", function (e) {
    $('#all-list').slideUp();
//            $('#details').show();
    $('#new').hide();
    $('#all-list').show();
    $('#default-table').show();
    $('#filtered-table').hide();
    $('#user-name').html('');
});

$(document).on("click", "#newActivity", function (e) {
    $('#new').slideDown();
    $('#details').hide();
    $('#new').show();
    $('#all-list').hide();
});

$("#activity-cat").on('change', function (){

    if ($(this).find('option:selected').attr('id') === 'team'){
        $('#team-div').show();
    }
    else{
        $('#team-div').hide();
    }

});

$("#submit").click(function () {
    validateActivity();
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

let me;
function read_write(){
    let w;
    var perms = JSON.parse(localStorage.getItem("permissions"));
    var page = (window.location.pathname.split('/')[1].split('.'))[0];
    perms.forEach(function (k,v){
        if (k.module_name === page){
            w = $.grep(perms, function(e){return e.id === parseInt(k.id);});
            me = $.grep(perms, function(e){return e.id === parseInt(k.id);});
        }
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1)){
        $(".write").hide();
    }
}

function checkForEdit(){
    let url = '/user/team-activities?user='+JSON.parse(localStorage.user_obj).ID;
    const urlParams = new URLSearchParams(window.location.search);
    const officer = urlParams.get('id');
    const team = urlParams.get('team');
    const id = urlParams.get('officer');
    if (id){
        url = '/user/activities?officer='+id;
    }
    else if (officer && team){
        url = '/user/activities?user='+officer+'&&team='+team;
    }else{
        return loadActivities();
    }
    $.ajax({
        'url': url,
        'type': 'get',
        'data': {},
        'success': function (data) {
            var activities = JSON.parse(data);
            results = activities;
            loadUserActivities(activities);
        },
        'error': function (err) {
            swal('Network Error!', 'No internet connection', 'error');
        }
    });
}

function loadUserActivities(data) {
    let $feed = $('#feed');
    $feed.html('');
    let message = '<div class="text-muted" style="text-align: center" >\n' +
        '                        <div width="100px" height="100px" class="img-thumbnail" style="text-align: center; border: transparent">' +
        //                '                           <img class="img-responsive user-photo" src="not-found.jpg"></div>\n' +
        '                           <i class="fa fa-exclamation-circle fa-lg" style="font-size: 10em"></i><br/>'+
        '                        <h2>No activities to display!</h2>\n' +
        '                        <p><br/>This could be a network error though. If you think so, click the button below.</p><br/>\n' +
        '                        <button onclick="checkForEdit()" class="btn btn-primary"><i class="fa fa-refresh"></i> Load Activities</button>\n' +
        '                    </div>';
    if (data[0]){
        $feed.append('<div class="col-sm-12" style="padding-bottom: 10px"><button style="float: right; margin-left: 100px" onclick="checkForEdit()" class="btn btn-primary pull-right"><i class="fa fa-refresh"></i> Refresh Feed</button></div>');
    }else{
        return $feed.append(message);
    }
    let code, pic, for_, comment_count, attachment_count;
    $.each(data, function(k, v){
        code = (v.team == 0) ? '#9aa2ab' : '#9fcdff';
        pic = (v.team == 0) ? '<i class="fa fa-user"></i>' : '<i class="fa fa-users"></i>';
        for_ = (v.team == 0) ? '' : ' for '+v.team_name;
        comment_count = (v.comment_count === null) ? 'No' : v.comment_count;
        attachment_count = (v.attachments === null) ? 'None' : v.attachments;
        // $('#title-text').html(v.user+': '+v.team_name);
        $('#title-text').html(v.user);
        $feed.append('<div id="feed'+v.ID+'" class="row" style="background: #e9ecef; padding: 5px">\n' +
            '    <div class="col-sm-1">\n' +
            '        <div class="thumbnail" style="border-radius: 50%; width: 100px; height: 100px; background: #9fcdff; text-align: center">' +
            '           <div id="name" style="display: inline-block; margin: 0 auto; padding-top: 20px"><h1>'+getInitials(v.user)+'</h1></div>'+
            '        </div>\n' +
            '    </div>\n' +
            '    <div class="col-sm-11" style="padding-left: 30px">\n' +
            '        <div class="panel panel-default col-sm-12" style="background: #e9ecef; padding-left: 10px; border-radius: 0px">\n' +
            '            <div class="panel-heading"><small>'+pic+' Activity by </small><span class="text-muted">'+v.user+''+for_+'</span><small> Posted on </small><span class="text-muted">'+v.date_created+'</span></div>\n' +
            '              <button type="button" class="btn btn-outline-primary pull-right" data-toggle="modal" data-target="#myModal" onclick="loadAttachments('+v.ID+')"><i class="fa fa-paperclip"></i> Attachments ('+attachment_count+')</button>'+
            '            <div class="panel-body">'+
            '               <small><i class="fa fa-tasks"></i> '+v.activity+'</span></small>&nbsp;|'+
            '               <small><i class="fa fa-user"></i><span> '+v.clients+'</span></small>&nbsp;|'+
            '               <small><i class="fa fa-phone"></i><span> '+v.client_phone+'</span>&nbsp;|&nbsp;<i class="fa fa-envelope"></i><span> '+v.client_email+'</span></small><br/>\n'+
            '            </div>\n' +
            '            <div class="panel-footer">'+v.activity_description+'<br/><span class="text-muted"><small><i class="fa fa-calendar"></i> '+formatDate(v.activity_date)+'</small></span></div>\n' +
            '            <div class="input-group"><div class="input-group-addon"><i class="fa fa-comment"></i></div><textarea contenteditable="true" type="text" id="act'+v.ID+'" maxlength="250" class="form-control" placeholder="Type a comment" data-emojiable="true" data-emoji-input="unicode"></textarea></div><button onclick="savecomment('+v.ID+')" class ="btn btn-info" style="float: right; border-radius: 4px" data-toggle="modal" data-target="#addCommentModal">Add Comment <i class="fa fa-comment"></i></button>'+
            '        </div>\n' +
            '    <div class="col-sm-12">' +
            '       <div class="col-sm-1"></div>' +
            '       <div class="col-sm-11 text-muted"><button id="toggle-comment'+v.ID+'" style="background-color: #e9ecef; border: none" onclick="getComments('+v.ID+')">'+comment_count+' comment(s) ...</button></div>'+
            '    </div>'+
            '    <div id="comments-cover'+v.ID+'" style="display: none"></div>'+
            '    </div>\n' +
            '</div><br/>');
    });
}

function loadActivities(){
    let url = '/user/team-activities?user='+JSON.parse(localStorage.user_obj).ID;
    var perms = JSON.parse(localStorage.getItem("permissions"));
    var page = (window.location.pathname.split('/')[1].split('.'))[0];
    perms.forEach(function (k,v){
        if (k.module_name === 'allActivities'){
            me = $.grep(perms, function(e){return e.id === parseInt(k.id);});
        }
    });
    if (me && me[0] && (parseInt(me[0]['read_only']) === 1)){
        url = '/user/all-activities';
    }
    $.ajax({
        'url': url,
        'type': 'get',
        'data': {},
        'success': function (data) {
            var activities = JSON.parse(data);
            results = activities;
            populateDataTable(activities);
        },
        'error': function (err) {
            swal('Network Error!', 'No internet connection', 'error');
        }
    });

}

function populateDataTable(data) {
    let $feed = $('#feed');
    $feed.html('');
    let message = '<div class="text-muted" style="text-align: center" >\n' +
        '                        <div width="100px" height="100px" class="img-thumbnail" style="text-align: center; border: transparent">' +
        //                '                           <img class="img-responsive user-photo" src="not-found.jpg">' +
        '                           <i class="fa fa-exclamation-circle fa-lg" style="font-size: 10em"></i><br/>'+
        '                            </div><br/>\n' +
        '                        <h2>No activities to display!</h2>\n' +
        '                        <p><br/>This could be a network error. If you think so, click the button below.</p><br/>\n' +
        '                        <button onclick="checkForEdit()" class="btn btn-primary"><i class="fa fa-refresh"></i> Load Activities</button>\n' +
        '                    </div>';
    if (data[0]){
        $feed.append('<div class="col-sm-12" style="padding-bottom: 10px"><button style="float: right; margin-left: 100px" onclick="checkForEdit()" class="btn btn-primary pull-right"><i class="fa fa-refresh"></i> Refresh Feed</button></div>');
    }else{
        $feed.append(message);
    }
    let code, pic, for_, comment_count, attachment_count, client_name;
    $.each(data, function(k, v){
        code = (v.team == 0) ? '#9aa2ab' : '#9fcdff';
        pic = (v.team == 0) ? '<i class="fa fa-user"></i>' : '<i class="fa fa-users"></i>';
        for_ = (v.team == 0) ? '' : ' for '+v.team_name;
        comment_count = (v.comment_count === null) ? 'No' : v.comment_count;
        attachment_count = (v.attachments === null) ? 'None' : v.attachments;
        client_name = v.client_name;
        if (v.client === "-1"){
            client_name = 'No Client Chosen';
        }
        if (v.client === "0"){
            client_name = 'Prospective Client';
        }
        $feed.append('<div id="feed'+v.ID+'" class="row" style="background: #e9ecef; padding: 5px">\n' +
            '    <div class="col-sm-1">\n' +
            '        <div class="thumbnail" style="border-radius: 50%; width: 100px; height: 100px; background: '+code+'; text-align: center">' +
            '           <div id="name" style="display: inline-block; margin: 0 auto; padding-top: 20px"><h1>'+getInitials(v.user)+'</h1></div>'+
            '        </div>\n' +
            '    </div>\n' +
            '    <div id="inside'+v.ID+'" class="col-sm-11" style="padding-left: 30px">\n' +
            '        <div class="panel panel-default col-sm-12" style="background: #e9ecef; padding-left: 10px; border-radius: 0px">\n' +
            '            <div class="panel-heading"><small>'+pic+' Activity by </small><span class="text-muted">'+v.user+ ''+for_+'</span> <small>Posted on </small><span class="text-muted">'+v.date_created+'</span></div>\n' +
            '              <button type="button" class="btn btn-outline-primary pull-right" data-toggle="modal" data-target="#myModal" onclick="loadAttachments('+v.ID+')"><i class="fa fa-paperclip"></i> Attachments ('+attachment_count+')</button>'+
            '            <div class="panel-body">' +
            '               <small><i class="fa fa-tasks"></i> '+v.activity+'</span></small>&nbsp;|'+
            '               <small><i class="fa fa-user"></i><span> '+client_name+'</span></small>&nbsp;|'+
            '               <small><i class="fa fa-phone"></i><span> '+v.client_phone+'</span>&nbsp;|&nbsp;<i class="fa fa-envelope"></i><span> '+v.client_email+'</span></small><br/>\n'+
            '            </div>\n' +
            '            <div class="panel-footer">'+v.activity_description+'<br/><span class="text-muted"><small><i class="fa fa-calendar"></i> '+formatDate(v.activity_date)+'</small></span></div>\n' +
            '            <div class="input-group"><div class="input-group-addon"><i class="fa fa-comment"></i></div><textarea contenteditable="true" type="text" id="act'+v.ID+'" maxlength="250" class="form-control" placeholder="Type a comment" data-emojiable="true" data-emoji-input="unicode"></textarea></div><button onclick="savecomment('+v.ID+')" class ="btn btn-info" style="float: right; border-radius: 4px" data-toggle="modal" data-target="#addCommentModal">Add Comment <i class="fa fa-comment"></i></button>'+
            '        </div>\n' +
            '    <div class="col-sm-12">' +
            '       <div class="col-sm-1"></div>' +
            '       <div class="col-sm-11 text-muted"><button id="toggle-comment'+v.ID+'" style="background-color: #e9ecef; border: none" onclick="getComments('+v.ID+')">'+comment_count+' comment(s) ...</button></div>'+
            '    </div>'+
            '    <div id="comments-cover'+v.ID+'" style="display: none"></div>'+
            //                            '<div id="comments"  class="">\n' +
            //                            '    <div class="col-sm-2">\n' +
            ////                            '        <div class="thumbnail" style="border-radius: 50%; width: 100px; height: 100px; background: '+code+'; text-align: center">' +
            ////                            '           <div id="name" style="display: inline-block; margin: 0 auto; padding-top: 20px"><h1>'+getInitials(v.user)+'</h1></div>'+
            ////                    '               </div>\n' +
            //                            '    </div>\n' +
            //                            '    <div class="col-sm-10">\n' +
            //                            '        <div class="panel panel-default">\n' +
            //                            '            <div class="panel-heading"><strong>'+v.fullname+'</strong> <span class="text-muted">commented on '+v.date_created+'</span></div>\n' +
            //                            '            <div class="panel-body">'+v.text+'</div>\n' +
            //                            '        </div>\n' +
            //                            '    </div>\n' +
            //                            '</div>' +
            '    </div>\n' +
            '</div><br/>');
    });
//            $.each(data.team_activities, function(k, v){
//                $feed.append('<div id="feed'+v.ID+'" class="row" style="background: #e9ecef; padding: 5px">\n' +
//                    '    <div class="col-sm-1">\n' +
//                    '        <div class="thumbnail" style="border-radius: 50%; width: 100px; height: 100px; background: '#9fcdff; text-align: center">' +
//                    '           <div id="name" style="display: inline-block; margin: 0 auto; padding-top: 20px"><h1>'+getInitials(v.user)+'</h1></div>'+
//                    '        </div>\n' +
//                    '    </div>\n' +
//                    '    <div class="col-sm-11" style="padding-left: 30px">\n' +
//                    '        <div class="panel panel-default col-sm-12" style="background: #e9ecef; padding-left: 10px; border-radius: 4px">\n' +
//                    '            <div class="panel-heading"><i class="fa fa-users"></i> Activity by <span class="text-muted">'+v.user+'  for '+v.team_name+'</span></div><button type="button" class="btn btn-outline-primary pull-right" onclick="viewActivity('+v.ID+')"><i class="fa fa-eye"></i> View More</button>\n' +
//                    '            <div class="panel-body">'+v.activity+' '+
//                    '               <i class="fa fa-user"></i><span> '+v.client_name+'</span>&nbsp;|&nbsp;'+
//                    '               <i class="fa fa-phone"></i><span> '+v.client_phone+'</span>&nbsp;|&nbsp;<i class="fa fa-envelope"></i><span> '+v.client_email+'</span><br/>\n'+
//                    '            </div>\n' +
//                    '            <div class="panel-footer">'+v.activity_description+'<br/><span class="text-muted"><small>created on '+v.date_created+'</small></span></div>\n' +
//                    '            <div class="input-group"><div class="input-group-addon"><i class="fa fa-comment"></i></div><textarea contenteditable="true" type="text" id="act'+v.ID+'" maxlength="250" class="form-control" placeholder="Type a comment"></textarea></div><button onclick="savecomment('+v.ID+')" class ="btn btn-info" style="float: right; border-radius: 4px" data-toggle="modal" data-target="#addCommentModal">Add Comment <i class="fa fa-comment"></i></button>'+
//                    '        </div>\n' +
////                    '        <div class="panel panel-default col-sm-2" style=" padding-left: 10px; border-radius: 4px">\n' +
////                    '           <button class ="btn btn-info" style="float: right;" data-toggle="modal" data-target="#addCommentModal">Add Comment <i class="fa fa-comment"></i></button>'+
////                    '        </div>'+
//                    '    </div>\n' +
//                    '</div><br/>');
//            });
}

function getComments(id){
    let item = '#comments-cover'+id;
    let area = '#comments'+id;
    let button = '#toggle-comment'+id;
    $(item).children().remove();
//            $(item).children(area).remove();
    $(item).slideDown();
//            $(area).html('');
    $.ajax({
        'url': '/user/activity-comments/?activity='+id,
        'type': 'get',
        'success': function (data) {
            let comments = data,
                $comments = $(item);
//                    $comments.html('');
            if (!comments[0])
                return $comments.append('<div><div class="col-sm-2"></div><div class="col-sm-10"><h5 style="margin: auto;">No comments available yet!</h5></div></div>');
            comments.forEach(function (comment) {
                $comments.append('<div id="comments'+id+'" class="">\n' +
                    '    <div class="col-sm-2">\n' +
                    //                            '        <div class="thumbnail"><img  width="30px" height="30px" class="img-responsive user-photo" src="https://ssl.gstatic.com/accounts/ui/avatar_2x.png"></div>\n' +
                    '    </div>\n' +
                    '    <div class="col-sm-10">\n' +
                    '    <div class="col-sm-1" style="padding-right: 0px">\n' +
                    '        <div class="thumbnail col-xs-12"><img  width="30px" height="30px" class="img-responsive user-photo" src="https://ssl.gstatic.com/accounts/ui/avatar_2x.png"></div>\n' +
                    '    </div>\n' +
                    '        <div class="col-sm-11">'+
                    '        <div class="panel panel-default">\n' +
                    '            <div class="panel-heading"><strong>'+comment.maker+'</strong> <span class="text-muted"> <small>'+comment.date_created+'</small></span></div>\n' +
                    '            <div class="panel-body">'+comment.comment+'</div>\n' +
                    '        </div>\n' +
                    '        </div>'+
                    '    </div>\n' +
                    '</div><hr/>');
            });
            $(button).html('Hide comments');
            $(button).attr('onclick', 'hideComments('+id+')');
        },
        'error': function (err) {
            swal('No internet connection','','error');
        }
    });
}

function hideComments(id){
    let area = '#comments-cover'+id;
    let button = '#toggle-comment'+id;
    $(area).hide();
    $(button).html('View comments');
    $(button).attr('onclick', 'getComments('+id+')');
}

function loadDetails(id){
    let feed = '#feed'+id;
    let code, pic, for_, comment_count;
    $.ajax({
        'url': '/user/activity-details?id='+id,
        'type': 'get',
        'success': function (data) {
            let activity = data.activity_details,
                $feed = $(feed);
            $feed.html('');
            if (!activity[0])
                return $feed.append('<h2 style="margin: auto;">No activity selected!</h2>');
            activity.forEach(function (activity) {
                code = (activity.team == 0) ? '#9aa2ab' : '#9fcdff';
                pic = (activity.team == 0) ? '<i class="fa fa-user"></i>' : '<i class="fa fa-users"></i>';
                for_ = (activity.team == 0) ? '' : activity.team_name;
                comment_count = (activity.comment_count === null) ? 'No' : activity.comment_count;
                let icon = (activity.team === 0) ? '<i class="fa fa-user"></i>' : '<i class="fa fa-users">';
                $feed.append(
                    '    <div class="col-sm-1">\n' +
                    '        <div class="thumbnail" style="border-radius: 50%; width: 100px; height: 100px; background: '+code+'; text-align: center">' +
                    '           <div id="name" style="display: inline-block; margin: 0 auto; padding-top: 20px"><h1>'+getInitials(activity.user)+'</h1></div>'+
                    '        </div>\n' +
                    '    </div>\n' +
                    '    <div id="inside'+activity.ID+'" class="col-sm-11" style="padding-left: 30px">\n' +
                    '        <div class="panel panel-default col-sm-12" style="background: #e9ecef; padding-left: 10px; border-radius: 0px">\n' +
                    '            <div class="panel-heading">'+pic+' Activity by <span class="text-muted">'+activity.user+ ' for '+for_+'</span></div>\n' +
                    //                    '<button type="button" class="btn btn-outline-primary pull-right" onclick="viewActivity('+v.ID+')"><i class="fa fa-eye"></i> View More</button>
                    '            <div class="panel-body">'+activity.activity+' '+
                    '               <i class="fa fa-user"></i><span> '+activity.client_name+'</span>&nbsp;|&nbsp;'+
                    '               <i class="fa fa-phone"></i><span> '+activity.client_phone+'</span>&nbsp;|&nbsp;<i class="fa fa-envelope"></i><span> '+activity.client_email+'</span><br/>\n'+
                    '            </div>\n' +
                    '            <div class="panel-footer">'+activity.activity_description+'<br/><span class="text-muted"><small>created on '+activity.date_created+'</small></span></div>\n' +
                    '            <div class="input-group"><div class="input-group-addon"><i class="fa fa-comment"></i></div><textarea contenteditable="true" type="text" id="act'+activity.ID+'" maxlength="250" class="form-control" placeholder="Type a comment" data-emojiable="true" data-emoji-input="unicode"></textarea></div><button onclick="savecomment('+activity.ID+')" class ="btn btn-info" style="float: right; border-radius: 4px" data-toggle="modal" data-target="#addCommentModal">Add Comment <i class="fa fa-comment"></i></button>'+
                    '        </div>\n' +
                    '    <div class="col-sm-12">' +
                    '       <div class="col-sm-1"></div>' +
                    '       <div class="col-sm-11 text-muted"><button id="toggle-comment'+activity.ID+'" style="background-color: #e9ecef; border: none" onclick="getComments('+activity.ID+')">'+comment_count+' comment(s) ...</button></div>'+
                    '    </div>'+
                    '    <div id="comments-cover'+activity.ID+'" style="display: none"></div>'+
                    '    </div>');
            });
        },
        'error': function (err) {
            console.log(err);
            swal('No internet connection','','error');
        }
    });
}

var getInitials = function (name) {
    if (name == null)
        return null;
    var parts = name.split(' ')
    var initials = ''
    for (var i = 0; i < parts.length; i++) {
        if (parts[i].length > 0 && parts[i] !== '') {
            initials += parts[i][0]
        }
    }
    return initials;
}

function savecomment(id){
    let obj = {};
    let comment = '#act'+id;
    obj.comment = $(comment).val();
    obj.activityID = id;
    obj.commenter = JSON.parse(localStorage.user_obj).ID;
    if (obj.comment == "" || obj.comment == "undefined"){
        swal("Please leave a comment!", "", "warning");
    }
    else{
        var test={};
        $.ajax({
            'url': '/user/save-comment/',
            'type': 'post',
            'data': obj,
            'success': function (data) {
                $.each(JSON.parse(data), function (key, val) {
                    test[key] = val;
                });
                if(test.status == 500){
                    $('#role').val("");
                    swal("Error submitting comment! Please try again","","error");
                }
                else
                {
                    $('#role').val(""); swal("Comment Submitted!","","success");
                    $(comment).val('');
                    loadDetails(id);
                }
            }
        });
    }

}

function viewActivity(id){
    window.location.href = "/view-activity?id="+id;
}

let clients;

$("#team-list").on('change', function () {
    var selectedID = $(this).find('option:selected').attr('id');
    getClients(JSON.parse(localStorage.user_obj).ID, selectedID);
});

function getClients(user, team){
    let url = '/user/clients-act?team='+team;
    if (team == 0){
        url = '/user/clients-act?user='+user;
    }
    $.ajax({
        type: "GET",
        url: url,
        success: function (response) {
            let pro = '<i class="fa fa-lock"></i> Prospective Client';
            clients = JSON.parse(response);
            $('#client-list').empty();
            $('#client-list').append('<option value="-1" id="-1">Choose Client</option>');
            $('#client-list').append('<option value="0" id="0"> &#xf17b; Prospective Client </option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#client-list").append('<option value = "'+val.ID+'" id="'+val.ID+'" phone="'+val.phone+'" email="'+val.email+'">' + val.fullname + '</option>');
            });
            $("#client-list").select2({dropdownParent: $('body')});
        }
    });
}

$("#client-list").on('change', function () {
    var selectedID = $(this).find('option:selected').attr('ID');
    var phone = $(this).find('option:selected').attr('phone');
    var email = $(this).find('option:selected').attr('email');
    $('#email').val(email);
    $('#phone').val(phone);
});

$("body").on('DOMSubtreeModified', ".emoji-wysiwyg-editor", function() {
    if ($('.emoji-wysiwyg-editor').text() == null || $('.emoji-wysiwyg-editor').text() == "" || $('.emoji-wysiwyg-editor').text() == undefined){
        $('#continue').hide();
        $('#form').slideUp();
//                $('.emoji-wysiwyg-editor').css('border-style', 'solid');
//                $('.emoji-wysiwyg-editor').css('border-width', '1px');
//                $('.emoji-wysiwyg-editor').css('border-color', '#e9ecef');
    }
    else {
        $('#continue').show();
        $('#form').slideDown();
//                $('.emoji-wysiwyg-editor').css('border', 'thin');
        $('#cover-new').css('border-style', 'solid');
        $('#cover-new').css('border-width', '1px');
        $('#cover-new').css('border-color', '#e9ecef');
    }
});

$('#temp-desc').on('click', function(){
    $('#form').slideDown();
});

function getActivityTypes(){
    $.ajax({
        type: "GET",
        url: "/user/activity-types/",
        success: function (response) {
            var role = $("[id=activity-type]");
            role.empty().append('<option id="0">Type </option>');
            $.each(JSON.parse(response), function (key, val) {
                role.append('<option class="deptSp" value = "' + val.id + '" id="' + val.id + '">' + val.activity_name + '</option>');
            });
        }
    });
}

function getTeams(){
    $.ajax({
        type: "GET",
        url: "/user/teams?user="+JSON.parse(localStorage.user_obj).ID,
        success: function (response) {
            var role = $("[id=team-list]");
//                    role.append('<option id="0"> Team  </option>');
            $.each(JSON.parse(response), function (key, val) {
                role.append('<option class="deptSp" value = "' + val.teamID + '" id="' + val.teamID + '">' + val.team_name + '</option>');
            });
        }
    });
}

function validateActivity(){
    if ($('#new-role').val() == "" || $('#new-role').val() == null){
        $('#role-error').html("Enter a valid activity name");
        $('#role-error').css("color", "red");
//                $('#submit-role-error').css("color", "red");
//                $('#submit-role-error').html("Unable to submit. Check information entered.");
    }else{
        saveNewActivityType();
    }
}

function validateComment(){
    if ($('#new-role').val() == "" || $('#new-role').val() == null){
        $('#role-error').html("Enter a valid activity name");
        $('#role-error').css("color", "red");
//                $('#submit-role-error').css("color", "red");
//                $('#submit-role-error').html("Unable to submit. Check information entered.");
    }else{
        comment();
    }
}

$("#continue").click(function () {
    validate();
});

function saveNewActivityType(){
    var obj = {};
    obj.role = $('#new-role').val();
    var test={};
    $.ajax({
        'url': '/user/new-activity-type/',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.message){
                $('#role').val("");
                swal("Activity type already exists!","","error");
            }
            else if(test.status == 500){
                $('#role').val("");
                swal("Please recheck entered values!","","error");
            }
            else
            {$('#role').val(""); swal("New Activity Type Registered!","","success"); getActivityTypes();}
        }
    });
}

function validate(){
    let valid = true;
    let y = document.getElementsByClassName("fields");
//        y = x[currentTab].getElementsByTagName("input");
    // A loop that checks every input field in the current tab:
    for (i = 0; i < y.length; i++) {
        // If a field is empty...
        if (y[i].value == "") {
            valid = false;
        }
    }

    if (valid){
        createActivity();
    }else{
        swal({"icon": "warning", "text": "Please Fill All Mandatory Fields.", "title": "Empty field(s)!"});
    }
}

function createActivity(){
    var obj = {}; let arr = [];
    obj.activity_name = $('#name').val();
    obj.activity_description = $('.emoji-wysiwyg-editor').text();
    if (!(obj.activity_description).replace(/\s/g, '').length)
        return swal('Empty Description', 'Enter a valid activity description!', 'warning');
    obj.client_phone = $('#client-list').find('option:selected').attr('phone');
    obj.activity_duration = $('#activity-duration').val();
//            +' '+$('#time-unit').find('option:selected').attr('value');
    obj.activity_date = $('#activity-date').val();
    obj.client_email = $('#client-list').find('option:selected').attr('email');
    obj.client = $('#client-list').find('option:selected').attr('id');
    obj.activity_type = $('#activity-type').find('option:selected').attr('id');
    obj.for_ = JSON.parse(localStorage.user_obj).ID;
    obj.category = ($('#team-list').find('option:selected').attr('id') === '0') ? 'personal' : 'team';
    obj.team = $('#team-list').find('option:selected').attr('id');
    obj.attachments = $('#activity-files')[0].files.length;
//            for (var i = 0; i < $('#activity-files')[0].files.length; i++){
//                arr.push($('#activity-files')[0].files[i]);
//            }
    var test={};
    $.ajax({
        'url': '/user/new-activity/',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.status == 500){
                return swal("Error","Unable to submit","error");
            }
            else{
                for (var i = 0; i < $('#activity-files')[0].files.length; i++){
                    let file = $('#activity-files')[0].files[i];
                    let ext = file["name"].split('.').pop().toLowerCase();
                    if($.inArray(ext, ['gif','png','jpg','jpeg']) == -1) {
                        return swal('Upload Failed!', 'Invalid file extension', 'warning');
                    }
                    upload(test.result, $('#activity-files')[0].files[i], i+1);
                }
                swal("Activity Submitted!","","success");
                $('.emoji-wysiwyg-editor').empty(); $('#client-list').val(0); $('#activity-duration').val(''); $('#activity-date').val(''); $('#activity-type').val(0); $('#team-list').val(0);
                $('#activity-files').val('');
                loadActivities();
            }

        }
    });

}

function upload(id, files, num){
    let folder_name = 'activity'+id;
    if (!files) {
        return swal ("", "No attachments!", 'info');
    }else{
        let formData = new FormData();
        formData.append('file', files); formData.append('folder', folder_name); formData.append('num', num);
        $.ajax({
            url: "/user/attach-files/"+folder_name,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                console.log(response);
                swal("", "Attachments Uploaded Successfully!", 'success');
            },
            error: function() {
                swal("", "Error Attaching Documents!", 'error');
            }
        });
    }
}

function loadAttachments(activity){
    let $carousel_inner = $('.carousel-inner');
    $('#attachment-list').children().remove();
    $('#attachment-list').empty();
    $.ajax({
        'url': '/user/attached-images/activity'+activity,
        'type': 'get',
        'success': function (data) {
            let res = JSON.parse(data);
            if(res.status === 500){
                $('#attachment-list').empty();
                $('#attachment-list').append("No Attachments for this Activity!");
            }
            else{
                $.each(res['response'], function (key, value){
                    let image = '<div class="col-sm-4">'+
                        '<a >'+
                        '<img src="/'+value+'" alt="Image" style="max-width:100%;" height="100" width="300">'+
                        '</a>'
                    $('#attachment-list').append(image);
                });
            }
        }
    });
}

function isValidDate(dateString) {
    let regEx = /^\d{4}-\d{2}-\d{2}$/;
    if(!dateString || !dateString.match(regEx)) return false;
    let d = new Date(dateString);
    if(Number.isNaN(d.getTime())) return false;
    return d.toISOString().slice(0,10) === dateString;
}

Number.prototype.round = function(p) {
    p = p || 10;
    return parseFloat( this.toFixed(p) );
};

function formatDate(date) {
    let separator;
    if (date.indexOf('-') > -1){
        separator = '-';
    } else if (date.indexOf('/') > -1){
        separator = '/';
    } else {
        return date;
    }
    let date_array = date.split(separator);
    return date_array[0]+'-'+date_array[1]+'-'+date_array[2];
}
