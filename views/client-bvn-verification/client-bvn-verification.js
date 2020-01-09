let $wait = $('#wait'),
    table_bvn = {},
    url = '/client/bvn/get?';
$(document).ready(function () {
    getCollections();
});

function getCollections() {
    table_bvn = $('#bvn_list').DataTable({
        dom: 'Blfrtip',
        bProcessing: true,
        bServerSide: true,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        fnServerData: function (sSource, aoData, fnCallback) {
            let tableHeaders = [
                {
                    name: 'ID',
                    query: `ORDER BY ID ${aoData[2].value[0].dir}`
                },
                {
                    name: 'fullname',
                    query: `ORDER BY fullname ${aoData[2].value[0].dir}`
                },
                {
                    name: 'phone',
                    query: `ORDER BY phone ${aoData[2].value[0].dir}`
                },
                {
                    name: 'bvn_input',
                    query: `ORDER BY bvn_input ${aoData[2].value[0].dir}`
                },
                {
                    name: 'verify_bvn',
                    query: `ORDER BY verify_bvn ${aoData[2].value[0].dir}`
                },
                {
                    name: 'date_created',
                    query: `ORDER BY date_created ${aoData[2].value[0].dir}`
                },
                {
                    name: 'action',
                    query: `ORDER BY ID ${aoData[2].value[0].dir}`
                }
            ];
            $wait.show();
            $.ajax({
                dataType: 'json',
                type: "GET",
                url: url,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    $wait.hide();
                    fnCallback(data);
                }
            });
        },
        aaSorting: [
            [5, 'desc']
        ],
        aoColumnDefs: [
            {
                sClass: "numericCol",
                aTargets: [0, 2],
                sType: "numeric"
            }
        ],
        columns: [
            {
                width: "5%",
                className: "text-right",
                mRender: (data, type, full) => {
                    return `<a href="/client-info?id=${full.ID}">${padWithZeroes(full.ID, 6)}</a>`;
                }
            },
            {
                width: "30%",
                className: "text-right",
                mRender: (data, type, full) => {
                    return `<a href="/client-info?id=${full.ID}">${full.fullname}</a>`;
                }
            },
            {
                width: "10%",
                className: "text-right",
                mRender: (data, type, full) => {
                    return full.phone;
                }
            },
            {
                width: "20%",
                className: "text-right",
                mRender: (data, type, full) => {
                    return full.bvn_input;
                }
            },
            {
                width: "10%",
                className: "text-right",
                mRender: function (data, type, full) {
                    return (full.verify_bvn === 1)? 'Verified':'Unverified';
                }
            },
            {
                width: "20%",
                mRender: function (data, type, full) {
                    if (full.date_created) return moment(new Date(full.date_created)).format('LLLL');
                    return '--';
                }
            },
            {
                width: "5%",
                mRender: function (data, type, full) {
                    return (full.verify_bvn === 0)? 
                        `<a class="btn btn-success btn-sm" onclick="verify(${full.ID}, '${full.bvn_input}')">Verify <i class="fa fa-check"></i></a>` 
                        : `<a class="btn btn-danger btn-sm" onclick="unverify(${full.ID})">Unverify <i class="fa fa-times"></i></a>`;
                }
            }
        ]
    });
}

function verify(id, bvn) {
    swal({
        title: "Are you sure?",
        text: "Once verified, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                $wait.show();
                $.ajax({
                    'url': `/client/bvn/verify/${id}`,
                    'type': 'post',
                    'data': {
                        bvn: bvn
                    },
                    'success': function (data) {
                        $wait.hide();
                        notification('BVN verified successfully', '', 'success');
                        return table_bvn.ajax.reload(null, false);
                    },
                    'error': function (err) {
                        $wait.hide();
                        notification('Oops! An error occurred while verifying bvn','','error');
                    }
                });
            }
        });
}

function unverify(id) {
    swal({
        title: "Are you sure?",
        text: "Once unverified, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then((yes) => {
            if (yes) {
                $wait.show();
                $.ajax({
                    'url': `/client/bvn/unverify/${id}`,
                    'type': 'get',
                    'success': function (data) {
                        $wait.hide();
                        notification('BVN unverified successfully', '', 'success');
                        return table_bvn.ajax.reload(null, false);
                    },
                    'error': function (err) {
                        $wait.hide();
                        notification('Oops! An error occurred while unverifying bvn','','error');
                    }
                });
            }
        });
}

$("#filter").submit(function (e) {
    e.preventDefault();
    let end = $("#endDate").val(),
        start = $("#startDate").val(),
        type = $("#type-filter").val();
    if (!start || !end) return table_bvn.ajax.reload(null, false);
    url = '/client/bvn/get?';
    url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    if (type) url = url.concat(`&type=${type}`);
    return table_bvn.ajax.reload(null, false);
});

function filterType() {
    let end = $("#endDate").val(),
        start = $("#startDate").val(),
        type = $("#type-filter").val();
    url = '/client/bvn/get?';
    if (start && end) url = url.concat(`&start=${processDate(start)}&end=${processDate(end)}`);
    if (type) url = url.concat(`&type=${type}`);
    return table_bvn.ajax.reload(null, false);
}