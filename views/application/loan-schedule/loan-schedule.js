$(document).ready(function() {
    init();
});

const urlParams = new URLSearchParams(window.location.search),
    loan_id = urlParams.get('id'),
    loan = JSON.parse(decodeURIComponent(localStorage.loanSchedule));

const TENANT = JSON.parse(localStorage.user_obj).tenant || 'Finratus';
document.title = `${TENANT} ${(location.pathname.replace(/[^a-zA-Z0-9]/g,' ')).trim()}`;
$('#tenant').text(TENANT);

function init() {
    if (loan_id !== loan.id) return notification('Loan file not found!', '', 'error');

    $('#customer_name').text(loan.customer_name || 'N/A');
    $('#customer_phone').text(loan.customer_phone || 'N/A');
    $('#customer_address').text(loan.customer_address || 'N/A');
    $('#initiating_officer').text(loan.initiating_officer || 'N/A');
    $('#loan_amount').text(`₦${numberToCurrencyformatter(loan.loan_amount)}` || 'N/A');
    $('#tenor').text(`${loan.tenor} months` || 'N/A');
    $('#loan_id').text(padWithZeroes(loan.id, 9) || 'N/A');

    for (let i=0; i<loan.workflow_processes.length - 1; i++) {
        let workflow_process = loan.workflow_processes[i],
            workflow_process_ = loan.workflow_processes[i + 1];
        $('#process_label').append(`${workflow_process.stage || 'N/A'} By: <br>`);
        $('#process_value').append(`<b>${workflow_process_.agent || 'N/A'} (${workflow_process.role || 'N/A'})</b><br>`);
    }

    for (let i=0; i<loan.schedule.length; i++) {
        let invoice = loan.schedule[i];
        $('#schedule').append(`
            <tr class="service" style="${invoice.status === 0? 'background-color: #aaaaaa; text-decoration: line-through;': ''}">
                <td class="tableitem"><p class="itemtext">${i+1}</p></td>
                <td class="tableitem"><p class="itemtext">${invoice.interest_collect_date}</p></td>
                <td class="tableitem"><p class="itemtext">${(parseFloat(invoice.balance) + parseFloat(invoice.payment_amount)).round(2)}</p></td>
                <td class="tableitem"><p class="itemtext">${invoice.interest_amount}</p></td>
                <td class="tableitem"><p class="itemtext">${invoice.payment_amount}</p></td>
                <td class="tableitem"><p class="itemtext">${invoice.balance}</p></td>
                <td class="tableitem"><p class="itemtext">${(parseFloat(invoice.interest_amount) + parseFloat(invoice.payment_amount)).round(2)}</p></td>
                <td class="tableitem"><p class="itemtext">${invoice.principal_invoice_no || 'N/A'}</p></td>
                <td class="tableitem"><p class="itemtext">${invoice.interest_invoice_no || 'N/A'}</p></td>
                <td class="tableitem"><p class="itemtext"></p></td>
            </tr>
        `);
    }
    return window.print();
}