$(document).ready(function () {
    component_initializer();
    getCountries();
});
var productsControl = {};
var products = [];
function component_initializer() {
    productsControl = $('#investment_product').select2({
        allowClear: true,
        placeholder: "Search by Product Code/Name",
        ajax: {
            url: "/investment-products/all/1",
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

    getExistingConfigs();
}

function saveConfigs() {
    saveOrganisationData();
}
let selectedConfig = {};

function getExistingConfigs() {
    $.ajax({
        url: `investment-service/get-configs`,
        'type': 'get',
        'success': function (data) {
            selectedConfig = data;

            if (data.status === undefined) {
                $('#btnSave').val('Update');
                $('#wait').hide();
                // let option = new Option(`${data.acctName} (${data.code})`, data.productId, true, true);
                // $('#investment_product').append(option).trigger('change');
                $('#termination_no_day').val(data.investment_termination_days);

                $('#organisationName').val(data.name);
                $('#organisationEmail').val(data.email);
                $('#organisationPhone').val(data.phone);
                $('#organisationAddress').val(data.address);
                let option = new Option(`${data.country}`, data.country, true, true);
                $('#organisationCountry').append(option).trigger('change');
                option = new Option(`${data.state}`, data.state, true, true);
                $('#organisationState').append(option).trigger('change');

                $('#organisationPostcode').val(data.poBox);
                $('#organisationPostcode').val(data.poBox).trigger('change');


                $('#idPreviewLogo').attr("src", "../files" + data.logoPath);
                $('#idPreviewStamp').attr("src", "../files" + data.stampPath);
                $('#idPreviewSignanture').attr("src", "../files" + data.signaturePath);

                $('#idVatCharge').val(data.vat);
                $('#idWithHoldingTaxCharge').val(data.withHoldingTax);

                if (data.vatChargeMethod !== null)
                    $('#idVatMethod').val(data.vatChargeMethod);
                if (data.withHoldingTaxChargeMethod !== null)
                    $('#idWithHoldingTaxMethod').val(data.withHoldingTaxChargeMethod);


                $('#idTransferCharge').val(data.transferValue);
                if (data.transferChargeMethod !== null)
                    $('#idTransferMethod').val(data.transferChargeMethod);
                if (data.walletProductId !== undefined && data.walletProductId !== null) {
                    $("#investment_product").val(null).trigger('change');
                    $("#investment_product").append(new Option(`${data.productName} (${data.code})`, data.walletProductId, true, true)).trigger('change');
                }

            }
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}

function getCountries() {
    $.ajax({
        type: "GET",
        url: "/user/countries/",
        data: '{}',
        success: function (response) {
            //Temporary Approach
            let countries = JSON.parse(response);
            countries.map(x => {
                $('<option/>').val(x.country_name).html(x.country_name).appendTo('#organisationCountry');
            });
        }
    });
}

$('#organisationCountry').on('change',
    function () {
        if ($('#organisationCountry').val() === 'Nigeria') {
            getStates();
        }
    });

function getStates() {
    $.ajax({
        type: "GET",
        url: "/user/states/",
        data: '{}',
        success: function (response) {
            let states = JSON.parse(response);
            states.map(x => {
                $('<option/>').val(x.state).html(x.state).appendTo('#organisationState');
            });
        }
    });
}

function upload(parentFolder, folderName, file, imgId) {
    let formData = new FormData();
    formData.append('file', file);
    $.ajax({
        url: `/investment-service/upload-file/${imgId}/${parentFolder}/${folderName}`,
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) { },
        error: function () {
            swal('Failed', `Error! Uploading to ${folderName}, ${error}`, 'error');
        }
    });
}

function onInputChange() {
    if ($('#organisationName').val() !== '' && $('#organisationName').val() !== ' ' &&
        $('#organisationEmail').val() !== '' && $('#organisationEmail').val() !== ' ' &&
        $('#organisationPhone').val() !== '' && $('#organisationPhone').val() !== ' ' &&
        $('#organisationAddress').val() !== '' && $('#organisationAddress').val() !== ' ' &&
        $('#organisationCountry').val() !== '' && $('#organisationCountry').val() !== ' ' &&
        $('#organisationState').val() !== '' && $('#organisationState').val() !== ' ') {
        $('#btnSave').attr('disabled', false);
    } else {
        $('#btnSave').attr('disabled', true);
    }
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

$("#organisationEmail").on('focusout',
    function () {
        if (!validateEmail($(this).val())) {
            $(this).val('');
            swal('Invalid email format', '', 'error');
        }
    });


function saveOrganisationData() {
    $('#wait').show();
    let dt = new Date();
    let imgId = "";
    let logoPath = "",
        stampPath = "",
        signaturePath = "";
    if ($('#file-upload-logo')[0].files[0] !== undefined) {
        imgId = `${dt.getFullYear()}${dt.getMonth()}${dt.getDate()}${dt.getHours()}${dt.getMinutes()}${dt.getSeconds()}${dt.getMilliseconds()}`;
        let ext_ = $('#file-upload-logo')[0].files[0].type.split('/')[1];
        ext_ = (ext_ === 'jpeg') ? 'jpg' : ext_;
        logoPath = `/organisations/logos/${imgId}.${ext_}`;
        upload('organisations', 'logos', $('#file-upload-logo')[0].files[0], imgId);
    }

    if ($('#file-upload-stamp')[0].files[0] !== undefined) {
        imgId = `${dt.getFullYear()}${dt.getMonth()}${dt.getDate()}${dt.getHours()}${dt.getMinutes()}${dt.getSeconds()}${dt.getMilliseconds()}`;
        let ext_ = $('#file-upload-stamp')[0].files[0].type.split('/')[1];
        ext_ = (ext_ === 'jpeg') ? 'jpg' : ext_;
        stampPath = `/organisations/stamps/${imgId}.${ext_}`;
        upload('organisations', 'stamps', $('#file-upload-stamp')[0].files[0], imgId);
    }

    if ($('#file-upload-signature')[0].files[0] !== undefined) {
        imgId = `${dt.getFullYear()}${dt.getMonth()}${dt.getDate()}${dt.getHours()}${dt.getMinutes()}${dt.getSeconds()}${dt.getMilliseconds()}`;
        let ext_ = $('#file-upload-signature')[0].files[0].type.split('/')[1];
        ext_ = (ext_ === 'jpeg') ? 'jpg' : ext_;
        signaturePath = `/organisations/signatures/${imgId}.${ext_}`;
        upload('organisations', 'signatures', $('#file-upload-signature')[0].files[0], imgId);
    }

    let organisation = {
        name: $('#organisationName').val(),
        email: $('#organisationEmail').val(),
        phone: $('#organisationPhone').val(),
        address: $('#organisationAddress').val(),
        country: $('#organisationCountry').val(),
        state: $('#organisationState').val(),
        poBox: $('#organisationPostcode').val(),
        logoPath: (logoPath === '') ? selectedConfig.logoPath : logoPath,
        stampPath: (stampPath === '') ? selectedConfig.stampPath : stampPath,
        signaturePath: (signaturePath === '') ? selectedConfig.signaturePath : signaturePath,
        investment_termination_days: $('#termination_no_day').val(),
        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        vat: $('#idVatCharge').val(),
        withHoldingTax: $('#idWithHoldingTaxCharge').val(),
        vatChargeMethod: $('#idVatMethod').val(),
        withHoldingTaxChargeMethod: $('#idWithHoldingTaxMethod').val(),
        // withHoldingProductId: $('#investment_product_with_holdings').on('select2:select').val(),
        // vatProductId: $('#investment_product_vat').on('select2:select').val(),
        transferValue: $('#idTransferCharge').val(),
        transferChargeMethod: $('#idTransferMethod').val(),
        walletProductId: $('#investment_product').on('select2:select').val()
    };

    $.ajax({
        'url': '/investment-service/create-configs',
        'type': 'post',
        'data': organisation,
        'success': function (data) {
            console.log(data);
            if (data.error) {
                $('#wait').hide();
                swal('Oops! An error occurred while creating settings; Required field(s) missing',
                    '', 'error');
            } else {
                $('#wait').hide();
                swal('Settings saved successfully!', '', 'success');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Oops! An error occurred while saving settings ', '', 'error');
        }
    });
}