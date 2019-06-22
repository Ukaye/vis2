jQuery(document).ready(function($){
    let $invoices = $("#invoices"),
        $payments = $("#payments");
    $invoices.sortable();
    $payments.sortable();
    $invoices.disableSelection();
    $payments.disableSelection();

    //delete done task from "already done"
    $('.todolist').on('click','.remove-item',function(){
        removeItem(this);
    });

    //remove done task from list
    function removeItem(element){
        $(element).parent().remove();
    }
});