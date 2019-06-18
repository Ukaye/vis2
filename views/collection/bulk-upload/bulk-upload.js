(function( $ ) {
    jQuery(document).ready(function() {
        init();
    });
    let headers,
        statement = [],
        statement_ = [],
        $dvCSV = $("#dvCSV"),
        $csvUpload = $("#csvUpload"),
        $uploadCSV = $("#uploadCSV");

    function previewStatement(rows) {
        let table = $('<table border=\'1\' style=\'text-align: center; width: 100%;\'/>');
        for (let i = -1; i < rows.length; i++) {
            let cells,
                invoice = {},
                row = $("<tr />");
            if (i === -1) {
                cells = ['POSTING DATE', 'VALUE DATE', 'CREDIT', 'DEBIT', 'BALANCE', 'DESCRIPTION'];
            } else if (i === 0) {
                headers = cells = rows[i].split(',');
            } else {
                cells = (rows[i].split(',').length > 7)? rows[i].split(',').slice(0, 7) : rows[i].split(',');
            }
            if (cells.join(' ').length > 10) {
                for (let j = 0; j < cells.length; j++) {
                    cells[j] = (cells[j]) ? (cells[j]).trim() : cells[j];
                    if (!cells[j])
                        continue;
                    let cell = $("<td />");
                    if (i > 0) {
                        if (j === 0 || j === 1) {
                            cell.html(`<input id="invoice-${i}-${j}" type="date" value="${cells[j]}" />`);
                        } else if (j === 2 || j === 3 || j === 4) {
                            cell.html(`<span id="invoice-${i}-${j}">${numberToCurrencyformatter(cells[j])}</span>`);
                        } else {
                            cell.html(`<span id="invoice-${i}-${j}">${cells[j]}</span>`);
                        }
                    } else {
                        if (i === 0) {
                            let select = `<select id="invoice-${i}-${j}">`;
                            for (let k = 0; k < headers.length; k++) {
                                if (headers[k] === cells[j]) {
                                    select = select.concat(`<option value="${headers[k]}" selected="selected">${headers[k]}</option>`);
                                } else {
                                    select = select.concat(`<option value="${headers[k]}">${headers[k]}</option>`);
                                }
                            }
                            select = select.concat('</select>');
                            cell.html(select);
                        } else {
                            cell.html(cells[j]);
                        }
                    }
                    row.append(cell);
                    switch (j) {
                        case 0: {
                            invoice.posting_date = cells[j];
                            break;
                        }
                        case 1: {
                            invoice.value_date = cells[j];
                            break;
                        }
                        case 2: {
                            invoice.credit = cells[j];
                            break;
                        }
                        case 3: {
                            invoice.debit = cells[j];
                            break;
                        }
                        case 4: {
                            invoice.balance = cells[j];
                            break;
                        }
                        case 5: {
                            invoice.description = cells[j];
                            break;
                        }
                    }
                }
            }
            if (i>0 && cells.length === 6 && !$.isEmptyObject(invoice)) {
                statement.push(invoice);
            }
            table.append(row);
        }
        $dvCSV.html('');
        $dvCSV.append(table);
    }

    $('body').delegate('select[id^="invoice-0-"]', 'change', function(e) {
        let target_index = e.target.id.split('-')[2],
            source_index = headers.indexOf(e.target.value);
        statement_ = (statement_.length === 0)? statement : statement_;
        for (let i=1; i < statement.length; i++) {
            let transaction = statement[i - 1],
                source_value = transaction[Object.keys(transaction)[source_index]];
            statement_[i-1][Object.keys(transaction)[source_index]] = source_value;
            console.log(Object.keys(transaction)[source_index])
            console.log(source_value)
            if (target_index < 2) {
                $(`#invoice-${i}-${target_index}`).val(source_value);
            } else {
                $(`#invoice-${i}-${target_index}`).text(source_value);
            }
        }
        console.log(statement_)
    });

    function init(settings) {
        $uploadCSV.bind("click", function () {
            let regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv|.txt)$/;
            if (regex.test($csvUpload.val().toLowerCase())) {
                if (typeof (FileReader) !== 'undefined') {
                    let reader = new FileReader();
                    reader.onload = function (e) {
                        let rows = e.target.result.split("\n");
                        previewStatement(rows);
                    };
                    reader.readAsText($csvUpload[0].files[0]);
                } else {
                    return notification('This browser does not support HTML5.','','warning');
                }
            } else {
                return notification('Please select a valid CSV file.','Note that symbols and special characters are not allowed in the filename!','warning');
            }
        });

        $("#saveBulkUpload").click(function () {
            console.log(statement)
            console.log(statement_)
            let statementX = (statement_.length === 0)? statement : statement_;
            if (!statementX[0])
                return notification('Please upload a valid CSV file.','','warning');
            validateStatement(statementX, function (validation) {
                return console.log(validation)
                if (validation.status){
                    let obj = {},
                        statement = validation.data,
                        $purposes = $('#purposes'),
                        $user_list = $('#user-list'),
                        user = ($user_list.val() !== '-- Choose Client --')? JSON.parse(decodeURIComponent($user_list.val())) : false;
                    if (user)
                        obj.userID = user.ID;
                        obj.email = user.email;
                        obj.username = user.username;
                    obj.workflowID = $('#workflows').val();
                    obj.loan_amount = $('#amount').val();
                    obj.interest_rate = $('#interest-rate').val();
                    obj.duration = $('#term').val();
                    obj.repayment_date = $('#repayment-date').val();
                    obj.loan_purpose = $purposes.val();
                    obj.agentID = (JSON.parse(localStorage.getItem("user_obj"))).ID;
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
                        return notification('Loan amount ('+parseFloat(obj.loan_amount)+') and statement ('+loan_amount+') mismatch','','warning');

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
                        },
                        'error': function (err) {
                            console.log(err);
                            $('#wait').hide();
                            notification('No internet connection','','error');
                        }
                    });
                } else {
                    notification('There are error(s) in the uploaded statement!','','warning');
                }
            });
        });
    }

    function validateStatement(statement, callback) {
        let errors = [],
            validated_statement = [];
        for (let i=0; i<statement.length; i++){
            let invoice = {},
                $col0 = $('#invoice-'+(i+1)+'-0'),
                $col1 = $('#invoice-'+(i+1)+'-1'),
                $col2 = $('#invoice-'+(i+1)+'-2'),
                $col3 = $('#invoice-'+(i+1)+'-3'),
                $col4 = $('#invoice-'+(i+1)+'-4'),
                $col5 = $('#invoice-'+(i+1)+'-5'),
                a = $col0.val(),
                b = $col1.val(),
                c = currencyToNumberformatter(statement[i]['credit']),
                d = currencyToNumberformatter(statement[i]['debit']),
                e = currencyToNumberformatter(statement[i]['balance']),
                f = statement[i]['description'];
            if (isValidDate(a)) {
                $col0.removeClass('invalid');
                invoice.posting_date = a;
            } else {
                $col0.addClass('invalid');
                errors.push(a+' is not a valid date');
            }
            if (isValidDate(b)) {
                $col1.removeClass('invalid');
                invoice.value_date = b;
            } else {
                $col1.addClass('invalid');
                errors.push(b+' is not a valid date');
            }
            if (!isNaN(c) || !isNaN(d)) {
                $col2.removeClass('invalid');
                $col3.removeClass('invalid');
                invoice.credit = (isNaN(c))? 0 : c;
                invoice.debit = (isNaN(d))? 0 : d;
            } else {
                $col2.addClass('invalid');
                $col3.addClass('invalid');
                errors.push(c+' is not a valid number');
                errors.push(d+' is not a valid date');
            }
            if (!isNaN(e)) {
                $col4.removeClass('invalid');
                invoice.balance = e;
            } else {
                $col4.addClass('invalid');
                errors.push(e+' is not a valid date');
            }
            if (f) {
                $col5.removeClass('invalid');
                invoice.description = f;
            } else {
                $col5.addClass('invalid');
                errors.push(f+' is not a valid text');
            }
            validated_statement.push(invoice);
        }
        if (errors[0]){
            callback({status: false, data: errors});
        } else {
            callback({status: true, data: validated_statement});
        }
    }

})(jQuery);