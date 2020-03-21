let table = {},
    $wait = $('#wait');
$(document).ready(function () {
    bindDataTable();
});

function bindDataTable() {
    table = $('#adverts').DataTable({
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
                    name: 'title',
                    query: `ORDER BY title ${aoData[2].value[0].dir}`
                },
                {
                    name: 'status',
                    query: `ORDER BY status ${aoData[2].value[0].dir}`
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
                url: `/advert/get`,
                data: {
                    limit: aoData[4].value,
                    offset: aoData[3].value,
                    draw: aoData[0].value,
                    search_string: aoData[5].value.value,
                    order: tableHeaders[aoData[2].value[0].column].query
                },
                success: function (data) {
                    $wait.hide();
                    fnCallback(data)
                }
            });
        },
        aaSorting: [
            [0, 'desc']
        ],
        columns: [
            {
                data: "ID",
                width: "2%",
                className: "text-right"
            },
            {
                data: "title",
                width: "40%"
            },
            {
                width: "15%",
                mRender: (data, type, full) => {
                    switch (full.status){
                        case 1: {
                            return '<span class="badge badge-success">Active</span>'
                        }
                        case 0: {
                            return '<span class="badge badge-danger">Not Active</span>'
                        }
                    }
                }
            },
            {
                data: "date_created",
                width: "23%"
            },
            {
                width: "20%",
                mRender: (data, type, full) => {
                    let actions = `<a class="btn btn-info btn-sm" href="/edit-advert?id=${full.ID}">
                        View <i class="fa fa-eye"></i></a>`;
                    if (full.status === 0)
                        actions = actions.concat(`<a class="btn btn-success btn-sm" onclick="activate(${full.ID})">
                            Activate <i class="fa fa-check"></i></a>`);
                    if (full.status === 1)
                        actions = actions.concat(`<a class="btn btn-danger btn-sm" onclick="deactivate(${full.ID})">
                            Deactivate <i class="fa fa-times"></i></a>`);
                     return actions;
                }
            }
        ]
    });
}

function activate(id) {
    swal({
        title: "Are you sure?",
        text: "Once activated, this advert will be visible to clients!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then(yes => {
            if (yes) {
                $wait.show();
                $.ajax({
                    type: 'get',
                    url: `/advert/activate/${id}`,
                    success: data => {
                        $wait.hide();
                        if (data.status !== 200)
                            return notification(data.error, '', 'error');
                        notification(data.success, '', 'success');
                        return table.ajax.reload(null, false);
                    },
                    error: err => {
                        console.log(err);
                        $wait.hide();
                        notification('No internet connection', '', 'error');
                    }
                });
            }
        });
}

function deactivate(id) {
    swal({
        title: "Are you sure?",
        text: "Once deactivated, this advert will not be visible to clients!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then(yes => {
            if (yes) {
                $wait.show();
                $.ajax({
                    type: 'get',
                    url: `/advert/deactivate/${id}`,
                    success: data => {
                        $wait.hide();
                        if (data.status !== 200)
                            return notification(data.error, '', 'error');
                        notification(data.response, '', 'success');
                        return table.ajax.reload(null, false);
                    },
                    error: err => {
                        console.log(err);
                        $wait.hide();
                        notification('No internet connection', '', 'error');
                    }
                });
            }
        });
}