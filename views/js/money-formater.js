function formater(value) {
    if(value === '0')
        return '0.00';

    var _n = value.split(".");
    var _n2 = (_n[1] !== undefined) ? _n[0] + "." + _n[1] : _n[0];
    var n = _n2.split(".");
    n[0] = n[0].replace(/[\D\s\._\-]+/g, "");
    for (let index = 2; index < n.length; index++) {
        const element = n[index];
        n[1] += element;
        delete n[index];
    }
    if (n[1] !== undefined) {
        n[1] = n[1].replace(/[\D\s\._\-]+/g, "");
    }
    n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return n.join(".");
}