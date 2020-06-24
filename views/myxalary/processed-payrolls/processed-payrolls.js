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
            let payrolls = data.response;
            const payment_status = $('#payment-status-filter').val();
            if (payment_status) payrolls = payrolls.filter(payroll => payroll.payment_status === payment_status);
            populateDataTable(payrolls);
        },
        error: error => console.log(error)
    });
}

populateDataTable = data => {
    $("#payrolls").DataTable().clear();
    let processed_data = [];
    $.each(data, (index, obj) => {
        obj.name = `${obj.month}(${obj.year})`;
        obj.companyName = obj.companyID.companyName;
        obj.totalGrossSalary = `₦${numberToCurrencyformatter(obj.totalGrossSalary.round(2))}`;
        obj.totalNetSalary = `₦${numberToCurrencyformatter(obj.totalNetSalary.round(2))}`;
        obj.createdAt = new Date(obj.createdAt).toLocaleDateString();
        obj.actions = `<a class="btn btn-sm btn-info" href="/view-payroll?id=${encodeURIComponent(obj._id)}">View</a>`;
        processed_data.push(obj);
    });
    $('#payrolls').DataTable({
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
            { data: "companyName" },
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