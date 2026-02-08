var helper = require('./helperService');
var config = require('../config/config-' + process.env.NODE_ENV + ".js");
let async = require('async');
let masterSchema = require('../models/index');
const Logger = require('../utils/Logger');
const logger = new Logger('services/msg91Service');

exports.sendOtp = (args, callback) => {
    let reqObj, asyncArr = [];
    let sendOtpReq = (cb) => {
        if (args.retry == false || args.retry == "false") {
            reqObj = config.msg91Config();
        }
        else {
            reqObj = config.msg91RetryOTP();
        }
        reqObj.params += args.mobileNumber;
        logger.apireq(Logger.formatParams('send otp request object', reqObj));
        cb();
    }

    let sendOTP = (cb) => {

        helper.urlRequestHelper({ uri: reqObj.uri + reqObj.params, method: "GET" }, (err, data) => {
            if (err) {
                logger.error(Logger.formatParams('send otp request error', err));
                cb({ status: "Fail", statusCode: 403, msg: "failed to send the otp", err: err });
            }
            else {
                logger.info('send otp successful');
                cb();
            }
        });
    }

    asyncArr.push(sendOtpReq);
    asyncArr.push(sendOTP);

    async.series(asyncArr, (err) => {
        if (err) {
            return callback(err);
        }
        callback({ status: "Success", statusCode: 200, msg: "otp sent successfully" });
    })
}

exports.verifyOtp = (args, callback) => {
    let reqObj, asyncArr = [];
    let constructVerifyOTPReq = (cb) => {
        reqObj = config.msg91VerifyConfig();
        reqObj.params += args.mobileNumber + "&otp=" + args.otpEntered;
        logger.apireq(Logger.formatParams('verify otp request object', reqObj));
        cb();
    }

    let verifyOTP = (cb) => {
        helper.urlRequestHelper({ uri: reqObj.uri + reqObj.params, method: "GET" }, (err, response, body) => {
            if (err) {
                logger.error(Logger.formatParams('verify otp error', err));
                cb({ status: "Fail", statusCode: 403, msg: "failed to verify the otp", err: err });
            }
            else {
                let bodyParser = JSON.parse(body);
                if (bodyParser.type == "error") {
                    logger.error(Logger.formatParams('verify otp error', bodyParser));
                    cb({ status: "Fail", statusCode: 403, msg: bodyParser.message });
                }
                else {
                    logger.info('verify otp successfull');
                    cb();
                }

            }
        });
    }
    if (config.exclusiveConfigs().skip_msg91_verification == false) {
        asyncArr.push(constructVerifyOTPReq);
        asyncArr.push(verifyOTP);
    }
    //asyncArr.push(updateUser);
    if (asyncArr.length > 0) {
        async.series(asyncArr, (err) => {
            if (err) {
                callback(err);
            }
            else {
                callback({ status: "Success", statusCode: 200, msg: "OTP verified successfully" });
            }
        });
    }
    else {
        callback({ status: "Success", statusCode: 200, msg: "OTP verified successfully" });
    }

}