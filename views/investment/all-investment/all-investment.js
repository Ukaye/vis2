var table = {};
let data_row = {};
$(document).ready(function () {
    $('#bootstrap-data-table-export').DataTable();
    bindDataTable();
});

function padReferenceNo(value) {
    if (value.length < 8) {
        value = String('00000000' + value).slice(-8);
    }
    return value;
}

async function onRemoveBadge(id) {
    $('#wait').show();
    $.ajax({
        url: `investment-service/remove-mandates/${id}`,
        'type': 'get',
        'success': function (data) {
            if (data.status === undefined) {
                getMandates(data_row.ID);
            }
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}

function upload(parentFolder, subFolder, file, imgId) {
    return new Promise((resolve, reject) => {
        let formData = new FormData();
        formData.append('file', file);
        $.ajax({
            url: `/investment-service/upload-file/${imgId}/${parentFolder}/${subFolder}`,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                resolve(1)
            },
            error: err__ => {
                reject(err__);
            }
        });
    });
}

async function onAddMandatePassport() {
    if ($(`#idPassportImage`)[0].files[0] !== undefined) {
        let dt = new Date();
        let imgId = `${dt.getFullYear()}${dt.getMonth()+1}${dt.getDate()}${dt.getHours()}${dt.getMinutes()}${dt.getSeconds()}${dt.getMilliseconds()}`;
        let ext_ = $(`#idPassportImage`)[0].files[0].type.split('/')[1];
        ext_ = (ext_ === 'jpeg') ? 'jpg' : ext_;
        if (ext_.toString().toLowerCase() === 'jpg' || ext_.toString().toLowerCase() === 'png') {
            let filePath = `/mandate/passport/${imgId}.${ext_}`;
            let uploadItem = await upload('mandate', 'passport', $(`#idPassportImage`)[0].files[0], imgId);
            if (uploadItem === 1) {
                let _data = {
                    investmentId: data_row.ID,
                    passportPath: filePath,
                    isPassport: 1,
                    name: $('#idPassportName').val().toUpperCase()
                };
                await saveMandate(_data);
                $('#idSignatureName').val('');
                $('#idSignatureImage').val('');
            } else {
                swal('Oops! An error occurred while uploading file', '', 'error');
            }

        } else {
            swal('Oops! You can only upload PNG or JPEG Image', '', 'error');
        }
    }
}

async function onAddMandateSignature() {
    if ($(`#idSignatureImage`)[0].files[0] !== undefined) {
        let dt = new Date();
        let imgId = `${dt.getFullYear()}${dt.getMonth()+1}${dt.getDate()}${dt.getHours()}${dt.getMinutes()}${dt.getSeconds()}${dt.getMilliseconds()}`;
        let ext_ = $(`#idSignatureImage`)[0].files[0].type.split('/')[1];
        ext_ = (ext_ === 'jpeg') ? 'jpg' : ext_;
        if (ext_.toString().toLowerCase() === 'jpg' || ext_.toString().toLowerCase() === 'png') {
            let filePath = `/mandate/signature/${imgId}.${ext_}`;
            let uploadItem = await upload('mandate', 'signature', $(`#idSignatureImage`)[0].files[0], imgId);
            if (uploadItem === 1) {
                let _data = {
                    investmentId: data_row.ID,
                    signaturePath: filePath,
                    isSignature: 1,
                    name: $('#idSignatureName').val().toUpperCase()
                };
                await saveMandate(_data);
                $('#idSignatureName').val('');
                $('#idSignatureImage').val('');
            } else {
                swal('Oops! An error occurred while uploading file', '', 'error');
            }

        } else {
            swal('Oops! You can only upload PNG or JPEG Image', '', 'error');
        }
    }
}
//onAddMandateInstructure()
async function onAddMandateInstructure() {
    let _data = {
        investmentId: data_row.ID,
        instruction: $('#idInstructionBody').val(),
        isInstruction: 1,
        name: $('#idInstructionName').val().toUpperCase()
    };
    await saveMandate(_data);
    $('#idInstructionName').val('');
    $('#idInstructionBody').val('');
}



async function saveMandate(data) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/investment-service/create-mandates`,
            type: "POST",
            data: data,
            success: function (response) {
                if (response.error === undefined) {
                    swal('Mandate item added successfully!', '', 'success');
                    getMandates(data_row.ID);
                    resolve(1);
                } else {
                    swal('Oops! An error occurred while adding mandate, please try again later', '', 'error');
                }
                $('#wait').hide();
            },
            error: function () {
                $('#wait').hide();
                swal('Oops! An error occurred while adding mandate', '', 'error');
                reject(error);
            }
        });
    });
}

function getMandates(id) {
    $.ajax({
        url: `investment-service/get-mandates/${id}`,
        'type': 'get',
        'success': function (data) {
            if (data.status === undefined) {
                $('#wait').hide();
                let htmlPassportTags = '';
                let htmlSignatureTags = '';
                let htmlInstructionTags = '';
                data.forEach(element => {
                    if (element.isPassport === 1) {
                        htmlPassportTags += `<div class="badge badge-pill badge-info" style="margin:3px">
                        <div class="button" style="text-decoration: underline" onclick="onViewPassport('${element.passportPath}')">${element.name}</div>
                        <div class="badge badge-light" style="cursor:pointer;color:Red"
                            onclick="onRemoveBadge(${element.id})">X</div>
                    </div>`
                    } else if (element.isSignature === 1) {
                        htmlSignatureTags += `<div class="badge badge-pill badge-info" style="margin:3px">
                        <div class="button" style="text-decoration: underline" onclick="onViewPassport('${element.signaturePath}')">${element.name}</div>
                        <div class="badge badge-light" style="cursor:pointer;color:Red"
                            onclick="onRemoveBadge(${element.id})">X</div>
                    </div>`
                    } else if (element.isInstruction === 1) {
                        htmlInstructionTags += `<div class="badge badge-pill badge-info" style="margin:3px">
                        <div class="button" style="text-decoration: underline" onclick="onViewInstruction('${element.instruction}','${element.name}')">${element.name}</div>
                        <div class="badge badge-light" style="cursor:pointer;color:Red"
                            onclick="onRemoveBadge(${element.id})">X</div>
                    </div>`
                    }

                });
                $("#divPassportRecords").html(htmlPassportTags);
                $("#divSignatureRecords").html(htmlSignatureTags);
                $("#divInstructionRecords").html(htmlInstructionTags);
            }
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}

function onViewInstruction(instruction, title) {
    swal({
        title: title,
        text: instruction
    });
}

function onViewPassport(path) {
    window.open(`/files${path}`);
}

$('#bootstrap-data-table2 tbody').on('click', '#idButtonMandate', function () {
    data_row = table.row($(this).parents('tr')).data();
    getMandates(data_row.ID)
});

let _table = $('#bootstrap-data-table-export').DataTable();

function bindDataTable() {
    table = $('#bootstrap-data-table2').DataTable({
        dom: 'Blfrtip',
        bProcessing: true,
        bServerSide: true,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [{
                    name: "ID",
                    query: `ORDER BY ID desc`
                }, {
                    name: "client",
                    query: `ORDER BY client ${aoData[2].value[0].dir}`
                },
                {
                    name: "investment",
                    query: `ORDER BY investment ${aoData[2].value[0].dir}`
                },
                {
                    name: "amount",
                    query: `ORDER BY CAST(REPLACE(v.amount, ',', '') AS DECIMAL) ${aoData[2].value[0].dir}`
                },
                {
                    name: "investment_start_date",
                    query: `ORDER BY STR_TO_DATE(v.investment_start_date, '%Y-%m-%d') ${aoData[2].value[0].dir}`
                }, {
                    name: "investment_mature_date",
                    query: `ORDER BY STR_TO_DATE(v.investment_mature_date, '%Y-%m-%d') ${aoData[2].value[0].dir}`
                }, {
                    name: "status",
                    query: `ORDER BY v.status ${aoData[2].value[0].dir}`
                }
            ];
            $.ajax({
                dataType: 'json',
                type: "GET",
                url: `/investment-service/get-investments`,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    fnCallback(data)
                }
            });
        },
        aoColumnDefs: [{
            sClass: "numericCol",
            aTargets: [3],
            sType: "numeric"
        }],
        columns: [{
                width: "auto",
                "mRender": function (data, type, full) {
                    return full.code;
                }
            },
            {
                data: "client",
                width: "15%"
            },
            {
                data: "investment",
                width: "15%"
            },
            {
                data: "amount",
                width: "15%"
            },
            {
                width: "15%",
                "mRender": function (data, type, full) {
                    return (full.investment_start_date === "") ? "N/A" : full.investment_start_date;
                }
            }, {
                width: "15%",
                "mRender": function (data, type, full) {
                    return (full.investment_mature_date === "") ? "N/A" : full.investment_mature_date;
                }
            },
            {
                width: "15%",
                "mRender": function (data, type, full) {
                    return `<div class="dropdown dropleft">
                        <i class="fa fa-ellipsis-v" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        </i> 
                        <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                        <a class="dropdown-item" href="./investment-transactions?id=${full.ID}">View Transaction</a>
                        <button class="dropdown-item" id="idButtonMandate" data-toggle="modal" data-target="#viewMandateModal">Set Mandate</button>
                        </div>
                      </div>`;
                }
            }
        ]
    });
}
$(document).ready(function () {});