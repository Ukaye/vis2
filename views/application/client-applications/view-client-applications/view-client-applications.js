(function( $ ) {
    jQuery(document).ready(function() {
        getWorkflows();
        getApplicationSettings();
    });

    let preapplication;
    const urlParams = new URLSearchParams(window.location.search);
    const preapplication_id = urlParams.get('id');
    const client_type = urlParams.get('type');

    let client_list = [],
        $name = $('#name'),
        $form = $('#step1'),
        $user_list = $('#user-list'),
        $client_type = $('#client_type');

    if (preapplication_id) {
        $client_type.val(client_type);
        $client_type.prop('disabled', true);
        if (client_type === 'corporate') {
            getCorporates(function () {
                getLoanPurposes();
            });
        } else {
            getClients(function () {
                getLoanPurposes();
            });
        }
    }

    function getPreapplication(id) {
        $.ajax({
            type: 'GET',
            url: `/client/application/getV2/${id}`,
            success: function (response) {
                preapplication = response;
                $('#saveApplication').hide();
                switch (preapplication.status) {
                    case 1: {
                        $('#approveApplication').show();
                        $('#rejectApplication').show();
                        break;
                    }
                    case 2:
                    case 3:
                    case 4: {
                        $('#step1').hide();
                        $('#step2').show();
                        break;
                    }
                }
                if (response.product) {
                    $('#product').val(response.product).trigger('change');
                    if (response.product === 'market_loan') {
                        $('.upload-div').show();
                    }
                }
                if (response.name && response.email) {
                    $name.val($name.find(`option[name='${response.email}']`).val());
                    $name.select2('destroy');
                    $name.select2();
                    $user_list.val($user_list.find(`option[name='${response.email}']`).val());
                    $user_list.prop('disabled', true);
                    $user_list.select2('destroy');
                    $user_list.select2();
                }
                if (response.business_turnover)
                    $('#business_turnover').val(response.business_turnover);
                if (response.businesses) {
                    $('#businesses').val(response.businesses);
                    $('#businesses').select2('destroy');
                    $('#businesses').select2();
                }
                if (response.capital_source)
                    $('#capital_source').val(response.capital_source);
                if (response.contribution) {
                    $(`input[name='contribution_status'][value='yes']`).prop('checked', true).trigger('change');
                    $('#contribution').val(response.contribution);
                }
                if (response.guarantor_address)
                    $('#guarantor_address').val(response.guarantor_address);
                if (response.guarantor_name)
                    $('#guarantor_name').val(response.guarantor_name);
                if (response.guarantor_phone)
                    $('#guarantor_phone').val(response.guarantor_phone);
                if (response.guarantor_relationship)
                    $('#guarantor_relationship').val(response.guarantor_relationship);
                if (response.loan_amount){
                    $('#loan_amount').val(response.loan_amount);
                    $('#amount').val(response.loan_amount);
                    $('#amount').prop('disabled', true);
                }
                if (response.loan_purpose) {
                    $('#loan_purposes').val(response.loan_purpose);
                    $('#loan_purposes').select2('destroy');
                    $('#loan_purposes').select2();
                    $('#purposes').val(response.loan_purpose);
                    $('#purposes').prop('disabled', true);
                    $('#purposes').select2('destroy');
                    $('#purposes').select2();
                }
                if (response.loan_serviced)
                    $('#loan_serviced').val(response.loan_serviced);
                if (response.market_leader_name)
                    $('#market_leader_name').val(response.market_leader_name);
                if (response.market_leader_phone)
                    $('#market_leader_phone').val(response.market_leader_phone);
                if (response.market_name)
                    $('#market_name').val(response.market_name);
                if (response.phone)
                    $('#phone').val(response.phone);
                if (response.rate) {
                    $('#rate').val(response.rate);
                    $('#interest-rate').val(response.rate);
                    $('#interest-rate').prop('disabled', true);
                }
                if (response.spouse_knowledge)
                    $(`input[name='spouse_knowledge'][value='${response.spouse_knowledge}']`).prop('checked', true);
                if (response.stock_value)
                    $('#stock_value').val(response.stock_value);
                if (response.tenor) {
                    $('#tenor').val(response.tenor);
                    $('#term').val(response.tenor);
                    $('#term').prop('disabled', true);
                }
                if (response.tenor_type)
                    $('#tenor_type').val(response.tenor_type);
                if (response.files) {
                    if (response.files.shop_picture_1) {
                        $('#image-preview-1').show();
                        $('#image-preview-1').html(`<a class="thumbnail grouped_elements" rel="grouped_elements" data-toggle="tooltip" 
                            data-placement="bottom" title="Click to Expand!" href="/${response.files.shop_picture_1}">
                                <img src="/${response.files.shop_picture_1}" alt="Shop Picture 1"></a>`);
                    }
                    if (response.files.shop_picture_2) {
                        $('#image-preview-2').show();
                        $('#image-preview-2').html(`<a class="thumbnail grouped_elements" rel="grouped_elements" data-toggle="tooltip" 
                            data-placement="bottom" title="Click to Expand!" href="/${response.files.shop_picture_2}">
                                <img src="/${response.files.shop_picture_2}" alt="Shop Picture 2"></a>`);
                    }
                    $('a.grouped_elements').fancybox();
                    $('.thumbnail').tooltip();
                }
                if (response.repayment_date) {
                    $('#repayment-date').val(response.repayment_date);
                }
                if (response.salary) {
                    $('#salary-div').show();
                    $('#salary').val(response.salary);
                }
                read_write_custom();
            }
        });
    }

    $('#product').change(function () {
       switch (this.value) {
           case 'general': {
               $('.market_name-div').hide();
               break;
           }
           case 'market_loan': {
               $('.market_name-div').show();
               break;
           }
       }
    });

    $('input[name=contribution_status]').change(function() {
        $('#contribution-div').toggle();
    });

    function getClients(callback){
        $('#wait').show();
        $.ajax({
            type: 'get',
            url: '/user/users-list-v2',
            success: function (response) {
                $('#wait').hide();
                $name.append('<option selected="selected">-- Choose Client --</option>');
                $user_list.append('<option selected="selected">-- Choose Client --</option>');
                $.each(JSON.parse(response), function (key, val) {
                    client_list.push(val);
                    $name.append(`<option name="${val.email}" value ="${encodeURIComponent(JSON.stringify(val))}">${val.fullname} &nbsp; (${val.username})</option>`);
                    $user_list.append(`<option name="${val.email}" value ="${encodeURIComponent(JSON.stringify(val))}">${val.fullname} &nbsp; (${val.username})</option>`);
                });
                $name.select2();
                $user_list.select2();
                $form.show();
                callback();
            }
        });
    }

    function getCorporates(callback){
        $('#wait').show();
        $.ajax({
            type: 'get',
            url: '/client/corporates-v2/get',
            success: function (response) {
                $('#wait').hide();
                $name.append('<option selected="selected">-- Choose Client --</option>');
                $user_list.append('<option selected="selected">-- Choose Client --</option>');
                $.each(response, function (key, val) {
                    client_list.push(val);
                    $name.append(`<option name="${val.email}" value ="${encodeURIComponent(JSON.stringify(val))}">${val.name} &nbsp; (${val.email})</option>`);
                    $user_list.append(`<option name="${val.email}" value ="${encodeURIComponent(JSON.stringify(val))}">${val.name} &nbsp; (${val.email})</option>`);
                });
                $name.select2();
                $user_list.select2();
                $form.show();
                callback();
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

    function getLoanPurposes(){
        $.ajax({
            type: "GET",
            url: "/settings/application/loan_purpose",
            success: function (response) {
                getLoanBusinesses();
                $.each(response.response, function (key, val) {
                    $("#purposes").append('<option value = "'+val.ID+'"">'+val.title+'</option>');
                    $("#loan_purposes").append('<option value = "'+val.ID+'"">'+val.title+'</option>');
                });
                $("#purposes").select2();
                $("#loan_purposes").select2();
            }
        });
    }

    function getLoanBusinesses(){
        $.ajax({
            type: "GET",
            url: "/settings/application/business",
            success: function (response) {
                $.each(response.response, function (key, val) {
                    $("#businesses").append('<option value = "'+val.ID+'"">'+val.name+'</option>');
                });
                $("#businesses").select2();
                if (preapplication_id) {
                    getPreapplication(preapplication_id);
                }
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
    $('#amortization').prop('disabled', true);
    function getApplicationSettings() {
        $('#wait').show();
        $.ajax({
            type: "GET",
            url: "/settings/application",
            success: function (data) {
                if (data.response) {
                    settings_obj = data.response;
                    if (settings_obj.loan_requested_min) {
                        $('#loan_requested_min').text(numberToCurrencyformatter(settings_obj.loan_requested_min));
                        $('#loan_requested_min_').text(numberToCurrencyformatter(settings_obj.loan_requested_min));
                    }
                    if (settings_obj.loan_requested_max) {
                        $('#loan_requested_max').text(numberToCurrencyformatter(settings_obj.loan_requested_max));
                        $('#loan_requested_max_').text(numberToCurrencyformatter(settings_obj.loan_requested_max));
                    }
                    if (settings_obj.tenor_min) {
                        $('#tenor_min').text(numberToCurrencyformatter(settings_obj.tenor_min));
                        $('#tenor_min_').text(numberToCurrencyformatter(settings_obj.tenor_min));
                    }
                    if (settings_obj.tenor_max) {
                        $('#tenor_max').text(numberToCurrencyformatter(settings_obj.tenor_max));
                        $('#tenor_max_').text(numberToCurrencyformatter(settings_obj.tenor_max));
                    }
                    if (settings_obj.interest_rate_min) {
                        $('#interest_rate_min').text(numberToCurrencyformatter(settings_obj.interest_rate_min));
                        $('#interest_rate_min_').text(numberToCurrencyformatter(settings_obj.interest_rate_min));
                    }
                    if (settings_obj.interest_rate_max) {
                        $('#interest_rate_max').text(numberToCurrencyformatter(settings_obj.interest_rate_max));
                        $('#interest_rate_max_').text(numberToCurrencyformatter(settings_obj.interest_rate_max));
                    }
                }
                initCSVUpload2(settings_obj);
            }
        });
    }

    $('#stock_value').keyup(function () {
        let val = $("#stock_value").val();
        $("#stock_value").val(numberToCurrencyformatter(val));
    });
    $('#loan_amount').keyup(function () {
        let val = $("#loan_amount").val();
        $("#loan_amount").val(numberToCurrencyformatter(val));
    });
    $('#loan_serviced').keyup(function () {
        let val = $("#loan_serviced").val();
        $("#loan_serviced").val(numberToCurrencyformatter(val));
    });
    $('#business_turnover').keyup(function () {
        let val = $("#business_turnover").val();
        $("#business_turnover").val(numberToCurrencyformatter(val));
    });
    $('#tenor').keyup(function () {
        let val = $("#tenor").val();
        $("#tenor").val(numberToCurrencyformatter(val));
    });
    $('#rate').keyup(function () {
        let val = $("#rate").val();
        $("#rate").val(numberToCurrencyformatter(val));
    });
    $('#term').keyup(function () {
        triggerAmortization();
    });
    $('#amount').keyup(function () {
        triggerAmortization();
    });
    $('#interest-rate').keyup(function () {
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
            amount = $('#amount').val(),
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
                    if (preapplication.tenor_type && preapplication.tenor_type === 'weekly') {
                        date.setDate(date.getDate()+7);
                    } else {
                        date.setMonth(date.getMonth()+1);
                    }
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
        let schedule = [],
            loan_amount = 0,
            $dvCSV = $("#dvCSV2"),
            $csvUpload = $("#csvUpload2"),
            $uploadCSV = $("#uploadCSV2"),
            $amortization = $('#amortization'),
            $message = $("#schedule-error-message");

        $amortization.prop('disabled', false);
        $amortization.change(function () {
            $dvCSV.html('');
            schedule = [];
            loan_amount = 0;
            if (this.value === 'custom'){
                $message.hide();
                $('.amortization-div').show();
                $('#payment-amount-div').hide();
            } else {
                $message.show();
                $('.amortization-div').hide();
                $('#payment-amount-div').show();
                let loanAmount = $('#amount').val(),
                    interestRate = $('#interest-rate').val(),
                    duration = $('#term').val();
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
                $('#payment-amount').val(payment);
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
                                            if (i > 1) {
                                                console.log(cells)
                                                console.log(loan_amount)
                                                console.log(parseFloat(cells[j]))
                                                console.log(loan_amount + parseFloat(cells[j]))
                                                loan_amount = (loan_amount + parseFloat(cells[j])).round(2);
                                                console.log(loan_amount)
                                            }
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

        $("#addApplication").click(function () {
            if (!schedule[0]) return notification('Please upload a valid CSV file.','','warning');
            validateSchedule(schedule, function (validation) {
                if (validation.status){
                    let obj = {},
                        schedule = validation.data,
                        $purposes = $('#purposes'),
                        user = ($user_list.val() !== '-- Choose Client --')? JSON.parse(decodeURIComponent($user_list.val())) : false;
                    if (user) {
                        obj.userID = user.ID;
                        obj.email = user.email;
                        obj.username = user.username || user.name;
                    }
                    obj.workflowID = $('#workflows').val();
                    obj.loan_amount = $('#amount').val();
                    obj.interest_rate = $('#interest-rate').val();
                    obj.duration = $('#term').val();
                    obj.repayment_date = $('#repayment-date').val();
                    obj.loan_purpose = $purposes.val();
                    obj.agentID = (JSON.parse(localStorage.getItem("user_obj"))).ID;
                    obj.client_type = preapplication.client_type;
                    if (preapplication && preapplication.ID)
                        obj.preapplicationID = preapplication.ID;
                    if (!user || isNaN(obj.workflowID) || !obj.loan_amount || !obj.interest_rate || !obj.duration || $purposes.val() === '-- Choose Loan Purpose --')
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

                    $('#wait').show();
                    $.ajax({
                        'url': '/user/apply',
                        'type': 'post',
                        'data': obj,
                        'success': function (data) {
                            $purposes.val("");
                            $user_list.val("");
                            $('#workflows').val("");
                            $('#amount').val("");
                            $('#interest-rate').val("");
                            $('#term').val("");
                            $('#repayment-date').val("");
                            uploadSchedule(schedule, data.response.ID);
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

        $("#saveApplication").click(function () {
            validateApplication(settings, function (obj) {
                if (obj) {
                    $('#wait').show();
                    $.ajax({
                        'url': '/client/application/createV2',
                        'type': 'post',
                        'data': obj,
                        'success': function (data) {
                            $('#wait').hide();
                            $name.val('');
                            $('#market_name').val('');
                            $('#market_leader_name').val('');
                            $('#market_leader_phone').val('');
                            $('#guarantor_name').val('');
                            $('#guarantor_phone').val('');
                            $('#guarantor_relationship').val('');
                            $('#guarantor_address').val('');
                            $('#businesses').val('');
                            $('#stock_value').val('');
                            $('#loan_purposes').val('');
                            $('#loan_amount').val('');
                            $('#loan_serviced').val('');
                            $('#capital_source').val('');
                            $('#business_turnover').val('');
                            $('#tenor').val('');
                            $('#tenor_type').val('');
                            $('#rate').val('');
                            $('#contribution').val('');
                            preapplication = data;
                            notification('Loan Application (Step 1) was successful!','','success');
                            if (obj.product === 'market_loan') {
                                $('#saveApplication').hide();
                                $('.form-group').hide();
                                $('.upload-div').show();
                                $('#proceed').show();
                            } else {
                                window.location.href = `/add-application?id=${preapplication.ID}&&type=${obj.client_type}`;
                            }
                        },
                        'error': function (err) {
                            console.log(err);
                            $('#wait').hide();
                            notification('No internet connection','','error');
                        }
                    });
                }
            });
        });

        $('#approveApplication').click(function () {
            validateApplication(settings, function (obj) {
                if (obj) {
                    swal({
                        title: "Are you sure?",
                        text: "Once approved, this process is not reversible!",
                        icon: "warning",
                        buttons: true,
                        dangerMode: true
                    })
                        .then((yes) => {
                            if (yes) {
                                $('#wait').show();
                                $.ajax({
                                    'url': `/client/application/approve/${preapplication.ID}`,
                                    'type': 'post',
                                    'data': obj,
                                    'success': function (data) {
                                        $('#wait').hide();
                                        if (data.status !== 500) {
                                            notification('Loan Application approved successfully','','success');
                                            window.location.href = '/all-client-applications';
                                        } else {
                                            console.log(data.error);
                                            notification(data.error,'','error');
                                        }
                                    },
                                    'error': function (err) {
                                        console.log(err);
                                        $('#wait').hide();
                                        notification('No internet connection','','error');
                                    }
                                });
                            }
                        });
                }
            });
        });
    }

    function uploadSchedule(schedule, application_id) {
        $.ajax({
            'url': '/user/application/schedule/'+application_id,
            'type': 'post',
            'data': {schedule:schedule},
            'success': function (data) {
                notification('Loan Application created successfully!','','success');
                window.location.href = `/application?id=${application_id}`;
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

    $('[id^=upload-]').click(function (e) {
        let i = (e.target.id.split('-'))[1],
            file = $(`#file-upload-${i}`)[0].files[0];
        if (!preapplication || !preapplication.ID)
            return notification('No application found for this file', '', 'warning');
        if (file === undefined)
            return notification('Kindly choose file to upload!', '', 'warning');
        let formData = new FormData();
        formData.append('file', file);
        $.ajax({
            url: `/client/application/upload/${preapplication.ID}/shop_picture_${i}`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                $(`#image-preview-${i}`).show();
                $(`#image-preview-${i}`).html(`<a class="thumbnail grouped_elements" rel="grouped_elements" data-toggle="tooltip" 
                            data-placement="bottom" title="Click to Expand!" href="/${response.file}">
                                <img src="/${response.file}" alt="Shop Picture ${i}"></a>`);
                $("a.grouped_elements").fancybox();
                $('.thumbnail').tooltip();
                return notification('File uploaded successfully!', '', 'success');
            },
            error: function () {
                notification('Oops! An error occurred while uploading file', '', 'error');
            }
        });
    });

    $('#proceed').click(function () {
        window.location.href = `/add-application?id=${preapplication.ID}`;
    });

    $('#rejectApplication').click(function () {
        swal({
            title: "Are you sure?",
            text: "Once rejected, this process is not reversible!",
            icon: "warning",
            buttons: true,
            dangerMode: true
        })
            .then((yes) => {
                if (yes) {
                    $('#wait').show();
                    $.ajax({
                        'url': `/client/application/reject/${preapplication.ID}`,
                        'type': 'get',
                        'success': function (data) {
                            $('#wait').hide();
                            if (data.status !== 500) {
                                $('#saveApplication').hide();
                                $('#rejectApplication').hide();
                                $('#approveApplication').hide();
                                notification('Loan Application rejected successfully','','success');
                                window.location.href = '/all-client-applications';
                            } else {
                                console.log(data.error);
                                notification(data.error,'','error');
                            }
                        },
                        'error': function (err) {
                            console.log(err);
                            $('#wait').hide();
                            notification('No internet connection','','error');
                        }
                    });
                }
            });
    });

    function validateApplication(settings, callback) {
        let obj = {},
            contribution_status = $('input[name=contribution_status]:checked').val(),
            user = ($name.val() !== '-- Choose Client --')? JSON.parse(decodeURIComponent($name.val())) : false;
        if (user)
            obj.userID = user.ID;
        obj.name = user.fullname;
        obj.product = $('#product').val();
        obj.loan_amount = currencyToNumberformatter($('#loan_amount').val());
        obj.rate = currencyToNumberformatter($('#rate').val());
        obj.tenor = currencyToNumberformatter($('#tenor').val());
        obj.tenor_type = $('#tenor_type').val();
        obj.loan_purpose = $('#loan_purposes').val();
        obj.loan_serviced = currencyToNumberformatter($('#loan_serviced').val());
        obj.client_type = $client_type.val();
        if ($('#market_name').val())
            obj.market_name = $('#market_name').val();
        if ($('#market_leader_name').val())
            obj.market_leader_name = $('#market_leader_name').val();
        if ($('#market_leader_phone').val())
            obj.market_leader_phone = $('#market_leader_phone').val();
        if ($('#guarantor_name').val())
            obj.guarantor_name = $('#guarantor_name').val();
        if ($('#guarantor_phone').val())
            obj.guarantor_phone = $('#guarantor_phone').val();
        if ($('#guarantor_relationship').val())
            obj.guarantor_relationship = $('#guarantor_relationship').val();
        if ($('#guarantor_address').val())
            obj.guarantor_address = $('#guarantor_address').val();
        if ($('#businesses').val() !== '-- Choose Business --')
            obj.businesses = $('#businesses').val();
        if ($('#stock_value').val())
            obj.stock_value = currencyToNumberformatter($('#stock_value').val());
        if ($('#capital_source').val())
            obj.capital_source = $('#capital_source').val();
        if ($('#business_turnover').val())
            obj.business_turnover = currencyToNumberformatter($('#business_turnover').val());
        if ($('#contribution').val())
            obj.contribution = $('#contribution').val();
        if ($('input[name=spouse_knowledge]:checked').val())
            obj.spouse_knowledge = $('input[name=spouse_knowledge]:checked').val();
        obj.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;
        if (!user || !obj.product || (!obj.loan_amount && obj.loan_amount !== 0) || (!obj.rate && obj.rate !== 0)
                || (!obj.tenor && obj.tenor !== 0) || !obj.tenor_type  || obj.loan_purpose === '-- Choose Loan Purpose --' ||
                (!obj.loan_serviced && obj.loan_serviced !== 0)) {
            notification('Kindly fill all required fields!','','warning');
            return callback(false);
        }
        if (obj.product === 'market_loan' && (!obj.market_name || !obj.market_leader_name || !obj.market_leader_phone || !obj.guarantor_name
                || !obj.guarantor_phone || !obj.guarantor_relationship || !obj.guarantor_address || (!obj.stock_value && obj.stock_value !== 0)
                || !obj.businesses || !obj.capital_source|| (!obj.business_turnover && obj.business_turnover !== 0) || !obj.spouse_knowledge)) {
            notification('Kindly fill all required fields!','','warning');
            return callback(false);
        }
        if (contribution_status === 'yes' && !obj.contribution) {
            notification('Kindly fill the name of the ajo/contribution!','','warning');
            return callback(false);
        }
        if (parseFloat(obj.tenor) < settings.tenor_min || parseFloat(obj.tenor) > settings.tenor_max) {
            notification(`Minimum tenor is ${numberToCurrencyformatter(settings.tenor_min)} (month) 
                        and Maximum is ${numberToCurrencyformatter(settings.tenor_max)} (months)`,'','warning');
            return callback(false);
        }
        if (parseFloat(obj.rate) < settings.interest_rate_min || parseFloat(obj.rate) > settings.interest_rate_max) {
            notification(`Minimum interest rate is ${numberToCurrencyformatter(settings.interest_rate_min)}% 
                        and Maximum is ${numberToCurrencyformatter(settings.interest_rate_max)}%`,'','warning');
            return callback(false);
        }
        if (parseFloat(obj.loan_amount) < settings.loan_requested_min || parseFloat(obj.loan_amount) > settings.loan_requested_max) {
            notification(`Minimum loan amount is ₦${numberToCurrencyformatter(settings.loan_requested_min)} 
                        and Maximum is ₦${numberToCurrencyformatter(settings.loan_requested_max)}`,'','warning');
            return callback(false);
        }
        if (obj.product === 'market_loan' && !(parseFloat(obj.stock_value) > 0)) {
            notification(`Minimum stock value is ₦0`,'','warning');
            return callback(false);
        }
        if (obj.product === 'market_loan' && !(parseFloat(obj.business_turnover) > 0)) {
            notification(`Minimum business turnover is ₦0`,'','warning');
            return callback(false);
        }
        return callback(obj);
    }

    function read_write_custom() {
        let perms = JSON.parse(localStorage.getItem("permissions")),
            approveInitialApplication = ($.grep(perms, function(e){return e.module_name === 'approveInitiateApplication';}))[0],
            rejectInitialApplication = ($.grep(perms, function(e){return e.module_name === 'rejectInitiateApplication';}))[0],
            saveInitialApplication = ($.grep(perms, function(e){return e.module_name === 'saveInitiateApplication';}))[0];

        if (approveInitialApplication && approveInitialApplication['read_only'] === '0')
            $('#approveApplication').hide();
        if (rejectInitialApplication && rejectInitialApplication['read_only'] === '0')
            $('#rejectApplication').hide();
        if (saveInitialApplication && saveInitialApplication['read_only'] === '0')
            $('#saveApplication').hide();
    }

    /** Corporate Updates*/
    $client_type.change(function (e) {
        $form.hide();
        if (client_list.length > 0) {
            $user_list.select2('destroy');
            $name.select2('destroy');
            $user_list.html('');
            $name.html('');
            client_list = [];
        }
        switch (e.target.value) {
            case 'non_corporate': {
                getClients(function () {
                    getLoanPurposes();
                });
                break;
            }
            case 'corporate': {
                getCorporates(function () {
                    getLoanPurposes();
                });
                break;
            }
            default: {
                $form.hide();
            }
        }
    });

})(jQuery);