$(document).ready(function() {
    getPayroll();
});

const urlParams = new URLSearchParams(window.location.search);
const payroll_id = decodeURIComponent(urlParams.get('id'));

getPayroll = () => {
    $('#wait').show();
    $.ajax({
        url: `/myxalary/payroll/get/${payroll_id}`,
        type: 'get',
        success: data => {
            $('#wait').hide();
            const payroll = data.response;
            const billing_log_status = payroll.billingLog.reference.status?
                payroll.billingLog.reference.data.status: false;
            $('#payroll-name').text(`${payroll.month} (${payroll.year})`);
            $('#billing-log-status').text(`${(billing_log_status || 'none').toUpperCase()}`);
            $('#payslip-gross-total').text(`₦${numberToCurrencyformatter(sumArrayObjects(payroll.payslips, 'gross').round(2))}`);
            $('#payslip-net-total').text(`₦${numberToCurrencyformatter(sumArrayObjects(payroll.payslips, 'net').round(2))}`);
            $('#payslip-payment-date').text(formatDate(payroll.paymentDate));
            populateDataTable(payroll.payslips);
        },
        error: error => console.log(error)
    });
}

populateDataTable = data => {
    $("#bootstrap-data-table").DataTable().clear();
    let processed_data = [];
    $.each(data, (index, obj) => {
        obj.fullname = `${obj.employeeID.firstName} ${obj.employeeID.lastName}`;
        obj.gross = `₦${numberToCurrencyformatter(obj.gross.round(2))}`;
        obj.net = `₦${numberToCurrencyformatter(obj.net.round(2))}`;
        obj.bonus = `₦${numberToCurrencyformatter(obj.bonus.round(2))}`;
        obj.deduction = `₦${numberToCurrencyformatter(obj.deduction.round(2))}`;
        obj.tax = `₦${numberToCurrencyformatter(obj.tax.round(2))}`;
        obj.pension = `₦${numberToCurrencyformatter(obj.pension.round(2))}`;
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
            [0, 'asc']
        ],
        columns: [
            { data: "fullname" },
            { data: "gross" },
            { data: "net" },
            { data: "bonus" },
            { data: "deduction" },
            { data: "tax" },
            { data: "pension" }
        ]
    });
}

completePayment = () => {
    swal({
        title: "Are you sure?",
        text: "Once initiated, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then(yes => {
            if (yes) {
                $('#wait').show();
                $.ajax({
                    url: `/myxalary/payroll/payment/complete/${payroll_id}`,
                    type: 'get',
                    success: data => {
                        $('#wait').hide();
                        notification('Bulk transfer initiated successfully', data.response, 'success', 5000);
                        setTimeout(() => {
                            window.location.href = '/processed-payrolls';
                        }, 5000);
                    },
                    'error': error => notification(error.response, '', 'error')
                });
            }
        });
}