var express = require('express');
var router = express.Router();
var myAccountController = require('../../controllers/myAccountController');

router.post('/getStateCityList', myAccountController.getStateCityList);
router.post('/forgotPwd', myAccountController.forgotPwd);

module.exports = router;
