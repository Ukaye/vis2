$(document).ready(function() {
    // jQuery(".standardSelect").chosen({
    //     disable_search_threshold: 10,
    //     no_results_text: "Oops, nothing found!",
    //     width: "100%"
    // });
    getOwners();
    getMakes();
});

$("#make").on('change', function () {
    var selectedID = $(this).find('option:selected').attr('id');
    getModels(selectedID);
});

$("#registerVehicle").click(function () {
    validate();
});

function validate(){
    if ($('#number_plate').val() == "" || $('#number_plate-error').val() == null){
        $('#number_plate-error').html("Vehicle Must Have Number Plate");
        $('#number_plate-error').css("color", "red");
        $('#submit-error').css("color", "red");
        $('#submit-error').html("Unable to submit. Check information entered.");
    }
    else if ($('#owner').find('option:selected').attr('id') == 0){
        $('#owner_error').html("Choose a Vehicle Owner");
        $('#owner_error').css("color", "red");
        $('#submit-error').css("color", "red");
        $('#submit-error').html("Unable to submit. Check information entered.");
    }
    else{
        registerVehicle();
    }
}

function getOwners(){
    $.ajax({
        type: "GET",
        url: "/user/owners/",
        data: '{}',
        success: function (response) {
            var owner = $("[id*=owner]");
            owner.empty().append('<option selected="selected" id="0">-- Select Vehicle Owner --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#owner").append('<option class="deptSp" value = "' + val.fullname + '" id="' + val.ID + '">' + val.fullname + '</option>');
            });
        }
    });
}

function getMakes(){
    $.ajax({
        'url': '/makes-list',
        'type': 'get',
        'data': {},
        'success': function (data) {
            var make = $("[id=make]");
            make.empty().append('<option selected="selected" id="0">-- Choose Vehicle Make --</option>');
            $.each(JSON.parse(data), function (key, val) {
                $("#make").append('<option class="deptSp" value = "' + val.make + '" ID="' + val.make + '" spec="' + val.ID + '">' + val.make + '</option>');
            });
        }
    });
}

function getModels(make){
    var id = make;
    $.ajax({
        'url': '/models-list/'+id,
        'type': 'get',
        'data': {},
        'success': function (data) {
            var model = $("[id=model]");
            model.empty().append('<option selected="selected" id="0">-- Choose Vehicle Model --</option>');
            $.each(JSON.parse(data), function (key, val) {
                $("#model").append('<option class="deptSp" value = "' + val.model + '" ID="' + val.ID + '" spec="' + val.ID + '">' + val.model + ' ( '+val.year+ ' )</option>');
            });
        }
    });
}

function registerVehicle(){
    var obj = {};
    obj.Mileage = $('#mileage').val();
    obj.Number_Plate = $('#number_plate').val();
    obj.Price = $('#price').val();
    obj.owner = $('#owner').find('option:selected').attr('id');
    obj.Make = $('#make').find('option:selected').text();
    obj.Model = $('#model').find('option:selected').text();
    obj.Year = $('#year').find('option:selected').text();
    obj.Bought_Condition = $('#condition').find('option:selected').text();
    obj.Transmission = $('#transmission').find('option:selected').text();
    obj.Fuel_Type = $('#fuel_type').find('option:selected').text();
    obj.Engine_Capacity = $('#capacity').find('option:selected').text();
    obj.Color = $('#color').find('option:selected').text();
    obj.Registered_City = $('#reg-city').find('option:selected').text();
    obj.Location = $('#location').find('option:selected').text();

    var vehiclePayload = JSON.stringify(obj);
    var test = {};
    //console.log(obj);
    $.ajax({
        'url': '/addVehicle',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.status == 500){
                swal('Error!', "Unable to register vehicle.","error");
            }
            else
                swal('Success!', "Vehicle Registered Successfully.","success");
        },
        'error': function(){
            swal('Error', 'Internet Connection Problem. Please Try Again.', 'error');
        }
    });
}

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