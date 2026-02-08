var appSecurityService = require('../services/appSecurity');
const config = require('../config/config-' + process.env.NODE_ENV + ".js");
const Logger = require('../utils/Logger');
const logger = new Logger('controllers/appSecurityController');
exports.tokenVerify = (req, res, next) => {
    logger.apireq(Logger.formatParams("Request -- body : ", req.body, "-- headers --", req.headers));
    if (req.originalUrl.indexOf('api/security/tokenGeneration') > -1) {
        logger.info('skip token verification for tokenGeneration');
        return next();
    }
    else if (req.originalUrl.indexOf('api/admin/register') > -1) {
        logger.info('skip token verification for admin registration');
        return next();
    }
    else {
        appSecurityService.tokenVerify(req, (err) => {
            if (err) {
                logger.error(Logger.formatParams('error while token verification', err));
                res.json(err);
            }
            else {
                logger.info('token verification is success');
                next();
            }
        })
    }

}
/**
 * @description token generation first service to hit
 */
exports.tokenGeneration = (req, res) => {
    if (req.body.apiKey == config.getApiKey()) {
        appSecurityService.tokenGeneration(req.headers['device'], (status) => {
            res.json(status);
        });
    }
    else {
        logger.error("Unauthozied access. No Api key in request");
        res.json({ status: "Fail", statusCode: 403, err: "unauthorized access" });
    }
}