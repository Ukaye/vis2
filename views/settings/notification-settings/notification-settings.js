$(document).ready(function() {
    $('#bootstrap-data-table-export').DataTable();
    getCats();
});

$("#submit-activity").click(function () {
    validateCategory();
});

function validateCategory(){
    if ($('#new-cat').val() == "" || $('#new-cat').val() == null){
        swal('Empty field!', 'Enter a Valid Category Name.', 'warning');
    }else{
        saveNewCategoryType();
    }
}

function saveNewCategoryType(){
    var obj = {};
    obj.cat = $('#new-cat').val();
    if (!(obj.cat).replace(/\s/g, '').length)
        return swal('No text entered!', 'Enter a valid category name!', 'warning');
    if ($('#comp-cat').is(':checked'))
        obj.compulsory = 1;
    else
        obj.compusory = 0;
    var test={};
    $.ajax({
        'url': '/notifications/new-category/',
        'type': 'post',
        'data': obj,
        'success': function (data) {
            $.each(JSON.parse(data), function (key, val) {
                test[key] = val;
            });
            if(test.message){
                $('#new-cat').val("");
                swal("Category already exists!","","error");
            }
            else if(test.status == 500){
                $('#new-cat').val("");
                swal("","Unable to submit. Please try again!","error");
            }
            else
            {$('#new-cat').val(""); swal("New Category Registered!","","success"); getCats();}
        }
    });
}

var myTable = $('#cat-table')
    .DataTable({
        bAutoWidth: false,
        "aoColumns": [
            { "bSortable": true }, { "bSortable": false }, null
            //null, null, null, { "bSortable": false },
        ],
        "aaSorting": [],
        "bSearchable": true,
        select: {
            style: 'multi'
        }
    });

var myTable2 = $('#role-table')
    .DataTable({
        bAutoWidth: false,
        "aoColumns": [
            { "bSortable": true },
            null
//                , { "bSortable": false },{ "bSortable": false }
            // , null, { "bSortable": false },
        ],
        "aaSorting": [],
        "bSearchable": false,
        "bFilter": false,
        // "bInfo" : false,
        select: {
            style: 'multi'
        },
        "paging": false
    });

let role = localStorage.getItem("selectedRole");

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

function edit(category){
    $.ajax({
        'url': '/notifications/category-dets/'+category,
        'type': 'get',
        'success': function (data) {
            $('#new-cat').val(data[0].category_name);
            if (data[0].compulsory === '1'){
                $('#comp-cat').prop('checked','checked');
            }
        },
        'error': function (err) {
            swal('Oops!', 'An error occurred while retrieving details.','error');
        }
    });
}

let glob={};
function getCats(){
    $.ajax({
        type: "GET",
        url: "/notifications/categories-list/",
        data: '{}',
        success: function (response) {
            glob = response;
            $("#cat-table").dataTable().fnClearTable();
            $.each(response, function (key, val) {
                let action, icon, set = '';
                action = '<a class="btn btn-info" onclick="edit('+val.id+')" title="Click to edit"><i class="ace-icon fa fa-pencil bigger-130"></i></a> &nbsp; &nbsp;'
                if (val.compulsory === "1"){
                    icon = '<input type="checkbox" id="cat'+val.id+'" checked>';
//                        icon = '<span class="label label-success" style="background-color:green; color:white; padding: 5px; border-radius: 5px">Compulsory</span>';
                }
                else {
                    set = '<a href="#" class="btn btn-info" onclick="loadRolesConfig('+val.id+')" title="Click to configure for roles"><i class="ace-icon fa fa-gear bigger-130"></i> Configure Roles</a> &nbsp; &nbsp;';
                    icon = '<input type="checkbox" id="cat'+val.id+'">';
//                        icon = '<span class="label label-success" style="background-color:grey; color:white; padding: 5px; border-radius: 5px">Non - Compulsory</span>';
                }
                $('#cat-table').dataTable().fnAddData( [
                    val.category_name, icon, set
                ]);
            });
        }
    });
}

let cat, roles;
function loadRolesConfig(id){
    cat = id;
    $.each($.grep(glob, function(e){return e.id === id;}), function(k, v){
        let name = v.category_name;
    });
    if (cat !== 0)
        $('#selectedName').html('- '+name);
    $.ajax({
        type: "GET",
        url: "/notifications/notification-roles-config?bugger="+id,
        success: function (response) {
            roles = response;
            $('#role-table').dataTable().fnClearTable();
            let action;
            $.each(response, function (key, val) {
                if (val.state){
                    if (val.state === '1'){
                        action = '<input type="checkbox" id="con'+val.role_id+'" checked>';
                    } else {
                        action = '<input type="checkbox" id="con'+val.role_id+'" >';
                    }
                } else {
                    action = '<input type="checkbox" id="con'+val.role_id+'" >';
                }
                $('#role-table').dataTable().fnAddData( [
                    val.role_name, action
                ]);
            });
        }
    });
}

$(document).on("click", "#submit", function (e) {
    (cat === 0) ? swal('No category chosen!', 'Please select a category.', 'warning') : saveConfig(cat);
});

$(document).on("click", "#save-cat", function (e) {
    updateCategories();
});

function saveConfig(cat){
    var obj = {};
    var arr = [];
    var i = 0; var j = 0;
    for (let a = 0; a < roles.length; a++){
        let rd; let wt;
        let st = ($('#con'+roles[a]["role_id"]).prop('checked')) ? 1 : 0;
        arr[a]=[roles[a]["role_id"], st];
    }

    obj.category = cat;
    obj.cats = arr;
    var test = [];
    $.ajax({
        'url': 'notifications/saveConfig/'+cat,
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
                swal("Success!", "Category Configuration Set!", "success");
            }
        }
    });
}

function updateCategories(){
    var obj = {};
    var arr = [];
    var i = 0; var j = 0;
    for (let a = parseInt(glob[1]['id']), b = 0; a < parseInt(parseInt(glob[1]['id']) + glob.length), b < glob.length; a++, b++){
        console.log('a: '+a);
        let mand = ($('#cat'+glob[b]["id"]).prop('checked')) ? 1 : 0;
        arr[b]=[glob[b]["id"], mand];
        console.log(arr);
    }
    obj.cats = arr;
    var test = [];
    $.ajax({
        'url': 'notifications/updateCategories/',
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
                swal("Success!", "Categories Updated!", "success");
                getCats();
            }
        }
    });
}

function confirm(id) {
    // approveInspection(status, "Passed");
    swal({
        title: "Disable this category?",
        text: "Click OK to continue",
        //icon: "input",
        //content: "input",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                disableCat(id);
            }
        });
}

function disableCat(id){
    var test = {};
    $.ajax({
        'url': '/notifications/del-category/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Failed!", 'Unable to submit request.', 'error');
            }
            else{
                swal("Category Disabled Successfully!", '', 'success');
                getCats();
            }
        },
        'error': function(e){
            swal('Error', 'Internet Connection Error!', 'error');
        }
    });
}

function confirmEnable(id) {
    // approveInspection(status, "Passed");
    swal({
        title: "Re-enable this Category?",
        text: "Click OK to continue",
        //icon: "input",
        //content: "input",
        buttons: true,
        closeModal: false
    }).then(
        function(isConfirm) {
            if (isConfirm){
                enableCat(id);
            }
        });
}

function enableCat(id){
    var test = {};
    $.ajax({
        'url': '/notifications/en-category/'+id,
        'type': 'post',
        'data': {},
        'success': function (data) {
            test = JSON.parse(data);
            if(test.status === 500){
                swal("Failed!", 'Unable to submit request', 'error');
            }
            else{
                swal("Category Enabled Successfully!", '', 'success');
                getCats();
            }
        },
        'error': function(e){
            swal('Error', 'Internet Connection Error!', 'error');
        }
    });
}

let results;

function formatDate(timestamp) {
    timestamp = parseInt(timestamp);
    let date =  new Date(timestamp);
    return date.toLocaleString();
}

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