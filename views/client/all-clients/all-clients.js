$(document).ready(function() {
    getOfficers();
    read_write_custom();
    corporatesDataTable();
});

let client_id,
    edit_client;

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
            swal('', 'Please Enter a Valid Email', 'warning');
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

function read_write(){
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
                '<button onclick="disableClient('+v.ID+')" class="write btn btn-danger "><i class="fa fa-trash"></i> Disable Client</button>'
        }
        else {
            actions = '<button id="'+v.ID+'" name="'+v.ID+'" onclick="enableClient('+v.ID+')" class="write btn btn-success "><i class="fa fa-lightbulb-o"></i> Enable Client</button>';
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

function disableClient(id, type){
    swal({
        title: "Disable this client?",
        text: "Click OK to continue",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                let test = {},
                    url = (type === 'corporate')? `/client/corporate/disable/${id}` : `/user/del-client/${id}`;
                $.ajax({
                    'url': url,
                    'type': 'post',
                    'data': {},
                    'success': function (data) {
                        if (type !== 'corporate')
                            test = JSON.parse(data);
                        if(test.status === 500){
                            swal("Please Retry Action!");
                        }
                        else{
                            swal("Client Disabled Successfully!");
                            if (type === 'corporate') {
                                window.location.reload();
                            } else {
                                read_write_custom();
                            }
                        }
                    },
                    'error': function(e){
                        swal('Internet Connection Error!');
                    }
                });
            }
        });
}

function enableClient(id, type){
    swal({
        title: "Reactivate this client?",
        text: "Click OK to continue",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                let test = {},
                    url = (type === 'corporate')? `/client/corporate/enable/${id}` : `/user/en-client/${id}`;
                $.ajax({
                    'url': url,
                    'type': 'post',
                    'data': {},
                    'success': function (data) {
                        if (type !== 'corporate')
                            test = JSON.parse(data);
                        if(test.status === 500){
                            swal("Please Retry Action!");
                        }
                        else{
                            swal("Client Enabled Successfully!");
                            if (type === 'corporate') {
                                window.location.reload();
                            } else {
                                read_write_custom();
                            }
                        }
                    },
                    'error': function(e){
                        swal('Internet Connection Error!');
                    }
                });
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
        url: "/user/users-list/",
        success: function (response) {
            let role = $("[id=loan_officer]");
            let role2 = $("[id=loan_officer2]");
            role.empty().append('<option selected="selected" id="0">-- Choose Loan Officer --</option>');
            role2.empty().append('<option selected="selected">-- Choose Loan Officer --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#loan_officer").append('<option value = "' + val.ID + '" id="' + val.ID + '">' + val.fullname + '</option>');
                $("#loan_officer2").append('<option value = "' + val.ID + '">' + val.fullname + '</option>');
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
            let branch2 = $("[id=branch2]");
            branch.empty().append('<option id="0" value ="0">-- Select a Branch --</option>');
            branch2.empty().append('<option value ="0">-- Select a Branch --</option>');
            $.each(JSON.parse(response), function (key, val) {
                $("#branch").append('<option value = "' + val.id + '" id="' + val.id + '">' + val.branch_name + '</option>');
                $("#branch2").append('<option value = "' + val.id + '">' + val.branch_name + '</option>');
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
            let bank2 = $("[id=bank2]");
            bank.empty().append('<option id="0" value ="0">-- Select a Bank --</option>');
            bank2.empty().append('<option value ="0">-- Select a Bank --</option>');
            $.each(response, function (key, val) {
                $("#bank").append(`<option value = "${val.code}" id="${val.code}">${val.name} (${val.authorization})</option>`);
                $("#bank2").append(`<option value = "${val.code}">${val.name} (${val.authorization})</option>`);
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
            edit_client = data[0];
            switch (data[0].client_type){
                case 'individual': {
                    $('#user-form').slideDown();
                    break;
                }
                case 'business_individual': {
                    $('#user-form2').slideDown();
                    break;
                }
            }
            $('#user-table').slideToggle();
            $('#user-table2').hide();
            let fullname = data[0].fullname;
            $('#first_name').val(data[0].first_name);
            $('#middle_name').val(data[0].middle_name);
            $('#last_name').val(data[0].last_name);
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
            $('#bvn').val(data[0].bvn);
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
            $('#ind_kin_fullname').val(data[0].kin_fullname);
            $('#ind_kin_phone').val(data[0].kin_phone);
            $('#ind_kin_relationship').val(data[0].kin_relationship);
            $("#email").prop("readonly", true);
            $("#phone").prop("readonly", true);
            let folder = data[0].fullname + '_' + data[0].email;
            loadImages(folder);



            $('#first_name2').val(fullname.split(' ')[0]);
            $('#middle_name2').val(fullname.split(' ')[1]);
            $('#last_name2').val(fullname.split(' ')[2]);
            $('#phone2').val(data[0].phone);
            $('#address2').val(data[0].address);
            $('#email2').val(data[0].email);
            $('#branch2').val(data[0].branch);
            $('#bank2').val(data[0].bank);
            $('#account2').val(data[0].account);
            $('#loan_officer2').val(data[0].loan_officer);
            $('#bvn2').val(data[0].bvn);
            $('#product_sold').val(data[0].product_sold);
            $('#capital_invested').val(data[0].capital_invested);
            $('#market_name').val(data[0].market_name);
            $('#market_years').val(data[0].market_years);
            $('#market_address').val(data[0].market_address);
            $('#kin_fullname').val(data[0].kin_fullname);
            $('#kin_phone').val(data[0].kin_phone);
            $('#kin_relationship').val(data[0].kin_relationship);
            $("#email2").prop("readonly", true);
            $("#phone2").prop("readonly", true);
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
        $('#client_type').hide();
        $('#new_edit').html("Edit Client");
        $('#new_edit2').html("Edit Client");
        $.ajax({
            'url': '/user/client-dets/'+client_id,
            'type': 'get',
            'success': function (data) {
                edit_client = data[0];
                switch (data[0].client_type){
                    case 'individual': {
                        $('#user-form').slideDown();
                        break;
                    }
                    case 'business_individual': {
                        $('#user-form2').slideDown();
                        break;
                    }
                }
                switch (data.client_type){
                    case 'individual': {
                        $('#user-form').slideDown();
                        break;
                    }
                    case 'business_individual': {
                        $('#user-form2').slideDown();
                        break;
                    }
                }
                $('#client_name').html(data[0].fullname);
                $('#user-table').slideToggle();
                $('#user-table2').hide();
                let fullname = data[0].fullname;
                $('#first_name').val(data[0].first_name);
                $('#middle_name').val(data[0].middle_name);
                $('#last_name').val(data[0].last_name);
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
                $('#bvn').val(data[0].bvn);
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
                $('#ind_kin_fullname').val(data[0].kin_fullname);
                $('#ind_kin_phone').val(data[0].kin_phone);
                $('#ind_kin_relationship').val(data[0].kin_relationship);
                $("#email").prop("readonly", true);
                $("#phone").prop("readonly", true);
                let folder = data[0].fullname + '_' + data[0].email;
                loadImages(folder);



                $('#first_name2').val(fullname.split(' ')[0]);
                $('#middle_name2').val(fullname.split(' ')[1]);
                $('#last_name2').val(fullname.split(' ')[2]);
                $('#phone2').val(data[0].phone);
                $('#address2').val(data[0].address);
                $('#email2').val(data[0].email);
                $('#branch2').val(data[0].branch);
                $('#bank2').val(data[0].bank);
                $('#account2').val(data[0].account);
                $('#loan_officer2').val(data[0].loan_officer);
                $('#bvn2').val(data[0].bvn);
                $('#product_sold').val(data[0].product_sold);
                $('#capital_invested').val(data[0].capital_invested);
                $('#market_name').val(data[0].market_name);
                $('#market_years').val(data[0].market_years);
                $('#market_address').val(data[0].market_address);
                $('#kin_fullname').val(data[0].kin_fullname);
                $('#kin_phone').val(data[0].kin_phone);
                $('#kin_relationship').val(data[0].kin_relationship);
                $("#email2").prop("readonly", true);
                $("#phone2").prop("readonly", true);
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
    obj.first_name = $.trim($('#first_name').val());
    obj.middle_name = $.trim($('#middle_name').val());
    obj.last_name = $.trim($('#last_name').val());
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
    obj.industry = $('#industry').find('option:selected').val();
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
    obj.kin_fullname = $('#ind_kin_fullname').val();
    obj.kin_phone = $('#ind_kin_phone').val();
    obj.kin_relationship = $('#ind_kin_relationship').val();



    if (edit_client.client_type === 'business_individual') {
        obj.username = $('#email2').val();
        obj.fullname = $('#first_name2').val() + ' '+ $('#middle_name2').val() + ' ' +$('#last_name2').val();
        obj.phone = $('#phone2').val();
        obj.address = $('#address2').val();
        obj.branch = $('#branch2').val();
        obj.bank = $('#bank2').val();
        obj.account = $('#account2').val();
        obj.loan_officer = $('#loan_officer2').val();
        obj.bvn = $('#bvn2').val();
        obj.product_sold = $('#product_sold').val();
        obj.capital_invested = $('#capital_invested').val();
        obj.market_name = $('#market_name').val();
        obj.market_years = $('#market_years').val();
        obj.market_address = $('#market_address').val();
        obj.kin_fullname = $('#kin_fullname').val();
        obj.kin_phone = $('#kin_phone').val();
        obj.kin_relationship = $('#kin_relationship').val();
    }

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
    var name = $('#first_name').val() + ' '+ $('#middle_name').val() + ' ' +$('#last_name').val(); var folder_name = " ";
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
        item ="Image";
    }else if (i === 2){
        file = $('#file-upload-signature')[0].files[0]
        item = "Signature";
    }else if (i === 3){
        file = $('#file-upload-idcard')[0].files[0]
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
                swal('Error', "Connection Error. Please Try Again", 'error');
            }
        });
    }
}

function loadImages(folder){
    let $carousel_inner = $('.carousel-inner');
    $.ajax({
        'url': '/profile-images/'+folder,
        'type': 'get',
        'success': function (data) {
            let res = JSON.parse(data);
            if(res.status === 500){
                notification('No Image Uploaded!', '', 'info');
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

/**
 Business Individual & Corporate Client Updates*/
let table = {};

$('#client_type').change(function (e) {
    switch (e.target.value) {
        case 'non_corporate': {
            $('#user-table').show();
            $('#user-table2').hide();
            break;
        }
        case 'corporate': {
            $('#user-table').hide();
            $('#user-table2').show();
            break;
        }
    }
});

function corporatesDataTable() {
    table = $('#corporates').DataTable({
        dom: 'Blfrtip',
        bProcessing: true,
        bServerSide: true,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [
                {
                    name: 'ID',
                    query: `ORDER BY ID ${aoData[2].value[0].dir}`
                },
                {
                    name: 'name',
                    query: `ORDER BY name ${aoData[2].value[0].dir}`
                },
                {
                    name: 'business_name',
                    query: `ORDER BY business_name ${aoData[2].value[0].dir}`
                },
                {
                    name: 'client',
                    query: `ORDER BY client ${aoData[2].value[0].dir}`
                },
                {
                    name: 'date_created',
                    query: `ORDER BY date_created ${aoData[2].value[0].dir}`
                },
                {
                    name: 'action',
                    query: `ORDER BY ID ${aoData[2].value[0].dir}`
                }
            ];
            $.ajax({
                dataType: 'json',
                type: "GET",
                url: `/client/corporates/get`,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    fnCallback(data)
                }
            });
        },
        aoColumnDefs: [
            {
                sClass: "numericCol",
                aTargets: [0],
                sType: "numeric"
            }
        ],
        columns: [
            {
                data: "ID",
                width: "1%",
                className: "text-right"
            },
            {
                data: "name",
                width: "25%"
            },
            {
                data: "business_name",
                width: "20%"
            },
            {
                data: "client",
                width: "20%"
            },
            {
                data: "date_created",
                width: "15%"
            },
            {
                width: "19%",
                mRender: function (data, type, full) {
                    let actions;
                    if (full.status === 1){
                        actions = `<a class="btn btn-info btn-sm" href="/client-info?id=${full.clientID}">
                                        <i class="fa fa-tasks"></i> View Contact</a> 
                                   <a class="btn btn-danger btn-sm" onclick="disableClient(${full.ID}, 'corporate')">
                                        <i class="fa fa-trash"></i> Disable</a>`
                    } else {
                        actions = `<a class="btn btn-success btn-sm" onclick="enableClient(${full.ID}, 'corporate')">
                                        <i class="fa fa-lightbulb-o"></i> Enable</a>`;
                    }
                    return actions;
                }
            }
        ]
    });
}