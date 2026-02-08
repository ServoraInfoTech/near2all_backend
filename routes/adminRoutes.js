let express = require('express');
let router = express.Router();
let adminController = require('../controllers/adminController');
let appSecurityController = require('../controllers/appSecurityController');
let { isAdmin } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management and moderation APIs
 */

/**
 * @swagger
 * /api/admin/register:
 *   post:
 *     summary: Register a new admin user
 *     description: Register a new admin user with a valid admin registration code
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminRegister'
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *           example: android
 *     responses:
 *       200:
 *         description: Admin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Success
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 msg:
 *                   type: string
 *                   example: Admin registered successfully
 *                 accesstoken:
 *                   type: string
 *                   example: 2q+96t9sIBVEeB6E6MQbOQGfaYoJYgc4Xy6cEXJKOGuD3VBTAVmuAwkoplBmzldxEaYA8ngxyij5ef2IA3A+o81KV79CKfMxK1Pw+xmAWly61FyszFQcBG9fl7zmxHVnrD4JjeDuvcgQ0moEm8LjRCXyyTsnosVQlrGqWac7Hb3Mk/t3qDFBYG/FHHGbxWzAOEQHWL5F99RdOEVpNuNE9g==
 *                 adminId:
 *                   type: string
 *                   example: 698882ba0a085b14cae9be89
 *       403:
 *         description: Invalid admin code or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Admin Registration (public route - no auth required, needs admin code)
router.post('/register', adminController.registerAdmin);

// Apply admin authentication middleware to all routes below
router.use(appSecurityController.tokenVerify);
router.use(isAdmin);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieve platform statistics including vendors, posts, users, and admin posts counts
 *     tags: [Admin]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Success
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendors:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                         approved:
 *                           type: integer
 *                         rejected:
 *                           type: integer
 *                         flagged:
 *                           type: integer
 *                         hidden:
 *                           type: integer
 *                     posts:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                         approved:
 *                           type: integer
 *                         rejected:
 *                           type: integer
 *                         flagged:
 *                           type: integer
 *                         hidden:
 *                           type: integer
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                     adminPosts:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *       403:
 *         description: Access denied - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @swagger
 * /api/admin/vendors:
 *   get:
 *     summary: Get all vendors
 *     description: Retrieve a paginated list of vendors with optional status filtering
 *     tags: [Admin]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, flagged, hidden]
 *         description: Filter by approval status
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       mobileNumber:
 *                         type: string
 *                       emailId:
 *                         type: string
 *                       category:
 *                         type: string
 *                       approvalStatus:
 *                         type: string
 *                       verifiedUser:
 *                         type: boolean
 *                       profilePic:
 *                         type: string
 */
// Vendor Management
router.get('/vendors', adminController.getAllVendors);

/**
 * @swagger
 * /api/admin/vendors/{id}/moderate:
 *   put:
 *     summary: Moderate a vendor
 *     description: Approve, reject, flag, or hide a vendor
 *     tags: [Admin]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModerationAction'
 *     responses:
 *       200:
 *         description: Vendor moderated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *                 msg:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Vendor not found
 */
router.put('/vendors/:id/moderate', adminController.moderateVendor);

/**
 * @swagger
 * /api/admin/vendors/{id}:
 *   delete:
 *     summary: Delete a vendor
 *     description: Permanently delete a vendor and all their items
 *     tags: [Admin]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor deleted successfully
 *       404:
 *         description: Vendor not found
 */
router.delete('/vendors/:id', adminController.deleteVendor);

/**
 * @swagger
 * /api/admin/posts:
 *   get:
 *     summary: Get all posts
 *     description: Retrieve a paginated list of posts with optional status filtering
 *     tags: [Admin]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, flagged, hidden]
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       itemName:
 *                         type: string
 *                       category:
 *                         type: string
 *                       isAdminPost:
 *                         type: boolean
 *                       approvalStatus:
 *                         type: string
 */
// Post Management
router.get('/posts', adminController.getAllPosts);

/**
 * @swagger
 * /api/admin/posts:
 *   post:
 *     summary: Create an admin post
 *     description: Create a new admin post that will be visible to all users
 *     tags: [Admin]
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
 *             $ref: '#/components/schemas/Item'
 *     responses:
 *       200:
 *         description: Admin post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *                 msg:
 *                   type: string
 *                 postId:
 *                   type: string
 */
router.post('/posts', adminController.createAdminPost);

/**
 * @swagger
 * /api/admin/posts/{id}/moderate:
 *   put:
 *     summary: Moderate a post
 *     description: Approve, reject, flag, or hide a post
 *     tags: [Admin]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModerationAction'
 *     responses:
 *       200:
 *         description: Post moderated successfully
 */
router.put('/posts/:id/moderate', adminController.moderatePost);

/**
 * @swagger
 * /api/admin/posts/{id}:
 *   delete:
 *     summary: Delete a post
 *     description: Permanently delete a post
 *     tags: [Admin]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post deleted successfully
 */
router.delete('/posts/:id', adminController.deletePost);

/**
 * @swagger
 * /api/admin/flagged:
 *   get:
 *     summary: Get flagged content
 *     description: Retrieve all flagged vendors and posts
 *     tags: [Admin]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flagged content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendors:
 *                       type: array
 *                       items:
 *                         type: object
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 */
// Flagged Content
router.get('/flagged', adminController.getFlaggedContent);

module.exports = router;
