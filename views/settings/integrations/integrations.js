$(document).ready(function () {

});
const urlParams = new URLSearchParams(window.location.search);
const xero = urlParams.get('x');

if (xero && xero === '1') notification('Xero has been integrated successfully!', '', 'success');

function connectXero() {
    notification('Please wait a moment!', '', 'info');
    return window.location.href = `/xero/connect?url=${encodeURIComponent(window.location.href)}`;
}