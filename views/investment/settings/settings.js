$(document).ready(function () {
    component_initializer();
    getCountries();
});

function component_initializer() {
    // $('#investment_product').select2({
    //     allowClear: true,
    //     placeholder: "Search by Product Code/Name",
    //     ajax: {
    //         url: "/investment-products/all",
    //         dataType: "json",
    //         delay: 250,
    //         data: function (params) {
    //             params.page = (params.page === undefined || params.page === null) ? 0 : params.page;
    //             return {
    //                 limit: 10,
    //                 page: params.page,
    //                 search_string: params.term
    //             };
    //         },
    //         processResults: function (data, params) {
    //             params.page = params.page || 1;
    //             if (data.error) {
    //                 return {
    //                     results: []
    //                 };
    //             } else {
    //                 return {
    //                     results: data.map(function (item) {
    //                         return {
    //                             id: item.ID,
    //                             text: `${item.name} (${item.code})`

    //                         };
    //                     }),
    //                     pagination: {
    //                         more: params.page * 10
    //                     }
    //                 };
    //             }
    //         },
    //         cache: true
    //     }
    // });

    // $('#investment_product_with_holdings').select2({
    //     allowClear: true,
    //     placeholder: "Search by Product Code/Name",
    //     ajax: {
    //         url: "/investment-products/all",
    //         dataType: "json",
    //         delay: 250,
    //         data: function (params) {
    //             params.page = (params.page === undefined || params.page === null) ? 0 : params.page;
    //             return {
    //                 limit: 10,
    //                 page: params.page,
    //                 search_string: params.term
    //             };
    //         },
    //         processResults: function (data, params) {
    //             params.page = params.page || 1;
    //             if (data.error) {
    //                 return {
    //                     results: []
    //                 };
    //             } else {
    //                 return {
    //                     results: data.map(function (item) {
    //                         return {
    //                             id: item.ID,
    //                             text: `${item.name} (${item.code})`

    //                         };
    //                     }),
    //                     pagination: {
    //                         more: params.page * 10
    //                     }
    //                 };
    //             }
    //         },
    //         cache: true
    //     }
    // });

    // $('#investment_product_vat').select2({
    //     allowClear: true,
    //     placeholder: "Search by Product Code/Name",
    //     ajax: {
    //         url: "/investment-products/all",
    //         dataType: "json",
    //         delay: 250,
    //         data: function (params) {
    //             params.page = (params.page === undefined || params.page === null) ? 0 : params.page;
    //             return {
    //                 limit: 10,
    //                 page: params.page,
    //                 search_string: params.term
    //             };
    //         },
    //         processResults: function (data, params) {
    //             console.log(data);
    //             params.page = params.page || 1;
    //             if (data.error) {
    //                 return {
    //                     results: []
    //                 };
    //             } else {
    //                 return {
    //                     results: data.map(function (item) {
    //                         return {
    //                             id: item.ID,
    //                             text: `${item.name} (${item.code})`

    //                         };
    //                     }),
    //                     pagination: {
    //                         more: params.page * 10
    //                     }
    //                 };
    //             }
    //         },
    //         cache: true
    //     }
    // });

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


                // option = new Option(`${data.vatAcctName} (${data.vatCode})`, data.vatProductId, true, true);
                // $('#investment_product_vat').append(option).trigger('change');
                // option = new Option(`${data.withHoldingsAcctName} (${data.withHoldingCode})`, data.withHoldingsProductId, true, true);
                // $('#investment_product_with_holdings').append(option).trigger('change');

                $('#idTransferCharge').val(data.transferValue);
                if (data.transferChargeMethod !== null)
                    $('#idTransferMethod').val(data.transferChargeMethod);
            }
        },
        'error': function (err) {
            console.log(err);
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

function upload(parentFolder,folderName, file, imgId) {
    let formData = new FormData();
    formData.append('file', file);
    $.ajax({
        url: `/investment-service/upload-file/${imgId}/${parentFolder}/${folderName}`,
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {},
        error: function () {
            swal('Failed', `Error! Uploading to ${folderName}`, 'error');
        }
    });
}

function onInputChange() {
    if ($('#organisationName').val() !== '' && $('#organisationName').val() !== ' ' &&
        $('#organisationEmail').val() !== '' && $('#organisationEmail').val() !== ' ' &&
        $('#organisationPhone').val() !== '' && $('#organisationPhone').val() !== ' ' &&
        $('#organisationAddress').val() !== '' && $('#organisationAddress').val() !== ' ' &&
        $('#organisationCountry').val() !== '' && $('#organisationCountry').val() !== ' ' &&
        $('#organisationState').val() !== '' && $('#organisationState').val() !== ' ' &&
        $('#organisationPostcode').val() !== '' && $('#organisationPostcode').val() != ' ' &&
        $('#termination_no_day').val() !== '' && $('#termination_no_day').val() != ' ' &&
        $('#investment_product').on('select2:select').val() !== '' && $('#termination_no_day').val() != ' ') {
        $('#btnSave').attr('disabled', false);
    } else {
        $('#btnSave').attr('disabled', true);
    }
}


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
        upload('organisations','logos', $('#file-upload-logo')[0].files[0], imgId);
    }

    if ($('#file-upload-stamp')[0].files[0] !== undefined) {
        imgId = `${dt.getFullYear()}${dt.getMonth()}${dt.getDate()}${dt.getHours()}${dt.getMinutes()}${dt.getSeconds()}${dt.getMilliseconds()}`;
        let ext_ = $('#file-upload-logo')[0].files[0].type.split('/')[1];
        ext_ = (ext_ === 'jpeg') ? 'jpg' : ext_;
        stampPath = `/organisations/stamps/${imgId}.${ext_}`;
        upload('organisations','stamps', $('#file-upload-stamp')[0].files[0], imgId);
    }

    if ($('#file-upload-signature')[0].files[0] !== undefined) {
        imgId = `${dt.getFullYear()}${dt.getMonth()}${dt.getDate()}${dt.getHours()}${dt.getMinutes()}${dt.getSeconds()}${dt.getMilliseconds()}`;
        let ext_ = $('#file-upload-logo')[0].files[0].type.split('/')[1];
        ext_ = (ext_ === 'jpeg') ? 'jpg' : ext_;
        signaturePath = `/organisations/signatures/${imgId}.${ext_}`;
        upload('organisations','signatures', $('#file-upload-signature')[0].files[0], imgId);
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
        productId: $('#investment_product').on('select2:select').val(),
        createdBy: (JSON.parse(localStorage.getItem("user_obj"))).ID,
        vat: $('#idVatCharge').val(),
        withHoldingTax: $('#idWithHoldingTaxCharge').val(),
        vatChargeMethod: $('#idVatMethod').val(),
        withHoldingTaxChargeMethod: $('#idWithHoldingTaxMethod').val(),
        // withHoldingProductId: $('#investment_product_with_holdings').on('select2:select').val(),
        // vatProductId: $('#investment_product_vat').on('select2:select').val(),
        transferValue: $('#idTransferCharge').val(),
        transferChargeMethod: $('#idTransferMethod').val()
    }

    $.ajax({
        'url': '/investment-service/create-configs',
        'type': 'post',
        'data': organisation,
        'success': function (data) {
            if (data.error) {
                $('#wait').hide();
                swal('Oops! An error occurred while creating Investment settings; Required field(s) missing',
                    '', 'error');
            } else {
                $('#wait').hide();
                swal('Investment settings saved successfully!', '', 'success');
            }
        },
        'error': function (err) {
            $('#wait').hide();
            swal('Oops! An error occurred while saving Investment settings ', '', 'error');
        }
    });
}