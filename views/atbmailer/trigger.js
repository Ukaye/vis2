$(document).ready(function() {
        
    CKEDITOR.replace( 'triggerContent' );

    CKEDITOR.config.mentions = [
        {
            feed: [ 'username', 'first_name', 'middle_name', 'last_name', 'full_name', 'date_created', 'phone', 'address', 'email', 'dob', 'marital_status', 'loan_officer', 'client_state', 'postcode', 'client_country', 'years_add', 'ownership', 'employer_name', 'industry', 'job', 'salary', 'job_country', 'off_address', 'off_state', 'doe', 'gender', 'branch', 'bank', 'account', 'account_name', 'bvn', 'client_description', 'name', 'web_address', 'state', 'country'],
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
