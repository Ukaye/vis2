jQuery(document).ready(function() {
    jQuery(".standardSelect").chosen({
        disable_search_threshold: 10,
        no_results_text: "Oops, nothing found!",
        width: "100%"
    });
    getMakes();
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

function getMakes(){
    $.ajax({
        'url': '/makes-list',
        'type': 'get',
        'data': {},
        'success': function (data) {
            var make = $("[id=make]");
            make.empty().append('<option selected="selected" id="0" make="0">-- Choose Vehicle Make --</option>');
            $.each(JSON.parse(data), function (key, val) {
                $("#make").append('<option class="deptSp" value = "' + val.make + '" id="' + val.make + '">' + val.make + '</option>');
            });
        }
    });
}

$("#submit").click(function () {
    validate();
});

function validate(){
    if ($('#make').find('option:selected').attr('make') == 0){
        swal('Select a Vehicle!');
    }
    else if ($('#model').val() == "" || $('#model').val() == null){
        swal('Enter a model!');
    }
    else if ($('#year').val() == '' || $('#year').val() == null){
        swal('Enter a production year!');
    }
    else{
        registerModel();
    }
}

function registerModel(){
    var obj = {};
    obj.Make = $('#make').find('option:selected').text();
    obj.Model = $('#model').val();
    obj.Year = $('#year').val();
    var test = {};
    //console.log(obj);
    $.ajax({
        'url': '/new-model',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.status == 500){
                swal("Please recheck entered values");
            }
            else
                swal("Model Registered!");
        }
    });
}