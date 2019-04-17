var express = require('express');
var router = express.Router();
var async = require('async');
var db = require('../db');
const fs = require('fs');
const Moment = require('moment');
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);
let notificationsService = require('./notifications-service');
//File Upload - Inspection
router.post('/upload/:number_plate/:part', function(req, res) {
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params) return res.status(400).send('No parameters specified!');
    let sampleFile = req.files.file;
    let name = sampleFile.name;
    let extArray = sampleFile.name.split(".");
    let extension = extArray[extArray.length - 1];

    fs.stat('files/'+req.params.number_plate+'/', function(err) {
        if (!err) {
            console.log('file or directory exists');
        } else if (err.code === 'ENOENT') {
            fs.mkdirSync('files/'+req.params.number_plate+'/');
        }
    });

    fs.stat('files/'+req.params.number_plate+'/'+req.params.number_plate+'_'+req.params.part+'.'+extension, function (err) {
        if (err) {
            sampleFile.mv('files/'+req.params.number_plate+'/'+req.params.number_plate+'_'+req.params.part+'.'+extension, function(err) {
                if (err) return res.status(500).send(err);
                res.send('File uploaded!');
            });
        }
        else{
            fs.unlink('files/'+req.params.number_plate+'/'+req.params.number_plate+'_'+req.params.part+'.'+extension,function(err){
                if(err){
                    return console.log(err);
                } else{
                    sampleFile.mv('files/'+req.params.number_plate+'/'+req.params.number_plate+'_'+req.params.part+'.'+extension, function(err) {
                        if (err)
                            return res.status(500).send(err);

                        res.send('File uploaded!');
                    });
                }
            });
        }
    });
});

//File Upload - Vehicle Registration
router.post('/vehicle-upload/:number_plate/', function(req, res) {
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params) return res.status(400).send('No Number Plate specified!');
    let sampleFile = req.files.file;
    let name = sampleFile.name;
    let extArray = sampleFile.name.split(".");
    let extension = extArray[extArray.length - 1];

    fs.stat('files/'+req.params.number_plate+'/', function(err) {
        if (!err) {
            console.log('file or directory exists');
        }
        else if (err.code === 'ENOENT') {
            console.log('file or directory does not exist');
            console.log('Creating directory ...')
            fs.mkdirSync('files/'+req.params.number_plate+'/');
        }
    });

    fs.stat('files/'+req.params.number_plate+'/'+req.params.number_plate+'_registration.'+extension, function (err) {
        if (err) {
            sampleFile.mv('files/'+req.params.number_plate+'/'+req.params.number_plate+'_registration.'+extension, function(err) {
                if (err) return res.status(500).send(err);
                res.send('File uploaded!');
            });
        } else{
            fs.unlink('files/'+req.params.number_plate+'/'+req.params.number_plate+'_registration.'+extension,function(err){
                if(err){
                    res.send('Unable to delete file!');
                }
                else{
                    sampleFile.mv('files/'+req.params.number_plate+'/'+req.params.number_plate+'_registration.'+extension, function(err) {
                        if (err)
                            return res.status(500).send(err);
                        res.send('File uploaded!');
                    });
                }
            });
        }

    });


});

/* Add New Vehicle */
router.post('/addVehicle', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO vehicles set ?';
    postData.Date_Created = Date.now();
    db.query(query, postData, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "New Vehicle Added!"}));
        }
    });
});

/* Add New User */
router.post('/new-model', function(req, res, next) {
    let data = [],
        postData = req.body,
        query =  'INSERT INTO vehiclemakes Set ?',
        query2 = 'select * from vehiclemakes where model = ? and make = ? and year=?';
    data.make = req.body.make;
    data.model = req.body.model;
    data.year=req.body.year;
    postData.Date_Created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(query2,data, function (error, results, fields) {
            if (results && results[0]){
                res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Model already exists!"}));
            }
            else {
                connection.query(query,postData, function (error, results, fields) {
                    if(error){
                        res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                    } else {
                        connection.query('SELECT * from vehiclemakes where ID = LAST_INSERT_ID()', function(err, re, fields) {
                            connection.release();
                            if (!err){
                                res.send(JSON.stringify({"status": 200, "error": null, "response": re}));
                            }
                            else{
                                res.send(JSON.stringify({"response": "Error retrieving model details. Please try a new username!"}));
                            }
                        });
                    }
                });
            }
        });
    });
});

/* GET Vehicle Owners listing. */
router.get('/owners', function(req, res, next) {
    let query = 'SELECT * from vehicle_owners';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": results}));
        }
    });
});

/* GET vehicles listing. */
router.get('/vehicles', function(req, res, next) {
    let array = [],
        query = 'SELECT * from vehicles';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            async.forEach(results, function(k, cb){
                let path = 'files/'+k.Number_Plate+'/';
                if (fs.existsSync(path)){
                    fs.readdir(path, function (err, files){
                        let obj = {};
                        async.forEach(files, function (file, callback){
                            let insP = file.split('.')[0].split('_')[1];
                            obj[insP] = path+file;
                            k.images = obj;
                            callback();
                        }, function(data){
                            array.push(k);
                            cb();
                        });
                    })	;
                } else {
                    k.images = "No Image";
                    array.push(k);
                    cb();
                }

            }, function(data){
                res.send(JSON.stringify({"status": 200, "error": null, "response": array}));
            });
        }
    });
});

/* GET vehicle inspection images. */
router.get('/inspection-images/:number_plate', function(req, res, next) {
    let path = 'files/'+req.params.number_plate+'/';
    if (fs.existsSync(path)){
        fs.readdir(path, function (err, files){
            let obj = {};
            async.forEach(files, function (file, callback){
                let insP = file.split('.')[0].split('_')[1];
                obj[insP] = path+file;
                callback();
            }, function(data){
                res.send(JSON.stringify({"status": 200, "response":obj}));
            });
        });
    }
    else {
        res.send(JSON.stringify({"status":500, "response": "No Image Uploaded"}));
    }
});

/* GET client profile images. */
router.get('/profile-images/:folder/', function(req, res, next) {
    let path = 'files/users/'+req.params.folder+'/';
    if (fs.existsSync(path)){
        fs.readdir(path, function (err, files){
            let obj = {};
            async.forEach(files, function (file, callback){
                let name_without_ext = file.substring(0, file.lastIndexOf("."))
                let insP = name_without_ext.substring(name_without_ext.lastIndexOf("_") + 1, name_without_ext.length)
                // let insP = file.split('.')[0].split('_')[1];
                obj[insP] = path+file;
                callback();
            }, function(data){
                res.send(JSON.stringify({"status": 200, "response":obj}));
            });
        });
    } else {
        res.send(JSON.stringify({"status":500, "response": "No Image Uploaded"}));
    }
});

/* GET vehicles listing for admin. */
router.get('/vehicles-list', function(req, res, next) {
    let query = 'SELECT *, (select fullname from clients u where u.ID = owner) as Owner from vehicles order by ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET all vehicle makes available for admin. */
router.get('/makes-list', function(req, res, next) {
    let query = 'SELECT distinct(make) from vehiclemakes group by make';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET all vehicle models by make available for admin. */
router.get('/models-list/:make', function(req, res, next) {
    let query = 'SELECT model, year from vehiclemakes where make =?';
    db.query(query, [req.params.make], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET vehicles count. */
router.get('/vehiclesCount', function(req, res, next) {
    let query = 'SELECT count(*) as total from vehicles';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET vehicle owners count. */
router.get('/ownersCount', function(req, res, next) {
    let query = 'SELECT count(*) as total from clients';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET car models count. */
router.get('/modelsCount', function(req, res, next) {
    let query = 'SELECT count(*) as total from vehiclemakes';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

router.get('/check', function(req, res, next) {
    res.send(req.session.user.user_role);
});

/* GET specific vehicle by parameter */
/**
 * @Query:
 * number_plate
 */
router.get('/vehicles/:number_plate/', function(req, res, next) {
    let query = 'SELECT * from vehicles where number_plate =?',
        array = [];
    db.query(query, [req.params.number_plate, req.params.date] ,function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            async.forEach(results, function(k, cb){
                let path = 'files/'+k.Number_Plate+'/';
                if (fs.existsSync(path)){
                    fs.readdir(path, function (err, files){
                        let obj = {};
                        async.forEach(files, function (file, callback){
                            let insP = file.split('.')[0].split('_')[1];
                            obj[insP] = path+file;
                            k.images = obj;
                            callback();
                        }, function(data){
                            array.push(k);
                            cb();
                        });
                    });
                }
                else {
                    k.images = "No Image";
                    array.push(k);
                    cb();
                }

            }, function(data){
                res.send(JSON.stringify({"status": 200, "error": null, "response": array}));
            });
        }
    });
});

/* GET specific vehicle by owner */
router.get('/vehicles-owner/:owner', function(req, res, next) {
    let query = 'SELECT * from vehicles where owner =?',
        array = [];

    db.query(query, [req.params.owner] ,function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            async.forEach(results, function(k, cb){
                let path = 'files/'+k.Number_Plate+'/';
                if (fs.existsSync(path)){
                    fs.readdir(path, function (err, files){
                        let obj = {};
                        async.forEach(files, function (file, callback){
                            let part = file.split('.')[0].split('_')[1];
                            obj[part] = path+file;
                            k.images = obj;
                            callback();
                        }, function(data){
                            array.push(k);
                            cb();
                        });
                    });
                } else {
                    k.images = "No Image";
                    array.push(k);
                    cb();
                }

            }, function(data){
                res.send(JSON.stringify({"status": 200, "error": null, "response": array}));
            });
        }
    });
});

/* GET specific vehicle by owner for admin. */
router.get('/vehicle-owner/:owner', function(req, res, next) {
    let query = 'SELECT * from vehicles where owner = ?';
    db.query(query, [req.params.owner], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET specific inspections for vehicle for admin. */
router.get('/vehicle-inspections/:number', function(req, res, next) {
    let query = 'SELECT ID, Vehicle, Date_Inspected, Inspection_Status from inspections where vehicle = ?';
    db.query(query, [req.params.number], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET inspection details for specific vehicle for admin. */
router.get('/inspection/:id', function(req, res, next) {
    let query = 'SELECT * from inspections where ID = ?';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET inspection details for specific vehicle for admin. */
router.get('/inspections/:number', function(req, res, next) {
    let query = 'SELECT * from inspections where vehicle = ?';
    db.query(query, [req.params.number, req.params.date], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET specific vehicle by inspector */
router.get('/inspected-by/:inspector', function(req, res, next) {
    let query = 'SELECT * from vehicles where inspector =?';
    db.query(query, [req.params.inspector] ,function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            async.forEach(results, function(k, cb){
                let path = 'files/'+k.Number_Plate+'/';
                if (fs.existsSync(path)){
                    fs.readdir(path, function (err, files){
                        let obj = {};
                        async.forEach(files, function (file, callback){
                            let part = file.split('.')[0].split('_')[1];
                            obj[part] = path+file;
                            k.images = obj;
                            callback();
                        }, function(data){
                            array.push(k);
                            cb();
                        });
                    });
                } else {
                    k.images = "No Image";
                    array.push(k);
                    cb();
                }

            }, function(data){
                res.send(JSON.stringify({"status": 200, "error": null, "response": array}))
            });
        }
    });
});

/* GET specific vehicle by make */
router.get('/vehicle/:make', function(req, res, next) {
    let query = 'SELECT * from vehicles where make =?';
    db.query(query, [req.params.make] ,function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            async.forEach(results, function(k, cb){
                let path = 'files/'+k.Number_Plate+'/';
                if (fs.existsSync(path)){
                    fs.readdir(path, function (err, files){
                        let obj = {};
                        async.forEach(files, function (file, callback){
                            let part = file.split('.')[0].split('_')[1];
                            obj[part] = path+file;
                            k.images = obj;
                            callback();
                        }, function(data){
                            array.push(k);
                            cb();
                        });
                    })	;
                } else {
                    k.images = "No Image";
                    array.push(k);
                    cb();
                }

            }, function(data){
                res.send(JSON.stringify({"status": 200, "error": null, "response": array}));
            });
        }
    });
});

/* GET Car Makes */
router.get('/vehicle-makes', function(req, res, next) {
    let query = 'SELECT distinct(make) from vehiclemakes';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": results}));
        }
    });
});

/* GET Car Models */
router.get('/models/:make', function(req, res, next) {
    let query = 'SELECT distinct(model) from vehiclemakes where make =?';
    db.query(query, [req.params.make], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": results}));
        }
    });
});

/* GET Cumulative Valuation Report */
router.get('/cum-report/', function(req, res, next) {
    let query = 'select sum(Admin_FirstSale_Value) as admin_first, sum(Admin_Market_Valuation) as admin_market, sum(FirstSale_Value) as first, sum(Market_Valuation) as market from inspections';
    db.query(query, [req.params.make], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

/* GET Cumulative Valuation Report */
router.get('/mf-report/', function(req, res, next) {
    let query = 'select ID, FirstSale_Value, Market_Valuation, Admin_FirstSale_Value, Admin_Market_Valuation, Date_Inspected '+
        'from inspections '+
        'where FirstSale_Value <> 0 and Market_Valuation <> 0 and Admin_FirstSale_Value <> 0 and Admin_Market_Valuation <> 0 and Date_Inspected <> 0 and '+
        'FirstSale_Value is not null and Market_Valuation is not null and Admin_FirstSale_Value is not null and Admin_Market_Valuation is not null and Date_Inspected is not null';
    db.query(query, [req.params.make], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

/* GET modules.html listing for admin. */
router.get('/modules', function(req, res, next) {
    let query = 'SELECT * from modules order by menu_name asc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

router.get('/mains/', function(req, res, next) {
    let query = "SELECT * from modules where menu_name = 'Main Menu'";
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET permissions for each role*/
router.get('/permissions/:id', function(req, res, next) {
    let query = 'select *, (select module_name from modules m where m.id = permissions.module_id) as module, (select menu_name from modules ms where ms.module_name = module) as menu_name ' +
        'from permissions where role_id = ? and date = (select date from permissions where role_id = ? and id = (select max(id) from permissions where role_id = ?))';
    db.query(query, [req.params.id, req.params.id], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/*Update Vehicle Details*/
router.post('/editVehicle/:id', function(req, res, next) {
    let postData = req.body;
    let payload = [postData.Mileage, postData.Number_Plate, postData.Price, postData.owner, postData.Make, postData.Model, postData.Color, postData.Year, postData.Bought_Condition, postData.Transmission, postData.Fuel_Type, postData.Engine_Capacity, postData.Registered_City, postData.Location, req.params.id],
        query = 'update vehicles set Mileage = ?, Number_Plate =?, Price = ?, owner = ?, Make = ?, Model = ?, Color = ?, Year = ?, Bought_Condition = ?, Transmission = ?, Fuel_Type = ?, Engine_Capacity = ?, Registered_City = ?, Location = ? ' +
        'where id = ?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Vehicle Details Updated!"}));
        }
    });
});

router.post('/brakes/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload = [postData.brake_pads, postData.discs, postData.parking_hand, postData.brakes_ok, Date_Modified, id],
        query = 'Update inspections SET brake_pads=?, discs=?, parking_hand=?, brakes_ok=?, date_modified=? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Brake Info Updated"}));
        }
    });
});

router.post('/ac_heater/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload = [postData.cooling, postData.blower, postData.ac_fan, postData.condensor, postData.compressor, postData.ac_no_repair_history, Date_Modified, id],
        query = 'Update inspections SET cooling=?, blower=?, ac_fan=?, condensor=?, compressor = ?, ac_no_repair_history=?, date_modified=? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Air Conditioner / Heater Info Updated"});
        }
    });
});

router.post('/steeringControls/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.lights_lever, postData.washer_lever, postData.wind_screen_lever, postData.wind_screen_lever, postData.steering_wheel, postData.horn, postData.volume_control, postData.temperature_control, postData.phone_dial_control, Date_Modified, id],
        query = 'Update inspections SET '+
        'cooling=?, blower=?, ac_fan=?, condensor=?, compressor = ?, ac_no_repair_history=?, date_modified=? '+
        'where id=?';

    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Steering Controls Info Updated"});
        }
    });
});

router.post('/engineCheck/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.wires, postData.hoses, postData.belt, postData.pulley, postData.head_gasket, postData.engine_noise, postData.engine_mount,
            postData.gear_mount, postData.radiator_fan, postData.radiator, postData.suction_fan, postData.starter_operation,
            postData.engine_vibration, postData.engine_worked_on, postData.engine_misfire, postData.tappet_sound, postData.knock_sound, postData.overheating_history,
            postData.coolant_reservoir, postData.engine_sludge, postData.engine_smoke, postData.engine_likely_smoke, Date_Modified, id],
        query = 'Update inspections SET '+
            'wires=?, hoses=?, belt=?, pulley=?, head_gasket = ?, engine_noise=?, '+
            'engine_mount=?, gear_mount=?, radiator_fan=?, radiator=?, suction_fan = ?, starter_operation=?, '+
            'engine_vibration=?, engine_worked_on=?, engine_misfire=?, tappet_sound=?, knock_sound = ?, overheating_history=?, '+
            'coolant_reservoir=?, engine_sludge=?, engine_smoke=?, engine_likely_smoke=?, date_modified=? '+
            'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Engine Info Updated!"});
        }
    });
});

router.post('/mirrors/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.right_mirror, postData.left_mirror, postData.right_mirror_control, postData.left_mirror_control, postData.right_mirror_broken, postData.left_mirror_broken, Date_Modified, id],
        query = 'Update inspections SET '+
        'right_mirror=?, left_mirror=?, right_mirror_control=?, left_mirror_control=?, right_mirror_broken = ?, left_mirror_broken=?, date_modified=?'+
        'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Mirrors Info Updated!"});
        }
    });
});

router.post('/electricals/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.battery_terminals, postData.battery_charging, postData.battery_malfunction_indicator, postData.battery_present, postData.tampered_wiring_harness, Date_Modified, id],
        query = 'Update inspections SET '+
        'battery_terminals=?, battery_charging=?, battery_malfunction_indicator=?, battery_present=?, tampered_wiring_harness=?, date_modified=? '+
        'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Electrical Info Updated!"});
        }
    });
});

router.post('/upholstery/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.roof_upholstery, postData.floor_upholstery, postData.door_upholstery, postData.clean_dashboard, postData.sunshades, postData.boot_carpet, postData.boot_board,
        postData.driver_seat_upholstery, postData.passenger_seat_upholstery, postData.rear_seat_upholstery, Date_Modified, id],
        query = 'Update inspections SET '+
        'roof_upholstery=?, floor_upholstery=?, door_upholstery=?, clean_dashboard=?, sunshades = ?, boot_carpet=?, '+
        'boot_board=?, driver_seat_upholstery=?, passenger_seat_upholstery=?, rear_seat_upholstery=?, date_modified=? '+
        'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Upholstery Info Updated!"});
        }
    });
});

router.post('/dashboard/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.dashboard_lights, postData.interior_lights, postData.dashboard_control_ac, postData.dashboard_control_defog, postData.dashboard_control_hazard_lights, postData.dashboard_control_parking_button, postData.audio,
        postData.video, postData.cigarette_lighter, postData.fuelcap_release_lever, postData.bonnet_release_lever, Date_Modified, id],
        query = 'Update inspections SET '+
        'dashboard_lights=?, interior_lights=?, dashboard_control_ac=?, dashboard_control_defog=?, dashboard_control_hazard_lights = ?, dashboard_control_parking_button=?, '+
        'audio=?, video=?, cigarette_lighter=?, fuelcap_release_lever=?, bonnet_release_lever = ?, date_modified=? '+
        'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Dashboard Info Updated!"}));
        }
    });
});

router.post('/mechanical-check/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.trunk_lock, postData.front_door_fitting_rh, postData.front_door_fitting_lh, postData.rear_door_fitting_rh, postData.rear_door_fitting_lh, postData.front_door_levers_rh,
            postData.front_door_levers_lh, postData.rear_door_levers_rh, postData.rear_door_levers_lh, postData.front_windshield, postData.rear_windshield,
            postData.front_door_window_rh, postData.front_door_window_lh, postData.rear_door_window_rh, postData.rear_door_window_lh, postData.underbody_shields, postData.fender_shields,
            postData.front_spoiler, postData.rear_spoiler, Date_Modified, id],
        query = 'Update inspections SET '+
            'trunk_lock=?, front_door_fitting_rh=?, front_door_fitting_lh=?, rear_door_fitting_rh=?, rear_door_fitting_lh = ?, front_door_levers_rh=?, '+
            'front_door_levers_lh=?, rear_door_levers_rh=?, rear_door_levers_lh=?, front_windshield=?, rear_windshield = ?, front_door_window_rh = ?, '+
            'front_door_window_lh = ?, rear_door_window_rh = ?, rear_door_window_lh = ?, underbody_shields = ?, fender_shields = ?, front_spoiler = ?, '+
            'rear_spoiler = ?, date_modified=? '+
            'where id=?';

    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Mechanical Components Info Updated!"});
        }
    });
});

router.post('/equipment/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload = [postData.tools, postData.jack, postData.jack_handle, postData.wheel_spanner, postData.caution_sign, Date_Modified, id],
        query = 'Update inspections SET tools=?, jack=?, jack_handle=?, wheel_spanner=?, caution_sign=?, date_modified=? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Car Equipment Updated"});
        }
    });
});

router.post('/exhaust-check/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.exhaust_sound, postData.exhaust_joint, postData.catalytic_converter, postData.exhaust_leakage, postData.exhaust_pipe_oil_trace, Date_Modified, id],
        query = 'Update inspections SET '+
        'exhaust_sound=?, exhaust_joint=?, catalytic_converter=?, exhaust_leakage=?, exhaust_pipe_oil_trace = ?, date_modified=? '+
        'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Engine Info Updated!"});
        }
    });
});

router.post('/transmission/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.gear_not_converted, postData.gear_delay, postData.gear_surge, postData.gear_repair_history, postData.gear_jerk, postData.fwd_active, Date_Modified, id],
        query = 'Update inspections SET '+
        'gear_not_converted=?, gear_delay=?, gear_surge=?, gear_repair_history=?, gear_jerk = ?, fwd_active=?, date_modified=? '+
        'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Transmission Info Updated!"});
        }
    });
});

router.post('/suspension-steering/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.ball_joints, postData.zlinks, postData.front_brushes, postData.front_shocks, postData.tie_rod, postData.rack_end, postData.rear_brushes,
        postData.rear_shocks, postData.height_control, postData.height_control_unit, Date_Modified, id],
        query = 'Update inspections SET '+
            'ball_joints=?, zlinks=?, front_brushes=?, front_shocks=?, tie_rod = ?, rack_end=?, '+
            'rear_brushes=?, rear_shocks=?, height_control=?, height_control_unit=?, date_modified=? '+
            'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Suspension - Steering Info Updated!"}));
        }
    });
});

router.post('/exterior-lights/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.right_headlight, postData.left_headlight, postData.right_taillight, postData.left_taillight, postData.reverse_light, postData.fog_lights, Date_Modified, id],
        query = 'Update inspections SET '+
        'right_headlight=?, left_headlight=?, right_taillight=?, left_taillight=?, reverse_light = ?, fog_lights=?, date_modified=? '+
        'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "message": results, "response": "Exterior Lights Info Updated!", "payload": payload});
        }
    });
});

router.post('/body-frame/:number_plate', function(req, res, next) {
    let postData = req.body;
    postData.Date_Inspected = Date.now();
    postData.Vehicle = req.params.number_plate;
    let query = 'insert into inspections set ?';
    db.query(query, postData,  function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            db.query('SELECT * from inspections where ID = (select max(ID) from inspections)', function(err, re, fields) {
                if (!err){
                    res.send({"status": 200, "error": null, "response": re[0]});
                } else{
                    res.send(JSON.stringify({"status": 500, "response": "Error retrieving inspection details. Please re-do Body-frame inspection!"}));
                }
            });
        }
    });
});

router.post('/windows-central-lock/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.rightF_window_lever, postData.leftF_window_lever, postData.rightR_window_lever, postData.leftR_window_lever, postData.autolock,
        postData.window_safety_lock, postData.auto_window_mech, postData.manual_window_mech, Date_Modified, id],
        query = 'Update inspections SET '+
        'rightF_window_lever=?, leftF_window_lever=?, rightR_window_lever=?, leftR_window_lever=?, autolock = ?, window_safety_lock=?, '+
        'auto_window_mech=?, manual_window_mech=?, date_modified=? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Exterior Lights Info Updated!"});
        }
    });
});

router.post('/seats/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.right_seat_adjuster_recliner, postData.left_seat_adjuster_recliner, postData.right_seat_adjuster_lear_track, postData.left_seat_adjuster_lear_track, postData.seat_adjuster_tracker, postData.right_seat_belt, postData.left_seat_belt,
        postData.rear_seat_belt, postData.head_rest, postData.arm_rest, postData.glove_box, Date_Modified, id],
        query = 'Update inspections SET '+
            'right_seat_adjuster_recliner=?, left_seat_adjuster_recliner=?, right_seat_adjuster_lear_track=?, left_seat_adjuster_lear_track=?, seat_adjuster_tracker = ?, right_seat_belt=?, '+
            'left_seat_belt=?, rear_seat_belt=?, head_rest=?, arm_rest=?, glove_box=?, date_modified=? '+
            'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Seats Info Updated!"}));
        }
    });
});

router.post('/obd/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.crank_shaft_sensor, postData.camshaft_sensor, postData.oxygen_sensor, postData.map_sensor, postData.throttle_position_sensor, postData.coolant_sensor,
            postData.airflow_sensor, postData.tpms, postData.evap, postData.abs, postData.srs, postData.bcm,
            postData.pcm, postData.detonation_sensor, postData.egr_sensor, postData.vehicle_speed, postData.gear_solenoid, postData.catalyst_sensor,
            postData.throttle_sensor, postData.mil, Date_Modified, id],
        query = 'Update inspections SET '+
            'crank_shaft_sensor=?, camshaft_sensor=?, oxygen_sensor=?, map_sensor=?, throttle_position_sensor = ?, coolant_sensor=?, '+
            'airflow_sensor=?, tpms=?, evap=?, abs=?, srs = ?, bcm=?, '+
            'pcm=?, detonation_sensor=?, egr_sensor=?, vehicle_speed=?, gear_solenoid = ?, catalyst_sensor=?, '+
            'throttle_sensor=?, mil=?, date_modified=? '+
            'where id=?';

    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "OBD Info Updated!"});
        }
    });
});

router.post('/fluids-filters/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.engine_oil, postData.oilpump_leakage, postData.engine_oil_valve_cover, postData.axle_oil_leakage, postData.gear_oil_leakage, postData.gear_oil_seal,
            postData.gear_oil, postData.brake_oil, postData.brake_oil_leakage, postData.brake_oil_hose_leakage, postData.brake_caliper, postData.brake_oil_pipe_leakage,
            postData.power_steering_oil_gauge, postData.power_steering_oil, postData.power_steering, postData.power_steering_oil_pump, postData.power_steering_oil_leakage, postData.washer_fluid,
            postData.washer_fluid_leakage, postData.washer_fluid_compartment, Date_Modified, id],
        query = 'Update inspections SET '+
            'engine_oil=?, oilpump_leakage=?, engine_oil_valve_cover=?, axle_oil_leakage=?, gear_oil_leakage = ?, gear_oil_seal=?, '+
            'gear_oil=?, brake_oil=?, brake_oil_leakage=?, brake_oil_hose_leakage=?, brake_caliper = ?, brake_oil_pipe_leakage=?, '+
            'power_steering_oil_gauge=?, power_steering_oil=?, power_steering=?, power_steering_oil_pump=?, power_steering_oil_leakage = ?, washer_fluid=?, '+
            'washer_fluid_leakage=?, washer_fluid_compartment=?, date_modified=? '+
            'where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Fluids and Filter Info Updated!"});
        }
    });
});

router.post('/documentation/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload =  [postData.license, postData.license_original, postData.ecmr, postData.ecmr_original, postData.proof_ownership, postData.proof_ownership_original,
            postData.road_worthiness, postData.road_worthiness_original, postData.insurance_clearance, postData.insurance_clearance_original, postData.custom_clearance, postData.custom_clearance_original,
            postData.purchase_receipt, postData.purchase_receipt_ownership, postData.tinted_permit, postData.tinted_permit_original, postData.number_plates, postData.number_plates_original,
            postData.plate_number_allocation, postData.plate_number_allocation_original, postData.spare_key_available, postData.vehicle_tracker, postData.vehicle_security, Date_Modified, id],
        query = 'Update inspections SET '+
            'license=?, license_original=?, ecmr=?, ecmr_original=?, proof_ownership = ?, proof_ownership_original=?, '+
            'road_worthiness=?, road_worthiness_original=?, insurance_clearance=?, insurance_clearance_original=?, custom_clearance = ?, custom_clearance_original=?, '+
            'purchase_receipt=?, purchase_receipt_ownership=?, tinted_permit=?, tinted_permit_original=?, number_plates = ?, number_plates_original=?, '+
            'plate_number_allocation=?, plate_number_allocation_original=?, spare_key_available=?, vehicle_tracker=?, vehicle_security=?, date_modified=? '+
            'where id=?';
    postData.Vehicle = req.params.number_plate;
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Vehicle Documentation Updated!"});
        }
    });
});

router.post('/valuation/:number_plate', function(req, res, next) {
    let postData = req.body,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        query = 'update inspections set FirstSale_Value = ?, Market_Valuation = ?, Date_Modified = ? where ID = ?',
        query1 = 'select max(ID) as ID from inspections where vehicle = ?';
    db.query(query1, req.params.number_plate, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query, [postData.firstsale_value, postData.market_valuation, Date_Modified, results[0]['ID']], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "error": null, "response": "Vehicle Valuation Details Updated!"});
                }
            });
        }
    });
});

router.post('/admin-valuation/:id', function(req, res, next) {
    let postData = req.body,
        id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        payload = [postData.Admin_FirstSale_Value, postData.Admin_Market_Valuation, Date_Modified, id],
        query = 'update inspections set Admin_FirstSale_Value = ?, Admin_Market_Valuation = ?, Date_Modified = ? where ID = ?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Vehicle Valuation Details Updated!"});
        }
    });
});

router.post('/inspection-approval/:id/:status/:reason', function(req, res, next) {
    let id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        query = 'update inspections set Inspection_Status = ?, Reason_For_Reject = ?, Date_Modified = ? where ID = ?';
    db.query(query, [req.params.status, req.params.reason, Date_Modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let payload = {}
            payload.category = 'Inspection'
            payload.userid = req.cookies.timeout
            if (req.params.status == 1)
                payload.description = 'Vehicle Inspection Approved.'
            else
                payload.description = 'Vehicle Inspection Rejected.'
            payload.affected = id
            notificationsService.log(req, payload)
            res.send({"status": 200, "error": null, "response": "Inspection Approved!"});
        }
    });
});

router.post('/reject-inspection/:id/', function(req, res, next) {
    let id = req.params.id,
        Date_Modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a'),
        query = 'update inspections set Inspection_Status = 0, Date_Modified = ? where ID = ?';
    db.query(query, [Date_Modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": "Inspection Rejected!"});
        }
    });
});

router.post('/maintenance/', function(req, res, next) {
    let data = req.body,
        query = 'insert into maintenance set ?';
    data.Date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, [data], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Maintenance Information Updated!"}));
        }
    });
});

//File Upload - Vehicle Maintenance
router.post('/maintenance-upload/:number_plate/', function(req, res) {
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params) return res.status(400).send('No Number Plate specified!');
    let sampleFile = req.files.file;
    let name = sampleFile.name;
    let extArray = sampleFile.name.split(".");
    let extension = extArray[extArray.length - 1];

    fs.stat('files/'+req.params.number_plate+'/', function(err) {
        if (err.code === 'ENOENT') {
            fs.mkdirSync('files/'+req.params.number_plate+'/');
        }
    });

    fs.stat('files/'+req.params.number_plate+'/maintenance.'+extension, function (err) {
        if (err) {
            sampleFile.mv('files/'+req.params.number_plate+'/maintenance.'+extension, function(err) {
                if (err) return res.status(500).send(err);
                res.send('File uploaded!');
            });
        } else{
            fs.unlink('files/'+req.params.number_plate+'/maintenance.'+extension,function(err){
                if(err){
                    res.send('Unable to delete file!');
                } else{
                    sampleFile.mv('files/'+req.params.number_plate+'/maintenance.'+extension, function(err) {
                        if (err)
                            return res.status(500).send(err);
                        res.send('File uploaded!');
                    });
                }
            });
        }

    });
});

router.post('/workflows', function(req, res, next) {
    let count = 0,
        created_workflow,
        stages = req.body.stages,
        workflow = req.body.workflow,
        date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    workflow.date_created = date_created;

    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query('INSERT INTO workflows SET ?', workflow, function (error, response, fields) {
            if(error || !response)
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            connection.query('SELECT * FROM workflows WHERE ID = LAST_INSERT_ID()', function (error, results, fields) {
                async.forEach(stages, function (stage, callback) {
                    stage.workflowID = results[0]['ID'];
                    created_workflow = results[0]['ID'];
                    stage.date_created = date_created;
                    delete stage.stage_name;
                    delete stage.type;
                    if (stage.action_names)
                        delete stage.action_names;
                    connection.query('INSERT INTO workflow_stages SET ?', stage, function (error, results, fields) {
                        if (error){
                            console.log(error);
                        } else {
                            count++;
                        }
                        callback();
                    });
                }, function (data) {
                    connection.query('SELECT * FROM workflows AS w WHERE w.status <> 0 ORDER BY w.ID desc', function (error, results, fields) {
                        connection.release();
                        let payload = {}
                        payload.category = 'Workflow'
                        payload.userid = req.cookies.timeout
                        payload.description = 'New Workflow Created'
                        payload.affected = created_workflow
                        notificationsService.log(req, payload)
                        res.send({"status": 200, "error": null, "message": "Workflow with "+count+" stage(s) created successfully!", "response": results});
                    });
                })
            })
        });
    });
});

router.post('/workflows/:workflow_id', function(req, res, next) {
    let count = 0,
        created_workflow,
        stages = req.body.stages,
        workflow = req.body.workflow,
        workflow_id = req.params.workflow_id,
        date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    workflow.date_created = date_created;

    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query('UPDATE workflows SET status = 0, date_modified = ? WHERE ID = ?', [date_created,workflow_id], function (error, result, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                connection.query('INSERT INTO workflows SET ?', workflow, function (error, response, fields) {
                    if(error || !response)
                        res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                    connection.query('SELECT * FROM workflows WHERE ID = LAST_INSERT_ID()', function (error, results, fields) {
                        async.forEach(stages, function (stage, callback) {
                            stage.workflowID = results[0]['ID'];
                            created_workflow = results[0]['ID'];
                            stage.date_created = date_created;
                            delete stage.ID;
                            delete stage.stage_name;
                            delete stage.type;
                            if (stage.action_names)
                                delete stage.action_names;
                            connection.query('INSERT INTO workflow_stages SET ?', stage, function (error, results, fields) {
                                if (error){
                                    console.log(error);
                                } else {
                                    count++;
                                }
                                callback();
                            });
                        }, function (data) {
                            connection.query('SELECT * FROM workflows AS w WHERE w.status <> 0 ORDER BY w.ID desc', function (error, results, fields) {
                                connection.release();
                                let payload = {}
                                payload.category = 'Workflow'
                                payload.userid = req.cookies.timeout
                                payload.description = 'New Workflow Created'
                                payload.affected = created_workflow
                                notificationsService.log(req, payload)
                                res.send({"status": 200, "error": null, "message": "Workflow with "+count+" stage(s) created successfully!", "response": results});
                            });
                        })
                    })
                });
            }
        });
    });
});

router.post('/edit-workflows/:workflow_id', function(req, res, next) {
    let count = 0,
        stages = req.body.stages,
        workflow = req.body.workflow,
        workflow_id = req.params.workflow_id,
        date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(stages, function (stage, callback) {
            connection.query('UPDATE workflow_stages SET approverID=?, date_modified=? WHERE workflowID=? AND stageID=?',
                [stage.approverID,date_modified,workflow_id,stage.stageID], function (error, results, fields) {
                if (error){
                    console.log(error);
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            connection.query('SELECT * FROM workflows AS w WHERE w.status <> 0 ORDER BY w.ID desc', function (error, results, fields) {
                connection.release();
                let payload = {}
                payload.category = 'Workflow'
                payload.userid = req.cookies.timeout
                payload.description = 'Workflow Edited'
                payload.affected = req.params.workflow_id
                notificationsService.log(req, payload)
                res.send({"status": 200, "error": null, "message": "Workflow with "+count+" stage(s) updated successfully!", "response": results});
            });
        })
    });
});

router.get('/workflows', function(req, res, next) {
    let query = 'SELECT * FROM workflows AS w WHERE w.status <> 0 ORDER BY w.ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Workflows fetched successfully!", "response": results});
        }
    });
});

router.get('/workflows-all', function(req, res, next) {
    let query = 'SELECT * FROM workflows AS w ORDER BY w.ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Workflows fetched successfully!", "response": results});
        }
    });
});

router.get('/workflows/:workflow_id', function(req, res, next) {
    let query = 'SELECT * FROM workflows AS w WHERE w.status <> 0 AND w.ID = '+req.params.workflow_id;
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Workflows fetched successfully!", "response": results[0]});
        }
    });
});

router.get('/workflow-stages', function(req, res, next) {
    let query = 'SELECT w.ID, w.document, w.actions, w.workflowID, w.stageID, w.name, w.description, w.date_created, w.date_modified, s.name AS stage_name FROM workflow_stages AS w, stages as s WHERE w.stageID=s.ID ORDER BY w.ID asc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Workflows fetched successfully!", "response": results});
        }
    });
});

router.get('/workflow-stages/:workflow_id', function(req, res, next) {
    let query = 'SELECT w.ID, w.document, w.actions, w.approverID, w.workflowID, w.stageID, w.name, w.description, w.date_created, w.date_modified, s.name AS stage_name FROM workflow_stages AS w, stages as s WHERE w.workflowID =? AND w.stageID=s.ID ORDER BY w.ID asc';
    db.query(query, [req.params.workflow_id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Workflows fetched successfully!", "response": results});
        }
    });
});

router.get('/stages', function(req, res, next) {
    let query = 'SELECT * from stages ORDER BY name asc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send(results);
        }
    });
});

router.post('/stages', function(req, res, next) {
    let stage = req.body,
        query = 'INSERT INTO stages SET ?';
    stage.type = 2;
    db.query(query, stage, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Stage added successfully!", "response": results});
        }
    });
});

router.post('/submitPermission/:role', function(req, res, next) {
    let ids = req.body,
        role_id = ids.role,
        count = 0,
        status = true;
    db.getConnection(function(err, connection) {
        if (err) throw err;

        async.forEach(ids.modules, function (id, callback) {
            let module_id = id[0],
                read_only = id[1],
                write = id[2],
                query = 'INSERT INTO permissions SET ?';
            connection.query(query, {role_id:role_id, module_id:module_id, read_only:read_only, editable:write, date:moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')}, function (error, results, fields) {
                if(error){
                    status = false;
                    callback({"status": 500, "error": error, "response": null});
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            // connection.release();
            if(status === false)
                return res.send(data);
            else {
                connection.query(`select u.role_name from user_roles u where u.ID = ${role_id}`, function (error, results, fields) {
                    if (error){
                        res.send({'status': 500, 'error': error})
                    }
                    else {
                        let payload = {}
                        payload.category = 'Permission'
                        payload.userid = req.cookies.timeout
                        payload.description = 'New Permissions Set for '+results[0]['role_name']
                        payload.affected = role_id
                        notificationsService.log(req, payload)
                        res.send({"status": 200, "error": null, "message": "Permissions Set for Selected Role!"});
                    }
                });
            }
        })
    });
});

router.post('/new-module/', function(req, res, next) {
    let data = req.body,
        query = 'insert into modules set ?';
    db.query(query, [data], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "New Module Added!"}));
        }
    });
});

router.post('/update-module/:id', function(req, res, next) {
    let data = req.body,
        payload = [data.module_name, data.menu_name, data.status, data.main_menu],
        query = 'update modules set module_name = ?, menu_name = ?, status = ?, main_menu = ? where id = ?';
    data.Date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "New Module Added!"}));
        }
    });
});

router.get('/document-upload/:id/:name?', function(req, res) {
    res.send('OK');
});

router.post('/document-upload/:id/:name', function(req, res) {
    let	name = req.params.name,
        application_id = req.params.id;

    if (!name) return res.status(400).send('No files were uploaded.');
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params || !application_id || !name) return res.status(400).send('No parameters specified!');
    let sampleFile = req.files['files[]'],
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1];

    db.query('SELECT * FROM applications WHERE ID = ?', [application_id], function (error, application, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else if (!application || !application[0]) {
            res.send({"status": 500, "error": "Application does not exist", "response": null});
        } else {
            fs.stat('files/application-'+application_id+'/', function(err) {
                if (err && (err.code === 'ENOENT'))
                    fs.mkdirSync('files/application-'+application_id+'/');

                fs.stat('files/application-'+application_id+'/'+application_id+'_'+name+'.'+extension, function (err) {
                    if (err) {
                        sampleFile.mv('files/application-'+application_id+'/'+application_id+'_'+name+'.'+extension, function(err) {
                            if (err) return res.status(500).send(err);
                            res.send({files:[sampleFile]});
                        });
                    } else {
                        fs.unlink('files/application-'+application_id+'/'+application_id+'_'+name+'.'+extension,function(err){
                            if(err){
                                return console.log(err);
                            } else {
                                sampleFile.mv('files/application-'+application_id+'/'+application_id+'_'+name+'.'+extension, function(err) {
                                    if (err)
                                        return res.status(500).send(err);
                                    else {
                                        let payload = {}
                                        payload.category = 'Application'
                                        payload.userid = req.cookies.timeout
                                        payload.description = 'New Document Upload'
                                        payload.affected = application_id
                                        notificationsService.log(req, payload)
                                        res.send({files:[sampleFile]});
                                    }
                                });
                            }
                        });
                    }
                });
            });
        }
    });
});

router.get('/document_check/:id/:name', function(req, res, next) {
    let obj = {},
        status = false,
        path = 'files/application-'+req.params.id+'/';
    if (fs.existsSync(path)){
        fs.readdir(path, function (err, files){
            async.forEach(files, function (file, callback){
                let filename_array = file.split('.')[0].split('_');
                filename_array.shift();
                let filename = filename_array.join('_');
                if (filename === req.params.name)
                    status = true;
                obj[filename] = path+file;
                callback();
            }, function(data){
                res.json({status:status, response:obj});
            });
        });
    }
    else {
        res.json({status:status});
    }
});

router.post('/targets', function(req, res, next) {
    let target = req.body,
        query = 'INSERT INTO targets SET ?';
    target.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM targets WHERE status=1 AND type=? AND period=?', [target.type, target.period], function (error, target_obj, fields) {
        if(target_obj && target_obj[0]){
            res.send({"status": 500, "error": "Similar target ("+target_obj[0]['title']+") with same period already exists!", "response": target_obj});
        } else {
            db.query(query, target, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Target'
                    payload.userid = req.cookies.timeout
                    payload.description = 'New Target Added'
                    payload.affected = results.insertId
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Target added successfully!"});
                }
            });
        }
    });
});

router.get('/targets', function(req, res, next) {
    db.query('SELECT t.ID, t.title, t.description, t.period, t.type, t.value, t.date_created, p.start, p.end FROM targets AS t, periods AS p ' +
        'WHERE t.period = p.ID AND t.status = 1', function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Targets fetched successfully!", "response": results});
        }
    });
});

router.delete('/target/delete/:id', function(req, res, next){
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE targets SET status=0,date_modified=? WHERE ID = ?', [date,req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let payload = {}
            payload.category = 'Target'
            payload.userid = req.cookies.timeout
            payload.description = 'Target Deleted'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send({"status": 200, "message": "Target deleted successfully!"});
        }
    });
});

router.post('/periods', function(req, res, next) {
    let period = req.body,
        query = 'INSERT INTO periods SET ?';
    period.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM periods WHERE status = 1 AND (name=? OR (TIMESTAMP(?) BETWEEN TIMESTAMP(start) AND TIMESTAMP(end) OR TIMESTAMP(?) BETWEEN TIMESTAMP(start) AND TIMESTAMP(end)))',
        [period.name,period.start,period.end], function (error, period_obj, fields) {
        if(period_obj && period_obj[0]){
            res.send({"status": 500, "error": "Similar period ("+period_obj[0]['name']+") already exist!", "response": period_obj});
        } else {
            db.query(query, period, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    db.query('SELECT MAX(ID) AS ID from periods', function(err, period_id, fields) {
                        if (err){
                            res.send({"status": 200, "error": err, "response": null});
                        } else{
                            generateSubPeriods(period, period_id[0]['ID'], function (sub_periods) {
                                db.getConnection(function(err, connection) {
                                    if (err) throw err;

                                    async.forEach(sub_periods, function (sub_period, callback) {
                                        connection.query('INSERT INTO sub_periods SET ?', sub_period, function (error, results, fields) {
                                            if(error)
                                                console.log(error);
                                            callback();
                                        });
                                    }, function (data) {
                                        connection.release();
                                        res.send({"status": 200, "message": "Period added successfully!"});
                                    });
                                });
                            });
                        }
                    });
                }
            });
        }
    });
});

function generateSubPeriods(period, periodID, callback) {
    let code, dates, count,
        sub_periods = [];
    switch (period.type){
        case 'monthly':{
            dates = dateRangeArray(period, 1);
            code = 'M';
            count = 12;
            break;
        }
        case 'quarterly':{
            dates = dateRangeArray(period, 3);
            code = 'Q';
            count = 4;
            break;
        }
        case 'half_yearly':{
            dates = dateRangeArray(period, 6);
            code = 'H';
            count = 2;
            break;
        }
    }
    for (let i=1; i<=count; i++){
        let sub_period = {
            periodID: periodID,
            name: code+i+' of '+period.name,
            type: code+i,
            start: dates[i-1]['start'],
            end: dates[i-1]['end']
        };
        sub_periods.push(sub_period);
    }
    return callback(sub_periods);
}

function dateRangeArray(period, interval) {
    let dates_array = [],
        count = 12/interval;
    for (let i=0; i<count; i++){
        let start,
            date_object = {};
        if (i === 0){
            start = period.start;
        } else {
            start = moment(dates_array[i-1]['end']).add(1, 'days').format("YYYY-MM-DD");
        }
        date_object.start = start;
        let days = 0,
            start_year = parseInt((start.split('-'))[0]),
            start_month = parseInt((start.split('-'))[1]);
        for (let j=0; j<interval; j++){
            if (start_month > 12)
                start_month = start_month % 12;
            days += daysInMonth((start_month + j),(start_year + parseInt(start_month/12)));
        }
        date_object.end = moment(date_object.start).add((days-1), 'days').format("YYYY-MM-DD");
        dates_array.push(date_object);
    }
    return dates_array;
}

function daysInMonth (month, year) {
    return new Date(year, month, 0).getDate();
}

router.get('/periods', function(req, res, next) {
    db.query('SELECT * FROM periods WHERE status = 1', function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Periods fetched successfully!", "response": results});
        }
    });
});

router.get('/period/sub_periods/:id', function(req, res, next) {
    db.query('SELECT * FROM sub_periods WHERE periodID = ?', [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Sub periods fetched successfully!", "response": results});
        }
    });
});

router.delete('/period/delete/:id', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE periods SET status=0,date_modified=? WHERE ID = ?', [date,req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Period deleted successfully!"});
        }
    });
});

router.get('/target/sub_periods/:id', function(req, res, next) {
    db.query('SELECT * FROM targets WHERE ID = ?', [req.params.id], function (error, target, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query('SELECT * FROM sub_periods WHERE periodID = ?', target[0]['period'], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "Sub periods fetched successfully!", "response": results});
                }
            });
        }
    });
});

router.post('/commissions', function(req, res, next) {
    let commission = req.body,
        query = 'INSERT INTO commissions SET ?';
    commission.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, commission, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commission added successfully!"});
        }
    });
});

router.get('/commissions', function(req, res, next) {
    db.query('SELECT * FROM commissions WHERE status = 1', function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commissions fetched successfully!", "response": results});
        }
    });
});

module.exports = router;