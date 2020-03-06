$(document).ready(function() {
        
    $('#emailContent').summernote({
        focus: true,
        hint: {
            mentions: [ 'username', 'first_name', 'middle_name', 'last_name', 'fullname', 'date_created', 'phone', 'address', 'email', 'dob', 'marital_status', 'loan_officer', 'client_state', 'postcode', 'client_country', 'years_add', 'ownership', 'employer_name', 'industry', 'job', 'salary', 'job_country', 'off_address', 'off_state', 'doe', 'gender', 'branch', 'bank', 'account', 'account_name', 'bvn', 'client_description', 'name', 'web_address', 'state', 'country'],
            match: /\B~(\w*)$/,
            search: function (keyword, callback) {
              callback($.grep(this.mentions, function (item) {
                return item.indexOf(keyword) == 0;
              }));
            },
            content: function (item) {
              return '~' + item;
            }    
          }
        });
        $('.note-icon-caret').hide();
        $('.note-popover').hide();
        $('.note-insert').hide();
        //$('.note-view').hide();
})

function saveTrigger() {
        let obj = {
            triggerName: $(triggerName).val(),
            triggerSubject: $(triggerSubject).val(),
            triggerContent: $('#emailContent').summernote('code')
        }
        
        if(obj.triggerName === '' || obj.triggerSubject === '' || obj.triggerContent === '') {
            return swal('Kindly fill all required fields!', '', 'warning');
        } else {
            $.ajax({
                'url': '/atbmailer/trigger/save/',
                'type': 'post',
                'data': obj,
                'success': function (data) {
                    $(triggerName).val('');
                    $(triggerSubject).val('');
                    $('#emailContent').summernote('code', '');
                    $('#wait').hide();
                    swal(data.response,"","success");
                }
            });
        }
    }

    function sendEmail() {
        let obj = {
            emailSubject: $(emailSubject).val(),
            emailRecipients: $(emailRecipients).val(),
            emailContent: $('#emailContent').summernote('code')
        }

        if(obj.emailSubject === '' || obj.emailRecipients === '') {
            return swal('Kindly fill all required fields!', '', 'warning');
        } else {
            $.ajax({
                'url': '/atbmailer/mail/send/',
                'type': 'post',
                'data': obj,
                'success': function (data) {
                    $(emailRecipients).val('');
                    $(emailSubject).val('');
                    $('#emailContent').summernote('code', '');
                    $('#wait').hide();
                    swal(data.response,"","success");
                }
            });
        }
        

    }

    function sendPromotionalEmail() {
        let obj = {
            emailSubject: $(emailSubject).val(),
            emailRecipients: $(emailRecipients).val(),
            emailContent: $('#emailContent').summernote('code')
        }

        if(obj.emailSubject === '' || obj.emailRecipients === '') {
            return swal('Kindly fill all required fields!', '', 'warning');
        } else {
            $.ajax({
                'url': '/atbmailer/mail/promotions/',
                'type': 'post',
                'data': obj,
                'success': function (data) {
                    $(emailRecipients).val('');
                    $(emailSubject).val('');
                    $('#emailContent').summernote('code', '');
                    $('#wait').hide();
                    swal(data.response,"","success");
                }
            });
        }
        

    }

    function unsubscribe() {
        let obj = {
            emailAddress: $(emailAddress).val()
        }

        if(obj.emailAddress === '') {
            return swal('Please input email address!', '', 'warning');
        } else {
            $.ajax({
                'url': '/atbmailer/mail/unsubscribe/',
                'type': 'post',
                'data': obj,
                'success': function (data) {
                    $(emailAddress).val('');
                    $('#wait').hide();
                    swal(data.response,"",data.alert);
                }
            });
        }
        

    }
