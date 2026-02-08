var myAccountService = require('../services/myAccountService');
var userService = require('../services/userService');
const Logger = require('../utils/Logger');
const logger = new Logger('controllers/userControllers');


exports.registerUser = (req, res) => {
    userService.registerUser(req, (status) => {
        logger.apires(Logger.formatParams('register user - response', status));
        res.json(status);
    })
}

exports.verifyUser = (req, res) => {
    userService.verifyUser(req, (status) => {
        logger.apires(Logger.formatParams('verify user - response', status));
        res.json(status);
    });
}


exports.loginUser = (req, res) => {
    userService.loginUser(req, (status) => {
        logger.apires(Logger.formatParams('login user - response', status));
        res.json(status);
    });
}

exports.logoutUser = (req, res) => {
    myAccountService.logoutUser(req, (status) => {
        logger.apires(Logger.formatParams('logout user - response', status));
        res.json(status);
    });
}

exports.saveUserProfileImage = (req, res) => {
    userService.updateProfileImg(req, (status) => {
        logger.apires(Logger.formatParams('update profile image of user - response', status));
        res.json(status);
    });
}

exports.saveUserProfile = (req, res) => {
    userService.saveUserProfile(req, (status) => {
        logger.apires(Logger.formatParams('save user profile - response', status));
        res.json(status);
    });
}

exports.userProfile = (req, res) => {
    userService.userProfile(req.authDetails, function (status) {
        logger.apires(Logger.formatParams('fetch user profile - response', status));
        res.json(status);
    })
}

exports.userHome = (req, res) => {
    userService.userHome(req, (status) => {
        logger.info('user home page data - response', status);
        res.json(status);
    });
}

exports.followThisVendor = (req, res) => {
    let args = { mobileNumber: req.authDetails.mobileNumber, followerNumber: req.body.followerNumber }
    userService.followThisVendor(args, (status) => {
        res.json(status);
    });
}

exports.followVendors = (req, res) => {
    userService.followVendors(req.authDetails, (status) => {
        res.json(status);
    });
}

exports.unFollowThisVendor = (req, res) => {
    let args = { mobileNumber: req.authDetails.mobileNumber, followerNumber: req.body.followerNumber }
    userService.unFollowThisVendor(args, (status) => {
        res.json(status);
    });
}

exports.messageVendor = (req, res) => {
    let args = {
        name: req.body.name,
        mobile: req.body.mobile,
        email: req.body.email,
        msg: req.body.msg,
        itemId: req.body.itemId,
        vendorMobileNumber: req.body.vendorMobileNumber,
        mobileNumber: req.authDetails.mobileNumber
    }
    userService.messageVendor(args, (status) => {
        res.json(status)
    })
}

exports.searchVendor = (req, res) => {
    userService.searchVendor({ location: req.body.location }, (status) => {
        res.json(status);
    })
}


exports.changePwd = (req, res) => {
    userService.changePassword(req, (status) => {
        res.json(status);
    })
}

exports.forgotPwd = (req, res) => {
    userService.forgotPassword(req, (status) => {
        res.json(status);
    })
}

exports.verifyAndUpdatePwd = (req, res) => {
    userService.verifyForgotPwd(req, (status) => {
        res.json(status);
    })
}

exports.uploadItems = (req, res) => {
    userService.uploadUserItems(req, (status) => {
        logger.apires(Logger.formatParams('add or update vendor items - response', status));
        res.json(status);
    })
}