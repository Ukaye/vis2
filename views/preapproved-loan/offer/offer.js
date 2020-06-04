(function( $ ) {
    jQuery(document).ready(function() {
        getBanks();
        $('body').delegate('input[name^="param"]', 'keyup', function(e) {
            let val = $(`input[name="${e.target.name}"]`).val();
            $(`input[name="${e.target.name}"]`).val(integerFormat(val));
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const application_id = urlParams.get('i');
    const user_id = urlParams.get('t');
    let bank,
        banks,
        payment_amount,
        first_repayment_date,
        preapproved_loan = {};

    if (application_id) {
        $('#acceptApplication').remove();
        $('#declineApplication').remove();
    }

    function getPreapprovedLoan() {
        $.ajax({
            type: "GET",
            url: `/preapproved-loan/get/${encodeURIComponent(user_id)}`,
            success: function (response) {
                preapproved_loan = response.data;
                if (preapproved_loan && !($.isEmptyObject(preapproved_loan)) && preapproved_loan.schedule){
                    $('#client-text').text(preapproved_loan.client);
                    $('#loan-amount-text').text(`₦${numberToCurrencyformatter(preapproved_loan.loan_amount)}`);
                    $('#tenor-text').text(`${numberToCurrencyformatter(preapproved_loan.duration)} month(s)`);
                    first_repayment_date = preapproved_loan.repayment_date || preapproved_loan.schedule[0]['payment_collect_date'];
                    $('#first-repayment-text').text(first_repayment_date);
                   // $('#expiry-text').html(`Please note that this loan is only valid till <strong>${preapproved_loan.expiry_date}</strong>`);
                    $('#fullname').text(preapproved_loan.fullname);
                    $('#email').text(preapproved_loan.email);
                    $('#phone').text(preapproved_loan.phone);
                    bank = ($.grep(banks, function (e) { return e.code === preapproved_loan.bank }))[0];
                    if (bank)
                        preapproved_loan.bank_name = bank.name;
                    $('#bank').text(preapproved_loan.bank_name);
                    $('#account').text(preapproved_loan.account);
                    validateProfile(preapproved_loan);
                    displaySchedule(preapproved_loan.schedule);
                    if (!preapproved_loan.remitaTransRef) {
                        $('#setupMandate').show();
                        $('#remitaDirectDebit').hide();
                        $('#acceptApplication').hide();
                    } else {
                        $('#setupMandate').hide();
                        $('#remitaDirectDebit').show();
                        $('#acceptApplication').show();
                        if (preapproved_loan.authParams) displayAuthParams(JSON.parse(preapproved_loan.authParams));
                        localStorage.remitaTransRef = preapproved_loan.remitaTransRef;
                        if (bank.authorization === 'FORM') {
                            generateMandateForm(preapproved_loan);
                        }
                    }
                    if (preapproved_loan.status !== 1) {
                        $('#acceptApplication').hide();
                        $('#declineApplication').hide();
                        let message = '<div class="text-muted" style="text-align: center" >\n' +
                                    '    <div width="100px" height="100px" class="img-thumbnail" style="text-align: center; border: transparent">' +
                                    '       <i class="fa fa-exclamation-circle fa-lg" style="font-size: 10em; margin: 60px 0 30px 0;"></i>'+
                                    '    <h2>Not Available!</h2>\n' +
                                    '    <p><br/>You will be contacted when next we have a loan available for you.</p><br/>\n' +
                                    '</div>';
                        $('.card-body').html(message);
                        return swal('This loan is no longer available!','','error');
                    }
                } else {
                    $('#acceptApplication').hide();
                    $('#declineApplication').hide();
                    let message = '<div class="text-muted" style="text-align: center" >\n' +
                                '    <div width="100px" height="100px" class="img-thumbnail" style="text-align: center; border: transparent">' +
                                '       <i class="fa fa-exclamation-circle fa-lg" style="font-size: 10em; margin: 60px 0 30px 0;"></i>'+
                                '    <h2>Not Available!</h2>\n' +
                                '    <p><br/>You will be contacted when next we have a loan available for you.</p><br/>\n' +
                                '</div>';
                    $('.card-body').html(message);
                    return swal('This loan is no longer available!','','error');
                }
            }
        });
    }

    function generateMandateForm(data) {
        let $viewMandate = $('#viewMandate'),
            form_url = `${getRemitaBaseUrl()}/form/${data.merchantId}/${data.remita_hash}/${data.mandateId}/${data.requestId}/rest.reg`;
        $viewMandate.show();
        $viewMandate.attr('href', form_url);
        $('#remitaDirectDebit').find('.setup-content').html(`
            <div class="col-sm-12">
                <!--<iframe scrolling="no" src="${form_url}" id="mandate_form" name="mandate_form"></iframe>-->
                <p class="danger"><em>Click on the "View Mandate" button to access complete mandate form information.</em></p>
                <p class="danger"><strong><em>Kindly read through the mandate form, print, and take to your bank for activation.</em></strong></p>
                <p class="danger">Please note this is a Direct Debit Mandate, NOT a Payment RRR. Kindly verify the account and activate.</p>
            </div>
        `);
    }

    function getBanks() {
        $.ajax({
            type: 'GET',
            url: '/user/banks',
            success: function (response) {
                banks = response;
                getPreapprovedLoan();
            }
        });
    }

    function validateProfile(profile) {
        let status = true;
        if (!profile.fullname){
            status = false;
            validationError('fullname');
        }
        if (!profile.email){
            status = false;
            validationError('email');
        }
        if (!profile.phone){
            status = false;
            validationError('phone');
        }
        if (!profile.bank){
            status = false;
            validationError('bank');
        }
        if (!profile.account){
            status = false;
            validationError('account');
        }
        if (!status){
            $('#acceptApplication').prop('disabled', true);
        }
    }

    function validationError(field) {
        $(`#${field}`).text(`N/A (Contact your loan officer to update your ${field}!)`).addClass('danger');
    }

    function displaySchedule(schedule) {
        let $loanSchedule = $("#loanSchedule"),
            table = $("<table border='1' style='text-align: center;'/>");
        for (let i = 0; i < schedule.length+2; i++) {
            let row,
                cells = [];
            if (i <= 1){
                row = $('<tr style="font-weight: bold;" />');
            } else {
                row = $("<tr />");
                if (schedule[i - 2]['status'] === 2)
                    continue;
                if (parseInt(schedule[i - 2]['status']) === 0)
                    row = $("<tr style='background-color: #aaaaaa; text-decoration: line-through;' />");
            }
            if (i === 0) {
                cells = ["PRINCIPAL","INTEREST","BALANCE","TOTAL"];
            } else if (i === 1) {
                cells = ["INVOICE DATE","COLLECTION DATE","AMOUNT","INVOICE DATE","COLLECTION DATE","AMOUNT","AMOUNT","AMOUNT"];
            } else {
                cells[0] = schedule[i - 2]['payment_create_date'];
                cells[1] = schedule[i - 2]['payment_collect_date'];
                cells[2] = schedule[i - 2]['payment_amount'];
                cells[3] = schedule[i - 2]['interest_create_date'];
                cells[4] = schedule[i - 2]['interest_collect_date'];
                cells[5] = schedule[i - 2]['interest_amount'];
                cells[6] = schedule[i - 2]['balance'];
                cells[7] = (parseFloat(cells[2]) + parseFloat(cells[5])).round(2);
                payment_amount = (payment_amount && payment_amount > cells[7])? payment_amount : cells[7];
                $('#payment-amount-text').text(numberToCurrencyformatter(payment_amount));
            }
            for (let j = 0; j < cells.length; j++) {
                let cell = $("<td />");
                if (i === 0){
                    if (cells[j] === "PRINCIPAL" || cells[j] === "INTEREST")
                        cell = $("<td colspan='3' />");
                    if (cells[j] === "COLLECTION")
                        cell = $("<td colspan='2' />");
                }
                if (cells[j]){
                    cell.html(cells[j]);
                } else {
                    cell.html('--');
                }
                row.append(cell);
            }
            table.append(row);
        }
        $loanSchedule.html('');
        $loanSchedule.append(table);
    }

    function displayAuthParams(params) {
        $('#remitaDirectDebit').find('.setup-content').html('');
        for (let i=1; i<=params.length; i++) {
            let param = params[i-1];
            $('#remitaDirectDebit').find('.setup-content').append(`
                <div class="col-sm-6 form-group">
                    <label class="form-control-label" role="${param[`param${i}`]}">${param[`label${i}`]}</label>
                        <strong style="color:red"> *</strong>
                    <input type="text" id="${param[`param${i}`]}" name="param${i}" class="form-control" required="required">
                    <small class="form-text text-muted">${param[`description${i}`]}</small>
                </div>
            `);
        }
    }


    $("#setupMandate").click(function () {
        if (!preapproved_loan.bank || !preapproved_loan.email || !preapproved_loan.phone || !preapproved_loan.account
            || !preapproved_loan.client || !preapproved_loan.loan_amount || !payment_amount)
            return notification('Contact your loan officer to verify your profile!', '', 'warning');
        swal({
            title: "Setup Direct Debit Mandate?",
            text: "Setting up a direct debit mandate enables us to debit your account when your loan payment is due.",
            icon: "warning",
            buttons: true,
            dangerMode: true
        })
            .then((yes) => {
                if (yes) {
                    if (bank.authorization === 'OTP') notification('You would receive an OTP from your bank to proceed!', '', 'warning');
                    let start = first_repayment_date,
                        end_ = new Date(first_repayment_date),
                        end = formatDate(end_.setDate(end_.getDate() + ((Number(preapproved_loan.duration) + 1) * 30)));
                    $.ajax({
                        'url': `/client/mandate/setup`,
                        'type': 'post',
                        'data': {
                            bank: preapproved_loan.bank,
                            email: preapproved_loan.email,
                            phone: preapproved_loan.phone,
                            authorization: bank.authorization,
                            account: preapproved_loan.account,
                            fullname: preapproved_loan.client,
                            amount: payment_amount,
                            created_by: preapproved_loan.created_by,
                            application_id: preapproved_loan.applicationID,
                            start: remitaDateFormat(start),
                            end: remitaDateFormat(end)
                        },
                        'success': function (data) {
                            if (data.status !== 500){
                                $('#setupMandate').hide();
                                $('#remitaDirectDebit').show();
                                $('#acceptApplication').show();
                                localStorage.remitaTransRef = data.remitaTransRef;
                                preapproved_loan.remitaTransRef = data.remitaTransRef;
                                window.location.reload();
                            } else {
                                const error = data.error.status || 'Sorry, Our services are not available at the moment.';
                                notification(error,'Please try again later!','error');
                            }
                        },
                        'error': function (err) {
                            console.log(err);
                            notification('Sorry, Our services are not available at the moment.','Please try again later!','error');
                        }
                    });
                }
            });
    });

    function getAuthValues() {
        let i,
            result = [],
            status = true,
            params = JSON.parse(preapproved_loan.authParams);
        for (i = 1; i <= params.length; i++) {
            let obj = {},
                param = params[i - 1],
                $auth_input = $(`#${param[`param${i}`]}`);
            if ($auth_input.val()) {
                obj[`param${i}`] = param[`param${i}`];
                obj['value'] = $auth_input.val();
                result.push(obj);
            } else {
                status = false;
                break;
            }
        }
        return {status: status, data: result};
    }

    $("#acceptApplication").click(function () {
        if (bank.authorization === 'OTP') {
            if (!getAuthValues().status) {
                return notification('Kindly fill all required field(s)!', '', 'warning');
            }
        }
        if (!localStorage.remitaTransRef)
            return notification('Kindly setup direct debit mandate to proceed!', '', 'warning');
        if (!preapproved_loan.bank || !preapproved_loan.email || !preapproved_loan.phone || !preapproved_loan.account
                || !preapproved_loan.client || !preapproved_loan.loan_amount || !payment_amount)
            return notification('Contact your loan officer to verify your profile!', '', 'warning');
        swal({
            title: "Are you sure?",
            text: "Once accepted, this process is not reversible!",
            icon: "warning",
            buttons: true,
            dangerMode: true
        })
            .then((yes) => {
                if (yes) {
                    let  payload = {
                        email: preapproved_loan.email,
                        fullname: preapproved_loan.client,
                        authorization: bank.authorization,
                        created_by: preapproved_loan.created_by,
                        workflow_id: preapproved_loan.workflowID,
                        remitaTransRef: localStorage.remitaTransRef,
                        application_id: preapproved_loan.applicationID
                    };
                    if (bank.authorization === 'OTP') payload.authParams = getAuthValues().data;
                    $.ajax({
                        'url': `/preapproved-loan/offer/accept/${preapproved_loan.ID}`,
                        'type': 'post',
                        'data': payload,
                        'success': function (data) {
                            if (data.status !== 500){
                                notification('Loan accepted successfully','','success');
                                $('#setupMandate').hide();
                                $('#remitaDirectDebit').hide();
                                $('#acceptApplication').hide();
                                $('#declineApplication').hide();
                            } else {
                                console.log(data.error);
                                notification(data.error.status,'','error');
                            }
                        },
                        'error': function (err) {
                            console.log(err);
                            notification('Sorry, Our services are not available at the moment.','Please try again later!','error');
                        }
                    });
                }
            });
    });

    $("#declineApplication").click(function () {
        swal({
            title: "Are you sure?",
            text: "Once declined, this process is not reversible!",
            icon: "warning",
            buttons: true,
            dangerMode: true
        })
            .then((yes) => {
                if (yes) {
                    $.ajax({
                        'url': `/preapproved-loan/offer/decline/${preapproved_loan.ID}`,
                        'type': 'get',
                        'success': function (data) {
                            notification('Loan declined successfully','','success');
                            window.location.reload();
                        },
                        'error': function (err) {
                            console.log(err);
                            notification('Sorry, Our services are not available at the moment.','Please try again later!','error');
                        }
                    });
                }
            });
    });
})(jQuery);