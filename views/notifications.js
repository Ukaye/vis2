let init = 0,
    count = 0,
    ids = [];

function notifications(){
    ids.length = 0;
    count = 0;
    status = false;
    $.ajax({
        type: "GET",
        url: "/notifications/new-updates?bug="+JSON.parse(localStorage.user_obj).ID,
        success: function (response) {
            status = true;
            init = response.length;
            if (response.length === 0){
                $('#noti-count').hide();
            }
            else{
                $('#noti-count').show();
                $('#noti-count').html(response.length);
            }
            let icon,
                link,
                item;
            $('#n-dropdown').empty();
            $.each(response, function (key, val) {
                count++;
                switch (val.category){
                    case 'Activity':
                        icon = '<i class="fa fa-tasks fa-4x"></i>'
                        link = '/activity'
                        break;
                    case 'Clients':
                        icon = '<i class="fa fa-users fa-4x"></i>'
                        link = '/client-info?id='+val.client;
                        break;
                    case 'Users':
                        icon = '<i class="fa fa-user fa-4x"></i>'
                        link = '#';
                        break;
                    default:
                        icon = '<img src="atb-logo.png">'
                }
                item = '<div class="feed-body-content">\n' +
'                            <p class="feed-body-header">'+jQuery.timeago(val.date_created)+'</time></p>\n' +
'                            <div class="row">\n' +
'                                <span class="col-md-3" style="padding-right: 0">'+icon+'</span>\n' +
'                                <a href="'+link+'" class="col-md-9" style="padding-left: 10px;font-size: 14px">'+val.description+'\n' +
'                                    <div class="client-notification">\n' +
'                                        <img class="user-avatar rounded-circle" src="/images/admin.jpg" alt="User Avatar"\n' +
'                                             style="">\n' +
'                                            <p>'+val.user+'</p>\n' +
                    '                         <small onclick="markAsViewed('+val.notification_id+')" class="feed-content-menu float-right" style="margin-top: 50px">Mark as Viewed</small>\n'+
'                                    </div>\n' +
'                                 </a>\n' +
'                            </div>\n' +
'                        </div>'
                $('#n-dropdown').append(item);

                // let obj = {};
                // obj.notification_id = val.notification_id;
                // obj.val = 2;s
                //    $.ajax({
                //        type: "GET",
                //        url: "/notifications/update-pr",
                //        data:obj,
                //        success: function (response) {
                //            // console.log('Success');
                //            count = 0;
                //        }
                //    });
            });
            if (count === 0)
                $('#mark-all').attr("disabled", true);
            $('#noti-info').html(count+ ' notifications.');
        }
    });
}
// setInterval(notifications, 1000);

function loan_notifications(){
    ids.length = 0;
    count = 0;
    status = false;
    $.ajax({
        type: "GET",
        url: "/notifications/application-updates?bug="+JSON.parse(localStorage.user_obj).ID+'&&bugger='+JSON.parse(localStorage.user_obj).user_role,
        success: function (response) {
            status = true;
            init = response.length;
            if (response.length === 0){
                $('#noti-count').hide();
            }
            else{
                $('#noti-count').show();
                $('#noti-count').html(response.length);
            }
            let icon,
                link,
                item;
            $('#n-dropdown').empty();
            $.each(response, function (key, val) {
                console.log('here')
                count++;
                let buttonid = 'but'+val.notificationid;
                item = '<div class="feed-body-content">\n' +
'                            <p class="feed-body-header">'+jQuery.timeago(val.date_created)+'</time></p>\n' +
'                            <div class="row">\n' +
'                                <span class="col-md-3" style="padding-right: 0"><i class="fa fa-table fa-4x"></i></span>\n' +
'                                <a href="#" class="col-md-9" style="padding-left: 10px;font-size: 14px">'+val.description+'\n' +
'                                    <div class="client-notification">\n' +
'                                        <img class="user-avatar rounded-circle" src="/images/admin.jpg" alt="User Avatar"\n' +
'                                             style="">\n' +
'                                            <p>'+val.user+'</p>\n' +
'                         <small onclick="markAsViewed('+val.notification_id+')" class="feed-content-menu float-right" style="margin-top: 50px" id="'+buttonid+'">Mark as Viewed</small>\n'+
'                                    </div>\n' +
'                                 </a>\n' +
'                            </div>\n' +
'                        </div>'
                $('#n-dropdown').append(item);
            });
            if (count === 0)
                $('#mark-all').attr("disabled", true);
            $('#noti-info').html(count+ ' notifications.');
        }
    });
}

let cats;
function list_categories(){
    status = false;
    $.ajax({
        type: "GET",
        url: "/notifications/categories?bug="+JSON.parse(localStorage.user_obj).ID,
        success: function (response) {
            cats = response;
            let count = response.length,
                item;
            $('#n-settings-panel').empty();
            $('#n-settings-panel').append('<h6>Manage Notifications</h6><br/>');
            for (let i = 0; i < count; i++){
                let v = response[i];
                if (v.compulsory === '1'){
                    item = '<input type="checkbox" id="act'+v.category+'" disabled="disabled" checked/>&nbsp;&nbsp;<label for = "'+v.category_name+'">'+v.category_name+'</label><hr style="padding-top: 0px"/>'
                }
                else{
                    if (v.state){
                        if (v.state === '1'){
                            item = '<input type="checkbox" id="act'+v.category+'" checked/>&nbsp;&nbsp;<label for = "'+v.category_name+'">'+v.category_name+'</label><hr style="padding-top: 0px"/>'
                        } else {
                            item = '<input type="checkbox" id="act'+v.category+'"/>&nbsp;&nbsp;<label for = "'+v.category_name+'">'+v.category_name+'</label><hr style="padding-top: 0px"/>'
                        }
                    } else {
                        item = '<input type="checkbox" id="act'+v.category+'"/>&nbsp;&nbsp;<label for = "'+v.category_name+'">'+v.category_name+'</label><hr style="padding-top: 0px"/>'
                    }
                }
                $('#n-settings-panel').append(item);
            }
            let button = '<button id="submit-settings" onclick="savePreferences()" class="btn btn-info fa-pull-right">Save <i class="fa fa-save"></i></button><br/>';
            $('#n-settings-panel').append(button);
        }
    });
}

function manage(){
    $('#n-settings-panel').slideDown('slow');
    list_categories();
    $('#n-dropdown').hide();
}

function savePreferences(){
    var obj = {};
    var arr = [];
    var i = 0; var j = 0;
    for (let a = 0; a < cats.length; a++){
        let rd; let wt;
        let rt = ($('#act'+cats[a]["category"]).prop('checked')) ? 1 : 0;
        arr[a]=[cats[a]["category"], rt];
    }

    obj.userid = JSON.parse(localStorage.user_obj).ID;
    obj.cats = arr;
    var test = [];
    $.ajax({
        'url': 'notifications/savePreferences/'+JSON.parse(localStorage.user_obj).ID,
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(data, function (key, val) {
                test[key] = val;
            });
//                console.log(test);
            if(test.status == 500){
                swal("Failed!", "Error encountered. Please try again.", "error");
            }
            else
                swal("Success!", "Notification Preferences Set!", "success");
            $('#n-dropdown').slideUp('slow');
            $('#n-settings-panel').hide();
        }
    });
}

$( ".mark" ).click(function() {
    alert( "Handler for .click() called." );
});

function markAsViewed(id){
    status = false;
    let obj = {};
    obj.user = JSON.parse(localStorage.user_obj).ID;
    obj.notification_id = id;
    obj.val = 3;
    $.ajax({
        type: "GET",
        url: "/notifications/update-pr",
        data:obj,
        success: function (response) {
        }
    });
}

function markAll(){
    status = false;
    let obj = {};
    obj.user = JSON.parse(localStorage.user_obj).ID;
    obj.val = 3;
    $.ajax({
        type: "GET",
        url: "/notifications/update-pr",
        data:obj,
        success: function (response) {
            console.log(response)
        }
    });
}

jQuery(document).ready(function() {
    notifications();
    // loan_notifications();
});

setTimeout(function () {
    notifications();
}, 10000)