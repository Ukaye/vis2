(function( $ ) {
    jQuery(document).ready(function() {
        getAccounts();
    });

    function getAccounts(){
        $('#wait').show();
        $.ajax({
            type: 'GET',
            url: '/collection/collection_bank',
            success: function (data) {
                $('#wait').hide();
                $.each(data.response, function (key, val) {
                    $('#account').append(`<option value="${val.ID}">${val.name} (${val.account})</option>`);
                });
            }
        });
    }

    let headers,
        cr_dr = false,
        statement = [],
        statement_ = [],
        dateType = 'hourly',
        nve_cr_rvsl = false,
        $date = $('#date'),
        $cr_dr = $('#cr_dr'),
        $dvCSV = $("#dvCSV"),
        $csvUpload = $("#csvUpload"),
        $nve_cr_rvsl = $('#nve_cr_rvsl'),
        $dateType = $('input[name=dateType]'),
        $csvUploadClear = $("#csvUploadClear");

    $date.val(new Date().toDateInputValue());

    $cr_dr.change((e) => {
        statement = [];
        statement_ = [];
        $dvCSV.html('');
        $csvUpload.val('');
        cr_dr = $cr_dr.is(':checked');
        if ($cr_dr.is(':checked')) {
            nve_cr_rvsl = false;
            $nve_cr_rvsl.prop('checked', false);
        }
    });

    $nve_cr_rvsl.change((e) => {
        statement = [];
        statement_ = [];
        $dvCSV.html('');
        $csvUpload.val('');
        nve_cr_rvsl = $nve_cr_rvsl.is(':checked');
        if ($nve_cr_rvsl.is(':checked')) {
            cr_dr = false;
            $cr_dr.prop('checked', false);
        }
    });

    $dateType.change((e) => {
        statement = [];
        statement_ = [];
        $dvCSV.html('');
        $csvUpload.val('');
        $('#date').val('');
        $('#endDate').val('');
        $('#startDate').val('');
        dateType = $('input[name=dateType]:checked').val();
        switch (dateType) {
            case 'hourly': {
                $('.hourly-date-type').show();
                $('.daily-date-type').hide();
                break;
            }
            case 'daily': {
                $('.hourly-date-type').hide();
                $('.daily-date-type').show();
                break;
            }
        }
    });

    $date.change((e) => {
        $csvUpload.trigger('change');
    });

    $csvUpload.change(function (){
        $('#wait').show();
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
                $('#wait').hide();
                return notification('This browser does not support HTML5.','','warning');
            }
        } else {
            $('#wait').hide();
            return notification('Please select a valid CSV file.','Note that symbols and special characters are not allowed in the filename!','warning');
        }
    });

    $csvUploadClear.click(() => {
        statement = [];
        statement_ = [];
        $dvCSV.html('');
        $csvUpload.val('');
    });

    function previewStatement(rows) {
        let skip = 0,
            table = $('<table border="1" style="text-align: center; width: 100%;" />');
        statement = [];
        statement_ = [];
        for (let i = -1; i < rows.length; i++) {
            let cells,
                cells_,
                invoice = {},
                row = $("<tr />");
            if (i >= 0){
                cells_ = CSVtoArray(rows[i]);
                if (!cells_) {
                    skip++;
                    continue;
                }
            }
            if (i === -1) {
                cells = ['POSTING DATE', 'VALUE DATE', 'CREDIT', 'DEBIT', 'BALANCE', 'DESCRIPTION'];
            } else if (i === 0) {
                headers = cells = cells_;
            } else {
                cells = (cells_.length > 7)? cells_.slice(0, 7) : cells_;
            }
            if (cells.join(' ').length > 10) {
                if (i >= 0 && cr_dr) cells.splice(3, 0, '');
                for (let j = 0; j < cells.length; j++) {
                    cells[j] = (cells[j]) ? (cells[j]).trim() : cells[j];
                    if (!cells[j] && cells[j] !== '')
                        continue;
                    let cell = $(`<td class="${ ((j < 2 && dateType === 'hourly') || (j === 3 && cr_dr))? 'disabled':'' }" />`);
                    if (i > 0) {
                        if (j === 0 || j === 1) {
                            cells[j] = (dateType === 'hourly')? $date.val() : cells[j];
                            cell.html(`<i class="sn">${(j === 0)? i+'.':''}</i>
                                <input id="invoice-${i-skip}-${j}" type="date" value="${formatDate(cells[j])}" 
                                    disabled="${(dateType === 'hourly')? 'disabled':''}" />`);
                        } else if (j === 2 || j === 3 || j === 4) {
                            let credit = currencyToNumberformatter(cells[2]);
                            if (cr_dr && credit < 0) {
                                if (j === 2) cell.html(`<span id="invoice-${i-skip}-2"></span>`);
                                if (j === 3) cell.html(`<span id="invoice-${i-skip}-3">${numberToCurrencyformatter(cells[2])}</span>`);
                                if (j === 4) cell.html(`<span id="invoice-${i-skip}-4">${numberToCurrencyformatter(cells[4])}</span>`);
                            } else {
                                cell.html(`<span id="invoice-${i-skip}-${j}">${numberToCurrencyformatter(cells[j])}</span>`);
                            }
                        } else {
                            cell.html(`<span id="invoice-${i-skip}-${j}">${cells[j]}</span>`);
                        }
                    } else {
                        if (i === 0) {
                            let select = `<select id="invoice-0-${j}">`;
                            for (let k = 0; k < headers.length; k++) {
                                headers[k] =  headers[k].trim();
                                if (headers[k]) {
                                    if (headers[k] === cells[j]) {
                                        select = select.concat(`<option value="${headers[k]}" selected="selected">${headers[k]}</option>`);
                                    } else {
                                        select = select.concat(`<option value="${headers[k]}">${headers[k]}</option>`);
                                    }
                                }
                            }
                            select = ((j < 2 && dateType === 'hourly') || (j === 3 && cr_dr))? '':select.concat('</select>');
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
                        default: {
                            invoice[headers[j].replace(/[\W_]/g, '').toLowerCase()] = cells[j];
                        }
                    }
                }
            }
            if (i>0 && cells.length >= 6 && !$.isEmptyObject(invoice)) {
                statement.push(invoice);
            }
            table.append(row);
        }
        $dvCSV.html('');
        $dvCSV.append(table);
        $('#wait').hide();
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
            if (target_index === '0' || target_index === '1') {
                $invoice.val(formatDate(source_value));
            } else if (target_index === '2' || target_index === '3' || target_index === '4') {
                let credit = currencyToNumberformatter(source_value);
                if (target_index === '2') {
                    if (cr_dr && credit < 0) {
                        $(`#invoice-${i+1}-2`).text('');
                        $(`#invoice-${i+1}-3`).text(numberToCurrencyformatter(source_value));
                    } else {
                        $(`#invoice-${i+1}-2`).text(numberToCurrencyformatter(source_value));
                    }
                } else {
                    $invoice.text(numberToCurrencyformatter(source_value));
                }
            } else {
                $invoice.text(source_value);
            }
        }
    });

    $("#saveBulkUpload").click(function () {
        let payload = {},
            statementX = (statement_.length === 0)? $.extend(true, [], statement) : statement_;
        payload.account = $('#account').val();
        payload.start = $('#startDate').val();
        payload.end = $('#endDate').val();
        payload.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;
        if (!payload.account) return notification('Kindly fill all required field(s)!','','warning');
        if (dateType === 'hourly') {
            if (!$date.val()) return notification('Kindly fill all required field(s)!','','warning');
            payload.start = `${$date.val()} ${processTimeInput($('#startTime').val())}`;
            payload.end = `${$date.val()} ${processTimeInput($('#endTime').val())}`;
        } else if (dateType === 'daily') {
            if (!payload.start || !payload.end) return notification('Kindly fill all required field(s)!','','warning');
            payload.start = `${payload.start} ${processTimeInput('00:00')}`;
            payload.end = `${payload.end} ${processTimeInput('23:59')}`;
        }
        if (!statementX[0]) return notification('Please upload a valid CSV file.','','warning');
        validateStatement(statementX, (validation) => {
            if (validation.status){
                payload.statement = validation.data;
                validateStatement_(payload, (response) => {
                    if (response.status !== 200) {
                        swal({
                            title: "Are you sure?",
                            text: response.error,
                            icon: "warning",
                            buttons: true,
                            dangerMode: true
                        })
                            .then((yes) => {
                                if (yes) {
                                    uploadStatement(payload);
                                }
                            });
                    } else {
                        uploadStatement(payload);
                    }
                })
            } else {
                notification('There are error(s) in the uploaded statement!', '', 'warning');
            }
        });
    });

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
                if (nve_cr_rvsl && invoice.credit < 0) invoice.reversal = true;
                if (cr_dr && invoice.credit < 0) {
                    invoice.debit = -invoice.credit;
                    invoice.credit = 0;
                }
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
                // $col4.addClass('invalid');
                // errors.push(e+' is not a valid date');
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

    function validateStatement_(payload, callback) {
        $('#wait').show();
        $.ajax({
            'url': '/collection/bulk_upload/validate',
            'type': 'post',
            'data': payload,
            'success': function (data) {
                $('#wait').hide();
                callback(data);
            },
            'error': function (err) {
                console.log(err);
                $('#wait').hide();
                callback(err);
            }
        })
    }

    function uploadStatement(payload) {
        $('#wait').show();
        $.ajax({
            'url': '/collection/bulk_upload',
            'type': 'post',
            'data': payload,
            'success': function (data) {
                $('#wait').hide();
                if (data.status === 200) {
                    notification(data.response, '', 'success');
                    window.location.href = '/bulk-collection';
                } else {
                    console.log(data.error);
                    notification(data.error, '', 'error');
                }
            },
            'error': function (err) {
                if (err && err.statusText === 'Payload Too Large')
                    return notification('The file size is too large!',
                        'Kindly truncate unnecessary data or separate file into multiple batches', 'error', 5000);
                console.log(err);
                $('#wait').hide();
                notification('No internet connection', '', 'error');
            }
        })
    }

    function processTimeInput(time) {
        let timeSplit = time.split(':'),
            hours,
            minutes,
            meridian;
        hours = timeSplit[0];
        minutes = timeSplit[1];
        if (hours > 12) {
            meridian = 'pm';
            hours -= 12;
        } else if (hours < 12) {
            meridian = 'am';
            if (hours === 0) hours = 12;
        } else {
            meridian = 'pm';
        }
        return `${hours}:${minutes}:00 ${meridian}`;
    }

})(jQuery);