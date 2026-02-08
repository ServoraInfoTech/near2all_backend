var express = require('express');
var router = express.Router();
var vendorController = require('../../controllers/vendorController')

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Vendor registration, profile, and item management APIs
 */

/**
 * @swagger
 * /api/vendor/register:
 *   post:
 *     summary: Register a new vendor
 *     description: Register a new vendor with location and business details
 *     tags: [Vendors]
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendorSignupData
 *             properties:
 *               vendorSignupData:
 *                 $ref: '#/components/schemas/Vendor'
 *     responses:
 *       200:
 *         description: Vendor registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *                 accesstoken:
 *                   type: string
 */
router.post('/register', vendorController.registerVendor);

/**
 * @swagger
 * /api/vendor/login:
 *   post:
 *     summary: Vendor login
 *     description: Authenticate a vendor with mobile number and password
 *     tags: [Vendors]
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signin
 *             properties:
 *               signin:
 *                 type: object
 *                 required:
 *                   - mobileNumber
 *                   - password
 *                 properties:
 *                   mobileNumber:
 *                     type: string
 *                     example: "9876543210"
 *                   password:
 *                     type: string
 *                     format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *                 accesstoken:
 *                   type: string
 */
router.post('/login', vendorController.loginVendor);

/**
 * @swagger
 * /api/vendor/profile:
 *   post:
 *     summary: Get vendor profile
 *     description: Retrieve vendor profile with their items
 *     tags: [Vendors]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobileNumber
 *             properties:
 *               mobileNumber:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.post('/profile', vendorController.vendorProfile);

/**
 * @swagger
 * /api/vendor/uploadItems:
 *   post:
 *     summary: Upload vendor items
 *     description: Upload new items/products for the vendor
 *     tags: [Vendors]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemData
 *             properties:
 *               itemData:
 *                 $ref: '#/components/schemas/Item'
 *     responses:
 *       200:
 *         description: Items uploaded successfully
 */
router.post('/uploadItems', vendorController.uploadItems);

/**
 * @swagger
 * /api/vendor/vendorHome:
 *   post:
 *     summary: Get vendor home feed
 *     description: Get nearby vendors and their items based on location
 *     tags: [Vendors]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coordinates
 *             properties:
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [77.2090, 28.6139]
 *                 description: [longitude, latitude]
 *     responses:
 *       200:
 *         description: Vendor feed retrieved successfully
 */
router.post('/vendorHome', vendorController.vendorHome);

router.post('/verify', vendorController.verifyVendor);
router.post('/logout', vendorController.logoutVendor);
router.post('/updateProfileImage', vendorController.saveVendorProfileImage);
router.post('/updateProfile', vendorController.saveVendorProfile);
router.post('/updateLocation', vendorController.updateVendorLocation);
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
