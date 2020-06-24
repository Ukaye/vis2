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
            const billing_log_status = (payroll.billingLog && payroll.billingLog.reference.status)?
                payroll.billingLog.reference.data.status: false;
            $('#payroll-name').text(`${payroll.month} (${payroll.year}) ${payroll.companyID.companyName}`);
            $('#billing-log-status').text(`${(billing_log_status || 'none').toUpperCase()}`);
            $('#payslip-gross-total').text(`₦${numberToCurrencyformatter(sumArrayObjects(payroll.payslips, 'gross').round(2))}`);
            $('#payslip-net-total').text(`₦${numberToCurrencyformatter(sumArrayObjects(payroll.payslips, 'net').round(2))}`);
            $('#payslip-payment-date').text(formatDate(payroll.paymentDate));
            if (payroll.paymentType === 'once') {
                $('#once').show();
                $('#initiate-bulk-transfer').show();
                populateDataTable('#payslips', payroll.payslips);
            } else if (payroll.paymentType === 'split') {
                $('#split').show();
                populateDataTables(payroll);
            }
        },
        error: error => console.log(error)
    });
}

populateDataTable = (id, data) => {
    $(id).DataTable().clear();
    let processed_data = [];
    $.each(data, (index, obj) => {
        obj.fullname = `${obj.employeeID.firstName} ${obj.employeeID.lastName}`;
        const clientID = obj.employeeID.myx3ID? obj.employeeID.myx3ID : false;
        obj.myx3ID = clientID? `<a href="/client-info?id=${clientID}">${padWithZeroes(clientID, 6)}</a>`: 'N/A';
        obj.gross = `₦${numberToCurrencyformatter(obj.gross.round(2))}`;
        obj.net = `₦${numberToCurrencyformatter(obj.net.round(2))}`;
        obj.bonus = `₦${numberToCurrencyformatter(obj.bonus.round(2))}`;
        obj.deduction = `₦${numberToCurrencyformatter(obj.deduction.round(2))}`;
        obj.tax = `₦${numberToCurrencyformatter(obj.tax.round(2))}`;
        obj.pension = `₦${numberToCurrencyformatter(obj.pension.round(2))}`;
        processed_data.push(obj);
    });
    $(id).DataTable({
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
            { data: "myx3ID" },
            { data: "gross" },
            { data: "net" },
            { data: "bonus" },
            { data: "deduction" },
            { data: "tax" },
            { data: "pension" }
        ]
    });
}

populateDataTables = data => {
    for (let i = 1; i <= data.splitCount; i++) {
        let payslips = data.payslips.filter(payslip => payslip.splitID === i);
        $('#split').append(`
            <h4 class="col-lg-12">
                <span style="float: left;">SECTION ${i}</span>
                <button onclick="completePayment(${i})" class="btn btn-success" 
                    style="float: right;" ${(i === data.payment_split_index + 1)? '' : 'disabled'}>
                    Initiate Bulk Transfer ${i}
                </button>
            </h4>
            <span class="clearfix"></span>
            <table id="payslips-${i}" class="col-lg-12 table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>Fullname</th>
                        <th>Client ID</th>
                        <th>Gross Amount</th>
                        <th>Net Amount</th>
                        <th>Bonus</th>
                        <th>Deduction</th>
                        <th>Tax</th>
                        <th>Pension</th>
                    </tr>
                </thead>
            </table>
            <hr>
        `);
        populateDataTable(`#payslips-${i}`, payslips);
    }
}

completePayment = (splitID) => {
    swal({
        title: "Are you sure?",
        text: "Once initiated, this process is not reversible!",
        icon: "warning",
        buttons: true,
        dangerMode: true
    })
        .then(yes => {
            if (yes) {
                let url = `/myxalary/payroll/payment/complete/${payroll_id}?`;
                if (splitID) url = url.concat(`splitID=${splitID}`);
                $('#wait').show();
                $.ajax({
                    url: url,
                    type: 'get',
                    success: data => {
                        $('#wait').hide();
                        notification('Bulk transfer initiated successfully', data.response, 'success', 5000);
                        if (splitID) setTimeout(() => window.location.reload(), 5000);
                        else setTimeout(() => window.location.href = '/processed-payrolls', 5000);
                    },
                    'error': error => notification(error.response, '', 'error')
                });
            }
        });
}