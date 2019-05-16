$(document).ready(function () {
    loadRecords();
});

function loadRecords(){
    $.ajax({
        'url': 'user/incomplete-records/',
        'type': 'get',
        'data': {},
        'success': function (data) {
            populateRecordsTable(data);
        },
        'error': function (err) {
            return swal('Failed', 'Internet Connection Error', 'error')
        }
    });
}

function populateRecordsTable(data) {
    $("#bootstrap-data-table").DataTable().clear();
    let records = [], record = [], total = 0;
    let missing = '';
    data.forEach(function(k, v){
        missing = ''; record = [];
        if (k.username === "" || k.username === null){
            missing += 'Username' +'</br>';
            total++;
        }
        if (k.fullname === "" || k.fullname === null){
            missing += 'Name' +'</br>';
            total++;
        }
        if (k.phone === "" || k.phone === null){
            missing += 'Phone Number' +'</br>';
            total++;
        }
        if (k.email === "" || k.email === null){
            missing += 'E - mail' +'</br>';
            total++;
        }
        if (k.dob === "" || k.dob === null){
            missing += 'Date of Birth' +'</br>';
            total++;
        }
        if (k.marital_status === "" || k.marital_status === null){
            missing += 'Marital Status' +'</br>';
            total++;
        }
        if (k.loan_officer === '0' || k.loan_officer === null){
            missing += 'Loan Officer' +'</br>';
            total++;
        }
        if (k.client_state === "" || k.client_state === null){
            missing += 'State of Origin' +'</br>';
            total++;
        }
        if (k.postcode === "" || k.postcode === null){
            missing += 'Post Code' +'</br>';
            total++;
        }
        if (k.client_country === "" || k.client_country === null){
            missing += 'Country' +'</br>';
            total++;
        }
        if (k.ownership === "" || k.ownership === null){
            missing += 'Ownership' +'</br>';
            total++;
        }
        if (k.employer_name === "" || k.employer_name === null){
            missing += 'Name of Employer' +'</br>';
            total++;
        }
        if (k.industry === "" || k.industry === null){
            missing += 'Employer Industry' +'</br>';
            total++;
        }
        if (k.job === "" || k.job === null){
            missing += 'Job Title' +'</br>';
            total++;
        }
        if (k.salary === "" || k.salary === null){
            missing += 'Salary' +'</br>';
            total++;
        }
        if (k.job_country === "" || k.job_country === null){
            missing += 'Employer Country' +'</br>';
            total++;
        }
        if (k.off_address === "" || k.off_address === null){
            missing += 'Employer Address' +'</br>';
            total++;
        }
        if (k.off_state === "" || k.off_state === null){
            missing += 'Employer State' +'</br>';
            total++;
        }
        if (k.doe === "" || k.does === null){
            missing += 'Date of Employment' +'</br>';
            total++;
        }
        if (k.guarantor_name === "" || k.guarantor_name === null){
            missing += 'Name of Guarantor' +'</br>';
            total++;
        }
        if (k.guarantor_occupation === "" || k.guarantor_occupation === null){
            missing += 'Occupation of Guarantor' +'</br>';
            total++;
        }
        if (k.relationship === "" || k.relationship === null){
            missing += 'Relationship with Guarantor' +'</br>';
            total++;
        }
        if (k.years_known === "" || k.years_known === null){
            missing += 'Number of Years Known by Guarantor' +'</br>';
            total++;
        }
        if (k.guarantor_phone === "" || k.guarantor_phone === null){
            missing += 'Guarantor Phone Number' +'</br>';
            total++;
        }
        if (k.guarantor_email === "" || k.guarantor_email === null){
            missing += 'Guarantor Email' +'</br>';
            total++;
        }
        if (k.guarantor_address === "" || k.guarantor_address === null){
            missing += 'Guarantor Address' +'</br>';
            total++;
        }
        if (k.gua_country === "" || k.gua_country === null){
            missing += 'Guarantor Country' +'</br>';
            total++;
        }
        if (k.gender === "" || k.gender === null){
            missing += 'Gender' +'</br>';
            total++;
        }
        if (k.branch === "0" || k.branch === null){
            missing += 'Branch' +'</br>';
            total++;
        }
        if (k.bank === "" || k.bank === null){
            missing += 'Client Bank' +'</br>';
            total++;
        }
        if (k.bvn === "" || k.bvn === null){
            missing += 'BVN' +'</br>';
            total++;
        }
        if (k.client_type === "" || k.client_type === null){
            missing += 'Client Type' +'</br>';
            total++;
        }
        if (k.client_type === 'business_individual'){
            if (k.product_sold === "" || k.product_sold === null){
                missing += 'Product Sold' +'</br>';
                total++;
            }
            if (k.capital_invested === "" || k.capital_invested === null){
                missing += 'Capital Invested' +'</br>';
                total++;
            }
            if (k.market_name === "" || k.market_name === null){
                missing += 'Market Name' +'</br>';
                total++;
            }
            if (k.market_years === "" || k.market_years === null){
                missing += 'Years in Market' +'</br>';
                total++;
            }
            if (k.market_address === "" || k.market_address === null){
                missing += 'Market Address' +'</br>';
                total++;
            }
        }
        if (k.kin_fullname === "" || k.kin_fullname === null){
            missing += 'Name of Next of Kin' +'</br>';
            total++;
        }
        if (k.kin_phone === "" || k.kin_phone === null){
            missing += 'Next of Kin Phone Number' +'</br>';
            total++;
        }
        if (k.kin_relationship === "" || k.kin_relationship === null){
            missing += 'Relationship with Next of Kin' +'</br>';
            total++;
        }
        if (k.client_description === "" || k.client_description === null){
            missing += 'Client Description' +'</br>';
            total++;
        }
        if (k.address === "" || k.address === null){
            missing += 'Address' +'</br>';
            total++;
        }
        if (k.years_add === "" || k.years_add === null){
            missing += 'Years at Address' +'</br>';
            total++;
        }
        let name_link = '<a href="./client-info?id='+k.ID+'">'+k.fullname+'</a>';
        record.push('#'+padWithZeroes(k.ID, 6), name_link, missing);
        records.push(record);
    });
    $('#bootstrap-data-table').DataTable({
        dom: 'Blfrtip',
        bDestroy: true,
        search: {search: ' '},
        data: records,
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        columns: [
            {data: 0}, {data: 1}, {data: 2}
        ]
    });
    $('#total').html(total);
}

function padWithZeroes(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}