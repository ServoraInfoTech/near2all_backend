let express = require('express');
let router = express.Router();
let adminController = require('../controllers/adminController');
let appSecurityController = require('../controllers/appSecurityController');
let { isAdmin } = require('../middleware/authMiddleware');

/**
 * Admin Routes
 * All routes require admin authentication
 */

// Admin Registration (public route - no auth required, needs admin code)
router.post('/register', adminController.registerAdmin);

// Apply admin authentication middleware to all routes below
router.use(appSecurityController.tokenVerify);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Vendor Management
router.get('/vendors', adminController.getAllVendors);
router.put('/vendors/:id/moderate', adminController.moderateVendor);
router.delete('/vendors/:id', adminController.deleteVendor);

// Post Management
router.get('/posts', adminController.getAllPosts);
router.put('/posts/:id/moderate', adminController.moderatePost);
router.delete('/posts/:id', adminController.deletePost);

// Admin Posts (appear to all users)
router.post('/posts', adminController.createAdminPost);

// Flagged Content
router.get('/flagged', adminController.getFlaggedContent);

module.exports = router;
