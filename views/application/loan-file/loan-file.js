$(document).ready(function() {
    init();
});

const urlParams = new URLSearchParams(window.location.search),
    loan_id = urlParams.get('id'),
    loan = JSON.parse(decodeURIComponent(localStorage.loanFile));

function init() {
    if (loan_id !== loan.id) return notification('Loan file not found!', '', 'error');

    $('#request_date').text(loan.request_date || 'N/A');
    $('#customer_name').text(loan.customer_name || 'N/A');
    $('#incorporation_date').text(loan.incorporation_date || 'N/A');
    $('#line_of_business').text(loan.line_of_business || 'N/A');
    $('#initiating_officer').text(loan.initiating_officer || 'N/A');
    $('#client_date_created').text(loan.client_date_created || 'N/A');
    $('#registration_number').text(loan.registration_number || 'N/A');
    $('#loan_amount').text(numberToCurrencyformatter(loan.loan_amount) || 'N/A');
    $('#interest_rate').text(loan.interest_rate || 'N/A');
    $('#fees').text(loan.fees || 'N/A');
    $('#tenor').text(loan.tenor || 'N/A');
    $('#loan_purpose').text(loan.loan_purpose || 'N/A');
    $('#documents').text(loan.documents || 'N/A');
    $('#customer_details_request').text(loan.customer_details_request || 'N/A');
    $('#transaction_dynamics').text(loan.transaction_dynamics || 'N/A');
    $('#kyc').text(loan.kyc || 'N/A');
    $('#security').text(loan.security || 'N/A');

    for (let i=0; i<loan.workflow_processes.length; i++) {
        let workflow_process = loan.workflow_processes[i];
        $('#process_label').append(`${workflow_process.stage || 'N/A'} By: <br>`);
        $('#process_value').append(`<b>${workflow_process.agent || 'N/A'} (${workflow_process.role || 'N/A'})</b><br>`);
    }

    return window.print();
}
