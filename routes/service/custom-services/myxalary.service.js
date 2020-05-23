const
    express = require('express'),
    router = express.Router(),
    enums = require('../../../enums'),
    helperFunctions = require('../../../helper-functions');

router.get('/payroll/processed/get', async (req, res) => {
    let payrolls = await helperFunctions.getMyXalaryProcessedPayrolls();
    payrolls = payrolls.map(payroll => {
        payroll.status = enums.PAYROLL.STATUS_[payroll.status];
        payroll.payment_status = enums.PAYROLL.PAYMENT_STATUS_[payroll.payment_status];
        return payroll;
    });
    res.send({
        status: 200,
        error: null,
        response: payrolls || []
    })
});

router.get('/payroll/get/:id', async (req, res) => {
    const payroll = await helperFunctions.getMyXalaryPayroll(req.params.id);
    res.send({
        status: 200,
        error: null,
        response: payroll || {}
    })
});

router.get('/payroll/payment/complete/:id', (req, res) => {
    helperFunctions.completeMyXalaryPayrollPayment(req.params.id)
        .then(body => res.send({
            "status": 200,
            "error": null,
            "response": body.message
        }))
        .catch(error => res.send({
            "status": 500,
            "error": error.message,
            "response": null
        }));
});

module.exports = router;