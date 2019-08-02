function getBaseUrl() {
    if (location.hostname === 'x3.loanratus.com') {
        return 'https://login.remita.net/remita/ecomm/mandate';
    } else {
        return 'http://www.remitademo.net/remita/ecomm/mandate';
    }
}

function numberToCurrencyformatter(value) {
    if (!value || value === null)
        return value;
    if (typeof value !== "string")
        value = value.toString();
    let _n = value.split("."),
        _n2 = (_n[1] !== undefined) ? _n[0] + "." + _n[1] : _n[0],
        n = _n2.split(".");
    n[0] = n[0].replace(/[\D\s\._\-]+/g, "");
    for (let index = 2; index < n.length; index++) {
        n[1] += n[index];
        delete n[index];
    }
    if (n[1] !== undefined)
        n[1] = n[1].replace(/[\D\s\._\-]+/g, "");
    n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return n.join(".");
}

function currencyToNumberformatter(value) {
    if (!value && isNaN(value))
        return value;
    return Number(value.replace(/[^0-9.-]+/g, ''));
}

function numbersOnly(value) {
    if (!value)
        return value;
    if (value.constructor === 'String'.constructor)
        value = parseFloat(value);
    return value;
}

function notification(title, text, type, delay) {
    return swal({
        title: title,
        text: text,
        icon: type,
        timer: delay || 1000
    });
}

function isValidDate(dateString) {
    let regEx = /^\d{4}-\d{2}-\d{2}$/;
    if(!dateString || !dateString.match(regEx)) return false;
    let d = new Date(dateString);
    if(Number.isNaN(d.getTime())) return false;
    return d.toISOString().slice(0,10) === dateString;
}

Number.prototype.roundTo = function(n) {
    return Math.ceil(this/n)*n;
};

Number.prototype.round = function(p) {
    p = p || 10;
    return parseFloat(parseFloat(this).toFixed(p));
};

String.prototype.round = function(p) {
    p = p || 10;
    return parseFloat(this).toFixed(p);
};

Number.prototype.trunc = function(p) {
    p = p || 2;
    let d = Math.pow(10,p);
    return parseFloat((parseInt(this*d)/d).toFixed(p));
};

Date.prototype.toDateInputValue = (function() {
    let local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});

function formatDate(date) {
    let d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

function remitaDateFormat(date) {
    let d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [day, month, year].join('/');
}

function padWithZeroes(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function pmt(rate,nper,pv) {
    let pvif, pmt;

    pvif = Math.pow( 1 + rate, nper);
    pmt = rate / (pvif - 1) * -(pv * pvif);

    return pmt;
}

function computeSchedule(loan_amount, interest_rate, payments_per_year, years, payment) {
    let schedule = [],
        remaining = loan_amount,
        number_of_payments = payments_per_year * years;

    for (let i=0; i<=number_of_payments; i++) {
        let interest = (remaining * (interest_rate/100/payments_per_year)).round(2),
            principle = (payment-interest).round(2);
        remaining = (remaining - principle).round(2);
        let row = [i, principle>0?(principle<payment?principle:payment):0, interest>0?interest:0, remaining>0?remaining:0];
        schedule.push(row);
    }

    return schedule;
}

function isUriImage(uri) {
    uri = uri.split('?')[0];
    let parts = uri.split('.'),
        extension = parts[parts.length-1],
        imageTypes = ['jpg','jpeg','tiff','png','gif','bmp'];
    if(imageTypes.indexOf(extension) !== -1)
        return true;
}

function isLeapYear(year) {
    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

function generateColour() {
    let color = '#',
        letters = "0123456789ABCDEF";
    for (let i = 0; i < 6; i++)
        color += letters[(Math.floor(Math.random() * 16))];
    return color;
}

function creditCardFormat(value) {
    if (!value)
        return value;
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, ''),
        matches = v.match(/\d{4,16}/g),
        match = matches && matches[0] || '';
    let parts = [];

    for (let i=0; i<match.length; i+=4) {
        parts.push(match.substring(i, i+4))
    }

    if (parts.length) {
        return parts.join(' ')
    } else {
        return v
    }
}

function integerFormat(value) {
    if (!value && isNaN(value))
        return value;
    return value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
}

function sumArrayObjects(array, key) {
    return array.reduce((a, b) => {
        return parseFloat(a) + parseFloat(b[key]);
    }, 0);
}

function CSVtoArray(text) {
    text = text.replace(/\\/g, '');
    text = text.replace(/'/g, '');
    let re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    let re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    if (!re_valid.test(text)) return null;
    let a = [];
    text.replace(re_value,
        function(m0, m1, m2, m3) {
            if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
            else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
            else if (m3 !== undefined) a.push(m3);
            return '';
        });
    if (/,\s*$/.test(text)) a.push('');
    return a;
}

function numberToCurrencyFormatter_(number) {
    if (!number || number === null) return number;
    return numberToCurrencyformatter(number.round(2));
}

function processDate(date) {
    let separator;
    if (date.indexOf('-') > -1){
        separator = '-';
    } else if (date.indexOf('/') > -1){
        separator = '/';
    } else {
        return date;
    }
    let date_array = date.split(separator);
    return date_array[0]+'-'+date_array[1]+'-'+date_array[2];
}