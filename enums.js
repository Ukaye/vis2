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
        ACTIVE: 1,
        PART_ASSIGNED: 2,
        FULL_ASSIGNED: 3
    }
};

enums.CLIENT = {
    STATUS: {
        INACTIVE: 0,
        ACTIVE: 1
    }
};

enums.CLIENT_APPLICATION = {
    STATUS: {
        REJECTED: 0,
        ACTIVE: 1,
        APPROVED: 2,
        COMPLETED: 3,
        ACCEPTED: 4,
        DECLINED: 5
    }
};

enums.OWNERSHIP = [
    {
        ID: 1,
        name: 'Family Home'
    },
    {
        ID: 2,
        name: 'Lease'
    },
    {
        ID: 3,
        name: 'Owner'
    },
    {
        ID: 4,
        name: 'Rent'
    }
];

enums.VERIFY_EMAIL = {
    STATUS: {
        NOT_VERIFIED: 0,
        VERIFIED: 1
    }
};

module.exports = enums;