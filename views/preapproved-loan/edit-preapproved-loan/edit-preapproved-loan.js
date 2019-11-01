(function( $ ) {
    jQuery(document).ready(function() {
        getWorkflows();
        getApplicationSettings();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const user_id = urlParams.get('id');
    let recommendation = {};

    function getRecommendation(){
        $.ajax({
            type: "GET",
            url: `/preapproved-loan/recommendations/get/${user_id}`,
            success: function (response) {
                recommendation = response.data;
                if (recommendation){
                    let $user_list = $('#user-list');
                    $user_list.val($user_list.find("option:contains('"+recommendation.client+"')").val());
                    $user_list.prop('disabled', true);
                    let client = ($user_list.val() !== '-- Choose Client --')? JSON.parse(decodeURIComponent($user_list.val())) : false;
                    if (client) {
                        $('#client-text').html(`<a href="/client-info?id=${client.ID}">
                            <strong>${client.fullname}</strong> (${client.email})</a>`);
                    }
                    $('#term').val(numberToCurrencyformatter(recommendation.tenor));
                    $('#amount').val(numberToCurrencyformatter(recommendation.loan_amount));
                    $('#interest-rate').val(numberToCurrencyformatter(recommendation.interest_rate));
                    $('#repayment-date').val(recommendation.first_repayment_date);
                    $('#amortization').val('standard').trigger('change');
                    $('#loan-amount-text').text(`₦${numberToCurrencyformatter(recommendation.loan_amount)}`);
                    $('#credit-score-text').text(`${recommendation.credit_score}%`);
                    $('#default-frequency-text').text(numberToCurrencyformatter(recommendation.defaults));
                    let percent_completion = recommendation.percentage_completion;
                    if (percent_completion >= 75) {
                        $('#remark-very-good-text').show();
                    } else if (percent_completion < 75 && percent_completion >= 50) {
                        $('#remark-good-text').show();
                    }
                    $('#reason').html(`
                        <p>1. Client has ${numberToCurrencyformatter(recommendation.months_left)} repayment(s) left.</p>
                        <p>2. Client has defaulted ${recommendation.defaults} out of ${numberToCurrencyformatter(recommendation.invoices_due)} due payment(s).</p>
                        <p>3. Client earns ₦${numberToCurrencyformatter(recommendation.salary || 0)} monthly.</p>
                        <p>4. Client has borrowed an average loan of ₦${numberToCurrencyformatter(recommendation.average_loan)}.</p>
                        <p>5. Client is an active customer for ${numberToCurrencyformatter(recommendation.duration)} month(s).</p>
                        <p>6. Client is eligible for a loan of ₦${numberToCurrencyformatter(recommendation.loan_amount)} to be repaid over ${numberToCurrencyformatter(recommendation.tenor)} month(s).</p>
                    `);
                }
            }
        });
    }

    function getUsers(){
        $.ajax({
            type: "GET",
            url: "/user/users-list-v2",
            success: function (response) {
                $.each(JSON.parse(response), function (key, val) {
                    $("#user-list").append('<option value = "' + encodeURIComponent(JSON.stringify(val)) + '">' + val.fullname + '</option>');
                });
                getRecommendation();
            }
        });
    }

    function getWorkflows(){
        $.ajax({
            type: "GET",
            url: "/workflows",
            success: function (response) {
                $.each(response.response, function (key, val) {
                    $("#workflows").append('<option value = "'+val.ID+'"">'+val.name+'</option>');
                });
            }
        });
    }

    let settings_obj = {
        loan_requested_min: 1,
        loan_requested_max: 100000000,
        tenor_min: 1,
        tenor_max: 60,
        interest_rate_min: 1,
        interest_rate_max: 1000
    };
    function getApplicationSettings() {
        $('#wait').show();
        $.ajax({
            type: "GET",
            url: "/settings/application",
            success: function (data) {
                if (data.response) {
                    settings_obj = data.response;
                    if (settings_obj.loan_requested_min)
                        $('#loan_requested_min').text(numberToCurrencyformatter(settings_obj.loan_requested_min));
                    if (settings_obj.loan_requested_max)
                        $('#loan_requested_max').text(numberToCurrencyformatter(settings_obj.loan_requested_max));
                    if (settings_obj.tenor_min)
                        $('#tenor_min').text(numberToCurrencyformatter(settings_obj.tenor_min));
                    if (settings_obj.tenor_max)
                        $('#tenor_max').text(numberToCurrencyformatter(settings_obj.tenor_max));
                    if (settings_obj.interest_rate_min)
                        $('#interest_rate_min').text(numberToCurrencyformatter(settings_obj.interest_rate_min));
                    if (settings_obj.interest_rate_max)
                        $('#interest_rate_max').text(numberToCurrencyformatter(settings_obj.interest_rate_max));
                }
                initCSVUpload2(settings_obj);
            }
        });
    }

    $('#term').keyup(function () {
        let val = $("#term").val();
        $("#term").val(numberToCurrencyformatter(val));
        triggerAmortization();
    });
    $('#amount').keyup(function () {
        let val = $("#amount").val();
        $("#amount").val(numberToCurrencyformatter(val));
        triggerAmortization();
    });
    $('#interest-rate').keyup(function () {
        let val = $("#interest-rate").val();
        $("#interest-rate").val(numberToCurrencyformatter(val));
        triggerAmortization();
    });
    $('#repayment-date').change(function () {
        triggerAmortization();
    });

    function triggerAmortization() {
        if ($('#amortization').val() === 'fixed')
            $('#amortization').val('fixed').trigger('change');
        if ($('#amortization').val() === 'standard')
            $('#amortization').val('standard').trigger('change');
    }

    function processSchedule(schedule) {
        let result = [],
            total_principal = 0,
            amount = currencyToNumberformatter($('#amount').val()),
            date = $('#repayment-date').val();
        for (let i=-2; i<schedule.length-1; i++){
            if (i === -2){
                result.push("PRINCIPAL,,,INTEREST,,,BALANCE");
            } else if (i === -1){
                result.push("INVOICE DATE,COLLECTION DATE,AMOUNT,INVOICE DATE,COLLECTION DATE,AMOUNT,AMOUNT");
            } else {
                total_principal = (total_principal + schedule[i][1]).round(2);
                amount = parseFloat(amount);
                if (i === schedule.length-2){
                    let excess = (total_principal > amount)? (total_principal - amount).round(2) : (amount - total_principal).round(2);
                    schedule[i][2] = (schedule[i][2] + schedule[i][3] + excess).round(2);
                    schedule[i][1] = (schedule[i][1] - excess).round(2);
                    schedule[i][3] = 0;
                }
                let cells;
                if (date){
                    cells = date+","+date+","+schedule[i][1]+","+date+","+date+","+schedule[i][2]+","+schedule[i][3];
                    let date_array = date.split('-');
                    date = new Date(date_array[0], (parseInt(date_array[1])-1), date_array[2]);
                    date.setMonth(date.getMonth()+1);
                    date = formatDate(date);
                } else {
                    cells = "0,0,"+schedule[i][1]+",0,0,"+schedule[i][2]+","+schedule[i][3];
                }
                result.push(cells);
            }
        }
        return result;
    }

    function initCSVUpload2(settings) {
        getUsers();
        let schedule = [],
            loan_amount = 0,
            $dvCSV = $("#dvCSV2"),
            $csvUpload = $("#csvUpload2"),
            $uploadCSV = $("#uploadCSV2"),
            $amortization = $('#amortization'),
            $message = $("#schedule-error-message");

        $amortization.change(function () {
            $dvCSV.html('');
            schedule = [];
            loan_amount = 0;
            if (this.value === 'custom') {
                $message.hide();
                $('.amortization-div').show();
                $('#payment-amount-div').hide();
            } else {
                $message.show();
                $('.amortization-div').hide();
                $('#payment-amount-div').show();
                let loanAmount = currencyToNumberformatter($('#amount').val()),
                    interestRate = currencyToNumberformatter($('#interest-rate').val()),
                    duration = currencyToNumberformatter($('#term').val());
                if (!loanAmount || !interestRate || !duration)
                    return $message.text('Kindly fill all required fields!','','warning');
                duration = parseFloat(duration);
                loanAmount = parseFloat(loanAmount);
                interestRate = parseFloat(interestRate);
                if (duration < settings.tenor_min || duration > settings.tenor_max)
                    return $message.text(`Minimum tenor is ${numberToCurrencyformatter(settings.tenor_min)} (month)
                     and Maximum is ${numberToCurrencyformatter(settings.tenor_max)} (months)`,'','warning');
                if (interestRate < settings.interest_rate_min || interestRate > settings.interest_rate_max)
                    return $message.text(`Minimum interest rate is ${numberToCurrencyformatter(settings.interest_rate_min)}% 
                    and Maximum is ${numberToCurrencyformatter(settings.interest_rate_max)}%`,'','warning');
                if (loanAmount < settings.loan_requested_min || loanAmount > settings.loan_requested_max)
                    return $message.text(`Minimum loan amount is ₦${numberToCurrencyformatter(settings.loan_requested_min)} 
                    and Maximum is ₦${numberToCurrencyformatter(settings.loan_requested_max)}`,'','warning');
                $message.hide();

                let years = duration/12,
                    paymentsPerYear = 12,
                    rate_ = (interestRate/100)/paymentsPerYear,
                    numberOfPayments = paymentsPerYear * years,
                    payment = (pmt(rate_, numberOfPayments, -loanAmount, $amortization.val())).toFixed(2),
                    schedule_ = computeSchedule(loanAmount, interestRate, paymentsPerYear, years, parseFloat(payment), $amortization.val()),
                    table = $("<table border='1' style='text-align: center; width: 100%;'/>"),
                    rows = processSchedule(schedule_);
                $('#payment-amount').val(numberToCurrencyformatter(payment));
                for (let i = 0; i < rows.length; i++) {
                    let invoice = {},
                        row = $("<tr />"),
                        cells = (rows[i].split(",").length > 7)? rows[i].split(",").slice(0, 7) : rows[i].split(",");
                    if (i === 0) {
                        cells = ["PRINCIPAL","INTEREST","BALANCE"];
                    } else if (i === 1) {
                        cells = ["INVOICE DATE","COLLECTION DATE","AMOUNT","INVOICE DATE","COLLECTION DATE","AMOUNT","AMOUNT"];
                    }
                    if (cells.join(' ').length > 10) {
                        for (let j = 0; j < cells.length; j++) {
                            cells[j] = (cells[j]) ? (cells[j]).trim() : cells[j];
                            if (!cells[j])
                                continue;
                            let cell = $("<td />");
                            if (i === 0) {
                                if (cells[j] === "PRINCIPAL" || cells[j] === "INTEREST")
                                    cell = $("<td colspan='3' />");
                            }
                            if (i > 1) {
                                if (j === 0 || j === 1 || j === 3 || j === 4) {
                                    cell.html('<input id="invoice-' + i + '-' + j + '" type="date" value="' + cells[j] + '" />');
                                } else {
                                    cell.html('<span id="invoice-' + i + '-' + j + '">' + cells[j] + '</span>');
                                }
                            } else {
                                cell.html(cells[j]);
                            }
                            row.append(cell);
                            switch (j) {
                                case 0: {
                                    invoice.payment_create_date = cells[j];
                                    break;
                                }
                                case 1: {
                                    invoice.payment_collect_date = cells[j];
                                    break;
                                }
                                case 2: {
                                    if (i > 1)
                                        loan_amount = (loan_amount + parseFloat(cells[j])).round(2);
                                    invoice.payment_amount = cells[j];
                                    break;
                                }
                                case 3: {
                                    invoice.interest_create_date = cells[j];
                                    break;
                                }
                                case 4: {
                                    invoice.interest_collect_date = cells[j];
                                    break;
                                }
                                case 5: {
                                    invoice.interest_amount = cells[j];
                                    break;
                                }
                                case 6: {
                                    invoice.balance = cells[j];
                                    break;
                                }
                            }
                        }
                    }
                    if (i>1 && cells.length === 7 && !$.isEmptyObject(invoice))
                        schedule.push(invoice);
                    table.append(row);
                }
                $dvCSV.html('');
                $dvCSV.append(table);
            }
        });

        $uploadCSV.bind("click", function () {
            schedule = [];
            loan_amount = 0;
            let regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv|.txt)$/;
            if (regex.test($csvUpload.val().toLowerCase())) {
                if (typeof (FileReader) !== "undefined") {
                    let reader = new FileReader();
                    reader.onload = function (e) {
                        let table = $("<table border='1' style='text-align: center; width: 100%;'/>"),
                            rows = e.target.result.split("\n");
                        for (let i = 0; i < rows.length; i++) {
                            let invoice = {},
                                row = $("<tr />"),
                                cells = (rows[i].split(",").length > 7)? rows[i].split(",").slice(0, 7) : rows[i].split(",");
                            if (i === 0) {
                                cells = ["PRINCIPAL","INTEREST","BALANCE"];
                            } else if (i === 1) {
                                cells = ["INVOICE DATE","COLLECTION DATE","AMOUNT","INVOICE DATE","COLLECTION DATE","AMOUNT","AMOUNT"];
                            }
                            if (cells.join(' ').length > 10) {
                                for (let j = 0; j < cells.length; j++) {
                                    cells[j] = (cells[j]) ? (cells[j]).trim() : cells[j];
                                    if (!cells[j])
                                        continue;
                                    let cell = $("<td />");
                                    if (i === 0) {
                                        if (cells[j] === "PRINCIPAL" || cells[j] === "INTEREST")
                                            cell = $("<td colspan='3' />");
                                    }
                                    if (i > 1) {
                                        if (j === 0 || j === 1 || j === 3 || j === 4) {
                                            cell.html('<input id="invoice-' + i + '-' + j + '" type="date" value="' + cells[j] + '" />');
                                        } else {
                                            cell.html('<span id="invoice-' + i + '-' + j + '">' + cells[j] + '</span>');
                                        }
                                    } else {
                                        cell.html(cells[j]);
                                    }
                                    row.append(cell);
                                    switch (j) {
                                        case 0: {
                                            invoice.payment_create_date = cells[j];
                                            break;
                                        }
                                        case 1: {
                                            invoice.payment_collect_date = cells[j];
                                            break;
                                        }
                                        case 2: {
                                            if (i > 1)
                                                loan_amount = (loan_amount + parseFloat(cells[j])).round(2);
                                            invoice.payment_amount = cells[j];
                                            break;
                                        }
                                        case 3: {
                                            invoice.interest_create_date = cells[j];
                                            break;
                                        }
                                        case 4: {
                                            invoice.interest_collect_date = cells[j];
                                            break;
                                        }
                                        case 5: {
                                            invoice.interest_amount = cells[j];
                                            break;
                                        }
                                        case 6: {
                                            invoice.balance = cells[j];
                                            break;
                                        }
                                    }
                                }
                            }
                            if (i>1 && cells.length === 7 && !$.isEmptyObject(invoice))
                                schedule.push(invoice);
                            table.append(row);
                        }
                        $dvCSV.html('');
                        $dvCSV.append(table);
                    };
                    reader.readAsText($csvUpload[0].files[0]);
                } else {
                    return notification('This browser does not support HTML5.','','warning');
                }
            } else {
                return notification('Please select a valid CSV file.','Note that symbols and special characters are not allowed in the filename!','warning');
            }
        });

        $("#approveApplication").click(function () {
            if (!schedule[0])
                return notification('Please upload a valid CSV file.','','warning');
            validateSchedule(schedule, function (validation) {
                if (validation.status){
                    let obj = {},
                        schedule = validation.data,
                        $user_list = $('#user-list'),
                        user = ($user_list.val() !== '-- Choose Client --')? JSON.parse(decodeURIComponent($user_list.val())) : false;
                    obj.userID = user.ID;
                    obj.workflowID = $('#workflows').val();
                    obj.loan_amount = currencyToNumberformatter($('#amount').val());
                    obj.interest_rate = currencyToNumberformatter($('#interest-rate').val());
                    obj.duration = currencyToNumberformatter($('#term').val());
                    obj.repayment_date = $('#repayment-date').val();
                    obj.agentID = (JSON.parse(localStorage.getItem("user_obj"))).ID;
                    if (!user || isNaN(obj.workflowID) || !obj.loan_amount || !obj.interest_rate || !obj.duration)
                        return notification('Kindly fill all required fields!','','warning');
                    if (parseFloat(obj.duration) < settings.tenor_min || parseFloat(obj.duration) > settings.tenor_max)
                        return notification(`Minimum tenor is ${numberToCurrencyformatter(settings.tenor_min)} (month) 
                        and Maximum is ${numberToCurrencyformatter(settings.tenor_max)} (months)`,'','warning');
                    if (parseFloat(obj.interest_rate) < settings.interest_rate_min || parseFloat(obj.interest_rate) > settings.interest_rate_max)
                        return notification(`Minimum interest rate is ${numberToCurrencyformatter(settings.interest_rate_min)}% 
                        and Maximum is ${numberToCurrencyformatter(settings.interest_rate_max)}%`,'','warning');
                    if (parseFloat(obj.loan_amount) < settings.loan_requested_min || parseFloat(obj.loan_amount) > settings.loan_requested_max)
                        return notification(`Minimum loan amount is ₦${numberToCurrencyformatter(settings.loan_requested_min)} 
                        and Maximum is ₦${numberToCurrencyformatter(settings.loan_requested_max)}`,'','warning');
                    if (loan_amount !== parseFloat(obj.loan_amount))
                        return notification('Loan amount ('+parseFloat(obj.loan_amount)+') and schedule ('+loan_amount+') mismatch','','warning');

                    let preapproved_loan = Object.assign({}, obj);
                    delete preapproved_loan.agentID;
                    preapproved_loan.client = recommendation.client;
                    preapproved_loan.average_loan = recommendation.average_loan;
                    preapproved_loan.credit_score = recommendation.credit_score;
                    preapproved_loan.defaults = recommendation.defaults;
                    preapproved_loan.invoices_due = recommendation.invoices_due;
                    preapproved_loan.offer_duration = recommendation.tenor;
                    preapproved_loan.offer_loan_amount = recommendation.loan_amount;
                    preapproved_loan.offer_first_repayment_date = recommendation.first_repayment_date;
                    preapproved_loan.offer_interest_rate = recommendation.interest_rate;
                    preapproved_loan.months_left = recommendation.months_left;
                    preapproved_loan.salary_loan = recommendation.salary_loan;
                    preapproved_loan.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;

                    $('#wait').show();
                    $.ajax({
                        'url': '/preapproved-loan/create',
                        'type': 'post',
                        'data': {
                            application: obj,
                            email: user.email,
                            fullname: user.fullname,
                            preapproved_loan: preapproved_loan
                        },
                        'success': function (data) {
                            $user_list.val("");
                            $('#workflows').val("");
                            $('#amount').val("");
                            $('#interest-rate').val("");
                            $('#term').val("");
                            $('#repayment-date').val("");
                            uploadSchedule(schedule, data.ID, user.email);
                        },
                        'error': function (err) {
                            console.log(err);
                            $('#wait').hide();
                            notification('No internet connection','','error');
                        }
                    });
                } else {
                    notification('There are error(s) in the uploaded schedule!','','warning');
                }
            });
        });

        $("#rejectApplication").click(function () {
            let obj = {},
                $user_list = $('#user-list'),
                $workflow = $('#workflows'),
                user = ($user_list.val() !== '-- Choose Client --')? JSON.parse(decodeURIComponent($user_list.val())) : false,
                workflow = ($workflow.val() !== '-- Choose Workflow --')? $workflow.val() : false;
            obj.userID = user.ID;
            if (workflow)
                obj.workflowID = workflow;
            obj.loan_amount = currencyToNumberformatter($('#amount').val());
            obj.interest_rate = currencyToNumberformatter($('#interest-rate').val());
            obj.duration = currencyToNumberformatter($('#term').val());
            obj.repayment_date = $('#repayment-date').val();

            let preapproved_loan = Object.assign({}, obj);
            preapproved_loan.client = recommendation.client;
            preapproved_loan.average_loan = recommendation.average_loan;
            preapproved_loan.credit_score = recommendation.credit_score;
            preapproved_loan.defaults = recommendation.defaults;
            preapproved_loan.invoices_due = recommendation.invoices_due;
            preapproved_loan.offer_duration = recommendation.tenor;
            preapproved_loan.offer_loan_amount = recommendation.loan_amount;
            preapproved_loan.offer_first_repayment_date = recommendation.first_repayment_date;
            preapproved_loan.offer_interest_rate = recommendation.interest_rate;
            preapproved_loan.months_left = recommendation.months_left;
            preapproved_loan.salary_loan = recommendation.salary_loan;
            preapproved_loan.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;

            $('#wait').show();
            $.ajax({
                'url': '/preapproved-loan/reject',
                'type': 'post',
                'data': {
                    preapproved_loan: preapproved_loan
                },
                'success': function (data) {
                    $user_list.val("");
                    $workflow.val("");
                    $('#amount').val("");
                    $('#interest-rate').val("");
                    $('#term').val("");
                    $('#repayment-date').val("");
                    $('#wait').hide();
                    notification('Offer rejected successfully!','','success');
                    window.location.href = '/all-suggested-loans';
                },
                'error': function (err) {
                    console.log(err);
                    $('#wait').hide();
                    notification('No internet connection','','error');
                }
            });
        });
    }

    function uploadSchedule(schedule, application_id, email) {
        $.ajax({
            'url': '/user/application/schedule/'+application_id,
            'type': 'post',
            'data': {schedule:schedule},
            'success': function (data) {
                $('#wait').hide();
                notification(`Offer successfully sent to ${email}`,'','success');
                window.location.href = '/all-suggested-loans';
            },
            'error': function (err) {
                $('#wait').hide();
                notification('Oops! An error occurred while saving schedule','','error');
            }
        });
    }

    function validateSchedule(schedule, callback) {
        let errors = [],
            validated_schedule = [];
        for (let i=0; i<schedule.length; i++){
            let invoice = {},
                $col0 = $('#invoice-'+(i+2)+'-0'),
                $col1 = $('#invoice-'+(i+2)+'-1'),
                $col2 = $('#invoice-'+(i+2)+'-2'),
                $col3 = $('#invoice-'+(i+2)+'-3'),
                $col4 = $('#invoice-'+(i+2)+'-4'),
                $col5 = $('#invoice-'+(i+2)+'-5'),
                $col6 = $('#invoice-'+(i+2)+'-6'),
                a = $col0.val(),
                b = $col1.val(),
                c = schedule[i]['payment_amount'],
                d = $col3.val(),
                e = $col4.val(),
                f = schedule[i]['interest_amount'],
                g = schedule[i]['balance'];
            if (isValidDate(a)){
                $col0.removeClass('invalid');
                invoice.payment_create_date = a;
            } else {
                $col0.addClass('invalid');
                errors.push(a+' is not a valid date');
            }
            if (isValidDate(b)){
                $col1.removeClass('invalid');
                invoice.payment_collect_date = b;
            } else {
                $col1.addClass('invalid');
                errors.push(b+' is not a valid date');
            }
            if (!isNaN(c)){
                $col2.removeClass('invalid');
                invoice.payment_amount = c;
            } else {
                $col2.addClass('invalid');
                errors.push(c+' is not a valid number');
            }
            if (isValidDate(d)){
                $col3.removeClass('invalid');
                invoice.interest_create_date = d;
            } else {
                $col3.addClass('invalid');
                errors.push(d+' is not a valid date');
            }
            if (isValidDate(e)){
                $col4.removeClass('invalid');
                invoice.interest_collect_date = e;
            } else {
                $col4.addClass('invalid');
                errors.push(e+' is not a valid date');
            }
            if (!isNaN(f)){
                $col5.removeClass('invalid');
                invoice.interest_amount = f;
            } else {
                $col5.addClass('invalid');
                errors.push(f+' is not a valid number');
            }
            if (!isNaN(g)){
                $col6.removeClass('invalid');
                invoice.balance = g;
            } else {
                $col6.addClass('invalid');
                errors.push(g+' is not a valid number');
            }
            validated_schedule.push(invoice);
        }
        if (errors[0]){
            callback({status: false, data: errors});
        } else {
            callback({status: true, data: validated_schedule});
        }
    }
})(jQuery);