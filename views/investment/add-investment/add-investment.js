var addMonths = '../../../node_modules/date-fns/add_months/index';
// import * as differenceInMinutes from 'date-fns/difference_in_minutes';
let clientBalance = 0;

$(document).ready(function () {
    component_initializer();
    let currentDate = new Date();
    let _cmax = `${currentDate.getUTCFullYear()}-${pad(currentDate.getMonth()+1)}-${pad(currentDate.getDate())}`;
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
            $("#amount_info_error").html(" - Amount can not be below or above configured investment value");
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
        $("#amount_info").html(`Min.: ${selectedValue.investment_min} Max.:${selectedValue.investment_max}`);
        let start_with = $("#investment_date_start").val();

        let min_date = new Date(start_with);
        let max_date = new Date(start_with);

        min_date.setMonth((min_date.getMonth() + 1) + parseInt(selectedValue.min_term));
        max_date.setMonth((max_date.getMonth() + 1) + parseInt(selectedValue.max_term));

        let _min = `${min_date.getUTCFullYear()}-${pad(min_date.getMonth())}-${pad(min_date.getDate())}`;
        let _max = `${max_date.getUTCFullYear()}-${pad(max_date.getMonth())}-${pad(max_date.getDate())}`;
        $('#investment_mature_date').attr('min', _min);
        $('#investment_mature_date').attr('max', _max);

        $('#investment_mature_date').val(0);
        if (!isNaN(min_date.getDate()) && !isNaN(max_date.getDate())) {
            $("#duration_info").html(`Min.: ${pad(min_date.getDate())}-${pad(min_date.getMonth())}-${min_date.getUTCFullYear()} Max.: ${pad(max_date.getDate())}-${pad(max_date.getMonth())}-${max_date.getUTCFullYear()}`);
        }
        $('#investment_mature_date').attr('disabled', false);
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
    var min_date = new Date(start_with);
    var max_date = new Date(start_with);
    if (selectedValue !== undefined && selectedValue !== undefined) {
        $('#investment_mature_date').attr('disabled', false);
        min_date.setMonth((min_date.getMonth() + 1) + parseInt(selectedValue.min_term));
        max_date.setMonth((max_date.getMonth() + 1) + parseInt(selectedValue.max_term));

        let _min = `${min_date.getUTCFullYear()}-${pad(min_date.getMonth())}-${pad(min_date.getDate())}`;
        let _max = `${max_date.getUTCFullYear()}-${pad(max_date.getMonth())}-${pad(max_date.getDate())}`;
        $('#investment_mature_date').attr('min', _min);
        $('#investment_mature_date').attr('max', _max);
        if (!isNaN(min_date.getDate()) && !isNaN(max_date.getDate())) {
            $("#duration_info").html(`Min.: ${pad(min_date.getDate())}-${pad(min_date.getMonth())}-${min_date.getUTCFullYear()} Max.: ${pad(max_date.getDate())}-${pad(max_date.getMonth())}-${max_date.getUTCFullYear()}`);
        }
    } else {
        swal('Please select investment product', '', 'error');
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
    if (parseFloat(data.amount.toString()) <= parseFloat(clientBalance.toString())) {
        $.ajax({
            'url': '/investment-service/create',
            'type': 'post',
            'data': data,
            'success': function (data) {
                console.log(data);
                if (data.error) {
                    $('#wait').hide();
                    swal('Oops! An error occurred while creating Investment; Required field(s) missing',
                        '', 'error');
                } else {
                    $('#wait').hide();
                    swal('Investment created successfully!', '', 'success');
                    var url = "./all-investments";
                    $(location).attr('href', url);
                    $('input').val("");
                    $('input').prop("checked", false);
                }
            },
            'error': function (err) {
                console.log(err);
                $('#wait').hide();
                swal('Oops! An error occurred while creating Investment; ', '', 'error');
            }
        });
    } else {
        swal('Oops! Clent has insufficient balance', '', 'error');
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
        $('#investment_amount').val() !== "" &&
        $('#investment_date_start').val() !== "" &&
        $('#investment_mature_date').val() !== ""
    ) {
        $("#btn_save_product").attr('disabled', false);
    } else {
        $("#btn_save_product").attr('disabled', true);
    }
}



$('#client').on("select2:selecting", function (e) {
    $('#wait').show();
    setTimeout(function () {
        let _id = $('#client').on('select2:select').val();
        console.log(_id);
        $.ajax({
            url: `/investment-txns/client-wallet-balance/${_id}`,
            'type': 'get',
            'success': function (data) {
                console.log(data);
                clientBalance = data[0].balance;
                $('#opt_payment_made_by').html('');
                if (data.status === undefined) {
                    $('#wait').hide();
                    if (data.length > 0) {
                        let sign = '';
                        if (data[0].balance.toString().includes('-')) {
                            sign = '-';
                        }
                        $('<option/>').val('Wallet').html(`Wallet <strong>(₦${sign}${formater(data[0].balance)})</strong>`).appendTo(
                            '#opt_payment_made_by');
                        $('<option/>').val('Cash').html(`Cash`).appendTo(
                            '#opt_payment_made_by');
                    } else {
                        $('<option/>').val('Wallet').html(`Wallet <strong>(₦0.00)</strong>`).appendTo(
                            '#opt_payment_made_by');
                        $('<option/>').val('Cash').html(`Cash`).appendTo(
                            '#opt_payment_made_by');
                    }
                }
            },
            'error': function (err) {
                console.log(err);
                $('#wait').hide();
            }
        });
    }, 2500);
});