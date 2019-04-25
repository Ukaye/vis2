(function( $ ) {
    jQuery(document).ready(function() {
        getBanks();
    });

    $("#otp").on("keyup", function () {
        let val = $("#otp").val();
        $("#otp").val(integerFormat(val));
    });

    $("#card").on("keyup", function () {
        let val = $("#card").val();
        $("#card").val(creditCardFormat(val));
    });

    const urlParams = new URLSearchParams(window.location.search);
    const user_id = urlParams.get('t');
    let bank,
        banks,
        preapproved_loan = {};

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
                    $('#first-repayment-text').text(preapproved_loan.repayment_date);
                    $('#expiry-text').html(`Please note that this loan offer is only valid till <strong>${preapproved_loan.expiry_date}</strong>`);
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
                                    '    <h2>No Offer Available!</h2>\n' +
                                    '    <p><br/>You will be contacted when next we have an offer available for you.</p><br/>\n' +
                                    '</div>';
                        $('.card-body').html(message);
                        return swal('This offer is no longer available!','','error');
                    }
                } else {
                    $('#acceptApplication').hide();
                    $('#declineApplication').hide();
                    let message = '<div class="text-muted" style="text-align: center" >\n' +
                                '    <div width="100px" height="100px" class="img-thumbnail" style="text-align: center; border: transparent">' +
                                '       <i class="fa fa-exclamation-circle fa-lg" style="font-size: 10em; margin: 60px 0 30px 0;"></i>'+
                                '    <h2>No Offer Available!</h2>\n' +
                                '    <p><br/>You will be contacted when next we have an offer available for you.</p><br/>\n' +
                                '</div>';
                    $('.card-body').html(message);
                    return swal('This offer is no longer available!','','error');
                }
            }
        });
    }

    function generateMandateForm(data) {
        let form_url = `${getBaseUrl()}/form/${data.merchantId}/${data.remita_hash}/${data.mandateId}/${data.requestId}/rest.reg`;
        $('#remitaDirectDebit').find('.setup-content').html(`
            <div class="col-sm-12">
                <iframe src="${form_url}" id="mandate_form" name="mandate_form"></iframe>
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
                $('#payment-amount-text').text(numberToCurrencyformatter(cells[7]));
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

    $("#setupMandate").click(function () {
        if (!preapproved_loan.bank || !preapproved_loan.email || !preapproved_loan.phone || !preapproved_loan.account
            || !preapproved_loan.client || !preapproved_loan.loan_amount)
            return notification('Contact your loan officer to verify your profile!', '', 'warning');
        swal({
            title: "Setup Remita Mandate?",
            text: "You would receive an OTP from your bank to proceed with this loan offer!",
            icon: "warning",
            buttons: true,
            dangerMode: true,
        })
            .then((yes) => {
                if (yes) {
                    let start = preapproved_loan.schedule[0]['payment_collect_date'],
                        end = preapproved_loan.schedule[preapproved_loan.schedule.length-1]['payment_collect_date'];
                    if (start === end) {
                        let start_ = new Date(start);
                        end = formatDate(start_.setDate(start_.getDate() + 1));
                    }
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
                            amount: preapproved_loan.loan_amount,
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
                                const error = data.error.status || 'No internet connection';
                                notification(error,'','error');
                            }
                        },
                        'error': function (err) {
                            console.log(err);
                            notification('No internet connection','','error');
                        }
                    });
                }
            });
    });

    $("#acceptApplication").click(function () {
        let $otp = $('#otp'),
            $card = $('#card');
        if (!localStorage.remitaTransRef)
            return notification('Kindly setup remita direct debit to proceed!', '', 'warning');
        if (bank.authorization === 'OTP' && (!$otp.val() || $otp.val().length < 4 || !$card.val() || $card.val().length < 12))
            return notification('Kindly fill both the card and bank otp correctly!', '', 'warning');
        if (!preapproved_loan.bank || !preapproved_loan.email || !preapproved_loan.phone || !preapproved_loan.account
                || !preapproved_loan.client || !preapproved_loan.loan_amount)
            return notification('Contact your loan officer to verify your profile!', '', 'warning');
        swal({
            title: "Are you sure?",
            text: "Once accepted, this process is not reversible!",
            icon: "warning",
            buttons: true,
            dangerMode: true,
        })
            .then((yes) => {
                if (yes) {
                    $.ajax({
                        'url': `/preapproved-loan/offer/accept/${preapproved_loan.ID}`,
                        'type': 'post',
                        'data': {
                            otp: $otp.val(),
                            card: integerFormat($card.val()),
                            email: preapproved_loan.email,
                            fullname: preapproved_loan.client,
                            authorization: bank.authorization,
                            created_by: preapproved_loan.created_by,
                            workflow_id: preapproved_loan.workflowID,
                            remitaTransRef: localStorage.remitaTransRef,
                            application_id: preapproved_loan.applicationID
                        },
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
                            notification('No internet connection','','error');
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
            dangerMode: true,
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
                            notification('No internet connection','','error');
                        }
                    });
                }
            });
    });
})(jQuery);