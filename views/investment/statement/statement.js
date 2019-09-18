$(document).ready(function () {
    let sPageURL = window.location.search.substring(1);
    let strPathItems = window.location.pathname.split('/');
    let id = strPathItems[strPathItems.length - 1];
    let params = sPageURL.split('&');
    $('#wait').show();
    getStatements(id, params[0].split('=')[1], params[1].split('=')[1]);

});

async function getStatements(investmentId, startDate, endDate) {
    $.ajax({
        url: `/investment-txns/inv-statements/${investmentId}?startDate=${startDate}&endDate=${endDate}`,
        'type': 'get',
        'success': function (data) {
            if (data.status === undefined) {
                if (data.length > 0) {
                    $('#balanceHeader').html(`Opening Balance@ ${data[0].txn_date}`);
                    $('#balanceAmount').html(`${formater(data[0].balance)}`);
                    $('#openingBal').html(`${formater(data[0].balance)}`);
                    $('#closingBal').html(`${formater(data[data.length-1].balance)}`);
                    $('#clientName').html(`${data[0].fullname}`);
                    $('#inventmentName').html(`${data[0].name}`);
                    $('#maturityDate').html(`${data[0].investment_mature_date}`);

                    $('#period').html(`${startDate} - ${endDate}`);
                    let totalDebit = 0;
                    let totalCredit = 0;
                    let date = new Date();
                    $('#printedDate').html(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
                    data.map(x => {

                        let _x = x.amount.split(',').join('');

                        if (x.is_credit.toString() === '1') {
                            totalCredit += (isNaN(parseFloat(_x))) ? 0 : parseFloat(_x);
                        } else {
                            totalDebit += (isNaN(parseFloat(_x))) ? 0 : parseFloat(_x);
                        }
                        $('#statementTable').append(
                            `<tr class="item">
                            <td style="font-size:10px;" class="col-6">${x.description}</td>
                            <td style="color:green;text-align: right;font-size: 10px;" class="col-3">${(x.is_credit===1)?(formater(x.amount.split(',').join('')).includes('.')?formater(x.amount.split(',').join('')):
                            formater(x.amount.split(',').join(''))+'.00'):''}</td>
                            <td style="text-align:right;color:red;text-align: right;font-size: 10px;" class="col-3">${(x.is_credit===0)?(formater(x.amount.split(',').join('')).includes('.')?formater(x.amount.split(',').join('')):
                            formater(x.amount.split(',').join(''))+'.00'):''}</td>
                            </tr>`
                        );
                    });
                    $('#debitBal').html(`${formater(totalDebit.toString())}`);
                    $('#creditBal').html(`${formater(totalCredit.toString())}`);
                } else {
                    swal('Oops! No transaction occurred within the set date', '', 'error');
                }
                $('#wait').hide();
                getConfigInfo();
            } else {
                $('#wait').hide();
            }
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });
}

function getConfigInfo() {
    $.ajax({
        url: `/investment-txns/get-organisation-configs`,
        'type': 'get',
        'success': function (data) {
            if (data.status === undefined) {
                $('#wait').hide();
                $('#logo').attr("src", "../files" + data[0].logoPath);
                $('#idSign').attr("src", "../files" + data[0].signaturePath);
                $('#idStamp').attr("src", "../files" + data[0].stampPath);
                $('#name').html(data[0].name);
                $('#address').html(data[0].address);
                $('#email').html(data[0].email);
                $('#phone').html(data[0].phone);
                $('#state_poCode').html(`${data[0].state.toLowerCase().replace(data[0].state.toLowerCase()[0],data[0].state.toLowerCase()[0].toUpperCase())}, ${data[0].country} ${data[0].poBox}`);
                setTimeout(function () {
                    window.print();
                }, 2000);

            } else {
                $('#wait').hide();
            }
        },
        'error': function (err) {
            $('#wait').hide();
        }
    });

}