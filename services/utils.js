var randomString = require('randomstring');
var config = require('../config/config-' + process.env.NODE_ENV + ".js");
var masterSchema = require('../models/index')
var encryptLib = require('cryptlib');
/**
 * @description encrypt the token
 */
exports.encryptToken = (text) => {
    let shaKey = encryptLib.getHashSha256(config.secureTokenKey(), 32);
    return encryptLib.encrypt(text, shaKey, config.appIV());
}
/**
 * @description dectrypt the token
 */
exports.decryptToken = (text) => {
    let shaKey = encryptLib.getHashSha256(config.secureTokenKey(), 32);
    return encryptLib.decrypt(text, shaKey, config.appIV());
}

/**
 * @description checking the randomly created token exists in the mongodb or not
 */
exports.checkToken = (randStr, callback) => {
    let matchAggr = { $match: { token: randStr } };
    masterSchema.tokens.aggregate([
        matchAggr
    ]).exec((err, data) => {
        if (err) {

            callback({ err: err, msg: "error while fetching data", status: "Fail" });
        }
        else {
            if (data != null && data.length == 0) {
                callback({ status: "Success", msg: "token not exists" });
            }
            else {
                callback({ status: "Success", msg: "token exists" });
            }
        }
    });
}

/**
 * @description store the randomly created token in to mongodb
 */
exports.storeToken = (randStr, callback) => {
    let tokenDoc = new masterSchema.tokens();
    tokenDoc.token = randStr;
    tokenDoc.save((err, data) => {
        if (err) {
            callback(err);
        }
        else {
            callback();
        }
    });
}

/**
 * @description generates random string
 */
exports.generateRandomStr = () => {
    return randomString.generate({ length: 20 });
}

exports.encryptAppToken = (text) => {
    let shaKey = encryptLib.getHashSha256(config.appSecureToken(), 32);
    return encryptLib.encrypt(text, shaKey, config.appIV());
}

exports.decryptAppToken = (text) => {
    let shaKey = encryptLib.getHashSha256(config.appSecureToken(), 32);
    return encryptLib.decrypt(text, shaKey, config.appIV());
}

exports.getStateList = (callback) => {
    let projectAggr = { $project: { _id: 0, stateName: 1, stateId: 1 } };
    masterSchema.state.aggregate([projectAggr]).exec(
        (err, data) => {
            if (err) {
                callback({ status: "Fail", statusCode: 403, msg: "error while fetching state list " + err.msg });
            }
            else {
                callback({ status: "Success", statusCode: 200, data: data });
            }
        }
    );
}

exports.getCityList = (stateId, callback) => {
    let aggrArr = [];
    let projectAggr = { $project: { _id: 0, cityName: 1, cityId: 1 } };
    if (stateId) {
        aggrArr.push({ $match: { stateId: stateId } });
    }
    aggrArr.push(projectAggr);
    masterSchema.state.aggregate(aggrArr).exec(
        (err, data) => {
            if (err) {
                callback({ status: "Fail", statusCode: 403, msg: "error while fetching city list " + err.msg });
            }
            else {
                callback({ status: "Success", statusCode: 200, data: data });
            }
        }
    );
}