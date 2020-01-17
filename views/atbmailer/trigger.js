$(document).ready(function() {
        
    CKEDITOR.replace( 'triggerContent' );

    CKEDITOR.config.mentions = [
        {
            feed: [ 'username', 'fullname', 'phone', 'address', 'branch', 'supervisor'],
            minChars: 0,
            marker: '@'
        }
    ];
})

function saveTrigger() {
        let obj = {
            triggerName: $(triggerName).val(),
            triggerSubject: $(triggerSubject).val(),
            triggerContent: CKEDITOR.instances.triggerContent.getData()
        }
        
        $.ajax({
            'url': '/atbmailer/trigger/save/',
            'type': 'post',
            'data': obj,
            'success': function (data) {
                $(triggerName).val('');
                $(triggerSubject).val('');
                CKEDITOR.instances.triggerContent.setData('');
                $('#wait').hide();
                swal(data.response,"","success");
            }
        });
    }
