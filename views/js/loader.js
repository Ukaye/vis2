let status = true;
$(document).ajaxStart(function(){
    if (status)
        $("#wait").css("display", "block");
});

$(document).ajaxComplete(function(){
    if (status)
        $("#wait").css("display", "none");
});