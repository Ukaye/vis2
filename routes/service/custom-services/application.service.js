const fs = require('fs'),
    async = require('async'),
    axios = require('axios'),
    moment = require('moment'),
    db = require('../../../db'),
    express = require('express'),
    router = express.Router();

router.post('/upload/:id/:name/:folder?', function(req, res) {
    const HOST = `${req.protocol}://${req.get('host')}`;
    let	name = req.params.name,
        folder = req.params.folder,
        application_id = req.params.id,
        sampleFile = req.files.file,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1],
        query = `SELECT * FROM applications WHERE ID = ${application_id}`,
        endpoint = '/core-service/get',
        url = `${HOST}${endpoint}`;
    if (extension) extension = extension.toLowerCase();

    if (!name) return res.status(400).send('No files were uploaded.');
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params || !application_id || !name) return res.status(400).send('Required parameter(s) not sent!');

    axios.get(url, {
        params: {
            query: query
        }
    }).then(response => {
        let application = response.data;
        if (!application || !application[0]) {
            res.send({"status": 500, "error": "Application does not exist", "response": null});
        } else {
            const file_folder = `files/${folder || `application-${application_id}`}/`;
            fs.stat(file_folder, function(err) {
                if (err && (err.code === 'ENOENT'))
                    fs.mkdirSync(file_folder);

                const file_url = `${file_folder}${application_id}_${name}.${extension}`;
                fs.stat(file_url, function (err) {
                    if (err) {
                        sampleFile.mv(file_url, function(err) {
                            if (err) return res.status(500).send(err);
                            res.send({
                                file:file_url, 
                                data: sampleFile
                            });
                        });
                    } else {
                        fs.unlink(file_url,function(err){
                            if(err){
                                return console.log(err);
                            } else {
                                sampleFile.mv(file_url, function(err) {
                                    if (err)
                                        return res.status(500).send(err);
                                    res.send({
                                        file:file_url, 
                                        data: sampleFile
                                    });
                                });
                            }
                        });
                    }
                });
            });
        }
    });
});

module.exports = router;