const express = require('express');
const router = express.Router();
const moment = require('moment');
const addMonths = require('date-fns/add_months');
const sRequest = require('../s_request');

/** End point to return all investment product filtered by isWalletApproval (The property differentiate if a product is for wallet or not) **/
router.get('/all/:id', function (req, res, next) {
    let limit = req.query.limit;
    let page = ((req.query.page - 1) * 10 < 0) ? 0 : (req.query.page - 1) * 10;
    let search_string = (req.query.search_string === undefined) ? "" : req.query.search_string.toUpperCase();
    let query = `SELECT *
    FROM investment_products WHERE isWalletApproval = ${req.params.id} AND status = 1 AND isDeactivated = 0 AND (upper(code) LIKE "${search_string}%" OR upper(name) LIKE "${search_string}%") ORDER BY ID desc LIMIT ${limit} OFFSET ${page}`;

    // let query = `SELECT ID,name,code,investment_max,investment_min,min_term,max_term,interest_disbursement_time,interest_rate,premature_interest_rate
    // FROM investment_products WHERE isWalletApproval = ${req.params.id} AND status = 1 AND isDeactivated = 0 AND (upper(code) LIKE "${search_string}%" OR upper(name) LIKE "${search_string}%") ORDER BY ID desc LIMIT ${limit} OFFSET ${page}`;
    sRequest.get(query)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send(err);
        })
        .catch(function (error) {
            res.send(error);
        });
});

/** End point to validate investment product code **/
router.get('/validate-code/:code', function (req, res, next) {
    let query = `SELECT count(*) as counter FROM investment_products WHERE code = '${req.params.code.toUpperCase()}'`;
    sRequest.get(query)
        .then(function (response) {
            res.send(response[0]);
        }, err => {
            res.send(err);
        })
        .catch(function (error) {
            res.send(error);
        });
});

/** End point to return system roles **/
router.get('/roles', function (req, res, next) {
    let limit = req.query.limit;
    let page = ((req.query.page - 1) * 10 < 0) ? 0 : (req.query.page - 1) * 10;
    let search_string = (req.query.search_string === undefined) ? "" : req.query.search_string.toUpperCase();
    let query = `SELECT ID,role_name FROM user_roles WHERE status = 1 AND upper(role_name) LIKE "${search_string}%" ORDER BY ID desc LIMIT ${limit} OFFSET ${page}`;
    sRequest.get(query)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send(err);
        })
        .catch(function (error) {
            res.send(error);
        });
});

/** End point to return all products **/
router.get('/get-products', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let status = req.query.status;
    let qStatus = (status === undefined) ? "" : `status = ${status} AND`;
    let search_string = req.query.search_string.toUpperCase();
    let query = `SELECT ID,name,code,investment_max,investment_min,interest_rate,status, date_created, isDeactivated
    FROM investment_products WHERE status = 1 AND (code LIKE "${search_string}%" OR name LIKE "${search_string}%")
    ${order} LIMIT ${limit} OFFSET ${offset}`;
    sRequest.get(query).then(response => {
        query = `SELECT
        (SELECT count(*) AS recordsTotal FROM investment_products WHERE  status = 1) AS recordsTotal,
        (SELECT count(*) AS recordsFiltered FROM investment_products WHERE  status = 1 
        AND (code LIKE "${search_string}%" OR name LIKE "${search_string}%"))
        as recordsFiltered`;
        sRequest.get(query).then(payload => {
            res.send({
                draw: draw,
                recordsTotal: payload[0].recordsTotal,
                recordsFiltered: payload[0].recordsFiltered,
                data: (response === undefined) ? [] : response
            });
        });
    });
});

/** End point to create product requirement **/
router.post('/requirements', function (req, res, next) {
    var data = req.body
    if (data.priority === '[]') {
        delete data.priority;
    }
    data.createdDate = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `INSERT INTO investment_product_requirements SET ?`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point to return product approval requirement items **/
async function getProductApprovalItems(search_string, order, offset, limit, id, draw) {
    let query = `SELECT ID, operationId,roleId,isAllRoles,priority FROM investment_product_requirements WHERE status = 1 AND productId = ${id} AND 
        (operationId LIKE "${search_string}%" OR roleId LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    try {
        let response = await sRequest.get(query);
        let roles = [];
        if (response.length > 0) {
            for (let index = 0; index < response.length; index++) {
                let x = response[index];
                x.roles = [];
                x.htmlTag = "";
                x.roleId = JSON.parse(x.roleId);
                x.priority = JSON.parse(x.priority);
                for (let index2 = 0; index2 < x.roleId.length; index2++) {
                    let roleIds = await getRoleUserDetails(x, index2);
                    roles.push(roleIds);
                }
            }
            return {
                draw: draw,
                recordsTotal: 3,
                recordsFiltered: 3,
                data: response
            };
        } else {
            return {
                draw: draw,
                recordsTotal: 0,
                recordsFiltered: 0,
                data: []
            };
        }
    } catch (error) {
        return error;
    }
}

/** End point that uses ductApprovalItems(search_string, order, offset, limit, id, draw) **/
router.get('/requirements/:id', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();

    getProductApprovalItems(search_string, order, offset, limit, req.params.id, draw).then(payload => {
        res.send(payload);
    }, err => {
        res.send(err);
    });
});

/** End point to update product requirement **/
router.post('/requirements/:id', function (req, res, next) {
    let data = req.body
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `UPDATE investment_product_requirements SET isAllRoles = ${data.isAllRoles} , updatedDate = '${dt}' WHERE ID =${req.params.id}`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point that returns product requirement **/
router.get('/required-roles', function (req, res, next) {
    let query = `SELECT ID, roleId FROM investment_product_requirements WHERE productId = ${req.query.productId} AND 
    operationId = ${req.query.operationId} AND status = 1`;
    sRequest.get(query)
        .then(function (response) {
            if (response.length > 0) {
                let _roles = [];
                let roleId = JSON.parse(response[0].roleId);
                roleId.forEach((r, index) => {
                    query = `SELECT role_name FROM user_roles WHERE id = ${r}`;
                    sRequest.get(query)
                        .then(function (response2) {
                            _roles.push({
                                id: r,
                                text: response2[0].role_name,
                                reqId: response[0].ID
                            })
                            // const item = r;
                            // roleId[index] = {};
                            // roleId[index].id = item;
                            // roleId[index].name = response2.data[0].role_name;
                            // _roles.push(roleId[index]);
                            if (_roles.length === roleId.length) {
                                res.send(_roles);
                            }
                        }, err => {
                            res.send([]);
                        });
                });
            } else {
                res.send([]);
            }
        }, err => {
            res.send([]);
        })
        .catch(function (error) {
            res.send([]);
        });
});

/** End point use to update product requirement **/
router.post('/update-requirements/:id', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    data = req.body;
    let query = `UPDATE investment_product_requirements SET roleId =${JSON.stringify(data.roleId)}, updatedDate ='${dt.toString()}' WHERE ID =${req.params.id}`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to remove a product requirement **/
router.get('/remove-requirements/:id', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `UPDATE investment_product_requirements SET status = 0, updatedDate ='${dt.toString()}' WHERE ID =${req.params.id}`;
    sRequest.get(query)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to update a product approval **/
router.post('/update-approval/:id', function (req, res, next) {
    let data = req.body
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `UPDATE investment_product_requirements SET priority = '${data.priority}' , updatedDate = '${dt}' WHERE ID =${req.params.id}`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to create a product review **/
router.post('/reviews', function (req, res, next) {
    var data = req.body;
    if (data.priority === '[]') {
        delete data.priority;
    }
    data.createdDate = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `INSERT INTO investment_product_reviews SET ?`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** Function use to get user role details **/
async function getRoleUserDetails(x, index2) {
    let r = x.roleId[index2];
    let query = `SELECT ID,role_name FROM user_roles WHERE id = ${r}`;
    try {
        let response2 = await sRequest.get(query);
        x.roles.push({
            id: response2[0].ID,
            name: response2[0].role_name
        });
        x.htmlTag = x.htmlTag + `<span class="badge badge-pill badge-primary">${response2[0].role_name}</span>`;
        return x;
    } catch (error) {
        return error;
    }
}

/** Function use to get product review **/
async function getProductReviewItems(search_string, order, offset, limit, id, draw) {
    let query = `SELECT ID, operationId,roleId,isAllRoles,priority FROM investment_product_reviews WHERE status = 1 AND productId = ${id} AND 
        (operationId LIKE "${search_string}%" OR roleId LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    try {
        let response = await sRequest.get(query);
        let roles = [];
        if (response.length > 0) {
            for (let index = 0; index < response.length; index++) {
                let x = response[index];
                x.roles = [];
                x.htmlTag = "";
                x.roleId = JSON.parse(x.roleId);
                x.priority = JSON.parse(x.priority);
                for (let index2 = 0; index2 < x.roleId.length; index2++) {
                    let roleIds = await getRoleUserDetails(x, index2);
                    roles.push(roleIds);
                }
            }
            return {
                draw: draw,
                recordsTotal: 3,
                recordsFiltered: 3,
                data: response
            };
        } else {
            return {
                draw: draw,
                recordsTotal: 0,
                recordsFiltered: 0,
                data: []
            };
        }
    } catch (error) {
        return error;
    }
}

/** End point use to get a product review **/
router.get('/reviews/:id', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    getProductReviewItems(search_string, order, offset, limit, req.params.id, draw).then(payload => {
        res.send(payload);
    }, err => {
        res.send(err);
    });
});

/** End point use to create a product review **/
router.post('/reviews/:id', function (req, res, next) {
    let data = req.body
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `UPDATE investment_product_reviews SET isAllRoles = ${data.isAllRoles} , updatedDate = '${dt}' WHERE ID =${req.params.id}`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to get product review role **/
router.get('/required-review-roles', function (req, res, next) {
    let query = `SELECT ID, roleId FROM investment_product_reviews WHERE productId = ${req.query.productId} AND 
    operationId = ${req.query.operationId} AND status = 1`;
    sRequest.get(query)
        .then(function (response) {
            if (response.length > 0) {
                let _roles = [];
                let roleId = JSON.parse(response[0].roleId);
                roleId.forEach((r, index) => {
                    query = `SELECT role_name FROM user_roles WHERE id = ${r}`;
                    sRequest.get(query)
                        .then(function (response2) {
                            _roles.push({
                                id: r,
                                text: response2[0].role_name,
                                reqId: response[0].ID
                            })
                            // const item = r;
                            // roleId[index] = {};
                            // roleId[index].id = item;
                            // roleId[index].name = response2.data[0].role_name;
                            // _roles.push(roleId[index]);
                            if (_roles.length === roleId.length) {
                                res.send(_roles);
                            }
                        }, err => {
                            res.send([]);
                        });
                });
            } else {
                res.send([]);
            }
        }, err => {
            res.send([]);
        })
        .catch(function (error) {
            res.send([]);
        });
});

/** End point use to update product review requirement **/
router.post('/update-reviews/:id', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    data = req.body;
    let query = `UPDATE investment_product_reviews SET roleId =${JSON.stringify(data.roleId)}, updatedDate ='${dt.toString()}' WHERE ID =${req.params.id}`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to remove product review requirement **/
router.get('/remove-reviews/:id', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `UPDATE investment_product_reviews SET status = 0, updatedDate ='${dt.toString()}' WHERE ID =${req.params.id}`;
    sRequest.get(query)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to get product review requirement **/
router.get('/get-product-reviews/:id', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `SELECT * FROM investment_product_reviews WHERE id = ${req.params.id}`;
    sRequest.get(query)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to update product review priority **/
router.post('/update-review-priority/:id', function (req, res, next) {
    let data = req.body
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `UPDATE investment_product_reviews SET priority = '${data.priority}' , updatedDate = '${dt}' WHERE ID =${req.params.id}`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to create product post requirement **/
router.post('/posts', function (req, res, next) {
    var data = req.body;
    if (data.priority === '[]') {
        delete data.priority;
    }
    data.createdDate = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `INSERT INTO investment_product_posts SET ?`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** Function use to get product post requirement **/
async function getProductPostItems(search_string, order, offset, limit, id, draw) {
    let query = `SELECT ID, operationId,roleId,isAllRoles,priority FROM investment_product_posts WHERE status = 1 AND productId = ${id} AND 
        (operationId LIKE "${search_string}%" OR roleId LIKE "${search_string}%") ${order} LIMIT ${limit} OFFSET ${offset}`;
    try {
        let response = await sRequest.get(query);
        let roles = [];
        if (response.length > 0) {
            for (let index = 0; index < response.length; index++) {
                let x = response[index];
                x.roles = [];
                x.htmlTag = "";
                x.roleId = JSON.parse(x.roleId);
                x.priority = JSON.parse(x.priority);
                for (let index2 = 0; index2 < x.roleId.length; index2++) {
                    let roleIds = await getRoleUserDetails(x, index2);
                    roles.push(roleIds);
                }
            }
            return {
                draw: draw,
                recordsTotal: 3,
                recordsFiltered: 3,
                data: response
            };
        } else {
            return {
                draw: draw,
                recordsTotal: 0,
                recordsFiltered: 0,
                data: []
            };
        }
    } catch (error) {
        return error;
    }
}

/** End point use to call getProductPostItems(search_string, order, offset, limit, id, draw) **/
router.get('/posts/:id', function (req, res, next) {
    let limit = req.query.limit;
    let offset = req.query.offset;
    let draw = req.query.draw;
    let order = req.query.order;
    let search_string = req.query.search_string.toUpperCase();
    getProductPostItems(search_string, order, offset, limit, req.params.id, draw).then(payload => {
        res.send(payload);
    }, err => {
        res.send(err);
    });
});

/** End point use to update product post requirement **/
router.post('/post/:id', function (req, res, next) {
    let data = req.body
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `UPDATE investment_product_posts SET isAllRoles = ${data.isAllRoles} , updatedDate = '${dt}' WHERE ID =${req.params.id}`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to get product post role **/
router.get('/required-post-roles', function (req, res, next) {
    let query = `SELECT ID, roleId FROM investment_product_posts WHERE productId = ${req.query.productId} AND 
    operationId = ${req.query.operationId} AND status = 1`;
    sRequest.get(query)
        .then(function (response) {
            if (response.length > 0) {
                let _roles = [];
                let roleId = JSON.parse(response[0].roleId);
                roleId.forEach((r, index) => {
                    query = `SELECT role_name FROM user_roles WHERE id = ${r}`;
                    sRequest.get(query)
                        .then(function (response2) {
                            _roles.push({
                                id: r,
                                text: response2[0].role_name,
                                reqId: response[0].ID
                            })
                            // const item = r;
                            // roleId[index] = {};
                            // roleId[index].id = item;
                            // roleId[index].name = response2.data[0].role_name;
                            // _roles.push(roleId[index]);
                            if (_roles.length === roleId.length) {
                                res.send(_roles);
                            }
                        }, err => {
                            res.send([]);
                        });
                });
            } else {
                res.send([]);
            }
        }, err => {
            res.send([]);
        })
        .catch(function (error) {
            res.send([]);
        });
});

/** End point use to get product post role **/
router.post('/update-posts/:id', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    data = req.body;
    let query = `UPDATE investment_product_posts SET roleId =${JSON.stringify(data.roleId)}, updatedDate ='${dt.toString()}' WHERE ID =${req.params.id}`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to remove product post role**/
router.get('/remove-posts/:id', function (req, res, next) {
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `UPDATE investment_product_posts SET status = 0, updatedDate ='${dt.toString()}' WHERE ID =${req.params.id}`;
    sRequest.get(query)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to update product post role priority**/
router.post('/update-post-priority/:id', function (req, res, next) {
    let data = req.body
    let dt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `UPDATE investment_product_posts SET priority = '${data.priority}' , updatedDate = '${dt}' WHERE ID =${req.params.id}`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});

/** End point use to create product document requirement **/
router.post('/create-docs', function (req, res, next) {
    var data = req.body;
    data.createdAt = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let query = `INSERT INTO investment_doc_requirement SET ?`;
    sRequest.post(query, data)
        .then(function (response) {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: err,
                response: null
            });
        })
        .catch(function (error) {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
});



/** End point use to get product maximum and minimum maturity date **/
router.post('/get-maturity-dates', function (req, res, next) {
    // let data = req.body;
    // const result1 = addMonths(new Date(data.year, data.month, data.day), data.min);
    // const result2 = addMonths(new Date(data.year, data.month, data.day), data.max);
    // res.send({ min: result1, max: result2 });



    let data = req.body;
    // Javascript date object start from 0 for months but moment starts from 1, to reconcile add 1 to js moment
    const addOneToMonth = 1
    data.month = Number(data.month) + addOneToMonth;
    
    const result1 = moment(`${data.year}-${data.month}-${data.day}`, 'YYYY-MM-DD').add(data.min, 'M').format();
    const result2 = moment(`${data.year}-${data.month}-${data.day}`, 'YYYY-MM-DD').add(data.max, 'M').format();
    console.log(result1, result2, 'bbbbb')
    
    res.send({ min: result1, max: result2 });
});


// I commented this part
/** End point use to get product maximum and minimum maturity date **/
// router.post('/get-maturity-dates', function (req, res, next) {
//     let data = req.body;
//     const result1 = addMonths(new Date(data.year, data.month, data.day), data.min);
//     const result2 = addMonths(new Date(data.year, data.month, data.day), data.max);
//     res.send({ min: result1, max: result2 });
// });



/** End point use to get product document requirement **/
router.get('/get-doc-requirements/:id', function (req, res, next) {
    let option = '';
    if (req.query.operationId !== undefined) {
        option = `AND operationId = ${req.query.operationId}`;
    }

    let query = `SELECT * FROM investment_doc_requirement WHERE productId = ${req.params.id} ${option} AND status = 1`;
    sRequest.get(query).then(response => {
        res.send(response);
    }, err => {
        res.send({
            status: 500,
            error: error,
            response: null
        });
    });
});

/** End point use to get product document requirement on an investment/savings account **/
router.get('/get-txn-doc-requirements/:id', function (req, res, next) {
    let query = `SELECT d.*,r.name FROM investment_doc_requirement r
    left join investment_txn_doc_requirements d on d.docRequirementId = r.Id
    WHERE d.txnId = ${req.params.id} AND r.status = 1`;
    sRequest.get(query).then(response => {
        res.send(response);
    }, err => {
        res.send({
            status: 500,
            error: error,
            response: null
        });
    });
});

/** End point use to remove product document requirement on an investment/savings account **/
router.get('/remove-doc-requirements/:id', function (req, res, next) {
    let query = `UPDATE investment_doc_requirement SET status = ${0} WHERE ID =${req.params.id}`;
    sRequest.get(query).then(response => {
        res.send(response);
    }, err => {
        res.send({
            status: 500,
            error: error,
            response: null
        });
    });
});

/** End point use to update product document requirement on an investment/savings account **/
router.post('/update-txn-doc-requirements', function (req, res, next) {
    let data = req.body;
    if (data.isReplaced.toString() === '0') {
        let query = `UPDATE investment_txn_doc_requirements
        SET
        filePath = '${data.filePath}',
        status = ${data.status}
        WHERE id = ${data.id}`;

        sRequest.get(query).then(response => {
            res.send(response);
        }, err => {
            res.send({
                status: 500,
                error: error,
                response: null
            });
        });
    } else {
        let data_ = {
            docRequirementId: data.docRequirementId,
            filePath: data.filePath,
            status: 1,
            createdAt: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
            txnId: data.txnId,
            isReplaced: 1
        };

        let query = `INSERT INTO investment_txn_doc_requirements SET ?`;
        sRequest.post(query, data_)
            .then(function (response) {
                res.send(response);
            }, err => {
                res.send({
                    status: 500,
                    error: error,
                    response: null
                });
            });
    }
});

module.exports = router;