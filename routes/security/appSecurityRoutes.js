var express = require('express');
var router = express.Router();
var appSecurtiyController = require('../../controllers/appSecurityController');
/* GET home page. */
router.post('/tokenGeneration', appSecurtiyController.tokenGeneration);
module.exports = router;
