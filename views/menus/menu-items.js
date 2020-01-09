$(document).ready(function () {
    includeHTML();
    $body.delegate('.locked', 'click', function(event) {
        return swal({
            title: 'You do not have licence for this module!',
            text: 'Please contact your admin to purchase the necessary licence.',
            icon: 'warning',
            timer: 1000
        });
    });
    $body.delegate('#menuToggle', 'click', function (event) {
        $('body').toggleClass('open');
    });
    $body.delegate('.search-trigger', 'click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        $('.search-trigger').parent('.header-left').addClass('open');
    });
    $body.delegate('.search-close', 'click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        $('.search-trigger').parent('.header-left').removeClass('open');
    });
});

function check() {
    if (localStorage.getItem('role') !== 1) {
        jQuery('#car-models').hide();
        jQuery('#new-user').hide();
        jQuery('#models-card').hide();
        jQuery('#user').html(localStorage.getItem("name"));
        jQuery('#message').html("Welcome, " + localStorage.getItem("name"));
    } else {
        jQuery('#user').html(localStorage.getItem("name"));
        jQuery('#message').html("Welcome, " + localStorage.getItem("name"));
    }
}

function read_write() {
    let w,
        perms = JSON.parse(localStorage.getItem("permissions")),
        page = (window.location.pathname.split('/')[1].split('.'))[0];
    perms.forEach(function (k, v) {
        if (k.module_name === page) {
            w = $.grep(perms, function (e) {
                return e.id === parseInt(k.id);
            });
        }
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1))
        $(".write").hide();
}

function loadMenus() {
    let modules = {};
    modules = JSON.parse(localStorage.getItem("modules"));
    modules.forEach(function (k, v) {
        if (k.menu_name === 'Sub Menu') {
            let main = $.grep(modules, function (e) {
                return e.id === parseInt(k.main_menu);
            });
            if (main && main[0])
                $('#' + $(main[0]['module_tag']).attr('id') + ' > .sub-menu').append(k.module_tag);
        } else if (k.menu_name === 'Main Menu') {
            $('#sidebar').append(k.module_tag);
            $('#' + $(k.module_tag).attr('id')).append(
                '<ul class="sub-menu children dropdown-menu"></ul>');
        } else {
            $('#' + k.module_name).show();
        }
    });
    $.ajax({
        type: "GET",
        url: "/user/all-applications",
        success: function (response) {
            $.each(response, function (k, v) {
                $('#applications-badge').html(v.applications);
            });
        }
    });
    $.ajax({
        type: "GET",
        url: "/client/applications/web/count",
        success: function (data) {
            $('#web-requests-badge').html(data.response);
        }
    });
}

function includeHTML() {
    let z, i, elmnt, file, xhttp;
    z = document.getElementsByTagName("*");
    for (i = 0; i < z.length; i++) {
        elmnt = z[i];
        file = elmnt.getAttribute("include-html");
        if (file) {
            xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        elmnt.innerHTML = this.responseText;
                    }
                    if (this.status === 404) {
                        elmnt.innerHTML = "Page not found.";
                    }
                    elmnt.removeAttribute("include-html");
                    includeHTML();
                }
            };
            xhttp.open("GET", file, true);
            xhttp.send();
            return;
        }
    }
    check();
    read_write();
    loadMenus();
    const TENANT = JSON.parse(localStorage.user_obj).tenant || 'Finratus';
    document.title = `${TENANT} ${(location.pathname.replace(/[^a-zA-Z0-9]/g,' ')).trim()}`;
    $('#left-panel').find('a.navbar-brand:first').text(TENANT);
}

function logout() {
    localStorage.login = "0";
    window.location.href = "/logout";
}

// notifications bar
const $body = $('body');
$(function () {
    $body.delegate('.close', 'click', function () {
        $("#notification-pane").addClass("d-none")
    });
    $body.delegate('.notification-tab-toggler', 'click', function (e) {
        e.preventDefault(); // stops link from making page jump to the top
        e.stopPropagation(); // when you click the button, it stops the page from seeing it as clicking the body too
        $("#notification-pane").toggleClass("d-none")

    });
    $body.delegate('#notification-pane', 'click', function (e) {
        e.stopPropagation(); // when you click within the content area, it stops the page from seeing it as clicking the body too

    });
    $body.click(function () {
        $('#notification-pane').addClass("d-none");
    });
    $body.delegate('.close', '.click', function () {
        $("#message-pane").addClass("d-none")
    });
    $body.delegate('.message-tab-toggler', 'click', function (e) {
        e.preventDefault(); // stops link from making page jump to the top
        e.stopPropagation(); // when you click the button, it stops the page from seeing it as clicking the body too
        $("#message-pane").toggleClass("d-none")

    });
    $body.delegate('#message-pane', '.click', function (e) {
        e.stopPropagation(); // when you click within the content area, it stops the page from seeing it as clicking the body too
    });
    $body.click(function () {
        $('#message-pane').addClass("d-none");
    });
    $body.delegate('.feed-content-menu', 'click', function (e) {
        e.preventDefault(); // stops link from making page jump to the top
        e.stopPropagation(); // when you click the button, it stops the page from seeing it as clicking the body too
        $("#feed-content-menu-drp-dwn").toggleClass("d-none")
    });
    $body.click(function () {
        $('.feed-content-menu-drp-dwn').addClass("d-none");
    });
    $body.delegate('.dropdown-item', 'click', function () {
        $('.feed-content-menu-drp-dwn').addClass("d-none");
    });
    $body.delegate('.tab-content', 'click', function () {
        $('.feed-content-menu-drp-dwn').addClass("d-none");
    });
});

$body.delegate('.message-content-menu', 'click', function (e) {
    e.preventDefault(); // stops link from making page jump to the top
    e.stopPropagation(); // when you click the button, it stops the page from seeing it as clicking the body too
    $("#message-content-menu-drp-dwn").toggleClass("d-none")
});
$body.click(function () {
    $('.message-content-menu-drp-dwn').addClass("d-none");
});
$body.delegate('.dropdown-item', 'click', function () {
    $('.message-content-menu-drp-dwn').addClass("d-none");
});
$body.delegate('.tab-content', 'click', function () {
    $('.message-content-menu-drp-dwn').addClass("d-none");
});