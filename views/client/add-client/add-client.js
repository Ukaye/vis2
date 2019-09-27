jQuery(document).ready(function() {
//        notifications();
    getOfficers();
    getBranches();
    getBanks();
    getCountries();
    getStates();
    getClients();
});
let $ = jQuery.noConflict();
var currentTab = 0; // Current tab is set to be the first tab (0)
showTab(currentTab); // Display the current tab

function validateSalary(){
    let salary = $('#salary').val();
    if (parseFloat(salary) <= 0){
        return swal('', 'Please Enter a Valid Salary Amount', 'warning');
    }
}

function showTab(n) {
    // This function will display the specified tab of the form ...
    var x = document.getElementsByClassName("tab");
    x[n].style.display = "block";
    // ... and fix the Previous/Next buttons:
    if (n == 0) {
        document.getElementById("prevBtn").style.display = "none";
    } else {
        document.getElementById("prevBtn").style.display = "inline";
    }
    if (n == (x.length - 1)) {
        document.getElementById("nextBtn").innerHTML = "Submit";
    } else {
        document.getElementById("nextBtn").innerHTML = "Next";
    }
    // ... and run a function that displays the correct step indicator:
    fixStepIndicator(n)
}

function nextPrev(n) {
    // This function will figure out which tab to display
    var x = document.getElementsByClassName("tab");
    // Exit the function if any field in the current tab is invalid:
    if (!($('#loan_officer').find('option:selected').attr('id') === '0') && !($('#branch').find('option:selected').attr('id') === '0')){

        if(validateEmail($('#email').val())){
            if (n == 1 && !validateForm()){
                swal('Empty Field(s)!', 'Fill all required fields', 'warning');
                return false;
            }
        }else{
            swal('', 'Please Enter a Valid Client Email', 'warning');
            return false;
        }

    }else{
        swal ({"icon": "warning", "text": "Choose a valid Loan Officer & Branch" });
        return false;
    }
    if (($('#bank').find('option:selected').attr('id') === '0') || ($('#bvn').val() === '') || ($('#account').val() === '')){
        swal ({"icon": "warning", "text": "Complete Client's Bank Information" });
        return false;
    }
    if (currentTab === 2){
        if ($.trim($('#guarantor_email').val()) !== ''){
            if (!(validateEmail($('#guarantor_email').val()))){
                // obj.guarantor_email = $("#guarantor_email").val();
                swal('', 'Please Enter a Valid Email for the Reference', 'warning');
                return false;
            }
        }
    }

    //return false;
//        if (n == 1) return false;
    // Hide the current tab:
    if (currentTab !== x.length)
        x[currentTab].style.display = "none";
    // Increase or decrease the current tab by 1:
    currentTab = currentTab + n;
    // if you have reached the end of the form... :
    if (currentTab >= x.length) {
        //...the form gets submitted:
//            document.getElementById("regForm").submit();
        createClient();
        return false;
    }
    // Otherwise, display the correct tab:
    showTab(currentTab);
}

function validateForm() {
    // This function deals with validation of the form fields
    var x, y, i, valid = true;
    x = document.getElementsByClassName("tab");
//        y = x[currentTab].getElementsByTagName("input");
    y = x[currentTab].getElementsByClassName("imp");
    // A loop that checks every input field in the current tab:
    for (i = 0; i < y.length; i++) {
        // If a field is empty...
        if (y[i].value == "") {
            // add an "invalid" class to the field:
            y[i].className += " invalid";
            // and set the current valid status to false:
            valid = false;
        }
    }
    // If the valid status is true, mark the step as finished and valid:
    if (valid) {
        document.getElementsByClassName("step")[currentTab].className += " finish";
    }
    return valid; // return the valid status
}

function fixStepIndicator(n) {
    // This function removes the "active" class of all steps...
    var i, x = document.getElementsByClassName("step");
    for (i = 0; i < x.length; i++) {
        x[i].className = x[i].className.replace(" active", "");
    }
    //... and adds the "active" class to the current step:
    x[n].className += " active";
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

function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function confirmPassword(){
    if ($('#cpassword').val() == "" || $('#cpassword').val() != $('#password').val()){
        $('#cpassword').css('border-color', 'red');
        $('#cpassword-error').html("Passwords don't match");
        $('#cpassword-error').css("color", 'red');
    }
    else{
        $('#cpassword').css('border-color', 'green');
        $('#cpassword-error').html("Passwords are a match!");
        $('#cpassword-error').css("color", 'green');
    }
}

function getOfficers(){
    $.ajax({
        type: "GET",
        url: "/user/loan-officers/",
        data: '{}',
        success: function (response) {
            var role = $("[id=loan_officer]");
            var role2 = $("[id=loan_officer2]");
            role.empty().append('<option selected="selected" id="0">-- Choose Loan Officer --</option>');
            role2.empty().append('<option selected="selected">-- Choose Loan Officer --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#loan_officer").append('<option value = "' + val.ID + '" id="' + val.ID + '">' + val.fullname + '</option>');
                $("#loan_officer2").append('<option value = "' + val.ID + '">' + val.fullname + '</option>');
            });
        }
    });
}

function getBranches(){
    $.ajax({
        type: "GET",
        url: "/user/branches/",
        data: '{}',
        success: function (response) {
            var branch = $("[id=branch]");
            var branch2 = $("[id=branch2]");
            branch.empty().append('<option id="0">-- Select a Branch --</option>');
            branch2.empty().append('<option>-- Select a Branch --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#branch").append('<option value = "' + val.id + '" id="' + val.id + '">' + val.branch_name + '</option>');
                $("#branch2").append('<option value = "' + val.id + '">' + val.branch_name + '</option>');
            });
        }
    });
}

function getBanks(){
    $.ajax({
        type: "GET",
        url: "/user/banks/",
        success: function (response) {
            let bank = $("[id=bank]");
            let bank2 = $("[id=bank2]");
            bank.empty().append('<option id="0" value ="0">-- Select a Bank --</option>');
            bank2.empty().append('<option id="0" value ="0">-- Select a Bank --</option>');
            $.each(response, function (key, val) {
                $("#bank").append(`<option value = "${val.code}" id="${val.code}">${val.name} (${val.authorization})</option>`);
                $("#bank2").append(`<option value = "${val.code}" id="${val.code}">${val.name} (${val.authorization})</option>`);
            });
        }
    });
}

function getCountries(){
    $.ajax({
        type: "GET",
        url: "/user/countries/",
        data: '{}',
        success: function (response) {
            var country = $("[id*=country]");
            country.empty().append('<option id="0">-- Select Country --</option>');
            $.each(JSON.parse(response), function (key, val) {
                country.append('<option value = "' + val.id + '" id="' + val.id + '">' + val.country_name + '</option>');
            });
        }
    });
}

function getStates(){
    $.ajax({
        type: "GET",
        url: "/user/states/",
        data: '{}',
        success: function (response) {
            var state = $("[id*=state]");
            state.empty().append('<option id="0">-- Select State --</option>');
            $.each(JSON.parse(response), function (key, val) {
                state.append('<option value = "' + val.id + '" id="' + val.id + '">' + val.state + '</option>');
            });
        }
    });
}

// $("#phone").on("keyup", function () {
//     let val = $("#phone").val();
//     $("#phone").val(numbersOnly(val));
// });
//
// $("#bvn").on("keyup", function () {
//     let val = $("#bvn").val();
//     $("#bvn").val(numbersOnly(val));
// });
//
// $("#account").on("keyup", function () {
//     let val = $("#account").val();
//     $("#account").val(numbersOnly(val));
// });

$("#years_add").on("keyup", function () {
    let val = $("#years_add").val();
    $("#years_add").val(numbersOnly(val));
});

$("#years_known").on("keyup", function () {
    let val = $("#years_known").val();
    $("#years_known").val(numbersOnly(val));
});

$("#salary").on("keyup", function () {
    let val = $("#salary").val();
    $("#salary").val(numberToCurrencyformatter(val));
    validateSalary();
});

function createClient(){
    var obj = {};
    obj.username = $('#email').val();
    obj.first_name = $.trim($('#first_name').val());
    obj.middle_name = $.trim($('#middle_name').val());
    obj.last_name = $.trim($('#last_name').val());
    obj.fullname = $.trim($('#first_name').val()) + ' '+ $.trim($('#middle_name').val()) + ' ' +$.trim($('#last_name').val());
    obj.phone = $('#phone').val();
    obj.address = $('#address').val();
    obj.email = $('#email').val();
    obj.gender = $('#gender').find('option:selected').attr('value');
    obj.dob= $("#dob").val();
    obj.marital_status = $('#marital_status').find('option:selected').attr('value');
    obj.loan_officer = $('#loan_officer').find('option:selected').attr('id');
    obj.branch = $('#branch').find('option:selected').attr('id');
    obj.bvn= $("#bvn").val();
    obj.account= $("#account").val();
    obj.bank = $('#bank').find('option:selected').attr('id');
    obj.client_state = $('#client_state').find('option:selected').attr('id');
    obj.postcode = $("#postcode").val();
    obj.client_country = $('#client_country').find('option:selected').attr('id');
    obj.years_add = numbersOnly($("#years_add").val());
    obj.ownership = $('#ownership').find('option:selected').attr('id');
    obj.employer_name = $("#employer_name").val();
    obj.industry = $('#industry').find('option:selected').val();
    obj.job = $("#job").val();
    obj.salary = currencyToNumberformatter($("#salary").val());
    obj.job_country = $('#job_country').find('option:selected').attr('id');
    obj.off_address = $("#off_address").val();
    obj.off_state = $('#off_state').find('option:selected').attr('id');
    obj.doe = $("#doe").val();
    obj.guarantor_name = $("#guarantor_name").val();
    obj.guarantor_occupation = $("#doe").val();
    obj.relationship = $("#relationship").val();
    obj.years_known = numbersOnly($("#years_known").val());
    obj.guarantor_phone = $("#guarantor_phone").val();
    obj.guarantor_email = $("#guarantor_email").val();
    obj.guarantor_address = $("#guarantor_address").val();
    obj.gua_country = $('#gua_country').find('option:selected').attr('id');
    obj.kin_fullname = $('#ind_kin_fullname').val();
    obj.kin_phone = $('#ind_kin_phone').val();
    obj.kin_relationship = $('#ind_kin_relationship').val();
    obj.images_folder = obj.first_name + ' ' + obj.middle_name + ' ' + obj.last_name + '_' + obj.email;

    var test={};
    $.ajax({
        'url': '/user/new-client/',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.message){
                var clients = [];
                for (var i = 0; i < (test.response).length; i++){
                    clients += ', '+test.response[i]["fullname"];
                }
                return swal({icon: 'info', text: "Information already exists for client(s)"+clients});
            }
            if(test.bvn_exists){
                let client = test.response[0]['fullname'];
                return swal({icon: 'info', text: "BVN already exists for client, "+client});
            }
            else if(test.status == 500){
                return swal('Failed!', "Unable to Create Client.", 'error');
            }
            else{
                swal('Success!', "Client Information Registered!", 'success');
                window.location.href = "./add-client";
            }
        }
    });

}

function upload(i){
    if ($.trim($('#first_name').val()) === '' || $.trim($('#first_name').val()) === null){
        return swal('Incomplete Information', 'Please Enter Client First Name!', 'warning');
    }
    if ($.trim($('#last_name').val()) === '' || $.trim($('#last_name').val()) === null){
        return swal('Incomplete Information', 'Please Enter Client Last Name!', 'warning');
    }
    var name = $.trim($('#first_name').val()) + ' '+ $.trim($('#middle_name').val()) + ' ' +$.trim($('#last_name').val()); var folder_name = " ";
    if ($('#email').val() === "" || $('#email').val() === null){
        return swal('Incomplete Information', 'Please Enter Client Email!', 'warning');
    }
    else {
        if (validateEmail($('#email').val()))
            folder_name = name + '_' + $('#email').val();
        else
            return swal('', 'Please Enter a Valid Email', 'warning');
    }
    var file; var item;
    if (i === 1){
        file = $('#file-upload')[0].files[0];
        let ext = file["name"].split('.').pop().toLowerCase();
        if($.inArray(ext, ['gif','png','jpg','jpeg']) == -1) {
            return swal('Upload Failed!', 'Invalid file extension', 'warning');
        }
        item ="Image";
    }else if (i === 2){
        file = $('#file-upload-signature')[0].files[0];
        let ext = file["name"].split('.').pop().toLowerCase();
        if($.inArray(ext, ['gif','png','jpg','jpeg']) == -1) {
            return swal('Upload Failed!', 'Invalid file extension', 'warning');
        }
        item = "Signature";
    }else if (i === 3){
        file = $('#file-upload-idcard')[0].files[0];
        let ext = file["name"].split('.').pop().toLowerCase();
        if($.inArray(ext, ['gif','png','jpg','jpeg']) == -1) {
            return swal('Upload Failed!', 'Invalid file extension', 'warning');
        }
        item = "ID Card";
    }
    if (!file) {
        return swal ('No File Chosen!', "Choose file to upload", 'warning');
    }else{
        var formData = new FormData();
        formData.append('file', file); formData.append('type', i);
        $.ajax({
            url: "/user/upload-file/"+folder_name+'/'+item,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                swal('Success', "File Uploaded Successfully!", 'success');
            },
            error: function() {
                swal('Failed', "Error! Please Try Again", 'error');
            }
        });
    }
}



/**
Business Individual Client Updates*/
$('#client_type').change(function (e) {
    switch (e.target.value) {
        case 'individual': {
            $('#user-form').show();
            $('#user-form2').hide();
            $('#user-form3').hide();
            break;
        }
        case 'business_individual': {
            $('#user-form').hide();
            $('#user-form2').show();
            $('#user-form3').hide();
            break;
        }
        case 'corporate': {
            $('#user-form').hide();
            $('#user-form2').hide();
            $('#user-form3').show();
            break;
        }
        default: {
            $('#user-form').hide();
            $('#user-form2').hide();
            $('#user-form3').hide();
        }
    }
});

$("#capital_invested").on("keyup", function () {
    let val = $("#capital_invested").val();
    $("#capital_invested").val(numberToCurrencyformatter(val));
});

$("#market_years").on("keyup", function () {
    let val = $("#market_years").val();
    $("#market_years").val(numbersOnly(val));
});

function createBusinessIndividual() {
    let obj = {},
        test = {};
    obj.fullname = $('#first_name2').val() + ' '+ $('#middle_name2').val() + ' ' +$('#last_name2').val();
    obj.loan_officer = $('#loan_officer2').val();
    obj.branch = $('#branch2').val();
    obj.bvn = $('#bvn2').val();
    obj.bank = $('#bank2').val();
    obj.account = $('#account2').val();
    obj.email = $('#email2').val();
    obj.phone = $('#phone2').val();
    obj.address = $('#address2').val();
    obj.product_sold = $('#product_sold').val();
    obj.capital_invested = currencyToNumberformatter($('#capital_invested').val());
    obj.market_name = $('#market_name').val();
    obj.market_years = numbersOnly($('#market_years').val());
    obj.market_address = $('#market_address').val();
    obj.kin_fullname = $('#kin_fullname').val();
    obj.kin_phone = $('#kin_phone').val();
    obj.kin_relationship = $('#kin_relationship').val();

    if (!$('#first_name2').val() || !$('#last_name2').val() || (obj.loan_officer === '-- Choose Loan Officer --') || (obj.branch === '-- Select a Branch --')
        || !obj.email || !obj.phone) {
        return notification('Kindly fill all required fields!', '', 'warning');
    }
    obj.username = obj.email;
    obj.client_type = $('#client_type').val();

    $.ajax({
        'url': '/user/new-client',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.message){
                let clients = [];
                for (let i = 0; i < (test.response).length; i++){
                    clients += ', '+test.response[i]["fullname"];
                }
                return notification(`Information already exists for client(s) ${clients}`, '', 'info');
            }
            if(test.bvn_exists){
                let client = test.response[0]['fullname'];
                return swal({icon: 'info', text: "BVN already exists for client, "+client});
            }
            else if(test.status === 500){
                return notification('Failed!', 'Unable to Create Client.', 'error');
            }
            else{
                notification('Success!', 'Client Information Registered!', 'success');
                window.location.href = "./add-client";
            }
        }
    });
}



/**
 Corporate Client Updates*/
$("#industry2").select2();
$('#industry2').change(function (e) {
    if (e.target.value === 'other') {
        $('#industry2_div').show();
    } else {
        $('#industry2_div').hide();
    }
});
function getClients() {
    $.ajax({
        type: 'GET',
        url: '/user/users-list-v2',
        success: function (response) {
            $.each(JSON.parse(response), function (key, val) {
                $("#contact_person").append(`<option value = "${val.ID}">${val.fullname} &nbsp; (${val.username})</option>`);
            });
            $("#contact_person").select2();
        }
    });
}

function createCorporate() {
    let obj = {};
    obj.name = $('#name').val();
    obj.clientID = $('#contact_person').val();
    obj.phone = $('#phone3').val();
    obj.email = $('#email3').val();
    obj.web_address = $('#web_address').val();
    obj.address = $('#address3').val();
    if ($('#client_state3').val() !== '-- Select State --')
        obj.state = $('#client_state3').val();
    if ($('#client_country3').val() !== '-- Select Country --')
        obj.country = $('#client_country3').val();
    obj.postcode = $('#postcode3').val();
    obj.business_name = $('#business_name').val();
    obj.business_phone = $('#business_phone').val();
    obj.business_type = $('#business_type').val();
    obj.tax_id = $('#tax_id').val();
    if ($('#industry2').val() !== '-- Select Industry --')
        obj.industry = ($('#industry2').val() === 'other')? $('#industry2_').val() : $('#industry2').val();
    obj.registration_date = $('#registration_date').val();
    obj.incorporation_date = $('#incorporation_date').val();
    obj.commencement_date = $('#commencement_date').val();
    obj.registration_number = $('#registration_number').val();
    obj.created_by = (JSON.parse(localStorage.user_obj)).ID;

    if (!obj.name || !obj.business_name || (obj.clientID === '-- Choose Client --')) {
        return notification('Kindly fill all required fields!', '', 'warning');
    }

    $.ajax({
        'url': '/client/corporate/create',
        'type': 'post',
        'data': obj,
        'success': function (response) {
            if(response.status === 500){
                notification(response.error, '', 'error');
            }
            else{
                notification('Success!', 'Client Information Registered!', 'success');
                window.location.href = "./add-client";
            }
        }
    });
}
