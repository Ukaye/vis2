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
        let table = $('<table border="1" style="text-align: center; width: 100%;" />');
        for (let i = -1; i < rows.length; i++) {
            let cells,
                cells_,
                invoice = {},
                row = $("<tr />");
            if (i >= 0){
                cells_ = CSVtoArray(rows[i]);
                if (!cells_)
                    continue;
            }
            if (i === -1) {
                cells = ['POSTING DATE', 'VALUE DATE', 'CREDIT', 'DEBIT', 'BALANCE', 'DESCRIPTION'];
            } else if (i === 0) {
                headers = cells = cells_;
            } else {
                cells = (cells_.length > 7)? cells_.slice(0, 7) : cells_;
            }
            if (cells.join(' ').length > 10) {
                for (let j = 0; j < cells.length; j++) {
                    cells[j] = (cells[j]) ? (cells[j]).trim() : cells[j];
                    if (!cells[j] && cells[j] !== '')
                        continue;
                    let cell = $("<td />");
                    if (i > 0) {
                        if (j === 0 || j === 1) {
                            cell.html(`<input id="invoice-${i}-${j}" type="date" value="${formatDate(cells[j])}" />`);
                        } else if (j === 2 || j === 3 || j === 4) {
                            cell.html(`<span id="invoice-${i}-${j}">${numberToCurrencyformatter(cells[j])}</span>`);
                        } else {
                            cell.html(`<span id="invoice-${i}-${j}">${cells[j]}</span>`);
                        }
                    } else {
                        if (i === 0) {
                            let select = `<select id="invoice-${i}-${j}">`;
                            for (let k = 0; k < headers.length; k++) {
                                headers[k] =  headers[k].trim();
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
                    if (j < 6)
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
            target_name = e.target.value,
            source_index = headers.indexOf(target_name);
        statement_ = (statement_.length === 0)? $.extend(true, [], statement) : statement_;
        for (let i=0; i < statement.length; i++) {
            let transaction = statement[i],
                $invoice = $(`#invoice-${i+1}-${target_index}`),
                source_value = transaction[Object.keys(transaction)[source_index]];
            statement_[i][Object.keys(transaction)[target_index]] = source_value;
            switch (target_index) {
                case '0':
                case '1': {
                    $invoice.val(source_value);
                    break;
                }
                case '2':
                case '3':
                case '4': {
                    if (!isNaN(source_value)) {
                        $invoice.text(numberToCurrencyformatter(source_value));
                        break;
                    }
                }
                default: {
                    $invoice.text(source_value);
                    break;
                }
            }
        }
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
            let statementX = (statement_.length === 0)? $.extend(true, [], statement) : statement_;
            if (!statementX[0])
                return notification('Please upload a valid CSV file.','','warning');
            validateStatement(statementX, function (validation) {
                if (validation.status){
                    let obj = {};
                    obj.statement = validation.data;
                    obj.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;

                    $('#wait').show();
                    $.ajax({
                        'url': '/collection/bulk_upload',
                        'type': 'post',
                        'data': obj,
                        'success': function (data) {
                            notification(data.response, '', 'success');
                            window.location.reload();
                        },
                        'error': function (err) {
                            console.log(err);
                            $('#wait').hide();
                            notification('No internet connection', '', 'error');
                        }
                    });
                } else {
                    notification('There are error(s) in the uploaded statement!', '', 'warning');
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
                errors.push(d+' is not a valid number');
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