/**
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * @name timeago
 * @version 1.6.5
 * @requires jQuery v1.2.3+
 * @author Ryan McGeary
 * @license MIT License - http://www.opensource.org/licenses/mit-license.php
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Copyright (c) 2008-2017, Ryan McGeary (ryan -[at]- mcgeary [*dot*] org)
 */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && typeof module.exports === 'object') {
        factory(require('jquery'));
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {
    $.timeago = function(timestamp) {
        if (timestamp instanceof Date) {
            return inWords(timestamp);
        } else if (typeof timestamp === "string") {
            return inWords($.timeago.parse(timestamp));
        } else if (typeof timestamp === "number") {
            return inWords(new Date(timestamp));
        } else {
            return inWords($.timeago.datetime(timestamp));
        }
    };
    var $t = $.timeago;

    $.extend($.timeago, {
        settings: {
            refreshMillis: 60000,
            allowPast: true,
            allowFuture: false,
            localeTitle: false,
            cutoff: 0,
            autoDispose: true,
            strings: {
                prefixAgo: null,
                prefixFromNow: null,
                suffixAgo: "ago",
                suffixFromNow: "from now",
                inPast: 'any moment now',
                seconds: "less than a minute",
                minute: "about a minute",
                minutes: "%d minutes",
                hour: "about an hour",
                hours: "about %d hours",
                day: "a day",
                days: "%d days",
                month: "about a month",
                months: "%d months",
                year: "about a year",
                years: "%d years",
                wordSeparator: " ",
                numbers: []
            }
        },

        inWords: function(distanceMillis) {
            if (!this.settings.allowPast && ! this.settings.allowFuture) {
                throw 'timeago allowPast and allowFuture settings can not both be set to false.';
            }

            var $l = this.settings.strings;
            var prefix = $l.prefixAgo;
            var suffix = $l.suffixAgo;
            if (this.settings.allowFuture) {
                if (distanceMillis < 0) {
                    prefix = $l.prefixFromNow;
                    suffix = $l.suffixFromNow;
                }
            }

            if (!this.settings.allowPast && distanceMillis >= 0) {
                return this.settings.strings.inPast;
            }

            var seconds = Math.abs(distanceMillis) / 1000;
            var minutes = seconds / 60;
            var hours = minutes / 60;
            var days = hours / 24;
            var years = days / 365;

            function substitute(stringOrFunction, number) {
                var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
                var value = ($l.numbers && $l.numbers[number]) || number;
                return string.replace(/%d/i, value);
            }

            var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
                seconds < 90 && substitute($l.minute, 1) ||
                minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
                minutes < 90 && substitute($l.hour, 1) ||
                hours < 24 && substitute($l.hours, Math.round(hours)) ||
                hours < 42 && substitute($l.day, 1) ||
                days < 30 && substitute($l.days, Math.round(days)) ||
                days < 45 && substitute($l.month, 1) ||
                days < 365 && substitute($l.months, Math.round(days / 30)) ||
                years < 1.5 && substitute($l.year, 1) ||
                substitute($l.years, Math.round(years));

            var separator = $l.wordSeparator || "";
            if ($l.wordSeparator === undefined) { separator = " "; }
            return $.trim([prefix, words, suffix].join(separator));
        },

        parse: function(iso8601) {
            var s = $.trim(iso8601);
            s = s.replace(/\.\d+/,""); // remove milliseconds
            s = s.replace(/-/,"/").replace(/-/,"/");
            s = s.replace(/T/," ").replace(/Z/," UTC");
            s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
            s = s.replace(/([\+\-]\d\d)$/," $100"); // +09 -> +0900
            return new Date(s);
        },
        datetime: function(elem) {
            var iso8601 = $t.isTime(elem) ? $(elem).attr("datetime") : $(elem).attr("title");
            return $t.parse(iso8601);
        },
        isTime: function(elem) {
            // jQuery's `is()` doesn't play well with HTML5 in IE
            return $(elem).get(0).tagName.toLowerCase() === "time"; // $(elem).is("time");
        }
    });

    // functions that can be called via $(el).timeago('action')
    // init is default when no action is given
    // functions are called with context of a single element
    var functions = {
        init: function() {
            functions.dispose.call(this);
            var refresh_el = $.proxy(refresh, this);
            refresh_el();
            var $s = $t.settings;
            if ($s.refreshMillis > 0) {
                this._timeagoInterval = setInterval(refresh_el, $s.refreshMillis);
            }
        },
        update: function(timestamp) {
            var date = (timestamp instanceof Date) ? timestamp : $t.parse(timestamp);
            $(this).data('timeago', { datetime: date });
            if ($t.settings.localeTitle) {
                $(this).attr("title", date.toLocaleString());
            }
            refresh.apply(this);
        },
        updateFromDOM: function() {
            $(this).data('timeago', { datetime: $t.parse( $t.isTime(this) ? $(this).attr("datetime") : $(this).attr("title") ) });
            refresh.apply(this);
        },
        dispose: function () {
            if (this._timeagoInterval) {
                window.clearInterval(this._timeagoInterval);
                this._timeagoInterval = null;
            }
        }
    };

    $.fn.timeago = function(action, options) {
        var fn = action ? functions[action] : functions.init;
        if (!fn) {
            throw new Error("Unknown function name '"+ action +"' for timeago");
        }
        // each over objects here and call the requested function
        this.each(function() {
            fn.call(this, options);
        });
        return this;
    };

    function refresh() {
        var $s = $t.settings;

        //check if it's still visible
        if ($s.autoDispose && !$.contains(document.documentElement,this)) {
            //stop if it has been removed
            $(this).timeago("dispose");
            return this;
        }

        var data = prepareData(this);

        if (!isNaN(data.datetime)) {
            if ( $s.cutoff === 0 || Math.abs(distance(data.datetime)) < $s.cutoff) {
                $(this).text(inWords(data.datetime));
            } else {
                if ($(this).attr('title').length > 0) {
                    $(this).text($(this).attr('title'));
                }
            }
        }
        return this;
    }

    function prepareData(element) {
        element = $(element);
        if (!element.data("timeago")) {
            element.data("timeago", { datetime: $t.datetime(element) });
            var text = $.trim(element.text());
            if ($t.settings.localeTitle) {
                element.attr("title", element.data('timeago').datetime.toLocaleString());
            } else if (text.length > 0 && !($t.isTime(element) && element.attr("title"))) {
                element.attr("title", text);
            }
        }
        return element.data("timeago");
    }

    function inWords(date) {
        return $t.inWords(distance(date));
    }

    function distance(date) {
        return (new Date().getTime() - date.getTime());
    }

    // fix for IE6 suckage
    document.createElement("abbr");
    document.createElement("time");
}));

let initial = 0, all_count,
    count = 0,
    ids = [];

let noti_ids = [];
$( "#noti-bell" ).click(function() {
});

function open_notifications(){
    $('#noti-count').hide();
    load_notifications(JSON.parse(localStorage.getItem('notifications')));
}

let noti_count = 0;
function load_notifications(object){
    // ids.length = 0;
    count = 0;
    // initial = object.length;
    // if (JSON.parse(localStorage.getItem('notifications')).length === 0){
    //     $('#noti-count').hide();
    //     return notifications();
    // }
    // else{
    //     $('#noti-count').show();
    //     $('#noti-count').html(noti_count - all_count);
    // }
    let icon,
        link,
        item;
    $('#n-dropdown').empty();
    $.each(object, function (key, val) {
        count++;
        switch (val.category){
            case 'Activity':
                icon = '<i class="fa fa-tasks fa-4x"></i>';
                link = '/activity'
                break;
            case 'Clients':
                icon = '<i class="fa fa-users fa-4x"></i>';
                link = '/client-info?id='+val.affected;
                break;
            case 'Users':
                icon = '<i class="fa fa-user fa-4x"></i>';
                link = `/all-users/`;
                break;
            case 'Application':
                icon = '<i class="fa fa-table fa-4x"></i>';
                link = `/view-application?id=${val.affected}`;
                break;
            case 'Workflow':
                icon = '<img src="../workflow.png">';
                link = `/edit-workflow?id=${val.affected}`;
                break;
            case 'Investment':
                icon = '<i class="fa fa-money fa-4x"></i>';
                link = `/view-application?id=${val.affected}`;
                break;
            case 'Target':
                icon = '<i class="fa fa-bullseye fa-4x"></i>';
                link = `/all-targets`;
                break;
            case 'Authentication':
                icon = '<i class="fa fa-power-off fa-4x"></i>';
                link = '#';
                break;
            case 'Permission':
                icon = '<img src="../permission.png">';
                link = '#';
                break;
            default:
                icon = '<img src="../atb-logo.png">';
                link = '#';
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
            '                         <small onclick="markAsViewed('+val.ID+')" class="feed-content-menu float-right" style="margin-top: 50px">Remove</small>\n'+
            '                                    </div>\n' +
            '                                 </a>\n' +
            '                            </div>\n' +
            '                        </div>';
        $('#n-dropdown').append(item);
    });
    if (count === 0)
        $('#mark-all').attr("disabled", true);
    $('#noti-info').html(count+ ' notification(s).');
}

let old_count = parseInt(JSON.parse(localStorage.getItem('noti_count')));
function getNotifications(){
    ids.length = 0;
    count = 0;
    status = false;
    $.ajax({
        type: "GET",
        url: "/notifications/all-updates?bug="+JSON.parse(localStorage.user_obj).ID+'&&bugger='+JSON.parse(localStorage.user_obj).user_role,
        success: function (response) {
            noti_count = response.length;
            let new_count = Math.abs(old_count - noti_count);
            if (noti_count === old_count){
                $('#noti-count').hide();
                localStorage.setItem('noti_count', response.length);
            }
            else{
                $('#noti-count').html(new_count);
                $('#noti-count').show();
                $('#noti-info').html(new_count+ ' new notification(s).');
                localStorage.setItem('noti_count', response.length);
            }
            localStorage.setItem('notifications', JSON.stringify(response));
            // load_notifications(JSON.parse(localStorage.getItem('notifications')));
        }
    });
}

function notifications(){
    ids.length = 0;
    count = 0;
    status = false;
    $.ajax({
        type: "GET",
        url: "/notifications/all-updates?bug="+JSON.parse(localStorage.user_obj).ID+'&&bugger='+JSON.parse(localStorage.user_obj).user_role,
        success: function (response) {
            localStorage.setItem('notifications', response);
            status = true;
            initial = response.length;
            all_count = response.length;
            if (response.length === 0){
                $('#noti-count').hide();
            }
            else{
                $('#noti-count').show();
                $('#noti-count').html(all_count);
            }
            let icon,
                link,
                item;
            $('#n-dropdown').empty();
            $.each(response, function (key, val) {
                count++;
                switch (val.category){
                    case 'Activity':
                        icon = '<i class="fa fa-tasks fa-4x"></i>';
                        link = '/activity'
                        break;
                    case 'Clients':
                        icon = '<i class="fa fa-users fa-4x"></i>';
                        link = '/client-info?id='+val.affected;
                        break;
                    case 'Users':
                        icon = '<i class="fa fa-user fa-4x"></i>';
                        link = `/all-users/`;
                        break;
                    case 'Application':
                        icon = '<i class="fa fa-table fa-4x"></i>';
                        link = `/view-application?id=${val.affected}`;
                        break;
                    case 'Workflow':
                        icon = '<img src="../workflow.png">';
                        link = `/edit-workflow?id=${val.affected}`;
                        break;
                    case 'Investment':
                        icon = '<i class="fa fa-money fa-4x"></i>';
                        link = `/view-application?id=${val.affected}`;
                        break;
                    case 'Target':
                        icon = '<i class="fa fa-bullseye fa-4x"></i>';
                        link = `/all-targets`;
                        break;
                    case 'Authentication':
                        icon = '<i class="fa fa-power-off fa-4x"></i>';
                        link = '#';
                        break;
                    case 'Permission':
                        icon = '<img src="../permission.png">';
                        link = '#';
                        break;
                    default:
                        icon = '<img src="../atb-logo.png">';
                        link = '#';
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
                    '                         <small onclick="markAsViewed('+val.ID+')" class="feed-content-menu float-right" style="margin-top: 50px">Remove</small>\n'+
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
            $('#noti-info').html(count+ ' notification(s).');
        }
    });
}
setInterval(getNotifications, 15000);

function loan_notifications(){
    ids.length = 0;
    // count = 0;
    status = false;
    $.ajax({
        type: "GET",
        url: "/notifications/application-updates?bug="+JSON.parse(localStorage.user_obj).ID+'&&bugger='+JSON.parse(localStorage.user_obj).user_role,
        // url: "/notifications/new-updates?bug="+JSON.parse(localStorage.user_obj).ID,
        success: function (response) {
            status = true;
            all_count += response.length;
            if (response.length === 0){
                $('#noti-count').hide();
            }
            else{
                $('#noti-count').show();
                $('#noti-count').html(all_count);
            }
            let icon,
                link,
                item;
            $('#n-app').empty();
            $.each(response, function (key, val) {
                count++;
                item = '<div class="feed-body-content">\n' +
'                            <p class="feed-body-header">'+jQuery.timeago(val.date_created)+'</time></p>\n' +
'                            <div class="row">\n' +
'                                <span class="col-md-3" style="padding-right: 0"><i class="fa fa-table fa-4x"></i></span>\n' +
'                                <a href="#" class="col-md-9" style="padding-left: 10px;font-size: 14px">'+val.description+'\n' +
'                                    <div class="client-notification">\n' +
'                                        <img class="user-avatar rounded-circle" src="/images/admin.jpg" alt="User Avatar"\n' +
'                                             style="">\n' +
'                                            <p>'+val.user+'</p>\n' +
'                         <small onclick="markAsViewed('+val.notification_id+')" class="feed-content-menu float-right" style="margin-top: 50px">Mark as Viewed</small>\n'+
'                                    </div>\n' +
'                                 </a>\n' +
'                            </div>\n' +
'                        </div>'
                $('#n-app').append(item);
            });
            if (count === 0)
                $('#mark-all').attr("disabled", true);
            $('#noti-info').html(count+ ' notification(s).');
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
            status = true
            cats = response;
            let count = response.length,
                item;
            $('#n-settings-panel').empty();
            $('#n-settings-panel').append('<h6>Manage Notifications</h6><br/>');
            for (let i = 0; i < count; i++){
                let v = response[i];
                if (v.compulsory === '1'){
                    item = '<input type="checkbox" id="category'+v.category+'" disabled="disabled" checked/>&nbsp;&nbsp;<label for = "'+v.category_name+'">'+v.category_name+'</label><hr style="padding-top: 0px"/>'
                }
                else{
                    if (v.state){
                        if (v.state === '1'){
                            item = '<input type="checkbox" id="category'+v.category+'" checked/>&nbsp;&nbsp;<label for = "'+v.category_name+'">'+v.category_name+'</label><hr style="padding-top: 0px"/>'
                        } else {
                            item = '<input type="checkbox" id="category'+v.category+'"/>&nbsp;&nbsp;<label for = "'+v.category_name+'">'+v.category_name+'</label><hr style="padding-top: 0px"/>'
                        }
                    } else {
                        item = '<input type="checkbox" id="category'+v.category+'"/>&nbsp;&nbsp;<label for = "'+v.category_name+'">'+v.category_name+'</label><hr style="padding-top: 0px"/>'
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
    $('#noti-settings').hide();
    $('#noti-back').show()
    $('#n-settings-panel').slideDown('slow');
    list_categories();
    $('#n-dropdown').hide();
    $('#n-app').hide();
}

function back(){
    $('#noti-settings').show();
    $('#noti-back').hide();
    notifications();
    $('#n-dropdown').slideUp('slow');
    $('#n-dropdown').show();
    $('#n-settings-panel').hide();
}

function savePreferences(){
    var obj = {};
    var arr = [];
    var i = 0; var j = 0;
    for (let a = 0; a < cats.length; a++){
        let rd; let wt;
        let rt = ($('#category'+cats[a]["category"]).prop('checked')) ? 1 : 0;
        arr[a]=[cats[a]["category"], rt];
    }

    obj.userid = JSON.parse(localStorage.user_obj).ID;
    obj.cats = arr;
    var test = [];
    $.ajax({
        'url': '/notifications/savePreferences/'+JSON.parse(localStorage.user_obj).ID,
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
            else{
                swal("Success!", "Notification Preferences Set!", "success");
                $('#n-dropdown').slideUp('slow');
                $('#n-settings-panel').hide();
                setTimeout(function () {
                    notifications();
                }, 5000);
                $('#noti-count').hide();
            }
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
            status = true;
            setTimeout(function () {
                notifications();
            }, 10000);
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
            status = true;
            setTimeout(function () {
                notifications();
            }, 10000);
            $('#noti-count').hide();}
    });
}

jQuery(document).ready(function() {
    // setTimeout(function () {
    //     getNotifications();
    // }, 10000);
    getNotifications();
    // load_notifications(JSON.parse(localStorage.notifications));
});