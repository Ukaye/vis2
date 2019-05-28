$(document).ready(function () {
    let sPageURL = window.location.search.substring(1);
    let strPathItems = window.location.pathname.split('/');
    let id = strPathItems[strPathItems.length - 1];
    let params = sPageURL.split('&');
    console.log(id);
    $('#wait').show();
    getStatements(id, params[0].split('=')[1], params[1].split('=')[1]);

});

async function getStatements(investmentId, startDate, endDate) {
    $.ajax({
        url: `/investment-txns/inv-statements/${investmentId}?startDate=${startDate}&endDate=${endDate}`,
        'type': 'get',
        'success': function (data) {
            if (data.status === undefined) {
                console.log(data);
                $('#wait').hide();
                $('#balanceHeader').html(`Opening Balance@ ${data[0].txn_date}`);
                $('#balanceAmount').html(`<strong>${formater(data[0].balance)}</strong>`);

                $('#clientName').html(`<strong>${data[0].fullname}</strong>`);
                $('#inventmentName').html(`<strong>${data[0].name}</strong>`);
                $('#maturityDate').html(`<strong>${data[0].investment_mature_date}</strong>`);

                $('#period').html(`<strong>${startDate} - ${endDate}</strong>`);
                let date = new Date();
                $('#printedDate').html(`<strong>${date.getFullYear()}-${date.getMonth()}-${date.getDate()}</strong>`);
                data.map(x => {
                    $('#statementTable').append(
                        `<tr>
                        <td style="font-size:10px;"><strong>${x.description}</strong></td>
                        <td style="color:green;text-align: right;font-size: 10px;"><strong>${(x.is_credit===1)?(formater(x.amount.split(',').join('')).includes('.')?formater(x.amount.split(',').join('')):
                        formater(x.amount.split(',').join(''))+'.00'):''}</strong></td>
                        <td style="text-align:right;color:red;text-align: right;font-size: 10px;"><strong>${(x.is_credit===0)?(formater(x.amount.split(',').join('')).includes('.')?formater(x.amount.split(',').join('')):
                        formater(x.amount.split(',').join(''))+'.00'):''}</strong></td>
                        </tr>`
                    );
                });
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
                console.log(data);
                $('#wait').hide();
                $('#logo').attr("src", "../files" + data[0].logoPath);
                $('#idSign').attr("src", "../files" + data[0].signaturePath);
                $('#idStamp').attr("src", "../files" + data[0].stampPath);
                $('#name').html(data[0].name);
                $('#address').html(data[0].address);
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