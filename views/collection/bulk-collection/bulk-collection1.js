jQuery(document).ready(function($){
    let $invoices = $("#invoices"),
        $payments = $("#payments");
    $invoices.sortable();
    $payments.sortable();
    $invoices.disableSelection();
    $payments.disableSelection();
});