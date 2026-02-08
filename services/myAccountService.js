var masterSchema = require("../models/index");
var async = require("async");
var utils = require("./utils");
var msgService = require("./msg91Service");
var lodash = require("lodash");
var moment = require("moment");
var config = require("../config/config-dev");
var helper = require("../services/helperService");
var appSecurity = require("../services/appSecurity");

/**
 * @description registering user and send verification otp to user
 *               and save the user details to db
 */
exports.registerUser = (req, callback) => {
  let asyncArr = [];
  let accesstoken;

  //checking duplicate entry the db to avoid multiple registration
  let checkUserDuplicateEntry = (cb) => {
    let matchAggr = {
      $match: { mobileNumber: req.body.userSignupData.mobileNumber },
    };
    masterSchema.users.aggregate([matchAggr], (err, data) => {
      if (err || (data && data.length > 0)) {
        cb({
          status: "Fail",
          code: 403,
          msg: "User already exists. Please signin",
        });
      } else {
        cb();
      }
    });
  };

  // creating the new user and save to db
  let createNewUser = (cb) => {
    let reqObj = req.body.userSignupData;
    let newUser = new masterSchema.users(reqObj);
    newUser.verifiedUser = false;
    newUser.save((err, data) => {
      if (err) {
        cb({ status: "Fail", msg: err, code: 403 });
      } else {
        cb();
      }
    });
  };

  //create new accesstoken
  let generateNewAccessToken = (cb) => {
    let args = {
      device: req.headers["device"],
      mobileNumber: req.body.userSignupData.mobileNumber,
      firstName: req.body.userSignupData.firstName,
      lastName: req.body.userSignupData.lastName,
      verifiedUser: false,
      customerType: req.body.userSignupData.customerType,
      time: moment().format("YYYY-MM-DDTHH:mm:ss"),
    };
    exports.generateNewAccessToken(args, (status) => {
      if (status.status == "Success") {
        accesstoken = status.accesstoken;
        cb();
      } else {
        cb(status);
      }
    });
  };

  //send otp to user
  let sendOTPToUser = (cb) => {
    let args = {
      mobileNumber: req.body.userSignupData.mobileNumber,
      retry: false,
    };
    msgService.sendOtp(args, (status) => {
      if (status.status == "Fail") {
        cb(status);
      } else {
        cb();
      }
    });
  };
  if (!config.exclusiveConfigs().skip_duplicate_user_check) {
    asyncArr.push(checkUserDuplicateEntry);
  }
  asyncArr.push(createNewUser);
  asyncArr.push(generateNewAccessToken);
  asyncArr.push(sendOTPToUser);

  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        accesstoken: accesstoken,
      });
    }
  });
};

/**
 * @description verifying the user with otp entered
 */
exports.verifyUser = (req, callback) => {
  var userData,
    asyncArr = [],
    accesstoken;

  //verify user otp
  let verifyUserFunc = (cb) => {
    let args = {
      mobileNumber: req.body.mobileNumber,
      otpEntered: req.body.otpEntered,
    };
    msgService.verifyOtp(args, (status) => {
      if (status.status == "Success") {
        cb();
      } else {
        cb(status);
      }
    });
  };

  //removing old tokens to ensure that previously created tokens should not be used again after user verified
  let removeOldTokens = (cb) => {
    masterSchema.tokens
      .deleteOne({
        token: new RegExp(".*" + req.body.mobileNumber + ".*", "i"),
      })
      .exec((err, data) => {
        console.log(
          "this the err and data for removing the tokens ===",
          err,
          data
        );
        cb();
      });
  };

  //fetch the user profile to generate new user token for verified user
  let fetchUser = (cb) => {
    let matchQuery = { $match: { mobileNumber: req.body.mobileNumber } };
    masterSchema.users.aggregate([matchQuery]).exec((err, userData1) => {
      if (err) {
        cb(err);
      } else {
        userData = userData1[0];
        cb();
      }
    });
  };

  // generate the new user accesstoken
  let generateNewAccessToken = (cb) => {
    let args = {
      device: req.headers["device"],
      mobileNumber: userData.mobileNumber,
      firstName: userDataa.firstName,
      lastName: userData.lastName,
      verifiedUser: true,
      customerType: userData.customerType,
      time: moment().format("YYYY-MM-DDTHH:mm:ss"),
    };
    exports.generateNewAccessToken(args, (status) => {
      if (status.status == "Success") {
        accesstoken = status.accesstoken;
        cb();
      } else {
        cb(status);
      }
    });
  };

  asyncArr.push(verifyUserFunc);
  asyncArr.push(removeOldTokens);
  asyncArr.push(fetchUser);
  asyncArr.push(generateNewAccessToken);
  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        accesstoken: accesstoken,
      });
    }
  });
};

/**
 * @description resend otp service which additional services
 */
exports.resendOTP = (req, callback) => {
  let args = {
    mobileNumber: req.body.mobileNumber,
    retry: true,
  };
  msgService.sendOtp(args, (status) => {
    callback(status);
  });
};

/**
 * @description login user into system
 */
exports.loginUser = (req, callback) => {
  let signin = req.body.signin;
  let userData, accesstoken;
  //verify user mobile number in the datebase
  let signinFunc = (cb) => {
    masterSchema.users.aggregate(
      [{ $match: { mobileNumber: signin.mobileNumber } }],
      function (err, data) {
        if (
          err ||
          (data && data.length == 0) ||
          data == null ||
          data == undefined
        ) {
          cb({
            status: "Fail",
            statusCode: 403,
            msg: "User is not registered",
          });
        } else {
          userData = data[0];
          if (userData.password == signin.password) {
            cb();
          } else {
            cb({ status: "Fail", statusCode: 403, msg: "Invalid Credentials" });
          }
        }
      }
    );
  };

  //generate new accesstoken
  let generateNewAccessToken = (cb) => {
    let args = {
      device: req.headers["device"],
      mobileNumber: signin.mobileNumber,
      firstName: userDataa.firstName,
      lastName: userData.lastName,
      verifiedUser: userData.verifiedUser,
      customerType: userData.customerType,
      time: moment().format("YYYY-MM-DDTHH:mm:ss"),
    };
    exports.generateNewAccessToken(args, (status) => {
      if (status.status == "Success") {
        accesstoken = status.accesstoken;
        cb();
      } else {
        cb(status);
      }
    });
  };

  let sendOTPToUser = (cb) => {
    if (userData.verifiedUser) {
      cb();
    } else {
      let args = {
        mobileNumber: req.body.signin.mobileNumber,
        retry: false,
      };
      msgService.sendOtp(args, (status) => {
        if (status.status == "Fail") {
          cb(status);
        } else {
          cb({
            statusCode: 302,
            status: "Success",
            msg:
              "Your are not verified. Please enter the OTP received to your mobile number",
            accesstoken: accesstoken,
          });
        }
      });
    }
  };
  let asyncArr = [];
  asyncArr.push(signinFunc);
  asyncArr.push(generateNewAccessToken);
  asyncArr.push(sendOTPToUser);
  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        accesstoken: accesstoken,
      });
    }
  });
};

/**
 * @description get city country state list
 */
exports.getCityStateData = (callback) => {
  masterSchema.city
    .aggregate([
      // Stage 1
      {
        $lookup: {
          from: "stateMaster",
          localField: "stateId",
          foreignField: "stateId",
          as: "state",
        },
      },

      // Stage 2
      {
        $unwind: {
          path: "$state",
          preserveNullAndEmptyArrays: true, // optional
        },
      },

      // Stage 3
      {
        $lookup: {
          from: "countryMaster",
          localField: "state.countryId",
          foreignField: "countryId",
          as: "country",
        },
      },

      // Stage 4
      {
        $unwind: {
          path: "$country",
          preserveNullAndEmptyArrays: true, // optional
        },
      },
    ])
    .exec((err, data) => {
      let stateCityList = {};
      lodash.forEach(data, (cityObj, index) => {
        if (stateCityList[cityObj.country.countryId] == undefined) {
          stateCityList[cityObj.country.countryId] = {};
          stateCityList[cityObj.country.countryId].countryId =
            cityObj.country.countryId;
          stateCityList[cityObj.country.countryId].countryName =
            cityObj.country.countryName;

          stateCityList[cityObj.country.countryId].states = {};
          stateCityList[cityObj.country.countryId].states[
            cityObj.state.stateId
          ] = {};
          stateCityList[cityObj.country.countryId].states[
            cityObj.state.stateId
          ].stateId = cityObj.state.stateId;
          stateCityList[cityObj.country.countryId].states[
            cityObj.state.stateId
          ].stateName = cityObj.state.stateName;
          stateCityList[cityObj.country.countryId].states[
            cityObj.state.stateId
          ].cities = {};
        }
        if (
          stateCityList[cityObj.country.countryId].states[
            cityObj.state.stateId
          ] == undefined
        ) {
          stateCityList[cityObj.country.countryId].states[
            cityObj.state.stateId
          ] = {};
          stateCityList[cityObj.country.countryId].states[
            cityObj.state.stateId
          ].stateId = cityObj.state.stateId;
          stateCityList[cityObj.country.countryId].states[
            cityObj.state.stateId
          ].stateName = cityObj.state.stateName;
          stateCityList[cityObj.country.countryId].states[
            cityObj.state.stateId
          ].cities = {};
        }
        stateCityList[cityObj.country.countryId].states[
          cityObj.state.stateId
        ].cities[cityObj.cityId] = {};
        stateCityList[cityObj.country.countryId].states[
          cityObj.state.stateId
        ].cities[cityObj.cityId].cityId = cityObj.cityId;
        stateCityList[cityObj.country.countryId].states[
          cityObj.state.stateId
        ].cities[cityObj.cityId].cityName = cityObj.cityName;
      });
      callback({ status: "Success", statusCode: 200, data: stateCityList });
    });
};

/**
 * @description remove token and generate new access token
 *
 */
exports.logoutUser = (req, callback) => {
  let status,
    asyncArr = [];
  let deleteToken = (cb) => {
    masterSchema.tokens
      .deleteOne({ token: req.authDetails.accesstoken })
      .exec((err, data) => {
        if (err) {
          helper.logWriter(
            { accesstoken: req.authDetails.accesstoken, err: err },
            "myAccount-Crash",
            "MyAccount",
            true
          );
          cb({ status: "Fail", statusCode: 403, err: err });
        } else {
          cb();
        }
      });
  };

  let generateNewAccessToken = (cb) => {
    appSecurity.tokenGeneration(req.authDetails.device, (status1) => {
      if (status1.status == "Success") {
        delete req.authDetails;
        status = status1;
        cb();
      } else {
        cb(status);
      }
    });
  };
  asyncArr.push(deleteToken);
  asyncArr.push(generateNewAccessToken);
  async.series(asyncArr, (err) => {
    err ? callback(err) : callback(status);
  });
};

exports.updateProfileImg = (req, callback) => {
  let imgPath = req.authDetails.customerType + "/profile/";
  let asyncArr = [],
    imgStatus;
  let storeImgToDisk = (cb) => {
    helper.saveImages(req.body.imgData, imgPath, (status) => {
      imgStatus = status;
      cb();
    });
  };

  let updateUserData = (cb) => {
    //svImg:successImages,failImg:failedImages
    lodash.eachSeries(
      imgStatus.svImg,
      (imgPath, clb) => {
        masterSchema.users.updateOne(
          { mobileNumber: req.authDetails.mobileNumber },
          { $set: { profilePic: imgPath.data } },
          (err, data) => {
            if (err) {
              helper.logWriter(
                {
                  err: err,
                  msg: "error while updating user profile image to db",
                },
                "myAccount-Crash",
                "MyAccount",
                true
              );
              clb();
            } else {
              clb();
            }
          }
        );
      },
      () => {
        cb();
      }
    );
  };
  asyncArr.push(storeImgToDisk);
  asyncArr.push(updateUserData);
  async.series(asyncArr, () => {
    callback({
      status: "Success",
      statusCode: 200,
      failImg: imgStatus.failImg,
    });
  });
};

exports.generateNewAccessToken = (args, callback) => {
  let accesstoken;
  let randStr =
    utils.generateRandomStr() +
    "-" +
    args.device +
    "-" +
    args.mobileNumber +
    "-" +
    args.firstName +
    "-" +
    args.lastName +
    "-" +
    args.verifiedUser +
    "-" +
    args.customerType;
  if (args.forgotPwd) {
    randStr += "-" + args.forgotPwd;
  }
  if (args.time) {
    randStr += "-" + args.time;
  }
  let checktoken = (clb) => {
    utils.checkToken(randStr, (status) => {
      if (status.status == "Fail" || status.msg == "token exists") {
        status.statusCode = 403;
        clb(status);
      } else {
        clb();
      }
    });
  };

  let storeToken = (clb) => {
    console.log(randStr);
    utils.storeToken(randStr, (err) => {
      console.log(randStr);
      if (err) {
        clb(err);
      } else {
        console.log(randStr);
        clb();
      }
    });
  };
  let encryptToken = (clb) => {
    console.log(randStr);
    // Double encryption: first with secureTokenKey, then wrap with time and encrypt with appSecureToken
    let encryptedToken = utils.encryptToken(randStr);
    let tokenWithTime = encryptedToken + "#" + (args.time || moment().format("YYYY-MM-DDTHH:mm:ss"));
    accesstoken = utils.encryptAppToken(tokenWithTime);
    clb();
  };

  async.series([checktoken, storeToken, encryptToken], (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        accesstoken: accesstoken,
      });
    }
  });
};

exports.updateProfile = (req, callback) => {
  masterSchema.users
    .findOne({ mobileNumber: req.authDetails.mobileNumber })
    .exec((err, data) => {
      if (err) {
        helper.logWriter(
          {
            msg:
              "failed to update the user profile with accesstoken" +
              req.authDetails.accesstoken,
            err: err,
          },
          "myAccount-Crash",
          "MyAccount"
        );
        callback({
          status: "Fail",
          statusCode: 403,
          msg: "failed to update the user.",
          err: err,
        });
      } else {
        let userData = req.body.userData;
        for (var i in userData) {
          data[i] = userData[i];
        }
        data.save(function (err, data) {
          callback({
            status: "Success",
            statusCode: 200,
            msg: req.authDetails.customerType + " profile updated successfully",
          });
        });
      }
    });
};

exports.forgotPassword = (req, callback) => {
  let accesstoken, userData;
  let fetchVendor = (cb) => {
    masterSchema.vendors
      .findOne({ mobileNumber: req.body.mobileNumber })
      .exec((err, data) => {
        if (err || !data) {
          masterSchema.users
            .findOne({ mobileNumber: req.body.mobileNumber })
            .exec((err, data) => {
              if (err) {
                cb({ status: "Fail", statusCode: 403, msg: "no vendor found" });
              } else {
                userData = data;
                cb();
              }
            });
          // cb({ status: "Fail", statusCode: 403, msg: "no vendor found" })
        } else {
          userData = data;
          cb();
        }
      });
  };

  let generateNewAccessToken = (cb) => {
    let args = {
      device: req.headers["device"],
      mobileNumber: userData.mobileNumber,
      firstName: userData.firstName,
      lastName: userData.lastName,
      verifiedUser: userData.verifiedUser,
      customerType: userData.customerType,
      time: moment().format("YYYY-MM-DDTHH:mm:ss"),
      forgotPwd: true,
    };
    exports.generateNewAccessToken(args, (status) => {
      if (status.status == "Success") {
        accesstoken = status.accesstoken;
        cb();
      } else {
        cb(status);
      }
    });
  };

  let sendOTPToUser = (cb) => {
    let args = {
      mobileNumber: userData.mobileNumber,
      retry: false,
    };
    msgService.sendOtp(args, (status) => {
      if (status.status == "Fail") {
        cb(status);
      } else {
        cb();
      }
    });
  };

  let asyncArr = [];
  asyncArr.push(fetchVendor);
  asyncArr.push(sendOTPToUser);
  asyncArr.push(generateNewAccessToken);

  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        statusCode: 200,
        status: "Success",
        msg: "OTP send successfully",
        accesstoken: accesstoken,
        customerType: userData.customerType,
      });
    }
  });
};
