const express = require('express');
const router = express.Router();
let fs = require('fs');

router.post('/send', function(req, res, next) {
    let action = req.params.action;
    let data = req.body;
   // if(action === 'atbmailerservice') {
        res.json({
            status: 'whoo'
        })
    //}

})


module.exports = router;