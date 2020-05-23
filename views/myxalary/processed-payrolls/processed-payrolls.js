$(document).ready(function() {
    getPayrolls();
});

getPayrolls = () => {
    $('#wait').show();
    $.ajax({
        url: '/myxalary/payroll/processed/get',
        type: 'get',
        success: data => {
            $('#wait').hide();
            populateDataTable(data.response);
        },
        error: error => console.log(error)
    });
}

populateDataTable = data => {
    $("#bootstrap-data-table").DataTable().clear();
    let processed_data = [];
    $.each(data, (index, obj) => {
        obj.name = `${obj.month}(${obj.year})`;
        obj.totalGrossSalary = `₦${numberToCurrencyformatter(obj.totalGrossSalary.round(2))}`;
        obj.totalNetSalary = `₦${numberToCurrencyformatter(obj.totalNetSalary.round(2))}`;
        obj.createdAt = new Date(obj.createdAt).toLocaleDateString();
        obj.actions = `<a class="btn btn-sm btn-info" href="/view-payroll?id=${encodeURIComponent(obj._id)}">View</a>`;
        processed_data.push(obj);
    });
    $('#bootstrap-data-table').DataTable({
        dom: 'Blfrtip',
        bDestroy: true,
        data: processed_data,
        search: {search: ' '},
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        aaSorting: [
            [7, 'desc']
        ],
        columns: [
            { data: "name" },
            { data: "employeeType" },
            { data: "paymentType" },
            { data: "totalGrossSalary" },
            { data: "totalNetSalary" },
            { data: "status" },
            { data: "payment_status" },
            { data: "createdAt" },
            { data: "actions" }
        ]
    });
}