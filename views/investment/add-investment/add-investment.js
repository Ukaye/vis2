let clientBalance = 0;

$(document).ready(function () {
    component_initializer();
    let currentDate = new Date();
    let _cmax = `${currentDate.getUTCFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;
    $('#investment_date_start').attr('max', _cmax);
});
var productsControl = {};
var products = [];

function component_initializer() {
    $('#client').select2({
        allowClear: true,
        placeholder: "Search by Email/Fullname",
        ajax: {
            url: "/client/all",
            dataType: "json",
            delay: 250,
            data: function (params) {
                params.page = (params.page === undefined || params.page === null) ? 0 : params.page;
                return {
                    limit: 10,
                    page: params.page,
                    search_string: params.term
                };
            },
            processResults: function (data, params) {
                params.page = params.page || 1;
                if (data.error) {
                    return {
                        results: []
                    };
                } else {
                    return {
                        results: data.map(function (item) {
                            return {
                                id: item.ID,
                                text: item.fullname
                            };
                        }),
                        pagination: {
                            more: params.page * 10
                        }
                    };
                }
            },
            cache: true
        }
    });

    productsControl = $('#investment_product').select2({
        allowClear: true,
        placeholder: "Search by Product Code/Name",
        ajax: {
            url: "/investment-products/all",
            dataType: "json",
            delay: 250,
            data: function (params) {
                params.page = (params.page === undefined || params.page === null) ? 0 : params.page;
                return {
                    limit: 10,
                    page: params.page,
                    search_string: params.term
                };
            },
            processResults: function (data, params) {
                if (data.length > 0) {
                    products.push(...data);
                }
                params.page = params.page || 1;
                if (data.error) {
                    return {
                        results: []
                    };
                } else {
                    return {
                        results: data.map(function (item) {
                            return {
                                id: item.ID,
                                text: `${item.name} (${item.code})`,
                                min: item.investment_min,
                                max: item.investment_max,
                                min_term: item.min_term,
                                max_term: item.max_term

                            };
                        }),
                        pagination: {
                            more: params.page * 10
                        }
                    };
                }
            },
            cache: true
        }
    });
}

$("#investment_amount").on("keyup", function (event) {
    let val = $("#investment_amount").val();
    $("#investment_amount").val(formater(val));
});

$("#investment_amount").on("focusout", function (event) {
    const selectedID = $("#investment_product").val();
    let selectedValue = products.find(x => x.ID.toString() === selectedID.toString());
    if (selectedValue !== undefined) {
        let amount = $("#investment_amount").val().split(',').join('');
        let amt_min = selectedValue.investment_min.split(',').join('');
        let amt_max = selectedValue.investment_max.split(',').join('');
        if (parseFloat(amount) < parseFloat(amt_min) || parseFloat(amount) > parseFloat(amt_max)) {
            $("#investment_amount").val("");
            swal('Amount can not be below or above configured investment value', '', 'error');
        } else {
            $("#amount_info_error").html("");
        }
    }
});

// $("#investment_interest").on("keyup", function (event) {
//     let val = $("#investment_interest").val();
//     $("#investment_interest").val(formater(val));
// }); $('#investment_product').on('select2:select').val(),

$("#investment_product").on("change", function (event) {
    const selectedID = $("#investment_product").val();
    let selectedValue = products.find(x => x.ID.toString() === selectedID.toString());
    if (selectedValue !== undefined) {
        $("#amount_info").html(`Min.: ${(selectedValue.investment_min === '') ? 'N/A' : selectedValue.investment_min} Max.:${(selectedValue.investment_max === '') ? 'N/A' : selectedValue.investment_max}`);
        let start_with = $("#investment_date_start").val();
        if (start_with !== '' && start_with !== ' ') {
            var _date = new Date(start_with);
            if (selectedValue !== undefined && selectedValue !== undefined) {
                let data = {
                    year: _date.getUTCFullYear(),
                    month: _date.getMonth(),
                    day: _date.getDate(),
                    min: parseInt(selectedValue.min_term),
                    max: parseInt(selectedValue.max_term)
                };
                $.ajax({
                    'url': '/investment-products/get-maturity-dates',
                    'type': 'post',
                    'data': data,
                    'success': function (data) {
                        if (!data.error) {
                            $('#wait').hide();
                            $('#investment_mature_date').attr('disabled', false);

                            const minDate = new Date(data.min);
                            let _m = minDate.getUTCMonth() + 1;
                            const _cmax_1 = `${minDate.getUTCFullYear()}-${pad(_m)}-${pad(minDate.getUTCDate())}`;
                            const maxDate = new Date(data.max);
                            let _m2 = maxDate.getUTCMonth() + 1;
                            const _cmax_2 = `${maxDate.getUTCFullYear()}-${pad(_m2)}-${pad(maxDate.getUTCDate())}`;

                            $('#investment_mature_date').attr('min', _cmax_1);
                            $('#investment_mature_date').attr('max', _cmax_2);
                            if (!isNaN(minDate.getDate()) && !isNaN(maxDate.getDate())) {
                                $("#duration_info").html(`Min.: ${pad(minDate.getUTCDate())}-${minDate.getUTCMonth() + 1}-${minDate.getUTCFullYear()} Max.: ${pad(maxDate.getUTCDate() + 1)}-${pad(maxDate.getUTCMonth())}-${maxDate.getUTCFullYear()}`);
                            }
                        } else {
                            $('#wait').hide();
                            swal('Oops! An error occurred while computing maturity date; kindly check your internet connection', '', 'error');
                        }
                    },
                    'error': function (err) {
                        $('#wait').hide();
                        swal('Oops! An error occurred while creating Investment; ', '', 'error');
                    }
                });
            } else {
                swal('Please select product', '', 'error');
                $('#investment_mature_date').attr('disabled', true);
            }
        }
    }
});

function pad(d) {
    return (parseInt(d) < 10) ? '0' + d.toString() : d.toString();
}



let start_with = "";
$("#investment_date_start").on("change", function (event) {
    let val = $("#investment_date_start").val();
    start_with = val;
    const selectedID = $("#investment_product").val();
    let selectedValue = products.find(x => x.ID.toString() === selectedID.toString());
    var _date = new Date(start_with);
    if (selectedValue !== undefined && selectedValue !== undefined) {
        let data = {
            year: _date.getUTCFullYear(),
            month: _date.getMonth(),
            day: _date.getDate(),
            min: parseInt(selectedValue.min_term),
            max: parseInt(selectedValue.max_term)
        };
        $.ajax({
            'url': '/investment-products/get-maturity-dates',
            'type': 'post',
            'data': data,
            'success': function (data) {
                if (!data.error) {
                    $('#wait').hide();
                    $('#investment_mature_date').attr('disabled', false);

                    const minDate = new Date(data.min);
                    let _m = minDate.getUTCMonth() + 1;
                    const _cmax_1 = `${minDate.getUTCFullYear()}-${pad(_m)}-${pad(minDate.getUTCDate())}`;
                    const maxDate = new Date(data.max);
                    let _m2 = maxDate.getUTCMonth() + 1;
                    const _cmax_2 = `${maxDate.getUTCFullYear()}-${pad(_m2)}-${pad(maxDate.getUTCDate())}`;

                    $('#investment_mature_date').attr('min', _cmax_1);
                    $('#investment_mature_date').attr('max', _cmax_2);
                    if (!isNaN(minDate.getDate()) && !isNaN(maxDate.getDate())) {
                        $("#duration_info").html(`Min.: ${pad(minDate.getUTCDate())}-${pad(minDate.getUTCMonth() + 1)}-${minDate.getUTCFullYear()} Max.: ${pad(maxDate.getUTCDate())}-${pad(maxDate.getUTCMonth() + 1)}-${maxDate.getUTCFullYear()}`);
                    }
                } else {
                    $('#wait').hide();
                    swal('Oops! An error occurred while computing maturity date; kindly check your internet connection', '', 'error');
                }
            },
            'error': function (err) {
                $('#wait').hide();
                swal('Oops! An error occurred while creating Investment; ', '', 'error');
            }
        });
    } else {
        swal('Please select product', '', 'error');
        $('#investment_mature_date').attr('disabled', true);
    }
});

$("#btn_save_product").on("click", function (event) {

    let selectedValue = products.find(x => x.ID.toString() === $("#investment_product").val().toString());
    var data = {
        clientId: $('#client').on('select2:select').val(),
        productId: $('#investment_product').on('select2:select').val(),
        amount: $('#investment_amount').val().split('.').join(''),
        investment_start_date: $('#investment_date_start').val(),
        investment_mature_date: $('#investment_mature_date').val(),
        code: selectedValue.code,
        selectedProduct: selectedValue,
        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        isPaymentMadeByWallet: $('#opt_payment_made_by').val()
    };

    if (selectedValue.interest_disbursement_time === 'Up-Front') {
        if (data.investment_start_date === '' && data.investment_mature_date === '') {
            swal('Oops! Product configured for Up-Front interest, Investment Start and Maturity date is required', '', 'error');
            return;
        }
    }
    if (data.isPaymentMadeByWallet === '1') {
        if (parseFloat(data.amount.toString()) <= parseFloat(clientBalance.toString())) {
            $.ajax({
                'url': '/investment-service/create',
                'type': 'post',
                'data': data,
                'success': function (data) {
                    if (data.error) {
                        $('#wait').hide();
                        swal('Oops! An error occurred while creating Investment; Required field(s) missing',
                            '', 'error');
                    } else {
                        $('#wait').hide();
                        swal('Account created successfully!', '', 'success');
                        var url = "./all-investments";
                        $(location).attr('href', url);
                        $('input').val("");
                        $('input').prop("checked", false);
                    }
                },
                'error': function (err) {
                    $('#wait').hide();
                    swal('Oops! An error occurred while creating Investment; ', '', 'error');
                }
            });
        } else {
            swal('Oops! Clent has insufficient wallet balance', '', 'error');
            return;
        }
    } else {
        $.ajax({
            'url': '/investment-service/create',
            'type': 'post',
            'data': data,
            'success': function (data) {
                if (data.error) {
                    $('#wait').hide();
                    swal('Oops! An error occurred while creating Investment; Required field(s) missing',
                        '', 'error');
                } else {
                    $('#wait').hide();
                    swal('Account created successfully!', '', 'success');
                    var url = "./all-investments";
                    $(location).attr('href', url);
                    $('input').val("");
                    $('input').prop("checked", false);
                }
            },
            'error': function (err) {
                $('#wait').hide();
                swal('Oops! An error occurred while creating Investment; ', '', 'error');
            }
        });
    }
});

$("input").on("change", function (event) {
    validate();
});

$("select").on("change", function (event) {
    validate();
});

function validate() {
    if (
        $('#client').on('select2:select').val() !== "0" &&
        $('#investment_product').on('select2:select').val() !== "0" &&
        $('#investment_amount').val() !== "") {
        $("#btn_save_product").attr('disabled', false);
    } else {
        $("#btn_save_product").attr('disabled', true);
    }
}



$('#client').on("select2:selecting", function (e) {
    $('#wait').show();
    setTimeout(function () {
        let _id = $('#client').on('select2:select').val();
        $.ajax({
            url: `/investment-txns/client-wallet-balance/${_id}`,
            'type': 'get',
            'success': function (data) {
                clientBalance = data[0].balance.toString();
                $('#opt_payment_made_by').html('');
                if (data.status === undefined) {
                    $('#wait').hide();
                    if (data.length > 0) {
                        let sign = '';
                        if (clientBalance.toString().includes('-')) {
                            sign = '-';
                        }
                        let _clientBalance = Number(clientBalance).toFixed(2);
                        $('<option/>').val('1').html(`Wallet <strong>(₦${sign}${formater(_clientBalance)})</strong>`).appendTo(
                            '#opt_payment_made_by');
                        $('<option/>').val('0').html(`Cash`).appendTo(
                            '#opt_payment_made_by');
                    } else {
                        $('<option/>').val('1').html(`Wallet <strong>(₦0.00)</strong>`).appendTo(
                            '#opt_payment_made_by');
                        $('<option/>').val('0').html(`Cash`).appendTo(
                            '#opt_payment_made_by');
                    }
                }
            },
            'error': function (err) {
                $('#wait').hide();
            }
        });
    }, 2500);
});