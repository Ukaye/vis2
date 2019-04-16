var product_obj = {};
$(document).ready(function () {
    get_global_items();
    $("li_sub_dir").html("New Product");
});

$("#saving_fees").on("keyup", function (event) {
    let val = $("#saving_fees").val();
    $("#saving_fees").val(formater(val));
});

function get_global_items() {
    var sPageURL = window.location.search.substring(1);
    if (sPageURL !== "") {
        var sURLVariables = sPageURL.split('=')[1];
        if (sURLVariables !== "") {
            getInvestmentProducts(sURLVariables);
        }
    }
    for (var i = 0; i < interest_conditions.length; i++) {
        $('<option/>').val(interest_conditions[i].value).html(interest_conditions[i].value).appendTo(
            '#condition_for_interest');
    }
    for (var i = 0; i < freq_withdrawal.length; i++) {
        $('<option/>').val(freq_withdrawal[i].value).html(freq_withdrawal[i].value).appendTo(
            '#withdrawal_charge_duration');
    }
}

$("#product_investment_amount_min").on("keyup", function (event) {
    let val = $("#product_investment_amount_min").val();
    $("#product_investment_amount_min").val(formater(val));
});

$("#minimum_bal_penalty_amount").on("keyup", function (event) {
    let val = $("#minimum_bal_penalty_amount").val();
    $("#minimum_bal_penalty_amount").val(formater(val));
});

$("#product_investment_amount_max").on("keyup", function (event) {
    let val = $("#product_investment_amount_max").val();
    $("#product_investment_amount_max").val(formater(val));
});

$("#minimum_bal").on("keyup", function (event) {
    let val = $("#minimum_bal").val();
    $("#minimum_bal").val(formater(val));
});

$("#withdrawal_charge_freq").on("keyup", function (event) {
    let val = $("#withdrawal_charge_freq").val();
    $("#withdrawal_charge_freq").val(formater(val));
});

$("#charge_interest_on_withdrawal").on("keyup", function (event) {
    let val = $("#charge_interest_on_withdrawal").val();
    $("#charge_interest_on_withdrawal").val(formater(val));
});


$("#interest_rate").on("keyup", function (event) {
    let val = $("#interest_rate").val();
    $("#interest_rate").val(formater(val));
});

$("#min_term").on("keyup", function (event) {
    $("#min_term").val(formater($("#min_term").val()));
    let val = $("#min_term").val();
    $('#max_term').attr('min', val);
});

$("#max_term").on("keyup", function (event) {
    $("#max_term").val(formater($("#max_term").val()));
});

$("#withdrawal_conditions_value").on("keyup", function (event) {
    $("#withdrawal_conditions_value").val(formater($("#withdrawal_conditions_value").val()));
});

$("#max_term").on("focusout", function (event) {
    let min_ = parseInt($("#min_term").val());
    let max_ = parseInt($("#max_term").val());
    if (min_ > max_) {
        $('#max_term').val("");
    }
});

$("#min_days_termination").on("keyup", function (event) {
    let val = $("#min_days_termination").val();
    $("#min_days_termination").val(formater(val));
});

$("#min_days_termination_charge").on("keyup", function (event) {
    let val = $("#min_days_termination_charge").val();
    $("#min_days_termination_charge").val(formater(val));
});

$('#premature_interest_rate').on("keyup", function (event) {
    let val = $("#premature_interest_rate").val();
    $("#premature_interest_rate").val(formater(val));
});

$('#product_code').keypress(function (e) {
    var k = e.keyCode,
        $return = ((k > 64 && k < 91) || (k > 96 && k < 123) || k == 8 || k == 32 || (k >= 48 && k <= 57));
    if (!$return) {
        return false;
    }
});

function getInvestmentProducts(id) {
    $.ajax({
        type: "GET",
        url: `/investment/products/${id}`,
        success: function (data) {
            if (data.status === undefined) {
                $("li_sub_dir").html("Update Product");
                product_obj = data[0];
                product_obj.histories = JSON.parse(product_obj.histories);
                $('#product_name').val(product_obj.name);
                $('#product_investment_amount_min').val(product_obj.investment_min);
                $('#product_investment_amount_max').val(product_obj.investment_max);
                $('#withdrawal_conditions_value').val(product_obj.freq_withdrawal);
                $('#saving_fees').val(product_obj.saving_fees);
                $('#opt_on_deposit').val((product_obj.saving_charge_opt === null) ? $(
                    '#opt_on_deposit').val() : product_obj.saving_charge_opt);
                $('#withdrawal_charge_freq').val(product_obj.withdrawal_fees);
                $('#withdrawal_charge_duration').val(product_obj.withdrawal_freq_duration);
                $('#minimum_bal').val(product_obj.minimum_bal);
                $('#product_code').val(product_obj.code);
                $('#interest_rate').val(product_obj.interest_rate);
                $('#condition_for_interest').val(product_obj.interest_disbursement_time);
                $('#forfeit_interest_on_withdrawal').attr('checked', true);
                $('#minimum_bal_penalty_amount').val(product_obj.minimum_bal_charges);
                $('#opt_on_minimum_bal_penalty_amount').val((product_obj.minimum_bal_charges_opt ===
                    null) ? $(
                    '#opt_on_minimum_bal_penalty_amount').val() : product_obj.minimum_bal_charges_opt);

                $('#charge_interest_on_withdrawal').val(product_obj.interest_forfeit_charge);
                $('#opt_on_charge_interest_on_withdrawal').val((product_obj.interest_forfeit_charge_opt ===
                    null) ? $(
                    '#opt_on_charge_interest_on_withdrawal').val() : product_obj.interest_forfeit_charge_opt);

                $('#opt_on_freq_charge').val((product_obj.withdrawal_freq_fees_opt ===
                    null) ? $(
                    '#opt_on_freq_charge').val() : product_obj.withdrawal_freq_fees_opt);
                $('#acct_allows_withdrawal').attr('checked', ((product_obj.acct_allows_withdrawal) ?
                    true : false));
                $('#inv_moves_wallet').attr('checked', ((product_obj.inv_moves_wallet) ?
                    true : false));
                $('#interest_moves_wallet').attr('checked', ((product_obj.interest_moves_wallet) ?
                    true : false));
                $('#min_term').val(product_obj.min_term);
                $('#max_term').val(product_obj.max_term);
                $('#premature_interest_rate').val(product_obj.premature_interest_rate);
                $('#min_days_termination').val(product_obj.min_days_termination);
                $('#min_days_termination_charge').val(product_obj.min_days_termination_charge);
                $('#opt_on_min_days_termination').val(product_obj.opt_on_min_days_termination);
                //opt_on_min_days_termination
                $('#btnSaveProduct').html('Update');
                $('#wait').hide();
            } else {
                $('#wait').hide();
                swal('Oops! An error occurred while geting Investment Product; Required field(s) missing', '', 'error');
            }
        }
    });
}

$("#acct_allows_withdrawal").on('change',
    function () {
        let status = $('#acct_allows_withdrawal').is(':checked');
        if (status) {
            $('#inv_moves_wallet').attr("checked", false);
            $('#interest_moves_wallet').attr("checked", false);
        }
    });

$("#inv_moves_wallet").on('change',
    function () {
        let status = $('#inv_moves_wallet').is(':checked');
        if (status) {
            $('#acct_allows_withdrawal').attr("checked", false);
        }
    });

$("#interest_moves_wallet").on('change',
    function () {
        let status = $('#interest_moves_wallet').is(':checked');
        if (status) {
            $('#acct_allows_withdrawal').attr("checked", false);
        }
    });


$("#chk_interest_rate").on('change',
    function () {
        let status = $('#chk_interest_rate').is(':checked');
        if (!status) {
            $('#interest_rate').val('');
            $('#condition_for_interest').val('');
            $('#charge_interest_on_withdrawal').val('');
            $('#opt_on_charge_interest_on_withdrawal').val('');
            $('#premature_interest_rate').val('');

        }
        activate_interest_controls(!status);
    });

$("#chk_wallet").on('change',
    function () {
        let status = $('#chk_wallet').is(':checked');
        if (!status) {
            $('#inv_moves_wallet').attr("checked", false);
            $('#acct_allows_withdrawal').attr("checked", false);
            $('#interest_moves_wallet').attr("checked", false);
        }
        $('#acct_allows_withdrawal').attr('disabled', !status);
        $('#inv_moves_wallet').attr('disabled', !status);
        $('#interest_moves_wallet').attr('disabled', !status);
    });

$("#chk_maturity_term").on('change',
    function () {
        let status = $('#chk_maturity_term').is(':checked');
        if (!status) {
            $('#min_term').val('');
            $('#max_term').val('');
        }
        $('#min_term').attr('disabled', !status);
        $('#max_term').attr('disabled', !status);
    });

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

$("#chk_min_bal_penalty").on('change',
    function () {
        let status = $('#chk_min_bal_penalty').is(':checked');
        if (!status) {
            $('#minimum_bal_penalty_amount').val('');
            $('#opt_on_minimum_bal_penalty_amount').val('');
        }
        $('#opt_on_minimum_bal_penalty_amount').attr("disabled", !status);
        $('#minimum_bal_penalty_amount').attr('disabled', !status);
    });

function activate_interest_controls(status) {
    $('#premature_interest_rate').attr('disabled', status);
    $('#interest_rate').attr('disabled', status);
    $('#condition_for_interest').attr('disabled', status);
    $('#forfeit_interest_on_withdrawal').attr('disabled', status);
}

$("#forfeit_interest_on_withdrawal").on('change',
    function () {
        let _status = $('#forfeit_interest_on_withdrawal').is(':checked');
        activate_interest_penalty_controls(!_status);
    });

function activate_interest_penalty_controls(status) {
    $('#charge_interest_on_withdrawal').attr('disabled', status);
    $('#opt_on_charge_interest_on_withdrawal').attr('disabled', status);
}

$("#product_investment_amount_min").on('focusout',
    function () {
        validate_values($("#product_investment_amount_min"), $("#product_investment_amount_max"), "Minimum investment value can not be greater than the Maximum investment value");
    });


function validate_values(val1, val2, message) {
    if (val1.val() !== '') {
        let _val1 = parseInt(val1.val().split(',').join(''));
        let _val2 = parseInt(val2.val().split(',').join(''));
        if (_val1 <= _val2) {
            val1.val('');
            swal(message, '', 'error');
        }
    }
}

function validate_values_(val1, val2, message) {
    if (val1.val() !== '') {
        let _val1 = parseInt(val1.val().split(',').join(''));
        let _val2 = parseInt(val2.val().split(',').join(''));
        if (_val1 > _val2) {
            val1.val('');
            swal(message, '', 'error');
        }
    }
}

function validate_values_2(val1, val2, val3, message) {
    if (val1.val() !== '') {
        let _val1 = parseInt(val1.val().split(',').join(''));
        let _val2 = parseInt(val2.val().split(',').join(''));
        let _val3 = parseInt(val3.val().split(',').join(''));
        if ((_val1 >= _val2) || (_val1 >= _val3)) {
            val1.val('');
            swal(message, '', 'error');
        }
    }
}

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




$("#product_name").on('focusout',
    function () {
        if (!$("#product_name").val().replace(/\s/g, '').length) {
            swal('Invalid product name', '', 'error');
            $("#product_name").val('');
        }
    });


$("#withdrawal_charge_freq").on('focusout',
    function () {
        validate_values_($("#withdrawal_charge_freq"), $("#product_investment_amount_min"), "Charge for above freq. can not be greater than the Minimum investment");
    });

$("#charge_interest_on_withdrawal").on('focusout',
    function () {
        validate_values_($("#charge_interest_on_withdrawal"), $("#product_investment_amount_min"), "Charge on for Premature Investment. can not be greater than the Minimum investment");
    });

$("#min_days_termination_charge").on('focusout',
    function () {
        validate_values_($("#min_days_termination_charge"), $("#product_investment_amount_min"), "Charge for Impromptu termination can not be greater than the Minimum investment");
    });


$("#product_investment_amount_max").on('focusout',
    function () {
        validate_values($("#product_investment_amount_max"), $("#product_investment_amount_min"), "Minimum investment value can not be greater than the Maximum investment value");
    });


$("#saving_fees").on('focusout',
    function () {
        validate_values_2($("#saving_fees"), $("#product_investment_amount_max"), $("#product_investment_amount_min"), "Charges on Deposit can not be greater than either Minimum or Maximum investment value");
    });

$("#minimum_bal").on('focusout',
    function () {
        if ($("#minimum_bal_penalty_amount").val() === '') {
            validate_values_2($("#minimum_bal"), $("#product_investment_amount_max"), $("#product_investment_amount_min"), "Minimum balance can not be greater than either Minimum or Maximum investment value");
        } else {
            validate_values_3($("#minimum_bal_penalty_amount"), $("#minimum_bal"), $("#product_investment_amount_max"), $("#product_investment_amount_min"), "Penalty Charge can not be greater than either Minimum balance, Minimum or Maximum investment value");
        }

    });

$("#minimum_bal_penalty_amount").on('focusout',
    function () {
        validate_values_3($("#minimum_bal_penalty_amount"), $("#minimum_bal"), $("#product_investment_amount_max"), $("#product_investment_amount_min"), "Penalty Charge can not be greater than either Minimum balance, Minimum or Maximum investment value");
    });

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


function set_investment_product() {
    product_obj.name = $('#product_name').val();
    product_obj.investment_max = $('#product_investment_amount_max').val();
    product_obj.investment_min = $('#product_investment_amount_min').val();
    product_obj.freq_withdrawal = $('#withdrawal_conditions_value').val();
    product_obj.saving_fees = $('#saving_fees').val();
    product_obj.saving_charge_opt = $('#opt_on_deposit').val();
    product_obj.withdrawal_fees = $('#withdrawal_charge_freq').val();
    product_obj.withdrawal_freq_duration = $('#withdrawal_charge_duration').val();
    product_obj.minimum_bal = $('#minimum_bal').val();
    product_obj.code = $('#product_code').val();
    product_obj.interest_rate = $('#interest_rate').val();
    product_obj.interest_disbursement_time = $('#condition_for_interest').val();
    product_obj.is_forfeit = $('#forfeit_interest_on_withdrawal').is(':checked') ? 1 : 0;
    product_obj.interest_forfeit_charge = $('#charge_interest_on_withdrawal').val();
    product_obj.interest_forfeit_charge_opt = $('#opt_on_charge_interest_on_withdrawal').val();
    product_obj.minimum_bal_charges = $('#minimum_bal_penalty_amount').val();
    product_obj.minimum_bal_charges_opt = $('#opt_on_minimum_bal_penalty_amount').val();
    product_obj.withdrawal_freq_fees_opt = $('#opt_on_freq_charge').val();

    product_obj.acct_allows_withdrawal = $('#acct_allows_withdrawal').is(':checked') ? 1 : 0;
    product_obj.inv_moves_wallet = $('#inv_moves_wallet').is(':checked') ? 1 : 0;
    product_obj.interest_moves_wallet = $('#interest_moves_wallet').is(':checked') ? 1 : 0;
    product_obj.min_term = parseInt($('#min_term').val());
    product_obj.max_term = parseInt($('#max_term').val());
    product_obj.histories = (product_obj.histories == null) ? [] : product_obj.histories;

    product_obj.premature_interest_rate = $('#premature_interest_rate').val();
    product_obj.min_days_termination = $('#min_days_termination').val();
    product_obj.min_days_termination_charge = $('#min_days_termination_charge').val();
    product_obj.opt_on_min_days_termination = $('#opt_on_min_days_termination').val();
    product_obj.createdBy = (JSON.parse(localStorage.getItem("user_obj"))).ID;
    if (product_obj.code !== '' && product_obj.name !== '' && product_obj.investment_max !== '' && product_obj.investment_min && product_obj.minimum_bal !== '') {
        if (product_obj.ID === undefined) {
            $.ajax({
                'url': '/investment/products',
                'type': 'post',
                'data': product_obj,
                'success': function (data) {
                    if (data.status === 200) {
                        $('#wait').hide();
                        swal('Investment Product created successfully!!!. Kindly select MORE button to set Requirement for REVIEW,APPROVAL and POST', '', 'success');
                        var url = "./all-investment-products";
                        setTimeout(function () {
                            $(location).attr('href', url);
                        }, 2500);
                        $('input').val("");
                        $('input').attr("checked", false);
                    } else {
                        $('#wait').hide();
                        swal('Oops! An error occurred while saving Investment Product; Required field(s) missing',
                            '', 'error');
                    }
                },
                'error': function (err) {
                    $('#wait').hide();
                    swal('Oops! An error occurred while saving Investment Product; Required field(s) missing',
                        '', 'error');
                }
            });
        } else {
            product_obj.histories.push({
                createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
                rate: product_obj.interest_rate
            });
            $.ajax({
                url: `/investment/products/${product_obj.ID}`,
                'type': 'post',
                'data': product_obj,
                'success': function (data) {
                    if (data.status === 200) {
                        $('#wait').hide();
                        swal('Investment Product updated successfully!', '', 'success');
                        var url = "./all-investment-products";
                        $(location).attr('href', url);
                        $('input').val("");
                        $('input').attr("checked", false);
                    } else {
                        $('#wait').hide();
                        swal('Oops! An error occurred while updating Investment Product; Required field(s) missing',
                            '', 'error');
                    }
                },
                'error': function (err) {
                    $('#wait').hide();
                    swal('Oops! An error occurred while updating Investment Product; Required field(s) missing',
                        '', 'error');
                }
            });
        }
    } else {
        swal('Required field(s) missing',
            '', 'error');
    }
}