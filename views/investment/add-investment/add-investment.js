let clientBalance = 0;

$(document).ready(function () {
    component_initializer();
    get_global_items()
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
            url: "/investment-products/all/0",
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



function get_global_items() {
    for (var i = 0; i < interest_conditions.length; i++) {
        $('<option/>').val(interest_conditions[i].value).html(interest_conditions[i].value).appendTo(
            '#condition_for_interest');
    }
    for (var i = 0; i < freq_withdrawal.length; i++) {
        $('<option/>').val(freq_withdrawal[i].value).html(freq_withdrawal[i].value).appendTo(
            '#withdrawal_charge_duration');
    }

}



// $("#chk_min_bal_penalty").on('change',
//     function () {
//         let status = $('#chk_min_bal_penalty').is(':checked');
//         if (!status) {
//             $('#minimum_bal_penalty_amount').val('');
//             $('#opt_on_minimum_bal_penalty_amount').val('');
//         }
//         $('#opt_on_minimum_bal_penalty_amount').attr("disabled", !status);
//         $('#minimum_bal_penalty_amount').attr('disabled', !status);
//     });

$("#minimum_bal").on("keyup", function (event) {
    let val = $("#minimum_bal").val();
    $("#minimum_bal").val(formater(val));
});

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



$("#chk_enforce_count").on('change',
    function () {

        let _status = $('#chk_enforce_count').is(':checked');
        if (_status) {
            $('#opt_on_freq_charge').val('');
            $('#withdrawal_charge_freq').val('');
            $('#opt_on_freq_charge').attr('disabled', true);
            $('#withdrawal_charge_freq').attr('disabled', true);
        } else {
            $('#opt_on_freq_charge').attr('disabled', false);
            $('#withdrawal_charge_freq').attr('disabled', false);
            $('#opt_on_freq_charge').val('Fixed');
        }
    });


$("#acct_allows_withdrawal").on('change',
    function () {
        let status = $('#acct_allows_withdrawal').is(':checked');
        setWalletControlStatus(status);
    });

function setWalletControlStatus(status) {
    if (status) {
        $('#withdrawal_conditions_value').attr("disabled", false);
        $('#chk_enforce_count').attr("disabled", false);
        $('#withdrawal_charge_duration').attr("disabled", false);
        $('#withdrawal_charge_freq').attr("disabled", false);
        $('#opt_on_freq_charge').attr("disabled", false);
    } else {
        $('#withdrawal_conditions_value').attr("disabled", true);
        $('#withdrawal_conditions_value').val(0);
        $('#chk_enforce_count').attr("checked", false);
        $('#chk_enforce_count').attr("disabled", true);
        $('#withdrawal_charge_duration').attr("disabled", true);
        $('#withdrawal_charge_freq').attr("disabled", true);
        $('#withdrawal_charge_freq').val(0);
        $('#opt_on_freq_charge').attr("disabled", true);
    }
}
    


$("#chk_liquidation").on('change',
    function () {
        let status = $('#chk_liquidation').is(':checked');
        if (!status) {
            $('#min_days_termination').val('');
            $('#min_days_termination_charge').val('');
            $('#opt_on_min_days_termination').attr("checked", false);
        }
        $('#min_days_termination').attr('disabled', !status);
        $('#min_days_termination_charge').attr('disabled', !status);
        $('#opt_on_min_days_termination').attr('disabled', !status);
    });


    // $("#chk_wallet").on('change',
    // function () {
    //     let status = $('#chk_wallet').is(':checked');
    //     if (!status) {
    //         $('#inv_moves_wallet').attr("checked", false);
    //         $('#acct_allows_withdrawal').attr("checked", false);
    //         $('#interest_moves_wallet').attr("checked", false);
    //     }
    //     $('#acct_allows_withdrawal').attr('disabled', !status);
    //     $('#inv_moves_wallet').attr('disabled', !status);
    //     $('#interest_moves_wallet').attr('disabled', !status);

    //     $('#withdrawal_conditions_value').attr("disabled", true);
    //     $('#chk_enforce_count').attr("checked", false);
    //     $('#chk_enforce_count').attr("disabled", true);
    //     $('#withdrawal_charge_duration').attr("disabled", true);
    //     $('#withdrawal_charge_freq').attr("disabled", true);
    //     $('#opt_on_freq_charge').attr("disabled", true);
    // });



    $("#chk_enforce_count").on('change',
    function () {

        let _status = $('#chk_enforce_count').is(':checked');
        if (_status) {
            $('#opt_on_freq_charge').val('');
            $('#withdrawal_charge_freq').val('');
            $('#opt_on_freq_charge').attr('disabled', true);
            $('#withdrawal_charge_freq').attr('disabled', true);
        } else {
            $('#opt_on_freq_charge').attr('disabled', false);
            $('#withdrawal_charge_freq').attr('disabled', false);
            $('#opt_on_freq_charge').val('Fixed');
        }
    });

   

    $("#minimum_bal_penalty_amount").on('focusout',
    function () {
        validate_values_3($("#minimum_bal_penalty_amount"), $("#minimum_bal"), selectedValue.investment_max, selectedValue.investment_min, "Penalty Charge can not be greater than either Minimum balance, Minimum or Maximum investment value");
    });

    function validate_values_3(val1, val2, val3, val4, message) {
        if (val1.val() !== '') {
            let _val1 = parseInt(val1.val().split(',').join(''));
            let _val2 = parseInt(val2.val().split(',').join(''));
            let _val3 = parseInt(val3.val().split(',').join(''));
            let _val4 = parseInt(val4.val().split(',').join(''));
            if ((_val1 >= _val2) || (_val1 >= _val3) || (_val1 >= _val4)) {
                val1.val('');
                swal(message, '', 'error');
            }
        }
    }

    $("#withdrawal_charge_freq").on("keyup", function (event) {
        let val = $("#withdrawal_charge_freq").val();
        $("#withdrawal_charge_freq").val(formater(val));
    });

    $("#forfeit_interest_on_withdrawal").on('change',
    function () {
        let status = $('#chk_maturity_term').is(':checked');
        if (status) {
            let _status = $('#forfeit_interest_on_withdrawal').is(':checked');
            activate_interest_penalty_controls(!_status);
        } else {
            $('#forfeit_interest_on_withdrawal').attr('checked', false);
        }
    });

function activate_interest_penalty_controls(status) {
    $('#charge_interest_on_withdrawal').attr('disabled', status);
    $('#opt_on_charge_interest_on_withdrawal').attr('disabled', status);
}


$("#investment_product").on("change", function (event) {
    const selectedID = $("#investment_product").val();
    let selectedValue = products.find(x => x.ID.toString() === selectedID.toString());
    console.log(selectedValue.acct_allows_withdrawal, 'ooo')

    $('#interest_rate').val(selectedValue.interest_rate);
    $('#premature_interest_rate').val(selectedValue.premature_interest_rate);

    // I add this part, because we what to edit some parts of a selected a product while creating investment
    $('#condition_for_interest').val(selectedValue.interest_disbursement_time)
    $('#saving_fees').val(selectedValue.saving_fees);
    $('#opt_on_deposit').val((selectedValue.saving_charge_opt === null) ? $(
        '#opt_on_deposit').val() : selectedValue.saving_charge_opt);
    $('#minimum_bal').val(selectedValue.minimum_bal);
    $('#minimum_bal_penalty_amount').val(selectedValue.minimum_bal_penalty_amount);
    $('#opt_on_minimum_bal_penalty_amount').val(selectedValue.opt_on_minimum_bal_penalty_amount);
    $('#minimum_bal').val(selectedValue.minimum_bal);
    $('#minimum_bal_penalty_amount').val(selectedValue.minimum_bal_charges);
    $('#opt_on_minimum_bal_penalty_amount').val((selectedValue.minimum_bal_charges_opt === null) ? $(
        '#opt_on_minimum_bal_penalty_amount').val() : selectedValue.minimum_bal_charges_opt);
    $('#interest_moves_wallet').attr('checked', ((selectedValue.interest_moves_wallet) ?
    true : false));
    $('#inv_moves_wallet').attr('checked', ((selectedValue.inv_moves_wallet) ? true : false));
    $('#withdrawal_conditions_value').val(selectedValue.freq_withdrawal);
    $('#chk_can_terminate').attr('checked', ((selectedValue.canTerminate) ? true : false));
    $('#min_days_termination').val(selectedValue.min_days_termination);
    $('#min_days_termination_charge').val(selectedValue.min_days_termination_charge);
    $('#opt_on_min_days_termination').val(selectedValue.opt_on_min_days_termination);
    $('#withdrawal_conditions_value').val(selectedValue.freq_withdrawal);
    $('#min_days_termination').val(selectedValue.min_days_termination);
    $('#withdrawal_charge_duration').val(selectedValue.withdrawal_freq_duration);
    $('#withdrawal_charge_freq').val(selectedValue.withdrawal_fees);
    $('#opt_on_freq_charge').val((selectedValue.withdrawal_freq_fees_opt === null) ? $(
        '#opt_on_freq_charge').val() : selectedValue.withdrawal_freq_fees_opt);
    $('#chk_enforce_count').attr('checked', ((selectedValue.chkEnforceCount) ? true : false));
    $('#condition_for_interest').val(selectedValue.interest_disbursement_time)
    $('#acct_allows_withdrawal').attr('checked', ((selectedValue.acct_allows_withdrawal) ? true : false));

    if (selectedValue.acct_allows_withdrawal === 1) {
        $('#withdrawal_conditions_value').attr("disabled", false);
        $('#chk_enforce_count').attr("disabled", false);
        $('#withdrawal_charge_duration').attr("disabled", false);
        $('#withdrawal_charge_freq').attr("disabled", false);
        $('#opt_on_freq_charge').attr("disabled", false);
    }
    

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

                            console.log(data.min.split('-'))
                            const minDate = data.min
                            const splitMinDate = minDate.split('-');
                            const formattedMinDate = `${splitMinDate[0]}-${splitMinDate[1]}-${splitMinDate[2].slice(0,2)}`
                            
                            const maxDate = data.max;
                            const splitMaxDate = maxDate.split('-');
                            const formattedMaxDate = `${splitMaxDate[0]}-${splitMaxDate[1]}-${splitMaxDate[2].slice(0,2)}`
                            if (splitMaxDate[0] && splitMaxDate[1] && splitMaxDate[2] && splitMinDate[0] && splitMinDate[1] && splitMinDate[2]) {
                                $('#investment_mature_date').attr('min', formattedMinDate);
                                $('#investment_mature_date').attr('max', formattedMaxDate);
                                $("#duration_info").html(`Min.: ${formattedMinDate} | Max.: ${formattedMaxDate}`);
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






// $("#investment_product").on("change", function (event) {
//     const selectedID = $("#investment_product").val();
//     let selectedValue = products.find(x => x.ID.toString() === selectedID.toString());
//     $('#interest_rate').val(selectedValue.interest_rate);
//     $('#premature_interest_rate').val(selectedValue.premature_interest_rate);
//     if (selectedValue !== undefined) {
//         $("#amount_info").html(`Min.: ${(selectedValue.investment_min === '') ? 'N/A' : selectedValue.investment_min} Max.:${(selectedValue.investment_max === '') ? 'N/A' : selectedValue.investment_max}`);
//         let start_with = $("#investment_date_start").val();
//         if (start_with !== '' && start_with !== ' ') {
//             var _date = new Date(start_with);
//             if (selectedValue !== undefined && selectedValue !== undefined) {
//                 let data = {
//                     year: _date.getUTCFullYear(),
//                     month: _date.getMonth(),
//                     day: _date.getDate(),
//                     min: parseInt(selectedValue.min_term),
//                     max: parseInt(selectedValue.max_term)
//                 };
//                 $.ajax({
//                     'url': '/investment-products/get-maturity-dates',
//                     'type': 'post',
//                     'data': data,
//                     'success': function (data) {
//                         if (!data.error) {
//                             $('#wait').hide();
//                             $('#investment_mature_date').attr('disabled', false);

//                             const minDate = new Date(data.min);
//                             let _m = minDate.getUTCMonth() + 1;
//                             const _cmax_1 = `${minDate.getUTCFullYear()}-${pad(_m)}-${pad(minDate.getUTCDate())}`;
//                             const maxDate = new Date(data.max);
//                             let _m2 = maxDate.getUTCMonth() + 1;
//                             const _cmax_2 = `${maxDate.getUTCFullYear()}-${pad(_m2)}-${pad(maxDate.getUTCDate())}`;

//                             if (data.min !== null) {
//                                 $('#investment_mature_date').attr('min', _cmax_1);
//                             }
//                             if (data.max !== null) {
//                                 $('#investment_mature_date').attr('max', _cmax_2);
//                             }
//                             if (!isNaN(minDate.getDate()) && !isNaN(maxDate.getDate())) {
//                                 $("#duration_info").html(`Min.: ${(data.min !== null) ?
//                                     `${pad(minDate.getUTCDate())}-${pad(minDate.getUTCMonth() + 1)}-${minDate.getUTCFullYear()}` :
//                                     'None'} Max.: ${(data.max !== null) ?
//                                         `${pad(maxDate.getUTCDate())}-${pad(maxDate.getUTCMonth() + 1)}-${maxDate.getUTCFullYear()}` :
//                                         'None'} `);
//                             }
//                         } else {
//                             $('#wait').hide();
//                             swal('Oops! An error occurred while computing maturity date; kindly check your internet connection', '', 'error');
//                         }
//                     },
//                     'error': function (err) {
//                         $('#wait').hide();
//                         swal('Oops! An error occurred while creating Investment; ', '', 'error');
//                     }
//                 });
//             } else {
//                 swal('Please select product', '', 'error');
//                 $('#investment_mature_date').attr('disabled', true);
//             }
//         }
//     }
// });




let start_with = "";
$("#investment_date_start").on("change", function (event) {
    let val = $("#investment_date_start").val();
    console.log(val, 'abc')
    start_with = val;
    const selectedID = $("#investment_product").val();
    let selectedValue = products.find(x => x.ID.toString() === selectedID.toString());
    var _date = new Date(start_with);
    console.log(_date, '2345')
    console.log(_date.getUTCFullYear(), _date.getMonth(), _date.getDate(), 'iiiii')

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
                    $('#wait').hide();
                    $('#investment_mature_date').attr('disabled', false);
                    console.log(data.min.split('-'))
                    const minDate = data.min
                    const splitMinDate = minDate.split('-');
                    const formattedMinDate = `${splitMinDate[0]}-${splitMinDate[1]}-${splitMinDate[2].slice(0,2)}`
                    
                    const maxDate = data.max;
                    const splitMaxDate = maxDate.split('-');
                    const formattedMaxDate = `${splitMaxDate[0]}-${splitMaxDate[1]}-${splitMaxDate[2].slice(0,2)}`
                    if (splitMaxDate[0] && splitMaxDate[1] && splitMaxDate[2] && splitMinDate[0] && splitMinDate[1] && splitMinDate[2]) {
                        $('#investment_mature_date').attr('min', formattedMinDate);
                        $('#investment_mature_date').attr('max', formattedMaxDate);
                        $("#duration_info").html(`Min.: ${formattedMinDate} | Max.: ${formattedMaxDate}`);
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





// I commented this part
// let start_with = "";
// $("#investment_date_start").on("change", function (event) {
//     let val = $("#investment_date_start").val();
//     console.log(val, 'abc')
//     start_with = val;
//     const selectedID = $("#investment_product").val();
//     let selectedValue = products.find(x => x.ID.toString() === selectedID.toString());
//     var _date = new Date(start_with);
//     console.log(_date, '2345')
//     console.log(_date.getUTCFullYear(), _date.getMonth(), _date.getDate(), 'iiiii')

//     if (selectedValue !== undefined && selectedValue !== undefined) {
//         let data = {
//             year: _date.getUTCFullYear(),
//             month: _date.getMonth(),
//             day: _date.getDate(),
//             min: parseInt(selectedValue.min_term),
//             max: parseInt(selectedValue.max_term)
//         };
//         $.ajax({
//             'url': '/investment-products/get-maturity-dates',
//             'type': 'post',
//             'data': data,
//             'success': function (data) {
//                 if (!data.error) {
//                     $('#wait').hide();
//                     $('#investment_mature_date').attr('disabled', false);

//                     const minDate = new Date(data.min);
//                     let _m = minDate.getUTCMonth() + 1;
//                     const _cmax_1 = `${minDate.getUTCFullYear()}-${pad(_m)}-${pad(minDate.getUTCDate())}`;
//                     const maxDate = new Date(data.max);
//                     let _m2 = maxDate.getUTCMonth() + 1;
//                     const _cmax_2 = `${maxDate.getUTCFullYear()}-${pad(_m2)}-${pad(maxDate.getUTCDate())}`;
// console.log(_cmax_1, _cmax_2, 'dddddd')

//                     if (data.min !== null) {
//                         $('#investment_mature_date').attr('min', _cmax_1);
//                     }
//                     if (data.max !== null) {
//                         $('#investment_mature_date').attr('max', _cmax_2);
//                     }
//                     if (!isNaN(minDate.getDate()) && !isNaN(maxDate.getDate())) {
//                         $("#duration_info").html(`Min.: ${(data.min !== null) ?
//                             `${pad(minDate.getUTCDate())}-${pad(minDate.getUTCMonth() + 1)}-${minDate.getUTCFullYear()}` :
//                             'None'} Max.: ${(data.max !== null) ?
//                                 `${pad(maxDate.getUTCDate())}-${pad(maxDate.getUTCMonth() + 1)}-${maxDate.getUTCFullYear()}` :
//                                 'None'} `);
//                     }
//                 } else {
//                     $('#wait').hide();
//                     swal('Oops! An error occurred while computing maturity date; kindly check your internet connection', '', 'error');
//                 }
//             },
//             'error': function (err) {
//                 $('#wait').hide();
//                 swal('Oops! An error occurred while creating Investment; ', '', 'error');
//             }
//         });
//     } else {
//         swal('Please select product', '', 'error');
//         $('#investment_mature_date').attr('disabled', true);
//     }
// });




$("#btn_save_product").on("click", function (event) {
    $("#btn_save_product").attr('disabled', true);
    let selectedValue = products.find(x => x.ID.toString() === $("#investment_product").val().toString());
    var data = {
        clientId: $('#client').on('select2:select').val(),
        productId: $('#investment_product').on('select2:select').val(),
        amount: $('#investment_amount').val().split(',').join(''),
        investment_start_date: $('#investment_date_start').val(),
        investment_mature_date: $('#investment_mature_date').val(),
        code: selectedValue.code,
        selectedProduct: selectedValue,
        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        isPaymentMadeByWallet: $('#opt_payment_made_by').val(),
        interest_rate: $('#interest_rate').val(),
        premature_interest_rate: $('#premature_interest_rate').val(),


        freq_withdrawal: ($('#withdrawal_conditions_value').val() !== '') ? parseInt($('#withdrawal_conditions_value').val().split(',').join('')) : 0,
        saving_fees: $('#saving_fees').val().split(',').join(''),
        saving_charge_opt: $('#opt_on_deposit').val(),
        minimum_bal_charges: $('#minimum_bal_penalty_amount').val().split(',').join(''),
        minimum_bal_charges_opt: $('#opt_on_minimum_bal_penalty_amount').val(),
        acct_allows_withdrawal: $('#acct_allows_withdrawal').is(':checked') ? 1 : 0,
        inv_moves_wallet: $('#inv_moves_wallet').is(':checked') ? 1 : 0,
        interest_moves_wallet: $('#interest_moves_wallet').is(':checked') ? 1 : 0,
        chkEnforceCount : $('#chk_enforce_count').is(':checked') ? 1 : 0,
        withdrawal_freq_duration : $('#withdrawal_charge_duration').val(),
        withdrawal_fees : $('#withdrawal_charge_freq').val().split(',').join(''),
        withdrawal_freq_fees_opt : $('#opt_on_freq_charge').val(),
        canTerminate : $('#chk_can_terminate').is(':checked') ? 1 : 0,
        min_days_termination: $('#min_days_termination').val(),
        min_days_termination_charge : $('#min_days_termination_charge').val().split(',').join(''),
        opt_on_min_days_termination: $('#opt_on_min_days_termination').val(),
        minimum_bal: ($('#minimum_bal').val() !== '') ? $('#minimum_bal').val().split(',').join('') : '0',
        interest_disbursement_time: $('#condition_for_interest').val()
    };


    if (selectedValue.interest_disbursement_time === 'Up-Front') {
        if (data.investment_start_date === '' && data.investment_mature_date === '') {
            $("#btn_save_product").attr('disabled', false);
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
                    $("#btn_save_product").attr('disabled', false);
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
                $("#btn_save_product").attr('disabled', false);
                if (data.error) {
                    console.log(data.error, 'err')
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





// I commented this part
// $("#btn_save_product").on("click", function (event) {
//     $("#btn_save_product").attr('disabled', true);
//     let selectedValue = products.find(x => x.ID.toString() === $("#investment_product").val().toString());
//     var data = {
//         clientId: $('#client').on('select2:select').val(),
//         productId: $('#investment_product').on('select2:select').val(),
//         amount: $('#investment_amount').val().split(',').join(''),
//         investment_start_date: $('#investment_date_start').val(),
//         investment_mature_date: $('#investment_mature_date').val(),
//         code: selectedValue.code,
//         selectedProduct: selectedValue,
//         createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
//         isPaymentMadeByWallet: $('#opt_payment_made_by').val(),
//         interest_rate: $('#interest_rate').val(),
//         premature_interest_rate: $('#premature_interest_rate').val()
//     };

//     if (selectedValue.interest_disbursement_time === 'Up-Front') {
//         if (data.investment_start_date === '' && data.investment_mature_date === '') {
//             $("#btn_save_product").attr('disabled', false);
//             swal('Oops! Product configured for Up-Front interest, Investment Start and Maturity date is required', '', 'error');
//             return;
//         }
//     }
//     if (data.isPaymentMadeByWallet === '1') {
//         if (parseFloat(data.amount.toString()) <= parseFloat(clientBalance.toString())) {
//             $.ajax({
//                 'url': '/investment-service/create',
//                 'type': 'post',
//                 'data': data,
//                 'success': function (data) {
//                     $("#btn_save_product").attr('disabled', false);
//                     if (data.error) {
//                         $('#wait').hide();
//                         swal('Oops! An error occurred while creating Investment; Required field(s) missing',
//                             '', 'error');
//                     } else {
//                         $('#wait').hide();
//                         swal('Account created successfully!', '', 'success');
//                         var url = "./all-investments";
//                         $(location).attr('href', url);
//                         $('input').val("");
//                         $('input').prop("checked", false);
//                     }
//                 },
//                 'error': function (err) {
//                     $('#wait').hide();
//                     swal('Oops! An error occurred while creating Investment; ', '', 'error');
//                 }
//             });
//         } else {
//             swal('Oops! Clent has insufficient wallet balance', '', 'error');
//             return;
//         }
//     } else {
//         $.ajax({
//             'url': '/investment-service/create',
//             'type': 'post',
//             'data': data,
//             'success': function (data) {
//                 $("#btn_save_product").attr('disabled', false);
//                 if (data.error) {
//                     $('#wait').hide();
//                     swal('Oops! An error occurred while creating Investment; Required field(s) missing',
//                         '', 'error');
//                 } else {
//                     $('#wait').hide();
//                     swal('Account created successfully!', '', 'success');
//                     var url = "./all-investments";
//                     $(location).attr('href', url);
//                     $('input').val("");
//                     $('input').prop("checked", false);
//                 }
//             },
//             'error': function (err) {
//                 $('#wait').hide();
//                 swal('Oops! An error occurred while creating Investment; ', '', 'error');
//             }
//         });
//     }
// });






$("input").on("change", function (event) {
    validate();
});

$("select").on("change", function (event) {
    validate();
});

function validate() {
    if (
        $('#investment_date_start').val() !== "" &&
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
                clientBalance = (data.currentWalletBalance === null) ? 0 : data.currentWalletBalance;
                $('#opt_payment_made_by').html('');
                if (data.status === undefined) {
                    $('#wait').hide();
                    if (data.currentWalletBalance !== undefined) {
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