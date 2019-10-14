const express = require('express');
let token,
    fs = require('fs'),
    db = require('../db'),
    _ = require('lodash'),
    path = require('path'),
    users = express.Router(),
    async = require('async'),
    enums = require('../enums'),
    moment  = require('moment'),
    bcrypt = require('bcryptjs'),
    jwt = require('jsonwebtoken'),
    nodemailer = require('nodemailer'),
    xeroFunctions = require('../routes/xero'),
    hbs = require('nodemailer-express-handlebars'),
    helperFunctions = require('../helper-functions'),
    smtpTransport = require('nodemailer-smtp-transport'),
    notificationsService = require('./notifications-service'),
    emailService = require('./service/custom-services/email.service'),
    smtpConfig = smtpTransport({
        service: 'Mailjet',
        auth: {
            user: process.env.MAILJET_KEY,
            pass: process.env.MAILJET_SECRET
        }
    }),
    options = {
        viewPath: 'views/email',
        extName: '.hbs'
    };
transporter = nodemailer.createTransport(smtpConfig);
transporter.use('compile', hbs(options));

users.get('/import-bulk-clients', function(req, res) {
    let clients = [],
        count=0,
        errors = [];

    db.getConnection(function(err, connection) {
        if (err) throw err;
        async.forEach(clients, function (client, callback) {
            client.status = 1;
            delete client.ID;
            delete client.user_role;
            delete client.comment;
            delete client.date_modified;
            delete client.address;
            console.log(client.fullname);
            connection.query('INSERT INTO clients SET ?', client, function (err, result, fields) {
                if (err) {
                    console.log(err);
                    errors.push(client);
                } else {
                    count++;
                }
                callback();
            });
        }, function (data) {
            connection.release();
            res.json({count: count, errors: errors})
        })
    });
});

users.get('/bulk-update-clients', function(req, res) {
    let clients = [
        {
          "ID": 1,
          "email": "adetola.oloke@firstbanknigeria.com",
          "fullname": "Adetola Oluwatoyin Oloke",
          "XeroContactID": "a7ef4f37-85b0-42a7-94e6-9fa3cf975a78"
        },
        {
          "ID": 2,
          "email": "titi.folorunsho@prudential.ng",
          "fullname": "Folorunsho Temilade Titilayo",
          "XeroContactID": "fb301a46-96cf-4fac-b105-5acd08e3c093"
        },
        {
          "ID": 4,
          "email": "tituslakunle80@yahoo.com",
          "fullname": "Okelola Olakunle Titus",
          "XeroContactID": "29e20060-49b4-41ea-969d-d1ef1908179c"
        },
        {
          "ID": 5,
          "email": "yinka@atobatele.com",
          "fullname": "Olayinka Atobatele",
          "XeroContactID": "43ca1384-30a8-4187-874c-867b69e8491e"
        },
        {
          "ID": 7,
          "email": "motayoojediran@yahoo.com",
          "fullname": "Ojediran Emmanuel Omotayo",
          "XeroContactID": "684664b6-7c10-445a-b014-171fbdd0a02a"
        },
        {
          "ID": 9,
          "email": "joy.fademi@gmail.com",
          "fullname": "Fademi Anne Joy",
          "XeroContactID": "ca966592-e2df-4b40-9562-497fadfbc57e"
        },
        {
          "ID": 10,
          "email": "oakuyinu@unionbankng.com",
          "fullname": "Kuyinu Akinkunmi Oluyinku",
          "XeroContactID": "4b127a2c-db01-41eb-9596-75d90589e9fa"
        },
        {
          "ID": 11,
          "email": "steve1agisltd@gmail.com",
          "fullname": "Ariana George Intergrated",
          "XeroContactID": "f14d0e4f-5416-46d6-9079-01292c8a2514"
        },
        {
          "ID": 12,
          "email": "cabanum@providusbank.com",
          "fullname": "Conrad Abanum oghenetega",
          "XeroContactID": "698bc643-9eb3-42ae-a0e9-ae9b3c10f285"
        },
        {
          "ID": 13,
          "email": "bimmy4life@yahoo.com",
          "fullname": "Yetunde Abayomi-Badmus Adebimpe",
          "XeroContactID": "4130fbd4-6e01-40ad-b9ac-979354a1bdb0"
        },
        {
          "ID": 14,
          "email": "morenikeabdulsalam@gmail.com",
          "fullname": "Morenike Abdul-Salam Wunmi",
          "XeroContactID": "a143e4bb-af8d-4770-9366-9e7833dd81f1"
        },
        {
          "ID": 15,
          "email": "Adeyemi.Abereoje@sc.com",
          "fullname": "Adeyemi Abereoje",
          "XeroContactID": "34e77009-1d7b-42e1-be6d-2c859aaefd7f"
        },
        {
          "ID": 16,
          "email": "yinkabimbola@gmail.com",
          "fullname": "Olayinka Abimbola",
          "XeroContactID": "3711edb0-3b3a-445a-8fd7-f6eb3d670d01"
        },
        {
          "ID": 17,
          "email": "abiodun.o.akintoye@firstbanknigeria.com",
          "fullname": "Akintoye Abiodun Oyewunmi",
          "XeroContactID": "88e57696-826c-4c07-8ced-41a6f2006db5"
        },
        {
          "ID": 18,
          "email": "biodunokusami@yahoo.com",
          "fullname": "Okusami Abiodun Okusami",
          "XeroContactID": "50532ce2-1e44-479c-a69f-1d3e2dd99190"
        },
        {
          "ID": 19,
          "email": "abidemzy@yahoo.com",
          "fullname": "Ademola Abioye Jamiu",
          "XeroContactID": "1aedca5a-b8b0-42b1-992a-967f783dfc6e"
        },
        {
          "ID": 20,
          "email": "abolarin.shade@yahoo.com",
          "fullname": "Shade Abolarin Janet",
          "XeroContactID": "48fef25a-e5c9-4db6-8192-d3fef866c4b2"
        },
        {
          "ID": 21,
          "email": "isaac.ocho@gmail.com",
          "fullname": "Isaac Achanya Ocholofu",
          "XeroContactID": "69b62a20-d1e9-4a85-b0dd-68f500926b4e"
        },
        {
          "ID": 22,
          "email": "akunlesh@gmail.com",
          "fullname": "Adekunle Adebayo",
          "XeroContactID": "cc885a55-4172-468d-a5b0-8e6966d732a0"
        },
        {
          "ID": 23,
          "email": "temidayo.adebayo@9mobile.com.ng",
          "fullname": "Temidayo Adebayo ayotunde",
          "XeroContactID": "415f580c-f18a-4afa-95b4-4a8c5ea5d557"
        },
        {
          "ID": 24,
          "email": "bayascok2@gmail.com",
          "fullname": "Adegboye Adebiyi Adulmojeed",
          "XeroContactID": "e14a0965-7985-47f4-a44d-2fd2bb554614"
        },
        {
          "ID": 25,
          "email": "adebowale.a.ifesanya@firstbanknigeria.com",
          "fullname": "Ifesanya Adebowale",
          "XeroContactID": "32d146ce-abff-43f7-adb5-7fa49ade0f5b"
        },
        {
          "ID": 26,
          "email": "busolaadeshola@gmail.com",
          "fullname": "Adeshola Adebusola",
          "XeroContactID": "84022424-27c4-4643-aa85-88248f4f56c7"
        },
        {
          "ID": 27,
          "email": "femolalac65@yahoo.com",
          "fullname": "Olufemi Adediran James",
          "XeroContactID": "bc2ebf44-62f0-44d4-b259-724acf6b8d72"
        },
        {
          "ID": 28,
          "email": "olumeiyor@gmail.com",
          "fullname": "Ayoola Adedolapo Kolapo",
          "XeroContactID": "02c35d7d-7ac6-4a6c-b957-b958c344c5a3"
        },
        {
          "ID": 29,
          "email": "ayobami.h.adegoke@firstbanknigeria.com",
          "fullname": "Ayobami Adegoke",
          "XeroContactID": "6e568cf4-a4fe-47cc-b41c-23950bb10bac"
        },
        {
          "ID": 30,
          "email": "i_adekoya@hotmail.com",
          "fullname": "Idowu Adekoya I",
          "XeroContactID": "9fec8359-45a3-4883-a919-c97f58285676"
        },
        {
          "ID": 31,
          "email": "kay_job@yahoo.com",
          "fullname": "Job Adekunle Oludare",
          "XeroContactID": "0ddda3fe-4fbe-4279-aa11-ab7439c16874"
        },
        {
          "ID": 32,
          "email": "aderonkeadelaja@gmail.com",
          "fullname": "Aderonke Adelaja Iyabode",
          "XeroContactID": "70a83a10-b785-424e-85db-0a851f100628"
        },
        {
          "ID": 33,
          "email": "adeola2aribaba@yahoo.com",
          "fullname": "Derkol Ventures Aribaba",
          "XeroContactID": "efcda8dc-c76b-4675-97d3-7a790ed6510b"
        },
        {
          "ID": 34,
          "email": "kola.adeoyo@gmail.com",
          "fullname": "Kolawole Adeoyo Olutunde",
          "XeroContactID": "498a5d0b-a5f9-48bb-bd23-42ca86874729"
        },
        {
          "ID": 35,
          "email": "olalekan.adepitan@accessbankplc.com",
          "fullname": "Olalekan Adepitan Olatunbosun",
          "XeroContactID": "2d2c8fe9-5c71-482a-99dc-2f17e976e82b"
        },
        {
          "ID": 36,
          "email": "Bukola.Aderinto@zenithcustodian.com",
          "fullname": "Olamide Aderinto Bukola",
          "XeroContactID": "d1eff89f-be11-4332-aa00-f16b3cb6d93b"
        },
        {
          "ID": 37,
          "email": "adesuyioluwasholaojo@gmail.com",
          "fullname": "Oluwashola Adesuyi Ojo",
          "XeroContactID": "ce1e2a43-622b-46cd-8ad6-e31a2c8548e4"
        },
        {
          "ID": 38,
          "email": "oluwadamilolaadetayo@keystonebankng.com",
          "fullname": "Oluwadamilola Adetayo",
          "XeroContactID": "e8e58fa9-b223-4eed-8a4c-aa0460191295"
        },
        {
          "ID": 39,
          "email": "charlestoye1@yahoo.com",
          "fullname": "Charles Adetoyese",
          "XeroContactID": "16cbc1a5-eeee-4f90-b4e2-c942c6814b5d"
        },
        {
          "ID": 40,
          "email": "adeleye.adewusi@firstbanknigeria.com",
          "fullname": "Adeleye Adewusi Olayinka",
          "XeroContactID": "7a0c8f7d-8713-41e0-b0ce-98ecaabc763e"
        },
        {
          "ID": 41,
          "email": "profabay2003@yahoo.com",
          "fullname": "Abayomi Adeyemi Ismaila",
          "XeroContactID": "8b127d62-14da-4205-87b8-6b488e299f83"
        },
        {
          "ID": 42,
          "email": "idowu5adeyemi@gmail.com",
          "fullname": "Idowu Adeyemi Emmanuel",
          "XeroContactID": "23a22651-5bf7-4c48-bce3-d400f29b7c06"
        },
        {
          "ID": 43,
          "email": "funmiadeyinkaishola@gmail.com",
          "fullname": "Funmilayo Adeyinka-Ishola Fadeyemi",
          "XeroContactID": "72464c37-41c0-40ea-b355-5e3ee51a202c"
        },
        {
          "ID": 45,
          "email": "charly_boy2@yahoo.com",
          "fullname": "Charles Adigwe",
          "XeroContactID": "85d00bb8-a9d1-4e69-ab0a-ccbe3e2396db"
        },
        {
          "ID": 46,
          "email": "Oladimeji.Adisa@sc.com",
          "fullname": "Oladimeji Adisa",
          "XeroContactID": "3f152244-c092-4f29-8a85-a24af80bab60"
        },
        {
          "ID": 48,
          "email": "mmtadvertizing@yahoo.com",
          "fullname": "Marketing Margin Tech & Advertising",
          "XeroContactID": "ccf644e9-57e1-48ff-b060-b8b63966908f"
        },
        {
          "ID": 49,
          "email": "sundayagare@keystonebankng.com",
          "fullname": "Sunday Agare Oladipupo",
          "XeroContactID": "30586787-f318-40cd-8069-ca8556605d80"
        },
        {
          "ID": 50,
          "email": "oluagbaje@gmail.com",
          "fullname": "Adesoji Agbaje Michael",
          "XeroContactID": "b2005895-f2a0-4341-b228-a84c8fc8b171"
        },
        {
          "ID": 52,
          "email": "oge.agbo@gmail.com",
          "fullname": "Juliet Agbo Ogechukwu",
          "XeroContactID": "cf2a94a6-ec98-48cd-8737-21df790413d3"
        },
        {
          "ID": 53,
          "email": "gabriel.ahmedu@stanbicibtc.com",
          "fullname": "Gabriel Ahmedu Sabo",
          "XeroContactID": "cf2a94a6-ec98-48cd-8737-21df790413d3"
        },
        {
          "ID": 54,
          "email": "non@non.com",
          "fullname": "Oluwatobi Ahouansou Soyedja",
          "XeroContactID": "a67bacf9-aaba-413f-9b78-48c90bf5eef5"
        },
        {
          "ID": 55,
          "email": "innokela@gmail.com",
          "fullname": "Osezua Aikhaituamen",
          "XeroContactID": "437055a8-29f7-4cd6-83be-36e1aa825266"
        },
        {
          "ID": 57,
          "email": "omoteeaina@yahoo.com",
          "fullname": "Tayo Aina Olasunkanmi",
          "XeroContactID": "89875378-8422-4a5a-9777-b8227de75ab5"
        },
        {
          "ID": 58,
          "email": "ademolaajayi@outlook.com",
          "fullname": "Ademola Ajayi",
          "XeroContactID": "d3298d02-5893-4cec-af48-fa60255247e0"
        },
        {
          "ID": 59,
          "email": "lekanakala@yahoo.com",
          "fullname": "Olalekan Akala Sunday",
          "XeroContactID": "7a916636-78b4-48d1-9782-d63289985a72"
        },
        {
          "ID": 60,
          "email": "sunday.akinbo@toptechengineeringltd.com",
          "fullname": "Sunday Akinbo adeyeye",
          "XeroContactID": "64ba859a-4a12-4540-a2b4-4d20d4590bf4"
        },
        {
          "ID": 61,
          "email": "aakingbade@providusbank.com",
          "fullname": "Akinsola Akingbade Akingbade",
          "XeroContactID": "98303486-999c-4a44-99dc-f58dd9998ab8"
        },
        {
          "ID": 62,
          "email": "Olajide.Akinlonu@sc.com",
          "fullname": "Jide Akinlonu",
          "XeroContactID": "19e623d4-b8cb-4bc0-88a3-8c61986a9c5e"
        },
        {
          "ID": 63,
          "email": "halima.akinola@accessbankplc.com",
          "fullname": "Halima Sadiat Akinola",
          "XeroContactID": "37eb373b-d862-412a-b3ca-44d92aa2d068"
        },
        {
          "ID": 64,
          "email": "ezekiel.akingbade@hbng.com",
          "fullname": "Akingbade Akinola Ezekiel",
          "XeroContactID": "acc8e8ef-cb54-4f94-8932-51f9618ba846"
        },
        {
          "ID": 65,
          "email": "Akindeleakintola@keystonebankng.com",
          "fullname": "Akindele Akintola kazeem",
          "XeroContactID": "32a31311-0c81-4a28-aeb0-d6bf23051073"
        },
        {
          "ID": 66,
          "email": "abisayo-akintola@yahoo.com",
          "fullname": "Abisayo Akintola Akeem",
          "XeroContactID": "91452a91-62d6-464a-8a8b-ff3fb26d625b"
        },
        {
          "ID": 67,
          "email": "akintundefayokemi@gmail.com",
          "fullname": "Fayokemi Akintunde Ebunoluwa",
          "XeroContactID": "c16fc987-a5d5-48c9-9f0a-ef928a1b3a6a"
        },
        {
          "ID": 68,
          "email": "dakom03@yahoo.com",
          "fullname": "Taiwo Akomolede",
          "XeroContactID": "68d51e30-07f6-440c-9655-7136f594d043"
        },
        {
          "ID": 69,
          "email": "moalade@ikejaelectric.com",
          "fullname": "Olajumoke Alade Mobolaji",
          "XeroContactID": "7401c8fd-ca7c-4dd3-9695-ef796449aa70"
        },
        {
          "ID": 70,
          "email": "aogunmolawa@honeywellflour.com",
          "fullname": "Ogunmolawa kolawole Alexander",
          "XeroContactID": "8c6033d2-9863-466a-9cb4-041869a49581"
        },
        {
          "ID": 71,
          "email": "lima96ng@yahoo.com",
          "fullname": "Abdulrahman Aliyu",
          "XeroContactID": "985a9d6f-de26-46ee-8049-20c0c7003c1a"
        },
        {
          "ID": 72,
          "email": "palygoff@yahoo.com",
          "fullname": "Godfrey Aluede",
          "XeroContactID": "81bc64f3-3ef2-4c3b-9f8d-a9588fdcf502"
        },
        {
          "ID": 73,
          "email": "faluko39@gmail.com",
          "fullname": "Oluwafemi Aluko John",
          "XeroContactID": "81bc64f3-3ef2-4c3b-9f8d-a9588fdcf502"
        },
        {
          "ID": 74,
          "email": "ralphamaefula@gmail.com",
          "fullname": "Rapheal Amaefula",
          "XeroContactID": "719cf599-5589-4f1d-8aab-2cb93551656e"
        },
        {
          "ID": 75,
          "email": "gbengaanjola@yahoo.com",
          "fullname": "Gbenga Anjola",
          "XeroContactID": "030ff4f8-60d8-4945-ac0f-0d4735ae54d7"
        },
        {
          "ID": 76,
          "email": "anthony.a.opeke@firstbanknigeria.com",
          "fullname": "Opeke Anthony Akinwumi",
          "XeroContactID": "e6db4b90-ca1e-49f7-96c8-72170eeb8d48"
        },
        {
          "ID": 77,
          "email": "chibuzor.okechi@gmail.com",
          "fullname": "Okeahialam Anthony Chibuzor",
          "XeroContactID": "84c8e88d-d131-4241-abc3-5398377935b7"
        },
        {
          "ID": 78,
          "email": "louiso1807@gmail.com",
          "fullname": "Chigozie Anugwom",
          "XeroContactID": "04ceaf91-35e9-4527-8b3e-c42e87993234"
        },
        {
          "ID": 79,
          "email": "akinwale@atbtechsoft.com",
          "fullname": "Akinwale Ariwodola",
          "XeroContactID": "aded2958-094f-40cf-9eec-6c8d83f93ae7"
        },
        {
          "ID": 80,
          "email": "greatmaxwell@gmail.com",
          "fullname": "Maxwell Asowata",
          "XeroContactID": "3cd8c084-30a3-44af-8da9-4c5fe13981ee"
        },
        {
          "ID": 81,
          "email": "confidenceatewe@deerfieldpetroleum.com",
          "fullname": "Confidence Atewe osas",
          "XeroContactID": "c3b958f1-ecb6-4274-9d52-972d8e5c9fbb"
        },
        {
          "ID": 82,
          "email": "atobatele4life@yahoo.com",
          "fullname": "Taoreed Atobatele Abiodun",
          "XeroContactID": "8da98139-3dd0-432f-980f-c404724cb0d5"
        },
        {
          "ID": 83,
          "email": "timothyattah@yahoo.com",
          "fullname": "Timothy Attah",
          "XeroContactID": "3fd552a4-2138-4d19-b60e-84d3bc52e89e"
        },
        {
          "ID": 84,
          "email": "kenatunwa@gmail.com",
          "fullname": "Kehinde Atunwa Oluranti",
          "XeroContactID": "4e798b0c-f382-4656-b6d2-7fd0d6615e22"
        },
        {
          "ID": 85,
          "email": "austineokenu@gmail.com",
          "fullname": "Okenu Austin",
          "XeroContactID": "fca00192-80fd-46e3-bd61-97244ada24d1"
        },
        {
          "ID": 86,
          "email": "emmanuel.aviomoh@live.com",
          "fullname": "Emmanuel Aviomoh",
          "XeroContactID": "ab4cb226-d183-4195-832b-f190c48918cc"
        },
        {
          "ID": 87,
          "email": "awojobikayode@gmail.com",
          "fullname": "Stephen Awojobi Olukayode",
          "XeroContactID": "2834bb80-7279-4829-a206-6f2d6561bb0d"
        },
        {
          "ID": 88,
          "email": "Ayanlekeyemi10@yahoo.com",
          "fullname": "Olayemi Ayanleke Mathew",
          "XeroContactID": "6d373e01-b4a6-41d7-94fd-17acbaf47a89"
        },
        {
          "ID": 89,
          "email": "ayanyinka@gmail.com",
          "fullname": "Ayanyinka Ayanlowo",
          "XeroContactID": "2823dc29-f81a-49b8-913f-d37a6950390d"
        },
        {
          "ID": 90,
          "email": "ayoh9@yahoo.com",
          "fullname": "Akinyinka Ayobami Tosin",
          "XeroContactID": "c780e702-0791-480a-ad70-100ccc364983"
        },
        {
          "ID": 91,
          "email": "ayobimpeomisore@gmail.com",
          "fullname": "Omisore Ayobimpe Oluwakemi",
          "XeroContactID": "0ab02fdf-63b6-4166-a9b8-6f735883a09e"
        },
        {
          "ID": 92,
          "email": "tinubuayodeji645@gmail.com",
          "fullname": "Tinubu Ayodeji",
          "XeroContactID": "6c1978e0-8764-4c5f-bf03-88ac6eabbbb8"
        },
        {
          "ID": 93,
          "email": "ayomagbemifatima@yahoo.com",
          "fullname": "Fatima Ayomagbemi Patricia",
          "XeroContactID": "7bf21220-c46a-4a3d-ae33-c7a646e9fba9"
        },
        {
          "ID": 94,
          "email": "bmoses@atbtechsoft.com",
          "fullname": "Moses Babalola Opeyemi",
          "XeroContactID": "33469bc9-46b3-4a85-be00-2872db3435d3"
        },
        {
          "ID": 95,
          "email": "it.badejo@gmail.com",
          "fullname": "Ibrahim Badejo Badejo",
          "XeroContactID": "e5c3edd3-b073-47e9-90e4-afb9bb777ff2"
        },
        {
          "ID": 96,
          "email": "alibakare3@gmail.com",
          "fullname": "Ali Bakare",
          "XeroContactID": "21c70698-23e9-4180-b2ec-0343efe4bab7"
        },
        {
          "ID": 97,
          "email": "olanrewajubakinson@gmail.com",
          "fullname": "iplan Consults Nigeria",
          "XeroContactID": "0516e135-0a57-462a-a026-a6122edcddc7"
        },
        {
          "ID": 99,
          "email": "balogun.azeez@stanbicibtc.com",
          "fullname": "Azeez Balogun Adewale",
          "XeroContactID": "889316bf-381d-4d82-8449-5397369bd110"
        },
        {
          "ID": 100,
          "email": "oluwasijibomiabalogun@gmail.com",
          "fullname": "Sijibomi Balogun Ayodeji",
          "XeroContactID": "3c73334e-c17b-469d-a93a-b76a36e74598"
        },
        {
          "ID": 101,
          "email": "remilekun.balogun@imperialmortgagebank.com",
          "fullname": "Remilekun Balogun",
          "XeroContactID": "068d7ffc-cf08-4609-8b94-b920f9740224"
        },
        {
          "ID": 102,
          "email": "venvy142k@yahoo.com",
          "fullname": "Odumosu Bamidele Olatunde",
          "XeroContactID": "6e423f2c-2e96-4a20-ab87-5ad99ef16106"
        },
        {
          "ID": 103,
          "email": "bamkenny2014@gmail.com",
          "fullname": "Kayode Bamisiaye Kehinde",
          "XeroContactID": "02364447-9002-4f6a-b7c2-71844dc40160"
        },
        {
          "ID": 104,
          "email": "obaoku@ecobank.com",
          "fullname": "Seyi Baoku Abiodun",
          "XeroContactID": "40b97f12-d552-4e0e-989e-dafe8d038547"
        },
        {
          "ID": 105,
          "email": "jbello@ecobank.com",
          "fullname": "Justina Bello",
          "XeroContactID": "80edf72a-e9fc-4d13-b24d-32503a4d59d3"
        },
        {
          "ID": 106,
          "email": "ibrahimkbonet@gmail.com",
          "fullname": "Ibrahim Bonet bonet",
          "XeroContactID": "2fc0e3d0-c193-44bc-a7f1-2cfb349d9fdc"
        },
        {
          "ID": 107,
          "email": "bbrisibe@ecobank.com",
          "fullname": "Boboye Brisibe",
          "XeroContactID": "29558a7c-687e-4636-b41a-8601654c89b1"
        },
        {
          "ID": 108,
          "email": "ndukwechinedu2@gmail.com",
          "fullname": "Ndukwe Cajetan Chinedu",
          "XeroContactID": "e983d1f1-66c9-4e67-a846-72833d5f39cd"
        },
        {
          "ID": 109,
          "email": "chudi.okafor@vacctechnical.com",
          "fullname": "Okafor Charles",
          "XeroContactID": "f958c224-0094-4c96-9720-e3082cbd0626"
        },
        {
          "ID": 110,
          "email": "charles.ojei@hybrgroup.net",
          "fullname": "Ojei Charles charles",
          "XeroContactID": "5d383721-b080-44aa-adb4-8ce11a1947c3"
        },
        {
          "ID": 111,
          "email": "coeaziauto@yahoo.com",
          "fullname": "Abolo Charles Ejikeme",
          "XeroContactID": "127e7531-260b-4548-97ef-56c7aaf26912"
        },
        {
          "ID": 112,
          "email": "Nnedichidoka@keystonebankng.com",
          "fullname": "Nnedi Chidoka Keziah",
          "XeroContactID": "c480322b-175b-47f0-a7de-f7e5dc66a86e"
        },
        {
          "ID": 113,
          "email": "chinekwu.chikwelugo@firstbanknigeria.com",
          "fullname": "Chinekwu Chikwelugo",
          "XeroContactID": "aba37650-dcbb-410c-82da-cee54492ce8c"
        },
        {
          "ID": 114,
          "email": "chimaonyeoziri4@gmail.com",
          "fullname": "Ohaeri Chima",
          "XeroContactID": "dbf436f9-4d28-49e6-abb7-dec1b85bf1f9"
        },
        {
          "ID": 115,
          "email": "Uche.Chikwendu@ubagroup.com",
          "fullname": "Uche Chiwendu",
          "XeroContactID": "72579f46-6950-4180-b94b-7810e6d1d9b5"
        },
        {
          "ID": 116,
          "email": "ilochukwudimartin@yahoo.com",
          "fullname": "Ilo Chukwudi",
          "XeroContactID": "59ff400a-c4ee-4d34-be8e-4b21f6062072"
        },
        {
          "ID": 117,
          "email": "ccivonye@gmail.com",
          "fullname": "Ivonye Chukwunonye",
          "XeroContactID": "6dea80c0-e1ad-4562-af61-6a1a851b8884"
        },
        {
          "ID": 118,
          "email": "benedict.chukwurah@2hbng.com",
          "fullname": "Benedict Chukwurah Chukwurah",
          "XeroContactID": "0608f32d-8c39-4832-a472-562238680acb"
        },
        {
          "ID": 119,
          "email": "k5dada@yahoo.com",
          "fullname": "Kehinde Dada Adegoke",
          "XeroContactID": "e6bbe93f-d3ab-415f-bf1c-6988045185ba"
        },
        {
          "ID": 120,
          "email": "matt4life@gmail.com",
          "fullname": "Wonder Dagbame Joseph",
          "XeroContactID": "b6231872-8b60-4868-aa68-128463551cbc"
        },
        {
          "ID": 121,
          "email": "david.ogunkoya@yahoo.com",
          "fullname": "Ogunkoya David olabode",
          "XeroContactID": "86d7db64-e501-4435-996c-433384c5d599"
        },
        {
          "ID": 122,
          "email": "zoeemmaikata@gmail.com",
          "fullname": "Emma-Ikata Diseph",
          "XeroContactID": "5c7ff494-3510-49a9-89e0-8ee13aa0cfad"
        },
        {
          "ID": 123,
          "email": "joseph.dokai@gloworld.com",
          "fullname": "Joseph Dokai Chikwudi",
          "XeroContactID": "8e788398-1bc1-4285-83fa-33811ec55ec3"
        },
        {
          "ID": 124,
          "email": "ebe803@gmail.com",
          "fullname": "Richard Ebe Ogah",
          "XeroContactID": "214904f5-9d0f-4758-b2b9-7154a4c8b71b"
        },
        {
          "ID": 125,
          "email": "giftebi@gmail.com",
          "fullname": "Gift Ebi Okwuaku",
          "XeroContactID": "b043ad8f-0704-4606-a854-71badd851f7c"
        },
        {
          "ID": 126,
          "email": "ivieimobhio@yahoo.com",
          "fullname": "Ivie Edobor Angela",
          "XeroContactID": "1a126a56-3cdd-45ab-a8a1-320909e04633"
        },
        {
          "ID": 127,
          "email": "egbatramon@yahoo.co.uk",
          "fullname": "Hilary Egbah",
          "XeroContactID": "bd9f44ea-ae31-4789-aaca-7416ac06bfa6"
        },
        {
          "ID": 128,
          "email": "kelechi.ehirim@outlook.com",
          "fullname": "Kelechi Ehirim Raphael",
          "XeroContactID": "1bd73563-9b32-4a60-b1d8-aacb3d1807ab"
        },
        {
          "ID": 129,
          "email": "ejesei@yahoo.com",
          "fullname": "Godfrey Ejesei",
          "XeroContactID": "38302372-92e4-4bd5-b05f-ea9e8dd598d4"
        },
        {
          "ID": 130,
          "email": "tekong@providusbank.com",
          "fullname": "Theresa Ekong",
          "XeroContactID": "24067bb8-6385-47d7-9a55-1375cf998fdb"
        },
        {
          "ID": 131,
          "email": "christopherekwuye@keystonebankng.com",
          "fullname": "Christopher Ekwuye ekwuye",
          "XeroContactID": "947d5b04-7f9b-4965-a0a3-920dcc12f832"
        },
        {
          "ID": 132,
          "email": "oluwaseun.eluyefa@stanbicibtc.com",
          "fullname": "Oluwaseun Eluyefa olaitan",
          "XeroContactID": "68857b67-0daa-422f-857e-2d55ce5ecb5e"
        },
        {
          "ID": 133,
          "email": "enobong.amiang@shell.com",
          "fullname": "Amiang Enobong Sunday",
          "XeroContactID": "049083c2-d1c8-404d-8912-3b0e35808f93"
        },
        {
          "ID": 134,
          "email": "euchariaenyi@gmail.com",
          "fullname": "Eucharia Enyinna Blessing",
          "XeroContactID": "948cb8da-cdc0-4333-9a86-34063fae636a"
        },
        {
          "ID": 135,
          "email": "osarume.e.erebor@firstbanknigeria.com",
          "fullname": "Osarume Erebor",
          "XeroContactID": "086cd4de-05c9-4784-8c97-0df25c2c70fc"
        },
        {
          "ID": 136,
          "email": "anehita_1@yahoo.com",
          "fullname": "Anehita Erediauwa",
          "XeroContactID": "64db71dd-c5f0-40ab-84b5-9d9dcadcb292"
        },
        {
          "ID": 137,
          "email": "henry.erigha@cwg-plc.com",
          "fullname": "Henry Erigha Tieverrhe",
          "XeroContactID": "2fb6bd54-143b-4fc3-806e-29b2f00c850a"
        },
        {
          "ID": 138,
          "email": "vincenteromosele@yahoo.com",
          "fullname": "Vincent Eromosele",
          "XeroContactID": "ad25e808-6723-4a55-a5d4-07d89d453ac0"
        },
        {
          "ID": 139,
          "email": "solomon.eruru@stanbicibtc.com",
          "fullname": "Solomon Eruru Eruru",
          "XeroContactID": "ddb381f9-b71d-4bac-a176-03d6cc5b097e"
        },
        {
          "ID": 140,
          "email": "arith.esin@hbng.com",
          "fullname": "Arith Esin Audrey",
          "XeroContactID": "e68b9d6d-d066-42f1-9cfc-0e721c3471c1"
        },
        {
          "ID": 141,
          "email": "gigglebees2014@gmail.com",
          "fullname": "Omowunmi Ewebiyi Ajoke",
          "XeroContactID": "05fb26fc-d00b-4513-aacc-0b607f6c9a6e"
        },
        {
          "ID": 142,
          "email": "wonderwomaneno@gmail.com",
          "fullname": "Enobong Ezekiel Lauretta",
          "XeroContactID": "51a78104-8b3c-499c-a4dd-d37f74ba37f1"
        },
        {
          "ID": 143,
          "email": "regina.ezike@ubagroup.com",
          "fullname": "Regina Ezike Chinonye",
          "XeroContactID": "c559aa99-b061-4cb5-83c9-506b6f79c27e"
        },
        {
          "ID": 144,
          "email": "akinwale.fademi@asoplc.com",
          "fullname": "Akinwale Fademi",
          "XeroContactID": "d6d5b456-aabc-498b-b82f-70f457935043"
        },
        {
          "ID": 145,
          "email": "sanmifadeyibi@yahoo.com",
          "fullname": "Sanmi Fadeyibi Tunde",
          "XeroContactID": "836a446e-9134-4df3-894a-eafd2ab4259b"
        },
        {
          "ID": 146,
          "email": "kikelomo.falade@yahoo.com",
          "fullname": "Kikelomo Falade Adeola",
          "XeroContactID": "e31db1ff-afd0-4332-8ce7-4e298bf2d838"
        },
        {
          "ID": 147,
          "email": "faffy187@yahoo.co.uk",
          "fullname": "Lanre Fafure",
          "XeroContactID": "5345fcb5-dbfd-4ca6-980f-0b5dfca49ffd"
        },
        {
          "ID": 148,
          "email": "folarin.olufemi@hotmail.com",
          "fullname": "Femi Folarin folarin",
          "XeroContactID": "215b8e69-0cb3-4dc4-9c67-68af3703e545"
        },
        {
          "ID": 149,
          "email": "bimfol23@gmail.com",
          "fullname": "Abimbola Folorunsho Morenike",
          "XeroContactID": "c050b413-f6de-4407-90ee-a141f4c885ca"
        },
        {
          "ID": 150,
          "email": "Akofrank@gmail.com",
          "fullname": "Akokono Frank",
          "XeroContactID": "513d4c14-bb51-435f-9eec-9dc571c68c16"
        },
        {
          "ID": 151,
          "email": "victoriafriday@keystonebankng.com",
          "fullname": "Victoria Friday friday",
          "XeroContactID": "3ca8ce2d-810f-48a2-9806-ba7a43aed60a"
        },
        {
          "ID": 152,
          "email": "olufuntomabeweje@keystonebankng.com",
          "fullname": "Mabeweje Funto funto",
          "XeroContactID": "d53d93c6-8c09-4d72-9baf-a45cd7376100"
        },
        {
          "ID": 153,
          "email": "pragma002.solutions@yahoo.com",
          "fullname": "Enitan Garbrah John",
          "XeroContactID": "6b1ddf3a-e6e3-40a6-8d65-e98aa32a4e07"
        },
        {
          "ID": 154,
          "email": "gbolahanajasa@gmail.com",
          "fullname": "Ajasa Gbolahan Ademola",
          "XeroContactID": "0822f875-9d74-479a-bc60-0e2c1172e970"
        },
        {
          "ID": 155,
          "email": "phillipsgideon@gmail.com",
          "fullname": "Phillips Gideon",
          "XeroContactID": "20994d74-ca3a-4590-928c-58777edcedea"
        },
        {
          "ID": 156,
          "email": "henry.deckon1980@gmail.com",
          "fullname": "Deckon Henry",
          "XeroContactID": "e3971fcb-65cd-430a-b033-9a7fe7a8b42c"
        },
        {
          "ID": 157,
          "email": "margaret.hughes@gloworld.com",
          "fullname": "Margaret Hughes Olabisi",
          "XeroContactID": "36ebd36c-08aa-4e61-b85e-7c037c7bda0a"
        },
        {
          "ID": 158,
          "email": "oludotun.ibikunle@stanbicibtc.com",
          "fullname": "Oludotun Ibikunle Olubangbe",
          "XeroContactID": "000df4aa-9092-455d-b8f2-dd24a0ca1fdd"
        },
        {
          "ID": 159,
          "email": "toyin.ibinaiye@gmail.com",
          "fullname": "Oluwatoyin Ibinaiye Christiana",
          "XeroContactID": "e1f0d724-c7d4-4043-bc3e-bbd45d029d31"
        },
        {
          "ID": 160,
          "email": "hassan.Ibrahim@yahoo.com",
          "fullname": "Hassan Ibrahim",
          "XeroContactID": "cb90c961-fac6-4b93-b6f5-216889a0c2e7"
        },
        {
          "ID": 161,
          "email": "idaresitokon@gmail.com",
          "fullname": "Okon Idaresit",
          "XeroContactID": "12851eca-0f60-4219-be5e-3ee57826ae22"
        },
        {
          "ID": 162,
          "email": "olufunkealice.idowu@accessbankplc.com",
          "fullname": "Olufunke Idowu Alice",
          "XeroContactID": "565042e5-4778-4fc7-93c3-13840f37f0d5"
        },
        {
          "ID": 163,
          "email": "adebayoaidowu@gmail.com",
          "fullname": "Adebayo Idowu",
          "XeroContactID": "fa74e08e-10f4-46b9-b0d3-6abb72d282cb"
        },
        {
          "ID": 164,
          "email": "olakunbi.njoku@firstbanknigeria.com",
          "fullname": "Njoku Ifeoluwa Olakunbi",
          "XeroContactID": "2cbdccb6-14a2-4660-99c5-86df2509d7c4"
        },
        {
          "ID": 165,
          "email": "cifode@tsllimited.com",
          "fullname": "Christopher Ifode Oghenevu",
          "XeroContactID": "9a225eee-0920-44c3-ba65-4a640a496542"
        },
        {
          "ID": 166,
          "email": "ifymatt@gmail.com",
          "fullname": "Ifeanyi Ihebom Matthew",
          "XeroContactID": "9b0b70f7-789c-4040-bb4e-3e69133e6264"
        },
        {
          "ID": 167,
          "email": "okeyihedi@yahoo.com",
          "fullname": "Okechukwu Ihedi",
          "XeroContactID": "67daec62-70a5-47f1-a0c3-8ed7fa3508a8"
        },
        {
          "ID": 168,
          "email": "ayodele.james@gmail.com",
          "fullname": "James Ijamilusi Ayodele",
          "XeroContactID": "b6de3737-11a0-4b95-9c76-01cf13dc1ec3"
        },
        {
          "ID": 169,
          "email": "ericikeya@gmail.com",
          "fullname": "Eric Ikeya Uchenna",
          "XeroContactID": "fb579908-05c1-447d-a8c5-228212d17105"
        },
        {
          "ID": 170,
          "email": "peaceikharo@unionbankng.com",
          "fullname": "Peace Ikharo",
          "XeroContactID": "73f3438c-7d06-40c7-9dfa-36a6732d06a3"
        },
        {
          "ID": 171,
          "email": "adeshina4all@gmail.com",
          "fullname": "Adeshina Iliasu Raimi",
          "XeroContactID": "0befc9c2-663a-4e55-83cc-52332ca150b1"
        },
        {
          "ID": 172,
          "email": "osiboi@gmail.com",
          "fullname": "Henry Imhoitsike Osibo",
          "XeroContactID": "ac0f53e7-5349-4f98-8c24-424f3984d71e"
        },
        {
          "ID": 173,
          "email": "isholahaphyz1@yahoo.com",
          "fullname": "Afeez ISHOLA",
          "XeroContactID": "75d88b82-83f4-49a8-87af-6709de6a5100"
        },
        {
          "ID": 174,
          "email": "isiaka.lasisi@firstbanknigeria.com",
          "fullname": "Lasisi Isiaka",
          "XeroContactID": "b5f7d65f-0292-44cd-97f5-5b0242b6ad9e"
        },
        {
          "ID": 175,
          "email": "hookisi4john@yahoo.com",
          "fullname": "John Isidahomen",
          "XeroContactID": "9514a4e5-cb62-414c-9559-2a028d6ad59a"
        },
        {
          "ID": 176,
          "email": "oisijola@atbtechsoft.com",
          "fullname": "Olaide Isijola Ann",
          "XeroContactID": "5fd1a7fb-f11b-476b-9b14-de826c73f2ca"
        },
        {
          "ID": 177,
          "email": "aziakponoitivegoddey2@gmail.com",
          "fullname": "Goddey Itive Aziakpono",
          "XeroContactID": "c17379cc-7ed1-45cf-87d6-2913f4543e3f"
        },
        {
          "ID": 178,
          "email": "bush4u2envy@outlook.com",
          "fullname": "Oluwatosin Iyiola Emmanuel",
          "XeroContactID": "432d94e2-a6be-4e86-b197-837c534b786e"
        },
        {
          "ID": 179,
          "email": "hamilton.iyoha@oracle.com",
          "fullname": "Hamilton Iyoha",
          "XeroContactID": "4cded1ca-4bd1-48e7-8a88-cc12a8bd08d6"
        },
        {
          "ID": 180,
          "email": "kucjackson@gmail.com",
          "fullname": "Uche Jackson Kingsley",
          "XeroContactID": "2ea10737-b2cc-4b25-b176-bb4d0e0fc751"
        },
        {
          "ID": 181,
          "email": "solaonye@gmail.com",
          "fullname": "Francis Jagunmolu Olusegun",
          "XeroContactID": "84eb0f97-ab3a-4ccb-96ed-2660602a666a"
        },
        {
          "ID": 182,
          "email": "abimbola_jaiyesimi@yahoo.com",
          "fullname": "Abimbola Jaiyesimi Olaniyi",
          "XeroContactID": "cf6ff591-31cc-4421-bfc2-3952aaa645c6"
        },
        {
          "ID": 183,
          "email": "ocheinehi2002@yahoo.com",
          "fullname": "Ocheinehi John-oiyole",
          "XeroContactID": "00964f94-01d3-48c2-bc1c-b71908d656a2"
        },
        {
          "ID": 184,
          "email": "joicokeus@gmail.com",
          "fullname": "Akpojaro Joy Coker",
          "XeroContactID": "38c193e9-d3b8-4ad2-b063-e6a89fa39ddb"
        },
        {
          "ID": 185,
          "email": "adebayo.juba@ng.airtel.com",
          "fullname": "Adebayo Juba Adekunle",
          "XeroContactID": "9a2cc95a-7170-464b-8cfc-7f63c5dc376c"
        },
        {
          "ID": 186,
          "email": "ifeanyikade@gmail.com",
          "fullname": "Ifeanyi Kade",
          "XeroContactID": "4a630365-a274-4c8b-a847-2be3522fcb0e"
        },
        {
          "ID": 187,
          "email": "Sergeassik@yahoo.fr",
          "fullname": "Aka Kassi",
          "XeroContactID": "5a3d00e5-6c6d-4aa6-b5c4-1a188da03dd6"
        },
        {
          "ID": 188,
          "email": "dayo.komolafe@imperialmortgagebank.com",
          "fullname": "Temidayo Komolafe",
          "XeroContactID": "c80f9530-d5b4-46b8-8d84-c0285ab9c319"
        },
        {
          "ID": 189,
          "email": "kosobamejidavid@gtbank.com",
          "fullname": "Balogun Kosobameji David",
          "XeroContactID": "c22895d1-60c8-4be5-8ea1-31ea9c5966f0"
        },
        {
          "ID": 190,
          "email": "ekubiangha@gmail.com",
          "fullname": "Edem Kubiangha",
          "XeroContactID": "e6b50c59-0bd7-441c-ab48-4355b7f753f0"
        },
        {
          "ID": 191,
          "email": "lawson.omiunu@outlook.com",
          "fullname": "Omiunu Lawson",
          "XeroContactID": "8e788398-1bc1-4285-83fa-33811ec55ec3"
        },
        {
          "ID": 192,
          "email": "olawuyi@providusbank.com",
          "fullname": "Olayinka Lawuyi Oyeleye",
          "XeroContactID": "a1c07453-1dab-4f5e-9465-92491cc00ef7"
        },
        {
          "ID": 193,
          "email": "tolulemo@gmail.com",
          "fullname": "Tolulope Lemo owolabi",
          "XeroContactID": "a3123a90-a919-44ed-a77c-087378f8a2e1"
        },
        {
          "ID": 194,
          "email": "levicorporate@yahoo.com",
          "fullname": "Ibimiebo Levi Sam",
          "XeroContactID": "50800dbf-7c46-491a-8fb9-b65406984ff5"
        },
        {
          "ID": 196,
          "email": "oolonge@unionbankng.com",
          "fullname": "Omobolanle Longe",
          "XeroContactID": "7b11a45c-b635-4f6a-867b-2768b77b7d75"
        },
        {
          "ID": 197,
          "email": "mayordwise1@yahoo.co.uk",
          "fullname": "Ayotola Mayor Ayodeji",
          "XeroContactID": "4bb04f95-a56b-476b-b80f-5f5a02b12d56"
        },
        {
          "ID": 198,
          "email": "c-mbah@leadway.com",
          "fullname": "Chidozie Mbah Ejike",
          "XeroContactID": "f06bd7b1-ae2d-4d64-8b58-e8db788d5822"
        },
        {
          "ID": 199,
          "email": "marius.mesaiyete@gloworld.com",
          "fullname": "Olufemi Mesaiyete",
          "XeroContactID": "6d3b8d3e-a81c-4a69-9d49-34cda3e34070"
        },
        {
          "ID": 200,
          "email": "chioma.mmeka@gloworld.com",
          "fullname": "Chioma Mmeka Nneka",
          "XeroContactID": "62d94ce8-a807-4fb7-a5cf-632caf88cd97"
        },
        {
          "ID": 201,
          "email": "salamatusuleiman15@yahoo.com",
          "fullname": "Salamatu Muhammed suleiman",
          "XeroContactID": "cf14dd74-73e1-4f2d-bbc9-4bed5cb68659"
        },
        {
          "ID": 202,
          "email": "chuksndubisi@yahoo.com",
          "fullname": "Chiemela Ndubuisi Ndubuisi",
          "XeroContactID": "9f6e4da6-f1e7-4573-8b47-4bd92249a59e"
        },
        {
          "ID": 203,
          "email": "ngozibruce@keystonebankng.com",
          "fullname": "Bruce Ngozi",
          "XeroContactID": "c746bf01-bbbf-4761-937a-3f4d77a697d1"
        },
        {
          "ID": 204,
          "email": "vtnjoku@gmail.com",
          "fullname": "Vivian Njoku Ogochukwu",
          "XeroContactID": "4f5ebafe-416e-4eee-9422-1fe08f53a0b5"
        },
        {
          "ID": 205,
          "email": "onyemsco@yahoo.com",
          "fullname": "Onyemauwa Njoku Jonah",
          "XeroContactID": "984cbd79-5bec-4966-ac30-0aebe54a970c"
        },
        {
          "ID": 206,
          "email": "nnadi.emeka@asoplc.com",
          "fullname": "Emeka Nnadi",
          "XeroContactID": "6cf107a8-e40c-4614-82df-0828f3f16400"
        },
        {
          "ID": 208,
          "email": "anthonynwaokobia@keystonebankng.com",
          "fullname": "Anthony Nwaokobia",
          "XeroContactID": "66cd039c-0ac6-4d41-8df7-0945b7d6cc00"
        },
        {
          "ID": 209,
          "email": "ulona.nzeh2011@yahoo.com",
          "fullname": "Uloma Nzeh Ebere",
          "XeroContactID": "e4d9ab80-82a6-4353-a816-093816ee27c7"
        },
        {
          "ID": 210,
          "email": "osaheni1612@yahoo.com",
          "fullname": "Osaheni Obazee Obazee",
          "XeroContactID": "b2cc0144-aed3-4ef8-8fa6-473ea2934e9f"
        },
        {
          "ID": 211,
          "email": "erniesno@gmail.com",
          "fullname": "Ernest Obi Ndidi",
          "XeroContactID": "23b6a1b0-9cc5-4ff0-8456-160470a3ca2c"
        },
        {
          "ID": 212,
          "email": "love_ogor@yahoo.com",
          "fullname": "Ashleigh Obielumani Nwabuogor",
          "XeroContactID": "37dcf80a-2654-4388-9de8-f9453ca5736b"
        },
        {
          "ID": 213,
          "email": "akinwunmiobisan@gmail.com",
          "fullname": "Akinwunmi Obisan",
          "XeroContactID": "a7f11a49-a8b8-4a7f-a696-a2244bdbf829"
        },
        {
          "ID": 214,
          "email": "james.ocheikwu@stanbicibtc.com",
          "fullname": "James Ocheikwu Ocheikwu",
          "XeroContactID": "1dc4353a-b86b-4908-8df8-3e2eafd0d549"
        },
        {
          "ID": 215,
          "email": "e-ochonogor@leadway.com",
          "fullname": "Ernest Ochonogor",
          "XeroContactID": "fb97b617-0d1c-4905-8680-243313d43bd0"
        },
        {
          "ID": 216,
          "email": "abdulgafar.0debe@yahoo.co.uk",
          "fullname": "Abdulgafar Odebe Ohiorenoye",
          "XeroContactID": "709e8544-87c8-4222-b7ec-3b0d85e3cf48"
        },
        {
          "ID": 217,
          "email": "bayo.odebode@stanbicibtc.com",
          "fullname": "Bayo Odebode Abiodun",
          "XeroContactID": "a4e79c5c-fd83-4a2d-ae08-3a2882d49a4d"
        },
        {
          "ID": 218,
          "email": "juliusoodeniyi@yahoo.com",
          "fullname": "Julius Odeniyi Oyebanji",
          "XeroContactID": "f300f68b-2140-4f8d-b7af-31d998051f84"
        },
        {
          "ID": 219,
          "email": "fodetoyan@atbtechsoft.com",
          "fullname": "Oluwafunmilayo Odetoyan Oluwakemi",
          "XeroContactID": "3bf3e8e0-39fb-4c4f-a0c7-1fa4d2db0e1b"
        },
        {
          "ID": 220,
          "email": "mide_odetunde@hotmail.com",
          "fullname": "Aramide Odetunde",
          "XeroContactID": "bca6ae53-7213-43d2-9da4-a4d6e7fa2828"
        },
        {
          "ID": 221,
          "email": "odionanthony4@yahoo.com",
          "fullname": "Anthony Odion Oseremhen",
          "XeroContactID": "8383bcfa-adac-4bed-9500-24dd055e5867"
        },
        {
          "ID": 222,
          "email": "nathaniel.oduronbi@afriglobalmedicare.com",
          "fullname": "Nathaniel Oduronbi Oludotun",
          "XeroContactID": "0eeb3c8b-8af5-4442-be08-303508f77390"
        },
        {
          "ID": 223,
          "email": "abiodun.oduwole@fidelitybank.ng",
          "fullname": "Abiodun Oduwole Adebola",
          "XeroContactID": "6052b7d6-72c3-4ba3-91fe-2bab362087f9"
        },
        {
          "ID": 224,
          "email": "oduyoye@gmail.com",
          "fullname": "Oluwafemi Oduyoye Babatunde",
          "XeroContactID": "029436fa-186f-4a79-9a80-32a334aa4cd3"
        },
        {
          "ID": 226,
          "email": "ogunbanwoseun@googlemail.com",
          "fullname": "Oluwaseun Ogunbanwo Oluwadamilare",
          "XeroContactID": "a9b4e703-c4a0-4a29-8d65-5ef419e208d5"
        },
        {
          "ID": 227,
          "email": "iogundiran@honeywellflour.com",
          "fullname": "Israel Ogundiran Babatunde",
          "XeroContactID": "e25c4096-f73a-4cd2-b568-435a44cc6dd8"
        },
        {
          "ID": 228,
          "email": "sbogunleye@gmail.com",
          "fullname": "Adebunmi Ogunleye",
          "XeroContactID": "02a1415a-6d61-446c-a4d9-e59a6464c1c0"
        },
        {
          "ID": 229,
          "email": "esogunremi@yahoo.com",
          "fullname": "Emmanuel Ogunremi Sunday",
          "XeroContactID": "52cd12fd-0dc5-4e08-91dd-48ce17f2a7db"
        },
        {
          "ID": 230,
          "email": "rufus.oguntoye@firstbanknigeria.com",
          "fullname": "Rufus Oguntoye",
          "XeroContactID": "51bef4b8-5472-4633-a8e8-2fbf62813dec"
        },
        {
          "ID": 231,
          "email": "olufemi.oguntoyinbo@firstbanknigeria.com",
          "fullname": "Sunday Oguntoyinbo",
          "XeroContactID": "0e3d994e-c752-4959-93b1-55589355397a"
        },
        {
          "ID": 232,
          "email": "oikechukwu@cititrustgroup.com",
          "fullname": "Ikechukwu Ojimaga",
          "XeroContactID": "ce5b607c-e468-49cf-a3d6-ddf671fee6ae"
        },
        {
          "ID": 233,
          "email": "Titilope.ojo@ubagroup.com",
          "fullname": "Titilope Ojo Sarah",
          "XeroContactID": "0737bf43-ceac-4eb8-a92e-a82c05521b10"
        },
        {
          "ID": 234,
          "email": "pelumi4riches@gmail.com",
          "fullname": "Oluwatosin Ojo Pelumi",
          "XeroContactID": "4abc4701-561f-42d0-b249-83b7c57177c9"
        },
        {
          "ID": 235,
          "email": "Augusta.okafor@fidelitybank.ng",
          "fullname": "Augusta Okafor Enwilim",
          "XeroContactID": "980294d7-f4e3-41c5-860d-637dc1bb8007"
        },
        {
          "ID": 236,
          "email": "cokali@s3-sys.com",
          "fullname": "Chigozie Okali Damian",
          "XeroContactID": "2099bb7c-2226-403c-89ef-aebd71ace1bd"
        },
        {
          "ID": 237,
          "email": "isaac.okanlawon@friestandcampina.com",
          "fullname": "Isaac Okanlawon",
          "XeroContactID": "ea4a3a67-1f2e-4ee0-8cfe-56f79097e05d"
        },
        {
          "ID": 238,
          "email": "gokebugwu@diamondbank.com",
          "fullname": "Gospel Okebugwu Eleazer",
          "XeroContactID": "4a3fbc9d-ac66-40ee-bfbc-5a24d42873ea"
        },
        {
          "ID": 239,
          "email": "chimezieokeke@live.com",
          "fullname": "Chimezie Okeke",
          "XeroContactID": "94865a69-fefd-4ce9-9e1e-1c5be56ef0a6"
        },
        {
          "ID": 240,
          "email": "chukwuemekaokengwu@keystonebankng.com",
          "fullname": "Chukwuemeka Okengwu",
          "XeroContactID": "666f9e20-af99-4532-995f-a901c9bbb14e"
        },
        {
          "ID": 241,
          "email": "ookeowo@providusbank.com",
          "fullname": "Olalekan Okeowo Samuel",
          "XeroContactID": "e34d76cd-fb74-497e-8a1d-801958820ebf"
        },
        {
          "ID": 242,
          "email": "ruona88@gmail.com",
          "fullname": "Ejovi Okiekpakpo Ruona",
          "XeroContactID": "8e01d1f2-5126-4953-9457-df372ae1eec7"
        },
        {
          "ID": 243,
          "email": "great_ideal@gmail.com",
          "fullname": "Donald Okunbor Igbineweka",
          "XeroContactID": "5c1b3413-5cb9-43dd-8030-5e1172a16a40"
        },
        {
          "ID": 244,
          "email": "okwara_ukay@yahoo.com",
          "fullname": "Ukaike Okwara",
          "XeroContactID": "a256c4c1-98a1-4eb1-9e41-bc028534fa5b"
        },
        {
          "ID": 245,
          "email": "emeka.okwor@asoplc.com",
          "fullname": "Emeka Okwor",
          "XeroContactID": "cff73364-774b-44e4-95dc-e0ffe6b5ee35"
        },
        {
          "ID": 246,
          "email": "dskymit@yahoo.com",
          "fullname": "Popoola Olabisi",
          "XeroContactID": "2e8a1d55-ace4-4186-a30c-260f47a2291a"
        },
        {
          "ID": 247,
          "email": "oladejo.ayobami@gmail.com",
          "fullname": "Ayobami Oladejo Gbemiduro",
          "XeroContactID": "933ea8ca-caf6-47a9-aa99-1b7dd4230ed2"
        },
        {
          "ID": 248,
          "email": "oyebowale.oladejo@abujaelectricity.com",
          "fullname": "Oyebowale Oladejo Nojeem",
          "XeroContactID": "e5817cfc-fc31-449e-b46f-ebba5c3e7976"
        },
        {
          "ID": 249,
          "email": "oladele.balogun@stanbicibtc.com",
          "fullname": "Balogun Oladele",
          "XeroContactID": "9cf9f530-1b6f-4d84-bff1-27fe38509450"
        },
        {
          "ID": 250,
          "email": "folagbad@gmail.com",
          "fullname": "Afolabi Oladipupo Jokodola",
          "XeroContactID": "bc21a298-ad91-450f-a77a-3666d10dadfb"
        },
        {
          "ID": 253,
          "email": "ayodejiolamideayoola@gmail.com",
          "fullname": "Ayodeji Olamide Ayoola",
          "XeroContactID": "e358abc4-8763-4329-bfde-ce4f7d15f1ca"
        },
        {
          "ID": 254,
          "email": "lakinwole@gmail.com",
          "fullname": "Akinwole Olanrewaju",
          "XeroContactID": "c9edeca0-9951-4dc9-b9a2-9e17c81ae62b"
        },
        {
          "ID": 255,
          "email": "olasupo.ashiru@aviatnet.com",
          "fullname": "Ashiru Olasupo Olasupo",
          "XeroContactID": "4ee39033-abec-479b-aa09-69da03a7fb2b"
        },
        {
          "ID": 256,
          "email": "oajanaku@atbtechsoft.com",
          "fullname": "Ajanaku Olatunji Ajanaku",
          "XeroContactID": "2ff5a525-2339-4476-81be-fc2b974ce87a"
        },
        {
          "ID": 258,
          "email": "laiolatunji@yahoo.com",
          "fullname": "Olatunji Olayiwola Olayiwola",
          "XeroContactID": "77168d49-933b-46c5-8ca5-c67eaacc9eb6"
        },
        {
          "ID": 259,
          "email": "ohughes@providusbank.com",
          "fullname": "Oyeyiga Ololade Hughes",
          "XeroContactID": "c0eaf49e-2fb6-4b11-9fc5-c405c3d1da54"
        },
        {
          "ID": 260,
          "email": "abayomi.olomu@gmail.com",
          "fullname": "Abayomi Olomu Oladayo",
          "XeroContactID": "0294894b-6a43-49c3-b8ea-389406eb4bc3"
        },
        {
          "ID": 261,
          "email": "Charles.oloruntoba@softwaregroup.com",
          "fullname": "Charles Oloruntoba",
          "XeroContactID": "165aaee2-c7b7-46da-bb91-91d862988cbc"
        },
        {
          "ID": 262,
          "email": "akeem.olowogbendu@gmail.com",
          "fullname": "Akeem Olowogbendu Kunle",
          "XeroContactID": "abd7c43d-9551-46e4-b710-83406b22d641"
        },
        {
          "ID": 263,
          "email": "olubanjo_gabrielshina@yahoo.com",
          "fullname": "Shina Olubanjo Babatunde",
          "XeroContactID": "336e4f75-6a70-46cd-8189-1bebd3f310ad"
        },
        {
          "ID": 264,
          "email": "bolubocool@yahoo.com",
          "fullname": "Olubunmi Olude Segun",
          "XeroContactID": "dbc6508f-a5c4-484c-a608-23827c20cbd5"
        },
        {
          "ID": 265,
          "email": "POlugazie@providusbank.com",
          "fullname": "Paul Olugazie",
          "XeroContactID": "58fd14d6-cd6e-4245-a193-96223085ecc0"
        },
        {
          "ID": 266,
          "email": "OOlonade@Honeywellflour.com",
          "fullname": "Olonade Olukayode",
          "XeroContactID": "6f342693-7131-493c-83a7-4d387fe97b9c"
        },
        {
          "ID": 267,
          "email": "holummyde@gmail.com",
          "fullname": "Olalere Olumide Olasunkanmi",
          "XeroContactID": "78e37232-efa9-42b2-860b-afac25ab19cc"
        },
        {
          "ID": 268,
          "email": "sanyaodare@halernydesign.com.ng",
          "fullname": "Sanya Oluwadare Olaoluwa",
          "XeroContactID": "05df90f2-4ab8-460f-b4ba-7db951aa1d72"
        },
        {
          "ID": 269,
          "email": "oopeyemi@atbtechsoft.com",
          "fullname": "Opeyemi Oluwafemi Ojo",
          "XeroContactID": "b46fa5a1-1da9-43f0-bd75-2daa707a75c4"
        },
        {
          "ID": 271,
          "email": "oosundipe@atbtechsoft.com",
          "fullname": "Osundipe Oluwanbe Olaitan",
          "XeroContactID": "06af5189-acff-4e4e-a548-f6295a7ba3b5"
        },
        {
          "ID": 272,
          "email": "shekleftik@yahoo.com",
          "fullname": "Ekeleme Oluwasegun",
          "XeroContactID": "c61e091d-69c8-4ebe-a817-35cbb88a7528"
        },
        {
          "ID": 273,
          "email": "oluwaseyi.fayemi@mtn.com",
          "fullname": "Fayemi Oluwaseyi",
          "XeroContactID": "6e7348c4-9493-419c-8760-6cadcc261817"
        },
        {
          "ID": 274,
          "email": "trippleot@gmail.com",
          "fullname": "Oduguwa Oluyomi Olusegun",
          "XeroContactID": "9a6d4fe5-72ca-422c-a9ab-e650f3696df5"
        },
        {
          "ID": 275,
          "email": "louisazumju@gmail.com",
          "fullname": "Louis Omaike Azumju",
          "XeroContactID": "1ca17621-00a2-4fd0-9817-e92e2921a60e"
        },
        {
          "ID": 276,
          "email": "kencolsystem@gmail.com",
          "fullname": "Kenneth Omeogu Tochukwu",
          "XeroContactID": "7d9bebf7-8470-4c32-ad47-1d1fdc063d61"
        },
        {
          "ID": 278,
          "email": "james.omotosho@accessbankpls.com",
          "fullname": "James Omotosho",
          "XeroContactID": "b794ed39-873a-4a66-95ab-95a4caba841e"
        },
        {
          "ID": 279,
          "email": "aonakoya@ecobank.com",
          "fullname": "Adekunbi Onakoya",
          "XeroContactID": "ae5650c6-aa7c-40b3-a00b-a06593808665"
        },
        {
          "ID": 280,
          "email": "akindeleoni@yahoo.com",
          "fullname": "Olaniran Oni Akindele",
          "XeroContactID": "fb0d3da8-f9ad-482f-810b-b7e0881374c9"
        },
        {
          "ID": 281,
          "email": "kayode.onigbinde@gloworld.com",
          "fullname": "Kayode Onigbinde",
          "XeroContactID": "4f9e74cd-1e6f-4bde-9fdd-943ba58a7eab"
        },
        {
          "ID": 282,
          "email": "phemyonigbinde@gmail.com",
          "fullname": "Femi Onigbinde Emmanuel",
          "XeroContactID": "28ea8fc8-d2ac-4ed4-bedc-2215b10a52d9"
        },
        {
          "ID": 283,
          "email": "aonwuka@providusbank.com",
          "fullname": "Ada Onwuka",
          "XeroContactID": "26ad45f9-5cac-4501-90be-df321221178e"
        },
        {
          "ID": 284,
          "email": "josephineonwuocha@keystonebankng.com",
          "fullname": "Josephine Onwuocha Onwuocha",
          "XeroContactID": "b13a7bfb-91d5-4f95-bc8d-4834052de71c"
        },
        {
          "ID": 285,
          "email": "onyekachiokezie@keystonebankng.com",
          "fullname": "Okezie Onyekachi Ifeanyi",
          "XeroContactID": "20d752fc-8b01-4f28-b215-6194346f1b5a"
        },
        {
          "ID": 287,
          "email": "babatundeosikoya@keystonebankng.com",
          "fullname": "Babatunde Osikoya",
          "XeroContactID": "1f230818-378f-4615-9cd9-ae39e399719c"
        },
        {
          "ID": 288,
          "email": "osita.mmeni@axamansard.com",
          "fullname": "Mmeni Osita Osita",
          "XeroContactID": "f79bcde9-73e7-4b63-81c8-719e8ac3e503"
        },
        {
          "ID": 289,
          "email": "ositadimmao@gmail.com",
          "fullname": "Ugwu Ositadimma",
          "XeroContactID": "30fec4ad-e670-4f42-a323-f4204bbd7b5d"
        },
        {
          "ID": 290,
          "email": "a-otelaja@leadway-pensure.com",
          "fullname": "Kamal Adeoye Otelaja",
          "XeroContactID": "2c0bbbec-8d6a-40ca-b3da-f542e95ba61c"
        },
        {
          "ID": 291,
          "email": "ejiroghene@gmail.com",
          "fullname": "Ejiroghene Otiotio Isreal",
          "XeroContactID": "82ba9684-a957-45ce-b03b-8ff9fd629be9"
        },
        {
          "ID": 292,
          "email": "ovieadasen@gmail.com",
          "fullname": "Adasen Ovie",
          "XeroContactID": "285fec81-8187-449d-8f36-e46b06b4f6cb"
        },
        {
          "ID": 293,
          "email": "supernovab2k@gmail.com",
          "fullname": "Segun Owadokun Akinyemi",
          "XeroContactID": "2cf79a24-e840-4937-833e-9ffd783564a2"
        },
        {
          "ID": 294,
          "email": "aowolabi@providusbank.com",
          "fullname": "Andrew Owolabi",
          "XeroContactID": "13fa1f81-7fb0-40fd-8e22-d8615fe6a6b6"
        },
        {
          "ID": 295,
          "email": "bodowob@gmail.com",
          "fullname": "Olabode Owolabi",
          "XeroContactID": "cb1fd40f-1e90-42e0-88ed-fc7fc4abf67c"
        },
        {
          "ID": 296,
          "email": "waziri.owolowo@stanbicibtc.com",
          "fullname": "Waziri Owolowo Waziri",
          "XeroContactID": "bfd839c8-128f-4f46-8fd7-97b8c1a2e292"
        },
        {
          "ID": 297,
          "email": "oyebola.kolade@asoplc.com",
          "fullname": "Kolade Oyebola Akinbanjo",
          "XeroContactID": "5f0f20cd-06b1-4764-a8c6-5e826064e497"
        },
        {
          "ID": 298,
          "email": "dimscojam@yahoo.com",
          "fullname": "Oladimeji Oyeyemi Olufikayo",
          "XeroContactID": "9c66276b-a59d-4425-83a4-11e1c1b6882b"
        },
        {
          "ID": 299,
          "email": "simonozumba@keystonebankng.com",
          "fullname": "Simon Ozumba Odili",
          "XeroContactID": "a6ce36fb-5e0f-44d6-a093-1162d16ec33e"
        },
        {
          "ID": 301,
          "email": "delordpete40@gmail.com",
          "fullname": "Asika Peter Tochukuwu",
          "XeroContactID": "c40df929-08bb-4c24-a94b-ababbe61e024"
        },
        {
          "ID": 302,
          "email": "peterolugazie@yahoo.com",
          "fullname": "Olugazie Peter Peter",
          "XeroContactID": "10bc53fd-57b4-4582-91d6-43cf68faf541"
        },
        {
          "ID": 303,
          "email": "phillip.adetunji@stanbicibtc.com",
          "fullname": "Adetunji Philips",
          "XeroContactID": "739e77b4-c2a6-4b02-85bf-3c8796593f82"
        },
        {
          "ID": 304,
          "email": "bamidele.popoola@axamansard.com",
          "fullname": "Bamidele Popoola",
          "XeroContactID": "74bfe723-3ef0-4d30-940d-6b682ad77148"
        },
        {
          "ID": 305,
          "email": "tundebankegog@gmail.com",
          "fullname": "Babatunde Ramoni oladipo",
          "XeroContactID": "6f22d8cd-ac8f-443f-badb-18ceba3acf10"
        },
        {
          "ID": 306,
          "email": "franciscolakanu@deerfieldpetroleum.com",
          "fullname": "Deerfield Petroleum Resources",
          "XeroContactID": "5394ae3d-d1d6-4f1d-88be-66abc6a0e246"
        },
        {
          "ID": 307,
          "email": "kanato4reel@yahoo.com",
          "fullname": "Kanato Engineering Resources",
          "XeroContactID": "873439a7-e10e-46eb-a638-d2245aba04b0"
        },
        {
          "ID": 308,
          "email": "rukpabi@ecobank.com",
          "fullname": "Ukpabi Richard Idika",
          "XeroContactID": "3e633a29-5344-4ba6-8321-bc157d748016"
        },
        {
          "ID": 309,
          "email": "abiodunolanrewaju98@yahoo.com",
          "fullname": "Abiodun Ridwan Olanrewaju",
          "XeroContactID": "5ad07192-603d-4be3-b86b-e80365df31b4"
        },
        {
          "ID": 310,
          "email": "ochigbo@yahoo.com",
          "fullname": "Ochigbo Rosemary Ajima",
          "XeroContactID": "a051684e-4edf-4ce2-b028-654af8085470"
        },
        {
          "ID": 311,
          "email": "abiodunsalako2000@yahoo.co.uk",
          "fullname": "Abiodun Salako Kayode",
          "XeroContactID": "10fb92a2-f902-4ae3-b796-1db674f841f5"
        },
        {
          "ID": 312,
          "email": "olabodeibesanmi1@yahoo.com",
          "fullname": "Ibesanmi Samson Olabode",
          "XeroContactID": "678a204d-82e5-4827-b9d6-b5fe56563b73"
        },
        {
          "ID": 313,
          "email": "tundesanni2017@gmail.com",
          "fullname": "Tunde Sanni Akinwunmi",
          "XeroContactID": "1a13a53e-0ab4-4c7c-bd4e-fcf5b6fa2e8b"
        },
        {
          "ID": 314,
          "email": "oasawyerr@hotmail.com",
          "fullname": "Oluwayemisi Sawyerr",
          "XeroContactID": "c0f719dd-babd-458d-9701-79268ab6ef7b"
        },
        {
          "ID": 315,
          "email": "segun.akinyelure@gmail.com",
          "fullname": "Akinyelure Segun Oladipo",
          "XeroContactID": "2d90d2bf-84f2-42bf-8b29-0aaef01ee766"
        },
        {
          "ID": 316,
          "email": "kazzyju@yahoo.com",
          "fullname": "Kazeem Shakirat wonuola",
          "XeroContactID": "109a0873-70eb-4488-b936-43b882910bfb"
        },
        {
          "ID": 317,
          "email": "mjshitta@outlook.com",
          "fullname": "Mojisola Shitta Olabowale",
          "XeroContactID": "f040e465-3782-458f-835c-16259bbb0a4e"
        },
        {
          "ID": 318,
          "email": "idris.a.shittu@fbnholdings.com",
          "fullname": "Idris Shittu shittu",
          "XeroContactID": "3ab0d2da-f274-4050-aa2c-eacc7231daa5"
        },
        {
          "ID": 319,
          "email": "ademola.u.shokabi@firstbanknigeria.com",
          "fullname": "Ademola Shokabi",
          "XeroContactID": "3465d9bf-ba42-4e25-862d-5021b9584553"
        },
        {
          "ID": 320,
          "email": "domicare123@gmail.com",
          "fullname": "Kayode Oluseyi sholanke",
          "XeroContactID": "839b4027-11c9-4998-beb1-fb0e39f998fd"
        },
        {
          "ID": 321,
          "email": "fesobade@gmail.com",
          "fullname": "Baderin Soba Adefesobi",
          "XeroContactID": "c9bfab83-0bb7-41b9-9f81-8f5ea321d2b0"
        },
        {
          "ID": 322,
          "email": "olawale.solarin@lafargeholcim.com",
          "fullname": "Olawale Solarin",
          "XeroContactID": "75895386-2779-4023-b95a-528a0b58406b"
        },
        {
          "ID": 323,
          "email": "sbadejo@atbtechsoft.com",
          "fullname": "Badejo Solomon Oluwaseye",
          "XeroContactID": "80f2829d-05db-4fca-bc5e-a9c501f1640d"
        },
        {
          "ID": 324,
          "email": "oshinsol@yahoo.com",
          "fullname": "Oshin Solomon adebowale",
          "XeroContactID": "ebe02aeb-0748-4571-b224-f5a27a088348"
        },
        {
          "ID": 325,
          "email": "sales@atbtechsoft.com",
          "fullname": "ATB Techsoft Solutions",
          "XeroContactID": "4a662f24-3396-4cbe-a164-c92be5b4ba68"
        },
        {
          "ID": 326,
          "email": "somtochukwu.nkamigbo@hbng.com",
          "fullname": "Nkamigbo Somtochukwu Somtochukwu",
          "XeroContactID": "f122ae46-201a-43ac-853e-2e02237772fd"
        },
        {
          "ID": 327,
          "email": "stanleyuzoechina@yahoo.co.uk",
          "fullname": "Uzoechina Stanley Panteleon",
          "XeroContactID": "8518075f-fdbc-407b-a2e9-439012869a4a"
        },
        {
          "ID": 328,
          "email": "ehizbarth@gmail.com",
          "fullname": "Uwague Sunny Uwague",
          "XeroContactID": "8cc49941-f404-40d1-8f4b-1a6807220866"
        },
        {
          "ID": 329,
          "email": "tivemariere@gmail.com",
          "fullname": "Mariere Tive Tive",
          "XeroContactID": "f1f3ebfa-6fb3-4ae7-8c9e-9da9e4cd7796"
        },
        {
          "ID": 330,
          "email": "onitobiloba47@gmail.com",
          "fullname": "Oni Tobiloba Oni",
          "XeroContactID": "405a6629-9153-4ccd-aa83-d6a2fad660f2"
        },
        {
          "ID": 331,
          "email": "btokosi@atbtechsoft.com",
          "fullname": "Babajide Tokosi",
          "XeroContactID": "8394fe23-5d60-4c57-926d-1bfa6604490d"
        },
        {
          "ID": 332,
          "email": "tolusomi@gmail.com",
          "fullname": "Olasomi Tolu",
          "XeroContactID": "9a02c69b-6191-4d95-b2d9-3514b1d33299"
        },
        {
          "ID": 333,
          "email": "tolutayotisman@gmail.com",
          "fullname": "Olajolo Tolutayo Tolutayo",
          "XeroContactID": "eddd66b6-f477-4afe-a980-1f383ba33d64"
        },
        {
          "ID": 334,
          "email": "mrtoluabiodun@gmail.com",
          "fullname": "Abiodun Toluwanimi",
          "XeroContactID": "03262585-fea8-4dba-b738-8cd79689913c"
        },
        {
          "ID": 335,
          "email": "bbtuks@yahoo.com",
          "fullname": "Abiodun Tukuru",
          "XeroContactID": "9cd4eed2-d29b-42e7-9103-d97865e0a947"
        },
        {
          "ID": 336,
          "email": "ola2njib13@gmail.com",
          "fullname": "Bello Tunji",
          "XeroContactID": "ce2f5130-2cc7-4ea1-bd21-4b70f8802a36"
        },
        {
          "ID": 337,
          "email": "akpos2010@gmail.com",
          "fullname": "Aniekan Udoh",
          "XeroContactID": "0af3ecb5-5125-4066-92ae-b538f9d22af6"
        },
        {
          "ID": 338,
          "email": "AEdet-Udo@ikejaelectric.com",
          "fullname": "Aderonke Udoh edet",
          "XeroContactID": "f62b2836-6d77-4fdf-8244-71cdc4a71215"
        },
        {
          "ID": 339,
          "email": "udeme61@yahoo.co.uk",
          "fullname": "Udeme Ufot Dickson",
          "XeroContactID": "a9d52e4b-81c0-43a5-8f1d-89ba285c949a"
        },
        {
          "ID": 340,
          "email": "writemikesolo@yahoo.com",
          "fullname": "Solomon Ugwu",
          "XeroContactID": "aed57d09-39b6-49e0-ac8a-26d585eb8955"
        },
        {
          "ID": 341,
          "email": "itaukemeabasi@gmail.com",
          "fullname": "Ita Ukemeabasi Favour",
          "XeroContactID": "d7a62b29-8139-484e-a48f-452f98b282db"
        },
        {
          "ID": 342,
          "email": "judithuzougbo@gmail.com",
          "fullname": "Judith Uzougbo Bassey",
          "XeroContactID": "c3139c25-3e5a-476e-b383-cca43584b8b9"
        },
        {
          "ID": 343,
          "email": "waheedsalam2013@gmail.com",
          "fullname": "Salam Waheed Olawale",
          "XeroContactID": "4ec72d11-899b-4fe3-8aae-943fb082b559"
        },
        {
          "ID": 344,
          "email": "wale.oyelude@waosgroup.com",
          "fullname": "Oyelude Wale",
          "XeroContactID": "6b6242f2-4a8b-44e1-bf92-10bab9505af4"
        },
        {
          "ID": 345,
          "email": "wilfredagaji@keystonebankng.com",
          "fullname": "Agaji Wilfred",
          "XeroContactID": "d17e38c7-f94d-4a84-82a6-8d8845d89acc"
        },
        {
          "ID": 346,
          "email": "yusuf.abideen@hotmail.com",
          "fullname": "Abideen Yusuf",
          "XeroContactID": "5e5a9d91-adda-491a-b4b9-068e331ba4fd"
        },
        {
          "ID": 347,
          "email": "yusufgabi@yahoo.com",
          "fullname": "Gabisiu Yusuf Adebowale",
          "XeroContactID": "cc552005-4209-414d-8d23-38a2d04bb7e0"
        },
        {
          "ID": 348,
          "email": "abiodun.yusuf@gloworld.com",
          "fullname": "Abiodun Yusuf Taofik",
          "XeroContactID": "ac2cbdd8-5b70-402d-a9c5-85f0589038c3"
        },
        {
          "ID": 349,
          "email": "olaosebikan.ayegbusi@toptechengineeringltd.com",
          "fullname": "Ayegbusi Olaosebikan ojo",
          "XeroContactID": "72924d9c-9288-4fc9-b78f-300234e5d70c"
        },
        {
          "ID": 350,
          "email": "ayo.paseda@yahoo.com",
          "fullname": "Ayotunde Paseda Samson",
          "XeroContactID": "08d86873-8cb1-44c9-a2ad-19b68a7294f7"
        },
        {
          "ID": 351,
          "email": "femex2006wes@yahoo.com",
          "fullname": "Adeeko Obafemi Gbolahan",
          "XeroContactID": "d1f1e829-4bfd-42ed-87ce-937b0c570708"
        },
        {
          "ID": 352,
          "email": "kinghossy@yahoo.com",
          "fullname": "Aichenu John Agbo",
          "XeroContactID": "726ef89d-27dd-4dec-b382-5c33a80422ef"
        },
        {
          "ID": 353,
          "email": "ainademola@yahoo.com",
          "fullname": "Aina Akinola Ademola",
          "XeroContactID": "ab3f1161-b4c2-4f1a-bde3-9cbb4fee4668"
        },
        {
          "ID": 354,
          "email": "yomiolomu2002@yahoo.com",
          "fullname": "Abayomi Olufemi Olomu",
          "XeroContactID": "4976bca7-f621-48f9-a764-7aca217d8312"
        },
        {
          "ID": 355,
          "email": "lanreibitoye@yahoo.com",
          "fullname": "Ibitoye Bolaji Olanrewaju",
          "XeroContactID": "68d24205-0a37-40cc-847c-7c97ddeeb048"
        },
        {
          "ID": 356,
          "email": "pdconnectltd@gmail.com",
          "fullname": "Adebayo pd connect",
          "XeroContactID": "3673bbeb-19d7-4796-8d47-05b8b7da07e4"
        },
        {
          "ID": 357,
          "email": "bbabatope@outlook.com",
          "fullname": "Babatope Adeusi balogun",
          "XeroContactID": "c0b6a991-d625-4d52-9737-afe632bf98f3"
        },
        {
          "ID": 358,
          "email": "rresilianceservices@gmail.com",
          "fullname": "Abayomi Adetayo Adeyemo Resiliance",
          "XeroContactID": "027b7b44-6989-4854-949a-d8871790c1da"
        },
        {
          "ID": 359,
          "email": "jamesezenwa@keystonebankng.com",
          "fullname": "Chukwuma james Ezenwa",
          "XeroContactID": "41f1c252-22fc-4f12-b80b-b96fe2d11351"
        },
        {
          "ID": 360,
          "email": "oasomotun@gmail.com",
          "fullname": "Oladimeji Azeez Somotun",
          "XeroContactID": "92c1f49f-5872-4c5a-90e1-5c8af8d6ec4b"
        },
        {
          "ID": 361,
          "email": "sheezneet2000@yahoo.co.uk",
          "fullname": "Henry Chijioke Okwor",
          "XeroContactID": "34e97ac8-1aa1-468d-9330-af474dff444a"
        },
        {
          "ID": 362,
          "email": "ytechng@gmail.com",
          "fullname": "Ajayi daud Opeyemi",
          "XeroContactID": "0bfd3e23-83e0-4e89-b0eb-81eed8052da7"
        },
        {
          "ID": 364,
          "email": "m.diyaolu@igpesgroup.com",
          "fullname": "Diyaolu Abiola Moshood",
          "XeroContactID": "f97012d6-2404-4c00-b1b8-f6548524313d"
        },
        {
          "ID": 365,
          "email": "oadeleye@ecobank.com",
          "fullname": "Adeleye Olatuyi",
          "XeroContactID": "846fca10-a9bc-41c6-b52b-839f67624cfa"
        },
        {
          "ID": 367,
          "email": "tolu.t.awoleye@gsk.com",
          "fullname": "Theophilus Tolulope Awoleye",
          "XeroContactID": "1444e3eb-53f9-4766-9ec1-720faca32101"
        },
        {
          "ID": 368,
          "email": "linuschucks2003@gmail.com",
          "fullname": "Edeh Linus Chijioke",
          "XeroContactID": "108b0873-6cac-4e85-8837-f5ad92ab9e1e"
        },
        {
          "ID": 372,
          "email": "pereosoba@gmail.com",
          "fullname": "Pere osoba",
          "XeroContactID": "7809933e-0599-4716-b8de-388f4b44a196"
        },
        {
          "ID": 373,
          "email": "otunde@hotmail.com",
          "fullname": "Babatunde Ishaq Olaniyan",
          "XeroContactID": "74c7e616-a9cd-4dc3-8abd-035d8c9139ca"
        },
        {
          "ID": 581,
          "email": "taofik.ogunmola@stanbicibtc.com",
          "fullname": "Ogunmola Olalekan Taofik",
          "XeroContactID": "8ec62e8e-0a6b-41f5-9398-cebdcb26de42"
        },
        {
          "ID": 582,
          "email": "mails2fola@yahoo.com",
          "fullname": "Tiamiyu Misbau Folarin",
          "XeroContactID": "393a8abf-12e8-4547-8faf-4ce2f2960a41"
        },
        {
          "ID": 583,
          "email": "oadetayo@x3leasing.com",
          "fullname": "Adetayo Florence Odegbaro",
          "XeroContactID": "2d53cc89-7075-4331-9fed-00af5c450728"
        },
        {
          "ID": 584,
          "email": "doziedavid@yahoo.com",
          "fullname": "Atueyi Ifeanyi Dozie",
          "XeroContactID": "4efbf71d-ceae-40c7-9eea-368b6ba06cd2"
        },
        {
          "ID": 585,
          "email": "yizedre@gmail.com",
          "fullname": "Anozie Ikechukwu ( Idea's Radar Hub Ltd ) Basil",
          "XeroContactID": "60cf16d8-172c-42c3-8a65-471a655c4fb7"
        },
        {
          "ID": 586,
          "email": "owolewao23@gmail.com",
          "fullname": "Omowunmi Veronica Owolewa",
          "XeroContactID": "35dd9bde-2216-4ba7-b619-97f1634db821"
        },
        {
          "ID": 587,
          "email": "tonybanjo2001@gmail.com",
          "fullname": "Adebanjo Anthony Temitope",
          "XeroContactID": "6facfc51-02ea-4413-8a3b-ed4c55286416"
        },
        {
          "ID": 588,
          "email": "lymfordlawrens@gmail.com",
          "fullname": "Awe Tokunbo",
          "XeroContactID": "bbd5b550-bc3b-4704-837f-54a515d3bc4d"
        },
        {
          "ID": 590,
          "email": "elawal@providusbank.com",
          "fullname": "Lawal Eniola Tawakalitu",
          "XeroContactID": "59377ff8-a846-4da1-b807-7d4cdb40798e"
        },
        {
          "ID": 591,
          "email": "abiodunariyibi@yahoo.com",
          "fullname": "Ariyibi Abiodun Olumide",
          "XeroContactID": "0f3bf87d-5643-4a55-9ca9-9028550d246e"
        },
        {
          "ID": 592,
          "email": "Onyekeref@gmail.com",
          "fullname": "Francis Chukwundi Onyekere",
          "XeroContactID": "97e125ca-cf96-40eb-8675-17d30b9d40ee"
        },
        {
          "ID": 593,
          "email": "iahd@chevron.com",
          "fullname": "Abubakar Isah",
          "XeroContactID": "ac8117d4-e7b4-47a8-9d8f-fd0e2a8ad4e9"
        },
        {
          "ID": 594,
          "email": "bishopmarshal6@gmail.com",
          "fullname": "Terzungwe Barnabas Kegh",
          "XeroContactID": "23891396-a241-4ff5-81e7-3cb765634de0"
        },
        {
          "ID": 595,
          "email": "yakubuaugustus@yahoo.com",
          "fullname": "Anthony Augustus Yakubu",
          "XeroContactID": "90f243c2-12c2-4f93-8163-e27d15f61d43"
        },
        {
          "ID": 596,
          "email": "eoalohan@yahoo.com",
          "fullname": "Alohan Edwin Osayande",
          "XeroContactID": "5e2c2699-b6c2-410e-8d57-a6d9b1f889b1"
        },
        {
          "ID": 597,
          "email": "lawrenceattahiru@gmail.com",
          "fullname": "Lawrene Attahiru",
          "XeroContactID": "c2c6834d-939e-4285-a8d2-ef0174cb4078"
        },
        {
          "ID": 598,
          "email": "adeseyojubukola@gmail.com",
          "fullname": "Bosede Bukola Adeseyoju",
          "XeroContactID": "3ffc0014-a858-4de8-8d3c-f0784d207a6b"
        },
        {
          "ID": 599,
          "email": "ken.j.onwuka@exxonmobile.com",
          "fullname": "Ken Jideofor Onwuka",
          "XeroContactID": "4f9c6df4-aab3-4e91-b7b6-cf7da442ee58"
        },
        {
          "ID": 600,
          "email": "mimi766@gmail.com",
          "fullname": "Omobosede Gbemisola Agbaje",
          "XeroContactID": "be55977e-29dd-45f0-bf29-85f4de030532"
        },
        {
          "ID": 601,
          "email": "jegede22222@gmail.com",
          "fullname": "Adewale Samson Jegede",
          "XeroContactID": "5db0efb0-9d5c-45fe-a831-c26445aa5579"
        },
        {
          "ID": 602,
          "email": "m.okojie@courierplus.ng.com",
          "fullname": "Okojie Macduke Ejele",
          "XeroContactID": "0b498399-4568-490f-94da-03f71eb65bd5"
        },
        {
          "ID": 604,
          "email": "Yak4musty@gmail.com",
          "fullname": "Musa Mustapha Yakubu",
          "XeroContactID": "d039cb94-a857-4678-9740-06b299cbab31"
        },
        {
          "ID": 605,
          "email": "maru@chevron.com",
          "fullname": "Aruoriwo Mary Cousin",
          "XeroContactID": "1295c098-44d5-44e2-b32f-e59b62c99cd1"
        },
        {
          "ID": 606,
          "email": "mainaa@who.int",
          "fullname": "Maina Andrew",
          "XeroContactID": "4de05265-1b3d-4907-8ead-8da885977e82"
        },
        {
          "ID": 607,
          "email": "timothyyusufu@gmail.com",
          "fullname": "Timothy Ojomachewu Yusufu",
          "XeroContactID": "e460c40d-f461-48bb-9933-22a0eb57ae85"
        },
        {
          "ID": 608,
          "email": "napoleonjamesk@gmail.com",
          "fullname": "James Napoleon Kennedy",
          "XeroContactID": "a276c2f8-fd1a-4008-9f15-3d648229ec2d"
        },
        {
          "ID": 609,
          "email": "mikeameh44@gmail.com",
          "fullname": "Micheal Oyowo Ameh",
          "XeroContactID": "f6141a1a-bd0d-4bad-aa2e-92054eb02126"
        },
        {
          "ID": 610,
          "email": "bluemoontechltd@gmail.com",
          "fullname": "Samson Olufemi Agbaje",
          "XeroContactID": "64a29844-85a6-447b-a34f-626815aa8335"
        },
        {
          "ID": 611,
          "email": "jonathan.aderogba@gmail.com",
          "fullname": "Aderogba Adewale Jonathan",
          "XeroContactID": "971ee273-c6be-4548-b7f0-a6e533ff9125"
        },
        {
          "ID": 612,
          "email": "solalonge@gmail.com",
          "fullname": "Meseko Tito Babafeyisola",
          "XeroContactID": "f620e921-ea99-4a27-8b1c-59fdd2fe9569"
        },
        {
          "ID": 613,
          "email": "freightempire1@gmail.com",
          "fullname": "Kanu Onyewuchi Cyril",
          "XeroContactID": "d77e27e2-d66d-4163-8de8-faf879206ac3"
        },
        {
          "ID": 614,
          "email": "funmi.adesanya@fidelitybank.ng",
          "fullname": "Adesanya Funmi",
          "XeroContactID": "050f6338-194c-4f84-b2c9-4cd13c7e869e"
        },
        {
          "ID": 615,
          "email": "ojinichioma@gmail.com",
          "fullname": "ojini Queeneth Chioma",
          "XeroContactID": "6e2b87ca-2fc2-4204-a39e-e3cdad8ac8ca"
        },
        {
          "ID": 616,
          "email": "williamsedmark@yahoo.com",
          "fullname": "Afemikhe Williams Emmanuel",
          "XeroContactID": "40fac381-b855-4d75-bbb2-538f7e6a53f0"
        },
        {
          "ID": 617,
          "email": "ikingson1976@gmail.com",
          "fullname": "Ikechukwu Emmanuel Nweze",
          "XeroContactID": "aa312746-bf9f-4a00-a82c-eace4ec82089"
        },
        {
          "ID": 618,
          "email": "olajideafolayan@yahoo.co.uk",
          "fullname": "Afolayan idowu Olajide",
          "XeroContactID": "23b479ba-023b-460a-bfd9-8403e2c2d494"
        },
        {
          "ID": 619,
          "email": "olawunmi.jombo@aarescuenigeria.com",
          "fullname": "Jombo Oluwatosin Olawunmi",
          "XeroContactID": "66642076-1328-4543-8611-2e1b7e4b60cd"
        },
        {
          "ID": 620,
          "email": "onazi4life@gmail.com",
          "fullname": "Onazi Micheal Onazi",
          "XeroContactID": "1628c181-36e6-4037-8107-9b0e065bbb1a"
        },
        {
          "ID": 621,
          "email": "akaasoloter@gmail.com",
          "fullname": "Tertsegha Solomon Akaazua",
          "XeroContactID": "36d0e49f-ed1a-44b9-af7a-ce3dd8e66aa0"
        },
        {
          "ID": 622,
          "email": "adebukola.hannah.olaniyi@citi.com",
          "fullname": "Hannah Adebukola Olaniyi",
          "XeroContactID": "cb2e559a-18af-4ae5-9239-462222e28b40"
        },
        {
          "ID": 623,
          "email": "ahmed.abiola@stanbicibtc.com",
          "fullname": "Abiola Olaolu Ahmed",
          "XeroContactID": "c3b919f8-7f5d-4035-b897-d26691921763"
        },
        {
          "ID": 624,
          "email": "bosede_morakinyo@yahoo.com",
          "fullname": "Morakinyo Folashade Bosede",
          "XeroContactID": "e4197ff0-5a13-4152-9126-7a529ebe5cb3"
        },
        {
          "ID": 625,
          "email": "kniceport1@yahoo.com",
          "fullname": "Kehinde Olakunle Abdurasheed",
          "XeroContactID": "79f29cfe-a584-4c22-b77e-b2f367081eda"
        },
        {
          "ID": 626,
          "email": "tayoolabajo@gmail.com",
          "fullname": "Adetayo Olabajo",
          "XeroContactID": "9c9127fa-420b-42ff-bc0f-49658304f341"
        },
        {
          "ID": 627,
          "email": "seunkeyede@gmail.com",
          "fullname": "Keyede Gbenro Oluwaseun",
          "XeroContactID": "f384df54-3637-4019-b414-071cb740493b"
        },
        {
          "ID": 628,
          "email": "soni@renmoney.com",
          "fullname": "Oni Oloruntoba Samson",
          "XeroContactID": "85bc2718-09b5-4525-b765-cea1ca5350a1"
        },
        {
          "ID": 629,
          "email": "olakunle.ilesanmi@stanbicibtc.com",
          "fullname": "Oluwatosin Olakunle Ilesanmi",
          "XeroContactID": "7744f9fc-2ea1-40d8-906d-24a5adc9fa7e"
        },
        {
          "ID": 630,
          "email": "remmyokorie@yahoo.com",
          "fullname": "Remigius Ibekenwa Okorie",
          "XeroContactID": "527c60af-4da0-48a3-87ad-4867479e4064"
        },
        {
          "ID": 631,
          "email": "ernest.iriogbe@gloworld.com",
          "fullname": "Iriogbe Akhere Ernest",
          "XeroContactID": "703ec784-65dc-4224-aa7c-225bb28c040f"
        },
        {
          "ID": 632,
          "email": "ahmed.ade@stanbicibtc.com",
          "fullname": "Ade Ahmed",
          "XeroContactID": "3653ada1-5bf7-451f-85ff-f7d8a5d5f7e6"
        },
        {
          "ID": 633,
          "email": "KEHINDEPETER15@YAHOO.COM",
          "fullname": "Kehinde Peter Owonibi",
          "XeroContactID": "1a76f872-cc7e-4e61-9e32-c6e12630a87f"
        },
        {
          "ID": 634,
          "email": "ekenetagbo@yahoo.com",
          "fullname": "Brian Tagbo Onyema",
          "XeroContactID": "2f18a18a-1faa-4723-9956-e169b39ecd0d"
        },
        {
          "ID": 635,
          "email": "bamidurooff@gmail.com",
          "fullname": "Bamiduro Olufemi",
          "XeroContactID": "5e3d6dca-357e-4f58-b16e-960bc12bb5e4"
        },
        {
          "ID": 636,
          "email": "adewooley@yahoo.com",
          "fullname": "Egbewole Kayode Adewole",
          "XeroContactID": "187ee705-974a-4818-8546-36699792f422"
        },
        {
          "ID": 637,
          "email": "otunola.akerele@gmail.com",
          "fullname": "Akerele Otunola Ayotunde",
          "XeroContactID": "f566e592-ee21-41d4-b6fe-e4380f2364dd"
        },
        {
          "ID": 638,
          "email": "francis.nwaogu@outlook.com",
          "fullname": "Nwaogu Udochukwu Francis",
          "XeroContactID": "67189104-bed8-4d44-86d5-387776f75e66"
        },
        {
          "ID": 639,
          "email": "louisahuruonye@gmail.com",
          "fullname": "Louis Chukwudi Ahuruonye",
          "XeroContactID": "3aa1156f-383c-4710-a605-fc9db5f445d7"
        },
        {
          "ID": 640,
          "email": "Ayodeledada17@gmail.com",
          "fullname": "Ayodele Moroof Dada",
          "XeroContactID": "532b4774-020e-4f0a-b941-8c3140f04a50"
        },
        {
          "ID": 641,
          "email": "jomilojurod@gmail.com",
          "fullname": "Rodipe Nurudeen Rodipe",
          "XeroContactID": "8343bb0a-79a7-47a5-beeb-1099342fe270"
        },
        {
          "ID": 642,
          "email": "Unekachukwu@gmail.com",
          "fullname": "Uneke Fred Chukwu",
          "XeroContactID": "2292f063-3cc0-44bd-88b2-47d6d2634e6e"
        },
        {
          "ID": 643,
          "email": "amba_m@yahoo.com",
          "fullname": "Gata Musa Amba",
          "XeroContactID": "a199c8f6-225b-4550-a8b4-9858c3925aeb"
        },
        {
          "ID": 644,
          "email": "sekonih@gmail.com",
          "fullname": "Sekoni Hafeez Sijuade",
          "XeroContactID": "04efa9e8-4bf7-42c9-b7ad-eaec09988972"
        },
        {
          "ID": 645,
          "email": "lovely.akintunde@cwg-plc.com",
          "fullname": "Akintunde Onome Lovely",
          "XeroContactID": "6fe96f66-b705-4a07-a49b-696498bf2c42"
        },
        {
          "ID": 646,
          "email": "agbajejoshua@gmail.com",
          "fullname": "Joshua Adeyemi Agbaje",
          "XeroContactID": "aedbea4b-cc72-4abb-abb7-f565e0e62e22"
        },
        {
          "ID": 647,
          "email": "ajokeolaniyan@yahoo.com",
          "fullname": "Akpoyibo Olayinka",
          "XeroContactID": "581a1407-9476-4192-9416-2a4c2d6c2441"
        },
        {
          "ID": 648,
          "email": "fishmesh@yahoo.co.uk",
          "fullname": "meshioye Oladapo",
          "XeroContactID": "a02744b9-8d94-4a75-b3a9-b3891fb2cd11"
        },
        {
          "ID": 649,
          "email": "emahp88@gmail.com",
          "fullname": "Emah patience",
          "XeroContactID": "0fd902da-6464-4b9b-af57-22c00af9c357"
        },
        {
          "ID": 650,
          "email": "koya.atolagbe@emelgroup.com",
          "fullname": "Atolagbe Koya Oluwasegun",
          "XeroContactID": "d607bc60-5c4f-44ac-82be-0863d9fc2412"
        },
        {
          "ID": 651,
          "email": "amidaib@gmail.com",
          "fullname": "Amida Olabanjo Ibrahim",
          "XeroContactID": "d1375142-8235-4ef9-94a3-5df2ac9d1be8"
        },
        {
          "ID": 652,
          "email": "Abu_Bamaiyi@yahoo.com",
          "fullname": "Bamaiyi Adah Abu",
          "XeroContactID": "bbe0b805-6d69-49a4-bf05-c8796a92104f"
        },
        {
          "ID": 653,
          "email": "aade616@yahoo.com",
          "fullname": "Onipede Adedokun Adeyemi",
          "XeroContactID": "4328df51-124f-4ccc-a801-c44138e13487"
        },
        {
          "ID": 654,
          "email": "godwin.sunday@gloworld.com",
          "fullname": "Godwin Johnson Sunday",
          "XeroContactID": "6910b116-c117-414a-acd4-95d0c79a00be"
        },
        {
          "ID": 655,
          "email": "fatai_adekunle@yahoo.com",
          "fullname": "Adekunle Fatai Adebayo",
          "XeroContactID": "a091fafa-1480-4246-b9e6-b1394a3bbcef"
        },
        {
          "ID": 656,
          "email": "wuraola.odugbesan@deuxproject.com",
          "fullname": "Odugbesan Oluwayemisi Wuraola",
          "XeroContactID": "30e74b85-5713-4e98-bef4-b6cee823f213"
        },
        {
          "ID": 657,
          "email": "femi.oyefodunrin@stanbicibtc.com",
          "fullname": "oyefodunrin babajide olufemi",
          "XeroContactID": "fd102a7f-6edb-4efb-b6c1-e66c38a7512e"
        },
        {
          "ID": 658,
          "email": "enilay2@yahoo.com",
          "fullname": "Layeni Adeyemo Enitan",
          "XeroContactID": "431d3276-92dd-4c33-a1af-56cd55c5063a"
        },
        {
          "ID": 659,
          "email": "oeobialor@unionbankng.com",
          "fullname": "Obialor esther Oluchi",
          "XeroContactID": "1e188563-22db-4ba7-ab5d-c46a34686c32"
        },
        {
          "ID": 660,
          "email": "canazodo@oceanichealthng.com",
          "fullname": "Anazodo Onyeka Charles",
          "XeroContactID": "e6bbd4b0-d2c2-4024-a594-ca7faf1b124f"
        },
        {
          "ID": 661,
          "email": "ola.lakunle@gmail.com",
          "fullname": "Olanipekun Anuoluwapo Olakunle",
          "XeroContactID": "1c60010d-7f53-49fb-bb7f-39e99de6a364"
        },
        {
          "ID": 662,
          "email": "uawa@appzonegroup.com",
          "fullname": "Awa Edet Ubongabasi",
          "XeroContactID": "926939d6-1951-4e06-96fb-7585ddefe3b9"
        },
        {
          "ID": 663,
          "email": "peace.okafor@yahoo.com",
          "fullname": "Okafor Njideka Peace",
          "XeroContactID": "f072539a-2e4c-44d8-b7fa-8187922677fa"
        },
        {
          "ID": 664,
          "email": "denoilimitedconsulting@gmail.com",
          "fullname": "Ojeonu ifidon Dennis",
          "XeroContactID": "ec709a1d-47dc-4d5a-85c0-ebb7ea70a8bf"
        },
        {
          "ID": 665,
          "email": "oolumorokun@edcregistrars.com",
          "fullname": "Olumorokun Olumide Akinbode",
          "XeroContactID": "ac190298-4171-4225-b794-db232921541c"
        },
        {
          "ID": 666,
          "email": "makomotorsltd@gmail.com",
          "fullname": "Odubote Michael Adeshina",
          "XeroContactID": "5772f900-4820-4c8f-b3ef-cf25f6f33052"
        },
        {
          "ID": 667,
          "email": "wale.adeyemi@creditville.ng.org",
          "fullname": "Adeyemi Mcwale Gboyega",
          "XeroContactID": "6467d8d9-446b-4dfa-aab0-8df6184a3fc7"
        },
        {
          "ID": 668,
          "email": "oakinyemi2@polarisbanklimited.com",
          "fullname": "Akinyemi Oluwatoyin",
          "XeroContactID": "3dab0ed0-4e26-42fd-87bc-464691e1d3a6"
        },
        {
          "ID": 669,
          "email": "efaminika@gmail.com",
          "fullname": "Efa Richard Elizabeth",
          "XeroContactID": "aea44350-037f-4ef1-b21c-c38108fa44f4"
        },
        {
          "ID": 670,
          "email": "sakirabolly@gmail.com",
          "fullname": "Bashorun sakirat",
          "XeroContactID": "7aed5aaa-915d-4e7f-be89-39afed865022"
        },
        {
          "ID": 671,
          "email": "kolade.mobolanle@gmail.com",
          "fullname": "Mobolanle peters kolade",
          "XeroContactID": "99a91033-4353-43c6-b8b0-560691505fdf"
        },
        {
          "ID": 672,
          "email": "DSUV@chevron.com",
          "fullname": "Emeka Livinus Nwagwu",
          "XeroContactID": "1d719ee3-3acf-4379-a9a5-13f94459aa4c"
        },
        {
          "ID": 673,
          "email": "priscaenwe@yahoo.com",
          "fullname": "Enwe prisca",
          "XeroContactID": "6839fd13-9225-4e5a-86f4-1c19a079a7c1"
        },
        {
          "ID": 674,
          "email": "burgbosky@gmail.com",
          "fullname": "Gloria Nwakegom Onyeama",
          "XeroContactID": "2bb2c976-a2ea-4a3c-b026-5e00c60735c8"
        },
        {
          "ID": 675,
          "email": "hjames@citmfb.com",
          "fullname": "James henry carlos",
          "XeroContactID": "9d0886c5-de8f-436d-bbb0-abf11cfb809f"
        },
        {
          "ID": 676,
          "email": "yoorman24@yahoo.com",
          "fullname": "Fabayo Ifeoluwapo",
          "XeroContactID": "ded67700-a092-4e73-af80-58f2dbb64417"
        },
        {
          "ID": 677,
          "email": "anita_brownson@yahoo.com",
          "fullname": "Anita Martin Usen",
          "XeroContactID": "b526a39e-782d-41ed-aeb3-d9cb7635bf4e"
        },
        {
          "ID": 678,
          "email": "Maryloveinikori@yahoo.com",
          "fullname": "Marylove Onyemhe Inikori",
          "XeroContactID": "ff0900d3-bacc-417c-a32a-f3cf031ded0e"
        },
        {
          "ID": 679,
          "email": "ezeokejoyce@gmail.com",
          "fullname": "Joyce Ihechiluru Ezeoke",
          "XeroContactID": "a67ccae0-664a-4e4c-b91a-978aa788b559"
        },
        {
          "ID": 680,
          "email": "temidayo.adegbite@yahoo.com",
          "fullname": "Olojo Adeola Temidayo",
          "XeroContactID": "b5768a53-d799-42dc-9d47-8ff310929e96"
        },
        {
          "ID": 681,
          "email": "osigbodik@gmail.com",
          "fullname": "Kolawole Titi Temiloluwa",
          "XeroContactID": "3c099fb3-82ef-49f4-90d7-d67afbdc1b59"
        },
        {
          "ID": 682,
          "email": "oyedeji.kehinde@paviliontechnolgy.com",
          "fullname": "Oyedeji Oluwaseyi Kehinde",
          "XeroContactID": "b65f978f-ca44-4847-ad39-660a4323f4ad"
        },
        {
          "ID": 683,
          "email": "Ochigboocheedwin@yahoo.com",
          "fullname": "Oche Edwin Ochigbo",
          "XeroContactID": "124c0fde-cbdf-4f63-8678-40ca12cf5789"
        },
        {
          "ID": 684,
          "email": "ebere.josephine@yahoo.com",
          "fullname": "Ada Josephine Ebere",
          "XeroContactID": "deffd845-f168-4e65-8ce7-da138004355c"
        },
        {
          "ID": 685,
          "email": "harrycfrank@yahoo.com",
          "fullname": "Harry Frank Chibuike",
          "XeroContactID": "6d2c910a-e3a1-4d7a-b7d4-d20764f2373b"
        },
        {
          "ID": 686,
          "email": "ema.aboje@fleetpartners.ng",
          "fullname": "Bassey Ochowech Owagoyi",
          "XeroContactID": "6d127a9c-f4ea-4c17-aa28-414899b18eb8"
        },
        {
          "ID": 687,
          "email": "colynsehys@gmail.com",
          "fullname": "Ehys Colyns",
          "XeroContactID": "bea27562-59e8-4874-ac2a-1726ccde7cbf"
        },
        {
          "ID": 688,
          "email": "josephadebayo10@yahoo.com",
          "fullname": "Afu Joseph Adebayo",
          "XeroContactID": "33534c3d-b819-4bad-93a3-5ec658daae74"
        },
        {
          "ID": 689,
          "email": "aawokola@atbtechsoft.com",
          "fullname": "Awokola olakunle Adeolu",
          "XeroContactID": "a33116f1-ab66-4f81-81d6-d0b8557747e7"
        },
        {
          "ID": 690,
          "email": "Emmanuel.iwhiwhu@flyairpeace.com",
          "fullname": "Iwhiwhu Okeloghene Emmanuel",
          "XeroContactID": "1bc7b5ec-e46f-472b-bcaa-d15691118071"
        },
        {
          "ID": 691,
          "email": "judith_uzougbo11@yahoo.co.uk",
          "fullname": "Judith Bassey Uzougbo",
          "XeroContactID": "c3139c25-3e5a-476e-b383-cca43584b8b9"
        },
        {
          "ID": 692,
          "email": "emmaprince2002@yahoo.com",
          "fullname": "Udeh Emmanuel",
          "XeroContactID": "3be8d6a4-3e65-4d0a-95ad-2e4f8a8d569d"
        },
        {
          "ID": 693,
          "email": "akayodejoseph@yahoo.com",
          "fullname": "Kayode Joseph Ajayi",
          "XeroContactID": "3c5c0066-2517-4834-a9f8-29646627c5ab"
        },
        {
          "ID": 694,
          "email": "ichukwura@tvcommunication.tv",
          "fullname": "chukwura chuka ifeanyi",
          "XeroContactID": "d2c52d59-daa5-4314-80bb-d686c4d9e19e"
        },
        {
          "ID": 695,
          "email": "lazu1000@yahoo.com",
          "fullname": "Agu Chidubem Obiajulu",
          "XeroContactID": "c8402124-28e7-4d89-ab97-9d0bd9368ce1"
        },
        {
          "ID": 696,
          "email": "shiyanbolar@yahoo.com",
          "fullname": "Shiyanbola Rotimi",
          "XeroContactID": "12aea763-91a9-4e9a-a29c-dfc8f5467776"
        },
        {
          "ID": 697,
          "email": "banna909096@gmail.com",
          "fullname": "Eichie Erahudu Peter",
          "XeroContactID": "b2109e89-199a-4603-9983-d6181cbed626"
        },
        {
          "ID": 698,
          "email": "cassiak@edcregistrars.com",
          "fullname": "Assiak Elkanah uduak",
          "XeroContactID": "89ed94d1-1bf5-4441-b5c4-d7b78fb6991a"
        },
        {
          "ID": 699,
          "email": "mosunkareem@goldlinkplc.com",
          "fullname": "kareem Mosunmola Sakirat",
          "XeroContactID": "a9f48e5e-0f17-40cd-8442-93f4c086c13d"
        },
        {
          "ID": 700,
          "email": "Janeybabe861@gmail.com",
          "fullname": "Janet Faith Chiejine",
          "XeroContactID": "2a6a2c28-1dde-492c-a625-74f6a73341b9"
        },
        {
          "ID": 701,
          "email": "take2ogechidavid@gmail.com",
          "fullname": "David Ogechi Macdonald",
          "XeroContactID": "b3441c21-a51f-46ff-9d4e-40da38ecaed1"
        },
        {
          "ID": 702,
          "email": "mdojlife@gmail.com",
          "fullname": "Badmus Muyideen Oladipupo",
          "XeroContactID": "c1f4255f-2aa1-46f1-88bb-79599880d310"
        },
        {
          "ID": 703,
          "email": "francaokwy@yahoo.com",
          "fullname": "Francisca Okwuchi Onazi",
          "XeroContactID": "b3dd4e0c-c7ad-4a1b-9b37-bac00ffd3527"
        },
        {
          "ID": 704,
          "email": "seabucksexport@gmail.com",
          "fullname": "Seabucks Nig Ltd",
          "XeroContactID": "e6c64411-d755-47bf-99cf-4e205a23b84b"
        },
        {
          "ID": 705,
          "email": "adeadeseyoju@gmail.com",
          "fullname": "Adewumi James Adeseyoju",
          "XeroContactID": "c4b8d976-d6a7-4779-a313-8d6bf43f8d35"
        },
        {
          "ID": 706,
          "email": "babatunde.ajayi@stanbicibtc.com",
          "fullname": "Ajayi Abiodun babatunde",
          "XeroContactID": "efce2f77-0bcd-4703-9125-e440c7905007"
        },
        {
          "ID": 707,
          "email": "foluelu@gmail.com",
          "fullname": "Ishola Olabisi",
          "XeroContactID": "27e80667-09c1-49ee-b67c-e46a8ec26e50"
        },
        {
          "ID": 708,
          "email": "kingsleyukwu@yahoo.co.uk",
          "fullname": "Ukwu uchenna Kingsley",
          "XeroContactID": "f96aa96f-6e97-4046-b57a-8bf4ef70a990"
        },
        {
          "ID": 709,
          "email": "abiola.t.akintola2@firstbanknigeria.com",
          "fullname": "Akintola Taoheed Abiola",
          "XeroContactID": "e0ef0193-d140-48c4-aa55-96909f1d1f25"
        },
        {
          "ID": 710,
          "email": "egbojah.godwin@dangoteproject.com",
          "fullname": "Egbojah ohelumume",
          "XeroContactID": "ebf7e3d8-6684-4643-9651-6978ec3b4b47"
        },
        {
          "ID": 711,
          "email": "ayobami_aremu@yahoo.com",
          "fullname": "Aremu Adewale",
          "XeroContactID": "1071c47c-a6bd-4706-bd21-6615a8cfbd3e"
        },
        {
          "ID": 712,
          "email": "chibcharles@yahoo.com",
          "fullname": "Obiechefu Charles Chibuike",
          "XeroContactID": "24a738bd-f956-41f4-8785-2c1ba7bfab57"
        },
        {
          "ID": 713,
          "email": "silverplatterng@gmail.com",
          "fullname": "Demilola Shitta (silver",
          "XeroContactID": "3338d36a-4a67-4756-a7e7-eecccbd6f8c4"
        },
        {
          "ID": 714,
          "email": "info@acreativeexpressionng.com",
          "fullname": "Jack ( A creative expression) Laide Yetunde",
          "XeroContactID": "b1cb62ca-1484-40ee-93ae-4fb30a63624a"
        },
        {
          "ID": 715,
          "email": "okwux004@yahoo.com",
          "fullname": "Okereke Joseph Okwudiri",
          "XeroContactID": "16b731e4-c16e-42f0-ab52-5dda57844096"
        },
        {
          "ID": 716,
          "email": "kingdom_computers2013@yahoo.com",
          "fullname": "Osunor Chizoba Kosiso",
          "XeroContactID": "0d896b85-f943-4f82-a33c-7bd3f94e8bed"
        },
        {
          "ID": 717,
          "email": "is_nwachukwu@yahoo.com",
          "fullname": "Nwachukwu stanley ifeanyi",
          "XeroContactID": "99025af5-7f1b-4afe-bc3c-2211afaa718d"
        },
        {
          "ID": 718,
          "email": "amatanmi@polarisbanklimited.com",
          "fullname": "Matanmi Olufemi Akinwale",
          "XeroContactID": "029bb186-3758-4483-b7dc-26c091303a65"
        },
        {
          "ID": 719,
          "email": "gbrlmabel@gmail.com",
          "fullname": "Ale Mabel Gabriel",
          "XeroContactID": "36cdde7f-cd08-4f24-bff4-d199ab3f43d1"
        },
        {
          "ID": 720,
          "email": "omotunde.otubaga@accessbankplc.com",
          "fullname": "Otubaga Oluwatoyin aderonke",
          "XeroContactID": "ab4f4c70-fd88-4497-b2e5-aee93a791ce3"
        },
        {
          "ID": 722,
          "email": "aodeshilo@polarisbanklimited.com",
          "fullname": "Odeshilo Samuel Ayodele",
          "XeroContactID": "a533f21c-e881-4155-bceb-35e7086d1a6c"
        },
        {
          "ID": 723,
          "email": "Bruno.ukponu@gmail.com",
          "fullname": "ukponu (kencho Concepthouse enterprises) Nkencho",
          "XeroContactID": "5dabbffb-7812-4024-ba25-b316ca70b935"
        },
        {
          "ID": 724,
          "email": "Deborahale33@gmail.com",
          "fullname": "Oyindamola Deborah Ale",
          "XeroContactID": "12d07715-a623-4f5f-bb1d-4cef40542463"
        },
        {
          "ID": 725,
          "email": "jubrilshoaga@yahoo.com",
          "fullname": "Shoaga daramola",
          "XeroContactID": "69bf03a4-9169-4a74-ab0c-961726f72732"
        },
        {
          "ID": 726,
          "email": "Catherineale@yahoo.com",
          "fullname": "Catherine Ale",
          "XeroContactID": "eb0d6073-a588-43f4-bbc0-7ce3d1364641"
        },
        {
          "ID": 727,
          "email": "rita.ohiagu@dangoteprojects.com",
          "fullname": "Ohiagu Nneka Rita",
          "XeroContactID": "91e368a4-1114-4d1e-97f4-99ce582fcc6b"
        },
        {
          "ID": 728,
          "email": "abuhogboloj@yahoo.com",
          "fullname": "John Ogbole Abuh",
          "XeroContactID": "fc583272-c3dc-4abc-81f2-6f8cc334bf28"
        },
        {
          "ID": 729,
          "email": "patienceogbeide@keystonebankng.com",
          "fullname": "Ogbeide Otimebho patience",
          "XeroContactID": "7a3d6663-d9e8-41f0-884a-ba9302d7c491"
        },
        {
          "ID": 730,
          "email": "bayorotimi121@gmail.com",
          "fullname": "Rotimi Adebayo Joseph",
          "XeroContactID": "b6775700-e5ad-41e2-b07e-21a47e2aed07"
        },
        {
          "ID": 731,
          "email": "doconbash@gmail.com",
          "fullname": "bello olalekan bashiru",
          "XeroContactID": "e865dfd1-cc0d-4b84-a4a1-6f63c3810607"
        },
        {
          "ID": 732,
          "email": "oismail@renmoney.com",
          "fullname": "Oriola Babatunde Ismail",
          "XeroContactID": "5c82fdc2-7092-4ef3-b7b5-df4965a6eaad"
        },
        {
          "ID": 733,
          "email": "muyiwa.olaopa@fleetpartners.ng",
          "fullname": "Olaopa Muyiwa samson",
          "XeroContactID": "0112875e-3e6c-42bd-95a7-133df5906143"
        },
        {
          "ID": 734,
          "email": "ayobami.abunsango@siemens.com",
          "fullname": "Abunsango Niniola Ayobami",
          "XeroContactID": "136282d1-1ba4-44d8-b4ec-4cf341cb797c"
        },
        {
          "ID": 735,
          "email": "okomeemmanuel@gmail.com",
          "fullname": "Emmanuel Nduka Okome",
          "XeroContactID": "d565f5a2-8510-404d-9972-11a3e782dcff"
        },
        {
          "ID": 736,
          "email": "emmaokorie43@gmail.com",
          "fullname": "Okorie Chinyere Emmanuel",
          "XeroContactID": "d60dbe6e-4dbd-4f3e-979a-e06d95c689bb"
        },
        {
          "ID": 737,
          "email": "sabutu@x3leasing.com",
          "fullname": "Abutu samuel",
          "XeroContactID": "699f6085-8eef-460c-b587-dea4e634c607"
        },
        {
          "ID": 738,
          "email": "ifeanyipeterokonkwo@gmail.com",
          "fullname": "Okonkwo Peter Ifeanyi",
          "XeroContactID": "792e5093-9bd0-48fe-878f-3e645c58a5db"
        },
        {
          "ID": 739,
          "email": "estyby2k3@yahoo.com",
          "fullname": "Atomode Ebunoluwa Esther",
          "XeroContactID": "8dfb37a9-5bf4-4a2b-801d-0382e7a661f0"
        },
        {
          "ID": 740,
          "email": "Vicsmart@gmail.com",
          "fullname": "Victoria Ubi Okpokwu",
          "XeroContactID": "a385c71c-03b4-46e3-8135-a6f4489de6cd"
        },
        {
          "ID": 741,
          "email": "FrankEkeh@gmail.com",
          "fullname": "Azuka Frank Ekeh",
          "XeroContactID": "4cdb54a9-ce7e-4dd9-8eb5-b6e9651b6879"
        },
        {
          "ID": 742,
          "email": "nseabasiasuquo@gmail.com",
          "fullname": "Asuquo Inyang Nseabasi",
          "XeroContactID": "44cc43bd-b9a5-4197-beba-514cbd2a3305"
        },
        {
          "ID": 743,
          "email": "michaelolajiga@yahoo.com",
          "fullname": "Olajiga Adebayo Michael",
          "XeroContactID": "61fd46aa-51ff-42e7-a16d-a1c81d98f337"
        },
        {
          "ID": 744,
          "email": "fatainurudeenomotayo@gmail.com",
          "fullname": "Omotayo fatai Nurudeen",
          "XeroContactID": "2c716c27-271f-4c95-9dff-fe64374e6a2b"
        },
        {
          "ID": 745,
          "email": "ifeoluwapo.folayan@crusaderpensions.com",
          "fullname": "Folayan Temitope Ifeoluwapo",
          "XeroContactID": "7846fe7d-d3ea-428f-beb1-006a47d5cbd7"
        },
        {
          "ID": 746,
          "email": "Olygabriel2014@gmail.com",
          "fullname": "Oluchi Theresa Ikechukwu",
          "XeroContactID": "cca31f24-bc2a-4cc1-9ed0-3623cd76546f"
        },
        {
          "ID": 747,
          "email": "vm.bisadvisory@gmail.com",
          "fullname": "Ekanem mfon victoria",
          "XeroContactID": "13c033fd-166e-4b78-bdc8-7160b144c669"
        },
        {
          "ID": 748,
          "email": "princewill.utchay@fortuneenergyservices.ng",
          "fullname": "Utchay prime chinese princewill",
          "XeroContactID": "93f9f478-010c-40b7-b12d-37811d013ecc"
        },
        {
          "ID": 749,
          "email": "kunleenikan@yahoo.com",
          "fullname": "Enikanoselu Olaniyi Ayyokunle",
          "XeroContactID": "05f1e350-a036-4389-a40f-68cf5f347139"
        },
        {
          "ID": 750,
          "email": "Jalex2010@yahoo.com",
          "fullname": "James Jalex Alexander",
          "XeroContactID": "737e3b92-2208-47f1-a5e5-f90097be6533"
        },
        {
          "ID": 751,
          "email": "olurotimio@letshego.com",
          "fullname": "Olurotimi Akinwande Oluseyi",
          "XeroContactID": "7ddfa37c-00c9-4f94-9043-da80f26093e5"
        },
        {
          "ID": 752,
          "email": "Florence.ojo@ihstowers.com",
          "fullname": "Niyi-OJo Florence",
          "XeroContactID": "6b6c89ae-6c4d-4b4a-be0f-58122022b5c9"
        },
        {
          "ID": 753,
          "email": "afolayan95@gmail.com",
          "fullname": "Temitope Afolayan",
          "XeroContactID": "bea09559-fc0f-47ec-9239-82804c675539"
        },
        {
          "ID": 754,
          "email": "akpoughjoseph@gmail.com",
          "fullname": "Joseph Akpough",
          "XeroContactID": "c92189e9-d93d-44cf-8a4e-e9202f5bbf11"
        },
        {
          "ID": 755,
          "email": "adegeyeseyi@gmail.com",
          "fullname": "Adegeye Oluseyi Opeyemi",
          "XeroContactID": "f6b48cda-b58e-4cab-8846-bf95442f4bea"
        },
        {
          "ID": 756,
          "email": "Kenneth.e@kadickintegrated.com",
          "fullname": "Emeka Nnawuihe Kenneth",
          "XeroContactID": "897d7560-844c-4de1-acb5-ddb6dae6cfe5"
        },
        {
          "ID": 757,
          "email": "chrisqueen@x3leasing.co",
          "fullname": "Chrisqueen Chinenyenwa Ibezimakor",
          "XeroContactID": "8f40576c-de9d-4758-b46b-9d6a05636624"
        },
        {
          "ID": 758,
          "email": "wrightrichie224@gmail.com",
          "fullname": "Ottun Oluwakemi Richard",
          "XeroContactID": "65c8f176-928b-42ee-b115-5c4dc036e2a2"
        },
        {
          "ID": 759,
          "email": "adetoyeseb@gmail.com",
          "fullname": "Badmus Adetoyose",
          "XeroContactID": "1e31ab63-f892-41d7-b596-d8a13cf4926d"
        },
        {
          "ID": 760,
          "email": "onyeka.ofunne@firs.gov.ng",
          "fullname": "Ofunne Chiazor Onyeka",
          "XeroContactID": "642fdf11-0368-407d-8963-198f998d1a9e"
        },
        {
          "ID": 761,
          "email": "vagbeluyi@polarisbanklimited.com",
          "fullname": "Agbeluyi victor olufemi",
          "XeroContactID": "48f186d4-6fb4-43fe-a395-f7a88cd636da"
        },
        {
          "ID": 762,
          "email": "princeayotng@yahoo.com",
          "fullname": "Adebola Ayo Ogayemi",
          "XeroContactID": "6815ed6a-b73d-4088-8576-93dcfebb6662"
        },
        {
          "ID": 763,
          "email": "aazeez@wagpco.com",
          "fullname": "Azeez Adeola Jamaal",
          "XeroContactID": "2f65247c-98d3-47ee-8806-92a6450c1d9f"
        },
        {
          "ID": 764,
          "email": "Saytonyjustin@gmail.com",
          "fullname": "Tony Onyewuchi Justin",
          "XeroContactID": "a3a24bef-8b30-467d-864a-868e1580e1e8"
        },
        {
          "ID": 765,
          "email": "Shuaib.Salau@yahoo.com",
          "fullname": "Shuaib Ojo Salau",
          "XeroContactID": "f5f60284-282d-488a-98e5-c742d477d933"
        },
        {
          "ID": 766,
          "email": "KwanahwahPolku@gmail.com",
          "fullname": "polku Kwanahwah",
          "XeroContactID": "74aa797a-e81c-49b2-a4a3-9dc6a26bbeef"
        },
        {
          "ID": 767,
          "email": "Igwegeorge@yahoo.com",
          "fullname": "George Samuel Igwe",
          "XeroContactID": "f704cc84-8b35-4073-ae5f-4ec5cea5a1e9"
        },
        {
          "ID": 768,
          "email": "adejokeadelekeologbosere1234@gmail.com",
          "fullname": "Ologbosere Adejoke Sojot Golden Adejoke",
          "XeroContactID": "53c9e018-82f4-4072-9b1f-b1ba91a636cb"
        },
        {
          "ID": 769,
          "email": "foluwoye@x3leasing.com",
          "fullname": "Oluwoye Matthew Funminiyi",
          "XeroContactID": "c51ceb5b-3cde-45fd-a80b-0fd4ceeee008"
        },
        {
          "ID": 770,
          "email": "olusoga.ope-ewe@crusaderpensions.com",
          "fullname": "Ope ewe Oluwole Olusoga",
          "XeroContactID": "84bc9c1c-94e4-4993-9689-e3f59b156503"
        },
        {
          "ID": 771,
          "email": "chukwuma@ctsltd-ng.com",
          "fullname": "Amanwa Raphael Chukwuma",
          "XeroContactID": "be5b9e74-c946-436e-afe5-14aa12b41c4f"
        },
        {
          "ID": 772,
          "email": "kayode.owolabi@mtn.com",
          "fullname": "Owolabi olukayode",
          "XeroContactID": "5b890187-796e-4b5c-9d54-6fcc2ad9cc01"
        },
        {
          "ID": 773,
          "email": "Michael.odebo@gloworld.com",
          "fullname": "Odebo Abiodun michael",
          "XeroContactID": "c968eba9-bfe1-4c9c-9409-175664bbedc8"
        },
        {
          "ID": 774,
          "email": "NyihembaRonald@gmail.com",
          "fullname": "Ronald Nyihemba",
          "XeroContactID": "b7e37816-568c-47ff-95e4-71904cc98d94"
        },
        {
          "ID": 775,
          "email": "oyinade.adeosun@desicongroup.com",
          "fullname": "Adeosun esther Oyinade",
          "XeroContactID": "107f641b-33bf-4601-a765-c74f278d452a"
        },
        {
          "ID": 776,
          "email": "josephinesalifu2@gmail.com",
          "fullname": "Josephine Achenyo Salifu",
          "XeroContactID": "c72bf320-a9f1-468f-b720-c166ed4cab1f"
        },
        {
          "ID": 777,
          "email": "abiodun@atbtechsoft.com",
          "fullname": "Abiodun Atobatele",
          "XeroContactID": "d15b2f4b-d6c5-40c1-998c-90b388dd62b9"
        },
        {
          "ID": 778,
          "email": "izuka.nwanze@asoplc.com",
          "fullname": "nwanze izuka friday",
          "XeroContactID": "357de382-f703-4d39-a798-133e7837a1df"
        },
        {
          "ID": 779,
          "email": "oke.bamidele@yahoo.com",
          "fullname": "Oke bamidele adekunle",
          "XeroContactID": "fbd2aa41-dc0c-46a7-9c1b-712cbf440d1e"
        },
        {
          "ID": 780,
          "email": "latobatele@ecobank.com",
          "fullname": "Atobatele hakeem olanrewaju",
          "XeroContactID": "37acb09d-26f5-481e-b136-1c16939391c3"
        },
        {
          "ID": 782,
          "email": "clement.emovon@citibank.com",
          "fullname": "Clement Etumudon Emovon",
          "XeroContactID": "952f7dae-5904-43f1-9096-b92a6a24f1d5"
        },
        {
          "ID": 783,
          "email": "omotinuolawe.harrison@fidelitybank.ng",
          "fullname": "Harrison Titilolami omotinuolawe",
          "XeroContactID": "88b63c6d-c74c-490e-b86f-53fd3084e30c"
        },
        {
          "ID": 784,
          "email": "FUNMILAYOO2@mybet9ja.com",
          "fullname": "Oguntoyinbo funmilayo ayodeji",
          "XeroContactID": "3f3db8f5-1f3a-46a4-92b7-59176dff3ed9"
        },
        {
          "ID": 785,
          "email": "lateef.abioye@stanbicibtc.com",
          "fullname": "Abioye Akanni Lateef",
          "XeroContactID": "78226366-46d7-4fb6-94ed-d045f699c91e"
        },
        {
          "ID": 786,
          "email": "tundeajax@gmail.com",
          "fullname": "Ajakaiye felix babatunde",
          "XeroContactID": "075ee1e1-f18d-4272-92c5-3c7519ed740f"
        },
        {
          "ID": 787,
          "email": "bunmiolumotanmi@gmail.com",
          "fullname": "Konu Omotayo oluwabunmi",
          "XeroContactID": "f434c23d-82ad-42b4-ae45-880a11c3a05e"
        },
        {
          "ID": 788,
          "email": "iyataramijenrola@yahoo.com",
          "fullname": "Ajibola dimarish yejide",
          "XeroContactID": "221c37c6-e58b-4662-9538-1eee6c37d76a"
        },
        {
          "ID": 789,
          "email": "banibi@finatrustmfbank.com",
          "fullname": "Anibi Busola Temitope",
          "XeroContactID": "a67b0040-50c3-4066-b0b8-e9f40eebc2fe"
        },
        {
          "ID": 790,
          "email": "ukaegbu.ec@pg.com",
          "fullname": "Ukaegbu Chigozie Eucharia",
          "XeroContactID": "3765b00e-665b-4c62-8eb6-0a62df506603"
        },
        {
          "ID": 791,
          "email": "Adeniyi.atekoja@stanbicibtc.com",
          "fullname": "Atekoja Adeniyi Ganiyu",
          "XeroContactID": "62ccb548-f8a6-47d7-8209-fcfe83698703"
        },
        {
          "ID": 792,
          "email": "okebugwuchimaraoke@yahoo.com",
          "fullname": "Chimaraoke Okegbugwu",
          "XeroContactID": "aee26133-5f3a-42f2-a563-7136df87fe5f"
        },
        {
          "ID": 793,
          "email": "francisnkanta@gmail.com",
          "fullname": "Francis Efiok Nkanta",
          "XeroContactID": "6fce9e3d-6e71-45dd-9182-939415b003c1"
        },
        {
          "ID": 794,
          "email": "agatsenathaniel@yahoo.com",
          "fullname": "Nathaniel Nathan Agbatse",
          "XeroContactID": "e2a755bd-93ab-445d-b80e-83927649677c"
        },
        {
          "ID": 795,
          "email": "kennethoh@futureconcerns.com",
          "fullname": "Ohiorenoya Ohikhokhai Kenneth",
          "XeroContactID": "265f601d-7649-4bda-8363-e55a022f1094"
        },
        {
          "ID": 796,
          "email": "dazuchi98@yahoo.co.uk",
          "fullname": "Austine Azubike Akpe",
          "XeroContactID": "05273c5a-62f4-4d3a-aa30-893aa26bdfc5"
        },
        {
          "ID": 797,
          "email": "oladipoolusegun@foursquarepublishers.com",
          "fullname": "Olusegun Jacob Oladipo",
          "XeroContactID": "394e3ac3-5502-47b6-81fb-f5e7df03ab77"
        },
        {
          "ID": 798,
          "email": "arinze_79@yahoo.com",
          "fullname": "Johnpaul Arinze Uzoh",
          "XeroContactID": "1454fefe-b814-4be1-8386-20377b2a65cc"
        },
        {
          "ID": 799,
          "email": "isefam15@gmail.com",
          "fullname": "Imoh Silas Ekpo",
          "XeroContactID": "dead9b7c-7eb6-4ee0-9814-d0ec3e213790"
        },
        {
          "ID": 801,
          "email": "peaceto4luv@gmail.com",
          "fullname": "Peace Emem Udoh",
          "XeroContactID": "752c8554-bd62-4fe7-8024-de4b62273d9b"
        },
        {
          "ID": 802,
          "email": "omotayo.aroyewun@ubagroup.com",
          "fullname": "Omotayo Wasiu Aroyewun",
          "XeroContactID": "989e3e77-3339-48d8-942d-e5f38424226e"
        },
        {
          "ID": 803,
          "email": "okwunmi.oludimine@gmail.com",
          "fullname": "Olawunmi Mary Oludimine",
          "XeroContactID": "db3a3f36-ac53-4df4-8555-6d76d6be48c0"
        },
        {
          "ID": 804,
          "email": "johnjamesojodale@gmail.com",
          "fullname": "James Ojodale John",
          "XeroContactID": "0c26c5f7-adac-4b14-a7f0-a23394c6b823"
        },
        {
          "ID": 805,
          "email": "Christian.onuoha@gmail.com",
          "fullname": "Onuoha Chukwuma Christian",
          "XeroContactID": "0dd554c0-e75f-4735-a145-f209c593f891"
        },
        {
          "ID": 806,
          "email": "bamideleosuntusa@gmail.com",
          "fullname": "Bamidele Ademola Osuntusa",
          "XeroContactID": "7305e90e-0fd4-4b8b-8bb2-5acb89a97634"
        },
        {
          "ID": 807,
          "email": "idrisauwalumar@yahoo.com",
          "fullname": "Auwal Umar Idris",
          "XeroContactID": "d43362b7-7dd5-447b-9d18-b6d0e01be951"
        },
        {
          "ID": 808,
          "email": "tb2_ade@yahoo.com",
          "fullname": "Adeniyi Olusegun Adewale",
          "XeroContactID": "6604cd25-9ae0-47e9-8f61-cd88d56f1266"
        },
        {
          "ID": 809,
          "email": "oluwasina90@gmail.com",
          "fullname": "Alabi Ogundeji Oluwasina Michael",
          "XeroContactID": "9e328fc3-6ca4-48d2-81b0-f54bb105990c"
        },
        {
          "ID": 810,
          "email": "Akintola.balogun@dangote.com",
          "fullname": "balogun minkaila akintola",
          "XeroContactID": "5b6a9825-4316-47e9-8273-d6ca889d1838"
        },
        {
          "ID": 811,
          "email": "opraufu@unionbankng.com",
          "fullname": "Raufu Patience Oluwaseyi",
          "XeroContactID": "499f70e9-9930-4b2a-90b0-29f5d9a9e4e5"
        },
        {
          "ID": 812,
          "email": "jacobkucha40@gmail.com",
          "fullname": "Kucha Jacob Gaazo",
          "XeroContactID": "7d83eab4-865b-4d9f-87c5-1afc1d1bbc93"
        },
        {
          "ID": 813,
          "email": "theodanju@gmail.com",
          "fullname": "Ubimago Theophilus Danjuma",
          "XeroContactID": "6e1fccf4-e6d2-4953-88e0-f0a687ab955f"
        },
        {
          "ID": 814,
          "email": "oladapo.famodun@vidicon.ng",
          "fullname": "Famodun Anthony Oladapo",
          "XeroContactID": "d3e3dcca-c12a-4e2f-93bb-7e74a1ab6608"
        },
        {
          "ID": 815,
          "email": "itaukemeabasi2@gmail.com",
          "fullname": "Ukemeabasi2 Favour2 Ita2",
          "XeroContactID": "d7a62b29-8139-484e-a48f-452f98b282db"
        },
        {
          "ID": 816,
          "email": "peterendurance82@yahoo.com",
          "fullname": "Endurance Peter",
          "XeroContactID": "11f78eb6-b5e0-41da-95c7-d047671a18b5"
        },
        {
          "ID": 817,
          "email": "seunoluola@gmail.com",
          "fullname": "Olaleye Jude Oluwaseun",
          "XeroContactID": "02cd16d5-5e85-4fe0-992a-d50fdb340c95"
        },
        {
          "ID": 818,
          "email": "David.lanre-leke@gloworld.com",
          "fullname": "Lanre-Leke David",
          "XeroContactID": "3997ff8d-7ac2-4cf4-b2ce-4db987873231"
        },
        {
          "ID": 819,
          "email": "emmaisy@gmail.com",
          "fullname": "Isimah Isioma Emmanuel",
          "XeroContactID": "8877859f-c843-403e-8bb5-abdae055eab1"
        },
        {
          "ID": 820,
          "email": "akohsamsonomale@yahoo.com",
          "fullname": "Samson Omale Akoh",
          "XeroContactID": "63d3d047-685e-499b-b54d-f1f55c95aab9"
        },
        {
          "ID": 821,
          "email": "ajanaku.omoyeni@gmail.com",
          "fullname": "Ajanaku omoyeni oluwatomilola",
          "XeroContactID": "ea716266-7e40-496a-a300-cca074290462"
        },
        {
          "ID": 822,
          "email": "arojah1@yahoo.com",
          "fullname": "Olugbenga Micheal Ogun",
          "XeroContactID": "cf0dbac4-cc6a-4d89-a9df-d5a51295f6e9"
        },
        {
          "ID": 823,
          "email": "suleelojorabbi@yahoo.com",
          "fullname": "Rabbi Eleojo Sule",
          "XeroContactID": "28dd2814-5094-4d3c-b7d2-07fba470185b"
        },
        {
          "ID": 824,
          "email": "ilemobola.williams@gmail.com",
          "fullname": "Williams Temitope Abimbola",
          "XeroContactID": "cf5ee00b-39c5-4a52-a9e5-4ffd80cdc8f1"
        },
        {
          "ID": 825,
          "email": "blessing.ugbo@ubagroup.com",
          "fullname": "Ugbo Nneka Blessing",
          "XeroContactID": "ff112a50-0197-4a2c-85be-bbaa504c98b3"
        },
        {
          "ID": 826,
          "email": "eseehizogie@yahoo.com",
          "fullname": "aigbokan eseohe grace",
          "XeroContactID": "41da8290-57cb-4f52-9158-fba2fdd0dcbd"
        },
        {
          "ID": 827,
          "email": "raphael@bluediamondsmcs.com.ng",
          "fullname": "Raphael Chukwubueze Chukwujekwu",
          "XeroContactID": "18b4fe51-1666-4cdd-bcff-3e5e96f32711"
        },
        {
          "ID": 829,
          "email": "Fred.eluromma@outlook.com",
          "fullname": "eluromma abialor fred",
          "XeroContactID": "5c467b2b-e10b-4317-97eb-275c04328bfe"
        },
        {
          "ID": 830,
          "email": "tanthony@renmoney.com",
          "fullname": "thomas uzodinma anthony",
          "XeroContactID": "1df517b6-e749-4e90-a99d-65497bea4e1d"
        },
        {
          "ID": 831,
          "email": "Temitope.sodeinde@yahoo.com",
          "fullname": "Sodeinde Titilayo temitope",
          "XeroContactID": "fa806131-bba1-49d4-bff3-67a91f8c7ee7"
        },
        {
          "ID": 832,
          "email": "alistbranding@gmail.com",
          "fullname": "Alist (Osazee) Agent Global link (Otasowie",
          "XeroContactID": "f37331be-cb57-4078-b06e-5809eb5c4e73"
        },
        {
          "ID": 833,
          "email": "awawu.aliyu@alphabetallp.com",
          "fullname": "Aliyu suleiman awawu",
          "XeroContactID": "4290458a-9c9f-4ce3-88d3-aae1b84df530"
        },
        {
          "ID": 834,
          "email": "adedoyindammy@yahoo.com",
          "fullname": "Benjamin Adedamola Adedoyin",
          "XeroContactID": "6a42fd1f-7827-45c0-85c0-6d51b0b6ae4d"
        },
        {
          "ID": 835,
          "email": "samuelokubeoga@gmail.com",
          "fullname": "Okibe Samuel Oga",
          "XeroContactID": "293c4d93-21a9-4638-9b95-f5e5ffa72c3c"
        },
        {
          "ID": 836,
          "email": "kanu_one@yahoo.com",
          "fullname": "alawode francis ajibola",
          "XeroContactID": "2824dce9-5b57-4f38-b904-93f7c15badd7"
        },
        {
          "ID": 837,
          "email": "calebabbah@gmail.com",
          "fullname": "Abba Ojodomo Caleb",
          "XeroContactID": "c7486051-ccbb-4dd7-81fc-37eccc11649a"
        },
        {
          "ID": 838,
          "email": "deloris.stephen@gmail.com",
          "fullname": "Deloris Daring Stephen",
          "XeroContactID": "3d054b74-625e-46ea-9de1-a85456dbd0b3"
        },
        {
          "ID": 839,
          "email": "usoro70@yahoo.com",
          "fullname": "usoro tobby okon",
          "XeroContactID": "c9d192a3-67e3-4381-94fb-b9959870ad70"
        },
        {
          "ID": 840,
          "email": "endyogu@yahoo.com",
          "fullname": "Endurance Ogu Egbe",
          "XeroContactID": "9d67e30b-5643-4009-b1b2-f594c2ae3c72"
        },
        {
          "ID": 841,
          "email": "chinenye.mbah@trustbondmortgagebankplc.com",
          "fullname": "Mbah Nkechi chinenye",
          "XeroContactID": "a016917a-c989-4e7e-aa39-acea4df5a5f2"
        },
        {
          "ID": 842,
          "email": "peverjohn@yahoo.com",
          "fullname": "Iorgbide John Pever",
          "XeroContactID": "d29734a2-c84b-4bf4-868b-0dab7d9d9518"
        },
        {
          "ID": 843,
          "email": "babtundeolowomeye@gmail.com",
          "fullname": "Babatunde Babalola Olowomeye",
          "XeroContactID": "48936994-414d-47e1-ae36-62477933cf4f"
        },
        {
          "ID": 844,
          "email": "Adeniyi.yusuf@totalhealthtrust.com",
          "fullname": "Yusuf Adeniyi Akeem",
          "XeroContactID": "8d0c9ba2-b8e9-49b6-af71-5a8cdab036ac"
        },
        {
          "ID": 845,
          "email": "tala2maria@gmail.com",
          "fullname": "Adamu Talatu Maria",
          "XeroContactID": "8f7c2db8-58fb-43db-8897-cbfbdb78e4a8"
        },
        {
          "ID": 846,
          "email": "onafeso.lawrence@gmail.com",
          "fullname": "Lawrence Adeleke Onafeso",
          "XeroContactID": "2d50f61e-e12d-48b0-b11e-432c7f0f5141"
        },
        {
          "ID": 847,
          "email": "seyi.johnson@goldentulip.com",
          "fullname": "Johnson damilola oluwaseyi",
          "XeroContactID": "f07033d0-162f-4bd4-91fb-690073e3fbfd"
        },
        {
          "ID": 848,
          "email": "Augustine.nziroma@ubagroup.com",
          "fullname": "Nzimora Augustine",
          "XeroContactID": "1fecc25f-e712-48d4-8fb9-ebb455197ad1"
        },
        {
          "ID": 849,
          "email": "olanikeakande@gmail.com",
          "fullname": "Ajayi elizabeth Olanike",
          "XeroContactID": "3a9bc924-b54d-44e0-a1e3-5a9ea46820d0"
        },
        {
          "ID": 850,
          "email": "aabdullahi.58@gmail.com",
          "fullname": "Abdullahi Nma Ahmed",
          "XeroContactID": "eee3ca3c-b3b4-4eeb-aac3-01183c5e21a0"
        },
        {
          "ID": 851,
          "email": "felimac9@gmail.com",
          "fullname": "Ransome macrran felicia",
          "XeroContactID": "bc8cadd1-fa51-4c96-ba8e-2d1a698f5b58"
        },
        {
          "ID": 852,
          "email": "Adebola.bunmi@oasisminers.com",
          "fullname": "Adebola Rebecca Oluwbunmi",
          "XeroContactID": "581f0874-ee44-4b92-8434-5324a0d45d63"
        },
        {
          "ID": 853,
          "email": "asipaogun@yahoo.com",
          "fullname": "Kunle Ayodeji Olatunji",
          "XeroContactID": "5b18132a-031f-447b-b74a-2f67c7267447"
        },
        {
          "ID": 854,
          "email": "ananimama@yahoo.com",
          "fullname": "Adu Ajikan Augustina",
          "XeroContactID": "0fd1ed58-59b7-4215-805c-fa76ad2d846e"
        },
        {
          "ID": 855,
          "email": "omobukola.ajayi@accessbankplc.com",
          "fullname": "Ajayi Suzanah Omobukola",
          "XeroContactID": "c18d7af3-3632-49fb-bc57-cd7a047b3fd6"
        },
        {
          "ID": 856,
          "email": "piusanwam@gmail.com",
          "fullname": "Anwam Odey Pius",
          "XeroContactID": "78628e4a-2ff7-4dad-b276-8e0d49670fc1"
        },
        {
          "ID": 857,
          "email": "Sunday.akano@ekedp.com",
          "fullname": "Akano Sunday Adeyemi",
          "XeroContactID": "0febe0ac-ae70-4acd-ba68-533994610544"
        },
        {
          "ID": 858,
          "email": "foac@chevron.com",
          "fullname": "fatai Oluwashina Oluyede",
          "XeroContactID": "fdd38612-455f-4184-bec0-49a53b7e1d54"
        },
        {
          "ID": 859,
          "email": "kokorehjeanyao@gmail.com",
          "fullname": "Yao Kokoreh Jean-Felicien",
          "XeroContactID": "6e655e78-7218-4136-a36d-f2d202636297"
        },
        {
          "ID": 860,
          "email": "olusholaodujebe@yahoo.co.uk",
          "fullname": "Michaels Akinwunmi Olushola",
          "XeroContactID": "85d00bb8-a9d1-4e69-ab0a-ccbe3e2396db"
        },
        {
          "ID": 861,
          "email": "sholaadeyemi@yahoo.com",
          "fullname": "Adeyemi Oludare shola",
          "XeroContactID": "5daad72f-001a-48bb-813b-f750357521fd"
        },
        {
          "ID": 862,
          "email": "charlesadekoya@keystonebankng.com",
          "fullname": "Charles Adewale Adekoya",
          "XeroContactID": "a0c806dc-d3ca-4416-9a68-f4f91b203ee0"
        },
        {
          "ID": 863,
          "email": "ademola.a.alagbe@firstbanknigeria.com",
          "fullname": "Ademola Afolabi Alagbe",
          "XeroContactID": "7596d84d-5002-4786-8a1f-6f919264ddfe"
        },
        {
          "ID": 864,
          "email": "yetundeshoyombo@gmail.com",
          "fullname": "Elizabeth Yetunde Shoyombo",
          "XeroContactID": "f387a376-ae43-478a-92fc-0d7a84db1257"
        },
        {
          "ID": 866,
          "email": "uko.s.orok@exxonmobil.com",
          "fullname": "Uko Samuel Orok",
          "XeroContactID": "2f6c2c62-642e-472a-a185-742c9a0b2f4d"
        },
        {
          "ID": 867,
          "email": "adekojo145@yahoo.com",
          "fullname": "Ojo Adekunle Muyideen",
          "XeroContactID": "0fc6cb72-6341-4c01-a3e0-05247f178cf9"
        },
        {
          "ID": 868,
          "email": "abdulganiyuibrahim@yahoo.com",
          "fullname": "Ibrahim Shola Abdulganiyu",
          "XeroContactID": "1aa69c11-0172-4298-af03-54cb8734cd20"
        },
        {
          "ID": 869,
          "email": "fasasiq@gmail.com",
          "fullname": "Fasasi Qaseem Olajide",
          "XeroContactID": "add9589a-5b66-48cd-82c8-33b222ff40e7"
        },
        {
          "ID": 870,
          "email": "marilanbestluck@yahoo.com",
          "fullname": "Judith Okon Austin",
          "XeroContactID": "b3ce3120-4492-4795-8a98-519936e2f977"
        },
        {
          "ID": 871,
          "email": "cadns2006@yahoo.com",
          "fullname": "Ajayi victor Tejuola",
          "XeroContactID": "fc9f27c7-2622-4eb5-be9f-b4d716200e6c"
        },
        {
          "ID": 872,
          "email": "usa3318@gmail.com",
          "fullname": "Abubakar Shehu Usman",
          "XeroContactID": "0e588c32-8071-4dcd-87a8-cab0981a66e2"
        },
        {
          "ID": 873,
          "email": "veekaaisaac@gmail.com",
          "fullname": "Isaac Aondoaseer Veekaa",
          "XeroContactID": "f4e64383-7ac9-4053-93ac-939c4cbd757a"
        },
        {
          "ID": 874,
          "email": "Adeyemo.gideon@oasisminers.com",
          "fullname": "Adeyemo Gideon adeonipekun",
          "XeroContactID": "fec79235-1f3c-4b0d-945f-6ca9ee15a0ca"
        },
        {
          "ID": 876,
          "email": "bmordii@gmail.com",
          "fullname": "Bobby Ikechukwu Mordi",
          "XeroContactID": "70a8a468-4d2c-4dc4-b07e-66103c1fb2fa"
        },
        {
          "ID": 877,
          "email": "austineefu@gmail.com",
          "fullname": "Egrinya Augustine Inyamagem",
          "XeroContactID": "5de505c9-2063-4565-89d7-7ab641a856fe"
        },
        {
          "ID": 878,
          "email": "tapevtiv@yahoo.com",
          "fullname": "Terhemba Apevtiv",
          "XeroContactID": "f659b716-9b33-4b6c-9ee0-a0fc03d28d4f"
        },
        {
          "ID": 880,
          "email": "corfaj74@gmail.com",
          "fullname": "Fajoye fluemumor cordelia",
          "XeroContactID": "df9e6a59-5a13-40d6-8952-f1595ad40052"
        },
        {
          "ID": 881,
          "email": "olatunde_olatunji@bat.com",
          "fullname": "Olatunde Akanni Olatunji",
          "XeroContactID": "1832fd8a-a5a6-40df-b015-68a62b0d9352"
        },
        {
          "ID": 882,
          "email": "nnahluv4real@gmail.com",
          "fullname": "Nnah Akpan Monday",
          "XeroContactID": "b6cc1130-c9dc-4767-89f5-7d064a7434db"
        },
        {
          "ID": 883,
          "email": "eajibola99@yahoo.com",
          "fullname": "Obakin emmanuel ajibola",
          "XeroContactID": "29187fa9-a2c8-4825-b73e-bec87226c97f"
        },
        {
          "ID": 884,
          "email": "Kenneth.opute@apmterminals.com",
          "fullname": "Opute kenneth uchechukwu",
          "XeroContactID": "a7120527-05a9-42ef-9f11-f7e944c3ca30"
        },
        {
          "ID": 885,
          "email": "danieladams227@gmail.com",
          "fullname": "Adamu Daniel Danlami",
          "XeroContactID": "be6d5a5a-2e90-478b-8c4f-b3d3859dc451"
        },
        {
          "ID": 886,
          "email": "Oluwafemi.okhuoya@accessbankplc.com",
          "fullname": "Okhuoya matthew oluwafemi",
          "XeroContactID": "9128c749-eeea-4037-8e3f-6c702c255df1"
        },
        {
          "ID": 887,
          "email": "conrad.ifode@crusaderpensions.com",
          "fullname": "Ifode imoniubgra conrad",
          "XeroContactID": "236ae0ab-6553-470c-99ac-3388975cb817"
        },
        {
          "ID": 888,
          "email": "terlumunmartins@yahoo.com",
          "fullname": "Joshua Terlumun Martins",
          "XeroContactID": "dfdd142b-f04d-4c64-8e84-b399447f48a4"
        },
        {
          "ID": 889,
          "email": "isa.ocheme@yahoo.com",
          "fullname": "Isa Ocheme",
          "XeroContactID": "6f41eb9b-9810-4503-aab4-d1d4563648a5"
        },
        {
          "ID": 890,
          "email": "joedzungwe@gmail.com",
          "fullname": "Joseph Msuakor Dzungwe",
          "XeroContactID": "9179e0d2-1ef0-4df6-bdae-bed05f53efb0"
        },
        {
          "ID": 891,
          "email": "kidenyi@providusbank.com",
          "fullname": "Idenyi Ojodale kennedy",
          "XeroContactID": "75624a1f-e7a2-4b50-be3a-8511fb81e584"
        },
        {
          "ID": 892,
          "email": "fedelisotse7@gmail.com",
          "fullname": "Fidelis Otse John",
          "XeroContactID": "791959a6-208a-41cb-a076-672392909135"
        },
        {
          "ID": 893,
          "email": "bada.luqman@fcmb.com",
          "fullname": "Luqman Oladimeji Bada",
          "XeroContactID": "fde973df-4dd5-458c-8c08-b2c677c24287"
        },
        {
          "ID": 894,
          "email": "padeluka@crestechengineering.com",
          "fullname": "Toyin Patrick Adeluka",
          "XeroContactID": "fbe12383-7f32-44a3-a48d-f438c8bd74c5"
        },
        {
          "ID": 895,
          "email": "afola.abolarinwa@gmail.com",
          "fullname": "Folashade Deborah Abolarinwa",
          "XeroContactID": "9991b743-48f5-48e7-9b9b-37771a347716"
        },
        {
          "ID": 896,
          "email": "femiband2272@yahoo.com",
          "fullname": "Oluwafemi Ibrahim Usman",
          "XeroContactID": "c6dfb3fe-a355-4978-877b-51d0b1958270"
        },
        {
          "ID": 897,
          "email": "nmataphilip@yahoo.com",
          "fullname": "Philip Onuora Nmata",
          "XeroContactID": "79db39f7-591e-4848-9622-af6e866bdad0"
        },
        {
          "ID": 898,
          "email": "chavlyon33@yahoo.com",
          "fullname": "Charles Okechukwu Egbe",
          "XeroContactID": "0ba49080-7169-424a-bd48-cb1466e18bb7"
        },
        {
          "ID": 899,
          "email": "uudenze@shipperscouncil.gov.ng",
          "fullname": "Udenze Udeaku ihuaku",
          "XeroContactID": "21cd4ded-8bcb-4571-8486-fe07ada8b1b7"
        },
        {
          "ID": 900,
          "email": "Christian.ihekaeme@gasgroupintl.com",
          "fullname": "Ihekaeme chinedu christian",
          "XeroContactID": "f238ba31-c41f-4bb8-a896-a9e1782560b9"
        },
        {
          "ID": 901,
          "email": "adamumadaki2020@yahoo.com",
          "fullname": "Tafarki Madaki Adams",
          "XeroContactID": "bb906e5f-0c0b-4256-9922-60362f9ef437"
        },
        {
          "ID": 902,
          "email": "okhakhuambrose2@gmail.com",
          "fullname": "Okhakumh Ambrose Okhakhu",
          "XeroContactID": "8c686099-10cc-42b8-88bf-5a3436a35a47"
        },
        {
          "ID": 903,
          "email": "amoduokeme@yahoo.com",
          "fullname": "Amodu Okeme",
          "XeroContactID": "55a59546-0ee5-4037-86cc-c2d5fcb59405"
        },
        {
          "ID": 904,
          "email": "flexstitches@gmail.com",
          "fullname": "Alex (Flexstiches) Asuelime",
          "XeroContactID": "abffbec8-c913-4bee-ac4d-0658bd870538"
        },
        {
          "ID": 905,
          "email": "Abigaelautin@gmail.com",
          "fullname": "Ebiyon Cole Austin",
          "XeroContactID": "9952834c-6458-4bae-8f64-d0e0152ed1f7"
        },
        {
          "ID": 906,
          "email": "nzemekejude@gmail.com",
          "fullname": "Nzemeke oby jude",
          "XeroContactID": "3d087a12-f7d3-49a4-9101-ba55ef0a7d96"
        },
        {
          "ID": 907,
          "email": "anchibenjamin@gmail.com",
          "fullname": "Terkaa Benjamin Anchi",
          "XeroContactID": "c814eb59-d340-43a8-a835-6f8eea60ed88"
        },
        {
          "ID": 908,
          "email": "tchsonn@gmail.com",
          "fullname": "Wilson Leonel Tchibenou",
          "XeroContactID": "035c14db-e9bc-4ae7-9fc6-4ee430a1cb66"
        },
        {
          "ID": 909,
          "email": "kelvin465@gmail.com",
          "fullname": "Kelvin Angbian Nyityo",
          "XeroContactID": "5155f9ca-0af7-4f02-9eb4-24e9df3c0bbc"
        },
        {
          "ID": 910,
          "email": "j-ojewoye@leadway.com",
          "fullname": "Ojewoye Babatunde james",
          "XeroContactID": "26520eb1-bd69-4a36-9d6b-bafaa8007e96"
        },
        {
          "ID": 911,
          "email": "afolabi.otubaga@dangote.com",
          "fullname": "Otubaga oluwole afolabi",
          "XeroContactID": "68740b57-fb06-4bb0-929c-89d3cfaa6e4c"
        },
        {
          "ID": 912,
          "email": "austebes@yahoo.com",
          "fullname": "Augustine Egbeyonoakpo Awor Erhabor",
          "XeroContactID": "d6ec9125-8251-4f78-872e-b0900007d34e"
        },
        {
          "ID": 913,
          "email": "angelbibi25@gmail.com",
          "fullname": "Bibiana Pius Udoh",
          "XeroContactID": "7bee603e-b598-4b50-b381-263a5e01af20"
        },
        {
          "ID": 914,
          "email": "seun23fb@yahoo.co.uk",
          "fullname": "Adesiyan abiola oluwaseun",
          "XeroContactID": "b495922d-043a-4c0e-90df-c9faf0b3f2d3"
        },
        {
          "ID": 915,
          "email": "otobong.umoh@westgatelifecare.com.ng",
          "fullname": "Umoh benjamin otobong",
          "XeroContactID": "568c8793-8113-49b8-a4b9-76a8827fffb7"
        },
        {
          "ID": 916,
          "email": "ngoyop2008@yahoo.com",
          "fullname": "Deborah Luka Wakari",
          "XeroContactID": "565c5bae-6d9d-4fe1-9b65-60a839fc198f"
        },
        {
          "ID": 918,
          "email": "Stanley.onwordi@oiltoolsafrica.com",
          "fullname": "Onwordi Ojore stanley",
          "XeroContactID": "a0d65cbc-9963-4c89-b924-87d147d7e5ec"
        },
        {
          "ID": 919,
          "email": "olowolarry3@gmail.com",
          "fullname": "Omolara Abiodun Akinyemi",
          "XeroContactID": "e2385d3c-d98b-4b16-90e6-0cc1c49f6194"
        },
        {
          "ID": 920,
          "email": "drolaniyan@gmail.com",
          "fullname": "Olaniyan Olawale Abdul-Rasaq",
          "XeroContactID": "4f5d1f6d-07bc-4a21-a068-3a4c82ae91b6"
        },
        {
          "ID": 921,
          "email": "princewill.amadi@asoplc.com",
          "fullname": "Amadi princewill",
          "XeroContactID": "7be8cc5b-9bba-4ff1-b6c4-5873fe4095e6"
        },
        {
          "ID": 922,
          "email": "obiora.ngwu@ubagroup.com",
          "fullname": "Ngwu Stephen obiora",
          "XeroContactID": "61506c13-2f74-4dbd-9bc3-d1be99ab6df1"
        },
        {
          "ID": 923,
          "email": "charlesonokala@gmail.com",
          "fullname": "Onokala charles chikwendu",
          "XeroContactID": "791b606e-733d-4029-b748-c495f302c70e"
        },
        {
          "ID": 924,
          "email": "Gabriel.latifu@oasisminers.com",
          "fullname": "Latifu gabriel",
          "XeroContactID": "f2173276-2df5-431e-add9-42b69601308d"
        },
        {
          "ID": 925,
          "email": "tenitalk2me@yahoo.com",
          "fullname": "Kayode James Olaniran",
          "XeroContactID": "bb47decb-396c-4db4-a990-a87ecda7a2ad"
        },
        {
          "ID": 926,
          "email": "Thompson.adedeji@firstbanknigeria.com",
          "fullname": "Adedeji Thompson Oluremi",
          "XeroContactID": "fedf2a87-5098-4abe-a313-7a51f0482d54"
        },
        {
          "ID": 927,
          "email": "ahonabraham@yahoo.com",
          "fullname": "Terver Abraham Ahon",
          "XeroContactID": "2a9bc16a-9c20-4111-844b-7afedd17884c"
        },
        {
          "ID": 928,
          "email": "Odada@x3leasing.com",
          "fullname": "DADA OLUSEGUN OLADIPO",
          "XeroContactID": "d8d8bad2-3143-400e-a244-7fa7e814cc5f"
        },
        {
          "ID": 929,
          "email": "stellambachu@yahoo.com",
          "fullname": "Stella Uchenna Mbachu",
          "XeroContactID": "c784ef5e-1daf-4c08-9149-b2716c299d80"
        },
        {
          "ID": 930,
          "email": "adebanjo.ibitoye@sterling.ng",
          "fullname": "Ibitoye Adebanjo Victor",
          "XeroContactID": "e6527e2d-300c-4ea4-95eb-b435f4b9fc65"
        },
        {
          "ID": 931,
          "email": "christopherokpanachi@gmail.com",
          "fullname": "Christopher Okpanachi Agahiu",
          "XeroContactID": "e167f073-27b6-4a00-9b03-8daa27c16fd2"
        },
        {
          "ID": 932,
          "email": "lydiaogunronbi@yahoo.com",
          "fullname": "Bunmi Lydia Ogunronbi",
          "XeroContactID": "6c9d0300-2c7e-4449-b139-50a93dc51ff5"
        },
        {
          "ID": 933,
          "email": "ctolulade@yahoo.com",
          "fullname": "cole adebola tolulade",
          "XeroContactID": "36916185-e970-488c-b63a-e2c419f0c682"
        },
        {
          "ID": 934,
          "email": "hsuleiman@shipperscouncil.govt.ng",
          "fullname": "suleiman mohammed husseini",
          "XeroContactID": "c86ae856-01ad-4f3c-8212-1d5c6b84bfd3"
        },
        {
          "ID": 935,
          "email": "abuhfelix3@gmail.com",
          "fullname": "Myom Felix Abur",
          "XeroContactID": "33e6c93a-d7cf-4154-9784-a4f4cf03b30d"
        },
        {
          "ID": 936,
          "email": "ericdon81@yahoo.com",
          "fullname": "Ejike Eric Nkemjika",
          "XeroContactID": "6f8f6538-8e62-468a-af36-0c9851a1b468"
        },
        {
          "ID": 937,
          "email": "adeseguno@opay.team",
          "fullname": "Adesegun Osasere Oluwasanmi",
          "XeroContactID": "a13be436-2c76-4e16-976b-18fe337bc16d"
        },
        {
          "ID": 938,
          "email": "hijabchiroma@gmail.com",
          "fullname": "Mohammed Hijab Chiroma",
          "XeroContactID": "89a0315c-23cb-4cec-9506-9582341e8612"
        },
        {
          "ID": 939,
          "email": "ugochiuchegbu133@gmail.com",
          "fullname": "Ugochi Uchegbu",
          "XeroContactID": "d4a189d3-a155-48d1-8e9e-a0bb63e4b774"
        },
        {
          "ID": 940,
          "email": "ijeomalet@gmail.com",
          "fullname": "Letrica Ijeoma Ejekwe",
          "XeroContactID": "520c229b-95d6-49ff-9c13-a187e6f637d2"
        },
        {
          "ID": 941,
          "email": "okorobenet@gmail.com",
          "fullname": "Benedicta Okoro",
          "XeroContactID": "cf26c06c-6cfd-4697-8eeb-4ba365ebc6fc"
        },
        {
          "ID": 942,
          "email": "ajaoolalekanogunbona@yahoo.com",
          "fullname": "Olalekan Ogunbona",
          "XeroContactID": "96cf4d64-ca4e-4d64-83cd-8adef3250826"
        },
        {
          "ID": 943,
          "email": "ojfarali007@rocketmail.com",
          "fullname": "Farali Onoruoiza Ojo",
          "XeroContactID": "2da13680-c463-4d5b-8be0-86717c583f58"
        },
        {
          "ID": 945,
          "email": "euniceirumekhai@gmail.com",
          "fullname": "Eunice Sametu Irumekhai",
          "XeroContactID": "d6e37705-baba-4111-b2ea-09e36d2bcecf"
        },
        {
          "ID": 946,
          "email": "ayoolu@x3leasing.com",
          "fullname": "Ayokunnumi Olugbemiro",
          "XeroContactID": "4e94863d-dfd7-4ec0-bfe4-c03e5a1bc95d"
        },
        {
          "ID": 947,
          "email": "ayokunnumiolugbemiro@yahoo.com",
          "fullname": "Abiola Olugbemiro",
          "XeroContactID": "2b0daa08-d940-46e8-8113-0f9e84424384"
        },
        {
          "ID": 948,
          "email": "julius.adewopo@gmail.com",
          "fullname": "Julius Adewopo",
          "XeroContactID": "7e2357c1-8543-428a-8c8a-4346ef033c5b"
        },
        {
          "ID": 949,
          "email": "johnkomolafe@gmail.com",
          "fullname": "Akintunde Komolafe",
          "XeroContactID": "df9667d9-e0e2-4b56-8050-6127ce66f7dc"
        },
        {
          "ID": 950,
          "email": "olalekan.adekoya@citcconsulting.or",
          "fullname": "Gani Olalekan Adekoya",
          "XeroContactID": "d6b0c11b-1a84-472e-a201-37b4df43c875"
        },
        {
          "ID": 951,
          "email": "Oluwole.akinola@nsiainsurance.com",
          "fullname": "Akinola Oyerinde Oluwole",
          "XeroContactID": "ec746778-6bf9-47a9-8a38-d95d008a39e0"
        },
        {
          "ID": 952,
          "email": "",
          "fullname": "Corporate Risk Managers",
          "XeroContactID": "57458d4b-df61-42c7-bd36-9e101bc16018"
        },
        {
          "ID": 953,
          "email": "benjaminyakubu835@gmail.com",
          "fullname": "Benjamin Farok Yakubu",
          "XeroContactID": "7f9ad979-70b6-44b4-a135-1fc52b547f55"
        },
        {
          "ID": 954,
          "email": "sibironke@atbtechsoft.com",
          "fullname": "samuel ibironke",
          "XeroContactID": "60800de6-3f56-40b7-916a-8be901c5845e"
        },
        {
          "ID": 955,
          "email": "pelumi2oluwagbemi@yahoo.com",
          "fullname": "oluwagbemi jesupelumi",
          "XeroContactID": "b4f1121e-6ae1-4a85-b0fe-8b012d3c41c5"
        },
        {
          "ID": 956,
          "email": "uashore@atbtechsoft.com",
          "fullname": "utomako egbefome ashore",
          "XeroContactID": "b6d53fbd-a4f5-49f6-aade-bae254e69c5c"
        },
        {
          "ID": 957,
          "email": "euniceuwudia@yahoo.com",
          "fullname": "eunice uwudia",
          "XeroContactID": "e57ca5be-cbb9-47f1-9c35-738ef4b4c3b4"
        },
        {
          "ID": 958,
          "email": "nwokoloonyejie1@gmail.com",
          "fullname": "onyeije nwokolo",
          "XeroContactID": "a025e9a2-afc1-4856-bda4-d9d2773d5e53"
        },
        {
          "ID": 959,
          "email": "iyaboogunbona@gmail.com",
          "fullname": "iyabo dorcas ogunbona",
          "XeroContactID": "e24e15ff-c465-49ad-a958-a9710981c40a"
        },
        {
          "ID": 960,
          "email": "contact@piggyvest.com",
          "fullname": "piggytech global investment",
          "XeroContactID": "e3759dfe-630b-4aa3-a757-0c2fb0419771"
        },
        {
          "ID": 961,
          "email": "pelumi.bodunwa@up-ng.com",
          "fullname": "Bodunwa Emmanuel pelumi",
          "XeroContactID": "726b705c-de2a-415c-b37b-5a8d3b9da2e4"
        },
        {
          "ID": 962,
          "email": "bolajiariyo22@yahoo.com",
          "fullname": "peerless vine school",
          "XeroContactID": "92b9c9b4-64f4-4779-bde3-7c5aca7813ad"
        }
      ],
        count=0,
        errors = [];

    db.getConnection(function(err, connection) {
        if (err) throw err;
        async.forEach(clients, function (client, callback) {
            let query = 'UPDATE clients SET xeroContactID = ? WHERE ';
            if (client.email) {
                query = query.concat(`email = '${client.email}'`);
            } else if (client.fullname) {
                query = query.concat(`fullname = '${client.fullname}'`);
            }
            connection.query(query, [client.XeroContactID], err => {
                if (err) {
                    console.log(err);
                    errors.push(client);
                } else {
                    count++;
                    console.log(count);
                    console.log(client.email || client.fullname);
                    console.log('======================================')
                }
                callback();
            });
        }, function (data) {
            connection.release();
            res.json({count: count, errors: errors})
        });
    });
});

users.get('/update-request-client', function(req, res) {
    let users = [],
        count=0,
        errors = [];
    db.getConnection(function(err, connection) {
        async.forEach(users, function (user, callback) {
            console.log(user.fullname);
            connection.query('SELECT * FROM clients WHERE username = ?', [user.username], function (err, client, field) {
                if (client && client[0]){
                    connection.query('UPDATE requests SET userID = ? WHERE userID = ?', [client[0]['ID'],user['ID']], function (err, result, fields) {
                        if (err) {
                            console.log(err);
                            errors.push(user);
                        } else {
                            count++;
                        }
                        callback();
                    })
                } else {
                    console.log('No Client found for '+user.fullname);
                    callback();
                }
            });
        }, function (data) {
            connection.release();
            res.json({count: count, errors: errors})
        });
    });
});

users.get('/update-confirm-payment', function(req, res) {
    let count=0,
        errors = [];
    db.getConnection(function(err, connection) {
        connection.query('SELECT * FROM schedule_history', function (error, payments, field) {
            if (error || !payments) {
                res.send({"status": 500, "error": error, "response": null});
            } else {
                async.forEach(payments, function (payment, callback) {
                    console.log(payment.ID);
                    connection.query(`SELECT a.ID, a.loan_amount amount, a.userID clientID, c.loan_officer loan_officerID, c.branch branchID 
                        FROM applications a, clients c WHERE a.ID=${payment.applicationID} AND a.userID=c.ID`, function (error, app, fields) {
                        if (error) {
                            console.log(error);
                            errors.push(payment);
                            callback();
                        } else if (app[0]) {
                            let invoice = {},
                                application = app[0];
                            invoice.clientID = application.clientID;
                            invoice.loan_officerID = application.loan_officerID;
                            invoice.branchID = application.branchID;
                            if (payment.payment_amount > 0 && payment.interest_amount > 0) {
                                invoice.type = 'multiple';
                            } else {
                                if (payment.payment_amount > 0) {
                                    invoice.type = 'principal';
                                } else if (payment.interest_amount > 0) {
                                    invoice.type = 'interest';
                                } else if (payment.fees_amount > 0) {
                                    invoice.type = 'fees';
                                } else if (payment.penalty_amount > 0) {
                                    invoice.type = 'penalty';
                                }
                            }
                            connection.query(`UPDATE schedule_history SET ? WHERE ID = ${payment.ID}`, invoice, function (err, result, fields) {
                                if (err) {
                                    console.log(err);
                                    errors.push(payment);
                                } else {
                                    count++;
                                }
                                callback();
                            })
                        } else {
                            console.log('No Application found for '+payment.ID);
                            callback();
                        }
                    });
                }, function (data) {
                    connection.release();
                    res.json({count: count, errors: errors})
                });
            }
        });
    });
});

/* User Authentication */
users.post('/login', function(req, res) {
    let user = {},
        appData = {},
        username = req.body.username,
        password = req.body.password;

    db.query('SELECT * FROM users WHERE username = ?', [username], function(err, rows, fields) {
        if (err) {
            appData.error = 1;
            appData["data"] = "Error Occured!";
            res.send(JSON.stringify(appData));
        } else {
            user = rows[0];
            if (rows.length > 0) {
                if (bcrypt.compareSync(password,user.password)) {
                    let token = jwt.sign({data:user}, process.env.SECRET_KEY, {
                        expiresIn: 1440
                    });
                    appData.status = 0;
                    appData["token"] = token;
                    appData["user"] = user;
                    res.send(JSON.stringify(appData));
                } else {
                    appData.status = 1;
                    appData["data"] = "Username and Password do not match";
                    res.send(JSON.stringify(appData));
                }
            } else {
                appData.status = 1;
                appData["data"] = "User does not exists!";
                res.send(JSON.stringify(appData));
            }
        }
    });
});

/* Add New User */
users.post('/new-user', function(req, res, next) {
    let data = [],
        postData = req.body,
        query =  'INSERT INTO users Set ?',
        query2 = 'select * from users where username = ? or email = ?';
    data.username = req.body.username;
    data.email = req.body.email;
    postData.status = 1;
    postData.date_created = Date.now();
    postData.password = bcrypt.hashSync(postData.password, parseInt(process.env.SALT_ROUNDS));
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(query2,[req.body.username, req.body.email], function (error, results, fields) {
            if (results && results[0]){
                res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "User already exists!"}));
            }
            else {
                connection.query(query,postData, function (error, results, fields) {
                    if(error){
                        res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                    } else {
                        connection.query('SELECT * from users where ID = LAST_INSERT_ID()', function(err, re, fields) {
                            connection.release();
                            if (!err){
                                let payload = {}
                                payload.category = 'Users'
                                payload.userid = req.cookies.timeout
                                payload.description = 'New User Created'
                                payload.affected = re[0]['ID']
                                notificationsService.log(req, payload)
                                res.send(JSON.stringify({"status": 200, "error": null, "response": re}));
                            }
                            else{
                                res.send(JSON.stringify({"response": "Error retrieving user details. Please try a new username!"}));
                            }
                        });
                    }
                });
            }
        });
    });
});

/* Add New Client */
users.post('/new-client', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_client', async () => {
        let id;
        let postData = req.body,
            query =  'INSERT INTO clients Set ?',
            query2 = 'select * from clients where username = ? or email = ? or phone = ?';
        postData.status = 1;
        postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');

        db.getConnection(function(err, connection) {
            if (err) throw err;
            connection.query(query2,[req.body.username, req.body.email, req.body.phone], function (error, results, fields) {
                console.log(error)
                console.log(results)
                if (results && results[0]){
                    return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Information in use by existing client!"}));
                }
                let bvn = req.body.bvn;
                if (bvn.trim() !== ''){
                    connection.query('select * from clients where bvn = ? and status = 1 limit 1', [req.body.bvn], function (error, rest, foelds){
                        if (rest && rest[0]){
                            return res.send(JSON.stringify({"status": 200, "error": null, "response": rest, "bvn_exists": "Yes"}));
                        }
                        xeroFunctions.authorizedOperation(req, res, 'xero_client', async (xeroClient) => {
                            if (xeroClient) {
                                let contact = {
                                    Name: postData.fullname,
                                    ContactNumber: postData.phone,
                                    ContactStatus: 'ACTIVE',
                                    EmailAddress: postData.email,
                                    Phones: [{
                                        PhoneType: 'MOBILE',
                                        PhoneNumber: postData.phone
                                    }]
                                };
                                if (postData.first_name) contact.FirstName = postData.first_name;
                                if (postData.last_name) contact.LastName = postData.last_name;
                                if (postData.account) contact.BankAccountDetails = postData.account;
                                let xeroContact = await xeroClient.contacts.create(contact);
                                postData.xeroContactID = xeroContact.Contacts[0]['ContactNumber'];
                            }
                            connection.query(query,postData, function (error, re, fields) {
                                if(error){
                                    console.log(error);
                                    res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                                } else {
                                    connection.query('SELECT * from clients where ID = LAST_INSERT_ID()', function(err, re, fields) {
                                        if (!err){
                                            id = re[0]['ID'];
                                            connection.query('INSERT into wallets Set ?', {client_id: id}, function(er, r, fields) {
                                                connection.release();
                                                if (!er){
                                                    let payload = {}
                                                    payload.category = 'Clients'
                                                    payload.userid = req.cookies.timeout
                                                    payload.description = 'New Client Created'
                                                    payload.affected = id
                                                    notificationsService.log(req, payload)
                                                    res.send(JSON.stringify({"status": 200, "error": null, "response": re}));
                                                }
                                                else{
                                                    res.send(JSON.stringify({"response": "Error creating client wallet!"}));
                                                }
                                            });
                                        }
                                        else{
                                            res.send(JSON.stringify({"response": "Error retrieving client details. Please try a new username!"}));
                                        }
                                    });
                                }
                            });
                        });
                    });
                } else {
                    xeroFunctions.authorizedOperation(req, res, 'xero_client', async (xeroClient) => {
                        if (xeroClient) {
                            let contact = {
                                Name: postData.fullname,
                                ContactNumber: postData.phone,
                                ContactStatus: 'ACTIVE',
                                EmailAddress: postData.email,
                                Phones: [{
                                    PhoneType: 'MOBILE',
                                    PhoneNumber: postData.phone
                                }]
                            };
                            if (postData.first_name) contact.FirstName = postData.first_name;
                            if (postData.last_name) contact.LastName = postData.last_name;
                            if (postData.account) contact.BankAccountDetails = postData.account;
                            let xeroContact = await xeroClient.contacts.create(contact);
                            postData.xeroContactID = xeroContact.Contacts[0]['ContactNumber'];
                        }
                        connection.query(query,postData, function (error, re, fields) {
                            if(error){
                                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                            } else {
                                connection.query('SELECT * from clients where ID = LAST_INSERT_ID()', function(err, re, fields) {
                                    if (!err){
                                        id = re[0]['ID'];
                                        connection.query('INSERT into wallets Set ?', {client_id: id}, function(er, r, fields) {
                                            connection.release();
                                            if (!er){
                                                let payload = {}
                                                payload.category = 'Clients'
                                                payload.userid = req.cookies.timeout
                                                payload.description = 'New Client Created'
                                                payload.affected = id
                                                notificationsService.log(req, payload)
                                                res.send(JSON.stringify({"status": 200, "error": null, "response": re}));
                                            }
                                            else{
                                                res.send(JSON.stringify({"response": "Error creating client wallet!"}));
                                            }
                                        });
                                    }
                                    else{
                                        res.send(JSON.stringify({"response": "Error retrieving client details. Please try a new username!"}));
                                    }
                                });
                            }
                        });
                    });
                }
            });
        });
    });
});

/* Add New Team*/
users.post('/new-team', function(req, res, next) {
    let postData = req.body,
        query =  'SELECT * FROM teams WHERE name = ? AND status = 1';
    query2 =  'INSERT INTO teams Set ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query,[postData.name], function (error, team, fields) {
        if(team && team[0]){
            res.send({"status": 500, "error": "Team already exists!"});
        } else {
            db.query(query2,postData, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "error": null, "response": "New Team Added!"});
                }
            });
        }
    });
});

/* Add New User Role*/
users.post('/new-role', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO user_roles Set ?',
        query2 = 'select * from user_roles where role_name = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.role, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Role name already exists!"}));
        db.query(query,{"role_name":postData.role, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New User Role Added!"}));
            }
        });
    });
});

/* Add New Branch*/
users.post('/new-branch', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO branches Set ?',
        query2 = 'select * from branches where branch_name = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.branch_name, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Branch name already exists!"}));
        db.query(query,{"branch_name":postData.branch_name, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New Branch Created!"}));
            }
        });
    });
});

//File Upload - User Registration
users.post('/upload/:id', function(req, res) {
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params) return res.status(400).send('No Number Plate specified!');
    let sampleFile = req.files.file,
        name = sampleFile.name,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1];
    if (extension) extension = extension.toLowerCase();

    fs.stat('files/users/'+req.params.id+'/', function(err) {
        if (!err) {
            console.log('file or directory exists');
        } else if (err.code === 'ENOENT') {
            fs.mkdirSync('files/users/'+req.params.id+'/');
        }
    });

    fs.stat('files/users/'+req.params.id+'/'+req.params.id+'.'+extension, function (err) {
        if (err) {
            sampleFile.mv('files/users/'+req.params.id+'/'+req.params.id+'.'+extension, function(err) {
                if (err) return res.status(500).send(err);
                res.send('File uploaded!');
            });
        }
        else{
            fs.unlink('files/users/'+req.params.id+'/'+req.params.id+'.'+extension,function(err){
                if(err){
                    res.send('Unable to delete file!');
                }
                else{
                    sampleFile.mv('files/users/'+req.params.id+'/'+req.params.id+'.'+extension, function(err) {
                        if (err)
                            return res.status(500).send(err);
                        res.send('File uploaded!');
                    });
                }
            });
        }
    });
});

//File Upload - New Client (Image and Signature)
users.post('/upload-file/:id/:item', function(req, res) {
    console.log('here')
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params) return res.status(400).send('No Number Plate specified!');
    let sampleFile = req.files.file,
        name = sampleFile.name,
        extArray = sampleFile.name.split("."),
        extension = extArray[extArray.length - 1];
    if (extension) extension = extension.toLowerCase();
    fs.stat('files/users/'+req.params.id+'/', function(err) {
        console.log(err)
        if (!err) {
            console.log('file or directory exists');
        }
        else if (err.code === 'ENOENT') {
            fs.mkdirSync('files/users/'+req.params.id+'/');
        }
    });

    fs.stat('files/users/'+req.params.id+'/'+req.params.id+'_'+req.params.item+'.'+extension, function (err) {
        if (err) {
            sampleFile.mv('files/users/'+req.params.id+'/'+req.params.id+'_'+req.params.item+'.'+extension, function(err) {
                if (err) return res.status(500).send(err);
                res.send('File uploaded!');
            });
        }
        else{
            fs.unlink('files/users/'+req.params.id+'/'+req.params.id+'_'+req.params.item+'.'+extension,function(err){
                if(err){
                    res.send('Unable to delete file!');
                }
                else{
                    sampleFile.mv('files/users/'+req.params.id+'/'+req.params.id+'_'+req.params.item+'.'+extension, function(err) {
                        if (err)
                            return res.status(500).send(err);
                        res.send('File uploaded!');
                    });
                }
            });
        }
    });
});

/* GET users listing. */
users.get('/all-users', function(req, res, next) {
    let array = [],
        query = 'SELECT * from users where status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            async.forEach(results, function(k, cb){
                let path = 'files/users/'+k.username+'/';
                if (fs.existsSync(path)){
                    fs.readdir(path, function (err, files){
                        files = helperFunctions.removeFileDuplicates(path, files);
                        async.forEach(files, function (file, callback){
                            k.image = path+file;
                            callback();
                        }, function(data){
                            array.push(k);
                            cb();
                        });
                    });
                } else {
                    k.image = "No Image";
                    array.push(k);
                    cb();
                }

            }, function(data){
                res.send(JSON.stringify({"status": 200, "error": null, "response": array}));
            });
        }
    });
});

users.get('/users-list', function(req, res, next) {
    let query = 'SELECT *, (select u.role_name from user_roles u where u.ID = user_role) as Role from users where user_role not in (3, 4) and status = 1 order by ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Loan Officers Only */
users.get('/loan-officers', function(req, res, next) {
    let query = 'SELECT *, (select u.role_name from user_roles u where u.ID = user_role) as Role from users where loan_officer_status = 1 and status = 1 order by ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/teams-list', function(req, res, next) {
    let query = 'SELECT *, (select u.fullname from users u where u.ID = t.supervisor) as supervisor, (select count(*) from team_members m where m.teamID = t.ID and m.status = 1) as members, ' +
        '(select count(*) from user_targets m where m.userID = t.ID and m.status = 1) as targets from teams t where t.status = 1 order by t.ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Teams fetched successfully", "response": results});
        }
    });
});

users.get('/team/members/:id', function(req, res, next) {
    let query = 'SELECT *,(select u.fullname from users u where u.ID = t.memberID) as member from team_members t where t.status = 1 and t.teamID = ? order by t.ID desc';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Team members fetched successfully", "response": results});
        }
    });
});

users.post('/team/members', function(req, res, next) {
    req.body.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM team_members WHERE teamID=? AND memberID=? AND status = 1', [req.body.teamID,req.body.memberID], function (error, result, fields) {
        if (result && result[0]) {
            res.send({"status": 500, "error": "User has already been assigned to this team"});
        } else {
            db.query('INSERT INTO team_members SET ?', req.body, function (error, result, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    db.query('SELECT *,(select u.fullname from users u where u.ID = t.memberID) as member from team_members t where t.status = 1 and t.teamID = ? order by t.ID desc', [req.body.teamID], function (error, results, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            res.send({"status": 200, "message": "Team member assigned successfully", "response": results});
                        }
                    });
                }
            });
        }
    });
});

users.delete('/team/members/:id/:teamID', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE team_members SET status = 0, date_modified = ? WHERE ID = ?', [date, req.params.id], function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query('SELECT *,(select u.fullname from users u where u.ID = t.memberID) as member from team_members t where t.status = 1 and t.teamID = ? order by t.ID desc', [req.params.teamID], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "Team member deleted successfully", "response": results});
                }
            });
        }
    });
});

users.get('/team/targets/:id', function(req, res, next) {
    let query = 'SELECT *,(select u.name from teams u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
        '(select u.title from targets u where u.ID = t.targetID) as target from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Team targets fetched successfully", "response": results});
        }
    });
});

users.get('/user-targets/:id', function(req, res, next) {
    let query = 'SELECT *,(select u.fullname from users u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
        '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User targets fetched successfully", "response": results});
        }
    });
});

users.get('/user-assigned-target/:id', function(req, res, next) {
    let query = 'SELECT t.targetID AS ID,sum(t.value) AS value,u.title as target,u.type,u.period from user_targets t, targets u where t.status = 1 and t.userID = ? and u.ID = t.targetID group by t.targetID order by t.targetID desc';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User assigned target fetched successfully", "response": results});
        }
    });
});

users.get('/user-assigned-period/:id/:targetID', function(req, res, next) {
    let query = 'SELECT t.sub_periodID AS ID,sum(t.value) AS value,u.name,u.type,u.periodID from user_targets t, sub_periods u where t.status = 1 and t.userID = ? and t.targetID = ? and u.ID = t.sub_periodID group by t.sub_periodID order by t.sub_periodID desc';
    db.query(query, [req.params.id,req.params.targetID], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User assigned period fetched successfully", "response": results});
        }
    });
});

users.get('/targets-list', function(req, res, next) {
    let type = req.query.type,
        target = req.query.target,
        sub_period = req.query.sub_period,
        query = 'SELECT *,(select u.name from teams u where u.ID = t.userID) as owner,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
            '(select u.start from sub_periods u where u.ID = t.sub_periodID) as start,(select u.end from sub_periods u where u.ID = t.sub_periodID) as end,' +
            '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.user_type = "team"',
        query2 = 'SELECT *,(select u.fullname from users u where u.ID = t.userID) as owner,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
            '(select u.start from sub_periods u where u.ID = t.sub_periodID) as start,(select u.end from sub_periods u where u.ID = t.sub_periodID) as end,' +
            '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.user_type = "user"';
    if (type){
        query = query.concat(' AND (select u.type from targets u where u.ID = t.targetID) = "'+type+'"');
        query2 = query2.concat(' AND (select u.type from targets u where u.ID = t.targetID) = "'+type+'"');
    }
    if (target){
        query = query.concat(' AND t.targetID = '+target);
        query2 = query2.concat(' AND t.targetID = '+target);
    }
    if (sub_period){
        query = query.concat(' AND t.sub_periodID = '+sub_period);
        query2 = query2.concat(' AND t.sub_periodID = '+sub_period);
    }
    db.query(query, function (error, team_targets, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, function (error, user_targets, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    results = team_targets.concat(user_targets);
                    res.send({"status": 200, "message": "Targets list fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/targets-list/:officerID', function(req, res, next) {
    let type = req.query.type,
        id = req.params.officerID,
        target = req.query.target,
        sub_period = req.query.sub_period,
        query = 'SELECT *,(select u.name from teams u where u.ID = t.userID) as owner,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
            '(select u.start from sub_periods u where u.ID = t.sub_periodID) as start,(select u.end from sub_periods u where u.ID = t.sub_periodID) as end,' +
            '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.user_type = "team"',
        query2 = 'SELECT *,(select u.fullname from users u where u.ID = t.userID) as owner,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
            '(select u.start from sub_periods u where u.ID = t.sub_periodID) as start,(select u.end from sub_periods u where u.ID = t.sub_periodID) as end,' +
            '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.user_type = "user"',
        query3 = query2.concat(' AND t.userID = '+id+' '),
        query4 = query2.concat(' AND (select supervisor from users where users.id = t.userID) =  '+id+' ');
    if (id)
        query2 = query3;
    if (type){
        query = query.concat(' AND (select u.type from targets u where u.ID = t.targetID) = "'+type+'"');
        query2 = query2.concat(' AND (select u.type from targets u where u.ID = t.targetID) = "'+type+'"');
    }
    if (target){
        query = query.concat(' AND t.targetID = '+target);
        query2 = query2.concat(' AND t.targetID = '+target);
    }
    if (sub_period){
        query = query.concat(' AND t.sub_periodID = '+sub_period);
        query2 = query2.concat(' AND t.sub_periodID = '+sub_period);
    }
    if (id){
        db.query(query, function (error, team_targets, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query(query2, function (error, user_targets, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        db.query(query4, function (error, user_targets2, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                results = team_targets.concat(user_targets,user_targets2);
                                res.send({"status": 200, "message": "Targets list fetched successfully", "response": results});
                            }
                        });
                    }
                });
            }
        });
    } else {
        db.query(query, function (error, team_targets, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query(query2, function (error, user_targets, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        results = team_targets.concat(user_targets);
                        res.send({"status": 200, "message": "Targets list fetched successfully", "response": results});
                    }
                });
            }
        });
    }
});

users.delete('/targets-list/delete/:id', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE user_targets SET status=0, date_modified=? WHERE ID = ?', [date,req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Assigned target deleted successfully!"});
        }
    });
});


users.get('/committals/user/disbursement/:userID/:targetID', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(d.amount) total FROM disbursement_history d, (SELECT ID client_id FROM clients WHERE loan_officer = ? AND status = 1) AS c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE d.client_id = c.client_id',
        query2 = 'SELECT d.amount, a.disbursement_channel channel, a.duration, d.date_disbursed date, c.fullname client FROM disbursement_history d, applications AS a, ' +
            '(SELECT ID client_id, fullname FROM clients WHERE loan_officer = ? AND status = 1) AS c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE d.client_id = c.client_id AND d.loan_id = a.ID';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
    }
    db.query(query, [req.params.userID,req.params.targetID], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.userID,req.params.targetID], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/user/interest/:userID/:targetID', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(s.interest_amount) total FROM schedule_history s, applications a, clients c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges ' +
            'WHERE s.applicationID = a.ID AND s.clientID = c.ID AND s.loan_officerID = ? AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT s.interest_amount amount, s.payment_source channel, s.payment_date date, s.clientID userID, c.fullname client, a.ID application_id, a.duration ' +
            'FROM schedule_history s, applications a, clients c, (SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges ' +
            'WHERE s.applicationID = a.ID AND s.clientID = c.ID AND s.loan_officerID = ? AND s.status = 1 AND s.interest_amount > 0';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
    }
    db.query(query, [req.params.targetID, req.params.userID], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.targetID, req.params.userID], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/user/disbursement/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(d.amount) total FROM disbursement_history d WHERE d.loan_officer = ?',
        query2 = 'SELECT d.amount, a.disbursement_channel channel, a.duration, d.date_disbursed date, c.fullname client FROM disbursement_history d, applications a, clients c WHERE d.loan_officer = ? AND d.loan_id = a.ID AND d.client_id = c.ID';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    }
    db.query(query, [req.params.id], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/user/interest/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(s.interest_amount) total FROM schedule_history AS s, applications a ' +
            'WHERE s.applicationID = a.ID AND s.loan_officerID = ? AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT s.interest_amount amount, s.payment_source channel, s.payment_date date, s.clientID userID, c.fullname client, a.ID application_id, a.duration ' +
            'FROM schedule_history s, applications a, clients c ' +
            'WHERE s.applicationID = a.ID AND s.clientID = c.ID AND s.loan_officerID = ? AND s.status = 1 AND s.interest_amount > 0';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    }
    db.query(query, [req.params.id], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/team/disbursement/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(d.amount) total FROM disbursement_history d, ' +
            '(SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = 3 AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c ' +
            'WHERE d.client_id = c.client_id',
        query2 = 'SELECT d.amount, a.disbursement_channel channel, a.duration, d.date_disbursed date, c.fullname client FROM disbursement_history d, applications a, ' +
            '(SELECT cl.ID client_id, cl.fullname FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = ? AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c ' +
            'WHERE d.client_id = c.client_id AND d.loan_id = a.ID';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    }
    db.query(query, [req.params.id], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/team/interest/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT count(*) count, sum(s.interest_amount) total FROM schedule_history AS s, ' +
            '(SELECT ID application_id FROM applications AS a, (SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = ? AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps ' +
            'WHERE s.applicationID = apps.application_id AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT s.interest_amount amount, s.payment_source channel, s.payment_date date, s.clientID userID, c.fullname client, apps.application_id, apps.duration ' +
            'FROM schedule_history s, clients c, (SELECT ID application_id, duration FROM applications AS a, (SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE teamID = ? AND status = 1) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps ' +
            'WHERE s.applicationID = apps.application_id AND s.clientID = c.ID AND s.status = 1 AND s.interest_amount > 0';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    }
    db.query(query, [req.params.id], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/disbursement/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT d.ID, cast(d.amount as unsigned) amount, a.disbursement_channel channel, d.date_disbursed date, c.fullname client FROM disbursement_history d, applications a, ' +
            '(SELECT ID client_id, fullname FROM clients WHERE loan_officer in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "user" AND t.targetID = ?) AND status = 1) AS c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE d.loan_id = a.ID AND d.client_id = c.client_id',
        query2 = 'SELECT d.ID, cast(d.amount as unsigned) amount, a.disbursement_channel channel, d.date_disbursed date, c.fullname client FROM disbursement_history d, applications a, ' +
            '(SELECT cl.ID client_id, cl.fullname FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE status = 1 AND teamID in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "team" AND t.targetID = ?)) AS t WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE d.loan_id = a.ID AND d.client_id = c.client_id';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(d.date_disbursed) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
    }
    db.query(query, [req.params.id,req.params.id], function (error, result_user, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id,req.params.id], function (error, result_team, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = {};
                    results.data = _.unionBy(result_team,result_user,'ID');
                    results.count = results.data.length;
                    results.total = _.sumBy(results.data,'amount');
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/committals/interest/:id', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'SELECT cast(s.interest_amount as unsigned) amount, s.payment_source channel, s.payment_date date, c.fullname client, apps.application_id, apps.duration ' +
            'FROM schedule_history AS s, clients c, ' +
            '(SELECT ID application_id, duration FROM applications AS a, (SELECT ID client_id FROM clients WHERE loan_officer in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "user" AND t.targetID = ?) AND status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE s.applicationID = apps.application_id AND s.clientID = c.ID AND s.status = 1 AND s.interest_amount > 0',
        query2 = 'SELECT cast(s.interest_amount as unsigned) amount, s.payment_source channel, s.payment_date date, c.fullname client, apps.application_id, apps.duration ' +
            'FROM schedule_history AS s, clients c, ' +
            '(SELECT ID application_id, duration FROM applications AS a, (SELECT cl.ID client_id FROM clients AS cl, (SELECT memberID user_id FROM team_members WHERE status = 1 AND teamID in (SELECT t.userID FROM user_targets t WHERE t.status = 1 AND t.user_type = "team" AND t.targetID = ?)) AS t ' +
            'WHERE cl.loan_officer = t.user_id AND cl.status = 1) AS c WHERE a.userID = c.client_id AND a.status = 2) AS apps, ' +
            '(SELECT p.start,p.end FROM periods p WHERE p.ID = (SELECT period FROM targets WHERE status = 1 AND ID = ?)) AS ranges WHERE s.applicationID = apps.application_id AND s.clientID = c.ID AND s.status = 1 AND s.interest_amount > 0';
    if (start && end){
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP("'+start+'") AND TIMESTAMP("'+end+'")');
    } else {
        query = query.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
        query2 = query2.concat(' AND TIMESTAMP(s.payment_date) BETWEEN TIMESTAMP(ranges.start) AND TIMESTAMP(ranges.end)');
    }
    db.query(query, [req.params.id,req.params.id], function (error, result_user, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id,req.params.id], function (error, result_team, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = {};
                    results.data = _.unionBy(result_team,result_user,'ID');
                    results.count = results.data.length;
                    results.total = _.sumBy(results.data,'amount');
                    res.send({"status": 200, "message": "Committals fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/target/details/:id', function(req, res, next) {
    let query = 'SELECT count(*) count, sum(t.value) total FROM user_targets AS t WHERE targetID = ? AND status = 1',
        query2 = 'SELECT userID, sum(value) as value, (SELECT name FROM sub_periods WHERE ID = t.sub_periodID) AS period, ' +
            '(CASE WHEN t.user_type = "user" THEN (SELECT fullname FROM users WHERE ID = userID) WHEN t.user_type = "team" THEN (SELECT name FROM teams WHERE ID = userID) END) AS owner ' +
            'FROM user_targets AS t WHERE t.targetID = ? AND t.status = 1 GROUP BY owner';
    db.query(query, [req.params.id], function (error, aggregate, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query(query2, [req.params.id], function (error, list, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let results = aggregate[0];
                    results.data = list;
                    res.send({"status": 200, "message": "Target details fetched successfully", "response": results});
                }
            });
        }
    });
});

users.get('/target/limit/:id', function(req, res, next) {
    let query = 'SELECT (CASE WHEN sum(t.value) IS NULL THEN 0 ELSE sum(t.value) END) allocated, (SELECT value FROM targets WHERE ID = ?) target, ' +
        '((SELECT value FROM targets WHERE ID = ?) - (CASE WHEN sum(t.value) IS NULL THEN 0 ELSE sum(t.value) END)) unallocated FROM user_targets AS t WHERE targetID = ? AND status = 1';
    db.query(query, [req.params.id,req.params.id,req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Target limit fetched successfully", "response": results[0]});
        }
    });
});

users.post('/team/targets', function(req, res, next) {
    req.body.user_type = "team";
    req.body.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM user_targets WHERE userID=? AND targetID=? AND periodID=? AND sub_periodID=? AND status = 1',
        [req.body.userID,req.body.targetID,req.body.periodID,req.body.sub_periodID], function (error, result, fields) {
            if (result && result[0]) {
                res.send({"status": 500, "error": "Target has already been assigned to this team"});
            } else {
                db.query('INSERT INTO user_targets SET ?', req.body, function (error, result, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        let query = 'SELECT *,(select u.name from teams u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
                            '(select u.title from targets u where u.ID = t.targetID) as target from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
                        db.query(query, [req.body.userID], function (error, results, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                res.send({"status": 200, "message": "Team target assigned successfully", "response": results});
                            }
                        });
                    }
                });
            }
        });
});

users.post('/user-targets', function(req, res, next) {
    req.body.user_type = "user";
    req.body.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM user_targets WHERE userID=? AND targetID=? AND periodID=? AND sub_periodID=? AND status = 1',
        [req.body.userID,req.body.targetID,req.body.periodID,req.body.sub_periodID], function (error, result, fields) {
            if (result && result[0]) {
                res.send({"status": 500, "error": "Target has already been assigned to this user"});
            } else {
                db.query('SELECT * FROM users WHERE ID=?', [req.body.userID], function (error, user, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        if (user[0]['loan_officer_status'] !== 1)
                            return res.send({"status": 500, "error": "User must be a loan officer"});
                        db.query('INSERT INTO user_targets SET ?', req.body, function (error, result, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                let query = 'SELECT *,(select u.fullname from users u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
                                    '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
                                db.query(query, [req.body.userID], function (error, results, fields) {
                                    if(error){
                                        res.send({"status": 500, "error": error, "response": null});
                                    } else {
                                        res.send({"status": 200, "message": "User target assigned successfully", "response": results});
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
});

users.delete('/team/targets/:id/:userID', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE user_targets SET status = 0, date_modified = ? WHERE ID = ?', [date, req.params.id], function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT *,(select u.name from teams u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
                '(select u.title from targets u where u.ID = t.targetID) as target from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
            db.query(query, [req.params.userID], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "Team target deleted successfully", "response": results});
                }
            });
        }
    });
});

users.delete('/user-targets/:id/:userID', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE user_targets SET status = 0, date_modified = ? WHERE ID = ?', [date, req.params.id], function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT *,(select u.fullname from users u where u.ID = t.userID) as user,(select u.name from sub_periods u where u.ID = t.sub_periodID AND u.periodID = t.periodID) as period,' +
                '(select u.title from targets u where u.ID = t.targetID) as target,(select u.type from targets u where u.ID = t.targetID) as type from user_targets t where t.status = 1 and t.userID = ? order by t.ID desc';
            db.query(query, [req.params.userID], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "User target deleted successfully", "response": results});
                }
            });
        }
    });
});

users.get('/users-list-full', function(req, res, next) {
    let query = 'SELECT *, (select u.fullname from users u where u.ID = s.supervisor) as supervisor, (select u.role_name from user_roles u where u.ID = s.user_role) as Role ' +
        'from users s where s.user_role not in (3, 4) order by s.ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/branches', function(req, res, next) {
    let query = 'SELECT * from branches';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/states', function(req, res, next) {
    let query = 'SELECT * from state';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/countries', function(req, res, next) {
    let query = 'SELECT * from country';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/clients-list', function(req, res, next) {
    let query = 'select * from clients where status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/clients-list-full', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        query = 'select *, (select l.fullname from users l where l.ID = loan_officer) as loan_officer_name from clients ';
    if (start && end){
        start = "'"+moment(start).utcOffset('+0100').format("YYYY-MM-DD")+"'";
        end = "'"+moment(end).add(1, 'days').format("YYYY-MM-DD")+"'";
        query = query.concat('where TIMESTAMP(date_created) between TIMESTAMP('+start+') and TIMESTAMP('+end+')')
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/clients-list-full/:officerID', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        id = req.params.officerID,
        query = 'select *, (select l.fullname from users l where l.ID = loan_officer) as loan_officer_name from clients ',
        query2 = 'select *, (select l.fullname from users l where l.ID = loan_officer) as loan_officer_name from clients where loan_officer = '+id,
        query3 = 'select *, (select l.fullname from users l where l.ID = loan_officer) as loan_officer_name from clients where (select supervisor from users where users.id = clients.loan_officer) = '+id;
    if (id)
        query = query2;
    if (start && end){
        let start_query = "'"+moment(start).utcOffset('+0100').format("YYYY-MM-DD")+"'";
        let end_query = "'"+moment(end).add(1, 'days').format("YYYY-MM-DD")+"'";
        query = query.concat(' where TIMESTAMP(date_created) between TIMESTAMP('+start_query+') and TIMESTAMP('+end_query+')')
    }
    if (id){
        db.query(query, function (error, results1, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                db.query(query3, function (error, results2, fields) {
                    if(error){
                        res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                    } else {
                        let results = _.unionBy(results1,results2,'ID');
                        res.send(JSON.stringify(results));
                    }
                });
            }
        });
    } else {
        db.query(query, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify(results));
            }
        });
    }
});

users.get('/users-list-v2', function(req, res, next) {
    let query = 'SELECT ID, username, fullname, email, status, date_created from clients where status = 1 order by fullname asc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/user-dets/:id', function(req, res, next) {
    let query = 'SELECT *, (select u.role_name from user_roles u where u.ID = user_role) as Role, (select fullname from users where users.ID = u.supervisor) as Super from users u where id = ? order by ID desc ';
    db.query(query, req.params.id, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

users.get('/client-dets/:id', function(req, res, next) {
    let query = 'SELECT *, (select fullname from users u where u.ID = clients.loan_officer) as officer, \n' +
        '(select branch_name from branches b where b.ID = clients.branch) as branchname, \n' +
        '(SELECT sum(amount) FROM escrow WHERE clientID=clients.ID AND status=1) AS escrow ,  \n' +
        '(select sum(loan_amount) from applications where userID = clients.ID and not (status = 0 and close_status = 0)) as total_loans, \n'+
        '(select \n' +
        '(select sum(loan_amount) from applications where userID = clients.ID and not (status = 0 and close_status = 0)) - \n' +
        'sum(payment_amount)\n' +
        'from schedule_history\n' +
        'where applicationID in (select id from applications where userid = clients.ID and not (status = 0 and close_status = 0))\n' +
        'and status = 1) as total_balance, \n'+
        '(select \n' +
        'sum(interest_amount)\n' +
        'from schedule_history\n' +
        'where applicationID in (select id from applications where userid = clients.ID and not (status = 0 and close_status = 0))\n' +
        'and status = 1) as total_interests\n'+
        'from clients where id = ? order by id desc \n';
    db.query(query, req.params.id, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

users.get('/incomplete-records', function(req, res, next){
    let query = `select * from clients where 
                (fullname = ' ' or fullname is null) or 
                (username = ' ' or username is null) or 
                (password = ' ' or password is null) or 
                (status = ' ' or status is null) or 
                (phone = ' ' or phone is null) or 
                (address = ' ' or address is null) or 
                (email = ' ' or email is null) or 
                (dob = ' ' or dob is null) or 
                (marital_status = ' ' or marital_status is null) or 
                (loan_officer = ' ' or loan_officer is null) or 
                (client_state = ' ' or client_state is null) or 
                (client_country = ' ' or client_country is null) or 
                (postcode = ' ' or postcode is null) or 
                (years_add = ' ' or years_add is null) or 
                (ownership = ' ' or ownership is null) or 
                (employer_name = ' ' or employer_name is null) or
                (industry = ' ' or industry is null) or 
                (job = ' ' or job is null) or 
                (salary = ' ' or salary is null) or 
                (job_country = ' ' or job_country is null) or 
                (off_address = ' ' or off_address is null) or 
                (off_state = ' ' or off_state is null) or 
                (doe = ' ' or doe is null) or 
                (guarantor_name = ' ' or guarantor_name is null) or 
                (guarantor_occupation = ' ' or guarantor_occupation is null) or 
                (relationship = ' ' or relationship is null) or 
                (years_known = ' ' or years_known is null) or 
                (guarantor_phone = ' ' or guarantor_phone is null) or 
                (guarantor_email = ' ' or guarantor_email is null) or 
                (guarantor_address = ' ' or guarantor_address is null) or 
                (gua_country = ' ' or gua_country is null) or
                (gender = ' ' or gender is null) or 
                (branch = ' ' or branch is null) or 
                (bank = ' ' or bank is null) or 
                (account = ' ' or account is null) or 
                (bvn = ' ' or bvn is null) or 
                (client_type = ' ' or client_type is null) or 
                (product_sold = ' ' or product_sold is null) or 
                (capital_invested = ' ' or capital_invested is null) or 
                (market_name = ' ' or market_name is null) or 
                (market_years = ' ' or market_years is null) or 
                (market_address = ' ' or market_address is null) or 
                (kin_fullname = ' ' or kin_fullname is null) or 
                (kin_phone = ' ' or kin_phone is null) or 
                (kin_relationship = ' ' or kin_relationship is null)`
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

/* Custom APIs to update all clients' first_name, middle_name and last_name*/
users.get('/update-records', function(req, res, next){
    let query = `select ID, fullname from clients `
    // where (first_name = ' ' or first_name is null) or
    // (middle_name = ' ' or middle_name is null) or
    // (last_name = ' ' or last_name is null)`
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            db.getConnection(function(err, connect) {
                if (err) throw err;
                for (let i = 0; i < results.length; i++){
                    let id = results[i]['ID'];
                    let fullname = (results[i]['fullname'] === null) ? ' ' : results[i]['fullname'];
                    let first_name = fullname.split(' ')[0].trim();
                    let middle_name = fullname.split(' ')[1].trim();
                    let last_name = fullname.split(' ')[2].trim();
                    console.log(fullname + ': ')
                    console.log(first_name + middle_name + last_name + '\n')
                    let dets = {};
                    let query = 'update clients set first_name = ?, middle_name = ?, last_name = ? where ID = ?  ';
                    connect.query(query, [first_name, middle_name, last_name, id], function (error, results, fields) {
                        if (error) {
                            console.log(error)
                            // res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                        } else {
                            console.log(id);
                            console.log(results);
                            // res.send(JSON.stringify({"status": 200, "error": null, "response": "Category Disabled!"}));
                        }
                        if (i === results.length-1)
                            return connect.release();
                    });
                }
            });
            // res.send(results);
        }
    });
});

users.get('/update-folders', function(req, res, next){
    let query = `select ID, first_name, middle_name, last_name, email from clients`
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            db.getConnection(function(err, connect) {
                if (err) throw err;
                for (let i = 0; i < results.length; i++){
                    let id = results[i]['ID'];
                    let first_name = (results[i]['first_name'] === null) ? '' : results[i]['first_name'].trim();
                    let middle_name = (results[i]['middle_name'] === null) ? '' : results[i]['middle_name'].trim();
                    let last_name = (results[i]['last_name'] === null) ? '' : results[i]['last_name'].trim();
                    let email = results[i]['email'];
                    let folder_name = first_name + ' ' + middle_name + ' ' + last_name + '_' + email
                    console.log(folder_name)
                    let dets = {};
                    let query = 'update clients set images_folder = ? where ID = ?  ';
                    // console.log(query)
                    connect.query(query, [folder_name, id], function (error, results, fields) {
                        if (error) {
                            console.log(error)
                            // res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
                        } else {
                            console.log(id);
                            console.log(results);
                            // res.send(JSON.stringify({"status": 200, "error": null, "response": "Category Disabled!"}));
                        }
                        if (i === results.length-1)
                            return connect.release();
                    });
                }
            });
            // res.send(results);
        }
    });
});
/* */

users.get('/user-roles', function(req, res, next) {
    let query = 'SELECT * from user_roles where status = 1 and id not in (1, 3, 4)';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/roles/:role', function(req, res, next) {
    let query = (req.params.role === '1') ? 'SELECT * from user_roles where id not in (3, 4, 1) ' : 'SELECT * from user_roles where id not in (3, 4) ';
    db.query(query, req.params.role, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET users count. */
users.get('/usersCount', function(req, res, next) {
    let query = 'SELECT count(*) as total from users where status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* GET All Requests count. */
users.get('/all-requests', function(req, res, next) {
    let query = 'select count(*) as requests from requests, clients where clients.ID = requests.userID AND requests.status <> 0';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

/* GET All Applications count. */
users.get('/all-applications', function(req, res, next) {
    let query = 'select count(*) as applications from applications where applications.status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});

/* GET Specific User. */
users.get('/user/:id', function(req, res, next) {
    let path = 'files/users/'+req.params.id+'/',
        query = 'SELECT * from users where username = ?';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            fs.stat(path, function(err) {
                if (!err){
                    let obj = {},
                        items = [],
                        image = "";
                    fs.readdir(path, function (err, files){
                        files = helperFunctions.removeFileDuplicates(path, files);
                        files.forEach(function (file){
                            image = path+file;
                        });
                        res.send(JSON.stringify({"status": 200, "error": null, "response": results, "image": image}));
                    });
                }else{
                    res.send(JSON.stringify({"status": 200, "error": null, "response": results, "path": "No Image Uploaded Yet"}));
                }
            });
        }
    });
});

/* Edit User Info */
users.post('/edit-user/:id/:user', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.fullname, postData.user_role, postData.email, postData.branch, postData.supervisor, postData.loan_officer_status, postData.date_modified, req.params.id],
        query = 'Update users SET fullname=?, user_role=?, email=?, branch =?, supervisor =?, loan_officer_status =?, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        }
        else {
            let payload = {}
            payload.category = 'Users'
            payload.userid = req.cookies.timeout
            payload.description = 'User details updated.'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send(JSON.stringify({"status": 200, "error": null, "response": "User Details Updated"}));
        }
    });
});

users.post('/edit-client/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_client', async (xeroClient) => {
        let date = Date.now(),
            postData = req.body;
        postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let payload = [postData.username, postData.fullname, postData.first_name, postData.middle_name, postData.last_name, postData.phone, postData.address, postData.email,
            postData.gender, postData.dob, postData.marital_status, postData.loan_officer, postData.branch, postData.bank, postData.account, postData.bvn, postData.client_state, postData.postcode, postData.client_country,
            postData.years_add, postData.ownership , postData.employer_name ,postData.industry ,postData.job, postData.salary, postData.job_country , postData.off_address, postData.off_state,
            postData.doe, postData.guarantor_name, postData.guarantor_occupation, postData.relationship, postData.years_known, postData.guarantor_phone, postData.guarantor_email,
            postData.guarantor_address, postData.gua_country, postData.product_sold, postData.capital_invested, postData.market_name, postData.market_years,
            postData.market_address, postData.kin_fullname, postData.kin_phone, postData.kin_relationship, postData.images_folder, postData.date_modified, req.params.id];
        let query = 'Update clients SET username = ?, fullname=?, first_name=?, middle_name=?, last_name=?,  phone=?, address = ?, email=?, gender=?, dob = ?, marital_status=?, loan_officer=?, branch=?, bank=?, account=?, bvn = ?, ' +
            'client_state=?, postcode=?, client_country=?, years_add=?, ownership=?, employer_name=?, industry=?, job=?, salary=?, job_country=?, off_address=?, off_state=?, ' +
            'doe=?, guarantor_name=?, guarantor_occupation=?, relationship=?, years_known=?, guarantor_phone=?, guarantor_email=?, guarantor_address=?, gua_country=?, ' +
            'product_sold =? , capital_invested = ?, market_name =? , market_years = ?, market_address =? , kin_fullname = ?, kin_phone =? , kin_relationship = ?, images_folder = ?, date_modified = ? where ID=?';
        if (xeroClient && postData.xeroContactID) {
            let contact = {
                Name: postData.fullname,
                ContactNumber: postData.phone,
                ContactStatus: 'ACTIVE',
                EmailAddress: postData.email,
                Phones: [{
                    PhoneType: 'MOBILE',
                    PhoneNumber: postData.phone
                }]
            };
            if (postData.first_name) contact.FirstName = postData.first_name;
            if (postData.last_name) contact.LastName = postData.last_name;
            if (postData.account) contact.BankAccountDetails = postData.account;
            contact.ContactNumber = postData.xeroContactID;
            let xeroContact = await xeroClient.contacts.update(contact);
        }
        db.query(query, payload, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                let payload = {}
                payload.category = 'Clients'
                payload.userid = req.cookies.timeout
                payload.description = 'Client details updated.'
                payload.affected = req.params.id
                notificationsService.log(req, payload)
                res.send(JSON.stringify({"status": 200, "error": null, "response": "Client Details Updated"}));
            }
        });
    });
});

/* Change Branch Status */
users.post('/del-branch/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update branches SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Branch Disabled!"}));
        }
    });
});

/* Reactivate Branch */
users.post('/en-branch/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update branches SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Branch Re-enabled!"}));
        }
    });
});

/* Change Role Status */
users.post('/del-role/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update user_roles SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Disabled!"}));
        }
    });
});

/* Reactivate Role */
users.post('/en-role/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update user_roles SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Re-enabled!"}));
        }
    });
});

// Disable User
users.post('/del-user/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update users SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "User Disabled!"}));
        }
    });
});

// Enable User
users.post('/en-user/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update users SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "User Reactivated!"}));
        }
    });
});

// Change Client Status
users.post('/del-client/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_client', async (xeroClient) => {
        let date = Date.now(),
            postData = req.body;
        postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let payload = [postData.date_modified, req.params.id],
            query = 'Update clients SET status = 0, date_modified = ? where ID=?';
        if (xeroClient && postData.xeroContactID) {
            let xeroContact = await xeroClient.contacts.update({
                ContactNumber: postData.xeroContactID,
                ContactStatus: 'ARCHIVED'
            });
        }
        db.query(query, payload, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "Client Disabled!"}));
            }
        });
    });
});

// Enable Client
users.post('/en-client/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_client', async (xeroClient) => {
        let date = Date.now(),
            postData = req.body;
        postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let payload = [postData.date_modified, req.params.id],
            query = 'Update clients SET status = 1, date_modified = ? where ID=?';
        // if (xeroClient && postData.xeroContactID) {
        //     let xeroContact = await xeroClient.contacts.update({
        //         ContactNumber: postData.xeroContactID,
        //         ContactStatus: 'ACTIVE'
        //     });
        // }
        db.query(query, payload, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "Client Reactivated!"}));
            }
        });
    });
});

/* Change User Password */
users.post('/changePassword/:id', function(req, res, next) {
    let date_modified = Date.now(),
        query = 'Update users SET password = ?, date_modified = ?  where id=?';
    db.query(query, [bcrypt.hashSync(req.body.password, parseInt(process.env.SALT_ROUNDS)), date_modified, req.params.id], function (error, results, fields) {                   ;
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "User password updated!"});
        }
    });
});

/* GET Vehicle Owners listing. */
users.get('/owners/', function(req, res, next) {
    let query = 'SELECT * from users where user_role = 4';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Add New Vehicle Owner*/
users.post('/new-owner', function(req, res, next) {
    let postData = req.body;
    postData.date_created = Date.now();
    let query =  'INSERT INTO vehicle_owners Set ?';
    db.query(query,postData, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "New Vehicle Owner Added!"}));
        }
    });
});

/**
 * User Application (3rd Party)
 * Payload => Firstname, Lastname, Phone, Collateral
 */

users.post('/apply', function(req, res) {
    let data = {},
        workflow_id = req.body.workflowID,
        postData = Object.assign({},req.body),
        query =  'INSERT INTO applications Set ?';
    if (!workflow_id)
        query =  'INSERT INTO requests Set ?';
    delete postData.email;
    delete postData.username;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query, postData, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            data.name = req.body.username;
            data.date = postData.date_created;
            let mailOptions = {
                from: process.env.TENANT+' <noreply@finratus.com>',
                to: req.body.email,
                subject: process.env.TENANT+' Application Successful',
                template: 'application',
                context: data
            };
            if (!workflow_id)
                mailOptions.template =  'main';
            transporter.sendMail(mailOptions, function(error, info){
                if(error)
                    console.log({"status": 500, "message": "Error occurred!", "response": error});
                if (!workflow_id)
                    return res.send({"status": 200, "message": "New Application Added!"});
                helperFunctions.getNextWorkflowProcess(false,workflow_id,false, function (process) {
                    db.query('SELECT MAX(ID) AS ID from applications', function(err, application, fields) {
                        process.workflowID = workflow_id;
                        process.agentID = postData.agentID;
                        process.applicationID = application[0]['ID'];
                        process.date_created = postData.date_created;

                        let payload = {}
                        payload.category = 'Application'
                        payload.userid = req.cookies.timeout
                        payload.description = 'New Application Created'
                        payload.affected = application[0]['ID']
                        notificationsService.log(req, payload)
                        db.query('INSERT INTO workflow_processes SET ?',process, function (error, results, fields) {
                            if(error){
                                return res.send({"status": 500, "error": error, "response": null});
                            } else {
                                return res.send({"status": 200, "message": "New Application Added!", "response": application[0]});
                            }
                        });
                    });
                });
            });
        }
    });
});

users.post('/contact', function(req, res) {
    let data = req.body;
    if (!data.fullname || !data.email || !data.subject || !data.message)
        return res.send({"status": 500, "message": "Please send all required parameters"});
    data.date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let mailOptions = {
        from: data.fullname+' <applications@loan35.com>',
        to: 'getloan@loan35.com',
        subject: 'Feedback: '+data.subject,
        template: 'contact',
        context: data
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error)
            return res.send({"status": 500, "message": "Oops! An error occurred while sending feedback", "response": error});
        return res.send({"status": 200, "message": "Feedback sent successfully!"});
    });
});

users.post('/sendmail', function(req, res) {
    let data = req.body;
    if (!data.name || !data.email || !data.company || !data.phone)
        return res.send("Required Parameters not sent!");
    data.date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let mailOptions = {
        from: 'ATB Cisco <solutions@atbtechsoft.com>',
        to: 'sibironke@atbtechsoft.com',
        subject: 'ATB Cisco Application: '+data.name,
        template: 'mail',
        context: data
    };
    emailService.send(mailOptions);
    return res.send("OK");
});

/* GET User Applications. */
users.get('/applications', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        type = req.query.type;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");

    let query = 'SELECT u.fullname, u.phone, u.email, u.address, c.name corporate_name, c.email corporate_email, c.phone corporate_phone, c.address corporate_address, ' +
        'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.client_type, ' +
        'a.workflowID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.loanCirrusID, a.reschedule_amount, w.current_stage, ' +
        '(SELECT product FROM preapplications WHERE ID = a.preapplicationID) AS product, ' +
        '(SELECT status FROM client_applications WHERE ID = a.preapplicationID) AS client_applications_status, ' +
        '(CASE WHEN (SELECT COUNT(*) FROM application_information_requests WHERE applicationID = a.ID) > 0 THEN 1 ELSE 0 END) information_request_status, ' +
        '(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status ' +
        'FROM clients AS u, workflow_processes AS w, applications AS a LEFT JOIN corporates AS c ON a.userID = c.ID ' +
        'WHERE u.ID=a.userID AND a.status <> 0 AND w.ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=a.ID AND status=1) ';
    if (type){
        switch (type){
            case '1': {
                //do nothing
                break;
            }
            case '2': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage<>2  AND w.current_stage<>3 ");
                break;
            }
            case '3': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage=2 ");
                break;
            }
            case '4': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage=3 ");
                break;
            }
            case '5': {
                query = query.concat("AND a.status = 2  AND a.close_status = 0 ");
                break;
            }
            case '6': {
                query = query.concat("AND a.close_status <> 0 ");
                break;
            }
        }
    }
    if (start && end)
        query = query.concat("AND TIMESTAMP(a.date_created) < TIMESTAMP('"+end+"') AND TIMESTAMP(a.date_created) >= TIMESTAMP('"+start+"') ");
    query = query.concat("ORDER BY a.ID desc");
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
        }
    });
});

users.get('/requests', function(req, res, next) {
    let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
        'a.loan_amount, a.date_modified, a.comment FROM clients AS u, requests AS a WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
        }
    });
});

//Get A User's Applications For Profile Page
users.get('/user-applications/:id', function(req, res, next) {
    let query = 'SELECT * FROM applications WHERE userid = ? AND interest_rate <> 0 ORDER BY id desc';
    db.query(query, req.params.id, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send(results);
        }
    });
});

users.get('/application/:id', function(req, res, next) {
    let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
        'a.workflowID, a.loan_amount, a.date_modified, a.comment FROM clients AS u, applications AS a WHERE u.ID=a.userID AND u.ID =?';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
        }
    });
});

users.get('/application-id/:id', function(req, res, next) {
    let obj = {},
        application_id = req.params.id,
        path = 'files/application-'+application_id+'/',
        query = 'SELECT u.ID userID, u.fullname, u.phone, u.email, u.address, u.industry, u.date_created client_date_created, a.fees, ' +
            '(SELECT title FROM loan_purpose_settings WHERE ID = a.loan_purpose) loan_purpose, (SELECT GROUP_CONCAT(document) FROM workflow_stages WHERE workflowID = a.workflowID) documents, '+
            '(SELECT GROUP_CONCAT(download) FROM workflow_stages WHERE workflowID = a.workflowID) downloads, cast(u.loan_officer as unsigned) loan_officer, ' +
            'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.workflowID, a.interest_rate, a.repayment_date, ' +
            'a.reschedule_amount, a.loanCirrusID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.duration, a.client_type, a.interest_rate, a.duration, a.preapplicationID, ' +
            '(SELECT l.supervisor FROM users l WHERE l.ID = u.loan_officer) AS supervisor, ' +
            '(SELECT sum(amount) FROM escrow WHERE clientID=u.ID AND status=1) AS escrow, ' +
            '(SELECT status FROM client_applications WHERE ID = a.preapplicationID) AS client_applications_status, ' +
            'r.payerBankCode, r.payerAccount, r.requestId, r.mandateId, r.remitaTransRef ' +
            'FROM clients AS u INNER JOIN applications AS a ON u.ID = a.userID LEFT JOIN remita_mandates r ' +
            'ON (r.applicationID = a.ID AND r.status = 1) WHERE a.ID = ?',
        query2 = 'SELECT u.ID userID, c.ID contactID, u.name fullname, u.phone, u.email, u.address, u.industry, u.incorporation_date, u.registration_number, u.date_created client_date_created, a.fees, ' +
            '(SELECT title FROM loan_purpose_settings WHERE ID = a.loan_purpose) loan_purpose, (SELECT GROUP_CONCAT(document) FROM workflow_stages WHERE workflowID = a.workflowID) documents, '+
            '(SELECT GROUP_CONCAT(download) FROM workflow_stages WHERE workflowID = a.workflowID) downloads, cast(c.loan_officer as unsigned) loan_officer, ' +
            'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.workflowID, a.interest_rate, a.repayment_date, ' +
            'a.reschedule_amount, a.loanCirrusID, a.loan_amount, a.date_modified, a.comment, a.close_status, a.duration, a.client_type, a.interest_rate, a.duration, a.preapplicationID, ' +
            '(SELECT l.supervisor FROM users l WHERE l.ID = c.loan_officer) AS supervisor, ' +
            '(SELECT sum(amount) FROM escrow WHERE clientID=u.ID AND status=1) AS escrow, ' +
            '(SELECT status FROM client_applications WHERE ID = a.preapplicationID) AS client_applications_status, ' +
            'r.payerBankCode, r.payerAccount, r.requestId, r.mandateId, r.remitaTransRef ' +
            'FROM corporates AS u INNER JOIN applications AS a ON u.ID = a.userID INNER JOIN clients AS c ON u.clientID=c.ID LEFT JOIN remita_mandates r ' +
            'ON (r.applicationID = a.ID AND r.status = 1) WHERE a.ID = ?';
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query('SELECT client_type FROM applications WHERE ID = ?', [application_id], function (error, app, fields) {
            if (error || !app[0]) {
                res.send({"status": 500, "error": error, "response": null});
            } else {
                if (app[0]['client_type'] === 'corporate')
                    query = query2;
                connection.query(query, [application_id], function (error, result, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        result = (result[0])? result[0] : {};
                        connection.query('SELECT * FROM application_schedules WHERE applicationID=?', [application_id], function (error, schedule, fields) {
                            if (error) {
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                result.schedule = schedule;
                                connection.query('SELECT * FROM schedule_history WHERE applicationID=? AND status=1 ORDER BY ID desc', [application_id], function (error, payment_history, fields) {
                                    connection.release();
                                    if (error) {
                                        res.send({"status": 500, "error": error, "response": null});
                                    } else {
                                        result.payment_history = payment_history;
                                        let path2 = `files/client_application-${result.preapplicationID}/`,
                                            path3 = `files/application_download-${application_id}/`;
                                        result.files = {};
                                        fs.readdir(path, function (err, files){
                                            if (err) files = [];
                                            files = helperFunctions.removeFileDuplicates(path, files);
                                            async.forEach(files, function (file, callback){
                                                let filename = file.split('.')[0].split('_');
                                                filename.shift();
                                                obj[filename.join('_')] = path+file;
                                                callback();
                                            }, function(data){
                                                result.files = Object.assign({}, result.files, obj);
                                                obj = {};
                                                fs.readdir(path2, function (err, files){
                                                    if (err) files = [];
                                                    files = helperFunctions.removeFileDuplicates(path2, files);
                                                    async.forEach(files, function (file, callback){
                                                        let filename = file.split('.')[0].split('_');
                                                        filename.shift();
                                                        obj[filename.join('_')] = path2+file;
                                                        callback();
                                                    }, function(data){
                                                        result.files = Object.assign({}, result.files, obj);
                                                        obj = {};
                                                        fs.readdir(path3, function (err, files){
                                                            if (err) files = [];
                                                            files = helperFunctions.removeFileDuplicates(path3, files);
                                                            async.forEach(files, function (file, callback){
                                                                let filename = file.split('.')[0].split('_');
                                                                filename.shift();
                                                                obj[filename.join('_')] = path3+file;
                                                                callback();
                                                            }, function(data){
                                                                result.file_downloads = obj;
                                                                return res.send({"status": 200, "message": "User applications fetched successfully!", "response": result});
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    });
});

/* GET User Applications. */
users.get('/applications/:officerID', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        type = req.query.type,
        id = req.params.officerID;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");

    let query = "SELECT u.fullname, u.phone, u.email, u.address, c.name corporate_name, c.email corporate_email, c.phone corporate_phone, c.address corporate_address, " +
        "a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.client_type, " +
        "a.loan_amount, a.date_modified, a.comment, a.close_status, a.workflowID, a.loanCirrusID, a.reschedule_amount, w.current_stage," +
        "(SELECT product FROM preapplications WHERE ID = a.preapplicationID) AS product," +
        "(SELECT status FROM client_applications WHERE ID = a.preapplicationID) AS client_applications_status, " +
        "(CASE WHEN (SELECT COUNT(*) FROM application_information_requests WHERE a.ID = applicationID) > 0 THEN 1 ELSE 0 END) information_request_status," +
        "(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status " +
        "FROM clients AS u, workflow_processes AS w, applications AS a LEFT JOIN corporates AS c ON a.userID = c.ID " +
        "WHERE u.ID=a.userID AND a.status <> 0 AND w.ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=a.ID AND status=1) ",
        query2 = query.concat('AND loan_officer = '+id+' '),
        query3 = query.concat('AND (select supervisor from users where users.id = u.loan_officer) =  '+id+' ');
    if (id)
        query = query2;
    if (type){
        switch (type){
            case '1': {
                //do nothing
                break;
            }
            case '2': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage<>2  AND w.current_stage<>3 ");
                break;
            }
            case '3': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage=2 ");
                break;
            }
            case '4': {
                query = query.concat("AND a.status = 1 AND a.close_status = 0 AND w.current_stage=3 ");
                break;
            }
            case '5': {
                query = query.concat("AND a.status = 2  AND a.close_status = 0 ");
                break;
            }
            case '6': {
                query = query.concat("AND a.close_status <> 0 ");
                break;
            }
        }
    }
    if (start && end)
        query = query.concat("AND TIMESTAMP(a.date_created) < TIMESTAMP('"+end+"') AND TIMESTAMP(a.date_created) >= TIMESTAMP('"+start+"') ");
    query = query.concat("ORDER BY a.ID desc");
    if (id){
        db.query(query, function (error, results1, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query(query3, function (error, results2, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        results = results1.concat(results2);
                        res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
                    }
                });
            }
        });
    } else {
        db.query(query, function (error, results, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
            }
        });
    }
});

users.get('/collections/filter', function(req, res, next) {
    let type = req.query.type,
        range = parseInt(req.query.range),
        today = moment().utcOffset('+0100').format('YYYY-MM-DD');

    let query = "SELECT s.ID, (select fullname from clients c where c.ID = (select userID from applications a where a.ID = s.applicationID)) AS client, " +
        "(select ID from clients c where c.ID = (select userID from applications a where a.ID = s.applicationID)) AS clientID, " +
        "s.applicationID, s.status, s.payment_amount, s.payment_collect_date, s.payment_status, 'Principal' AS 'type' FROM application_schedules AS s " +
        "WHERE s.status = 1 AND s.payment_status = 0 AND (select status from applications a where a.ID = s.applicationID) = 2 " +
        "AND (select close_status from applications a where a.ID = s.applicationID) = 0 AND s.payment_amount > 0 ";

    collectionsQueryMiddleware(query, type, range, today, function (response) {
        if (response.status !== 200)
            return res.send(response);
        let query = "SELECT s.ID, (select fullname from clients c where c.ID = (select userID from applications a where a.ID = s.applicationID)) AS client, " +
            "(select ID from clients c where c.ID = (select userID from applications a where a.ID = s.applicationID)) AS clientID, " +
            "s.applicationID, s.status, s.interest_amount as payment_amount, s.interest_collect_date as payment_collect_date, s.payment_status, 'Interest' AS 'type' FROM application_schedules AS s " +
            "WHERE s.status = 1 AND s.payment_status = 0 AND (select status from applications a where a.ID = s.applicationID) = 2 " +
            "AND (select close_status from applications a where a.ID = s.applicationID) = 0 AND s.interest_amount > 0 ",
            results_principal = response.response;
        collectionsQueryMiddleware(query, type, range, today, function (response) {
            if (response.status !== 200)
                return res.send(response);
            let results_interest = response.response,
                results = results_principal.concat(results_interest);
            return res.send({"status": 200, "message": "Collections fetched successfully!", "response": results});
        });
    });
});

function collectionsQueryMiddleware(query, type, range, today, callback) {
    switch (type) {
        case 'due': {
            query = query.concat(collectionDueRangeQuery(today, range));
            break;
        }
        case 'overdue': {
            query = query.concat(collectionOverdueRangeQuery(today, range));
            break;
        }
    }
    query = query.concat(" ORDER BY ID desc");
    db.query(query, function (error, results, fields) {
        if(error){
            callback({"status": 500, "error": error, "response": null});
        } else {
            callback({"status": 200, "response": results});
        }
    });
}

function collectionDueRangeQuery(today, range){
    switch (range){
        case 0: {
            return 'AND TIMESTAMP(payment_collect_date) = TIMESTAMP("'+today+'") ';
        }
        case 1: {
            return 'AND TIMESTAMP(payment_collect_date) = TIMESTAMP("'+moment(today).add(1, "days").format("YYYY-MM-DD")+'") ';
        }
        case 7: {
            return 'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).add(2, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).add(7, "days").format("YYYY-MM-DD")+'") ';
        }
        case 14: {
            return 'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).add(8, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).add(14, "days").format("YYYY-MM-DD")+'") ';
        }
        case 30: {
            return 'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).add(15, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).add(30, "days").format("YYYY-MM-DD")+'") ';
        }
        case 60: {
            return 'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).add(31, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).add(60, "days").format("YYYY-MM-DD")+'") ';
        }
        case 61: {
            return 'AND TIMESTAMP(payment_collect_date) > TIMESTAMP("'+moment(today).add(60, "days").format("YYYY-MM-DD")+'") ';
        }
    }
}

function collectionOverdueRangeQuery(today, range){
    switch (range){
        case 0: {
            return 'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).subtract(1, "days").format("YYYY-MM-DD")+'") ';
        }
        case 1: {
            return 'AND TIMESTAMP(payment_collect_date) = TIMESTAMP("'+moment(today).subtract(1, "days").format("YYYY-MM-DD")+'") ';
        }
        case 7: {
            return 'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).subtract(2, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).subtract(7, "days").format("YYYY-MM-DD")+'") ';
        }
        case 14: {
            return 'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).subtract(8, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).subtract(14, "days").format("YYYY-MM-DD")+'") ';
        }
        case 30: {
            return 'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).subtract(15, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).subtract(30, "days").format("YYYY-MM-DD")+'") ';
        }
        case 60: {
            return 'AND TIMESTAMP(payment_collect_date) <= TIMESTAMP("'+moment(today).subtract(31, "days").format("YYYY-MM-DD")+'") ' +
                'AND TIMESTAMP(payment_collect_date) >= TIMESTAMP("'+moment(today).subtract(60, "days").format("YYYY-MM-DD")+'") ';
        }
        case 61: {
            return 'AND TIMESTAMP(payment_collect_date) < TIMESTAMP("'+moment(today).subtract(60, "days").format("YYYY-MM-DD")+'") ';
        }
    }
}

users.get('/requests/filter/:start/:end', function(req, res, next) {
    let start = req.params.start,
        end = req.params.end;
    end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let query = "SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, " +
        "a.loan_amount, a.date_modified, a.comment FROM clients AS u, requests AS a WHERE u.ID=a.userID AND a.status <> 0 " +
        "AND TIMESTAMP(a.date_created) < TIMESTAMP('"+end+"') AND TIMESTAMP(a.date_created) >= TIMESTAMP('"+start+"') ORDER BY a.ID desc";
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User applications fetched successfully!", "response": results});
        }
    });
});

users.get('/applications/delete/:id', function(req, res, next) {
    let id = req.params.id,
        date_modified = Date.now(),
        query =  'UPDATE applications SET status=0, date_modified=? where ID=?';
    db.query(query,[date_modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT u.fullname, u.phone, u.email, u.address, c.name corporate_name, c.email corporate_email, c.phone corporate_phone, c.address corporate_address, ' +
                'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.client_type, ' +
                'a.workflowID, a.loan_amount, a.date_modified, a.comment, a.loanCirrusID, a.reschedule_amount,' +
                '(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status ' +
                'FROM clients AS u, applications AS a LEFT JOIN corporates AS c ON a.userID = c.ID WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
            db.query(query, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'Loan Application Archived'
                    payload.affected= id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application archived successfully!", "response": results});
                }
            });
        }
    });
});

users.get('/requests/delete/:id', function(req, res, next) {
    let id = req.params.id,
        date_modified = Date.now(),
        query =  'UPDATE requests SET status=0, date_modified=? where ID=?';
    db.query(query,[date_modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
                'a.loan_amount, a.date_modified, a.comment FROM clients AS u, requests AS a WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
            db.query(query, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'Loan Request Archived'
                    payload.affected = id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application archived successfully!", "response": results});
                }
            });
        }
    });
});

users.post('/applications/comment/:id', function(req, res, next) {
    let id = req.params.id,
        comment = req.body.comment,
        date_modified = Date.now(),
        query =  'UPDATE applications SET comment=?, date_modified=? where ID=?';
    db.query(query,[comment, date_modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT u.fullname, u.phone, u.email, u.address, c.name corporate_name, c.email corporate_email, c.phone corporate_phone, c.address corporate_address, ' +
                'a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, a.client_type, ' +
                'a.workflowID, a.loan_amount, a.date_modified, a.comment, a.loanCirrusID, a.reschedule_amount,' +
                '(SELECT (CASE WHEN (sum(s.payment_amount) > 0) THEN 1 ELSE 0 END) FROM application_schedules s WHERE s.applicationID=a.ID AND status = 2) AS reschedule_status ' +
                'FROM clients AS u, applications AS a LEFT JOIN corporates AS c ON a.userID = c.ID WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
            db.query(query, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'New comment on Loan Application'
                    payload.affected = id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application commented successfully!", "response": results});
                }
            });
        }
    });
});

users.post('/requests/comment/:id', function(req, res, next) {
    let id = req.params.id,
        comment = req.body.comment,
        date_modified = Date.now(),
        query =  'UPDATE requests SET comment=?, date_modified=? where ID=?';
    db.query(query,[comment, date_modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
                'a.loan_amount, a.date_modified, a.comment FROM clients AS u, requests AS a WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
            db.query(query, function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'New comment on Loan Request'
                    payload.affected = id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application commented successfully!", "response": results});
                }
            });
        }
    });
});

users.get('/application/assign_workflow/:id/:workflow_id/:agent_id', function(req, res, next) {
    let id = req.params.id,
        agent_id = req.params.agent_id,
        workflow_id = req.params.workflow_id,
        date_modified = Date.now(),
        query =  'UPDATE applications SET workflowID=?, date_modified=? where ID=?';
    db.query(query,[workflow_id, date_modified, id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            helperFunctions.getNextWorkflowProcess(false,workflow_id,false, function (process) {
                process.workflowID = workflow_id;
                process.applicationID = id;
                process.agentID = agent_id;
                process.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                db.query('INSERT INTO workflow_processes SET ?',process, function (error, results, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        let query = 'SELECT u.fullname, u.phone, u.email, u.address, a.ID, a.status, a.collateral, a.brand, a.model, a.year, a.jewelry, a.date_created, ' +
                            'a.workflowID, a.loan_amount, a.date_modified, a.comment FROM clients AS u, applications AS a WHERE u.ID=a.userID AND a.status <> 0 ORDER BY a.ID desc';
                        db.query(query, function (error, results, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                res.send({"status": 200, "message": "Workflow assigned successfully!", "response": results});
                            }
                        });
                    }
                });
            });
        }
    });
});

users.post('/workflow_process/:application_id/:workflow_id', function(req, res, next) {
    let stage = req.body.stage,
        agent_id = req.body.agentID,
        user_role = req.body.user_role,
        workflow_id = req.params.workflow_id,
        application_id = req.params.application_id;
    if (!application_id || !workflow_id || !user_role)
        return res.send({"status": 500, "error": "Required Parameter(s) not sent!"});
    if (!stage || (Object.keys(stage).length === 0 && stage.constructor === Object))
        stage = false;
    helperFunctions.getNextWorkflowProcess(application_id,workflow_id,stage, function (process) {
        process.workflowID = workflow_id;
        process.applicationID = application_id;
        if (!process.approver_id || (process.approver_id === 0))
            process.approver_id = 1;
        process.agentID = agent_id;
        process.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        db.query('SELECT * FROM workflow_processes WHERE ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=? AND status=1)', [application_id], function (error, last_process, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query('UPDATE workflow_processes SET approval_status=? WHERE ID=? AND status=1',[1,last_process[0]['ID']], function (error, status, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        if (!(((process.approver_id).split(',')).includes((user_role).toString())))
                            return res.send({"status": 500, "message": "You do not have authorization rights"});
                        delete process.approver_id;
                        db.query('INSERT INTO workflow_processes SET ?',process, function (error, results, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                let payload = {}
                                payload.category = 'Application'
                                payload.userid = req.cookies.timeout
                                payload.description = 'Loan Application moved to next Workflow Stage'
                                payload.affected = application_id
                                notificationsService.log(req, payload)
                                res.send({"status": 200, "message": "Workflow Process created successfully!"});
                            }
                        });
                    }
                });
            }
        });
    });
});

users.get('/revert_workflow_process/:application_id', function(req, res, next) {
    let query = 'SELECT * FROM workflow_processes WHERE ID = (SELECT MAX(ID) FROM workflow_processes WHERE applicationID=? AND status=1)';
    db.query(query, [req.params.application_id], function (error, last_process, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            db.query('UPDATE workflow_processes SET status=? WHERE ID=?',[0,last_process[0]['ID']], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "Workflow Process reverted successfully!", "response": null});
                }
            });
        }
    });
});

users.get('/workflow_process/:application_id', function(req, res, next) {
    let query = 'SELECT * FROM workflow_processes WHERE applicationID = ? AND status=1';
    db.query(query, [req.params.application_id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Workflow Process fetched successfully!", "response": results});
        }
    });
});

users.get('/workflow_process_all/:application_id', function(req, res, next) {
    let query = 'SELECT w.ID, w.workflowID, w.previous_stage, w.current_stage, w.next_stage, w.approval_status, w.date_created, w.applicationID, w.status,' +
        'w.agentID, u.fullname AS agent, (SELECT role_name FROM user_roles WHERE ID = u.user_role) role, (SELECT name FROM workflow_stages WHERE workflowID = w.workflowID AND stageID = w.current_stage) stage ' +
        'FROM workflow_processes AS w, users AS u WHERE applicationID = ? AND w.agentID = u.ID';
    db.query(query, [req.params.application_id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "All Workflow Process fetched successfully!", "response": results});
        }
    });
});

users.post('/application/comments/:id/:user_id', function(req, res, next) {
    db.query('INSERT INTO application_comments SET ?', [{applicationID:req.params.id,userID:req.params.user_id,text:req.body.text,date_created:moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')}],
        function (error, response, fields) {
            if(error || !response)
                return res.send({"status": 500, "error": error, "response": null});
            db.query('SELECT c.text, c.date_created, u.fullname FROM application_comments AS c, users AS u WHERE c.applicationID = ? AND c.userID=u.ID ORDER BY c.ID desc', [req.params.id], function (error, comments, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'New comment on Loan Application'
                    payload.affected = req.params.id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application commented successfully!", "response": comments});
                }
            });
        });
});

users.get('/application/comments/:id', function(req, res, next) {
    db.query(`SELECT c.text, c.date_created, c.user_type,
        (CASE WHEN c.user_type = 'admin' THEN (SELECT fullname FROM users WHERE ID = c.userID)
        WHEN c.user_type = 'client' THEN (SELECT fullname FROM clients WHERE ID = c.userID) END) fullname
        FROM application_comments c WHERE c.applicationID = ${req.params.id} ORDER BY c.ID DESC`, (error, comments) => {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Application comments fetched successfully!", "response": comments});
        }
    })
});

users.post('/application/information-request/:id', (req, res) => {
    let payload = req.body;
    payload.applicationID = req.params.id;
    payload.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO application_information_requests SET ?', payload, (error, response) => {
        if(error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });
        return res.send({
            "status": 200,
            "error": null,
            "response": "Application information requested successfully!"
        });
    });
});

users.get('/application/information-request/:id', function(req, res, next) {
    db.query(`SELECT i.*, u.fullname FROM application_information_requests i, users u 
    WHERE i.applicationID = ${req.params.id} AND i.created_by=u.ID ORDER BY i.ID desc`, (error, information) => {
        if(error) return res.send({
            "status": 500,
            "error": error,
            "response": null
        });
        return res.send({
            "status": 200,
            "error": null,
            "response": information
        });
    })
});

users.post('/application/schedule/:id', function(req, res, next) {
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query('SELECT * FROM application_schedules WHERE applicationID = ? AND status = 1', [req.params.id], function (error, invoices, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                async.forEach(invoices, function (invoice, callback) {
                    connection.query('UPDATE application_schedules SET status=0 WHERE ID = ?', [invoice.ID], function (error, response, fields) {
                        callback();
                    });
                }, function (data) {
                    let count = 0;
                    async.forEach(req.body.schedule, function (obj, callback2) {
                        obj.applicationID = req.params.id;
                        connection.query('INSERT INTO application_schedules SET ?', obj, function (error, response, fields) {
                            if(!error) count++;
                            callback2();
                        });
                    }, function (data) {
                        connection.release();
                        res.send({"status": 200, "message": "Application scheduled with "+count+" invoices successfully!", "response": null});
                    });
                });
            }
        });
    });
});

async function syncXeroSchedule (req, res, connection, client, schedule, xeroPrincipal, method) {
    for (let i=0; i <schedule.length; i++)
        await postXeroSchedule(req, res, connection, schedule[i], client, xeroPrincipal, method);
    return;
}

async function postXeroSchedule (req, res, connection, obj, client, xeroPrincipal, method) {
    const xeroClient = await xeroFunctions.authorizedOperation(req, res, 'xero_loan_account');
    const date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    if (xeroClient && client.integration && 
        client.integration.xero_interest_account && client.integration.xero_loan_account_status) {
        let xeroInterest = await xeroClient.invoices.create({
            Type: 'ACCREC',
            Contact: {
                Name: client.fullname
            },
            Date: obj.interest_create_date,
            DueDate: obj.interest_collect_date,
            LineItems: [{
                Description: `LOAN ID: ${helperFunctions.padWithZeroes(obj.applicationID, 9)} | 
                    Interest receivable for this on ${obj.interest_collect_date}`,
                Quantity: '1',
                UnitAmount: obj.interest_amount,
                AccountCode: client.integration.xero_interest_account
            }],
            Status: client.integration.xero_loan_account_status,
            Reference: helperFunctions.padWithZeroes(obj.applicationID, 9)
        });
        obj.principal_invoice_no = xeroPrincipal.Invoices[0]['InvoiceNumber'];
        obj.interest_invoice_no = xeroInterest.Invoices[0]['InvoiceNumber'];
    }
    let query;
    if (method === 'post') {
        obj.applicationID = req.params.id;
        obj.date_created = date;
        query = 'INSERT INTO application_schedules SET ?';
    }
    if (method === 'put') {
        obj.date_modified = date;
        obj.status = 1;
        query = `UPDATE application_schedules SET ? WHERE ID = ${obj.ID}`;
    }
    connection.query(query, obj, error => {});
    return;
}

users.post('/application/approve-schedule/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async () => {
        db.getConnection(function(err, connection) {
            if (err) throw err;

            connection.query(`SELECT a.ID, a.loan_amount amount, a.userID clientID, c.loan_officer loan_officerID, c.branch branchID, c.fullname 
                FROM applications a, clients c WHERE a.ID=${req.params.id} AND a.userID=c.ID`, function (error, app, fields) {
                if (error) {
                    res.send({"status": 500, "error": error, "response": null});
                } else if (!app[0]) {
                    res.send({"status": 500, "error": "Application does not exist!", "response": null});
                } else {
                    let application = app[0],
                        reschedule_amount = req.body.reschedule_amount,
                        loan_amount_update = req.body.loan_amount_update,
                        date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    connection.query('UPDATE applications SET loan_amount = ?, reschedule_amount = ?, date_modified = ? WHERE ID = ?', 
                    [loan_amount_update,reschedule_amount,date_modified,req.params.id], function (error, invoice) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            connection.query(`SELECT * FROM application_schedules WHERE applicationID = ${req.params.id} AND status = 1`, (error, old_schedule) => {
                                let obj2 = {};
                                async.forEach(old_schedule, (old_invoice, callback2) => {
                                    if (old_invoice.interest_invoice_no) {
                                        xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient, integration) => {
                                            if (xeroClient && integration && integration.xero_interest_account) {
                                                let xeroInterest2 = await xeroClient.invoices.update({
                                                    Type: 'ACCREC',
                                                    Contact: {
                                                        Name: application.fullname
                                                    },
                                                    Date: old_invoice.interest_create_date,
                                                    DueDate: old_invoice.interest_collect_date,
                                                    LineItems: [{
                                                        Description: `LOAN ID: ${helperFunctions.padWithZeroes(old_invoice.applicationID, 9)} | 
                                                            Interest receivable for this on ${old_invoice.interest_collect_date}`,
                                                        Quantity: '1',
                                                        UnitAmount: old_invoice.interest_amount,
                                                        AccountCode: integration.xero_interest_account
                                                    }],
                                                    InvoiceNumber: old_invoice.interest_invoice_no,
                                                    Status: "VOIDED",
                                                    Reference: helperFunctions.padWithZeroes(old_invoice.applicationID, 9)
                                                });
                                            }
                                        });
                                    }
                                    obj2.date_modified = date_modified;
                                    obj2.status = 0;
                                    connection.query(`UPDATE application_schedules SET ? WHERE ID = ${old_invoice.ID}`, 
                                    obj2, function (error, response) {
                                        if(error) console.log(error);
                                        callback2();
                                    });
                                }, (data) => {
                                    connection.query(`SELECT * FROM application_schedules WHERE applicationID = ${req.params.id} AND status = 2`, (error, new_schedule) => {
                                        xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient, integration) => {
                                            let xeroPrincipal;
                                            if (xeroClient && integration && integration.xero_principal_account) {
                                                let LineItems = [];
                                                for (let i=0; i<new_schedule.length; i++) {
                                                    let invoice = new_schedule[i];
                                                    LineItems.push({
                                                        Description: `LOAN ID: ${helperFunctions.padWithZeroes(req.params.id, 9)} | 
                                                            Principal receivable for this on ${invoice.payment_collect_date}`,
                                                        Quantity: '1',
                                                        UnitAmount: invoice.payment_amount,
                                                        AccountCode: integration.xero_principal_account
                                                    });
                                                }
                                                xeroPrincipal = await xeroClient.invoices.create({
                                                    Type: 'ACCREC',
                                                    Contact: {
                                                        Name: application.fullname
                                                    },
                                                    Date: new_schedule[0]['payment_create_date'],
                                                    DueDate: new_schedule[0]['payment_collect_date'],
                                                    LineItems: LineItems,
                                                    Status: integration.xero_loan_account_status,
                                                    Reference: helperFunctions.padWithZeroes(req.params.id, 9)
                                                });
                                            }
                                            application.integration = integration;
                                            syncXeroSchedule(req, res, connection, application, new_schedule, xeroPrincipal, 'put')
                                            .then(response => {
                                                let disbursement = {
                                                    loan_id: application.ID,
                                                    amount: reschedule_amount,
                                                    client_id: application.clientID,
                                                    loan_officer: application.loan_officerID,
                                                    branch: application.branchID,
                                                    date_disbursed: date_modified,
                                                    status: 1,
                                                    date_created: date_modified
                                                };
                                                connection.query(`INSERT INTO disbursement_history SET ?`, disbursement, function (error, result, fields) {
                                                    if(error){
                                                        res.send({"status": 500, "error": error, "response": null});
                                                    } else {
                                                        let payload = {};
                                                        payload.category = 'Application';
                                                        payload.userid = req.cookies.timeout;
                                                        payload.description = 'Application Schedule Approved for Loan Application';
                                                        payload.affected = req.params.id;
                                                        notificationsService.log(req, payload);
                                                        connection.release();
                                                        res.send({
                                                            "status": 200,
                                                            "message": `Application schedule with ${new_schedule.length} invoice(s) approved successfully!`,
                                                            "response": null
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    });
                                });     
                            });
                        }
                    });
                }
            });
        });
    });
});

users.get('/application/reject-schedule/:id', function(req, res, next) {
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query('SELECT * FROM application_schedules WHERE applicationID = ? AND status = 2', [req.params.id], function (error, new_schedule, fields) {
            if (error) {
                res.send({"status": 500, "error": error, "response": null});
            } else {
                let count = 0;
                async.forEach(new_schedule, function (obj, callback2) {
                    connection.query('DELETE FROM application_schedules WHERE ID = ?', [obj.ID], function (error, response, fields) {
                        if(!error)
                            count++;
                        callback2();
                    });
                }, function (data) {
                    connection.release();
                    let payload = {}
                    payload.category = 'Application'
                    payload.userid = req.cookies.timeout
                    payload.description = 'Schedule Rejected for Loan Application'
                    payload.affected = req.params.id
                    notificationsService.log(req, payload)
                    res.send({"status": 200, "message": "Application schedule with "+count+" invoices deleted successfully!", "response": null});
                });
            }
        });
    });
});

users.post('/application/add-schedule/:id', function(req, res, next) {
    db.getConnection(function(err, connection) {
        if (err) throw err;

        let count = 0;
        async.forEach(req.body.schedule, function (obj, callback) {
            obj.applicationID = req.params.id;
            obj.status = 2;
            obj.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
            connection.query('INSERT INTO application_schedules SET ?', obj, function (error, response, fields) {
                if(!error)
                    count++;
                callback();
            });
        }, function (data) {
            connection.release();
            let payload = {}
            payload.category = 'Application'
            payload.userid = req.cookies.timeout
            payload.description = 'New Schedule Uploaded for Loan Application'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send({"status": 200, "message": "Application scheduled with "+count+" invoices successfully!", "response": null});
        })
    });
});

users.get('/application/schedule/:id', function(req, res, next) {
    db.query('SELECT * FROM application_schedules WHERE applicationID = ? AND status = 1', [req.params.id], function (error, schedule, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Application schedule fetched successfully!", "response": schedule});
        }
    });
});

users.post('/application/add-payment/:id/:agent_id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async () => {
        db.query('SELECT c.fullname FROM applications a, clients c '+
        'WHERE a.ID = ? AND a.userID = c.ID', [req.params.id], function (error, application, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                let data = req.body;
                data.applicationID = req.params.id;
                data.payment_create_date = data.interest_create_date;
                data.payment_collect_date = data.interest_collect_date;
                data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient, integration) => {
                    if (xeroClient && integration && integration.xero_interest_account) {
                        let xeroInterest = await xeroClient.invoices.create({
                            Type: 'ACCREC',
                            Contact: {
                                Name: application[0]['fullname']
                            },
                            Date: data.interest_create_date,
                            DueDate: data.interest_collect_date,
                            LineItems: [{
                                Description: `LOAN ID: ${helperFunctions.padWithZeroes(data.applicationID, 9)} | 
                                    Interest receivable for this on ${data.interest_collect_date}`,
                                Quantity: '1',
                                UnitAmount: data.interest_amount,
                                AccountCode: integration.xero_interest_account
                            }],
                            Status: integration.xero_loan_account_status,
                            Reference: helperFunctions.padWithZeroes(data.applicationID, 9)
                        });
                        data.interest_invoice_no = xeroInterest.Invoices[0]['InvoiceNumber'];
                    }
                    db.query('INSERT INTO application_schedules SET ?', data, function (error, response, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            let payload = {}
                            payload.category = 'Application'
                            payload.userid = req.cookies.timeout
                            payload.description = 'New Loan Application Payment'
                            payload.affected = req.params.id
                            notificationsService.log(req, payload)
                            return res.send({"status": 200, "message": "Payment added successfully!"});
                        }
                    });
                });
            }
        });
    });
});

users.get('/application/confirm-payment/:id', function(req, res, next) {
    db.query('UPDATE application_schedules SET payment_status=1 WHERE ID = ?', [req.params.id], function (error, invoice, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Invoice Payment confirmed successfully!"});
        }
    });
});

users.post('/application/edit-schedule/:id/:modifier_id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async () => {
        let data = req.body;
        data.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        data.modifierID = req.params.modifier_id;
        db.getConnection(function(err, connection) {
            if (err) throw err;

            connection.query('UPDATE application_schedules SET ? WHERE ID = '+req.params.id, data, function (error, response, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    connection.query('SELECT s.*, c.fullname FROM application_schedules s, applications a, clients c '+
                    'WHERE s.ID = ? AND a.ID = s.applicationID AND c.ID = a.userID',[req.params.id], function (error, invoice_obj, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            let invoice = {
                                invoiceID: invoice_obj[0].ID,
                                applicationID: invoice_obj[0].applicationID,
                                interest_amount: invoice_obj[0].interest_amount,
                                payment_amount: invoice_obj[0].payment_amount,
                                payment_collect_date: invoice_obj[0].payment_collect_date,
                                payment_create_date: invoice_obj[0].payment_create_date,
                                interest_collect_date: invoice_obj[0].interest_collect_date,
                                interest_create_date: invoice_obj[0].interest_create_date,
                                fees_amount: invoice_obj[0].fees_amount,
                                penalty_amount: invoice_obj[0].penalty_amount,
                                date_modified: invoice_obj[0].date_modified,
                                modifierID: invoice_obj[0].modifierID
                            };
                            if (invoice_obj[0]['interest_invoice_no'])
                                invoice['interest_invoice_no'] = invoice_obj[0]['interest_invoice_no'];
                            if (invoice_obj[0]['payment_invoice_no'])
                                invoice['payment_invoice_no'] = invoice_obj[0]['payment_invoice_no'];
                            connection.query('INSERT INTO edit_schedule_history SET ? ', invoice, function (error, response, fields) {
                                connection.release();
                                if(error){
                                    res.send({"status": 500, "error": error, "response": null});
                                } else {
                                    if (invoice.interest_invoice_no) {
                                        xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient, integration) => {
                                            if (xeroClient && integration && integration.xero_interest_account) {
                                                let xeroInterest = await xeroClient.invoices.update({
                                                    Type: 'ACCREC',
                                                    Contact: {
                                                        Name: invoice_obj[0]['fullname']
                                                    },
                                                    Date: invoice.interest_create_date,
                                                    DueDate: invoice.interest_collect_date,
                                                    LineItems: [{
                                                        Description: `LOAN ID: ${helperFunctions.padWithZeroes(invoice.applicationID, 9)} | 
                                                            Interest receivable for this on ${invoice.interest_collect_date}`,
                                                        Quantity: '1',
                                                        UnitAmount: invoice.interest_amount,
                                                        AccountCode: integration.xero_interest_account
                                                    }],
                                                    InvoiceNumber: invoice.interest_invoice_no,
                                                    Reference: helperFunctions.padWithZeroes(invoice.applicationID, 9)
                                                });
                                            }
                                        });
                                    }
                                    let payload = {}
                                    payload.category = 'Application'
                                    payload.userid = req.cookies.timeout
                                    payload.description = 'Loan Application Schedule updated'
                                    payload.affected = req.params.id
                                    notificationsService.log(req, payload)
                                    res.send({"status": 200, "message": "Schedule updated successfully!"});
                                }
                            });
                        }
                    });
                }
            });
        });
    });
});

users.get('/application/edit-schedule-history/:id', function(req, res, next) {
    db.query('SELECT s.ID, s.invoiceID, s.payment_amount, s.interest_amount, s.fees_amount, s.penalty_amount, s.payment_collect_date, s.date_modified, s.modifierID,' +
        's.applicationID, u.fullname AS modified_by FROM edit_schedule_history AS s, users AS u WHERE s.modifierID=u.ID AND invoiceID = ? ORDER BY ID desc', [req.params.id], function (error, history, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Edit schedule history fetched successfully!", "response":history});
        }
    });
});

users.get('/application/schedule-history/write-off/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_writeoff', async () => {
        db.query(`SELECT xero_writeoff_account FROM integrations WHERE ID = (SELECT MAX(ID) FROM integrations)`, (error, integrations) => {
            db.query('SELECT s.interest_invoice_no, s.interest_amount, a.ID applicationID, c.fullname FROM application_schedules s, applications a, clients c '+
            'WHERE s.ID = '+req.params.id+' AND s.applicationID = a.ID AND a.userID = c.ID', function (error, invoice, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let update = {
                        payment_status: 2,
                        date_modified: moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a')
                    };
                    db.query('UPDATE application_schedules SET ? WHERE ID = '+req.params.id, update, function (error, result, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            xeroFunctions.authorizedOperation(req, res, 'xero_writeoff', async (xeroClient) => {
                                if (xeroClient && invoice[0]['interest_invoice_no'] && integrations[0] && integrations[0]['xero_writeoff_account']) {
                                    let xeroWriteOff = await xeroClient.creditNotes.create({
                                        Type: 'ACCRECCREDIT',
                                        Status: 'AUTHORISED',
                                        Contact: {
                                            Name: invoice[0]['fullname']
                                        },
                                        Date: update.date_modified,
                                        LineItems: [{
                                            Description: `LoanID: ${helperFunctions.padWithZeroes(invoice[0]['applicationID'], 9)}`,
                                            Quantity: '1',
                                            UnitAmount: invoice[0]['interest_amount'],
                                            AccountCode: integrations[0]['xero_writeoff_account'],
                                            TaxType: 'NONE'
                                        }],
                                        Reference: helperFunctions.padWithZeroes(invoice[0]['applicationID'], 9)
                                    });
                                    let xeroWriteOff2 = await xeroClient.creditNotes.update({
                                        Type: 'ACCRECCREDIT',
                                        CreditNoteNumber: xeroWriteOff.CreditNotes[0]['CreditNoteNumber'],
                                        Contact: {
                                            Name: invoice[0]['fullname']
                                        },
                                        Amount: invoice[0]['interest_amount'],
                                        Invoice: {
                                            InvoiceNumber: invoice[0]['interest_invoice_no']
                                        },
                                        Date: update.date_modified
                                    });
                                }
                            });
                            res.send({"status": 200, "message": "Schedule write off successful!"});
                        }
                    });
                }
            });
        });
    });
});

users.post('/application/confirm-payment/:id/:application_id/:agent_id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async () => {
        db.query(`SELECT a.ID, a.loan_amount amount, a.userID clientID, c.loan_officer loan_officerID, c.branch branchID, c.fullname, 
            s.principal_invoice_no, s.interest_invoice_no FROM applications a, clients c, application_schedules s 
            WHERE a.ID = ${req.params.application_id} AND a.userID = c.ID AND a.ID = s.applicationID AND s.ID = ${req.params.id}`, (error, app) => {
            if (error) {
                res.send({"status": 500, "error": error, "response": null});
            } else if (!app[0]) {
                res.send({"status": 500, "error": "Application does not exist!", "response": null});
            } else {
                let data = req.body,
                    application = app[0],
                    postData = Object.assign({},req.body);
                postData.payment_status = 1;
                delete postData.payment_source;
                delete postData.payment_date;
                delete postData.remitaPaymentID;
                delete postData.xeroCollectionBankID;
                delete postData.xeroCollectionDescription;
                db.query('UPDATE application_schedules SET ? WHERE ID = '+req.params.id, postData, function (error, invoice, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        let invoice = {};
                        invoice.invoiceID = req.params.id;
                        invoice.agentID = req.params.agent_id;
                        invoice.applicationID = req.params.application_id;
                        invoice.payment_amount = data.actual_payment_amount;
                        invoice.interest_amount = data.actual_interest_amount;
                        invoice.fees_amount = data.actual_fees_amount;
                        invoice.penalty_amount = data.actual_penalty_amount;
                        invoice.payment_source = data.payment_source;
                        invoice.payment_date = data.payment_date;
                        invoice.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                        invoice.clientID = application.clientID;
                        invoice.loan_officerID = application.loan_officerID;
                        invoice.branchID = application.branchID;
                        if (data.xeroCollectionBankID)
                            invoice.xeroCollectionBankID = data.xeroCollectionBankID;
                        if (data.xeroCollectionDescription)
                            invoice.xeroCollectionDescription = data.xeroCollectionDescription;
                        if (data.remitaPaymentID) invoice.remitaPaymentID = data.remitaPaymentID;
                        if (invoice.payment_amount > 0 && invoice.interest_amount > 0) {
                            invoice.type = 'multiple';
                        } else {
                            if (invoice.payment_amount > 0) {
                                invoice.type = 'principal';
                            } else if (invoice.interest_amount > 0) {
                                invoice.type = 'interest';
                            } else if (invoice.fees_amount > 0) {
                                invoice.type = 'fees';
                            } else if (invoice.penalty_amount > 0) {
                                invoice.type = 'penalty';
                            }
                        }
                        xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async (xeroClient) => {
                            if (xeroClient && invoice.payment_amount > 0 && 
                                application.principal_invoice_no && invoice.xeroCollectionBankID) {
                                let xeroPayment = await xeroClient.payments.create({
                                    Invoice: {
                                        InvoiceNumber: application.principal_invoice_no
                                    },
                                    Account: {
                                        Code: invoice.xeroCollectionBankID
                                    },
                                    Date: invoice.date_created,
                                    Amount: invoice.payment_amount,
                                    IsReconciled: true,
                                    Reference: (invoice.xeroCollectionDescription || '').concat(` | 
                                        ${application.fullname} with LOAN ID: ${helperFunctions.padWithZeroes(application.ID, 9)} | `)
                                });
                                invoice.xeroPrincipalPaymentID = xeroPayment.Payments[0]['PaymentID'];
                            }
                            if (xeroClient && invoice.interest_amount > 0 && 
                                application.interest_invoice_no && invoice.xeroCollectionBankID) {
                                let xeroPayment = await xeroClient.payments.create({
                                    Invoice: {
                                        InvoiceNumber: application.interest_invoice_no
                                    },
                                    Account: {
                                        Code: invoice.xeroCollectionBankID
                                    },
                                    Date: invoice.date_created,
                                    Amount: invoice.interest_amount,
                                    IsReconciled: true,
                                    Reference: (invoice.xeroCollectionDescription || '').concat(` | 
                                        ${application.fullname} with LOAN ID: ${helperFunctions.padWithZeroes(application.ID, 9)} | `)
                                });
                                invoice.xeroInterestPaymentID = xeroPayment.Payments[0]['PaymentID'];
                            }
                            db.query('INSERT INTO schedule_history SET ?', invoice, function (error, response, fields) {
                                if(error){
                                    res.send({"status": 500, "error": error, "response": null});
                                } else {
                                    let payload = {};
                                    payload.category = 'Application';
                                    payload.userid = req.cookies.timeout;
                                    payload.description = 'Loan Application Payment Confirmed';
                                    payload.affected = req.params.application_id;
                                    notificationsService.log(req, payload);
                                    if (!invoice.remitaPaymentID)
                                        return res.send({"status": 200, "message": "Invoice Payment confirmed successfully!"});
                                    let update = {};
                                    update.status = enums.REMITA_PAYMENT.STATUS.FULL_ASSIGNED;
                                    update.invoiceID = invoice.invoiceID;
                                    update.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                    db.query(`UPDATE remita_payments Set ? WHERE ID = ${invoice.remitaPaymentID}`, update, function (error, response) {
                                        if (error) console.log(error);
                                        return res.send({"status": 200, "message": "Invoice Payment confirmed successfully!"});
                                    });
                                }
                            });
                        });
                    }
                });
            }
        });
    });
});

users.post('/application/escrow', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_escrow', async () => {
        let data = req.body;
        data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        db.query(`SELECT fullname, xeroContactID FROM clients WHERE ID = ${data.clientID}`, (error, client) => {
            if (data.type === 'debit') {
                allocateXeroOverpayment(req, res, client[0]);
                delete data.schedule;
                delete data.invoice;
                db.query('INSERT INTO escrow SET ?', data, function (error, result, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        res.send({"status": 200, "message": "Escrow saved successfully!"});
                    }
                });
            } else {
                xeroFunctions.authorizedOperation(req, res, 'xero_escrow', async (xeroClient) => {
                    if (xeroClient && data.xeroCollectionBankID) {
                        let xeroPayment = await xeroClient.bankTransactions.create({
                            Type: 'RECEIVE-OVERPAYMENT',
                            Contact: {
                                Name: client[0]['fullname']
                            },
                            BankAccount: {
                                Code: data.xeroCollectionBankID
                            },
                            LineItems: [{
                                Description: `ClientID: ${helperFunctions.padWithZeroes(data.clientID, 6)}`,
                                LineAmount: data.amount
                            }],
                            Reference: helperFunctions.padWithZeroes(data.clientID, 6)
                        });
                        data.xeroOverpaymentID = xeroPayment.BankTransactions[0]['OverpaymentID'];
                    }
                    db.query('INSERT INTO escrow SET ?', data, function (error, result, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            res.send({"status": 200, "message": "Escrow saved successfully!"});
                        }
                    });
                });
            }
        });
    });
});

function allocateXeroOverpayment(req, res, client) {
    let data = Object.assign({}, req.body);
    xeroFunctions.authorizedOperation(req, res, 'xero_escrow', async (xeroClient) => {
        if (xeroClient) {
            let index = 0,
                principal_amount = parseFloat(data.invoice.actual_payment_amount),
                interest_amount = parseFloat(data.invoice.actual_interest_amount),
                xeroOverpayments_ = await xeroClient.overpayments.get(),
                xeroOverpayments = xeroOverpayments_.Overpayments.filter(e => {
                    return e.RemainingCredit > 0 && e.Contact.ContactNumber === client.xeroContactID
                });
            do {
                let balance = parseFloat(xeroOverpayments[index]['RemainingCredit']);
                if (principal_amount > 0) {
                    if (principal_amount < balance) {
                        let xeroInvoice = await xeroClient.invoices.get({
                            InvoiceNumber: data.schedule.principal_invoice_no
                        });
                        let xeroOverpayment = await xeroClient.overpayments.allocations.create({
                            Invoice: {
                                InvoiceID: xeroInvoice.Invoices[0]['InvoiceID']
                            },
                            Amount: principal_amount
                        },
                        {
                            OverpaymentID: xeroOverpayments[index]['OverpaymentID']
                        });
                        balance -= principal_amount;
                        principal_amount = 0;
                    } else {
                        let xeroInvoice = await xeroClient.invoices.get({
                            InvoiceNumber: data.schedule.principal_invoice_no
                        });
                        let xeroOverpayment = await xeroClient.overpayments.allocations.create({
                            Invoice: {
                                InvoiceID: xeroInvoice.Invoices[0]['InvoiceID']
                            },
                            Amount: balance
                        },
                        {
                            OverpaymentID: xeroOverpayments[index]['OverpaymentID']
                        });
                        principal_amount -= balance;
                        index++;
                        balance = parseFloat(xeroOverpayments[index]['RemainingCredit']);
                    }
                }

                if (interest_amount > 0) {
                    if (interest_amount < balance) {
                        let xeroInvoice = await xeroClient.invoices.get({
                            InvoiceNumber: data.schedule.interest_invoice_no
                        });
                        let xeroOverpayment = await xeroClient.overpayments.allocations.create({
                            Invoice: {
                                InvoiceID: xeroInvoice.Invoices[0]['InvoiceID']
                            },
                            Amount: interest_amount
                        },
                        {
                            OverpaymentID: xeroOverpayments[index]['OverpaymentID']
                        });
                        balance -= interest_amount;
                        interest_amount = 0;
                    } else {
                        let xeroInvoice = await xeroClient.invoices.get({
                            InvoiceNumber: data.schedule.interest_invoice_no
                        });
                        let xeroOverpayment = await xeroClient.overpayments.allocations.create({
                            Invoice: {
                                InvoiceID: xeroInvoice.Invoices[0]['InvoiceID']
                            },
                            Amount: balance
                        },
                        {
                            OverpaymentID: xeroOverpayments[index]['OverpaymentID']
                        });
                        interest_amount -= balance;
                        index++;
                        balance = parseFloat(xeroOverpayments[index]['RemainingCredit']);
                    }
                }
            }
            while (principal_amount > 0 && interest_amount > 0);
        }
    });
}

users.get('/application/escrow-history/:clientID', function(req, res, next) {
    db.query('SELECT * FROM escrow WHERE clientID = '+req.params.clientID, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Escrow fetched successfully!", response: result});
        }
    });
});

Number.prototype.round = function(p) {
    p = p || 10;
    return parseFloat( this.toFixed(p) );
};

users.post('/application/disburse/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async () => {
        db.query(`SELECT a.ID, a.loan_amount amount, a.userID clientID, c.loan_officer loan_officerID, c.branch branchID, c.fullname  
            FROM applications a, clients c WHERE a.ID=${req.params.id} AND a.userID=c.ID`, function (error, app, fields) {
            if (error) {
                res.send({"status": 500, "error": error, "response": null});
            } else if (!app[0]) {
                res.send({"status": 500, "error": "Application does not exist!", "response": null});
            } else {
                let data = req.body,
                    application = app[0];
                data.status = 2;
                data.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                db.query(`UPDATE applications SET ? WHERE ID = ${req.params.id}`, data, function (error, result, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient, integration) => {
                            let xeroDisbursement,
                                disbursement = {
                                    loan_id: application.ID,
                                    amount: application.amount,
                                    client_id: application.clientID,
                                    loan_officer: application.loan_officerID,
                                    branch: application.branchID,
                                    date_disbursed: data.disbursement_date,
                                    status: 1,
                                    date_created: data.date_modified
                                };
                            if (xeroClient && integration && integration.xero_disbursement_account) {
                                xeroDisbursement = await xeroClient.bankTransactions.create({
                                    Type: 'SPEND',
                                    Status: 'AUTHORISED',
                                    Contact: {
                                        Name: application.fullname
                                    },
                                    BankAccount: {
                                        Code: data.funding_source
                                    },
                                    LineItems: [{
                                        Description: `Loan disbursement for ${application.fullname} | 
                                            LOAN ID: ${helperFunctions.padWithZeroes(application.ID, 9)}`,
                                        UnitAmount: application.amount,
                                        AccountCode: integration.xero_disbursement_account,
                                        TaxType: 'NONE'
                                    }],
                                    Date: data.disbursement_date,
                                    Reference: helperFunctions.padWithZeroes(application.ID, 9),
                                    IsReconciled: 'true'
                                });
                                disbursement.xeroDisbursementID = xeroDisbursement.BankTransactions[0]['BankTransactionID'];
                            }
                            db.query(`INSERT INTO disbursement_history SET ?`, disbursement, function (error, result, fields) {
                                if(error){
                                    res.send({"status": 500, "error": error, "response": null});
                                } else {
                                    let payload = {};
                                    payload.category = 'Application';
                                    payload.userid = req.cookies.timeout;
                                    payload.description = 'Loan Disbursed';
                                    payload.affected = req.params.id;
                                    notificationsService.log(req, payload);
                                    createXeroSchedule(req, res);
                                    res.send({"status": 200, "message": "Loan disbursed successfully!"});
                                }
                            });
                        });
                    }
                });
            }
        });
    });
});

function createXeroSchedule (req, res) {
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(`SELECT c.fullname FROM applications a, clients c WHERE a.ID = ${req.params.id} 
        AND a.userID = c.ID`, function (error, client) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                connection.query(`SELECT * FROM application_schedules WHERE applicationID = ${req.params.id} 
                AND status = 1`, function (error, invoices) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        xeroFunctions.authorizedOperation(req, res, 'xero_loan_account', async (xeroClient, integration) => {
                            let xeroPrincipal,
                                schedule = invoices;
                            if (xeroClient && integration && integration.xero_principal_account) {
                                let LineItems = [];
                                for (let i=0; i<schedule.length; i++) {
                                    let invoice = schedule[i];
                                    LineItems.push({
                                        Description: `LOAN ID: ${helperFunctions.padWithZeroes(req.params.id, 9)} | 
                                            Principal receivable for this on ${invoice.payment_collect_date}`,
                                        Quantity: '1',
                                        UnitAmount: invoice.payment_amount,
                                        AccountCode: integration.xero_principal_account
                                    });
                                }
                                xeroPrincipal = await xeroClient.invoices.create({
                                    Type: 'ACCREC',
                                    Contact: {
                                        Name: client[0]['fullname']
                                    },
                                    Date: schedule[0]['payment_create_date'],
                                    DueDate: schedule[0]['payment_collect_date'],
                                    LineItems: LineItems,
                                    Status: integration.xero_loan_account_status,
                                    Reference: helperFunctions.padWithZeroes(req.params.id, 9)
                                });
                            }
                            let client_ = client[0];
                            client_.integration = integration;
                            syncXeroSchedule(req, res, connection, client_, schedule, xeroPrincipal, 'put')
                            .then(response => {
                                connection.release();
                            });
                        });
                    }
                });
            }
        });
    });
}

users.get('/application/invoice-history/:id', function(req, res, next) {
    db.query('SELECT s.ID, s.invoiceID, s.payment_amount, s.interest_amount, s.fees_amount, s.penalty_amount, s.payment_date, s.date_created, s.status,' +
        's.applicationID, u.fullname AS agent FROM schedule_history AS s, users AS u WHERE s.agentID=u.ID AND invoiceID = ? ORDER BY ID desc', [req.params.id], function (error, history, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Invoice history fetched successfully!", "response":history});
        }
    });
});

users.get('/application/payment-reversal/:id/:invoice_id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async () => {
        let id;
        db.query('UPDATE schedule_history SET status=0 WHERE ID=?', [req.params.id], function (error, history, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query('select applicationID, xeroPrincipalPaymentID, xeroInterestPaymentID from schedule_history where ID = ?', 
                [req.params.id], function(error, result, fields){
                    if (error){
                        res.send({"status": 500, "error": error, "response": null});
                    }
                    else {
                        id = result[0]['applicationID'];
                        if (result[0]['xeroPrincipalPaymentID'] || result[0]['xeroInterestPaymentID']) {
                            xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async (xeroClient) => {
                                if (xeroClient && result[0]['xeroPrincipalPaymentID']) {
                                    let xeroPayment = await xeroClient.payments.update(
                                        {
                                            Status: 'DELETED'
                                        },
                                        {
                                            PaymentID: result[0]['xeroPrincipalPaymentID']
                                        }
                                    );
                                }
                                if (xeroClient && result[0]['xeroInterestPaymentID']) {
                                    let xeroPayment = await xeroClient.payments.update(
                                        {
                                            Status: 'DELETED'
                                        },
                                        {
                                            PaymentID: result[0]['xeroInterestPaymentID']
                                        }
                                    );
                                }
                            });
                        }
                        db.query('UPDATE application_schedules SET payment_status=0 WHERE ID=?', [req.params.invoice_id], function (error, history, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                let payload = {}
                                payload.category = 'Application'
                                payload.userid = req.cookies.timeout
                                payload.description = 'Payment Reversed for Loan'
                                payload.affected = id
                                notificationsService.log(req, payload)
                                res.send({"status": 200, "message": "Payment reversed successfully!", "response":history});
                            }
                        });
                    }
                });
            }
        });
    });
});

users.get('/application/escrow-payment-reversal/:id', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_escrow', async () => {
        let update = {};
        update.status = 0,
        update.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        db.query(`SELECT clientID, amount, xeroOverpaymentID, xeroCollectionBankID FROM escrow WHERE ID = ${req.params.id}`, 
        [req.params.id], function (error, escrow, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                if (escrow[0]['xeroOverpaymentID'] && escrow[0]['xeroCollectionBankID']) {
                    xeroFunctions.authorizedOperation(req, res, 'xero_escrow', async (xeroClient) => {
                        if (xeroClient) {
                            let xeroPayment = await xeroClient.payments.update({
                                Overpayment: {
                                    OverpaymentID: escrow[0]['xeroOverpaymentID']
                                },
                                Account: {
                                    Code: escrow[0]['xeroCollectionBankID']
                                },
                                Date: update.date_modified,
                                Amount: escrow[0]['amount'],
                                Reference: `CLIENT ID: ${helperFunctions.padWithZeroes(escrow[0]['clientID'], 6)} | Overpayment refund`
                            });
                        }
                    });
                }
                db.query(`UPDATE escrow SET ? WHERE ID = ${req.params.id}`, update, function (error, response, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        
                        res.send({"status": 200, "message": "Payment reversed successfully!"});
                    }
                });
            }
        });
    });
});

users.post('/application/loancirrus-id/:application_id', function(req, res, next) {
    db.query('UPDATE applications SET loanCirrusID=? WHERE ID=?', [req.body.id,req.params.application_id], function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Loan Cirrus ID updated successfully!"});
        }
    });
});

users.post('/application/pay-off/:id/:agentID', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async () => {
        let data = req.body;
        data.close_status = 1;
        db.getConnection(function(err, connection) {
            if (err) throw err;

            connection.query(`SELECT a.ID, a.loan_amount amount, a.userID clientID, c.loan_officer loan_officerID, c.branch branchID 
                FROM applications a, clients c WHERE a.ID = ${req.params.id} AND a.userID = c.ID`, (error, app) => {
                if (error) {
                    res.send({"status": 500, "error": error, "response": null});
                } else if (!app[0]) {
                    res.send({"status": 500, "error": "Application does not exist!", "response": null});
                } else {
                    let application = app[0];
                    connection.query('UPDATE applications SET ? WHERE ID = '+req.params.id, data, function (error, result, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            connection.query('SELECT * FROM application_schedules WHERE applicationID = ? AND status = 1 AND payment_status = 0', [req.params.id], function (error, invoices, fields) {
                                if(error){
                                    res.send({"status": 500, "error": error, "response": null});
                                } else {
                                    async.forEach(invoices, function (invoice_obj, callback) {
                                        let invoice = {};
                                        invoice.invoiceID = invoice_obj.ID;
                                        invoice.applicationID = req.params.id;
                                        invoice.payment_amount = invoice_obj.payment_amount;
                                        invoice.interest_amount = invoice_obj.interest_amount;
                                        invoice.fees_amount = invoice_obj.fees_amount;
                                        invoice.penalty_amount = invoice_obj.penalty_amount;
                                        invoice.agentID = req.params.agentID;
                                        invoice.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                                        invoice.payment_date = moment().utcOffset('+0100').format('YYYY-MM-DD');
                                        invoice.payment_source = 'cash';
                                        invoice.clientID = application.clientID;
                                        invoice.loan_officerID = application.loan_officerID;
                                        invoice.branchID = application.branchID;
                                        if (invoice.payment_amount > 0 && invoice.interest_amount > 0) {
                                            invoice.type = 'multiple';
                                        } else {
                                            if (invoice.payment_amount > 0) {
                                                invoice.type = 'principal';
                                            } else if (invoice.interest_amount > 0) {
                                                invoice.type = 'interest';
                                            } else if (invoice.fees_amount > 0) {
                                                invoice.type = 'fees';
                                            } else if (invoice.penalty_amount > 0) {
                                                invoice.type = 'penalty';
                                            }
                                        }
                                        xeroFunctions.authorizedOperation(req, res, 'xero_collection_bank', async (xeroClient) => {
                                            if (xeroClient && invoice.payment_amount > 0 && 
                                                invoice_obj.principal_invoice_no && data.close_bank) {
                                                let xeroPayment = await xeroClient.payments.create({
                                                    Invoice: {
                                                        InvoiceNumber: invoice_obj.principal_invoice_no
                                                    },
                                                    Account: {
                                                        Code: data.close_bank
                                                    },
                                                    Date: invoice.date_created,
                                                    Amount: invoice.payment_amount,
                                                    IsReconciled: true
                                                });
                                                invoice.xeroPrincipalPaymentID = xeroPayment.Payments[0]['PaymentID'];
                                            }
                                            if (xeroClient && invoice.interest_amount > 0 && 
                                                invoice_obj.interest_invoice_no && data.close_bank) {
                                                let xeroPayment = await xeroClient.payments.create({
                                                    Invoice: {
                                                        InvoiceNumber: invoice_obj.interest_invoice_no
                                                    },
                                                    Account: {
                                                        Code: data.close_bank
                                                    },
                                                    Date: invoice.date_created,
                                                    Amount: invoice.interest_amount,
                                                    IsReconciled: true
                                                });
                                                invoice.xeroInterestPaymentID = xeroPayment.Payments[0]['PaymentID'];
                                            }
                                            connection.query('UPDATE application_schedules SET payment_status=1 WHERE ID = ?', [invoice_obj.ID], function (error, result, fields) {
                                                connection.query('INSERT INTO schedule_history SET ?', invoice, function (error, response, fields) {
                                                    callback();
                                                });
                                            });
                                        });
                                    }, function (data) {
                                        connection.release();
                                        let payload = {};
                                        payload.category = 'Application';
                                        payload.userid = req.cookies.timeout;
                                        payload.description = 'Loan Application Paid Off';
                                        payload.affected = req.params.id;
                                        notificationsService.log(req, payload);
                                        res.send({"status": 200, "message": "Application pay off successful!"});
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });
    });
});

users.post('/application/write-off/:id/:agentID', function(req, res, next) {
    xeroFunctions.authorizedOperation(req, res, 'xero_writeoff', async () => {
        db.query(`SELECT xero_writeoff_account FROM integrations WHERE ID = (SELECT MAX(ID) FROM integrations)`, (error, integrations) => {
            db.query('SELECT s.principal_invoice_no, c.fullname FROM applications a, application_schedules s, clients c '+
            'WHERE a.ID = '+req.params.id+' AND s.ID = (SELECT MIN(ID) FROM application_schedules WHERE a.ID = applicationID AND status = 1) '+
            'AND a.userID = c.ID', function (error, invoice, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    let data = req.body;
                    data.close_status = 2;
                    data.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
                    db.query('UPDATE applications SET ? WHERE ID = '+req.params.id, data, function (error, result, fields) {
                        if(error){
                            res.send({"status": 500, "error": error, "response": null});
                        } else {
                            xeroFunctions.authorizedOperation(req, res, 'xero_writeoff', async (xeroClient) => {
                                if (xeroClient && invoice[0]['principal_invoice_no'] && integrations[0] && integrations[0]['xero_writeoff_account']) {
                                    let xeroWriteOff = await xeroClient.creditNotes.create({
                                        Type: 'ACCRECCREDIT',
                                        Status: 'AUTHORISED',
                                        Contact: {
                                            Name: invoice[0]['fullname']
                                        },
                                        Date: data.date_modified,
                                        LineItems: [{
                                            Description: `LOAN ID: ${helperFunctions.padWithZeroes(req.params.id, 9)}`,
                                            Quantity: '1',
                                            UnitAmount: data.close_amount,
                                            AccountCode: integrations[0]['xero_writeoff_account'],
                                            TaxType: 'NONE'
                                        }],
                                        Reference: helperFunctions.padWithZeroes(req.params.id, 9)
                                    });
                                    let xeroWriteOff2 = await xeroClient.creditNotes.update({
                                        Type: 'ACCRECCREDIT',
                                        CreditNoteNumber: xeroWriteOff.CreditNotes[0]['CreditNoteNumber'],
                                        Contact: {
                                            Name: invoice[0]['fullname']
                                        },
                                        Amount: data.close_amount,
                                        Invoice: {
                                            InvoiceNumber: invoice[0]['principal_invoice_no']
                                        },
                                        Date: data.date_modified
                                    });
                                }
                            });
                            let payload = {};
                            payload.category = 'Application';
                            payload.userid = req.cookies.timeout;
                            payload.description = 'Loan Application Written Off';
                            payload.affected = req.params.id;
                            notificationsService.log(req, payload);
                            res.send({"status": 200, "message": "Application write off successful!"});
                        }
                    });
                }
            });
        });
    });
});

users.post('/application/close/:id', function(req, res, next) {
    let data = req.body;
    data.close_status = 3;
    data.close_date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE applications SET ? WHERE ID = '+req.params.id, data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let payload = {}
            payload.category = 'Application'
            payload.userid = req.cookies.timeout
            payload.description = 'Loan Application Closed'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send({"status": 200, "message": "Application closed successful!"});
        }
    });
});

users.get('/application/cancel/:id', function(req, res, next) {
    let data = {};
    data.status = 0;
    db.query('UPDATE applications SET ? WHERE ID = '+req.params.id, data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let payload = {}
            payload.category = 'Application'
            payload.userid = req.cookies.timeout
            payload.description = 'Loan Application Cancelled'
            payload.affected = req.params.id
            notificationsService.log(req, payload)
            res.send({"status": 200, "message": "Application cancellation successful!"});
        }
    });
});

users.get('/forgot-password/:username', function(req, res) {
    let username = req.params.username;
    db.query('SELECT *, (select role_name from user_roles r where r.id = user_role) as role FROM users WHERE username = ?', username, function(err, rows, fields) {
        if (err)
            return res.send({"status": 500, "response": "Connection Error!"});

        if (rows.length === 0)
            return res.send({"status": 500, "response": "Incorrect Username/Password!"});

        if (rows[0].status === 0)
            return res.send({"status": 500, "response": "User Disabled!"});

        let user = rows[0];
        user.forgot_url = req.protocol + '://' + req.get('host') + '/forgot-password?t=' + encodeURIComponent(user.username);
        user.date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
        let mailOptions = {
            from: 'no-reply@loan35.com',
            to: user.email,
            subject: process.env.TENANT+': Forgot Password Request',
            template: 'forgot',
            context: user
        };

        transporter.sendMail(mailOptions, function(error, info){
            console.log(info)
            if(error)
                return res.send({"status": 500, "message": "Oops! An error occurred while sending request", "response": error});
            return res.send({"status": 200, "message": "Forgot Password request sent successfully!"});
        });

    });
});

users.post('/forgot-password', function(req, res) {
    let user = req.body,
        date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE users SET password = ?, date_modified = ? WHERE username = ?', [bcrypt.hashSync(user.password, parseInt(process.env.SALT_ROUNDS)), date_modified, user.username], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "User password updated!"});
        }
    });
});

///////////////////////////////////////////////////////////////// REPORTS //////////////////////////////////////////////////////

/* GET Client Loan Details */
users.get('/client-loan-details/:id', function(req, res, next) {
    let id = req.params.id;
    let query, query1, query2;
    query = 'select sum(loan_amount) as total_loans from applications where userID = '+id+' and not (status = 0 and close_status = 0)'
    query1 = 'select \n' +
        '(select sum(loan_amount) from applications where userID = '+id+' and not (status = 0 and close_status = 0)) - \n' +
        'sum(payment_amount) as total_balance\n' +
        'from schedule_history\n' +
        'where applicationID in (select id from applications where userid = '+id+' and not (status = 0 and close_status = 0))\n' +
        'and status = 1'
    query2 = 'select \n' +
        'sum(interest_amount) as total_interests\n' +
        'from schedule_history\n' +
        'where applicationID in (select id from applications where userid = '+id+' and not (status = 0 and close_status = 0))\n' +
        'and status = 1'
    var items = {};
    db.query(query, function (error, results, fields) {
        items.total_loans = results;
        db.query(query1, function (error, results, fields) {
            items.total_balance = results;
            db.query(query2, function (error, results, fields) {
                items.total_interest = results;
                res.send({"status": 200, "response": items})
            });
        });
    });
});

/* GET Report Cards. */
users.get('/report-cards', function(req, res, next) {
    let query, query1, query2, query3;
    query = 'select count(*) as branches from branches'
    query1 = 'select count(*) as loan_officers from users where ID in (select loan_officer from clients where clients.id in (select userid from applications where applications.status = 2))'
    query2 = 'select count(*) as all_applications from applications where status = 2 and close_status = 0 '
    query3 = 'select count(*) as apps from applications'
    var items = {}; var num;
    var den;
    db.query(query, function (error, results, fields) {
        items.branches = results;
        db.query(query1, function (error, results, fields) {
            items.loan_officers = results;
            db.query(query2, function (error, results, fields) {
                items.active_loans = results
                den = parseInt(items.loan_officers[0]["loan_officers"]);
                num = parseInt(results[0]["all_applications"])
                avg_loan_per_officers = parseInt(num/den)
                items.avg_loan_per_officers = avg_loan_per_officers;
                db.query(query3, function (error, results, fields) {
                    res.send({"status": 200, "response": items})
                });
            });
        });
    });
});

/* Disbursements  */
users.get('/disbursements/filter', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        loan_officer = req.query.officer
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        queryPart2,
        query,
        query3,
        group
    queryPart = 'select (select reschedule_amount from applications where ID = applicationID) as reschedule_amount, \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, payment_amount, \n' +
        'applicationID, (select loan_amount from applications where ID = applicationID) as loan_amount, sum(payment_amount) as paid, \n' +
        '((select loan_amount from applications where ID = applicationID) - sum(payment_amount)) as balance, (select disbursement_date from applications where ID = applicationID) as date, \n' +
        '(select date_modified from applications where ID = applicationID) as date_modified, (select date_created from applications ap where ap.ID = applicationID) as created_date, ' +
        'CASE\n' +
        '    WHEN status = 0 THEN sum(payment_amount)\n' +
        'END as invalid_payment,\n' +
        'CASE\n' +
        '    WHEN status = 1 THEN sum(payment_amount)\n' +
        'END as valid_payment '+
        'from schedule_history \n' +
        'where applicationID in (select applicationID from application_schedules\n' +
        '\t\t\t\t\t\twhere applicationID in (select ID from applications where status = 2) and status = 1)\n'+
        'and status = 1 '
    ;
    queryPart2 = 'select (select reschedule_amount from applications where ID = applicationID) as reschedule_amount, \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, payment_amount, \n' +
        'applicationID, (select loan_amount from applications where ID = applicationID) as loan_amount, sum(payment_amount) as paid, \n' +
        '((select loan_amount from applications where ID = applicationID) - sum(payment_amount)) as balance, (select disbursement_date from applications where ID = applicationID) as date, \n' +
        '(select date_modified from applications where ID = applicationID) as date_modified, (select date_created from applications ap where ap.ID = applicationID) as created_date, ' +
        'CASE\n' +
        '    WHEN status = 0 THEN sum(payment_amount)\n' +
        'END as invalid_payment,\n' +
        'CASE\n' +
        '    WHEN status = 1 THEN sum(payment_amount)\n' +
        'END as valid_payment '+
        'from schedule_history \n' +
        'where applicationID in (select applicationID from application_schedules\n' +
        '\t\t\t\t\t\twhere applicationID in (select ID from applications where status = 2) and status = 1)\n'+
        'and applicationID not in (select applicationID from schedule_history where status = 1)\n'+
        'and status = 0 '
    ;
    group = 'group by applicationID';
    query = queryPart.concat(group);
    query3 = queryPart2.concat(group);

    let query2 = 'select ID, (select fullname from clients where ID = userID) as fullname, loan_amount, disbursement_date, date_modified, date_created, reschedule_amount ' +
        'from applications where status = 2 and ID not in (select applicationID from schedule_history) '

    var items = {};
    if (loan_officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = ?')
        queryPart2 = queryPart2.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = ?')
        query = queryPart.concat(group);
        query3 = queryPart2.concat(group);
        query2 = query2.concat('and (select loan_officer from clients where clients.ID = userID) = '+loan_officer+' ');
    }
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        // query = (queryPart.concat('AND (TIMESTAMP((select date_modified from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) OR (TIMESTAMP(select date_modified from applications ap where ap.ID = applicationID) between TIMESTAMP('+start+') AND TIMESTAMP('+end+'))')).concat(group);
        query = (queryPart.concat('AND ((TIMESTAMP((select disbursement_date from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+'))) ').concat(group) );
        // 'OR (TIMESTAMP((select date_modified from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') AND TIMESTAMP('+end+'))) ')).concat(group);
        query3 = (queryPart2.concat('AND ((TIMESTAMP((select disbursement_date from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+'))) ').concat(group));
        // 'OR (TIMESTAMP((select date_modified from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') AND TIMESTAMP('+end+'))) ')).concat(group);
        query2 = query2.concat('AND ((TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') AND TIMESTAMP('+end+')) )');
        // 'OR (TIMESTAMP(date_modified) between TIMESTAMP('+start+') AND TIMESTAMP('+end+')))');
    }
    db.query(query, [loan_officer], function (error, results, fields) {
        items.with_payments = results;
        db.query(query3, [loan_officer], function (error, results, fields) {
            items.with_invalid_payments = results;
            db.query(query2, [loan_officer], function (error, results, fields) {
                if (error) {
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    items.without_pay = results;
                    res.send({"status": 200, "error": null, "response": items, "message": "All Disbursements pulled!"});
                }
            });
        });
    });
});

/* Disbursements  */
users.get('/disbursements-new/filter', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        loan_officer = req.query.officer,
        query;
    query = 'select ' +
        'client_id as user, loan_officer, (select fullname from clients where ID = user) as fullname, loan_id as applicationID, amount as loan_amount, date_disbursed as date ' +
        'from disbursement_history where status = 1 ';
    if (loan_officer){
        query = query.concat('and loan_officer = '+loan_officer+' ');
    }
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (query.concat('AND ((TIMESTAMP(date_disbursed) between TIMESTAMP('+start+') and TIMESTAMP('+end+'))) ') );
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Disbursements pulled!"});
        }
    });
});

/* Interest Received  */
users.get('/interests/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, \n' +
        'applicationID, sum(interest_amount) as paid, \n' +
        '(select date_modified from applications where ID = applicationID) as date,\n' +
        '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) loan_officer\n'+
        'from schedule_history sh \n' +
        'where applicationID in (select applicationID from application_schedules\n' +
        '\t\t\t\t\t\twhere applicationID in (select ID from applications where status = 2) and status = 1)\n' +
        'and status = 1\n';
    group = 'group by applicationID';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        queryPart = queryPart.concat('AND (TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')
        // query = (queryPart.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = queryPart.concat(group);
    }
    if (officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = '+officer+' ')
        query = queryPart.concat(group)
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Interests Received pulled!"});
        }
    });
});

/* Interest Receivable  */
users.get('/interests-receivable/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, \n' +
        'applicationID, sum(interest_amount) as due, interest_collect_date,\n' +
        '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) loan_officer\n'+
        'from application_schedules sh \n' +
        'where applicationID in (select ID from applications where status = 2)\n' +
        'and status = 1\n';
    group = 'group by applicationid order by applicationid';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        queryPart = queryPart.concat('AND (TIMESTAMP(interest_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')
        // query = (queryPart.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = queryPart.concat(group);
    }
    if (officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = '+officer+' ')
        query = queryPart.concat(group)
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Interests Receivables pulled!"});
        }
    });
});

/* Principal Received  */
users.get('/principal/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, \n' +
        'applicationID, sum(payment_amount) as paid, \n' +
        '(select date_modified from applications where ID = applicationID) as date,\n' +
        '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) loan_officer\n'+
        'from schedule_history sh \n' +
        'where applicationID in (select applicationID from application_schedules\n' +
        '\t\t\t\t\t\twhere applicationID in (select ID from applications where status = 2) and status = 1)\n' +
        'and status = 1\n';
    group = 'group by applicationID';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        queryPart = queryPart.concat('AND (TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')
        // query = (queryPart.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = queryPart.concat(group);
    }
    if (officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = '+officer+' ')
        query = queryPart.concat(group)
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Principal Payments Received pulled!"});
        }
    });
});

/* Principal Receivable  */
users.get('/principal-receivable/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select \n' +
        '(select userID from applications where ID = applicationID) as user, (select fullname from clients where ID = user) as fullname, \n' +
        'applicationID, sum(payment_amount) as due, payment_collect_date,\n' +
        '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) loan_officer\n'+
        'from application_schedules sh \n' +
        'where applicationID in (select ID from applications where status = 2)\n' +
        'and status = 1\n';
    group = 'group by applicationid order by applicationid';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        queryPart = queryPart.concat('AND (TIMESTAMP(payment_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')
        // query = (queryPart.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = queryPart.concat(group);
    }
    if (officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) = '+officer+' ')
        query = queryPart.concat(group)
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Principal Receivables pulled!"});
        }
    });
});

/* Bad Loans - DeCommissioned  */
users.get('/bad-loans/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    query = '\n' +
        'select ID, \n' +
        '(select fullname from clients where clients.ID = userID) as client, \n' +
        'loan_amount, date_created\n' +
        'from applications \n' +
        'where status = 2 and close_status = 0 \n' +
        'and ID not in (select applicationID from schedule_history where status = 1)';
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (query.concat('AND (TIMESTAMP(date_created) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) '));
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Bad Loans pulled!"});
        }
    });
});

users.get('/all-updates', function(req, res){
    let load = {}
    let data = []
    const HOST = `${req.protocol}://${req.get('host')}`;
    let user = req.query.bug, word = 'Application'
    let role = req.query.bugger
    let query_ = 'select id from notification_preferences where userid = '+user+''
    // let query = `select notification_id, category, description, date_created, (select fullname from users where users.id = userid) user from pending_records inner join notifications on notification_id = notifications.id where status = 1 and view_status in (1,2) order by notification_id desc`;
    const endpoint = `/core-service/get?query=${query_}`;
    const url = `${HOST}${endpoint}`;
    try {
        db.getConnection(function(error, connection){
            if (error || !connection)
                return res.send({"status": 500, "error": error, "response": null});
            connection.query(query_, function(err, results, fields){
                if (err)
                    return res.send({"status": 500, "error": err, "response": null});
                else{
                    let query;
                    if (results.length > 0){
                        query = 'select *, notificationid as ID, category, description, unr.date_created, nt.userid, (select fullname from users where users.id = nt.userid) user \n' +
                            'from user_notification_rel unr inner join notifications nt on notificationid = nt.id \n' +
                            'where status = 1 and view_status = 1 and unr.userid = '+user+'\n' +
                            'and nt.userid <> '+user+' \n'+
                            'and ' +
                            '(select np.status from notification_preferences np where np.category = \n' +
                            '\t(select nc.id from notification_categories nc where nc.category_name = nt.category) \n' +
                            'and np.userid = '+user+' and np.date_created = (select date_created from notification_preferences npf where npf.id = '+
                            '(select max(id) from notification_preferences nop where nop.userid = '+user+' ))) = 1 \n' +
                            'and category <> ?\n'+
                            'and (select visible from notification_roles_rel nr where role_id = '+role+' and nr.category = \n' +
                            '(select nc.id from notification_categories nc where nc.category_name = nt.category) \n' +
                            '\tand nr.date_created = (select date_created from notification_roles_rel nrr where nrr.id = \n' +
                            '(select max(id) from notification_roles_rel ntr where ntr.category = (select nc.id from notification_categories nc where nc.category_name = nt.category)))) = 1\n'+
                            'order by nt.id desc'
                    }
                    else {
                        query = 'select *, notification_id as ID, category, description, date_created, view_status, (select fullname from users where users.id = userid) user \n'+
                            'from pending_records inner join notifications nt on notification_id = notifications.id \n'+
                            'where status = 1 and userid <> '+user+' and category <> ? and view_status in (1,2) ' +
                            'and (select visible from notification_roles_rel nr where role_id = '+role+' and nr.category = \n' +
                            '(select nc.id from notification_categories nc where nc.category_name = nt.category) \n' +
                            '\tand nr.date_created = (select date_created from notification_roles_rel nrr where nrr.id = \n' +
                            '(select max(id) from notification_roles_rel ntr where ntr.category = (select nc.id from notification_categories nc where nc.category_name = nt.category)))) = 1\n'+
                            'order by notifications.id desc';
                    }
                    connection.query(query, ['Application'], function(er, response, field){
                        if (er)
                            return res.send({"status": 500, "error": er, "response": null});
                        else{
                            load.all = response;
                            connection.query(query_, function(rrr, resp, fld){
                                if (rrr)
                                    return res.send({"status": 500, "error": rrr, "response": null});
                                else{
                                    let query2;
                                    if (resp.length > 0){
                                        query2 = 'select *, notificationid as ID, category, \n' +
                                            '(select GROUP_CONCAT(distinct(approverid)) from workflow_stages where workflowid = (select workflowid from applications where applications.id = affected)) approvers,\n' +
                                            'description, unr.date_created, nt.userid, (select fullname from users where users.id = nt.userid) user \n' +
                                            'from user_notification_rel unr inner join notifications nt on notificationid = nt.id \n' +
                                            'where status = 1 and view_status = 1 and unr.userid = '+user+'\n' +
                                            'and nt.userid <> '+user+' \n'+
                                            'and nt.category = ? and \n' +
                                            '(select np.status from notification_preferences np where np.category = \n' +
                                            '\t(select nc.id from notification_categories nc where nc.category_name = ?) \n' +
                                            'and np.userid = '+user+' and np.date_created = (select date_created from notification_preferences npf where npf.id = '+
                                            '(select max(id) from notification_preferences nop where nop.userid = '+user+' ))) = 1 \n' +
                                            'and (select visible from notification_roles_rel nr where role_id = '+role+' and nr.category = (select nc.id from notification_categories nc where nc.category_name = ?) '+
                                            'and nr.date_created = (select date_created from notification_roles_rel nrr where nrr.id = '+
                                            '(select max(id) from notification_roles_rel ntr where ntr.category = (select nc.id from notification_categories nc where nc.category_name = ?)))) = 1\n'+
                                            'order by nt.id desc'
                                    }
                                    else {
                                        query2 = `select *, notification_id as ID, category, description, date_created, view_status, (select fullname from users where users.id = userid) user, \n`+
                                            `(select GROUP_CONCAT(distinct(approverid)) as approvers from workflow_stages where workflowid = (select workflowid from applications where applications.id = affected)) approvers, `+
                                            `affected  `+
                                            `from pending_records inner join notifications on notification_id = notifications.id \n`+
                                            `where status = 1 and userid <> ${user} and category = ? and view_status in (1,2) `+
                                            `and `+
                                            `(select visible from notification_roles_rel nr where role_id = ${role} and nr.category = (select nc.id from notification_categories nc where nc.category_name = ?) `+
                                            `and nr.date_created = (select date_created from notification_roles_rel nrr where nrr.id = `+
                                            `(select max(id) from notification_roles_rel ntr where ntr.category = (select nc.id from notification_categories nc where nc.category_name = ?)))) = 1 `+
                                            `order by notifications.id desc`;
                                    }
                                    connection.query(query2, [word, word, word, word, word], function(e, r, f){
                                        connection.release();
                                        if (e)
                                            return res.send({"status": 500, "error": e, "response": null});
                                        else {
                                            for (let i = 0; i < r.length; i++){
                                                let dets = r[i]
                                                if (dets.approvers !== null){
                                                    if (Array.from(new Set(dets.approvers.split(','))).includes(role)){
                                                        data.push(dets)
                                                    }
                                                }
                                            }
                                            let result = _.orderBy(load.all.concat(data), ['id'], ['desc']);
                                            res.send(result);
                                        }
                                    })
                                }
                            });
                        }
                    });
                }
            });
        })
    } catch (e) {
        throw e;
    }
});

/* Overdue Loans  */
users.get('/overdues/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer;
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select ID, applicationID, (datediff(curdate(), payment_collect_date)) as days_since,\n' +
        'payment_collect_date, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
        '(select loan_amount from applications where applications.ID = applicationID) as principal,\n' +
        'sum(payment_amount) as amount_due, sum(interest_amount) as interest_due\n' +
        'from application_schedules\n' +
        'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0 \n' +
        'and payment_collect_date < (select curdate()) ';
    group = 'group by applicationID';
    query = queryPart.concat(group);
    if (officer){
        queryPart = queryPart.concat('and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationID)) = '+officer+'\n');
        query = queryPart.concat(group);
    }
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (queryPart.concat('AND (TIMESTAMP(payment_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Overdue Loans pulled!"});
        }
    });
});

/* Bad Loans  */
users.get('/badloans/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        officer = req.query.officer;
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select ID, applicationID, \n' +
        '(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
        '(select loan_amount from applications where applications.ID = applicationID) as principal, payment_amount\n' +
        // 'payment_amount, sum(payment_amount) sum,  (sum(interest_amount) - interest_amount) as interest_due\n' +
        'from application_schedules\n' +
        'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) \n'+
        'and datediff(curdate(), payment_collect_date) > 0 ';
    group = 'group by applicationID';
    query = queryPart.concat(group);
    if (start  && end){
        start = "'"+start+"'";
        end = "'"+end+"'";
        query = (queryPart.concat('AND (TIMESTAMP(payment_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
    }
    if (officer){
        query = (queryPart.concat('and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationID)) = '+officer+'\n')).concat(group);
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Overdue Loans pulled!"});
        }
    });
});

users.get('/badloanss/', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        classification = req.query.class,
        un_max = req.query.unmax,
        officer = req.query.officer;
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select ID, applicationID, \n' +
        'max(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
        '(select loan_amount from applications where applications.ID = applicationID) as principal, payment_amount\n' +
        // 'payment_amount, sum(payment_amount) sum,  (sum(interest_amount) - interest_amount) as interest_due\n' +
        'from application_schedules\n' +
        'where payment_status = 1 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) ' +
        'and payment_collect_date < curdate() ';
    // 'and datediff(curdate(), (payment_collect_date)) = 0';
    group = 'group by applicationID';
    query = queryPart.concat(group)
    if (classification && classification === '0'){
        queryPart = 'select ID, applicationID, \n' +
            'max(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
            '(select loan_amount from applications where applications.ID = applicationID) as principal, payment_amount\n' +
            'from application_schedules\n' +
            'where payment_status = 1 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) ' +
            'and payment_collect_date < curdate() ';
        query = queryPart.concat(group);
    }
    if (classification && classification != '0'){
        queryPart = 'select ID, applicationID, \n' +
            '(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
            '(select loan_amount from applications where applications.ID = applicationID) as principal, payment_amount\n' +
            'from application_schedules\n' +
            'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) \n'+
            'and datediff(curdate(), (payment_collect_date)) between ' +
            '(select min_days from loan_classifications lc where lc.id = '+classification+') ' +
            'and (select max_days from loan_classifications lc where lc.id = '+classification+') ';
        query = queryPart.concat(group);
    }
    if (classification && classification != '0' && un_max == '1'){
        queryPart = 'select ID, applicationID, \n' +
            '(payment_collect_date) as duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
            '(select loan_amount from applications where applications.ID = applicationID) as principal, payment_amount\n' +
            'from application_schedules\n' +
            'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) \n'+
            'and datediff(curdate(), (payment_collect_date)) > ' +
            '(select min_days from loan_classifications lc where lc.id = '+classification+') ';
        query = queryPart.concat(group);
    }
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (queryPart.concat('AND (TIMESTAMP(payment_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
    }
    if (officer && officer != '0'){
        query = (queryPart.concat('and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationID)) = '+officer+'\n')).concat(group);
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Overdue Loans pulled!"});
        }
    });
});

/* Payments */
users.get('/payments', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select \n' +
        '(select fullname from clients where ID = (select userID from applications where ID = applicationID)) as fullname,\n' +
        '(select userID from applications where ID = applicationID) as clientid,\n' +
        'applicationID, sum(payment_amount) as paid, sum(interest_amount) as interest, max(payment_date) as date\n' +
        'from schedule_history \n' +
        'where applicationID in (select ID from applications) and status = 1\n ';
    group = 'group by applicationID';
    query = queryPart.concat(group);
    let query2 = 'select sum(payment_amount + interest_amount) as total from schedule_history \n' +
        'where applicationID in (select ID from applications)\n' +
        'and status = 1 '
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (queryPart.concat('AND (TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query2 = query2.concat('AND (TIMESTAMP(payment_date) between TIMESTAMP('+start+') AND TIMESTAMP('+end+')) ');
    }
    db.query(query, function (error, results, fields) {
        items.payment = results;
        db.query(query2, function (error, results, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                items.total = results;
                res.send({"status": 200, "error": null, "response": items, "message": "All Payments pulled!"});
            }
        });
    });
});

/* Loans by Branches */
// users.get('/loans-by-branches', function(req, res, next) {
//     let start = req.query.start,
//         end = req.query.end
//     // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
//     let queryPart,
//         query,
//         group
//     queryPart = 'select (select branch from clients where ID = userID) as branchID, \n' +
//             '(select branch_name from branches br where br.id = branchID) as branch,\n' +
//             'loan_amount, sum(loan_amount) as disbursed,\n' +
//             '(select sum(payment_amount) from schedule_history sh\n' +
//             'where sh.status = 1 and \n' +
//             '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
//             'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) as collected\n' +
//             '\n' +
//             'from applications a\n' +
//             'where status = 2\n ';
//     group = 'group by branchID';
//     query = queryPart.concat(group);
//     var items = {};
//     if (start  && end){
//         start = "'"+start+"'"
//         end = "'"+end+"'"
//         // query = (queryPart.concat('AND (TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
//         query = 'select (select branch from clients where ID = userID) as branchID, \n' +
//             '(select branch_name from branches br where br.id = branchID) as branch,\n' +
//             'loan_amount, sum(loan_amount) as disbursed,\n' +
//             '(select sum(payment_amount) from schedule_history sh\n' +
//             'where sh.status = 1 and \n' +
//             '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
//             'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)\n' +
//             'and TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+') ) as collected\n' +
//             'from applications a\n' +
//             'where status = 2\n '+
//             'AND TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')\n '+
//             'group by branchID'
//     }
//     db.query(query, function (error, results, fields) {
//         if(error){
//             res.send({"status": 500, "error": error, "response": null});
//         } else {
//             res.send({"status": 200, "error": null, "response": results, "message": "All Payments pulled!"});
//         }
//     });
// });

users.get('/loans-by-branches', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group;
    queryPart = `select branch branchID, \n
                (select branch_name from branches br where br.id = branchID) as branch, sum(amount) disbursed, \n
                (select sum(payment_amount) from schedule_history sh where sh.status = 1 and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) collected\n
                from disbursement_history\n
                where status = 1 `;
    group = 'group by branchID';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'";
        end = "'"+end+"'";
        query = `select branch branchID, \n
                (select branch_name from branches br where br.id = branchID) as branch, sum(amount) disbursed, \n
                (select sum(payment_amount) from schedule_history sh where sh.status = 1 and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) collected\n
                from disbursement_history\n
                where status = 1 \n
                AND TIMESTAMP(date_disbursed) between TIMESTAMP('+start+') and TIMESTAMP('+end+')\n
                group by branchID`;
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Payments pulled!"});
        }
    });
});

/* Interests by Branches */
users.get('/interests-by-branches', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select (select branch from clients where ID = userID) as branchID, \n' +
        '(select branch_name from branches br where br.id = branchID) as branch,\n' +
        'loan_amount, ' +
        '(select sum(interest_amount) from application_schedules ash where (select branch from clients where clients.ID = (select userID from applications where applications.ID = ash.applicationID)) = branchID and ash.status = 1) ' +
        'as interest_expected,\n' +
        '(select sum(interest_amount) from schedule_history sh\n' +
        'where sh.status = 1 and \n' +
        '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
        'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) as collected\n' +
        '\n' +
        'from applications a\n' +
        'where status = 2\n ';
    group = 'group by branchID';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        // query = (queryPart.concat('AND (TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = 'select (select branch from clients where ID = userID) as branchID, \n' +
            '(select branch_name from branches br where br.id = branchID) as branch,\n' +
            'loan_amount, ' +
            '(select sum(interest_amount) from application_schedules ash where (select branch from clients where clients.ID = (select userID from applications where applications.ID = ash.applicationID)) = branchID and ash.status = 1) ' +
            'as interest_expected,\n' +
            '(select sum(interest_amount) from schedule_history sh\n' +
            'where sh.status = 1 and \n' +
            '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
            'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)\n' +
            'and TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+') ) as collected\n' +
            'from applications a\n' +
            'where status = 2\n '+
            'AND TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')\n '+
            'group by branchID'
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Report pulled!"});
        }
    });
});

/* Payments by Branches */
users.get('/payments-by-branches', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group
    queryPart = 'select (select branch from clients where ID = userID) as branchID, \n' +
        '(select branch_name from branches br where br.id = branchID) as branch,\n' +
        'loan_amount,sum(loan_amount) as disbursed,\n' +
        '(select sum(payment_amount) from schedule_history sh\n' +
        'where sh.status = 1 and \n' +
        '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
        'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) as collected\n' +
        '\n' +
        'from applications a\n' +
        'where status = 2\n ';
    group = 'group by branchID';
    query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        // query = (queryPart.concat('AND (TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = 'select (select branch from clients where ID = userID) as branchID, \n' +
            '(select branch_name from branches br where br.id = branchID) as branch,\n' +
            'loan_amount,sum(loan_amount) as disbursed,\n' +
            '(select sum(payment_amount) from schedule_history sh\n' +
            'where sh.status = 1 and \n' +
            '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
            'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)\n' +
            'and TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+') ) as collected\n' +
            'from applications a\n' +
            'where status = 2\n '+
            'AND TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')\n '+
            'group by branchID'
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Report pulled!"});
        }
    });
});

/* Bad Loans by Branches */
users.get('/badloans-by-branches', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        query,
        group;
    // queryPart = 'select (select branch from clients where ID = userID) as branchID, \n' +
    //     '(select branch_name from branches br where br.id = branchID) as branch,\n' +
    //     'loan_amount, sum(loan_amount) as disbursed,\n' +
    //     '(select sum(payment_amount) from schedule_history sh\n' +
    //     'where sh.status = 1 and \n' +
    //     '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
    //     'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)) as collected\n' +
    //     '\n' +
    //     'from applications a\n' +
    //     'where status = 2\n ';
    query = `
            select applicationid, (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) branchID,      
            sum(payment_amount) amount, payment_collect_date period,
            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
            from application_schedules ap
            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
            and datediff(curdate(), payment_collect_date) > 90 group by branchID 
            `;
    group = 'group by branchID';
    // query = queryPart.concat(group);
    var items = {};
    if (start  && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        // query = (queryPart.concat('AND (TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query = 'select (select branch from clients where ID = userID) as branchID, \n' +
            '(select branch_name from branches br where br.id = branchID) as branch,\n' +
            'loan_amount, sum(loan_amount) as disbursed,\n' +
            '(select sum(payment_amount) from schedule_history sh\n' +
            'where sh.status = 1 and \n' +
            '(select branch from clients c where c.ID = (select userID from applications b where b.ID = sh.applicationID)) = branchID ' +
            'and sh.applicationID in (select ap.ID from applications ap where ap.status = 2)\n' +
            'and TIMESTAMP(payment_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+') ) as collected\n' +
            'from applications a\n' +
            'where status = 2\n '+
            'AND TIMESTAMP(disbursement_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')\n '+
            'group by branchID';
        query = `
                select applicationid, (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) branchID ,     
                sum(payment_amount) amount, payment_collect_date period,
                (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                from application_schedules ap
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                AND TIMESTAMP(payment_collect_date) between TIMESTAMP(${start}) and TIMESTAMP(${end})
                and datediff(curdate(), payment_collect_date) > 90 group by branchID 
                `;
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "All Badloans pulled!"});
        }
    });
});

/* Projected Interests */
users.get('/projected-interests', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let queryPart,
        queryPart2,
        query,
        group
    queryPart = 'select applicationID, sum(interest_amount) as interest_due,\n' +
        '(select userID from applications a where a.ID = applicationID) as clientID,\n' +
        '(select fullname from clients c where c.ID = (select userID from applications a where a.ID = applicationID)) as client\n' +
        'from application_schedules \n' +
        'where applicationID in (select a.ID from applications a where a.status = 2 )\n ';
    group = 'group by applicationID order by applicationID asc ';
    query = queryPart.concat(group);
    queryPart2 = 'select applicationID, sum(interest_amount) as interest_paid\n' +
        'from schedule_history\n' +
        'where status = 1\n' +
        'and applicationID in (select a.ID from applications a where a.status = 2) '
    query2= queryPart2.concat(group);
    var items = {};
    if (start && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = (queryPart.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') and TIMESTAMP('+end+')) ')).concat(group);
        query2 = (queryPart2.concat('AND (TIMESTAMP((select date_created from applications ap where ap.ID = applicationID)) between TIMESTAMP('+start+') AND TIMESTAMP('+end+')) ')).concat(group);
    }
    db.query(query, function (error, results, fields) {
        items.due = results;
        db.query(query2, function (error, results, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                items.paid = results;
                res.send({"status": 200, "error": null, "response": items, "message": "All Payments pulled!"});
            }
        });
    });
});

/* Aggregate Projected Interests */
users.get('/agg-projected-interests', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let query,
        group
    query = 'select sum(interest_amount) as total \n' +
        'from application_schedules\n' +
        'where applicationID in (select ID from applications where status = 2)\n' +
        'and status = 1 and payment_status = 0 '

    if (start && end){
        start = "'"+start+"'"
        end = "'"+end+"'"
        query = query.concat('and timestamp(interest_collect_date) between TIMESTAMP('+start+') and TIMESTAMP('+end+')');
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/analytics', function(req, res, next) {
    let start = req.query.start,
        end = req.query.end,
        t = req.query.t,
        y = req.query.year,
        b = req.query.branch,
        freq = req.query.freq,
        officer = req.query.officer,
        bt = req.query.bt
    // end = moment(end).add(1, 'days').format("YYYY-MM-DD");
    let query, load = [];
    switch (t){
        // case 'disbursements':
        //     //Default
        //     query = 'select ' +
        //         'sum(amount) as amount_disbursed, (select fullname from users where users.id = loan_officer) name' +
        //         'from disbursement_history where status = 1 group by name';
        //     // query = 'select sum(loan_amount) amount_disbursed, (select fullname from users where users.id = (select loan_officer from clients where clients.id = userID)) name\n' +
        //     //     'from disbursement_history where status = 1\n' +
        //     //     'group by name'
        //     //An Officer
        //     if (officer){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, \n' +
        //             '         SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') agent,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             // 'WHERE    EXTRACT(YEAR_MONTH FROM Disbursement_date) >= EXTRACT(YEAR_MONTH FROM CURDATE())-102\n' +
        //             'WHERE      status =2\n'+
        //             'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             'GROUP BY agent\n' +
        //             'ORDER BY DisburseYearMonth';
        //         load = [officer]
        //     }
        //     //All Officers, Yearly
        //     if (officer == '0' && freq == '3'){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%Y\') AS OfficersYear, \n' +
        //             'SUM(loan_amount) AmountDisbursed, \n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //One Officer, Yearly
        //     if (officer !== "0" && freq == "3"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') AS DisburseYear, \n' +
        //             '                    SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent, \n' +
        //             '                    EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             '    FROM     applications \n' +
        //             '    WHERE    status =2\n' +
        //             '    AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             '    GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')\n' +
        //             '    ORDER BY DisburseYearMonth'
        //     }
        //     //One Officer, Monthly In One Year
        //     if (officer !== "0" && freq == "2"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') AS Year, \n' +
        //             'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' OR DATE_FORMAT(date_modified, \'%Y\') = '+y+'\n'+
        //             'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //One Officer, Monthly
        //     if (officer !== "0" && freq == "2" && y == '0'){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') AS Year, \n' +
        //             'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //One Officer, Quarterly In One Year
        //     if (officer !== "0" && freq == "4"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) quarter,\n' +
        //             'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' OR DATE_FORMAT(date_modified, \'%Y\') = '+y+'\n'+
        //             'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             'GROUP BY quarter\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //One Officer, Quarterly
        //     if (officer !== "0" && freq == "4" && y == '0'){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) quarter, \n' +
        //             'SUM(loan_amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'AND      (select loan_officer from clients where clients.ID = userID) = '+officer+'\n' +
        //             'GROUP BY quarter\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //All Officers, Monthly In One Year
        //     if (officer == "0" && freq == "2"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS OfficersMonth, \n' +
        //             'SUM(loan_amount) AmountDisbursed, \n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' OR DATE_FORMAT(date_modified, \'%Y\') = '+y+'\n'+
        //             'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //All Officers, Monthly
        //     if (officer == "0" && freq == "2" && y == "0"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS Month, DATE_FORMAT(Disbursement_date, \'%Y\') AS AYear, \n' +
        //             'SUM(loan_amount) AmountDisbursed, \n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'GROUP BY DATE_FORMAT(Disbursement_date, \'%M%Y\')\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //All Officers, Quarterly In One Year
        //     if (officer == "0" && freq == "4"){
        //         query = 'SELECT   concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) OfficersQuarter, \n' +
        //             'SUM(loan_amount) AmountDisbursed, \n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'and      DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' OR DATE_FORMAT(date_modified, \'%Y\') = '+y+'\n'+
        //             'GROUP BY OfficersQuarter\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     //All Officers, Quarterly
        //     if (officer == "0" && freq == "4" && y == "0"){
        //         query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS Month, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) AQuarter, \n' +
        //             'SUM(loan_amount) AmountDisbursed, \n' +
        //             'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications \n' +
        //             'WHERE    status =2\n' +
        //             'GROUP BY AQuarter\n' +
        //             'ORDER BY DisburseYearMonth'
        //     }
        //     break;
        case 'disbursements':
            //Default
            query = 'select ' +
                'sum(amount) as amount_disbursed, (select fullname from users where users.id = loan_officer) name ' +
                'from disbursement_history where status = 1 group by name';
            //An Officer
            if (officer){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, \n' +
                    '         SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') agent,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE      status =1\n'+
                    'AND      loan_officer = '+officer+'\n' +
                    'GROUP BY agent\n' +
                    'ORDER BY DisburseYearMonth';
                load = [officer]
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%Y\') AS OfficersYear, \n' +
                    'SUM(amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'GROUP BY DATE_FORMAT(date_disbursed, \'%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Yearly
            if (officer !== "0" && freq == "3"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') AS DisburseYear, \n' +
                    '                    SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent, \n' +
                    '                    EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    '    FROM     disbursement_history \n' +
                    '    WHERE    status =1\n' +
                    '    AND      loan_officer = '+officer+'\n' +
                    '    GROUP BY DATE_FORMAT(date_disbursed, \'%Y\')\n' +
                    '    ORDER BY DisburseYearMonth'
            }
            //One Officer, Monthly In One Year
            if (officer !== "0" && freq == "2"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') AS Year, \n' +
                    'SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'and      DATE_FORMAT(date_disbursed, \'%Y\') = '+y+'\n'+
                    'AND      loan_officer = '+officer+'\n' +
                    'GROUP BY DATE_FORMAT(date_disbursed, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Monthly
            if (officer !== "0" && freq == "2" && y == '0'){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') AS Year, \n' +
                    'SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'AND      loan_officer = '+officer+'\n' +
                    'GROUP BY DATE_FORMAT(date_disbursed, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Quarterly In One Year
            if (officer !== "0" && freq == "4"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) quarter,\n' +
                    'SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'and      DATE_FORMAT(date_disbursed, \'%Y\') = '+y+' \n'+
                    'AND      loan_officer = userID) = '+officer+'\n' +
                    'GROUP BY quarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //One Officer, Quarterly
            if (officer !== "0" && freq == "4" && y == '0'){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) quarter, \n' +
                    'SUM(amount) AmountDisbursed, (select fullname from users where users.id = '+officer+') Agent,\n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'AND      loan_officer = '+officer+'\n' +
                    'GROUP BY quarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Monthly In One Year
            if (officer == "0" && freq == "2"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS OfficersMonth, \n' +
                    'SUM(amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'and      DATE_FORMAT(date_disbursed, \'%Y\') = '+y+'\n'+
                    'GROUP BY DATE_FORMAT(date_disbursed, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Monthly
            if (officer == "0" && freq == "2" && y == "0"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS Month, DATE_FORMAT(date_disbursed, \'%Y\') AS AYear, \n' +
                    'SUM(amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'GROUP BY DATE_FORMAT(date_disbursed, \'%M%Y\')\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Quarterly In One Year
            if (officer == "0" && freq == "4"){
                query = 'SELECT   concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) OfficersQuarter, \n' +
                    'SUM(amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'and      DATE_FORMAT(date_disbursed, \'%Y\') = '+y+'\n'+
                    'GROUP BY OfficersQuarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Quarterly
            if (officer == "0" && freq == "4" && y == "0"){
                query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS Month, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) AQuarter, \n' +
                    'SUM(amount) AmountDisbursed, \n' +
                    'EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history \n' +
                    'WHERE    status =1\n' +
                    'GROUP BY AQuarter\n' +
                    'ORDER BY DisburseYearMonth'
            }
            break;
        // case 'branches':
        //     //Disbursements
        //     if (bt == '1'){
        //
        //         query = 'select sum(loan_amount) amount_disbursed, \n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch\n' +
        //             'from applications \n' +
        //             'where status = 2\n' +
        //             'group by branch'
        //         //Specific Branch
        //         if (b){
        //             query = 'select sum(loan_amount) amount_disbursed, \n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch\n' +
        //                 'from applications \n' +
        //                 'where status = 2\n' +
        //                 'and (select branch from clients where clients.id = userid) = '+b+'\n'+
        //                 'group by branch'
        //         }
        //         //Specific Branch, Monthly in a year
        //         if (b != '0' && freq == "2"){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND   (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'AND   DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+'\n' +
        //                 'GROUP BY DisburseMonth, office\n' +
        //                 'ORDER BY Disbursement_date'
        //         }
        //         //All Branches, Monthly in a year
        //         if (b == '0' && freq == "2"){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND   DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+'\n' +
        //                 'GROUP BY office, DisburseMonth\n' +
        //                 'ORDER BY office, Disbursement_date'
        //         }
        //         //All Branches, Monthly
        //         if (b == '0' && freq == "2" && y == '0'){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'GROUP BY office, DisburseMonth\n' +
        //                 'ORDER BY Disbursement_date'
        //         }
        //         if (b != '0' && freq == "2" && y == '0'){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND   (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'GROUP BY DisburseMonth, office\n' +
        //                 'ORDER BY Disbursement_date'
        //         }
        //         //Specific Branch, Yearly
        //         if (b != '0' && freq == "3"){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') year,\n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2 and date_format(disbursement_date, \'%Y\') = '+y+'\n' +
        //                 'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')'
        //         }
        //         if (b != '0' && freq == "3" && y == '0'){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') year,\n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'GROUP BY DATE_FORMAT(Disbursement_date, \'%Y\')'
        //         }
        //         if (b != '0' && freq == "4"){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) Quarter,\n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'GROUP BY Quarter order by DisburseYearMonth'
        //         }
        //         if (b != '0' && freq == "4" && y != '0'){
        //             query = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) Quarter,\n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office,\n' +
        //                 '         SUM(loan_amount) AmountDisbursed,\n' +
        //                 '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //                 'FROM     applications\n' +
        //                 'WHERE  status = 2\n' +
        //                 'AND     (select branches.id from branches where branches.id = (select branch from clients where clients.id = userid)) = '+b+'\n' +
        //                 'and date_format(Disbursement_date, \'%Y\') = '+y+'\n'+
        //                 'GROUP BY Quarter order by DisburseYearMonth'
        //         }
        //     }
        //     //Interests
        //     if (bt == '2'){
        //         query = 'select sum(interest_amount) amount_received, \n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
        //             'from schedule_history \n' +
        //             'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
        //             'group by branch'
        //         //Specific Branch
        //         if (b){
        //             query = 'select sum(interest_amount) amount_received, \n' +
        //                     '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
        //                     'from schedule_history \n' +
        //                     'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
        //                     'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                     'group by branch'
        //         }
        //         //Specific Branch, Monthly, Specific Year
        //         if (b !== '0' && freq == "2"){
        //             query = 'select sum(interest_amount) amount_received, \n' +
        //                 'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         if (b !== '0' && freq == "2" && y == '0'){
        //             query = 'select sum(interest_amount) amount_received, \n' +
        //                 'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         //Specific Branch, Yearly
        //         if (b !== '0' && freq == "3"){
        //             query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office \n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and date_format(payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by officer, DATE_FORMAT(Payment_date, \'%Y\')'
        //         }
        //         if (b !== '0' && freq == "3" && y == '0'){
        //             query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office \n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by officer, DATE_FORMAT(Payment_date, \'%Y\')'
        //         }
        //         if (b !== '0' && freq == "4"){
        //             query = 'select sum(interest_amount) amount_received, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office, \n'+
        //                 'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         if (b !== '0' && freq == "4" && y == '0'){
        //             query = 'select sum(interest_amount) amount_received, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office, \n'+
        //                 'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //     }
        //     //Payments
        //     if (bt == '3'){
        //         query = 'select sum(payment_amount) amount_received, \n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
        //             'from schedule_history \n' +
        //             'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
        //             'group by branch'
        //         //Specific Branch
        //         if (b){
        //             query = 'select sum(payment_amount) amount_received, \n' +
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
        //                 'from schedule_history \n' +
        //                 'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by branch'
        //         }
        //         //Specific Branch, Monthly, Specific Year
        //         if (b !== '0' && freq == "2"){
        //             query = 'select sum(payment_amount) amount_received, \n' +
        //                 'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         if (b !== '0' && freq == "2" && y == '0'){
        //             query = 'select sum(payment_amount) amount_received, \n' +
        //                 'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
        //                 '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         //Specific Branch, Yearly
        //         if (b !== '0' && freq == "3"){
        //             query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office \n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and date_format(payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
        //         }
        //         if (b !== '0' && freq == "3" && y == '0'){
        //             query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office \n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
        //         }
        //         if (b !== '0' && freq == "4"){
        //             query = 'select sum(payment_amount) amount_received, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office, \n'+
        //                 'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
        //                 'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //         if (b !== '0' && freq == "4" && y == '0'){
        //             query = 'select sum(payment_amount) amount_received, \n' +
        //                 '(select branch_name from branches where branches.id = '+b+') office, \n'+
        //                 'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
        //                 'from schedule_history \n' +
        //                 'where status = 1\n' +
        //                 'and applicationid in (select id from applications where status <> 0)\n'+
        //                 'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
        //                 'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
        //         }
        //     }
        //     //Bad Loans
        //     if (bt == '4'){
        //         query = `
        //                 select  applicationid,
        //                 sum(payment_amount) amount,
        //                 (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                 from application_schedules ap
        //                 where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                 and datediff(curdate(), payment_collect_date) > 90 group by branch
        //                 `;
        //         //Specific Branch
        //         if (b){
        //             query = `
        //                     select  applicationid,
        //                     sum(payment_amount) amount,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch
        //                     `;
        //         }
        //         //Specific Branch, Monthly, Specific Year
        //         if (b !== '0' && freq == "2"){
        //             query = `
        //                     select  applicationid,
        //                     sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%M %Y\') period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and Date_format(Payment_collect_date, \'%Y\') = ${y}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
        //                     `;
        //         }
        //         if (b !== '0' && freq == "2" && y == '0'){
        //             query = `
        //                     select  applicationid,
        //                     sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%M %Y\') period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
        //                     `;
        //         }
        //         //Specific Branch, Yearly
        //         if (b !== '0' && freq == "3"){
        //             query = `
        //                     select applicationid,
        //                     sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%Y\') period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and Date_format(Payment_collect_date, \'%Y\') = ${y}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR FROM payment_collect_date) order by EXTRACT(YEAR FROM payment_collect_date)
        //                     `;
        //         }
        //         if (b !== '0' && freq == "3" && y == '0'){
        //             query = `
        //                     select applicationid,
        //                     sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%Y\') period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR FROM payment_collect_date) order by EXTRACT(YEAR FROM payment_collect_date)
        //                     `;
        //         }
        //         if (b !== '0' && freq == "4"){
        //             query = `
        //                     select applicationid,
        //                     sum(payment_amount) amount, concat('Q',quarter(payment_collect_date),'-', year(payment_collect_date)) period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and Date_format(Payment_collect_date, \'%Y\') = ${y}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
        //                     `;
        //         }
        //         if (b !== '0' && freq == "4" && y == '0'){
        //             query = `
        //                     select applicationid,
        //                     sum(payment_amount) amount, concat('Q',quarter(payment_collect_date),'-', year(payment_collect_date)) period,
        //                     (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
        //                     from application_schedules ap
        //                     where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
        //                     and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
        //                     and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
        //                     `;
        //         }
        //     }
        //     break;
        case 'branches':
            //Disbursements
            if (bt == '1'){

                query = 'select sum(amount) amount_disbursed, \n' +
                    '(select branch_name from branches where branches.id = branch) branch\n' +
                    'from disbursement_history \n' +
                    'where status = 1\n' +
                    'group by branch'
                //Specific Branch
                if (b){
                    query = 'select sum(amount) amount_disbursed, \n' +
                        '(select branch_name from branches where branches.id = branch) branch\n' +
                        'from date_disbursed \n' +
                        'where status = 1\n' +
                        'and branch = '+b+'\n'+
                        'group by branch'
                }
                //Specific Branch, Monthly in a year
                if (b != '0' && freq == "2"){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = branch) office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1\n' +
                        'AND   branch = '+b+'\n' +
                        'AND   DATE_FORMAT(date_disbursed, \'%Y\') = '+y+'\n' +
                        'GROUP BY DisburseMonth, office\n' +
                        'ORDER BY date_disbursed'
                }
                //All Branches, Monthly in a year
                if (b == '0' && freq == "2"){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = branch) office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1\n' +
                        'AND   DATE_FORMAT(date_disbursed, \'%Y\') = '+y+'\n' +
                        'GROUP BY office, DisburseMonth\n' +
                        'ORDER BY office, date_disbursed'
                }
                //All Branches, Monthly
                if (b == '0' && freq == "2" && y == '0'){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = branch) office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1\n' +
                        'GROUP BY office, DisburseMonth\n' +
                        'ORDER BY date_disbursed'
                }
                if (b != '0' && freq == "2" && y == '0'){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                        '(select branch_name from branches where branches.id = branch) office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1\n' +
                        'AND   branch = '+b+'\n' +
                        'GROUP BY DisburseMonth, office\n' +
                        'ORDER BY date_disbursed'
                }
                //Specific Branch, Yearly
                if (b != '0' && freq == "3"){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') year,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1 and date_format(date_disbursed, \'%Y\') = '+y+'\n' +
                        'AND     branch = '+b+'\n' +
                        'GROUP BY DATE_FORMAT(date_disbursed, \'%Y\')'
                }
                if (b != '0' && freq == "3" && y == '0'){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') year,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     applications\n' +
                        'WHERE  status = 1\n' +
                        'AND     branch = '+b+'\n' +
                        'GROUP BY DATE_FORMAT(date_disbursed, \'%Y\')'
                }
                if (b != '0' && freq == "4"){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) Quarter,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 1\n' +
                        'AND     branch = '+b+'\n' +
                        'GROUP BY Quarter order by DisburseYearMonth'
                }
                if (b != '0' && freq == "4" && y != '0'){
                    query = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) Quarter,\n' +
                        '(select branch_name from branches where branches.id = '+b+') office,\n' +
                        '         SUM(amount) AmountDisbursed,\n' +
                        '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                        'FROM     disbursement_history\n' +
                        'WHERE  status = 2\n' +
                        'AND     branch = '+b+'\n' +
                        'and date_format(date_disbursed, \'%Y\') = '+y+'\n'+
                        'GROUP BY Quarter order by DisburseYearMonth'
                }
            }
            //Interests
            if (bt == '2'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
                    'from schedule_history \n' +
                    'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
                    'group by branch'
                //Specific Branch
                if (b){
                    query = 'select sum(interest_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
                        'from schedule_history \n' +
                        'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by branch'
                }
                //Specific Branch, Monthly, Specific Year
                if (b !== '0' && freq == "2"){
                    query = 'select sum(interest_amount) amount_received, \n' +
                        'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                if (b !== '0' && freq == "2" && y == '0'){
                    query = 'select sum(interest_amount) amount_received, \n' +
                        'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                //Specific Branch, Yearly
                if (b !== '0' && freq == "3"){
                    query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and date_format(payment_date, \'%Y\') = '+y+'\n'+
                        'group by officer, DATE_FORMAT(Payment_date, \'%Y\')'
                }
                if (b !== '0' && freq == "3" && y == '0'){
                    query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by officer, DATE_FORMAT(Payment_date, \'%Y\')'
                }
                if (b !== '0' && freq == "4"){
                    query = 'select sum(interest_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office, \n'+
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                        'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                if (b !== '0' && freq == "4" && y == '0'){
                    query = 'select sum(interest_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office, \n'+
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
            }
            //Payments
            if (bt == '3'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
                    'from schedule_history \n' +
                    'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
                    'group by branch'
                //Specific Branch
                if (b){
                    query = 'select sum(payment_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch\n' +
                        'from schedule_history \n' +
                        'where status = 1 and applicationid in (select id from applications where applications.status <> 0)\n' +
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by branch'
                }
                //Specific Branch, Monthly, Specific Year
                if (b !== '0' && freq == "2"){
                    query = 'select sum(payment_amount) amount_received, \n' +
                        'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                if (b !== '0' && freq == "2" && y == '0'){
                    query = 'select sum(payment_amount) amount_received, \n' +
                        'DATE_FORMAT(payment_date, \'%M %Y\') monthpayed, \n'+
                        '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                //Specific Branch, Yearly
                if (b !== '0' && freq == "3"){
                    query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and date_format(payment_date, \'%Y\') = '+y+'\n'+
                        'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
                }
                if (b !== '0' && freq == "3" && y == '0'){
                    query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
                }
                if (b !== '0' && freq == "4"){
                    query = 'select sum(payment_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office, \n'+
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                        'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
                if (b !== '0' && freq == "4" && y == '0'){
                    query = 'select sum(payment_amount) amount_received, \n' +
                        '(select branch_name from branches where branches.id = '+b+') office, \n'+
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) branchQuarter\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+b+'\n'+
                        'group by branchQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
                }
            }
            //Bad Loans
            if (bt == '4'){
                query = `
                        select  applicationid,      
                        sum(payment_amount) amount,
                        (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                        from application_schedules ap
                        where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                        and datediff(curdate(), payment_collect_date) > 90 group by branch
                        `;
                //Specific Branch
                if (b){
                    query = `
                            select  applicationid,      
                            sum(payment_amount) amount, 
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and datediff(curdate(), payment_collect_date) > 90 group by branch
                            `;
                }
                //Specific Branch, Monthly, Specific Year
                if (b !== '0' && freq == "2"){
                    query = `
                            select  applicationid,      
                            sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%M %Y\') period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and Date_format(Payment_collect_date, \'%Y\') = ${y} 
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
                            `;
                }
                if (b !== '0' && freq == "2" && y == '0'){
                    query = `
                            select  applicationid,      
                            sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%M %Y\') period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
                            `;
                }
                //Specific Branch, Yearly
                if (b !== '0' && freq == "3"){
                    query = `
                            select applicationid,      
                            sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%Y\') period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and Date_format(Payment_collect_date, \'%Y\') = ${y} 
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR FROM payment_collect_date) order by EXTRACT(YEAR FROM payment_collect_date)
                            `;
                }
                if (b !== '0' && freq == "3" && y == '0'){
                    query = `
                            select applicationid,      
                            sum(payment_amount) amount, DATE_FORMAT(payment_collect_date, \'%Y\') period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR FROM payment_collect_date) order by EXTRACT(YEAR FROM payment_collect_date)
                            `;
                }
                if (b !== '0' && freq == "4"){
                    query = `
                            select applicationid,      
                            sum(payment_amount) amount, concat('Q',quarter(payment_collect_date),'-', year(payment_collect_date)) period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and Date_format(Payment_collect_date, \'%Y\') = ${y} 
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
                            `;
                }
                if (b !== '0' && freq == "4" && y == '0'){
                    query = `
                            select applicationid,      
                            sum(payment_amount) amount, concat('Q',quarter(payment_collect_date),'-', year(payment_collect_date)) period,
                            (select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) branch
                            from application_schedules ap
                            where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0
                            and (select branch from clients where clients.id = (select userid from applications where applications.id = ap.applicationid)) = ${b}
                            and datediff(curdate(), payment_collect_date) > 90 group by branch, EXTRACT(YEAR_MONTH FROM payment_collect_date) order by EXTRACT(YEAR_MONTH FROM payment_collect_date)
                            `;
                }
            }
            break;
        case 'payments':
            //Default
            query = 'select sum(payment_amount) amount_payed, \n' +
                '(select fullname from users where users.id = \n' +
                '(select loan_officer from clients where clients.id = \n' +
                ' (select userid from applications where applications.id = applicationid))) officer\n' +
                'from schedule_history \n' +
                'where status = 1\n' +
                'and applicationid in (select id from applications where applications.status <> 0)\n'+
                'group by officer\n'
            //One officer
            if (officer){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth,\n' +
                    '  (select fullname from users where users.id = '+officer+') officer,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE  status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'
                load = [officer]
            }
            //One Officer, Yearly
            if (officer !== "0" && freq == "3"){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%Y\') year,\n' +
                    ' (select fullname from users where users.id = '+officer+') name,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As PaymentYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'group by year'
            }
            //All Officers, Yearly
            if (officer == "0" && freq == "3"){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%Y\') allpaymentyear,\n' +
                    '         SUM(payment_amount) AmountPayed\n' +
                    'FROM     schedule_history\n' +
                    'WHERE status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'and  DATE_FORMAT(Payment_date, \'%Y\') is not null\n'+
                    'group by allpaymentyear'
            }
            //One Officer, Monthly in One Year
            if (officer !== '0' && freq == '2'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%M\') month,\n' +
                    '\t\t (select fullname from users where users.id = '+officer+') name,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE\t\t status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'AND DATE_FORMAT(Payment_date, \'%Y\') = '+y+'\n'+
                    'GROUP BY DATE_FORMAT(Payment_date, \'%M%Y\') order by DisburseYearMonth'
            }
            //One Officer, Monthly
            if (officer !== '0' && freq == '2' && y == '0'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%M\') month,\n' +
                    ' (select fullname from users where users.id = '+officer+') name,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'GROUP BY DATE_FORMAT(Payment_date, \'%M%Y\') order by DisburseYearMonth'
            }
            //One Officer, Quarterly in One Year
            if (officer !== '0' && freq == '4'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Officersquarter,\n' +
                    '\t\t (select fullname from users where users.id = '+officer+') name,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE\t\t status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'AND DATE_FORMAT(Payment_date, \'%Y\') = '+y+'\n'+
                    'GROUP BY Officersquarter'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Officersquarter,\n' +
                    ' (select fullname from users where users.id = '+officer+') name,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'GROUP BY Officersquarter'
            }
            //All Officers, Monthly in One Year
            if (officer == '0' && freq == '2'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%M\') Officersmonth,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE  status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND DATE_FORMAT(Payment_date, \'%Y\') = '+y+'\n'+
                    'GROUP BY DATE_FORMAT(Payment_date, \'%M%Y\')\n'+
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '2' && y == '0'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, DATE_FORMAT(Payment_date, \'%M\') Officersmonth,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE  status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'GROUP BY DATE_FORMAT(Payment_date, \'%M%Y\')\n'+
                    'ORDER BY DisburseYearMonth'
            }
            //All Officers, Monthly in One Year
            if (officer == '0' && freq == '4'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE  status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'AND DATE_FORMAT(Payment_date, \'%Y\') = '+y+'\n'+
                    'GROUP BY Quarter'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'SELECT   DATE_FORMAT(payment_date, \'%M, %Y\') AS PaymentMonth, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter,\n' +
                    '         SUM(payment_amount) AmountPayed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM payment_date) As DisburseYearMonth\n' +
                    'FROM     schedule_history\n' +
                    'WHERE  status = 1\n' +
                    'and applicationid in (select id from applications where applications.status <> 0)\n'+
                    'GROUP BY Quarter'
            }
            break;
        case 'interest-received':
            //Default
            query = 'select sum(interest_amount) amount_received, \n' +
                '(select fullname from users where users.id = \n' +
                '(select loan_officer from clients where clients.id = \n' +
                '(select userid from applications where applications.id = applicationid))) officer\n' +
                'from schedule_history \n' +
                'where status = 1\n' +
                'and applicationid in (select id from applications where status <> 0)\n'+
                'group by officer'
            //One Officer
            if (officer){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) officer\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'
                'group by officer'
            }
            //One Officer, Monthly in Specific Year
            if (officer !== '0' && freq == '2'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') paymonth\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Monthly
            if (officer !== '0' && freq == '2' && y == '0'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, DATE_FORMAT(payment_date, \'%M, %Y\') paymonth\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Quarterly in Specific Year
            if (officer !== '0' && freq == '4'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) OfficerQuarter\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) OfficerQuarter\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Monthly in Specific Year
            if (officer == '0' && freq == '2'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') Monthyear  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(Payment_date, \'%M, %Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '2' && y == '0'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') Monthyear  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by Date_format(Payment_date, \'%M %Y\')  order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Quarterly in Specific Year
            if (officer == '0' && freq == '4'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Quarter  order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Quarterly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'select sum(interest_amount) amount_received, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by Quarter  order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Yearly
            if (officer !== '0' && freq == '3'){
                query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') OfficerYear, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) agent\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by agent, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by DATE_FORMAT(Payment_date, \'%Y\')'
            }
            break;
        case 'interest-receivable':
            //Default
            query = 'select \n' +
                'sum(interest_amount) as amount_due,\n' +
                '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) officer\n'+
                'from application_schedules sh \n' +
                'where applicationID in (select ID from applications where status = 2)\n' +
                'and status = 1 group by officer\n';
            //One Officer
            if (officer){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) officer\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'and status = 1 group by officer\n';
            }
            //One Officer, Monthly in Specific Year
            if (officer !== '0' && freq == '2'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent,\n'+
                    'DATE_FORMAT(interest_collect_date, \'%M, %Y\') paymonth\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(interest_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(interest_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //One Officer, Monthly
            if (officer !== '0' && freq == '2' && y == '0'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent,\n'+
                    'DATE_FORMAT(interest_collect_date, \'%M, %Y\') paymonth\n'+
                    'from application_schedules\n'+
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by paymonth order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //One Officer, Quarterly in Specific Year
            if (officer !== '0' && freq == '4'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) OfficerQuarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(interest_collect_date, \'%Y\') = '+y+'\n'+
                    'group by OfficerQuarter  order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) OfficerQuarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //All Officers, Monthly in Specific Year
            if (officer == '0' && freq == '2'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'DATE_FORMAT(interest_collect_date, \'%M, %Y\') Monthyear\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and Date_format(interest_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(interest_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '2' && y == '0'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'DATE_FORMAT(interest_collect_date, \'%M, %Y\') Monthyear\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'group by Date_format(interest_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //All Officers, Quarterly in Specific Year
            if (officer == '0' && freq == '4'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) Quarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and Date_format(interest_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //All Officers, Quarterly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) Quarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM interest_collect_date)'
            }
            //One Officer, Yearly
            if (officer !== '0' && freq == '3'){
                query = 'select sum(interest_amount) amount_due, DATE_FORMAT(interest_collect_date, \'%Y\') OfficerYear, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) agent\n' +
                    'from application_schedules \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status = 2)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by agent, DATE_FORMAT(interest_collect_date, \'%Y\')'
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'select sum(interest_amount) amount_due, DATE_FORMAT(interest_collect_date, \'%Y\') PaymentYear \n' +
                    'from application_schedules \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status = 2)\n'+
                    'group by DATE_FORMAT(interest_collect_date, \'%Y\')'
            }
            break;
        case 'principal-received':
            //Default
            query = 'select sum(payment_amount) amount_received, \n' +
                '(select fullname from users where users.id = \n' +
                '(select loan_officer from clients where clients.id = \n' +
                '(select userid from applications where applications.id = applicationid))) officer\n' +
                'from schedule_history \n' +
                'where status = 1\n' +
                'and applicationid in (select id from applications where status <> 0)\n'+
                'group by officer'
            //One Officer
            if (officer){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) officer\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'
                'group by officer'
            }
            //One Officer, Monthly in Specific Year
            if (officer !== '0' && freq == '2'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') paymonth\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Monthly
            if (officer !== '0' && freq == '2' && y == '0'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, DATE_FORMAT(payment_date, \'%M, %Y\') paymonth\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Quarterly in Specific Year
            if (officer !== '0' && freq == '4'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) OfficerQuarter\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    '(select fullname from users where users.id = '+officer+') agent, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) OfficerQuarter\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Monthly in Specific Year
            if (officer == '0' && freq == '2'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') Monthyear  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(Payment_date, \'%M, %Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '2' && y == '0'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') Monthyear  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by Date_format(Payment_date, \'%M %Y\')  order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Quarterly in Specific Year
            if (officer == '0' && freq == '4'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter  \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and Date_format(Payment_date, \'%Y\') = '+y+'\n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //All Officers, Quarterly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'select sum(payment_amount) amount_received, \n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) Quarter \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM payment_date)'
            }
            //One Officer, Yearly
            if (officer !== '0' && freq == '3'){
                query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') OfficerYear, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) agent\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by agent, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') PaymentYear \n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'group by DATE_FORMAT(Payment_date, \'%Y\')'
            }
            break;
        case 'principal-receivable':
            //Default
            query = 'select \n' +
                'sum(payment_amount) as amount_due,\n' +
                '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) officer\n'+
                'from application_schedules sh \n' +
                'where applicationID in (select ID from applications where status = 2)\n' +
                'and status = 1 group by officer\n';
            //One Officer
            if (officer){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid))) officer\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n' +
                    'and status = 1 group by officer\n';
            }
            //One Officer, Monthly in Specific Year
            if (officer !== '0' && freq == '2'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent,\n'+
                    'DATE_FORMAT(payment_collect_date, \'%M, %Y\') paymonth\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(payment_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(payment_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'
            }
            //One Officer, Monthly
            if (officer !== '0' && freq == '2' && y == '0'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent,\n'+
                    'DATE_FORMAT(payment_collect_date, \'%M, %Y\') paymonth\n'+
                    'from application_schedules\n'+
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by paymonth order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'
            }
            //One Officer, Quarterly in Specific Year
            if (officer !== '0' && freq == '4'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date)) OfficerQuarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'and Date_format(payment_collect_date, \'%Y\') = '+y+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'
            }
            //One Officer, Quarterly
            if (officer !== '0' && freq == '4' && y == '0'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    '(select fullname from users where users.id = '+officer+') agent, \n' +
                    'concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date)) OfficerQuarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by OfficerQuarter order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'//date_format(payment_collect_date, \'%Y%M\')'
            }
            //All Officers, Monthly in Specific Year
            if (officer == '0' && freq == '2'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    'DATE_FORMAT(payment_collect_date, \'%M, %Y\') Monthyear\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and Date_format(payment_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Date_format(payment_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'
            }
            //All Officers, Monthly
            if (officer == '0' && freq == '2' && y == '0'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    'DATE_FORMAT(payment_collect_date, \'%M, %Y\') Monthyear\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'group by Date_format(payment_collect_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_collect_date)'
            }
            //All Officers, Quarterly in Specific Year
            if (officer == '0' && freq == '4'){
                query = 'select \n' +
                    'sum(interest_amount) as amount_due,\n' +
                    'concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) Quarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'and Date_format(interest_collect_date, \'%Y\') = '+y+'\n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM payment_collect_date)' //date_format(payment_collect_date, \'%Y%M\')'
            }
            //All Officers, Quarterly
            if (officer == '0' && freq == '4' && y == '0'){
                query = 'select \n' +
                    'sum(payment_amount) as amount_due,\n' +
                    'concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date)) Quarter\n'+
                    'from application_schedules sh \n' +
                    'where applicationID in (select ID from applications where status = 2) \n' +
                    'and status = 1 \n'+
                    'group by Quarter order by EXTRACT(YEAR_MONTH FROM payment_collect_date) '//date_format(payment_collect_date, \'%Y%M\')'
            }
            //One Officer, Yearly
            if (officer !== '0' && freq == '3'){
                query = 'select sum(payment_amount) amount_due, DATE_FORMAT(payment_collect_date, \'%Y\') OfficerYear, \n' +
                    '(select fullname from users where users.id = \n' +
                    '(select loan_officer from clients where clients.id = \n' +
                    '(select userid from applications where applications.id = applicationid))) agent\n' +
                    'from application_schedules \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status = 2)\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'group by agent, DATE_FORMAT(payment_collect_date, \'%Y\')'
            }
            //All Officers, Yearly
            if (officer == '0' && freq == '3'){
                query = 'select sum(payment_amount) amount_due, DATE_FORMAT(payment_collect_date, \'%Y\') PaymentYear \n' +
                    'from application_schedules \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status = 2)\n'+
                    'group by DATE_FORMAT(payment_collect_date, \'%Y\')'
            }
            break;
        case 'glp':
            break;
        case 'bad-loans':
            break;
        case 'overdue-loans':
            break;
    }
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/multi-analytics', function (req, res, next){
    let bt = req.query.bt,
        pvi = req.query.pvi,
        freq = req.query.freq,
        officer = req.query.officer,
        y = req.query.year;
    let query1;
    let query2;
    switch (bt){
        // case '1':
        //     if (freq == '2' && y == '0'){
        //         query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%M, %Y\')) periods from applications where status = 2 ' +
        //             ' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS period, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and DATE_FORMAT(Disbursement_date, \'%M, %Y\') = ?\n' +
        //             'GROUP BY branch, period\n' +
        //             'ORDER BY branch, Disbursement_date'
        //     }
        //     if (freq == '2' && y != '0'){
        //         query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%M, %Y\')) periods from applications where status = 2 ' +
        //             ' and DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS period, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and DATE_FORMAT(Disbursement_date, \'%M, %Y\') = ?\n' +
        //             'GROUP BY branch, period\n' +
        //             'ORDER BY branch, Disbursement_date'
        //     }
        //     if (freq == '3' && y == '0'){
        //         query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%Y\')) periods from applications where status = 2 ' +
        //             ' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') period,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and DATE_FORMAT(Disbursement_date, \'%Y\') = ?\n' +
        //             'GROUP BY branch, DATE_FORMAT(Disbursement_date, \'%Y\') order by branch'
        //     }
        //     if (freq == '3' && y != '0'){
        //         query1 = 'select distinct(DATE_FORMAT(Disbursement_date, \'%Y\')) periods from applications where status = 2 ' +
        //             ' and DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(Disbursement_date, \'%Y\') period,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and DATE_FORMAT(Disbursement_date, \'%Y\') = ?\n' +
        //             'GROUP BY branch, DATE_FORMAT(Disbursement_date, \'%Y\') order by branch'
        //     }
        //     if (freq == '4' && y == '0'){
        //         query1 = 'select distinct(concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date))) periods from applications where status = 2 ' +
        //             ' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) = ?\n' +
        //             'GROUP BY branch, period'
        //     }
        //     if (freq == '4' && y != '0'){
        //         query1 = 'select distinct(concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date))) periods from applications where status = 2 ' +
        //             ' and DATE_FORMAT(Disbursement_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM Disbursement_date)';
        //         query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period,\n' +
        //             '(select branch_name from branches where branches.id = (select branch from clients where clients.id = userid)) branch,\n' +
        //             '         SUM(loan_amount) AmountDisbursed,\n' +
        //             '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
        //             'FROM     applications\n' +
        //             'WHERE  status = 2\n' +
        //             'and concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) = ?\n' +
        //             'GROUP BY branch, period'
        //     }
        //     break;
        case '1':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(date_disbursed, \'%M, %Y\')) periods from disbursement_history where status = 1 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS period, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and DATE_FORMAT(date_disbursed, \'%M, %Y\') = ?\n' +
                    'GROUP BY branch, period\n' +
                    'ORDER BY branch, date_disbursed'
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(date_disbursed, \'%M, %Y\')) periods from disbursement_history where status = 1 ' +
                    ' and DATE_FORMAT(date_disbursed, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS period, DATE_FORMAT(date_disbursed, \'%M\') month,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and DATE_FORMAT(date_disbursed, \'%M, %Y\') = ?\n' +
                    'GROUP BY branch, period\n' +
                    'ORDER BY branch, date_disbursed'
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(date_disbursed, \'%Y\')) periods from disbursement_history where status = 1 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') period,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and DATE_FORMAT(date_disbursed, \'%Y\') = ?\n' +
                    'GROUP BY branch, DATE_FORMAT(date_disbursed, \'%Y\') order by branch'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(date_disbursed, \'%Y\')) periods from disbursement_history where status = 1 ' +
                    ' and DATE_FORMAT(date_disbursed, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, DATE_FORMAT(date_disbursed, \'%Y\') period,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and DATE_FORMAT(date_disbursed, \'%Y\') = ?\n' +
                    'GROUP BY branch, DATE_FORMAT(date_disbursed, \'%Y\') order by branch'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed))) periods from disbursement_history where status = 1 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(date_disbursed, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) period,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) = ?\n' +
                    'GROUP BY branch, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed))) periods from disbursement_history where status = 1 ' +
                    ' and DATE_FORMAT(date_disbursed, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM date_disbursed)';
                query2 = 'SELECT   DATE_FORMAT(Disbursement_date, \'%M, %Y\') AS DisburseMonth, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period,\n' +
                    '(select branch_name from branches where branches.id = branch) branch,\n' +
                    '         SUM(amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM date_disbursed) As DisburseYearMonth\n' +
                    'FROM     disbursement_history\n' +
                    'WHERE  status = 1\n' +
                    'and concat(\'Q\',quarter(date_disbursed),\'-\', year(date_disbursed)) = ?\n' +
                    'GROUP BY branch, period'
            }
            break;
        case '2':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and DATE_FORMAT(payment_date, \'%Y\') ='+y+'  order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            break;
        case '3':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and DATE_FORMAT(payment_date, \'%Y\') ='+y+'  order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(payment_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            break;
        case '4':
            query1 = 'select distinct(DATE_FORMAT(payment_collect_date, \'%M, %Y\')) periods from application_schedules where status = 1 and \n'+
                'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                'and extract(year_month from payment_collect_date) < (select extract(year_month from curdate())) '+
                'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
            query2 = 'select ID, applicationID, DATE_FORMAT(payment_collect_date, \'%M, %Y\') period,\n' +
                'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                '(sum(payment_amount)) as amount_due,\n' +
                '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                'from application_schedules\n' +
                'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                'and date_format(payment_collect_date, \'%M, %Y\') = ? group by office';
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_collect_date, \'%M, %Y\')) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and extract(year_month from payment_collect_date) < (select extract(year_month from curdate())) '+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, DATE_FORMAT(payment_collect_date, \'%M, %Y\') period, \n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and date_format(payment_collect_date, \'%M, %Y\') = ? group by office, Date_format(Payment_collect_date, \'%M%Y\')';
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_collect_date, \'%M, %Y\')) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and extract(year_month from payment_collect_date) < (select extract(year_month from curdate())) '+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, DATE_FORMAT(payment_collect_date, \'%M, %Y\') period,\n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'+
                    'and date_format(payment_collect_date, \'%M, %Y\') = ? group by office, Date_format(Payment_collect_date, \'%M%Y\')';
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_collect_date, \' %Y\')) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and extract(year from payment_collect_date) <= (select extract(year from curdate())) '+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, DATE_FORMAT(payment_collect_date, \'%Y\') period,\n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and date_format(payment_collect_date, \'%Y\') = ? group by office, Date_format(Payment_collect_date, \'%Y\')';
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_collect_date, \' %Y\')) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and extract(year from payment_collect_date) <= (select extract(year from curdate())) '+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, DATE_FORMAT(payment_collect_date, \'%Y\') period,\n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'
                'and date_format(payment_collect_date, \'%Y\') = ? group by office';
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date))) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and (quarter(payment_collect_date) + year(payment_collect_date)) < ((select quarter(curdate()) + (select year(curdate())))) '+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date)) period,\n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and (concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date))) = ? group by office';
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date))) periods from application_schedules where status = 1 and \n'+
                    'payment_collect_date is not null and applicationid in (select id from applications where status = 2) ' +
                    'and (quarter(payment_collect_date) + year(payment_collect_date)) <= ((select quarter(curdate()) + (select year(curdate())))) '+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'+
                    'order by EXTRACT(YEAR_MONTH from payment_collect_date)'
                query2 = 'select ID, applicationID, concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date)) period, \n' +
                    'min(payment_collect_date) duedate, (select fullname from clients where clients.ID = (select userID from applications where applications.ID = applicationID)) as client,\n' +
                    '(sum(payment_amount)) as amount_due,\n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n'+
                    'from application_schedules\n' +
                    'where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2)\n'+
                    'and DATEDIFF(curdate(), payment_collect_date) > 90\n'+
                    'and DATE_FORMAT(payment_collect_date, \'%Y\') = '+y+' \n'+
                    'and (concat(\'Q\',quarter(payment_collect_date),\'-\', year(payment_collect_date))) = ? group by office';
            }
            break;
        case '5':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and DATE_FORMAT(payment_date, \'%Y\') ='+y+'  order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            break;
        case '6':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '2' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'group by office, Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (freq == '3' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '3' && y != '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and date_format(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, DATE_FORMAT(payment_date, \'%Y\') period, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office\n' +
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                    'group by office, DATE_FORMAT(Payment_date, \'%Y\')'
            }
            if (freq == '4' && y == '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            if (freq == '4' && y != '0'){
                query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                    ' and DATE_FORMAT(payment_date, \'%Y\') ='+y+'  order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'select sum(interest_amount) amount_received, \n' +
                    '(select branch_name from branches where branches.id = (select branch from clients where clients.id = (select userid from applications where applications.id = applicationid))) office,\n' +
                    'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                    'group by office, period'
            }
            break;
    }
    let word = 'All Time';
    switch (pvi){
        case 'received':
            if (!officer && !freq && !y){
                query1 = 'select ? from schedule_history limit 1';
                query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                    // 'DATE_FORMAT(payment_date, \'%M, %Y\') period \n'+
                    '(select ? from schedule_history limit 1) period\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n';
                // 'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                // 'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer;
                // 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (officer && freq == '-1' && y == '0'){
                query1 = 'select ? from schedule_history limit 1';
                query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                    // 'DATE_FORMAT(payment_date, \'%M, %Y\') period \n'+
                    '(select ? from schedule_history limit 1) period,\n'+
                    '(select fullname from users where users.id = '+officer+') officer\n'+
                    'from schedule_history \n' +
                    'where status = 1\n' +
                    'and applicationid in (select id from applications where status <> 0)\n'+
                    // 'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer;
                // 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
            }
            if (officer == '0'){
                if (freq == '-1' && y == '0'){
                    query1 = 'select ? from schedule_history limit 1';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        // 'DATE_FORMAT(payment_date, \'%M, %Y\') period \n'+
                        '(select ? from schedule_history limit 1) period\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n';
                    // 'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                    // 'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer;
                    // 'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '2' && y != '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%M, %Y\') period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '3' && y != '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%Y\') period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                        'group by Date_format(Payment_date, \'%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '4' && y != '0'){
                    query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                        'group by period order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '2' && y == '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%M, %Y\') period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '3' && y == '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%Y\') period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                        'group by Date_format(Payment_date, \'%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '4' && y == '0'){
                    console.log('In Here')
                    query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                        'group by period order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
            }
            else {
                if (freq == '2' && y == '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer \n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '2' && y!= '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%M, %Y\') period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by Date_format(Payment_date, \'%M%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '3' && y== '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%Y\') period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by Date_format(Payment_date, \'%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '3' && y!= '0'){
                    query1 = 'select distinct(DATE_FORMAT(payment_date, \'%Y\')) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'DATE_FORMAT(payment_date, \'%Y\') period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and DATE_FORMAT(payment_date, \'%Y\') = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by Date_format(Payment_date, \'%Y\') order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '4' && y== '0'){
                    query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by period order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
                if (freq == '4' && y!= '0'){
                    query1 = 'select distinct(concat(\'Q\',quarter(payment_date),\'-\', year(payment_date))) periods from schedule_history where status = 1 and payment_date is not null and applicationid in (select id from applications where status <> 0)' +
                        ' and DATE_FORMAT(payment_date, \'%Y\') = '+y+' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                    query2 = 'select sum(interest_amount) interest_received, sum(payment_amount) principal_received,\n' +
                        'concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period, \n'+
                        '(select fullname from users where users.id = '+officer+') officer\n'+
                        'from schedule_history \n' +
                        'where status = 1\n' +
                        'and applicationid in (select id from applications where status <> 0)\n'+
                        'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) = ?\n'+
                        'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                        'group by period order by EXTRACT(YEAR_MONTH FROM payment_date)';
                }
            }
            break;
        case 'receivable':
            if (freq == '2' && y == '0'){
                query1 = 'select distinct(DATE_FORMAT(payment_date, \'%M, %Y\')) periods from application_schedules where status = 1 ' +
                    ' order by EXTRACT(YEAR_MONTH FROM payment_date)';
                query2 = 'SELECT DATE_FORMAT(payment_date, \'%M, %Y\') AS period, DATE_FORMAT(Disbursement_date, \'%M\') month,\n' +
                    '(select fullname from users where user.id = '+officer+') officer,\n' +
                    '         SUM(payment_amount) AmountDisbursed,\n' +
                    '         EXTRACT(YEAR_MONTH FROM Disbursement_date) As DisburseYearMonth\n' +
                    'FROM     application_schedules\n' +
                    'WHERE  status = 2\n' +
                    'and DATE_FORMAT(payment_date, \'%M, %Y\') = ?\n' +
                    'and (select loan_officer from clients where clients.id = (select userid from applications where applications.id = applicationid)) = '+officer+'\n'+
                    'GROUP BY period\n' +
                    'ORDER BY payment_date'
            }
            break;
    }
    let load = {};
    db.query(query1, [word], function (error, results, fields) {
        db.getConnection(function(err, connection) {
            if (err) throw err;
            async.forEachOf(results, function (result, key, callback) {
                connection.query(query2, [(result['periods']) ? result['periods'] : 'All Time'], function (err, rest) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        load[(result['periods']) ? result['periods'] : 'All Time'] = rest;
                    }
                    callback();
                });
            }, function (data) {
                connection.release();
                res.send({"status": 200, "error": null, "response": load, "message": "Success!"});
            });
        });
    });
});

users.get('/individual-borrowers', function(req, res, next) {
    query =
        `select

            ID as CustomerID,
            concat('00000', branch) as BranchCode,
            last_name as Surname,
            first_name as FirstName,
            middle_name as MiddleName,
            dob as Date_Of_Birth,
            'N/A' as National_Identity_Number,
            'N/A' as Driver_License_Number,
            bvn as BVN,
            'N/A' as Passport_Number,
            gender as Gender,
            (select country_name from country where country.ID = client_country) as Nationality,
            marital_status as Marital_Status,
            phone as Mobile_Number,
            address as Primary_Address,
            'N/A' as Primary_City_LGA,
            (select state from state where state.ID = client_state) as Primary_State,
            (select country_name from country where country.ID = client_country) as Primary_Country,
            'N/A' as Employment_Status,
            job as Occupation,
            industry as Business_Category,
            'N/A' as Business_Sector,
            client_type as Borrower_Type,
            'N/A' as Other_ID,
            'N/A' as Tax_ID,
            email as Email_Address,
            employer_name as Employer_Name,
            off_address as Employer_Address,
            'N/A' as Employer_City,
            (select state from state where state.ID = off_state) as Employer_State,
            (select country_name from country where country.ID = job_country) as Employer_Country,
            CASE 
                when (gender = 'Male') then 'Mr.'
                when (gender = 'Female' and marital_status <> 'married') then 'Miss'
                when (gender = 'Female' and marital_status = 'married') then 'Mrs.'
                else 'N/A'
            END as Title,
            'N/A' as Place_of_Birth,
            'N/A' as Work_Phone,
            'N/A' as Home_Phone,
            'N/A' as Secondary_Address,
            'N/A' as Secondary_City,
            'N/A' as Secondary_State,
            'N/A' as Secondary_Country,
            'N/A' as Spouse_Surname,
            'N/A' as Spouse_Firstname,
            'N/A' as Spouse_Middlename
            
        from clients`;

    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/corporate-borrowers', function(req, res, next) {
    query =
        `select 

            ID as Business_Identification_Number,
            name as Business_Name,
            business_type as Business_Corporate_Type,
            'N/A' as Business_Category,
            incorporation_date as Date_of_Incorporation,
            clientID as Customer_ID,
            (select concat('00000', branch) from clients where clients.ID = clientID) as Customer_Branch_Code,
            address as Business_Office_Address,
            'N/A' as City,
            (select state from state where state.ID = state) as State,
            (select country_name from country where country.ID = country) as Country, 
            email as Email_Address,
            'N/A' as Secondary_Address, tax_id as Tax_ID,
            phone as Phone_Number
            
        from corporates`;

    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/principal-officers', function(req, res, next) {
    query =
        `select 

            ID as CustomerID,
            (select fullname from clients where clients.id = clientID) as Principal_Officer1,
            (select dob from clients where clients.ID = clientID) as Date_Of_Birth,
            (select gender from clients where clients.ID = clientID) as Gender,
            (select address from clients where clients.ID = clientID) as Primary_Address,
            'N/A' as City,
            (select state from state where state.ID = (select client_state from clients where clients.ID = clientID)) as State,
            (select country_name from country where country.ID = (select client_country from clients where clients.ID = clientID)) as Country, 
            'N/A' as National_Identity_Number,
            'N/A' as Driver_License_Number,
            (select bvn from clients where clients.ID = clientID) as BVN,
            'N/A' as Passport_Number,
            (select phone from clients where clients.ID = clientID) as PhoneNo1,
            (select email from clients where clients.ID = clientID) as Email_Address,
            (select job from clients where clients.ID = clientID) as Position_In_Business,
            'N/A' as Principal_Officer2_Surname,
            'N/A' as Principal_Officer2_Firstname,
            'N/A' as Principal_Officer2_Middlename
            
        from corporates`;

    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/credit-information', function(req, res, next) {
    query =
        `select 

            userID as CustomerID,
            ID as LoanID,
            (select max(payment_collect_date) 
            from application_schedules 
            where applicationID = app.ID and payment_status = 1 group by applicationID) as Last_Payment_Date,
            'N/A' as Loan_Status_Date,
            disbursement_date as Disbursement_Date,
            loan_amount as Loan_Amount,
            (select 
            CASE 
            when (select count(*)
                from application_schedules
                where applicationID = 30 and payment_status = 1 group by applicationID) is null then loan_amount
            else 
                (loan_amount - 
                (select sum(payment_amount) 
                from application_schedules
                where applicationID = app.ID and payment_status = 1 group by applicationID))
            END) as Outstanding_Balance,
            (loan_amount / duration) as Installment_Amount,
            'NGN' as Currency,
            (select 
            CASE 
            when (select datediff(curdate(), payment_collect_date) 
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID 
                    and payment_collect_date < (select curdate())
                    group by applicationID) is null then 0
            else (select datediff(curdate(), payment_collect_date) 
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID 
                    and payment_collect_date < (select curdate())
                    group by applicationID)
            END) as Days_in_Arrears,
            (select 
            CASE 
            when (select sum(payment_amount) 
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID 
                    and payment_collect_date < (select curdate())
                    group by applicationID) = '' then 0
            else (select sum(payment_amount)
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID 
                    and payment_collect_date < (select curdate())
                    group by applicationID)
            END) as Overdue_Amount,
            'N/A' as Loan_Type,
            duration as Loan_Tenor,
            'Monthly' as Repayment_Frequency,
            (select (payment_amount + interest_amount)
            from schedule_history sh where sh.ID = 
            (select max(ID) from schedule_history shy where shy.applicationID = app.ID)
            and status = 1) as Last_Payment_Amount,
            (select max(payment_collect_date) 
            from application_schedules
            where applicationID = app.ID) as Maturity_Date,
            'N/A' as Loan_Classification,
            'N/A' as Legal_Challenge_Status,
            'N/A' as Litigation_Date,
            'N/A' as Consent_Status,
            'N/A' as Loan_Security_Status,
            'N/A' as Collateral_Type,
            'N/A' as Collateral_Details,
            'N/A' as Previous_Account_Number,
            'N/A' as Previous_Name,
            'N/A' as Previous_CustomerID,
            'N/A' as Previous_BranchCode
            
        from applications app
        where status <> 0
            
`;

    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/portfolio-loan-risk', function(req, res, next) {
    query =
        `select 

            ID,
            (select fullname from clients where clients.id = userID) as Customer_Name,
            concat('00000', (select branch from clients where clients.id = userID))as Branch,
            (select address from clients where clients.id = userID) Address,
            (select gender from clients where clients.id = userID) Gender,
            (select phone from clients where clients.id = userID) Phone_Number,
            loan_amount as Loan_Amount,
            concat(interest_rate, '%') as Interest_Rate,
            'N/A' as Economic_Sector,
            (select sum(payment_amount) from application_schedules aps
            where aps.status = 1
            and aps.applicationID = app.ID
            and payment_collect_date > (select curdate())) as Principal_Balance,
            'N/A' as Customer_Account_Balance,
            disbursement_date as Disbursement_Date,
            (select max(payment_collect_date) 
            from application_schedules
            where applicationID = app.ID) as Maturation_Date,
            (select fullname from users where users.ID = 
            (select loan_officer from clients where clients.ID = userID)) as Credit_Officer,
            (select 
            CASE 
            when (select count(*)
                from application_schedules
                where applicationID = app.ID and payment_status = 1 group by applicationID) is null then loan_amount
            else 
                (loan_amount - 
                (select sum(payment_amount) 
                from application_schedules
                where applicationID = app.ID and payment_status = 1 group by applicationID))
            END) as Total_Outstanding_Principal,
            (select sum(payment_amount) from application_schedules aps
            where aps.status = 1 
            and aps.applicationID = app.ID
            and payment_collect_date < (select curdate())) as Past_Due_Principal,
            (select sum(interest_amount) from application_schedules aps
            where aps.status = 1 
            and aps.applicationID = app.ID
            and payment_collect_date < (select curdate())) as Past_Due_Interest,
            (select (sum(payment_amount) + sum(interest_amount)) from application_schedules aps
            where aps.status = 1 
            and aps.applicationID = app.ID
            and payment_collect_date < (select curdate())) as Loan_Arrears,
            (select payment_amount
            from schedule_history sh where sh.ID = 
            (select max(ID) from schedule_history shy where shy.applicationID = app.ID)
            and sh.status = 1) as Last_Payment_Amount,
            (select sum(interest_amount) from application_schedules aps
            where aps.status = 1 and app.status <> 0
            and aps.applicationID = app.ID) as Due_Interest,
            (select 
            CASE 
                WHEN(select sum(interest_amount) from application_schedules aps
                    where aps.status = 1 and aps.payment_status = 0
                    and aps.applicationID = app.ID
                    and interest_collect_date < (select curdate())) is null THEN 0
                ELSE (select sum(interest_amount) from application_schedules aps
                    where aps.status = 1 and aps.payment_status = 0
                    and aps.applicationID = app.ID
                    and interest_collect_date < (select curdate()))
            END) as Unpaid_Interest,
            'N/A' as Collateral,
            'N/A' as Collateral_Value,
            'N/A' as IPPIS,
            (select 
            CASE
                WHEN reschedule_amount is not null THEN 'Yes'
                ELSE 'No'
            END) as Is_Restructured,
            (select 
            CASE
            WHEN (select count(*)
            from schedule_history sh where 
            sh.applicationID = app.ID and sh.status = 1) is null THEN 0
            ELSE (select sum(payment_amount)
            from schedule_history sh where 
            sh.applicationID = app.ID and sh.status = 1)
            END) as Paid_Principal,
            (select 
            CASE
            WHEN (select count(*)
            from schedule_history sh where 
            sh.applicationID = app.ID and sh.status = 1) is null THEN 0
            ELSE (select sum(interest_amount)
            from schedule_history sh where 
            sh.applicationID = app.ID and sh.status = 1)
            END) as Paid_Interest,
            (select
            CASE 
                WHEN status = 0 THEN 'Inactive'
                WHEN status = 1 THEN 'Active'
                WHEN status = 2 THEN 'Disbursed'
                WHEN close_status = 1 THEN 'Closed'
            END) as Status,
            (select payment_collect_date
            from application_schedules aps
            where payment_status = 0 and aps.status = 1
            and applicationID = app.ID
            and payment_collect_date < (select curdate())
            group by applicationID) as Past_Due_Date,
            (select sh.date_created
            from schedule_history sh where sh.ID = 
            (select max(ID) from schedule_history shy where shy.applicationID = app.ID)
            and sh.status = 1) as Last_Repayment_Date,
            (select 
            CASE 
            when (select datediff(curdate(), payment_collect_date) 
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID 
                    and payment_collect_date < (select curdate())
                    group by applicationID) is null then 0
            else (select datediff(curdate(), payment_collect_date) 
                    from application_schedules 
                    where payment_status = 0 and applicationID = app.ID
                    and payment_collect_date < (select curdate())
                    group by applicationID)
            END) as Days_OverDue,
            (select sh.date_created
            from schedule_history sh where sh.ID = 
            (select max(ID) from schedule_history shy where shy.applicationID = app.ID)
            and sh.status = 1) as Last_Payment_Date
            
        from applications app
            
`;

    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "error": null, "response": results, "message": "Success!"});
        }
    });
});

users.get('/trends', function(req, res, next){
    let report = req.query.trend,
        filter = req.query.filter,
        query;
    if (filter === 'Gender'){
        if (report === 'Interest'){
            query = `select sum(interest_amount) amount, 
                    (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender 
                    from schedule_history
                    where status = 1 and 
                    applicationid in (select id from applications where status <> 0) 
                    group by gender`;
        }
        if (report === 'Bad Loans'){
            query = `select
                    sum(payment_amount) amount, 
                    (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                    from application_schedules 
                    where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) 
                    and datediff(curdate(), payment_collect_date) > 90 group by gender  `;
        }
        if (report === 'Overdue Loans'){
            query = `select
                    sum(payment_amount) amount, 
                    (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                    from application_schedules 
                    where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) 
                    and payment_collect_date < (select curdate()) group by gender  `;
        }
    }
    if (filter === 'Age'){
        if (report === 'Interest'){
            query = `select (interest_amount) amount,
                    (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob, 
                    ((select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid))) age 
                    from schedule_history
                    where status = 1 and 
                    applicationid in (select id from applications where status <> 0) group by age`;
            // group by age`;
        }
        if (report === 'Bad Loans'){
            query = `select
                    sum(payment_amount) amount, 
                    (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                    ((select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid))) age
                    from application_schedules 
                    where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) 
                    and datediff(curdate(), payment_collect_date) > 90 group by age  `;
        }
        if (report === 'Overdue Loans'){
            query = `select
                    sum(payment_amount) amount, 
                    (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                    ((select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid))) age
                    from application_schedules 
                    where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) 
                    and payment_collect_date < (select curdate()) group by age  `;
        }
    }
    db.query(query, function (error, result, fields){
        if (error){
            res.send({'status': 500, 'error': error, 'response': null});
        }
        else {
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/demographic-interest-report', function(req, res, next){
    let report = req.query.trend,
        filter = req.query.filter,
        period = req.query.period,
        query,
        year = req.query.year,
        frequency = req.query.frequency;
    payload = {};
    if (filter === 'Gender'){
        query = `select sum(interest_amount) amount, 
                    (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender 
                    from schedule_history
                    where status = 1 and 
                    applicationid in (select id from applications where status <> 0) 
                    group by gender`;
        if (period !== '-1' && year !== '0'){
            query = `select sum(interest_amount) amount, 
                    (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender 
                    from schedule_history
                    where status = 1 and 
                    applicationid in (select id from applications where status <> 0) and 
                    quarter(payment_date) = ${period} and year(payment_date) = ${year}
                    group by gender`;
        }
    }
    if (filter === 'Age'){
        query = `select (interest_amount) amount,
                (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob, 
                CASE
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                END as age_range 
                from schedule_history
                where status = 1 and 
                applicationid in (select id from applications where status <> 0) group by age_range`;
        if (period !== '-1' && year !== '0'){
            query = `select (interest_amount) amount,
                    (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob, 
                    CASE
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                        WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                    END as age_range 
                    from schedule_history
                    where status = 1 and 
                    quarter(payment_date) = ${period} and year(payment_date) = ${year} and 
                    applicationid in (select id from applications where status <> 0) group by age_range 
                    `;
        }
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.interest = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/demographic-badloans-report', function(req, res, next){
    let report = req.query.trend,
        filter = req.query.filter,
        period = req.query.period,
        query,
        year = req.query.year,
        frequency = req.query.frequency;
    payload = {};
    if (filter === 'Gender'){
        query = `select
                sum(payment_amount) amount, 
                (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0 
                and datediff(curdate(), payment_collect_date) > 90 group by gender  `;
        if (period !== '-1' && year !== '0'){
            query = `select
                sum(payment_amount) amount, 
                (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0  
                and quarter(payment_collect_date) = ${period} and year(payment_collect_date) = ${year} 
                and datediff(curdate(), payment_collect_date) > 90 group by gender  `;
        }
    }
    if (filter === 'Age'){
        query = `
                select sum(payment_amount) amount, 
                (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                CASE
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                END as age_range
                from application_schedules
                where payment_status = 0 and status = 1 and 
                applicationid in (select id from applications where status = 2) and (select close_status from applications where applications.id = applicationID) = 0 
                group by age_range
                `;
        if (period !== '-1' && year !== '0'){
            query = `
                select sum(payment_amount) amount, 
                (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                CASE
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                END as age_range
                from application_schedules
                where payment_status = 0 and status = 1 and 
                applicationid in (select id from applications where status = 2) and (select close_status from applications where applications.id = applicationID) = 0 
                and quarter(payment_collect_date) = ${period} and year(payment_collect_date) = ${year} 
                group by age_range
                `;
        }
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.badloans = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/demographic-overdues-report', function(req, res, next){
    let report = req.query.trend,
        filter = req.query.filter,
        period = req.query.period,
        query,
        year = req.query.year,
        frequency = req.query.frequency,
        payload = {};
    if (filter === 'Gender'){
        query = `select
                sum(payment_amount) amount, 
                (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0  
                and payment_collect_date < (select curdate()) group by gender  `;
        if (period !== '-1' && year !== '0'){
            query = `select
                sum(payment_amount) amount, 
                (select gender from clients where clients.id = (select userid from applications where applications.id = applicationid)) gender
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0  
                and quarter(payment_collect_date) = ${period} and year(payment_collect_date) = ${year} 
                and payment_collect_date < (select curdate()) group by gender  `;
        }
    }
    if (filter === 'Age'){
        query = `select
                sum(payment_amount) amount, 
                (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                CASE
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                END as age_range
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0  
                and payment_collect_date < (select curdate()) group by age_range  `;
        if (period !== '-1' && year !== '0'){
            query = `select
                sum(payment_amount) amount, 
                (select dob from clients where clients.id = (select userid from applications where applications.id = applicationid)) dob,
                CASE
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) < 20 THEN 'Under 20'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 20 and 29 THEN '20 - 29'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 30 and 39 THEN '30 - 39'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 40 and 49 THEN '40 - 49'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 50 and 59 THEN '50 - 59'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 60 and 69 THEN '60 - 69'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) BETWEEN 70 and 79 THEN '70 - 79'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) >= 80 THEN 'Over 80'
                    WHEN (select TIMESTAMPDIFF(YEAR, dob, CURDATE()) from clients where clients.id = (select userid from applications where applications.id = applicationid)) IS NULL THEN 'Not Filled In (NULL)'
                END as age_range
                from application_schedules 
                where payment_status = 0 and status = 1 and applicationID in (select a.ID from applications a where a.status = 2) and (select close_status from applications where applications.id = applicationID) = 0  
                and quarter(payment_collect_date) = ${period} and year(payment_collect_date) = ${year} 
                and payment_collect_date < (select curdate()) group by age_range  `;
        }
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.overdues = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/demographic-age-reports', function(req, res, next){

});

/*Unfortunately won't be called anymore*/
users.get('/growth-trends', function(req, res, next){
    let query, query1, query2, payload;
    query = 'select sum(loan_amount) amount, DATE_FORMAT(disbursement_date, \'%M, %Y\') period ' +
        'from applications ' +
        'where status = 2 and extract(year_month from disbursement_date) <> (select extract(year_month from curdate())) group by extract(year_month from disbursement_date)';
    query1 = 'select sum(interest_amount) amount, DATE_FORMAT(payment_date, \'%M, %Y\') period ' +
        'from schedule_history ' +
        'where status = 1 and extract(year_month from payment_date) <> (select extract(year_month from curdate())) and applicationid in (select id from applications where status = 2) group by extract(year_month from payment_date)';
    query2 = 'select sum(interest_amount) amount, DATE_FORMAT(interest_collect_date, \'%M, %Y\') period ' +
        'from application_schedules ' +
        'where status = 1 and extract(year_month from interest_collect_date) <> (select extract(year_month from curdate())) ' +
        'and applicationid in (select id from applications where status = 2)' +
        'group by extract(year_month from interest_collect_date)';
    payload = {};
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.disbursements = results;
            db.query(query1, function(error, results, fields) {
                if (error){
                    res.send({"status": 500, "error": error, "response": null, 'message': payload});
                }
                else {
                    payload.interest_received = results;
                    db.query(query2, function(error, results, fields) {
                        if (error){
                            res.send({"status": 500, "error": error, "response": null, 'message': payload});
                        }
                        else {
                            payload.interest_receivable = results;
                            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
                        }
                    });
                }
            });
        }
    });
});

users.get('/disbursement-trends', function(req, res, next){
    let query,
        year = req.query.year,
        frequency = req.query.frequency;
    payload = {};
    query = 'select sum(loan_amount) amount, DATE_FORMAT(disbursement_date, \'%M, %Y\') period ' +
        'from applications ' +
        'where status = 2 and extract(year_month from disbursement_date) <> (select extract(year_month from curdate())) ' +
        'group by extract(year_month from disbursement_date)';
    if (!frequency || frequency === '-1' || frequency === '2' && year === '0'){
        query = 'select sum(loan_amount) amount, DATE_FORMAT(disbursement_date, \'%M, %Y\') period ' +
            'from applications ' +
            'where status = 2 and extract(year_month from disbursement_date) <> (select extract(year_month from curdate())) ' +
            'group by extract(year_month from disbursement_date)';
    }
    if (frequency && frequency === '2' && year !== '0'){
        query = 'select sum(loan_amount) amount, DATE_FORMAT(disbursement_date, \'%M, %Y\') period ' +
            'from applications ' +
            'where status = 2 ' +
            'and DATE_FORMAT(disbursement_date, \'%Y\') = '+year+' ' +
            'and extract(year_month from disbursement_date) <> (select extract(year_month from curdate())) ' +
            'group by extract(year_month from disbursement_date)';
    }
    if (frequency && frequency === '3'){
        query = 'select sum(loan_amount) amount, DATE_FORMAT(disbursement_date, \'%Y\') period ' +
            'from applications ' +
            'where status = 2 and extract(year from disbursement_date) <> (select extract(year from curdate())) ' +
            'group by period';
    }
    if (frequency && frequency === '4' && year !== '0'){
        query = 'select sum(loan_amount) amount, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period ' +
            'from applications ' +
            'where status = 2 ' +
            'and concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) <> (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) ' +
            'and DATE_FORMAT(disbursement_date, \'%Y\') = '+year+' ' +
            'group by period';
    }
    if (frequency && frequency === '4' && year === '0'){
        query = 'select sum(loan_amount) amount, concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) period ' +
            'from applications ' +
            'where status = 2 ' +
            'and concat(\'Q\',quarter(disbursement_date),\'-\', year(disbursement_date)) <> (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) ' +
            'group by period order by extract(year_month from disbursement_date)';
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.disbursements = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/interest-received-trends', function(req, res, next){
    let query,
        year = req.query.year,
        frequency = req.query.frequency;
    payload = {};
    query = 'select sum(interest_amount) amount, DATE_FORMAT(payment_date, \'%M, %Y\') period ' +
        'from schedule_history ' +
        'where status = 1 and extract(year_month from payment_date) <> (select extract(year_month from curdate())) ' +
        'and applicationid in (select id from applications where status = 2) group by extract(year_month from payment_date)';
    if (!frequency || frequency === '-1' || frequency === '2' && year === '0'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(payment_date, \'%M, %Y\') period ' +
            'from schedule_history ' +
            'where status = 1 and extract(year_month from payment_date) <> (select extract(year_month from curdate())) ' +
            'and applicationid in (select id from applications where status = 2) group by extract(year_month from payment_date)';
    }
    if (frequency && frequency === '2' && year !== '0'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(payment_date, \'%M, %Y\') period ' +
            'from schedule_history ' +
            'where status = 1  and extract(year_month from payment_date) <> (select extract(year_month from curdate())) ' +
            'and DATE_FORMAT(payment_date, \'%Y\') = '+year+' and applicationid in (select id from applications where status = 2) group by extract(year_month from payment_date)';
    }
    if (frequency && frequency === '3'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(payment_date, \'%Y\') period ' +
            'from schedule_history ' +
            'where status = 1  and extract(year from payment_date) <> (select extract(year from curdate())) ' +
            'and applicationid in (select id from applications where status = 2) group by period'
    }
    if (frequency && frequency === '4' && year !== '0'){
        query = 'select sum(interest_amount) amount, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period ' +
            'from schedule_history ' +
            'where status = 1 and applicationid in (select id from applications where status = 2) ' +
            'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) <> (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) '+
            'and DATE_FORMAT(payment_date, \'%Y\') = '+year+' ' +
            'group by period order by extract(year_month from payment_date)';
    }
    if (frequency && frequency === '4' && year === '0'){
        query = 'select sum(interest_amount) amount, concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) period ' +
            'from schedule_history ' +
            'where status = 1 and applicationid in (select id from applications where status = 2) ' +
            'and concat(\'Q\',quarter(payment_date),\'-\', year(payment_date)) <> (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) '+
            'group by period order by extract(year_month from payment_date)';
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.interest_received = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

users.get('/interest-receivable-trends', function(req, res, next){
    let query,
        year = req.query.year,
        frequency = req.query.frequency,
        payload = {};
    query = 'select sum(interest_amount) amount, DATE_FORMAT(interest_collect_date, \'%M, %Y\') period ' +
        'from application_schedules ' +
        'where status = 1 and extract(year_month from interest_collect_date) < (select extract(year_month from curdate())) ' +
        'and applicationid in (select id from applications where status = 2)' +
        'group by extract(year_month from interest_collect_date)';
    if (!frequency || frequency === '-1' || frequency === '2' && year === '0'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(interest_collect_date, \'%M, %Y\') period ' +
            'from application_schedules ' +
            'where status = 1  and extract(year_month from interest_collect_date) < (select extract(year_month from curdate())) ' +
            'and applicationid in (select id from applications where status = 2)' +
            'group by extract(year_month from interest_collect_date)';
    }
    if (frequency && frequency === '2' && year !== '0'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(interest_collect_date, \'%M, %Y\') period ' +
            'from application_schedules ' +
            'where status = 1 and extract(year_month from interest_collect_date) < (select extract(year_month from curdate()))  ' +
            'and DATE_FORMAT(interest_collect_date, \'%Y\') = '+year+' and applicationid in (select id from applications where status = 2) group by extract(year_month from interest_collect_date)';
    }
    if (frequency && frequency === '3'){
        query = 'select sum(interest_amount) amount, DATE_FORMAT(interest_collect_date, \'%Y\') period ' +
            'from application_schedules ' +
            'where status = 1  and extract(year from interest_collect_date) < (select extract(year from curdate())) ' +
            'and applicationid in (select id from applications where status = 2) group by period'
    }
    if (frequency && frequency === '4' && year !== '0'){
        query = 'select sum(interest_amount) amount, concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) period ' +
            'from application_schedules ' +
            'where status = 1 and applicationid in (select id from applications where status = 2) ' +
            // 'and concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) < (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) '+
            'and (quarter(interest_collect_date) + year(interest_collect_date)) < ((select quarter(curdate()) + (select year(curdate()))) ' +
            'and DATE_FORMAT(interest_collect_date, \'%Y\') = '+year+' ' +
            'group by period order by extract(year_month from interest_collect_date)';
    }
    if (frequency && frequency === '4' && year === '0'){
        query = 'select sum(interest_amount) amount, concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) period ' +
            'from application_schedules ' +
            'where status = 1 and applicationid in (select id from applications where status = 2) ' +
            // 'and concat(\'Q\',quarter(interest_collect_date),\'-\', year(interest_collect_date)) < (select concat(\'Q\', extract(quarter from curdate()),\'-\' , extract(year from curdate()))) '+
            'and (quarter(interest_collect_date) + year(interest_collect_date)) < ((select quarter(curdate()) + (select year(curdate())))) ' +
            'group by period order by extract(year_month from interest_collect_date)';
    }
    db.query(query, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null, 'message': payload});
        }
        else {
            payload.interest_receivable = results;
            res.send({"status": 200, "error": null, "response": "Success", 'message': payload});
        }
    });
});

///// Treasury Management
users.get('/treasury/expenses', function(req, res, next){
    let capitalQuery, interestQuery, expensesQuery, disbursementQuery, period = req.query.period, start = req.query.start, end = req.query.end;
    capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
    interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
    expensesQuery = `select * from expenses where status = 1 and date_of_spend = curdate()`;
    disbursementQuery = `select 
                            case 
                                when (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate())) = 0 then 'No Previous History For This Date'
                                else (select sum(amount)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate()))    
                                    /
                                    (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate()))
                            end
                        as average`;
    if (period && period === '0'){
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and timestamp(a.investment_mature_date) between timestamp("${start}") and timestamp("${end}"))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and timestamp(a.investment_mature_date) between timestamp("${start}") and timestamp("${end}"))
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and timestamp(a.investment_mature_date) between timestamp("${start}") and timestamp("${end}"))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and timestamp(a.investment_mature_date) between timestamp("${start}") and timestamp("${end}"))
                ) as amount
                `;
        expensesQuery = `select * from expenses where status = 1 
                    and timestamp(date_of_spend) between timestamp("${start}") and timestamp("${end}")`;
        disbursementQuery = `select 
                            case 
                                when (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) between day("${start}") and day("${end}")) = 0 then 'No Previous History For This Date'
                                else (select sum(amount)
                                    from disbursement_history 
                                    where day(date_disbursed) between day("${start}") and day("${end}"))
                                    /
                                    (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) between day("${start}") and day("${end}"))
                            end
                        as average`;
    }
    if (period && period === '1'){
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
        expensesQuery = `select * from expenses where status = 1 and date_of_spend = curdate()`;
        disbursementQuery = `select 
                            case 
                                when (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate())) = 0 then 'No Previous History For This Date'
                                else (select sum(amount)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate()))    
                                    /
                                    (select count(*)
                                    from disbursement_history 
                                    where day(date_disbursed) = day(curdate()))
                            end
                        as average`;
    }
    if (period && period === '2'){
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                ) as amount
                `;
        expensesQuery = `select * from expenses where status = 1 and yearweek(date_of_spend) = yearweek(curdate())`;
        disbursementQuery = `select 
                                case 
                                    when (select count(Distinct concat(FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1, month(date_disbursed)))
                                            from disbursement_history 
                                            where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1)
                                           ) = 0 then 'No Previous History For This Week'
                                    else ((select sum(amount)
                                            from disbursement_history 
                                            where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1) )
                                            /
                                            (select count(Distinct concat(FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1, month(date_disbursed)))
                                            from disbursement_history 
                                            where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1)))
                                end
                            as average`;
    }
    if (period && period === '3'){
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                ) as amount
                `;
        expensesQuery = `select * from expenses where status = 1 and extract(year_month from date_of_spend) = extract(year_month from curdate())`;
        disbursementQuery = `
                            select 
                                case 
                                    when (select count(Distinct concat(month(date_disbursed), year(date_disbursed)))
                                            from disbursement_history 
                                            where month(date_disbursed) = month(curdate())
                                           ) = 0 then 'No Previous History For This Week'
                                    else ((select sum(amount)
                                            from disbursement_history 
                                            where month(date_disbursed) = month(curdate()))
                                            /
                                            (select count(Distinct concat(month(date_disbursed), year(date_disbursed)))
                                            from disbursement_history 
                                            where month(date_disbursed) = month(curdate())
                                           ))
                                end
                            as average
                            `;
    }
    let response = {};
    db.query(capitalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            response.capital = results;
            db.query(interestQuery, function(error, results, fields){
                if (error){
                    res.send({"status": 500, "error": error, "response": null});
                }
                else {
                    response.interests = results;
                    db.query(expensesQuery, function(error, results, fields){
                        if (error){
                            res.send({"status": 500, "error": error, "response": null});
                        }
                        else {
                            response.expenses = results;
                            db.query(disbursementQuery, function(error, results, fields){
                                if (error){
                                    res.send({"status": 500, "error": error, "response": null});
                                }
                                else {
                                    response.disbursements = results;
                                    res.send({"status": 200, "error": null, "response": "Success", 'message': response});
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

users.get('/treasury/income', function(req, res, next){
    let principalQuery, interestQuery, period = req.query.period, start = req.query.start, end = req.query.end;
    principalQuery = `
                select sum(payment_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    if (period && period === '0'){
        principalQuery = `
                select sum(payment_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and timestamp(payment_collect_date) between timestamp("${start}") and timestamp("${end}")
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and timestamp(payment_collect_date) between timestamp("${start}") and timestamp("${end}")
                `;
    }
    if (period && period === '1'){
        principalQuery = `
                select sum(payment_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    }
    if (period && period === '2'){
        principalQuery = `
                select sum(payment_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and yearweek(payment_collect_date) = yearweek(curdate())
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and yearweek(payment_collect_date) = yearweek(curdate())
                `;
    }
    if (period && period === '3'){
        principalQuery = `
                select sum(payment_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from curdate())
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from curdate())
                `;
    }
    let response = {};
    db.query(principalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            response.capital = results;
            db.query(interestQuery, function(error, results, fields){
                if (error){
                    res.send({"status": 500, "error": error, "response": null});
                }
                else {
                    response.interests = results;
                    res.send({"status": 200, "error": null, "response": "Success", 'message': response});
                }
            });
        }
    });
});

users.get('/investment-figures', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        capitalQuery, interestQuery;
    let today = moment().utcOffset('+0100').format('YYYY-MM-DD');
    capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
    interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
    if (day && day!== ''){
        day = "'"+day+"'";
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and a.investment_mature_date = ${day})
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = ${day})
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = ${day})
                    -
                    (select sum(b.amount)
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = ${day})
                ) as amount
                `;
    }
    if (period && period == '1'){ //daily
        day = "'"+day+"'";
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and a.investment_mature_date = curdate())
                ) as amount
                        `;
    }
    if (period && period == '2'){ //weekly
        day = "'"+day+"'";
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end 
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and yearweek(a.investment_mature_date) = yearweek(curdate()))
                ) as amount
                `;
    }
    if (day && day!== '' && period && period == '3'){ //monthly
        day = "'"+day+"'";
        capitalQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                ) as amount
                `;
        interestQuery = `
                select (
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end  
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                    -
                    (select case when sum(b.amount) is null then 0 else sum(b.amount) end
                    from investments a inner join investment_txns b on a.id = b.investmentid
                    where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
                    and extract(year_month from a.investment_mature_date) = extract(year_month from curdate()))
                ) as amount
                `;
    }
    // if (day && day!== ''){
    //     day = "'"+day+"'";
    //     capitalQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //             ) as amount
    //             `;
    //     interestQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //                 -
    //                 (select sum(b.amount)
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //             ) as amount
    //             `;
    // }
    // if (day && day!== '' && period && period == '1'){ //daily
    //     day = "'"+day+"'";
    //     capitalQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //             ) as amount
    //             `;
    //     interestQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and a.investment_mature_date = ${day})
    //             ) as amount
    //                     `;
    // }
    // if (day && day!== '' && period && period == '2'){ //weekly
    //     day = "'"+day+"'";
    //     capitalQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and a.investment_mature_date <> ''
    //                 and yearweek(a.investment_mature_date) = yearweek(${day}))
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and a.investment_mature_date <> ''
    //                 and yearweek(a.investment_mature_date) = yearweek(${day}))
    //             ) as amount
    //             `;
    //     interestQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and yearweek(a.investment_mature_date) = yearweek(${day}))
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and yearweek(a.investment_mature_date) = yearweek(${day}))
    //             ) as amount
    //             `;
    // }
    // if (day && day!== '' && period && period == '3'){ //monthly
    //     day = "'"+day+"'";
    //     capitalQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and a.investment_mature_date <> ''
    //                 and extract(year_month from a.investment_mature_date) = extract(year_month from ${day}))
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and a.investment_mature_date <> ''
    //                 and extract(year_month from a.investment_mature_date) = extract(year_month from ${day}))
    //             ) as amount
    //             `;
    //     interestQuery = `
    //             select (
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 1 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and extract(year_month from a.investment_mature_date) = extract(year_month from ${day}))
    //                 -
    //                 (select case when sum(b.amount) is null then 0 else sum(b.amount) end
    //                 from investments a inner join investment_txns b on a.id = b.investmentid
    //                 where b.is_Credit = 0 and isInterest = 1 and isReversedTxn = 0 and a.investment_mature_date <> ''
    //                 and extract(year_month from a.investment_mature_date) = extract(year_month from ${day}))
    //             ) as amount
    //             `;
    // }
    let response = {};
    db.query(capitalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            response.capital = results;
            db.query(interestQuery, function(error, results, fields){
                if (error){
                    res.send({"status": 500, "error": error, "response": null});
                }
                else {
                    response.interests = results;
                    res.send({"status": 200, "error": null, "response": "Success", 'message': response});
                }
            });
        }
    });
});

users.get('/loan-figures', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        principalQuery, interestQuery;
    principalQuery = `
                select sum(payment_amount+interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    if (day && day!== ''){
        day = "'"+day+"'";
        principalQuery = `
                select sum(payment_amount+interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = ${day}
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = ${day}
                `;
    }
    if (period && period == '1'){ //daily
        day = "'"+day+"'";
        principalQuery = `
                select sum(payment_amount+interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                `;
    }
    if (period && period == '2'){ //weekly
        day = "'"+day+"'";
        principalQuery = `
                select sum(payment_amount+interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and yearweek(payment_collect_date) = yearweek(curdate())
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and yearweek(payment_collect_date) = yearweek(curdate())
                `;
    }
    if (period && period == '3'){ //monthly
        day = "'"+day+"'";
        principalQuery = `
                select sum(payment_amount+interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from curdate())
                `;
        interestQuery = `
                select sum(interest_amount) as due
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from curdate())
                `;
    }
    // if (day && day!== ''){
    //     day = "'"+day+"'";
    //     principalQuery = `
    //             select sum(payment_amount+interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and payment_collect_date = ${day}
    //             `;
    //     interestQuery = `
    //             select sum(interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and payment_collect_date = ${day}
    //             `;
    // }
    // if (day && day!== '' && period && period == '1'){ //daily
    //     day = "'"+day+"'";
    //     principalQuery = `
    //             select sum(payment_amount+interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and payment_collect_date = ${day}
    //             `;
    //     interestQuery = `
    //             select sum(interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and payment_collect_date = ${day}
    //             `;
    // }
    // if (day && day!== '' && period && period == '2'){ //weekly
    //     day = "'"+day+"'";
    //     principalQuery = `
    //             select sum(payment_amount+interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and yearweek(payment_collect_date) = yearweek(${day})
    //             `;
    //     interestQuery = `
    //             select sum(interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and yearweek(payment_collect_date) = yearweek(${day})
    //             `;
    // }
    // if (day && day!== '' && period && period == '3'){ //monthly
    //     day = "'"+day+"'";
    //     principalQuery = `
    //             select sum(payment_amount+interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from ${day})
    //             `;
    //     interestQuery = `
    //             select sum(interest_amount) as due
    //             from application_schedules sh
    //             where applicationID in (select ID from applications where status = 2)
    //             and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from ${day})
    //             `;
    // }
    let response = {};
    db.query(principalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            response.capital = results;
            db.query(interestQuery, function(error, results, fields){
                if (error){
                    res.send({"status": 500, "error": error, "response": null});
                }
                else {
                    response.interests = results;
                    res.send({"status": 200, "error": null, "response": "Success", 'message': response});
                }
            });
        }
    });
});

users.get('/predicted-loan-figures', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        principalQuery, interestQuery;
    day = "'"+day+"'";
    principalQuery = `
                select 
                    case 
                        when (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(curdate())) = 0 then 'No Previous History For This Date'
                        else (select sum(amount)
                            from disbursement_history 
                            where day(date_disbursed) = day(curdate()))    
                            /
                            (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(curdate()))
                    end
                as average
                `;
    if (day && day!== ''){
        principalQuery = `
                select 
                    case 
                        when (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day})) = 0 then 'No Previous History For This Date'
                        else (select sum(amount)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day}))    
                            /
                            (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day}))
                    end
                as average
                `;
    }
    if (day && day!== '' && period && period == '1'){ //daily
        principalQuery = `
                select 
                    case 
                        when (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day})) = 0 then 'No Previous History For This Date'
                        else (select sum(amount)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day}))    
                            /
                            (select count(*)
                            from disbursement_history 
                            where day(date_disbursed) = day(${day}))
                    end
                as average
                `;
    }
    if (period && period == '2'){ //weekly
        principalQuery = `
                select 
                    case 
                        when (select count(Distinct concat(FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1, month(date_disbursed)))
                                from disbursement_history 
                                where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1)
                               ) = 0 then 'No Previous History For This Week'
                        else ((select sum(amount)
                                from disbursement_history 
                                where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1) )
                                /
                                (select count(Distinct concat(FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1, month(date_disbursed)))
                                from disbursement_history 
                                where (FLOOR((DAYOFMONTH(date_disbursed) - 1) / 7) + 1) = (FLOOR((DAYOFMONTH(curdate()) - 1) / 7) + 1)))
                    end
                as average
                `;
    }
    if (period && period == '3'){ //monthly
        principalQuery = `
                select 
                    case 
                        when (select count(Distinct concat(month(date_disbursed), year(date_disbursed)))
                                from disbursement_history 
                                where month(date_disbursed) = month(curdate())
                               ) = 0 then 'No Previous History For This Week'
                        else ((select sum(amount)
                                from disbursement_history 
                                where month(date_disbursed) = month(curdate()))
                                /
                                (select count(Distinct concat(month(date_disbursed), year(date_disbursed)))
                                from disbursement_history 
                                where month(date_disbursed) = month(curdate())
                               ))
                    end
                as average
                `;
    }
    db.query(principalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            res.send({"status": 200, "error": null, "response": "Success", 'message': results});
        }
    });
});

users.get('/investment-payouts', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        capitalQuery, interestQuery;
    let today = moment().utcOffset('+0100').format('YYYY-MM-DD');
    capitalQuery = `
                select id, (select fullname from clients where clients.id = a.clientId) client, a.amount, investment_mature_date
                from investments a
                where a.investment_mature_date <> ''
                and investment_mature_date = curdate()
                `;
    if (period && period == '1'){
        day = "'"+day+"'";
        capitalQuery = `
                select id, (select fullname from clients where clients.id = a.clientId) client, a.amount, investment_mature_date
                from investments a
                where a.investment_mature_date <> ''
                and investment_mature_date = curdate()
                `;
    }
    if (period && period == '2'){
        day = "'"+day+"'";
        capitalQuery = `
                select id, (select fullname from clients where clients.id = a.clientId) client, a.amount, investment_mature_date
                from investments a
                where a.investment_mature_date <> ''
                and yearweek(a.investment_mature_date) = yearweek(curdate()) 
                `;
    }
    if (period && period == '3'){
        day = "'"+day+"'";
        capitalQuery = `
                select id, (select fullname from clients where clients.id = a.clientId) client, a.amount, investment_mature_date
                from investments a
                where a.investment_mature_date <> ''
                and extract(year_month from a.investment_mature_date) = extract(year_month from curdate())
                `;
    }
    db.query(capitalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            res.send({"status": 200, "error": null, "response": "Success", 'message': results});
        }
    });
});

users.get('/investment-interests', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        capitalQuery, interestQuery;
    let today = moment().utcOffset('+0100').format('YYYY-MM-DD');
    capitalQuery = `
                select investmentid, (select fullname from clients where clients.id = clientId) client, sum(amount) amount, clientId,
                (select investment_mature_date from investments where investments.id = investmentid) investment_mature_date 
                from investment_txns where 
                isInterest =1 and is_credit = 1 and isReversedTxn = 0
                and (select investment_mature_date from investments i where i.id = investmentid) = curdate()
                group by investmentid
                `;
    if (period && period == '1'){
        day = "'"+day+"'";
        capitalQuery = `
                select investmentid, (select fullname from clients where clients.id = clientId) client, sum(amount) amount, clientId,
                (select investment_mature_date from investments where investments.id = investmentid) investment_mature_date
                from investment_txns where 
                isInterest =1 and is_credit = 1 and isReversedTxn = 0
                and (select investment_mature_date from investments i where i.id = investmentid) = curdate()
                group by investmentid
                `;
    }
    if (period && period == '2'){
        day = "'"+day+"'";
        capitalQuery = `
                select investmentid, (select fullname from clients where clients.id = clientId) client, sum(amount) amount, 
                (select investment_mature_date from investments where investments.id = investmentid) investment_mature_date
                from investment_txns where 
                isInterest =1 and is_credit = 1 and isReversedTxn = 0
                and (select yearweek(investment_mature_date) from investments i where i.id = investmentid) = yearweek(curdate())
                group by investmentid
                `;
    }
    if (period && period == '3'){
        day = "'"+day+"'";
        capitalQuery = `
                select investmentid, (select fullname from clients where clients.id = clientId) client, sum(amount) amount, 
                (select investment_mature_date from investments where investments.id = investmentid) investment_mature_date
                from investment_txns where 
                isInterest =1 and is_credit = 1 and isReversedTxn = 0
                and (select extract(year_month from investment_mature_date) from investments i where i.id = investmentid) = extract(year_month from curdate())
                group by investmentid
                `;
    }console.log(capitalQuery)
    db.query(capitalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            res.send({"status": 200, "error": null, "response": "Success", 'message': results});
        }
    });
});

users.get('/loan-receivables', function(req, res, next){
    let period = req.query.period,
        day = req.query.day,
        principalQuery, interestQuery;
    principalQuery = `
                select applicationID, (select fullname from clients c where c.id = (select userid from applications a where a.id = applicationID)) client, payment_amount, interest_amount, payment_collect_date
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                group by applicationID
                `;
    if (period && period== '1'){
        day = "'"+day+"'";
        principalQuery = `
                select applicationID, (select fullname from clients c where c.id = (select userid from applications a where a.id = applicationID)) client, payment_amount, interest_amount, payment_collect_date
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and payment_collect_date = curdate()
                group by applicationID
                `;
    }

    if (period && period== '2'){
        day = "'"+day+"'";
        principalQuery = `
                select applicationID, (select fullname from clients c where c.id = (select userid from applications a where a.id = applicationID)) client, payment_amount, interest_amount, payment_collect_date
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and yearweek(payment_collect_date) = yearweek(curdate())
                group by applicationID
                `;
    }

    if (period && period == '3'){
        day = "'"+day+"'";
        principalQuery = `
                select applicationID, (select fullname from clients c where c.id = (select userid from applications a where a.id = applicationID)) client, payment_amount, interest_amount, payment_collect_date
                from application_schedules sh
                where applicationID in (select ID from applications where status = 2)
                and status = 1 and extract(year_month from payment_collect_date) = extract(year_month from curdate())
                group by applicationID
                `;
    }

    let response = {};
    db.query(principalQuery, function(error, results, fields){
        if (error){
            res.send({"status": 500, "error": error, "response": null});
        }
        else {
            res.send({"status": 200, "error": null, "response": "Success", 'message': results});
        }
    });
});

users.post('/new-expense', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO expenses Set ?',
        query2 = 'select * from expenses where expense_name = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.expense_name, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Expense already exists!"}));
        db.query(query,{"expense_name":postData.expense_name, "amount":postData.amount, "date_of_spend":postData.date_of_spend, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New Expense Added!"}));
            }
        });
    });
});

users.get('/expenses', function(req, res, next) {
    let query = 'SELECT * from expenses';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Change Expense Status */
users.post('/del-expense/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update expenses SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Expense Disabled!"}));
        }
    });
});

/* Reactivate Expense Type */
users.post('/en-expense/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update expenses SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Expense Re-enabled!"}));
        }
    });
});

/////// Loan Classification
/* Create New Loan Classification
 */

users.post('/new-classification-type', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO loan_classifications Set ?',
        query2 = 'select * from loan_classifications where description = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.description, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Classifcation already exists!"}));
        db.query(query,{"description":postData.description, "min_days":postData.min_days, "max_days":postData.max_days, "un_max":postData.un_max, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New Loan Classifcation Added!"}));
            }
        });
    });
});

users.post('/edit-classification/:id/', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.description, postData.min_days, postData.max_days, postData.un_max, postData.date_modified, req.params.id],
        query = 'Update loan_classifications SET description=?, min_days=?, max_days=?, un_max =?, date_modified =? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        }
        else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Classification Details Updated"}));
        }
    });
});

users.get('/classification-types', function(req, res, next) {
    let query = 'SELECT * from loan_classifications where status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/classification-types-full', function(req, res, next) {
    let query = 'SELECT * from loan_classifications';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Change Classification Type Status */
users.post('/del-class-type/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update loan_classifications SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Disabled!"}));
        }
    });
});

/* Reactivate Classification Type */
users.post('/en-class-type/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update loan_classifications SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Re-enabled!"}));
        }
    });
});

users.get('/class-dets/:id', function(req, res, next) {
    let query = 'SELECT * from loan_classifications where id = ? ';
    db.query(query, req.params.id, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(results);
        }
    });
});


/////// Activity
/*Create New Activity Type*/
users.post('/new-activity-type', function(req, res, next) {
    let postData = req.body,
        query =  'INSERT INTO activity_types Set ?',
        query2 = 'select * from activity_types where activity_name = ?';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query(query2,req.body.role, function (error, results, fields) {
        if (results && results[0])
            return res.send(JSON.stringify({"status": 200, "error": null, "response": results, "message": "Activity type already exists!"}));
        db.query(query,{"activity_name":postData.role, "date_created": postData.date_created, "status": 1}, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                res.send(JSON.stringify({"status": 200, "error": null, "response": "New Activity Type Added!"}));
            }
        });
    });
});

users.get('/activity-types', function(req, res, next) {
    let query = 'SELECT * from activity_types where status = 1';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/activity-types-full', function(req, res, next) {
    let query = 'SELECT * from activity_types';
    db.query(query, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Add New Activity */
users.post('/new-activity', function(req, res, next) {
    let data = [],
        postData = req.body,
        query =  'INSERT INTO activities Set ?',
        query2 = 'SELECT ID from activities where ID = LAST_INSERT_ID()';
    postData.status = 1;
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(query,postData, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                connection.query(query2, function(error, results, fields){
                    let id = results[0].ID;
                    connection.query('update activities set attachments = ? where activities.id = ?', [postData.attachments, id], function(error, results, fields){
                        connection.release();
                        let payload = {}
                        payload.category = 'Activity'
                        payload.userid = postData.for_
                        payload.description = 'New Activity Created'
                        notificationsService.log(req, payload)
                        res.send(JSON.stringify({"status": 200, "error": null, "response": "New Activity Created", "result": id}));
                    });
                });
            }
        });
    });
});

/* All Activities */
users.get('/activities', function(req, res, next) {
    let current_user = req.query.user;
    let team = req.query.team;
    let officer = req.query.officer;
    let word = 'team'
    let load = [];
    let query = 'SELECT *, (select count(*) from activity_comments where activityID = activities.ID group by activityID) as comment_count, ' +
        '(select fullname from clients c where c.ID = client) as clients, ' +
        '(select fullname from users where users.id = for_) as user, ' +
        '(select name from teams where teams.Id = ?) as team_name, ' +
        '(select activity_name from activity_types at where at.id = activity_type) as activity ' +
        'from activities where status = 1 and for_ = ? ';
    if (team){
        query = query.concat(' and category = ?').concat('  and team = ? order by id desc')
        load = [team, current_user, word, team]
    }
    if (officer){
        query = 'SELECT *, (select count(*) from activity_comments where activityID = activities.ID group by activityID) as comment_count, ' +
            '(select fullname from clients c where c.ID = client) as clients, ' +
            '(select fullname from users where users.id = for_) as user, ' +
            '(select name from teams where teams.Id = team) as team_name, ' +
            '(select activity_name from activity_types at where at.id = activity_type) as activity ' +
            'from activities where for_ = ? and status = 1 order by id desc';
        load = [officer]
    }
    db.query(query, load, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

users.get('/all-activities', function(req, res, next) {
    let current_user = req.query.user;
    let team = req.query.team;
    let officer = req.query.officer;
    let word = 'team'
    let load = [];
    let query = 'SELECT *, (select count(*) from activity_comments where activityID = activities.ID group by activityID) as comment_count, ' +
        '(select fullname from clients c where c.ID = client) as client_name, ' +
        '(select fullname from users where users.id = for_) as user, ' +
        '(select name from teams where teams.Id = team) as team_name, ' +
        '(select activity_name from activity_types at where at.id = activity_type) as activity ' +
        'from activities where status = 1 and for_ is not null order by ID desc';
    db.query(query, load, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Teams */
users.get('/teams', function(req, res, next) {
    let current_user = req.query.user;
    let query = 'select teamID, ' +
        '(select name from teams where teams.id = teamID) as team_name ' +
        'from team_members where memberID = ? ' +
        // '(select users.ID from users where users.fullname = ? and users.status = 1) ' +
        'and status = 1'
    db.query(query, [current_user], function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Team Activities */
users.get('/team-activities', function(req, res, next) {
    let current_user = req.query.user;
    let word = 'team'
    let query = 'select *, (select count(*) from activity_comments where activityID = activities.ID group by activityID) as comment_count, ' +
        '(select activity_name from activity_types where activity_types.id = activity_type) as activity, ' +
        '(select name from teams where teams.Id = team) as team_name, ' +
        '(select fullname from users where users.id = for_) as user, ' +
        '(select fullname from clients where clients.id = client) as client_name ' +
        'from activities where ' +
        'category = ? and team in (select teamID from team_members where memberID = ?) or (select supervisor from teams where teams.id = team) = ?' +
        ' order by id desc';
    // 'for_ = ?  ';
    // '(select fullname from users where users.id in (select memberID from team_members where teamID in (select teamID from team_members where memberID = (select users.ID from users where users.fullname = ? and users.status = 1 ) and status = 1)  and status = 1) ) ' +
    //         'and for_ <> ?';
    let query2 = 'select *, (select count(*) from activity_comments where activityID = activities.ID group by activityID) as comment_count,' +
        '(select activity_name from activity_types where activity_types.id = activity_type) as activity, ' +
        '(select fullname from clients where clients.id = client) as client_name, ' +
        '(select name from teams where teams.Id = team) as team_name, ' +
        '(select fullname from users where users.id = for_) as user ' +
        'from activities where ' +
        'team = 0 and for_ = ? order by id desc';
    db.query(query, [word, current_user, current_user], function (error, results_team, fields) {
        db.query(query2, [current_user], function (error, results_personal, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                let results = _.orderBy(results_team.concat(results_personal), ['ID'], ['desc']);
                res.send(JSON.stringify(results));
            }
        });
    });
});

/* Add Comment */
users.post('/save-comment', function(req, res, next) {
    let data = [],
        postData = req.body,
        query =  'INSERT INTO activity_comments Set ?';
    postData.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.getConnection(function(err, connection) {
        if (err) throw err;

        connection.query(query,postData, function (error, results, fields) {
            if(error){
                res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
            } else {
                let payload = {}
                payload.category = 'Activity'
                payload.userid = req.cookies.timeout
                payload.description = 'New Activity Comment'
                payload.affected = postData.activityID
                notificationsService.log(req, payload)
                res.send(JSON.stringify({"status": 200, "error": null, "response": "Comment Posted"}));
            }
        });
    });
});

/* Activity Comments */
users.get('/activity-comments', function(req, res, next) {
    let activity = req.query.activity;
    let query = 'select *, (select fullname from users where users.ID = commenter) as maker from activity_comments where activityID = ?'
    db.query(query, [activity], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send(results);
        }
    });
});

/* Activity Details */
users.get('/activity-details', function(req, res, next) {
    var load = {}
    let activity = req.query.id;
    let query = 'select *, (select count(*) from activity_comments where activityID = ? group by activityID) as comment_count, ' +
        '(select activity_name from activity_types where activity_types.id = activity_type) as activity, ' +
        '(select name from teams where teams.Id = team) as team_name, ' +
        '(select fullname from users where users.id = for_) as user, ' +
        '(select fullname from clients where clients.id = client) as client_name ' +
        'from activities where activities.ID = ?'
    let query2 = 'select *, (select fullname from users where users.ID = commenter) as maker from activity_comments where activityID = ?'
    db.query(query, [activity, activity], function (error, results, fields) {
        load.activity_details = results
        db.query(query2, [activity], function (error, results, fields) {
            load.activity_comments = results
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                res.send(load);
            }
        });
    });
});

/* Client Activities */
users.get('/client-activities', function(req, res, next) {
    var load = {}
    let client = req.query.id;
    let query = 'select *, ' +
        '(select activity_name from activity_types where activity_types.id = activity_type) as activity, ' +
        '(select fullname from users where users.id = for_) as user, ' +
        '(select fullname from clients where clients.id = client) as client_name ' +
        'from activities where client = ?'
    let query2 = 'select *, (select fullname from users where users.ID = commenter) as maker from activity_comments where activityID = ?'
    db.query(query, [client], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send(results);
        }
    });
});

users.get('/clients-act', function(req, res, next) {
    let user = req.query.user;
    let team = req.query.team;
    let params;
    let query = 'select * ' +
        'from clients where loan_officer = ? ' +
        'and status = 1';
    params = [user];
    if (team){
        query = 'select * from clients where loan_officer in (select memberID from team_members where teamID = ?)';
        params = [team];
    }
    db.query(query, params, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

/* Change Activity Type Status */
users.post('/del-act-type/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update activity_types SET status = 0, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Disabled!"}));
        }
    });
});

/* Reactivate Role */
users.post('/en-act-type/:id', function(req, res, next) {
    let date = Date.now(),
        postData = req.body;
    postData.date_modified = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let payload = [postData.date_modified, req.params.id],
        query = 'Update activity_types SET status = 1, date_modified = ? where id=?';
    db.query(query, payload, function (error, results, fields) {
        if(error){
            res.send(JSON.stringify({"status": 500, "error": error, "response": null}));
        } else {
            res.send(JSON.stringify({"status": 200, "error": null, "response": "Role Re-enabled!"}));
        }
    });
});

//File Attachments - Activities
users.post('/attach-files/:id', function(req, res) {
    if (!req.files) return res.status(400).send('No files were uploaded.');
    if (!req.params.id) return res.status(400).send('No Folder specified!');
    if (req.body.num === '1'){
        fs.stat('files/activities/'+req.params.id+'/', function(err) {
            if (!err) {
                console.log('file or directory exists');
            }
            else if (err.code === 'ENOENT') {
                fs.mkdirSync('files/activities/'+req.params.id+'/');
            }
            let sampleFile = req.files.file,
                name = sampleFile.name,
                extArray = sampleFile.name.split("."),
                extension = extArray[extArray.length - 1];
            if (extension) extension = extension.toLowerCase();

            fs.stat('files/activities/'+req.params.id+'/'+name, function (err) {
                if (err) {
                    sampleFile.mv('files/activities/'+req.params.id+'/'+name, function(err) {
                        if (err) return res.status(500).send(err);
                        res.send('File uploaded!');
                    });
                }
                else{
                    fs.unlink('files/activities/'+req.params.id+'/'+name,function(err){
                        if(err){
                            res.send('Unable to delete file!');
                        }
                        else{
                            sampleFile.mv('files/activities/'+req.params.id+'/'+name, function(err) {
                                if (err)
                                    return res.status(500).send(err);
                                res.send('File uploaded!');
                            });
                        }
                    });
                }
            });
        });
    }
});

/* GET Activity Attachments. */
users.get('/attached-images/:folder/', function(req, res, next) {
    var array = [];
    var path = 'files/activities/'+req.params.folder+'/';
    if (fs.existsSync(path)){
        fs.readdir(path, function (err, files){
            var obj = [];
            files = helperFunctions.removeFileDuplicates(path, files);
            async.forEach(files, function (file, callback){
                obj.push(path+file)
                callback();
            }, function(data){
                //array.push(res);
                res.send(JSON.stringify({"status": 200, "response":obj}));
            });
        })	;
    }
    else {
        res.send(JSON.stringify({"status":500, "response": "No Attachments!"}));
    }
});

users.get('/user-commissions/:id', function(req, res, next) {
    let query = 'SELECT *,(select u.fullname from users u where u.ID = c.userID) as user,(select s.title from commissions s where s.ID = c.commissionID) as commission,' +
        '(select t.title from targets t where t.ID = c.targetID) as target,(select p.name from sub_periods p where p.ID = c.sub_periodID) as period from user_commissions c where c.status = 1 and c.userID = ? order by c.ID desc';
    db.query(query, [req.params.id], function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "User commissions fetched successfully", "response": results});
        }
    });
});

users.post('/user-commissions', function(req, res, next) {
    req.body.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('SELECT * FROM user_commissions WHERE userID=? AND type=? AND sub_periodID=? AND status = 1',
        [req.body.userID,req.body.type,req.body.sub_periodID], function (error, result, fields) {
            if (result && result[0]) {
                res.send({"status": 500, "error": "The "+req.body.type+" commission for the same period has already been assigned to this user"});
            } else {
                db.query('SELECT * FROM users WHERE ID=?', [req.body.userID], function (error, user, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        if (user[0]['loan_officer_status'] !== 1)
                            return res.send({"status": 500, "error": "User must be a loan officer"});
                        db.query('INSERT INTO user_commissions SET ?', req.body, function (error, result, fields) {
                            if(error){
                                res.send({"status": 500, "error": error, "response": null});
                            } else {
                                let query = 'SELECT *,(select u.fullname from users u where u.ID = c.userID) as user,(select s.title from commissions s where s.ID = c.commissionID) as commission,' +
                                    '(select t.title from targets t where t.ID = c.targetID) as target,(select p.name from sub_periods p where p.ID = c.sub_periodID) as period from user_commissions c where c.status = 1 and c.userID = ? order by c.ID desc';
                                db.query(query, [req.body.userID], function (error, results, fields) {
                                    if(error){
                                        res.send({"status": 500, "error": error, "response": null});
                                    } else {
                                        res.send({"status": 200, "message": "User commission assigned successfully", "response": results});
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
});

users.delete('/user-commissions/:id/:userID', function(req, res, next) {
    let date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('UPDATE user_commissions SET status = 0, date_modified = ? WHERE ID = ?', [date, req.params.id], function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            let query = 'SELECT *,(select u.fullname from users u where u.ID = c.userID) as user,(select s.title from commissions s where s.ID = c.commissionID) as commission,' +
                '(select t.title from targets t where t.ID = c.targetID) as target,(select p.name from sub_periods p where p.ID = c.sub_periodID) as period from user_commissions c where c.status = 1 and c.userID = ? order by c.ID desc';
            db.query(query, [req.params.userID], function (error, results, fields) {
                if(error){
                    res.send({"status": 500, "error": error, "response": null});
                } else {
                    res.send({"status": 200, "message": "User commission deleted successfully", "response": results});
                }
            });
        }
    });
});

users.get('/commissions-list', function(req, res, next) {
    let type = req.query.type,
        user = req.query.user,
        target = req.query.target,
        sub_period = req.query.sub_period,
        commission = req.query.commission,
        query = 'SELECT c.ID,c.userID,c.commissionID,c.targetID,c.periodID,c.sub_periodID,c.type,c.threshold,c.target_value,c.status,c.date_created,c.date_modified,(SELECT CASE WHEN sum(p.amount) IS NULL THEN 0 ELSE sum(p.AMOUNT) END FROM commission_payments p WHERE c.ID=p.user_commissionID AND p.status=1) AS value,' +
            '(select u.fullname from users u where u.ID = c.userID) as user,(select u.title from targets u where u.ID = c.targetID) as target,m.title as commission,m.rate,m.accelerator,m.accelerator_type,c.accelerator_threshold,p.name as period,p.start,p.end from user_commissions c, commissions m, sub_periods p where c.status = 1 and c.commissionID = m.ID and p.ID = c.sub_periodID';
    if (user)
        query = query.concat(' AND c.userID = "'+user+'"');
    if (type)
        query = query.concat(' AND c.type = "'+type+'"');
    if (target)
        query = query.concat(' AND c.targetID = '+target);
    if (sub_period)
        query = query.concat(' AND c.sub_periodID = '+sub_period);
    if (commission)
        query = query.concat(' AND c.commissionID = '+commission);
    db.query(query, function (error, results, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commissions list fetched successfully", "response": results});
        }
    });
});

users.get('/commissions-list/:officerID', function(req, res, next) {
    let type = req.query.type,
        user = req.query.user,
        id = req.params.officerID,
        target = req.query.target,
        sub_period = req.query.sub_period,
        commission = req.query.commission,
        query = 'SELECT c.ID,c.userID,c.commissionID,c.targetID,c.periodID,c.sub_periodID,c.type,c.threshold,c.target_value,c.status,c.date_created,c.date_modified,(SELECT CASE WHEN sum(p.amount) IS NULL THEN 0 ELSE sum(p.AMOUNT) END FROM commission_payments p WHERE c.ID=p.user_commissionID AND p.status=1) AS value,' +
            '(select u.fullname from users u where u.ID = c.userID) as user,(select u.title from targets u where u.ID = c.targetID) as target,m.title as commission,m.rate,m.accelerator,m.accelerator_type,c.accelerator_threshold,p.name as period,p.start,p.end from user_commissions c, commissions m, sub_periods p where c.status = 1 and c.commissionID = m.ID and p.ID = c.sub_periodID',
        query2 = query.concat(' AND c.userID = '+id+' '),
        query3 = query.concat(' AND (select supervisor from users where users.id = c.userID) =  '+id+' ');
    if (id)
        query = query2;
    if (user)
        query = query.concat(' AND c.userID = "'+user+'"');
    if (type)
        query = query.concat(' AND c.type = "'+type+'"');
    if (target)
        query = query.concat(' AND c.targetID = '+target);
    if (sub_period)
        query = query.concat(' AND c.sub_periodID = '+sub_period);
    if (commission)
        query = query.concat(' AND c.commissionID = '+commission);
    if (id){
        db.query(query, function (error, commissions, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                db.query(query3, function (error, commissions2, fields) {
                    if(error){
                        res.send({"status": 500, "error": error, "response": null});
                    } else {
                        let results = commissions.concat(commissions2);
                        res.send({"status": 200, "message": "Commissions list fetched successfully", "response": results});
                    }
                });
            }
        });
    } else {
        db.query(query, function (error, results, fields) {
            if(error){
                res.send({"status": 500, "error": error, "response": null});
            } else {
                res.send({"status": 200, "message": "Commissions list fetched successfully", "response": results});
            }
        });
    }
});

users.post('/commission/payments', function(req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO commission_payments SET ?', data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commission payment saved successfully!"});
        }
    });
});

users.get('/commission/payment-history/:user_commissionID', function(req, res, next) {
    db.query('SELECT * FROM commission_payments WHERE user_commissionID = '+req.params.user_commissionID, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commission payment fetched successfully!", response: result});
        }
    });
});

users.post('/commission/processes', function(req, res, next) {
    let data = req.body;
    data.date_created = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    db.query('INSERT INTO commission_processes SET ?', data, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commission process saved successfully!"});
        }
    });
});

users.get('/commission/processes/:user_commissionID', function(req, res, next) {
    db.query('SELECT * FROM commission_processes WHERE status = 1 AND user_commissionID = '+req.params.user_commissionID, function (error, result, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Commission process fetched successfully!", response: result});
        }
    });
});

users.get('/application/commission-payment-reversal/:id', function(req, res, next) {
    db.query('UPDATE commission_payments SET status=0 WHERE ID=?', [req.params.id], function (error, history, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Payment reversed successfully!"});
        }
    });
});

users.get('/application/commission-process-reversal/:id', function(req, res, next) {
    db.query('UPDATE commission_processes SET status=0 WHERE ID=?', [req.params.id], function (error, history, fields) {
        if(error){
            res.send({"status": 500, "error": error, "response": null});
        } else {
            res.send({"status": 200, "message": "Process reversed successfully!"});
        }
    });
});

users.get('/target-mail', function(req, res) {
    // let data = req.body;
    // if (!data.name || !data.email || !data.company || !data.phone || !data.title || !data.location || !data.description || !data.lead)
    //     return res.send("Required Parameters not sent!");
    // data.date = moment().utcOffset('+0100').format('YYYY-MM-DD h:mm:ss a');
    let mailOptions = {
        from: process.env.TENANT+' Target <noreply@finratus.com>',
        to: 'itaukemeabasi@gmail.com',
        subject: 'Target',
        template: 'target'
    };

    transporter.sendMail(mailOptions, function(error, info){
        console.log(error)
        console.log(info)
        if(error)
            return res.send("Error");
        return res.send("OK");
    });
});

users.get('/banks', function(req, res) {
    res.send(require('../banks.json'));
});

module.exports = users;