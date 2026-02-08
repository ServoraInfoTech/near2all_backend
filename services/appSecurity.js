var utils = require('../services/utils');
var async = require('async');
var moment = require('moment');
var config = require('../config/config-dev');
const Logger = require('../utils/Logger');
const logger = new Logger('services/appSecurity');

exports.tokenGeneration = (device, callback) => {
    let asyncArr = [];
    let accesstoken;
    let randStr;
    let storeRandomString = (cb) => {
        randStr = utils.generateRandomStr() + "-" + device;
        let checktoken = (clb) => {
            utils.checkToken(randStr, (status) => {
                if (status.status == "Fail") {
                    logger.error(Logger.formatParams("checkToken method", status));
                    clb(status);
                }
                else if (status.status == "Success" && status.msg == "token exists") {
                    logger.error(Logger.formatParams("checkToken method", status));
                    clb({ msg: 'duplicate entry in the data base', statusCode: '403' });
                }
                else {
                    logger.info("checkToken successfull");
                    clb();
                }
            });
        }

        let storeToken = (clb) => {
            utils.storeToken(randStr, (err) => {
                if (err) {
                    logger.error(Logger.formatParams("storeToken method", err));
                    clb(err);
                }
                else {
                    logger.info("storeToken successfull");
                    clb();
                }
            });
        }

        async.series([checktoken, storeToken], (err) => {
            if (err) {
                cb(err);
            }
            else {
                cb();
            }
        });

    }

    let encryptToken = (cb) => {
        let encryptedToken = utils.encryptToken(randStr);
        let tokenWithTime = encryptedToken + "#" + moment().format("YYYY-MM-DDTHH:mm:ss");
        accesstoken = utils.encryptAppToken(tokenWithTime);
        logger.info("encryptToken successfull");
        cb();
    }

    asyncArr.push(storeRandomString);
    asyncArr.push(encryptToken);

    async.series(asyncArr, (err) => {
        if (err) {
            callback({ status: "Fail", statusCode: 403, err: "unauthorized access" });
        }
        else {
            callback({ status: "Success", statusCode: 200, accesstoken: accesstoken });
        }
    });
}

exports.tokenVerify = (req, callback) => {
    let decryptValue, asyncArr = [];
    let verifyHeaders = (cb) => {
        if (req.headers.accesstoken == undefined) {
            cb({ status: 403, msg: "Access denied" });
        }
        else if (req.headers.device == undefined) {
            cb({ status: 403, msg: "Access denied" });
        }
        else {
            cb();
        }
    }

    let decryptAppToken = (cb) => {
        let decryptedValue ;

        try {
            decryptedValue = utils.decryptAppToken(req.headers.accesstoken);
        }
        catch(err){
            cb({ status: 403, msg: "token invalid" });
        }

        let tokenSplit = decryptedValue.split('#');
        logger.info(Logger.formatParams("after decryptying token from app ---", tokenSplit));

        if (tokenSplit && tokenSplit.length != 2) {
            logger.error(Logger.formatParams("tokenVerify: decryptAppToken invalid", decryptAppToken));
            cb({ status: 403, msg: "Access denied" });
        }
        else {
            let timer = moment.parseZone(tokenSplit[1]);
            let currentTime = moment().parseZone();
            let offset = currentTime.utcOffset();
            currentTime = currentTime.add(offset, 'minute');
            console.log(currentTime.diff(timer, 'seconds'), timer.toISOString(), currentTime.toISOString());
            if (config.exclusiveConfigs().enable_time_diff_tokens == true && currentTime.diff(timer, 'seconds') > 300) {
                logger.error(Logger.formatParams('invalid token time---', decryptedValue));
                cb({ status: "Fail", statusCode: 403, msg: "Unauthorized access" });
            }
            else {
                decryptValue = utils.decryptToken(tokenSplit[0]);
                logger.info('token valid');
                cb();
            }
        }
    }

    let validateToken = (cb) => {
        utils.checkToken(decryptValue, (status) => {
            if (status.status == 'Success' && status.msg == 'token exists') {
                let authDetailsSplit = decryptValue.split('-');
                if (authDetailsSplit.length >= 7) {
                    let authDetails = {
                        device: authDetailsSplit[1],
                        mobileNumber: authDetailsSplit[2],
                        name: authDetailsSplit[3] + " " + authDetailsSplit[4],
                        verifiedUser: authDetailsSplit[5],
                        customerType: authDetailsSplit[6],
                        accesstoken: decryptValue
                    }
                    req.authDetails = authDetails;
                    // Check for optional forgotPwd flag (7th index without time, or 8th with time)
                    let forgotPwdIndex = authDetailsSplit.length > 7 ? 8 : 7;
                    if (authDetailsSplit[forgotPwdIndex] && req.originalUrl.indexOf('updateForgotPwd') > -1) {
                        req.authDetails.forgotPwd = authDetailsSplit[forgotPwdIndex];
                    }
                }
                logger.info('token verified successfully');
                cb();
            }
            else {
                logger.error(Logger.formatParams('not a valid token', decryptValue));
                cb({ status: 403, msg: "Access denied" });
            }
        });
    }
    asyncArr.push(verifyHeaders)
    asyncArr.push(decryptAppToken);
    asyncArr.push(validateToken);

    async.series(asyncArr, (err) => {
        if (err) {
            callback(err);
        }
        else {
            callback();
        }
    });
}