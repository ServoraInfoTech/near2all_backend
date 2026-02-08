var express = require('express');
var router = express.Router();
var vendorController = require('../../controllers/vendorController')


/* GET home page. */
router.post('/register', vendorController.registerVendor);
router.post('/verify', vendorController.verifyVendor);
router.post('/login', vendorController.loginVendor);
router.post('/logout', vendorController.logoutVendor);
router.post('/updateProfileImage', vendorController.saveVendorProfileImage);
router.post('/updateProfile', vendorController.saveVendorProfile);
router.post('/uploadItems', vendorController.uploadItems);
router.post('/profile', vendorController.vendorProfile);
router.post('/updateLocation', vendorController.updateVendorLocation);
router.post('/vendorHome', vendorController.vendorHome);
router.post('/followThisVendor', vendorController.followThisVendor);
router.post('/followVendors', vendorController.followVendors);
router.post('/unFollowThisVendor', vendorController.unFollowThisVendor);
router.post('/searchVendor', vendorController.searchVendor);
router.post('/updateMessage', vendorController.updateMessage);
router.post('/showMessages', vendorController.showMessages);
router.post('/changePwd', vendorController.changePwd);
router.post('/forgotPwd', vendorController.forgotPwd);
router.post('/updateForgotPwd', vendorController.verifyAndUpdatePwd);

module.exports = router;