var masterSchema = require("../models/index");
var async = require("async");
var config = require("../config/config-dev");
var moment = require("moment");
const Logger = require("../utils/Logger");
const logger = new Logger("services/adminService");

/**
 * Admin Registration - Register with admin code
 */
exports.registerAdmin = (req, callback) => {
    let adminData, accesstoken;
    const adminConfig = config.adminConfig();

    let validateAdminCode = (cb) => {
        if (req.body.adminCode !== adminConfig.registrationCode) {
            logger.error(Logger.formatParams('registerAdmin: Invalid admin code', { adminCode: req.body.adminCode }));
            return cb({
                status: "Fail",
                statusCode: 403,
                msg: "Invalid admin registration code"
            });
        }
        logger.info('registerAdmin: Admin code validated');
        cb();
    };

    let checkExistingAdmin = (cb) => {
        masterSchema.users.findOne({ mobileNumber: req.body.mobileNumber }, (err, user) => {
            if (err) {
                return cb({
                    status: "Fail",
                    statusCode: 500,
                    msg: "Database error"
                });
            }
            if (user) {
                return cb({
                    status: "Fail",
                    statusCode: 403,
                    msg: "User already exists"
                });
            }
            cb();
        });
    };

    let createAdminUser = (cb) => {
        let newUser = new masterSchema.users();
        newUser.firstName = req.body.firstName;
        newUser.lastName = req.body.lastName;
        newUser.mobileNumber = req.body.mobileNumber;
        newUser.emailId = req.body.emailId;
        newUser.password = req.body.password;
        newUser.role = adminConfig.role.ADMIN;
        newUser.customerType = adminConfig.role.ADMIN; // Set both role and customerType
        newUser.verifiedUser = true;
        newUser.approvalStatus = adminConfig.approvalStatus.APPROVED;

        newUser.save((err, savedUser) => {
            if (err) {
                logger.error(Logger.formatParams('registerAdmin: Error creating admin user', err));
                return cb({
                    status: "Fail",
                    statusCode: 500,
                    msg: "Error creating admin user"
                });
            }
            adminData = savedUser;
            logger.info('registerAdmin: Admin user created');
            cb();
        });
    };

    let createAdminRecord = (cb) => {
        let admin = new masterSchema.admins();
        admin.userId = adminData._id;
        admin.adminCode = req.body.adminCode;
        admin.permissions = [
            { type: 'approve_vendors', granted: true },
            { type: 'approve_posts', granted: true },
            { type: 'moderate_content', granted: true },
            { type: 'create_admin_posts', granted: true }
        ];

        admin.save((err) => {
            if (err) {
                logger.error(Logger.formatParams('registerAdmin: Error creating admin record', err));
                return cb({
                    status: "Fail",
                    statusCode: 500,
                    msg: "Error creating admin record"
                });
            }
            logger.info('registerAdmin: Admin record created');
            cb();
        });
    };

    let generateAccessToken = (cb) => {
        const myaccountService = require("./myAccountService");
        let args = {
            device: req.headers["device"],
            mobileNumber: adminData.mobileNumber,
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            verifiedUser: true,
            customerType: 'admin',
            time: moment().format("YYYY-MM-DDTHH:mm:ss"),
        };
        myaccountService.generateNewAccessToken(args, (status) => {
            if (status.status == "Success") {
                accesstoken = status.accesstoken;
                cb();
            } else {
                cb(status);
            }
        });
    };

    async.series([
        validateAdminCode,
        checkExistingAdmin,
        createAdminUser,
        createAdminRecord,
        generateAccessToken
    ], (err) => {
        if (err) {
            callback(err);
        } else {
            callback({
                status: "Success",
                statusCode: 200,
                msg: "Admin registered successfully",
                accesstoken: accesstoken,
                adminId: adminData._id
            });
        }
    });
};

/**
 * Get Dashboard Stats
 */
exports.getDashboardStats = (callback) => {
    let stats = {};

    let getVendorStats = (cb) => {
        masterSchema.vendors.aggregate([
            {
                $group: {
                    _id: "$approvalStatus",
                    count: { $sum: 1 }
                }
            }
        ]).exec((err, result) => {
            if (err) {
                return cb(err);
            }
            stats.vendors = {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                flagged: 0,
                hidden: 0
            };
            result.forEach(r => {
                stats.vendors[r._id] = r.count;
                stats.vendors.total += r.count;
            });
            cb();
        });
    };

    let getPostStats = (cb) => {
        masterSchema.items.aggregate([
            {
                $group: {
                    _id: "$approvalStatus",
                    count: { $sum: 1 }
                }
            }
        ]).exec((err, result) => {
            if (err) {
                return cb(err);
            }
            stats.posts = {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                flagged: 0,
                hidden: 0
            };
            result.forEach(r => {
                stats.posts[r._id] = r.count;
                stats.posts.total += r.count;
            });
            cb();
        });
    };

    let getUserStats = (cb) => {
        masterSchema.users.countDocuments({ role: 'user' }, (err, count) => {
            if (err) {
                return cb(err);
            }
            stats.users = { total: count };
            cb();
        });
    };

    let getAdminPostStats = (cb) => {
        masterSchema.items.countDocuments({ isAdminPost: true }, (err, count) => {
            if (err) {
                return cb(err);
            }
            stats.adminPosts = { total: count };
            cb();
        });
    };

    async.parallel([
        getVendorStats,
        getPostStats,
        getUserStats,
        getAdminPostStats
    ], (err) => {
        if (err) {
            logger.error(Logger.formatParams('getDashboardStats: Error', err));
            callback({
                status: "Fail",
                statusCode: 500,
                msg: "Error fetching dashboard stats"
            });
        } else {
            callback({
                status: "Success",
                statusCode: 200,
                data: stats
            });
        }
    });
};

/**
 * Get All Vendors with pagination and filters
 */
exports.getAllVendors = (filters, callback) => {
    let matchQuery = {};

    if (filters.status) {
        matchQuery.approvalStatus = filters.status;
    }

    let skip = parseInt(filters.page || 0) * parseInt(filters.limit || 10);
    let limit = parseInt(filters.limit || 10);

    masterSchema.vendors.aggregate([
        { $match: matchQuery },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                mobileNumber: 1,
                emailId: 1,
                category: 1,
                approvalStatus: 1,
                rejectionReason: 1,
                flaggedReason: 1,
                verifiedUser: 1,
                profilePic: 1,
                createdAt: 1
            }
        }
    ]).exec((err, vendors) => {
        if (err) {
            logger.error(Logger.formatParams('getAllVendors: Error', err));
            callback({
                status: "Fail",
                statusCode: 500,
                msg: "Error fetching vendors"
            });
        } else {
            callback({
                status: "Success",
                statusCode: 200,
                data: vendors
            });
        }
    });
};

/**
 * Approve/Reject Vendor
 */
exports.moderateVendor = (vendorId, action, reason, callback) => {
    let updateData = {
        approvalStatus: action,
        updatedAt: new Date()
    };

    if (action === 'rejected') {
        updateData.rejectionReason = reason;
    } else if (action === 'flagged') {
        updateData.flaggedReason = reason;
    }

    masterSchema.vendors.findByIdAndUpdate(
        vendorId,
        { $set: updateData },
        { new: true },
        (err, vendor) => {
            if (err) {
                logger.error(Logger.formatParams('moderateVendor: Error', err));
                callback({
                    status: "Fail",
                    statusCode: 500,
                    msg: "Error moderating vendor"
                });
            } else if (!vendor) {
                callback({
                    status: "Fail",
                    statusCode: 404,
                    msg: "Vendor not found"
                });
            } else {
                logger.info(Logger.formatParams('moderateVendor: Vendor moderated', { vendorId, action }));
                callback({
                    status: "Success",
                    statusCode: 200,
                    msg: `Vendor ${action} successfully`,
                    data: vendor
                });
            }
        }
    );
};

/**
 * Get All Posts with pagination and filters
 */
exports.getAllPosts = (filters, callback) => {
    let matchQuery = {};

    if (filters.status) {
        matchQuery.approvalStatus = filters.status;
    }

    let skip = parseInt(filters.page || 0) * parseInt(filters.limit || 10);
    let limit = parseInt(filters.limit || 10);

    masterSchema.items.aggregate([
        { $match: matchQuery },
        { $sort: { insertedDate: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: "vendors",
                localField: "vendorId",
                foreignField: "_id",
                as: "vendor"
            }
        },
        {
            $unwind: {
                path: "$vendor",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                itemName: 1,
                category: 1,
                itemDescription: 1,
                mainImage: 1,
                approvalStatus: 1,
                isAdminPost: 1,
                rejectionReason: 1,
                flaggedReason: 1,
                insertedDate: 1,
                "vendor.firstName": 1,
                "vendor.lastName": 1,
                "vendor.mobileNumber": 1,
                "vendor.category": 1
            }
        }
    ]).exec((err, posts) => {
        if (err) {
            logger.error(Logger.formatParams('getAllPosts: Error', err));
            callback({
                status: "Fail",
                statusCode: 500,
                msg: "Error fetching posts"
            });
        } else {
            callback({
                status: "Success",
                statusCode: 200,
                data: posts
            });
        }
    });
};

/**
 * Approve/Reject Post
 */
exports.moderatePost = (postId, action, reason, callback) => {
    let updateData = {
        approvalStatus: action,
        updatedAt: new Date()
    };

    if (action === 'rejected') {
        updateData.rejectionReason = reason;
    } else if (action === 'flagged') {
        updateData.flaggedReason = reason;
    }

    masterSchema.items.findByIdAndUpdate(
        postId,
        { $set: updateData },
        { new: true },
        (err, post) => {
            if (err) {
                logger.error(Logger.formatParams('moderatePost: Error', err));
                callback({
                    status: "Fail",
                    statusCode: 500,
                    msg: "Error moderating post"
                });
            } else if (!post) {
                callback({
                    status: "Fail",
                    statusCode: 404,
                    msg: "Post not found"
                });
            } else {
                logger.info(Logger.formatParams('moderatePost: Post moderated', { postId, action }));
                callback({
                    status: "Success",
                    statusCode: 200,
                    msg: `Post ${action} successfully`,
                    data: post
                });
            }
        }
    );
};

/**
 * Create Admin Post (appears to all users)
 */
exports.createAdminPost = (req, callback) => {
    let adminData;

    let getAdminUser = (cb) => {
        masterSchema.users.findOne(
            { mobileNumber: req.authDetails.mobileNumber, role: 'admin' },
            (err, admin) => {
                if (err || !admin) {
                    return cb({
                        status: "Fail",
                        statusCode: 403,
                        msg: "Admin not found"
                    });
                }
                adminData = admin;
                cb();
            }
        );
    };

    let saveAdminPost = (cb) => {
        let item = new masterSchema.items();
        item.vendorId = adminData._id; // Use admin user ID as vendorId
        item.itemName = req.body.itemName;
        item.category = req.body.category || 'admin';
        item.itemDescription = req.body.itemDescription;
        item.isAdminPost = true;
        item.approvalStatus = 'approved'; // Auto-approve admin posts
        item.mainImage = req.body.mainImage || '';
        item.otherImages = req.body.otherImages || [];

        item.save((err, savedPost) => {
            if (err) {
                logger.error(Logger.formatParams('createAdminPost: Error saving post', err));
                return cb({
                    status: "Fail",
                    statusCode: 500,
                    msg: "Error creating admin post"
                });
            }
            adminData.postId = savedPost._id;
            logger.info(Logger.formatParams('createAdminPost: Admin post created', { postId: savedPost._id }));
            cb();
        });
    };

    async.series([
        getAdminUser,
        saveAdminPost
    ], (err) => {
        if (err) {
            callback(err);
        } else {
            callback({
                status: "Success",
                statusCode: 200,
                msg: "Admin post created successfully",
                postId: adminData.postId
            });
        }
    });
};

/**
 * Get Flagged Content
 */
exports.getFlaggedContent = (callback) => {
    let flaggedContent = {};

    let getFlaggedVendors = (cb) => {
        masterSchema.vendors.find({ approvalStatus: 'flagged' })
            .select('_id firstName lastName mobileNumber category flaggedReason createdAt')
            .exec((err, vendors) => {
                if (err) {
                    return cb(err);
                }
                flaggedContent.vendors = vendors;
                cb();
            });
    };

    let getFlaggedPosts = (cb) => {
        masterSchema.items.find({ approvalStatus: 'flagged' })
            .populate('vendorId', 'firstName lastName mobileNumber')
            .select('_id itemName category flaggedReason vendorId insertedDate')
            .exec((err, posts) => {
                if (err) {
                    return cb(err);
                }
                flaggedContent.posts = posts;
                cb();
            });
    };

    async.parallel([
        getFlaggedVendors,
        getFlaggedPosts
    ], (err) => {
        if (err) {
            logger.error(Logger.formatParams('getFlaggedContent: Error', err));
            callback({
                status: "Fail",
                statusCode: 500,
                msg: "Error fetching flagged content"
            });
        } else {
            callback({
                status: "Success",
                statusCode: 200,
                data: flaggedContent
            });
        }
    });
};

/**
 * Delete Vendor
 */
exports.deleteVendor = (vendorId, callback) => {
    masterSchema.vendors.findByIdAndDelete(vendorId, (err, vendor) => {
        if (err) {
            logger.error(Logger.formatParams('deleteVendor: Error', err));
            callback({
                status: "Fail",
                statusCode: 500,
                msg: "Error deleting vendor"
            });
        } else if (!vendor) {
            callback({
                status: "Fail",
                statusCode: 404,
                msg: "Vendor not found"
            });
        } else {
            // Also delete vendor's items
            masterSchema.items.deleteMany({ vendorId: vendorId }, (err) => {
                logger.info(Logger.formatParams('deleteVendor: Vendor deleted', { vendorId }));
                callback({
                    status: "Success",
                    statusCode: 200,
                    msg: "Vendor deleted successfully"
                });
            });
        }
    });
};

/**
 * Delete Post
 */
exports.deletePost = (postId, callback) => {
    masterSchema.items.findByIdAndDelete(postId, (err, post) => {
        if (err) {
            logger.error(Logger.formatParams('deletePost: Error', err));
            callback({
                status: "Fail",
                statusCode: 500,
                msg: "Error deleting post"
            });
        } else if (!post) {
            callback({
                status: "Fail",
                statusCode: 404,
                msg: "Post not found"
            });
        } else {
            logger.info(Logger.formatParams('deletePost: Post deleted', { postId }));
            callback({
                status: "Success",
                statusCode: 200,
                msg: "Post deleted successfully"
            });
        }
    });
};
