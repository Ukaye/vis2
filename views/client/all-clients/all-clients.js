$(document).ready(function() {
    getOfficers();
    read_write_custom();
});

let client_id;

let currentTab = 0;
showTab(currentTab);


function validateSalary(){
    let salary = $('#salary').val();
    if (parseFloat(salary) <= 0){
        return swal('', 'Please Enter a Valid Salary Amount', 'warning');
    }
}

function showTab(n) {
    let x = document.getElementsByClassName("tab");
    x[n].style.display = "block";
    if (n === 0) {
        document.getElementById("prevBtn").style.display = "none";
    } else {
        document.getElementById("prevBtn").style.display = "inline";
    }
    if (n === (x.length - 1)) {
        document.getElementById("nextBtn").innerHTML = "Submit";
    } else {
        document.getElementById("nextBtn").innerHTML = "Next";
    }
    fixStepIndicator(n)
}

function nextPrev(n) {
    let x = document.getElementsByClassName("tab");
    if (!($('#loan_officer').find('option:selected').attr('id') === '0') && !($('#branch').find('option:selected').attr('id') === '0')){

        if(validateEmail($('#email').val())){
            if (n === 1 && !validateForm()){
                swal('Empty Field(s)!', 'Fill all required fields', 'warning');
                return false;
            }
        }else{
            swal('', 'Please Enter a Valid Email', '', 'warning');
            return false;
        }

    }else{
        swal ({"icon": "warning", "text": "Choose a valid Loan Officer & Branch" });
        return false;
    }

    x[currentTab].style.display = "none";
    currentTab = currentTab + n;
    if (currentTab >= x.length) {
        submitDetails();
        return false;
    }
    showTab(currentTab);
}

function validateForm() {
    let x, y, i, valid = true;
    x = document.getElementsByClassName("tab");
    y = x[currentTab].getElementsByClassName("imp");
    for (i = 0; i < y.length; i++) {
        if (y[i].value === "") {
            y[i].className += " invalid";
            valid = false;
        }
    }

    if (valid) {
        document.getElementsByClassName("step")[currentTab].className += " finish";
    }
    return valid;
}

function fixStepIndicator(n) {
    let i, x = document.getElementsByClassName("step");
    for (i = 0; i < x.length; i++) {
        x[i].className = x[i].className.replace(" active", "");
    }
    x[n].className += " active";
}

function validateEmail(email) {
    let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

$(document).ajaxStart(function(){
    $("#wait").css("display", "block");
});

$(document).ajaxComplete(function(){
    $("#wait").css("display", "none");
});

let results;

function validate(){
    if ($('#new-password').val() == "" || $('#new-password').val() == null){
        $('#password-error').html("Enter password");
        $('#password-error').css("color", "red");
        $('#new-password').css("border-color", "red");
        $('#pass-error').css("color", "red");
        $('#pass-error').html("Unable to submit. Check information entered.");
    }
    else {
        changePassword();
    }
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

function loadUsers(id){
    let start = $("#startDate").val(),
        end = $("#endDate").val(),
        uid = id || '',
        url;
    url = (start === "" || start === null || end === "" || end === null ) ? 'user/clients-list-full/'+uid : 'user/clients-list-full/'+uid+'?start='+start+'&&end='+end;
    $('#wait').show();
    $.ajax({
        'url': url,
        'type': 'get',
        'success': function (data) {
            $('#wait').hide();
            let users = JSON.parse(data);
            results = users;
            populateDataTable(users);
        },
        'error': function (err) {
            $('#wait').hide();
            console.log(err);
        }
    });

}

function read_write_custom(){
    let w,
        perms = JSON.parse(localStorage.getItem("permissions")),
        page = (window.location.pathname.split('/')[1].split('.'))[0],
        clientsList = ($.grep(perms, function(e){return e.module_name === 'clientsList';}))[0],
        editLoanOfficer = ($.grep(perms, function(e){return e.module_name === 'editLoanOfficer';}))[0];
    perms.forEach(function (k){
        if (k.module_name === page)
            w = $.grep(perms, function(e){return e.id === parseInt(k.id);});
    });
    if (w && w[0] && (parseInt(w[0]['editable']) !== 1))
        $(".write").hide();

    if (!editLoanOfficer || editLoanOfficer['read_only'] !== '1')
        $('#loan_officer').prop('disabled', true);
    if (clientsList && clientsList['read_only'] === '1'){
        loadUsers();
    } else {
        loadUsers((JSON.parse(localStorage.user_obj)).ID);
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

$("#filterclients").submit(function (e) {
    e.preventDefault();

    let start = $("#startDate").val(),
        end = $("#endDate").val(),
        type = $("#type-filter").val(),
        url = '/user/clients-list-full?start='+start+'&&end='+end;
    if (!start || !end)
        return loadUsers();

    $.ajax({
        'url': url,
        'type': 'get',
        'success': function (data) {
            populateDataTable(JSON.parse(data));
        },
        'error': function (err) {
            console.log(err);
        }
    });
});

function formatDate(timestamp) {
    timestamp = parseInt(timestamp);
    let date =  new Date(timestamp);
    return date.toLocaleString();
}

function populateDataTable(data) {
    $("#bootstrap-data-table").DataTable().clear();
    let processed_data = [];
    $.each(data, function(k, v){
        let actions;
        if (v.status === "1"){
            actions = '<a href="./client-info?id='+v.ID+'" class="write btn btn-primary "><i class="fa fa-tasks"></i> View Profile</a>'+
                '<button onclick="confirm('+v.ID+')" class="write btn btn-danger "><i class="fa fa-trash"></i> Disable Client</button>'
        }
        else {
            actions = '<button id="'+v.ID+'" name="'+v.ID+'" onclick="confirmEnable('+v.ID+')" class="write btn btn-success "><i class="fa fa-lightbulb-o"></i> Enable Client</button>';
        }
        v.actions = actions;
        processed_data.push(v);
    });
    $('#bootstrap-data-table').DataTable({
        dom: 'Blfrtip',
        bDestroy: true,
        data: processed_data,
        search: {search: ' '},
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        columns: [
            { data: "ID" },
            { data: "username" },
            { data: "fullname" },
            { data: "loan_officer_name" },
            { data: "date_created" },
            { data: "actions" }
        ]
    });
}

function confirm(id) {
    swal({
        title: "Disable this client?",
        text: "Click OK to continue",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                disableClient(id);
            }
        });
}

function confirmEnable(id) {
    swal({
        title: "Reactivate this client?",
        text: "Click OK to continue",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                enableClient(id);
            }
        });
}

function disableClient(id){
    let test = {};
    $.ajax({
        'url': '/user/del-client/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Please Retry Action!");
            }
            else{
                swal("Client Disabled Successfully!");
                loadUsers();
            }
        },
        'error': function(e){
            swal('Internet Connection Error!');
        }
    });
}

function enableClient(id){
    let test = {};
    $.ajax({
        'url': '/user/en-client/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Please Retry Action!");
            }
            else{
                swal("Client Enabled Successfully!");
                loadUsers();
            }
        },
        'error': function(e){
            swal('Internet Connection Error!');
        }
    });
}

function openDetailsModal(id) {
    localStorage.setItem("user_id",id);
    let data = ($.grep(results, function(e){ return e.ID === id; }))[0],
        tbody = $("#details"),
        tr = "";
    tbody.empty();
    if (data.fullname)
        tr += "<tr><td><strong>Fullname</strong></td><td>"+data.fullname+"</td></tr>";
    if (data.username)
        tr += "<tr><td><strong>Username</strong></td><td>"+data.username+"</td></tr>";
    if (data.email)
        tr += "<tr><td><strong>Email</strong></td><td>"+data.email+"</td></tr>";
    if (data.phone)
        tr += "<tr><td><strong>Phone</strong></td><td>"+data.phone+"</td></tr>";
    if (data.address)
        tr += "<tr><td><strong>Address</strong></td><td>"+data.address+"</td></tr>";
    if (data.Role)
        tr += "<tr><td><strong>User Role</strong></td><td>"+data.Role+"</td></tr>";
    if (data.date_created)
        tr += "<tr><td><strong>Date Created</strong></td><td>"+formatDate(data.date_created)+"</td></tr>";
    tbody.html(tr);
}

function getOfficers(){
    $.ajax({
        type: "GET",
        url: "/user/loan-officers/",
        success: function (response) {
            let role = $("[id=loan_officer]");
            role.empty().append('<option selected="selected" id="0">-- Choose Loan Officer --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#loan_officer").append('<option value = "' + val.ID + '" id="' + val.ID + '">' + val.fullname + '</option>');
            });
            getBranches();
        }
    });
}

function getBranches(){
    $.ajax({
        type: "GET",
        url: "/user/branches/",
        success: function (response) {
            let branch = $("[id=branch]");
            branch.empty().append('<option id="0" value ="0">-- Select a Branch --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#branch").append('<option value = "' + val.id + '" id="' + val.id + '">' + val.branch_name + '</option>');
            });
            getBanks();
        }
    });
}

function getBanks(){
    $.ajax({
        type: "GET",
        url: "/user/banks/",
        success: function (response) {
            let bank = $("[id=bank]");
            bank.empty().append('<option id="0" value ="0">-- Select a Bank --</option>');
            $.each(response, function (key, val) {
                $("#bank").append(`<option value = "${val.code}" id="${val.code}">${val.name} (${val.authorization})</option>`);
            });
            getCountries();
        }
    });
}

function getCountries(){
    $.ajax({
        type: "GET",
        url: "/user/countries",
        success: function (response) {
            let country = $("[id*=country]");
            country.empty().append('<option id="0" value="0">-- Select Country --</option>');
            $.each(JSON.parse(response), function (key, val) {
                country.append('<option value = "' + val.id + '" id="' + val.id + '">' + val.country_name + '</option>');
            });
            getStates();
        }
    });
}

function getStates(){
    $.ajax({
        type: "GET",
        url: "/user/states",
        success: function (response) {
            let state = $("[id*=state]");
            state.empty().append('<option id="0" value="0">-- Select State --</option>');
            $.each(JSON.parse(response), function (key, val) {
                state.append('<option value = "' + val.id + '" id="' + val.id + '">' + val.state + '</option>');
            });
            checkForEdit();
        }
    });
}

function edit(){
    getRoles();
    $('#wait').show();
    $('#myModal').modal('hide');
    $.ajax({
        'url': '/user/client-dets/'+localStorage.getItem("user_id"),
        'type': 'get',
        'success': function (data) {
            $('#wait').hide();
            $('#user-form').slideDown();
            $('#user-table').slideToggle();
            let fullname = data[0].fullname;
            $('#first_name').val(fullname.split(' ')[0]);
            $('#middle_name').val(fullname.split(' ')[1]);
            $('#last_name').val(fullname.split(' ')[2]);
            $('#phone').val(data[0].phone);
            $('#address').val(data[0].address);
            $('#email').val(data[0].email);
            $('#dob').val(data[0].dob);
            $('#gender').val(data[0].gender);
            $('#postcode').val(data[0].postcode);
            $('#branch').val(data[0].branch);
            $('#bank').val(data[0].bank);
            $('#account').val(data[0].account);
            $('#client_country').val(data[0].client_country);
            $('#marital_status').val(data[0].marital_status);
            $('#loan_officer').val(data[0].loan_officer);
            $('#client_state').val(data[0].client_state);
            $('#years_add').val(data[0].years_add);
            $('#ownership').val(data[0].ownership);
            $('#employer_name').val(data[0].employer_name);
            $('#industry').val(data[0].industry);
            $('#job').val(data[0].job);
            $('#salary').val(data[0].salary);
            $('#job_country').val(data[0].job_country);
            $('#off_address').val(data[0].off_address);
            $('#off_state').val(data[0].off_state);
            $('#doe').val(data[0].doe);
            $('#guarantor_name').val(data[0].guarantor_name);
            $('#guarantor_occupation').val(data[0].guarantor_occupation);
            $('#relationship').val(data[0].relationship);
            $('#years_known').val(data[0].years_known);
            $('#guarantor_phone').val(data[0].guarantor_phone);
            $('#guarantor_email').val(data[0].guarantor_email);
            $('#guarantor_address').val(data[0].guarantor_address);
            $('#gua_country').val(data[0].gua_country);
            $("#email").prop("readonly", true);
            $("#phone").prop("readonly", true);
            loadImages(data[0].phone);
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Oops! An error occurred while retrieving details.');
        }
    });
}

function checkForEdit(){
    const urlParams = new URLSearchParams(window.location.search);
    const application_id = urlParams.get('id');

    if (application_id){
        client_id = application_id;
        $('#new_edit').html("Edit Client");
        $.ajax({
            'url': '/user/client-dets/'+client_id,
            'type': 'get',
            'success': function (data) {
                $('#client_name').html(data[0].fullname);
                $('#user-form').slideDown();
                $('#user-table').slideToggle();
                let fullname = data[0].fullname;
                $('#first_name').val(fullname.split(' ')[0]);
                $('#middle_name').val(fullname.split(' ')[1]);
                $('#last_name').val(fullname.split(' ')[2]);
                $('#phone').val(data[0].phone);
                $('#address').val(data[0].address);
                $('#email').val(data[0].email);
                $('#dob').val(data[0].dob);
                $('#gender').val(data[0].gender);
                $('#postcode').val(data[0].postcode);
                $('#branch').val(data[0].branch);
                $('#bank').val(data[0].bank);
                $('#account').val(data[0].account);
                $('#client_country').val(data[0].client_country);
                $('#marital_status').val(data[0].marital_status);
                $('#loan_officer').val(data[0].loan_officer);
                $('#client_state').val(data[0].client_state);
                $('#years_add').val(data[0].years_add);
                $('#ownership').val(data[0].ownership);
                $('#employer_name').val(data[0].employer_name);
                $('#industry').val(data[0].industry);
                $('#job').val(data[0].job);
                $('#salary').val(data[0].salary);
                $('#job_country').val(data[0].job_country);
                $('#off_address').val(data[0].off_address);
                $('#off_state').val(data[0].off_state);
                $('#doe').val(data[0].doe);
                $('#guarantor_name').val(data[0].guarantor_name);
                $('#guarantor_occupation').val(data[0].guarantor_occupation);
                $('#relationship').val(data[0].relationship);
                $('#years_known').val(data[0].years_known);
                $('#guarantor_phone').val(data[0].guarantor_phone);
                $('#guarantor_email').val(data[0].guarantor_email);
                $('#guarantor_address').val(data[0].guarantor_address);
                $('#gua_country').val(data[0].gua_country);
                $("#email").prop("readonly", true);
                $("#phone").prop("readonly", true);
                loadImages(data[0].phone);
            },
            'error': function (err) {
                swal('Oops! An error occurred while retrieving details.');
            }
        });
    }
}

function submitDetails(){
    const url = new URLSearchParams(window.location.search);
    const user_id = url.get('id');
    let ed;
    ed = (user_id) ? user_id : localStorage.getItem("user_id");
    let obj = {};
    obj.username = $('#email').val();
    obj.fullname = $('#first_name').val() + ' '+ $('#middle_name').val() + ' ' +$('#last_name').val();
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
    obj.years_add = $("#years_add").val();
    obj.ownership = $('#ownership').find('option:selected').attr('id');
    obj.employer_name = $("#employer_name").val();
    obj.industry = $('#industry').find('option:selected').text();
    obj.job = $("#job").val();
    obj.salary = $("#salary").val();
    obj.job_country = $('#job_country').find('option:selected').attr('id');
    obj.off_address = $("#off_address").val();
    obj.off_state = $('#off_state').find('option:selected').attr('id');
    obj.doe = $("#doe").val();
    obj.guarantor_name = $("#guarantor_name").val();
    obj.guarantor_occupation = $("#doe").val();
    obj.relationship = $("#relationship").val();
    obj.years_known = $("#years_known").val();
    obj.guarantor_phone = $("#guarantor_phone").val();
    obj.guarantor_email = $("#guarantor_email").val();
    obj.guarantor_address = $("#guarantor_address").val();
    obj.gua_country = $('#gua_country').find('option:selected').attr('id');
    let test={};
    $.ajax({
        'url': '/user/edit-client/'+ed,
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.response === null){
                swal('Error!', "Action could not be completed! Please try again", 'error');
            }
            else
                swal('Success!', "Client Details Updated!", 'success');
            window.location.href = "./all-clients";
        },
        'error': function (err) {
            swal('Error!', 'No Internet Connection.', 'error');
        }
    });
}

function upload(i){
    let name = $('#first_name').val() + ' '+ $('#middle_name').val() + ' ' +$('#last_name').val(); let folder_name = " ";
    if ($('#email').val() === "" || $('#email').val() === "null"){
        swal('Please Enter Client Email!');
    }
    else {
        folder_name = $('#phone').val();
    }
    let file; let item;
    if (i === 1){
        file = $('#file-upload')[0].files[0];
        item ="Image";
    }else if (i === 2){
        file = $('#file-upload-signature')[0].files[0]
        item = "Signature";
    }else if (i === 3){
        file = $('#file-upload-idcard')[0].files[0]
        item = "ID Card";
    }
    if (file === "undefined") {
        swal ("Choose file to upload");
    }else{
        let formData = new FormData();
        formData.append('file', file); formData.append('type', i);
        $.ajax({
            url: "user/upload-file/"+folder_name+'/'+item,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                swal("File Uploaded Successfully!");
            },
            error: function() {
                swal("Error! Please Try Again");
            }
        });
    }
}

function loadImages(phone){
    let $carousel_inner = $('.carousel-inner');
    $.ajax({
        'url': '/profile-images/'+phone,
        'type': 'get',
        'success': function (data) {
            let res = JSON.parse(data);
            if(res.status === 500){
                swal({"icon": "info", "text": "No Image Uploaded!"});
            }
            else{
                $.each(res['response'], function (key, value){
                    let image = '<div class="col-sm-4">'+
                        '<a href="#">'+
                        '<img src="'+value+'" alt="Image" style="max-width:100%;" height = 200 width = 200>'+
                        '</a>'+
                        '<div style="text-align: center"><strong>'+key+' </strong></div>'+
                        '</div>';
                    $carousel_inner.append(image);
                });
            }
        }
    });
}