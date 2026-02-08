var adminService = require('../services/adminService');
const Logger = require('../utils/Logger');
const logger = new Logger('controllers/adminController');

/**
 * Admin Registration
 * POST /api/admin/register
 */
exports.registerAdmin = (req, res) => {
    logger.apireq(Logger.formatParams("Request -- body : ", req.body, "-- headers --", req.headers));

    adminService.registerAdmin(req, (status) => {
        res.json(status);
    });
};

/**
 * Get Dashboard Stats
 * GET /api/admin/dashboard
 */
exports.getDashboardStats = (req, res) => {
    logger.apireq(Logger.formatParams("Request -- headers --", req.headers));

    adminService.getDashboardStats((status) => {
        res.json(status);
    });
};

/**
 * Get All Vendors
 * GET /api/admin/vendors?page=0&limit=10&status=pending
 */
exports.getAllVendors = (req, res) => {
    logger.apireq(Logger.formatParams("Request -- query : ", req.query));

    let filters = {
        page: req.query.page || 0,
        limit: req.query.limit || 10,
        status: req.query.status
    };

    adminService.getAllVendors(filters, (status) => {
        res.json(status);
    });
};

/**
 * Moderate Vendor (Approve/Reject/Flag/Hide)
 * PUT /api/admin/vendors/:id/moderate
 * Body: { action: 'approved'|'rejected'|'flagged'|'hidden', reason: 'optional reason' }
 */
exports.moderateVendor = (req, res) => {
    logger.apireq(Logger.formatParams("Request -- params : ", req.params, "-- body --", req.body));

    let vendorId = req.params.id;
    let action = req.body.action;
    let reason = req.body.reason || '';

    // Validate action
    const validActions = ['approved', 'rejected', 'flagged', 'hidden'];
    if (!validActions.includes(action)) {
        return res.json({
            status: "Fail",
            statusCode: 400,
            msg: "Invalid action. Must be one of: " + validActions.join(', ')
        });
    }

    adminService.moderateVendor(vendorId, action, reason, (status) => {
        res.json(status);
    });
};

/**
 * Delete Vendor
 * DELETE /api/admin/vendors/:id
 */
exports.deleteVendor = (req, res) => {
    logger.apireq(Logger.formatParams("Request -- params : ", req.params));

    adminService.deleteVendor(req.params.id, (status) => {
        res.json(status);
    });
};

/**
 * Get All Posts
 * GET /api/admin/posts?page=0&limit=10&status=pending
 */
exports.getAllPosts = (req, res) => {
    logger.apireq(Logger.formatParams("Request -- query : ", req.query));

    let filters = {
        page: req.query.page || 0,
        limit: req.query.limit || 10,
        status: req.query.status
    };

    adminService.getAllPosts(filters, (status) => {
        res.json(status);
    });
};

/**
 * Moderate Post (Approve/Reject/Flag/Hide)
 * PUT /api/admin/posts/:id/moderate
 * Body: { action: 'approved'|'rejected'|'flagged'|'hidden', reason: 'optional reason' }
 */
exports.moderatePost = (req, res) => {
    logger.apireq(Logger.formatParams("Request -- params : ", req.params, "-- body --", req.body));

    let postId = req.params.id;
    let action = req.body.action;
    let reason = req.body.reason || '';

    // Validate action
    const validActions = ['approved', 'rejected', 'flagged', 'hidden'];
    if (!validActions.includes(action)) {
        return res.json({
            status: "Fail",
            statusCode: 400,
            msg: "Invalid action. Must be one of: " + validActions.join(', ')
        });
    }

    adminService.moderatePost(postId, action, reason, (status) => {
        res.json(status);
    });
};

/**
 * Delete Post
 * DELETE /api/admin/posts/:id
 */
exports.deletePost = (req, res) => {
    logger.apireq(Logger.formatParams("Request -- params : ", req.params));

    adminService.deletePost(req.params.id, (status) => {
        res.json(status);
    });
};

/**
 * Create Admin Post (appears to all users)
 * POST /api/admin/posts
 * Body: { itemName, category, itemDescription, mainImage, otherImages }
 */
exports.createAdminPost = (req, res) => {
    logger.apireq(Logger.formatParams("Request -- body : ", req.body, "-- headers --", req.headers));

    adminService.createAdminPost(req, (status) => {
        res.json(status);
    });
};

/**
 * Get Flagged Content
 * GET /api/admin/flagged
 */
exports.getFlaggedContent = (req, res) => {
    logger.apireq(Logger.formatParams("Request -- headers --", req.headers));

    adminService.getFlaggedContent((status) => {
        res.json(status);
    });
};
