$(document).ready(function() {
    getClients();
});

let clients;
const urlParams = new URLSearchParams(window.location.search);
const advert_id = urlParams.get('id');

$('input[name=action_type]').change(function () {
    const action_type = $('input[name=action_type]:checked').val();
    if (action_type === "product") {
        $('#product-div').show();
        $('#custom_link-div').hide();
    } else if (action_type === "custom_link") {
        $('#product-div').hide();
        $('#custom_link-div').show();
    } 
});

$('#application-settings-option').click(e => {
    if ($('#application-settings-option').is(':checked')) {
        $('#application-settings-div').show();
    } else {
        $('#application-settings-div').hide();
    }
});

function getClients() {
    $('#wait').show();
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
            data.response.forEach(product => {
                if (product.enable_client_product === 1)
                    $("#product").append(`<option value="${product.ID}">${product.name}</option>`);
            });
            getAdvert();
        }
    });
}

function getAdvert() {
    $.ajax({
        type: 'get',
        url: `/advert/get/${advert_id}`,
        success: data => {
            $('#wait').hide();
            if (data.status !== 200)
                return notification(data.error, '', 'error');
                
            let advert = data.response;
            $('#title').val(advert.title);
            if (advert.image) {
                $('#image').html(`<hr><a class="thumbnail grouped_elements" rel="grouped_elements" data-toggle="tooltip" 
                    data-placement="bottom" title="Click to Expand!" href="/${advert.image}">
                        <img src="/${advert.image}" alt="Image"></a>`);
            }
            $('a.grouped_elements').fancybox();
            $('.thumbnail').tooltip();
            if (advert.action_type === 'product') {
                $(`input[name=action_type][value=product]`).prop('checked', true).trigger('change');
                $('#product').val(advert.action);
            } else if (advert.action_type === 'custom_link') {
                $(`input[name=action_type][value=custom_link]`).prop('checked', true).trigger('change');
                $('#custom_link').val(advert.action);
            }
            if (advert.client) {
                $('#client').val(advert.client.split(','));
                $('#client').multiselect("refresh");
            }
            if (advert.qualified === 1) $('#qualified').prop('checked', true);
            if (advert.application_settings_option === 1) {
                $('#application-settings-option').prop('checked', true);
                $('#application-settings-div').show();
            } else {
                $('#application-settings-option').prop('checked', false);
                $('#application-settings-div').hide();
            }
            if (advert.loan_requested) $('#loan_requested').val(numberToCurrencyformatter(advert.loan_requested));
            if (advert.tenor) $('#tenor').val(numberToCurrencyformatter(advert.tenor));
            if (advert.interest_rate) $('#interest_rate').val(numberToCurrencyformatter(advert.interest_rate));
        }
    });
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

function updateAdvert() {
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
        if (!advert.loan_requested || advert.loan_requested <= 0)
            return notification('Invalid loan requested','','warning');
        if (!advert.tenor || advert.tenor <= 0)
            return notification('Invalid tenor','','warning');
        if (!advert.interest_rate || advert.interest_rate <= 0)
            return notification('Invalid interest rate','','warning');
    }
    advert.created_by = (JSON.parse(localStorage.getItem("user_obj"))).ID;

    $('#wait').show();
    $.ajax({
        type: 'put',
        url: `/advert/update/${advert_id}`,
        data: advert,
        success: data => {
            if (data.status !== 200) {
                $('#wait').hide();
                return notification(data.error, '', 'error');
            }
            uploadImage(data.response, () => {
                $('#wait').hide();
                notification('Advert updated successfully!', '', 'success');
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