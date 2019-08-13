jQuery(document).ready(function($){
    let $invoices = $("#invoices");
    $invoices.sortable();
    $invoices.disableSelection();
    $('.dropdown-toggle').dropdown();
    $('body').tooltip({
        selector: '[data-toggle="tooltip"]'
    });
});