$(document).ready(function() {
    getClients();
});

let clients,
    products,
    settings_obj = {},
    action_type = 'product';

$('input[name=action_type]').change(() => {
    action_type = $('input[name=action_type]:checked').val();
    if (action_type === 'product') {
        $('#product-div').show();
        $('#custom_link-div').hide();
    } else if (action_type === 'custom_link') {
        $('#product-div').hide();
        $('#custom_link-div').show();
    }
    setApplicationSetting();
});

$('#product').change(() => {
    setApplicationSetting();
});

$('#application-settings-option').click(() => {
    if ($('#application-settings-option').is(':checked')) {
        $('#application-settings-div').show();
    } else {
        $('#application-settings-div').hide();
    }
});

function getClients() {
    $.ajax({
        type: 'get',
        url: '/user/clients-list-full',
        success: data => {
            clients = JSON.parse(data);
            clients.forEach(client => {
                $("#client").append(`<option value="${client.ID}">${client.fullname || '--'} (${client.email || client.phone})</option>`);
            });
            $('#client').multiselect({
                includeSelectAllOption: true
            });
            getProducts();
        }
    });
}

function getProducts() {
    $.ajax({
        type: 'get',
        url: '/workflows',
        success: data => {
            products = data.response;
            products.forEach(product => {
                if (product.enable_client_product === 1)
                    $("#product").append(`<option value="${product.ID}">${product.name}</option>`);
            });
            setApplicationSetting();
            getPurposes();
        }
    });
}

function getPurposes() {
    $.ajax({
        type: 'get',
        url: '/settings/application/loan_purpose',
        success: data => {
            data.response.forEach(purpose => {
                $("#loan_purpose").append(`<option value="${purpose.ID}">${purpose.title}</option>`);
            });
        }
    });
}

function setApplicationSetting() {
    const product = ($.grep(products, e => {return e.ID === Number($('#product').val())}))[0];
    if (action_type === 'product' && product.application_settings_option === 1) {
        if (product.loan_requested_min) {
            settings_obj.loan_requested_min = product.loan_requested_min;
            $('.loan_requested_min').text(numberToCurrencyformatter(settings_obj.loan_requested_min));
        }
        if (product.loan_requested_max) {
            settings_obj.loan_requested_max = product.loan_requested_max;
            $('.loan_requested_max').text(numberToCurrencyformatter(settings_obj.loan_requested_max));
        }
        if (product.tenor_min) {
            settings_obj.tenor_min = product.tenor_min;
            $('.tenor_min').text(numberToCurrencyformatter(settings_obj.tenor_min));
        }
        if (product.tenor_max) {
            settings_obj.tenor_max = product.tenor_max;
            $('.tenor_max').text(numberToCurrencyformatter(settings_obj.tenor_max));
        }
        if (product.interest_rate_min) {
            settings_obj.interest_rate_min = product.interest_rate_min;
            $('.interest_rate_min').text(numberToCurrencyformatter(settings_obj.interest_rate_min));
        }
        if (product.interest_rate_max) {
            settings_obj.interest_rate_max = product.interest_rate_max;
            $('.interest_rate_max').text(numberToCurrencyformatter(settings_obj.interest_rate_max));
        }
    } else {
        settings_obj = {};
        $('.loan_requested_min').text('None');
        $('.loan_requested_max').text('None');
        $('.tenor_min').text('None');
        $('.tenor_max').text('None');
        $('.interest_rate_min').text('None');
        $('.interest_rate_max').text('None');
    }
}

$("#loan_requested").on("keyup", e => {
    $("#loan_requested").val(numberToCurrencyformatter(e.target.value));
});

$("#tenor").on("keyup", e => {
    $("#tenor").val(numberToCurrencyformatter(e.target.value));
});

$("#interest_rate").on("keyup", e => {
    $("#interest_rate").val(numberToCurrencyformatter(e.target.value));
});

function postAdvert() {
    let advert = {};
    advert.title = $('#title').val();
    advert.client = $('#client').val();
    if (!advert.title || !advert.client)
        return notification('Kindly fill all required fields!', '', 'warning');
    if (advert.client.length === clients.length) {
        advert.client = 'all';
    } else {
        advert.client = advert.client.join();
    }
    advert.action_type = $('input[name=action_type]:checked').val();
    if (advert.action_type === "product") {
        advert.action = $('#product').val();
        if (!advert.action) return notification('Kindly select a product', '', 'warning');
    } else if (advert.action_type === "custom_link") {
        advert.action = $('#custom_link').val();
        if (!advert.action) return notification('Kindly input a custom link', '', 'warning');
    } 
    advert.qualified = ($('#qualified').is(':checked'))? 1 : 0;
    advert.application_settings_option = ($('#application-settings-option').is(':checked'))? 1 : 0;
    if (advert.application_settings_option === 1) {
        advert.loan_requested = currencyToNumberformatter($('#loan_requested').val());
        advert.tenor = currencyToNumberformatter($('#tenor').val());
        advert.interest_rate = currencyToNumberformatter($('#interest_rate').val());
        advert.loan_purpose = $('#loan_purpose').val();
        if (!advert.loan_requested || advert.loan_requested <= 0)
            return notification('Invalid loan requested','','warning');
        if (!advert.tenor || advert.tenor <= 0)
            return notification('Invalid tenor','','warning');
        if (!advert.interest_rate || advert.interest_rate <= 0)
            return notification('Invalid interest rate','','warning');
        if (!advert.loan_purpose)
            return notification('Invalid loan purpose','','warning');
        if (settings_obj) {
            if (settings_obj.loan_requested_min && advert.loan_requested < settings_obj.loan_requested_min)
                return notification(`Minimum loan amount is ₦${numberToCurrencyformatter(settings_obj.loan_requested_min)}`,'','warning');
            if (settings_obj.loan_requested_max && advert.loan_requested > settings_obj.loan_requested_max)
                return notification(`Maximum loan amount is ₦${numberToCurrencyformatter(settings_obj.loan_requested_max)}`,'','warning');
            if (settings_obj.tenor_min && advert.tenor < settings_obj.tenor_min)
                return notification(`Minimum tenor is ${numberToCurrencyformatter(settings_obj.tenor_min)} (months)`,'','warning');
            if (settings_obj.tenor_max && advert.tenor > settings_obj.tenor_max)
                return notification(`Maximum tenor is ${numberToCurrencyformatter(settings_obj.tenor_max)} (months)`,'','warning');
            if (settings_obj.interest_rate_min && advert.interest_rate < settings_obj.interest_rate_min)
                return notification(`Minimum interest rate is ${numberToCurrencyformatter(settings_obj.interest_rate_min)}%`,'','warning');
            if (settings_obj.interest_rate_max && advert.interest_rate > settings_obj.interest_rate_max)
                return notification(`Maximum interest rate is ${numberToCurrencyformatter(settings_obj.interest_rate_max)}%`,'','warning');
        }
    }
    advert.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;

    $('#wait').show();
    $.ajax({
        type: 'post',
        url: '/advert/create',
        data: advert,
        success: data => {
            if (data.status !== 200) {
                $('#wait').hide();
                return notification(data.error, '', 'error');
            }
            uploadImage(data.response, () => {
                $('#wait').hide();
                notification('Advert posted successfully!', '', 'success');
                window.location.href = "/all-advert";
            });
        },
        'error': err => {
            console.log(err);
            $('#wait').hide();
            notification('No internet connection', '', 'error');
        }
    });
}

function uploadImage(advert, callback) {
    const file = $(`#image_upload`)[0].files[0],
        title = advert.title.trim().replace(/ /g, '_');
    if (!file) return callback();
    const formData = new FormData();
    formData.append('file', file);
    $.ajax({
        url: `/upload/document/${advert.ID}/${title}/advert_images`,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: () => {
            callback();
        },
        error: error => {
            notification(error, '', 'error');
        }
    });
};