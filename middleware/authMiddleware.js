const Logger = require('../utils/Logger');
const logger = new Logger('middleware/authMiddleware');

/**
 * Middleware to check if user has required role
 * @param {Array} roles - Array of allowed roles e.g., ['admin', 'vendor']
 */
exports.checkRole = (roles) => {
    return (req, res, next) => {
        try {
            const userRole = req.authDetails?.customerType;

            if (!userRole) {
                logger.error(Logger.formatParams('checkRole: No role found in authDetails', req.authDetails));
                return res.status(403).json({
                    status: 'Fail',
                    statusCode: 403,
                    msg: 'Access denied: No role found'
                });
            }

            if (!roles.includes(userRole)) {
                logger.error(Logger.formatParams('checkRole: Insufficient permissions', { userRole, requiredRoles: roles }));
                return res.status(403).json({
                    status: 'Fail',
                    statusCode: 403,
                    msg: 'Access denied: Insufficient permissions'
                });
            }

            logger.info(Logger.formatParams('checkRole: Access granted', { userRole }));
            next();
        } catch (error) {
            logger.error(Logger.formatParams('checkRole: Error', error));
            return res.status(500).json({
                status: 'Fail',
                statusCode: 500,
                msg: 'Internal server error'
            });
        }
    };
};

/**
 * Middleware to check if user is admin
 */
exports.isAdmin = (req, res, next) => {
    try {
        const userRole = req.authDetails?.customerType;
        logger.info(Logger.formatParams('isAdmin: Checking admin access', {
            authDetails: req.authDetails,
            userRole: userRole
        }));

        if (userRole !== 'admin') {
            logger.error(Logger.formatParams('isAdmin: Access denied - not an admin', { userRole }));
            return res.status(403).json({
                status: 'Fail',
                statusCode: 403,
                msg: 'Access denied: Admin access required'
            });
        }

        logger.info('isAdmin: Admin access granted');
        next();
    } catch (error) {
        logger.error(Logger.formatParams('isAdmin: Error', error));
        return res.status(500).json({
            status: 'Fail',
            statusCode: 500,
            msg: 'Internal server error'
        });
    }
};

/**
 * Middleware to check if user is vendor or admin
 */
exports.isVendorOrAdmin = (req, res, next) => {
    return exports.checkRole(['vendor', 'admin'])(req, res, next);
};

/**
 * Middleware to check if user owns the resource or is admin
 * @param {string} resourceUserIdParam - The param name that contains the user ID of the resource owner
 */
exports.isOwnerOrAdmin = (resourceUserIdParam) => {
    return (req, res, next) => {
        try {
            const authUserId = req.authDetails?.mobileNumber; // Using mobileNumber as user identifier
            const resourceUserId = req.params[resourceUserIdParam] || req.body[resourceUserIdParam];
            const userRole = req.authDetails?.customerType;

            // Admin can access any resource
            if (userRole === 'admin') {
                logger.info('isOwnerOrAdmin: Admin access granted');
                return next();
            }

            // Check if user owns the resource
            if (authUserId !== resourceUserId) {
                logger.error(Logger.formatParams('isOwnerOrAdmin: Access denied - not owner', { authUserId, resourceUserId }));
                return res.status(403).json({
                    status: 'Fail',
                    statusCode: 403,
                    msg: 'Access denied: You do not own this resource'
                });
            }

            logger.info('isOwnerOrAdmin: Owner access granted');
            next();
        } catch (error) {
            logger.error(Logger.formatParams('isOwnerOrAdmin: Error', error));
            return res.status(500).json({
                status: 'Fail',
                statusCode: 500,
                msg: 'Internal server error'
            });
        }
    };
};
