var express = require('express');
var router = express.Router();
var userController = require('../../controllers/userController');


/* GET home page. */
router.post('/register', userController.registerUser);
router.post('/verify', userController.verifyUser);
router.post('/login', userController.loginUser);
router.post('/logout', userController.logoutUser);
router.post('/updateProfile', userController.saveUserProfile);
router.post('/updateProfileImage', userController.saveUserProfileImage);
router.post('/profile', userController.userProfile);
router.post('/userHome', userController.userHome);
router.post('/followThisVendor', userController.followThisVendor);
router.post('/followVendors', userController.followVendors);
router.post('/unFollowThisVendor', userController.unFollowThisVendor);
router.post('/messageVendor', userController.messageVendor)
router.post('/searchVendor', userController.searchVendor);
router.post('/changePwd', userController.changePwd);
router.post('/forgotPwd', userController.forgotPwd);
router.post('/updateForgotPwd', userController.verifyAndUpdatePwd);
router.post('/uploadItems', userController.uploadItems);

module.exports = router;
