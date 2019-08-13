let enums = {};

enums.PREAPPLICATION = {
    STATUS: {
        REJECTED: 0,
        ACTIVE: 1,
        APPROVED: 2,
        COMPLETED: 3
    }
};

enums.COLLECTION_BULK_UPLOAD = {
    STATUS: {
        INACTIVE: 0,
        NO_PAYMENT: 1,
        PART_PAYMENT: 2,
        FULL_PAYMENT: 3
    }
};

enums.ENABLE_REMITA = {
    STATUS: {
        INACTIVE: 0,
        ACTIVE: 1
    }
};

enums.REMITA_PAYMENT = {
    STATUS: {
        INACTIVE: 0,
        ACTIVE: 1
    }
};

module.exports = enums;