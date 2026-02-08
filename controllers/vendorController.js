var myAccountService = require('../services/myAccountService');
var vendorService = require('../services/vendorService');
const Logger = require('../utils/Logger');
const logger = new Logger('controllers/vendorController');


exports.registerVendor = (req, res) => {
    vendorService.registerVendor(req, (status) => {
        logger.apires(Logger.formatParams('register vendor - response', status));
        res.json(status);
    })
}

exports.verifyVendor = (req, res) => {
    vendorService.verifyVendor(req, (status) => {
        logger.apires(Logger.formatParams('verify vendor - response', status));
        res.json(status);
    });
}

exports.resendOTP = (req, res) => {
    myAccountService.resendOTP(req, (status) => {
        res.json(status);
    });
}

exports.loginVendor = (req, res) => {
    vendorService.loginVendor(req, (status) => {
        logger.apires(Logger.formatParams('login vendor - response', status));
        res.json(status);
    });
}

exports.logoutVendor = (req, res) => {
    myAccountService.logoutUser(req, (status) => {
        logger.apires(Logger.formatParams('logout vendor - response', status));
        res.json(status);
    });
}

exports.saveVendorProfileImage = (req, res) => {
    vendorService.updateProfileImg(req, (status) => {
        logger.apires(Logger.formatParams('update vendor profile image - response', status));
        res.json(status);
    });
}

exports.saveVendorProfile = (req, res) => {
    vendorService.saveVendorProfile(req, (status) => {
        logger.apires(Logger.formatParams('save vendor profile - response', status));
        res.json(status);
    });
}

exports.uploadItems = (req, res) => {
    vendorService.uploadVendorItems(req, (status) => {
        logger.apires(Logger.formatParams('add or update vendor items - response', status));
        res.json(status);
    })
}

exports.vendorProfile = (req, res) => {
    let args;
    if (req.body && Object.keys(req.body).length > 0) {
        args = req.body;
    }
    else {
        args = req.authDetails;
    }
    vendorService.vendorProfile(args, function (status) {
        logger.apires(Logger.formatParams('fetch vendor profile - response', status));
        res.json(status);
    })
}

exports.updateVendorLocation = (req, res) => {
    vendorService.updateVendorLocation({ mobileNumber: req.authDetails.mobileNumber, coordinates: req.body.coordinates }, function (status) {
        logger.apires(Logger.formatParams('udpate vendor location - response', status));
        res.json(status);
    });
}

exports.vendorHome = (req, res) => {
    vendorService.vendorHome(req, function (status) {
        logger.apires('vendor home');
        res.json(status);
    });
}

exports.followVendors = (req, res) => {
    vendorService.followVendors(req.authDetails, (status) => {
        res.json(status);
    });
}

exports.followThisVendor = (req, res) => {
    let args = { mobileNumber: req.authDetails.mobileNumber, followerNumber: req.body.followerNumber }
    vendorService.followThisVendor(args, (status) => {
        res.json(status);
    });
}

exports.unFollowThisVendor = (req, res) => {
    let args = { mobileNumber: req.authDetails.mobileNumber, followerNumber: req.body.followerNumber }
    vendorService.unFollowThisVendor(args, (status) => {
        res.json(status);
    });
}

exports.searchVendor = (req, res) => {
    vendorService.searchVendor(req.authDetails, (status) => {
        logger.apires(Logger.formatParams('search vendor - response', status));
        res.json(status);
    })
}

exports.showMessages = (req, res) => {
    vendorService.showMessages({ mobileNumber: req.authDetails.mobileNumber }, (status) => {
        res.json(status);
    })
}

exports.updateMessage = (req, res) => {
    vendorService.updateMessage({ messageId: req.body.messageId }, (status) => {
        res.json(status);
    })
}

exports.changePwd = (req, res) => {
    vendorService.changePassword(req, (status) => {
        res.json(status);
    })
}

exports.forgotPwd = (req, res) => {
    vendorService.forgotPassword(req, (status) => {
        res.json(status);
    })
}

exports.verifyAndUpdatePwd = (req, res) => {
    vendorService.verifyForgotPwd(req, (status) => {
        res.json(status);
    })
}