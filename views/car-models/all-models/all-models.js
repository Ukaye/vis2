$(document).ready(function() {
    //$('#bootstrap-data-table-export').DataTable();
    $('table.table table-striped table-bordered').dataTable();
    loadMakes();
} );

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

var myTable = $('#makes')
    .DataTable({
        bAutoWidth: false,
        "aoColumns": [
            { "bSortable": true }
            //null, null, null, { "bSortable": false },
        ],
        "aaSorting": [],
        "bFilter": false,
        "bInfo" : false,
        select: {
            style: 'multi'
        }
    });

var myTable2 = $('#models')
    .DataTable({
        bAutoWidth: false,
        "aoColumns": [
            { "bSortable": true },
            null
            // , null, { "bSortable": false },
        ],
        "aaSorting": [],
        // "bFilter": false,
        // "bInfo" : false,
        select: {
            style: 'multi'
        }
    });

$(document).on("click", ".brand", function (e) {
    var id = $(this).attr("id");
    $('#brand_name').html(': '+id);
    loadModels(id);
});

function loadMakes(){

    $.ajax({
        'url': '/makes-list',
        'type': 'get',
        'data': {},
        'success': function (data) {
            var brands = JSON.parse(data);
            populateBrandsTable(brands);
        },
        'error': function (err) {
            //alert ('Error');
            console.log(err);
        }
    });

}

function loadModels(make){
    console.log(make);
    var id = make;
    console.log(id);
    $.ajax({
        'url': '/models-list/'+id,
        'type': 'get',
        'data': {},
        'success': function (data) {
            var models = JSON.parse(data);
            populateModelsTable(models);
        },
        'error': function (err) {
            //alert ('Error');
            console.log(err);
        }
    });
}

function populateModelsTable(models){
    // clear the table before populating it with more data
    $("#models").dataTable().fnClearTable();
    var action = '<a href="#" class="edit" title="Edit client" data-post-id="1" data-act="ajax-modal" data-title="Edit client" data-action-url="http://localhost:8888/proman/index.php/clients/modal_form"><i class="fa fa-pencil"></i>Edit</a>'+
        '<a href="#" title="Delete client" class="delete" data-id="1" data-action-url="http://localhost:8888/proman/index.php/clients/delete" data-action="delete"><i class="fa fa-times fa-fw"></i>Delete</a>';
    $.each(models, function(k, v){
        //console.log("Here");
        $('#models').dataTable().fnAddData( [
            v.model, v.year
            // "Make",
            // "Make",
            // action
        ]);
    });
}

function populateBrandsTable(data) {
    // clear the table before populating it with more data
    $("#bootstrap-data-table").dataTable().fnClearTable();
    var length = data.length;
    var action = '<a href="#" class="edit" title="Edit client" data-post-id="1" data-act="ajax-modal" data-title="Edit client" data-action-url="http://localhost:8888/proman/index.php/clients/modal_form"><i class="fa fa-pencil"></i>Edit</a>'+
        '<a href="#" title="Delete client" class="delete" data-id="1" data-action-url="http://localhost:8888/proman/index.php/clients/delete" data-action="delete"><i class="fa fa-times fa-fw"></i>Delete</a>';
    $.each(data, function(k, v){
        var make = '<td><span role="button" id = "'+v.make+'" class="brand">'+v.make+'</span></td>';
        $('#makes').dataTable().fnAddData( [
            make
            // "Make",
            // "Make",
            // action
        ]);
    });
}