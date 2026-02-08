var masterSchema = require("../models/index");
var async = require("async");
var helper = require("./helperService");
var myaccountService = require("./myAccountService");
var msgService = require("./msg91Service");
var config = require("../config/config-dev");
var moment = require("moment");
var mongoose = require("mongoose");
var fs = require("fs");
var formidable = require("formidable");
const Logger = require("../utils/Logger");
const logger = new Logger("services/vendorService");
const appSecurity = require("../services/appSecurity");

/**
 * @description near vendors
 */
exports.getNearVendors = (args, callback) => {
  //find the nearest vendors
  let nearestVendors;

  let getNearVendorsFunc = (cb) => {
    let geoNearAggr = {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: args.userData.location
            ? args.userData.location.coordinates
            : "",
        },
        distanceField: "dist.calculated",
        maxDistance: config.nearByDistance(),
        includeLocs: "dist.location",
      },
    };
    let matchAggr = {
      $match: {
        mobileNumber: { $ne: args.userData.mobileNumber },
        verifiedUser: true,
        approvalStatus: 'approved' // Only show approved vendors
      },
    };
    let projectAggr = {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        location: 1,
        mobileNumber: 1,
        profilePic: 1,
        address1: 1,
      },
    };

    masterSchema.vendors
      .aggregate([geoNearAggr, matchAggr, projectAggr])
      .exec(function (err, result) {
        //   masterSchema.vendors.find({}).exec(function (err, result) {
        if (err || result == null) {
          cb(err);
        } else {
          nearestVendors = result;
          cb();
        }
      });
  };

  async.parallel([getNearVendorsFunc], (err) => {
    callback(nearestVendors);
  });
};

/**
 *
 * @param {Object} args
 *
 */
exports.uploadVendorItems = (req, callback) => {
  let imgPath = req.authDetails.customerType + "/items/";
  let imgStatus, _id;

  let fetchUserId = (cb) => {
    masterSchema.vendors
      .findOne({ mobileNumber: req.authDetails.mobileNumber }, { _id: 1 })
      .exec((err, data) => {
        if (err || data == null) {
          cb({
            status: "Fail",
            statusCode: 403,
            msg: "vendor does not exists",
          });
        } else {
          _id = data._id;
          cb();
        }
      });
  };
  let checkUploadLimit = (cb) => {
    const today = moment().startOf("day");

    masterSchema.items
      .count({
        vendorId: _id,
        insertedDate: {
          $gte: today.toDate(),
          $lte: moment(today).endOf("day").toDate(),
        },
      })
      .exec((err, result) => {
        if (result >= 10) {
          cb({
            status: "Fail",
            statusCode: 403,
            msg: "Vendor cannot upload more then 10 items a day",
          });
        } else {
          cb();
        }
      });
  };

  let saveItemImages = (clb2) => {
    helper.saveImages(req, imgPath, (status) => {
      imgStatus = status;
      clb2();
    });
  };
  let updateItems = (clb2) => {
    let item = new masterSchema.items();
    item.vendorId = _id;
    item.itemName = imgStatus.imageData.itemName;
    item.itemDescription = imgStatus.imageData.itemDescription;
    item.itemSizes = imgStatus.imageData.itemSizes;
    item.otherImages = imgStatus.imageData.otherImages;
    item.mainImage = imgStatus.imageData.mainImage;
    // Admin features - new posts require approval
    item.approvalStatus = 'pending';
    item.isAdminPost = false;
    item.save((err, reply) => {
      clb2();
    });
  };

  async.series(
    [fetchUserId, checkUploadLimit, saveItemImages, updateItems],
    (err) => {
      if (err) {
        callback({
          status: "Fail",
          statusCode: 403,
          err: err,
          msg: err.msg || "error while uploading items",
        });
      } else {
        callback({
          status: "Success",
          statusCode: 200,
          msg: "items successfully uploaded",
        });
      }
    }
  );
};

/**
 * @param {Object} args
 * @description returns items images and profile
 */
exports.vendorProfile = (args, callback) => {
  let vendor;
  let matchAggr = { $match: { mobileNumber: args.mobileNumber } };
  let lookupAggr = {
    $lookup: {
      from: "items",
      let: { vend: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$vendorId", "$$vend"] },
                { $eq: ["$approvalStatus", "approved"] }, // Only show approved posts
                { $eq: ["$isAdminPost", false] } // Exclude admin posts
              ]
            },
          },
        },
        { $project: { mainImage: 1, _id: 1, itemName: 1, itemDescription: 1 } },
      ],

      as: "items",
    },
  };
  let projectAggr = { $project: { _id: 1, __v: 0 } };

  masterSchema.vendors
    .aggregate([matchAggr, lookupAggr, projectAggr])
    .exec(function (err, data) {
      // callback(data[0]);
      vendor = data[0];
      async.parallel(
        [fetchFollowing, fetchFollowers],

        () => {
          callback(vendor);
        }
      );
    });

  //following and followers

  let fetchFollowing = (cb) => {
    let matchAggr = { $match: { followers: vendor._id } };
    let lookupAggr = {
      $lookup: {
        from: "vendors",
        let: { vend: "$vendorId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$_id", "$$vend"] }],
              },
            },
          },
          {
            $project: {
              profilePic: 1,
              _id: 1,
              firstName: 1,
              lastName: 1,
              mobileNumber: 1,
            },
          },
        ],

        as: "following",
      },
    };
    let unwindAggr = {
      $unwind: "$following",
    };
    masterSchema.followers
      .aggregate([matchAggr, lookupAggr, unwindAggr])
      .exec((err, data) => {
        if (err) {
          cb({
            status: "Fail",
            statusCode: 403,
            msg: "error while vendor following info",
          });
        } else {
          // following = data.length
          vendor.following = data.length;
          cb();
        }
      });
  };

  let fetchFollowers = (cb) => {
    let matchAggr = { $match: { vendorId: vendor._id } };
    let lookupAggr = {
      $lookup: {
        from: "vendors",
        let: { vend: "$vendorId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$_id", "$$vend"] }],
              },
            },
          },
          {
            $project: {
              profilePic: 1,
              _id: 1,
              firstName: 1,
              lastName: 1,
              mobileNumber: 1,
            },
          },
        ],

        as: "following",
      },
    };
    let unwindAggr = {
      $unwind: "$following",
    };
    masterSchema.followers
      .aggregate([matchAggr, lookupAggr, unwindAggr])
      .exec((err, data) => {
        if (err) {
          cb({
            status: "Fail",
            statusCode: 403,
            msg: "error while vendor following info",
          });
        } else {
          // following = data.length
          vendor.followers = data.length;
          cb();
        }
      });
  };
};

/**
 * @param {Request} req object
 */
exports.loginVendor = (req, callback) => {
  let signin = req.body.signin;
  let userData, accesstoken, vendorList, nearestVendorList, profileData;
  let signinFunc = (cb) => {
    masterSchema.vendors.aggregate(
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
            msg: "Vendor is not registered",
          });
        } else {
          userData = data[0];
          if (userData.password == signin.password) {
            profileData = constructVendorProfile(userData);
            if (
              userData.location &&
              Object.keys(userData.location).length > 0
            ) {
              profileData.needLocation = false;
            }
            cb();
          } else {
            cb({ status: "Fail", statusCode: 403, msg: "Invalid Credentials" });
          }
        }
      }
    );
  };
  let generateNewAccessToken = (cb) => {
    let args = {
      device: req.headers["device"],
      mobileNumber: signin.mobileNumber,
      firstName: userData.firstName,
      lastName: userData.lastName,
      verifiedUser: userData.verifiedUser,
      customerType: userData.customerType,
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

  let nearestVendors = function (cb) {
    if (userData.verifiedUser == true) {
      exports.getNearVendors({ userData: userData }, function (vendorList1) {
        vendorList = vendorList1;
        cb();
      });
    } else {
      cb();
    }
  };

  let vendorsItems = (cb) => {
    if (userData.verifiedUser == true) {
      exports.displayVendors(vendorList, function (list) {
        nearestVendorList = list;
        cb();
      });
    } else {
      cb();
    }
  };

  let asyncArr = [];
  asyncArr.push(signinFunc);
  asyncArr.push(generateNewAccessToken);
  asyncArr.push(sendOTPToUser);
  asyncArr.push(nearestVendors);
  asyncArr.push(vendorsItems);

  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        accesstoken: accesstoken,
        profileData: profileData,
        nearestVendors: nearestVendorList,
      });
    }
  });
};

exports.registerVendor = (req, callback) => {
  let asyncArr = [];
  let accesstoken;

  let imgPath = "vendor/register/",
    imgStatus;
  let status;

  var form = new formidable.IncomingForm();
  //form.multiples = true;
  form.keepExtensions = true;
  //form.uploadDir = __dirname + '/../../' + imgPath + '/';
  let imgPathArr = imgPath.split("/"),
    uploadDir = __dirname + "/../..";
  for (let i = 0; i < imgPathArr.length - 1; i++) {
    uploadDir = `${uploadDir}/${imgPathArr[i]}`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
  }
  form.uploadDir = uploadDir;

  form.parse(req, async function (err, fields, files) {
    if (err) {
      callback({ status: "Fail", msg: err, code: 403 });
    } else {
      /* let userExists = checkUniqueUser(fields["mobileNumber"]);

      if (userExists) {
        return callback(userExists);
      } */

      if (!config.exclusiveConfigs().skip_duplicate_user_check) {
        let userDuplicate = await checkUserDuplicateEntry(fields);

        if (userDuplicate) {
          return callback(userExists);
        }
      }
      status = await generateNewAccessToken(fields);
      if (status) {
        return callback(status);
      }

      status = await sendOTPToUser(fields["mobileNumber"]);
      if (status) {
        return callback(status);
      }

      return callback({
        status: "Success",
        statusCode: 200,
        accesstoken: accesstoken,
        customerType: "vendor",
      });
    }
  });

  let checkUniqueUser = (/* cb */ mobileNumber) => {
    let matchAggr = {
      $match: {
        mobileNumber,
        verifiedUser: true,
      },
    };
    masterSchema.uniqueUsers.aggregate([matchAggr]).exec((err, data) => {
      if (err) {
        return Promise.resolve({
          status: "Fail",
          code: 403,
          msg: JSON.stringify(err),
        });
      } else if (data && data.length > 0) {
        return Promise.resolve({
          status: "Fail",
          code: 403,
          msg: "User Already registered as " + data[0].customerType,
        });
      } else {
        //cb();
        return Promise.resolve();
      }
    });
  };

  //checking duplicate entry the db to avoid multiple registration
  let checkUserDuplicateEntry = (fields) => {
    let matchAggr = {
      $match: {
        mobileNumber: fields["mobileNumber"] /* ,verifiedUser:true */,
      },
    };
    masterSchema.vendors.aggregate([matchAggr], (err, data) => {
      if (err || (data && data.length > 0)) {
        if (data[0].verifiedUser == true) {
          /* cb({
            status: "Fail",
            code: 403,
            msg: "User already exists. Please signin",
          }); */
          return Promise.resolve({
            status: "Fail",
            code: 403,
            msg: "User already exists. Please signin",
          });
        } else {
          return Promise.resolve();
        }
      } else {
        let newUser = new masterSchema.vendors();
        newUser.verifiedUser = false;

        for (let i in fields) {
          newUser[i] = fields[i];
        }

        const user = newUser.save();

        if (user) {
          let uniqueUsers = new masterSchema.uniqueUsers();
          uniqueUsers.mobileNumber = fields["mobileNumber"];
          uniqueUsers.customerType = "vendor";
          uniqueUsers.save();
          /* callback({
          status: "Success",
          statusCode: 200,
          accesstoken: accesstoken,
          customerType: "vendor",
        }); */
          return Promise.resolve();
        } else {
          //  callback({ status: "Fail", msg: err, code: 403 });
          return Promise.resolve();
        }
      }
    });
  };

  // creating the new user and save to db
  let createNewUser = (cb) => {
    let reqObj = req.body.userSignupData;
  };

  //create new accesstoken
  let generateNewAccessToken = (fields) => {
    helper.logWriter(
      { " generateNewAccessToken fields": fields },
      "log",
      "otpDebug",
      true
    );
    return new Promise((resolve, reject) => {
      let args = {
        device: req.headers["device"],
        mobileNumber: fields["mobileNumber"],
        firstName: fields["firstName"],
        lastName: fields["lastName"],
        mobileNumber: fields["mobileNumber"],
        verifiedUser: false,
        customerType: fields["customerType"],
        time: moment().format("YYYY-MM-DDTHH:mm:ss"),
      };
      myaccountService.generateNewAccessToken(args, (status) => {
        if (status.status == "Success") {
          accesstoken = status.accesstoken;
          //cb();
          resolve();
        } else {
          // cb(status);
          resolve(status);
        }
      });
    });
  };

  //send otp to user
  let sendOTPToUser = (mobileNumber) => {
    return new Promise((resolve, reject) => {
      let args = {
        mobileNumber,
        retry: false,
      };
      msgService.sendOtp(args, (status) => {
        helper.logWriter(
          { mobileNumber: mobileNumber, status: status },
          "log",
          "otpDebug",
          true
        );
        if (status.status == "Fail") {
          //  cb(status);
          resolve(status);
        } else {
          // cb();
          resolve();
        }
      });
    });
  };
  if (false && !config.exclusiveConfigs().skip_duplicate_user_check) {
    asyncArr.push(checkUniqueUser);
    asyncArr.push(checkUserDuplicateEntry);
  } else if (false) {
    createNewUser(() => {
      generateNewAccessToken(() => {
        sendOTPToUser((err) => {
          if (err) {
            callback(err);
          } else {
            callback({
              status: "Success",
              statusCode: 200,
              accesstoken: accesstoken,
              customerType: "vendor",
            });
          }
        });
      });
    });
  }

  /*  asyncArr.push(createNewUser);
    asyncArr.push(generateNewAccessToken);
    asyncArr.push(sendOTPToUser); */

  /*   async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        accesstoken: accesstoken,
        customerType: "vendor",
      });
    }
  }); */
};

exports.verifyVendor = (req, callback) => {
  var userData,
    asyncArr = [],
    accesstoken;
  var vendorProfile;

  //verify user otp
  let verifyUserFunc = (cb) => {
    msgService.verifyOtp(req.body, (status) => {
      if (status.status == "Success") {
        console.log("otp verify success ----");
        cb();
      } else {
        console.log("error while verify otp ---", JSON.stringify(status));
        cb(status);
      }
    });
  };

  let updateVendor = (seriesCallback) => {
    async.parallel(
      [
        (cb) => {
          masterSchema.vendors.updateOne(
            { mobileNumber: req.body.mobileNumber },
            { $set: { verifiedUser: true } },
            (err, data) => {
              if (err) {
                logger.error(
                  Logger.formatParams(
                    "verify otp : error while updating user profile",
                    err
                  )
                );
                cb({
                  status: "Fail",
                  statusCode: 403,
                  msg: "error while updating user: " + err,
                });
              } else {
                logger.info("verify otp vendor update successfull");
                cb();
              }
            }
          );
        },
        (cb) => {
          masterSchema.uniqueUsers.updateOne(
            { mobileNumber: req.body.mobileNumber },
            { $set: { verifiedUser: true } },
            (err, data) => {
              if (err) {
                logger.error(
                  Logger.formatParams(
                    "verify otp : error while updating user profile",
                    err
                  )
                );
                cb({
                  status: "Fail",
                  statusCode: 403,
                  msg: "error while updating user: " + err,
                });
              } else {
                logger.info("verify otp vendor update successfull");
                cb();
              }
            }
          );
        },
      ],
      (err) => {
        if (err) seriesCallback(err);
        else seriesCallback();
      }
    );
  };

  //removing old tokens to ensure that previously created tokens should not be used again after user verified
  let removeOldTokens = (cb) => {
    console.log(
      "req.body.mobileNumber -- remove old tokens ---",
      req.body.mobileNumber
    );
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
        masterSchema.vendors
          .updateOne(
            { mobileNumber: req.body.mobileNumber },
            { $set: { verifiedUser: true } }
          )
          .exec((err, reply) => {
            console.log("update user ---", err, reply);
            cb();
          });
      });
  };

  //fetch the user profile to generate new user token for verified user
  let fetchUser = (cb) => {
    let matchQuery = { $match: { mobileNumber: req.body.mobileNumber } };
    masterSchema.vendors.aggregate([matchQuery]).exec((err, userData1) => {
      if (err) {
        console.log("fetching user profile from mongodb---", err);
        cb(err);
      } else {
        userData = userData1[0];
        vendorProfile = constructVendorProfile(userData);
        cb();
      }
    });
  };

  // generate the new user accesstoken
  let generateNewAccessToken = (cb) => {
    let args = {
      device: req.headers["device"],
      mobileNumber: userData.mobileNumber,
      firstName: userData.firstName,
      lastName: userData.lastName,
      verifiedUser: true,
      customerType: userData.customerType,
      time: moment().format("YYYY-MM-DDTHH:mm:ss"),
    };
    myaccountService.generateNewAccessToken(args, (status) => {
      if (status.status == "Success") {
        console.log("token generated -----", status);
        accesstoken = status.accesstoken;
        cb();
      } else {
        console.log("error while generating token------", status);
        cb(status);
      }
    });
  };

  asyncArr.push(verifyUserFunc);
  asyncArr.push(updateVendor);
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
        profile: vendorProfile,
      });
    }
  });
};

function constructVendorProfile(userData) {
  let profileData = {
    mobileNumber: userData.mobileNumber,
    name: userData.firstName + " " + userData.lastName,
    customerType: userData.customerType,
    following: userData.following,
    followers: userData.followers,
  };
  if (userData.profilePic) {
    profileData.profilePic = userData.profilePic;
  }
  return profileData;
}

exports.saveVendorProfile = (req, callback) => {
  masterSchema.vendors
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

exports.updateProfileImg = (req, callback) => {
  let imgPath = req.authDetails.customerType + "/profile/";
  let asyncArr = [],
    imgStatus;
  let storeImgToDisk = (cb) => {
    helper.saveImages(req, imgPath, (status) => {
      imgStatus = status;
      cb();
    });
  };

  let updateUserData = (cb) => {
    masterSchema.vendors.updateOne(
      { mobileNumber: req.authDetails.mobileNumber },
      { $set: { profilePic: imgStatus.imageData.mainImage } },
      (err, data) => {
        if (err) {
          helper.logWriter(
            { err: err, msg: "error while updating user profile image to db" },
            "myAccount-Crash",
            "MyAccount",
            true
          );
          cb();
        } else {
          cb();
        }
      }
    );
  };
  asyncArr.push(storeImgToDisk);
  asyncArr.push(updateUserData);
  async.series(asyncArr, () => {
    callback({
      status: "Success",
      statusCode: 200,
      msg: "Vendor profile image updated",
    });
  });
};

exports.displayVendors = (vendorList, callback) => {
  let nearestVendors;
  let adminPosts = [];

  // Fetch admin posts first (these appear to all users)
  let getAdminPosts = (cb) => {
    masterSchema.items
      .find({
        isAdminPost: true,
        approvalStatus: 'approved'
      }, "id mainImage itemName itemDescription isAdminPost")
      .sort({ insertedDate: -1 })
      .limit(10)
      .exec((err, data) => {
        if (err) {
          logger.error(Logger.formatParams('displayVendors: Error fetching admin posts', err));
        }
        if (data != null && data.length > 0) {
          adminPosts = data;
        }
        cb();
      });
  };

  let getVendorPosts = (cb) => {
    async.each(
      vendorList,
      (vendor, clb) => {
        masterSchema.items
          .find({
            vendorId: vendor._id,
            approvalStatus: 'approved', // Only show approved posts
            isAdminPost: false
          }, "id mainImage itemName itemDescription")
          .sort({ insertedDate: -1 })
          .limit(10)
          .exec((err, data) => {
            if (err || data == null) {
            }
            if (nearestVendors == undefined) {
              nearestVendors = {};
            }
            if (nearestVendors[vendor.mobileNumber] == undefined) {
              nearestVendors[vendor.mobileNumber] = {};
              nearestVendors[vendor.mobileNumber].name =
                vendor.firstName + " " + vendor.lastName;
              nearestVendors[vendor.mobileNumber].profilePic = vendor.profilePic;
              nearestVendors[vendor.mobileNumber].address1 = vendor.address1;
              if (data != null && data.length > 0) {
                nearestVendors[vendor.mobileNumber].items = data;
              }
            }
            clb();
          });
      },
      function () {
        cb();
      }
    );
  };

  async.series([getAdminPosts, getVendorPosts], () => {
    // Add admin posts to the result
    if (adminPosts.length > 0) {
      if (!nearestVendors) {
        nearestVendors = {};
      }
      nearestVendors._adminPosts = {
        name: "Admin",
        profilePic: "",
        items: adminPosts
      };
    }
    callback(nearestVendors);
  });
};

exports.updateVendorLocation = (args, callback) => {
  for (let i in args.coordinates) {
    args.coordinates[i] = parseFloat(args.coordinates[i]);
  }
  masterSchema.vendors
    .updateOne(
      { mobileNumber: args.mobileNumber },
      { $set: { location: { type: "Point", coordinates: args.coordinates } } }
    )
    .exec((err, data) => {
      if (err) {
        callback({
          status: "Fail",
          statusCode: 403,
          msg: "error while updating vendor location",
        });
      } else {
        callback({
          status: "Success",
          statusCode: 200,
          msg: "vendor location updated successfully",
        });
      }
    });
};

/**
 * @param {Object} req
 * @description returns vendor profile data with nearest vendors
 */
exports.vendorHome = (req, callback) => {
  let nearestVendorList, vendorList, userData, profileData, vendor, msgList;

  let fetchUserProfile = (cb) => {
    masterSchema.vendors.aggregate(
      [{ $match: { mobileNumber: req.authDetails.mobileNumber } }],
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
          userData = vendor = data[0];
          cb();
        }
      }
    );
  };

  let fetchFollowing = (cb) => {
    let matchAggr = { $match: { followers: vendor._id } };
    let lookupAggr = {
      $lookup: {
        from: "vendors",
        let: { vend: "$vendorId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$_id", "$$vend"] }],
              },
            },
          },
          {
            $project: {
              profilePic: 1,
              _id: 1,
              firstName: 1,
              lastName: 1,
              mobileNumber: 1,
            },
          },
        ],

        as: "following",
      },
    };
    let unwindAggr = {
      $unwind: "$following",
    };
    masterSchema.followers
      .aggregate([matchAggr, lookupAggr, unwindAggr])
      .exec((err, data) => {
        if (err) {
          cb({
            status: "Fail",
            statusCode: 403,
            msg: "error while vendor following info",
          });
        } else {
          // following = data.length
          userData.following = data.length;
          cb();
        }
      });
  };

  let fetchFollowers = (cb) => {
    let matchAggr = { $match: { vendorId: vendor._id } };
    let lookupAggr = {
      $lookup: {
        from: "vendors",
        let: { vend: "$vendorId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$_id", "$$vend"] }],
              },
            },
          },
          {
            $project: {
              profilePic: 1,
              _id: 1,
              firstName: 1,
              lastName: 1,
              mobileNumber: 1,
            },
          },
        ],

        as: "following",
      },
    };
    let unwindAggr = {
      $unwind: "$following",
    };
    masterSchema.followers
      .aggregate([matchAggr, lookupAggr, unwindAggr])
      .exec((err, data) => {
        if (err) {
          cb({
            status: "Fail",
            statusCode: 403,
            msg: "error while vendor following info",
          });
        } else {
          // following = data.length
          userData.followers = data.length;
          cb();
        }
      });
  };

  let nearestVendors = function (cb) {
    exports.getNearVendors({ userData: userData }, function (vendorList1) {
      vendorList = vendorList1;
      cb();
    });
  };

  let vendorsItems = (cb) => {
    exports.displayVendors(vendorList, function (list) {
      nearestVendorList = list;
      cb();
    });
  };

  let messageList = (cb) => {
    exports.showMessages(
      { mobileNumber: req.authDetails.mobileNumber },
      (status) => {
        msgList = status.msgList;
        cb();
      }
    );
  };

  let asyncArr = [];
  asyncArr.push(fetchUserProfile);
  asyncArr.push(function (cb) {
    async.parallel([fetchFollowing, fetchFollowers], () => {
      profileData = constructVendorProfile(userData);
      cb();
    });
  });

  asyncArr.push(nearestVendors);
  asyncArr.push(vendorsItems);

  //not needed in series - temporary
  asyncArr.push(messageList);
  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        profileData: profileData,
        nearestVendors: nearestVendorList,
        msgList: msgList,
      });
    }
  });
};

exports.followVendors = (args, callback) => {
  let vendor, followersList, followersListIds, suggFlwVendors;
  let fetchVendor = (cb) => {
    let matchAggr = { $match: { mobileNumber: args.mobileNumber } };
    let projectAggr = {
      $project: {
        _id: 1,
        mobileNumber: 1,
        firstName: 1,
        lastName: 1,
        profilePic: 1,
      },
    };
    masterSchema.vendors
      .aggregate([matchAggr, projectAggr])
      .exec((err, data) => {
        if (err) {
          cb({
            status: "Fail",
            statusCode: 403,
            msg: "error while retrieving vendor info",
          });
        } else {
          vendor = data[0];
          cb();
        }
      });
  };

  let fetchFollowing = (cb) => {
    let matchAggr = { $match: { followers: vendor._id } };
    let lookupAggr = {
      $lookup: {
        from: "vendors",
        let: { vend: "$vendorId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$_id", "$$vend"] }],
              },
            },
          },
          {
            $project: {
              profilePic: 1,
              _id: 1,
              firstName: 1,
              lastName: 1,
              mobileNumber: 1,
            },
          },
        ],

        as: "following",
      },
    };
    let unwindAggr = {
      $unwind: "$following",
    };
    let projectAggr = {
      $project: {
        _id: 0,
        mobileNumber: "$following.mobileNumber",
        firstName: "$following.firstName",
        lastName: "$following.lastName",
        profilePic: "$following.profilePic",
        vendId: "$following._id",
      },
    };
    masterSchema.followers
      .aggregate([matchAggr, lookupAggr, unwindAggr, projectAggr])
      .exec((err, data) => {
        if (err) {
          cb({
            status: "Fail",
            statusCode: 403,
            msg: "error while vendor following info",
          });
        } else {
          followersList = data;
          for (let i in followersList) {
            if (followersListIds == undefined) {
              followersListIds = [];
            }
            followersListIds.push(followersList[i].vendId);
          }
          if (followersListIds == undefined) {
            followersListIds = [];
          }
          followersListIds.push(vendor._id);
          cb();
        }
      });
  };

  let suggestVendorsList = (cb) => {
    let matchAggr = { $match: { _id: { $nin: followersListIds } } };
    let projectAggr = {
      $project: {
        _id: 0,
        firstName: 1,
        lastName: 1,
        mobileNumber: 1,
        profilePic: 1,
      },
    };
    masterSchema.vendors
      .aggregate([matchAggr, projectAggr])
      .exec((err, data) => {
        if (err) {
          cb({
            status: "Fail",
            statusCode: 403,
            msg: "error while vendor suggestion list info",
          });
        } else {
          suggFlwVendors = data;
          cb();
        }
      });
  };

  let asyncArr = [];
  asyncArr.push(fetchVendor);
  asyncArr.push(fetchFollowing);
  asyncArr.push(suggestVendorsList);
  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        followers: followersList,
        flwSuggest: suggFlwVendors,
      });
    }
  });
};

exports.followThisVendor = (args, callback) => {
  let vendors,
    asyncArr = [];
  let fetchVendors = (cb) => {
    let matchAggr = {
      $match: {
        mobileNumber: { $in: [args.mobileNumber, args.followerNumber] },
      },
    };
    let projectAggr = { $project: { _id: 1, mobileNumber: 1 } };
    masterSchema.vendors
      .aggregate([matchAggr, projectAggr])
      .exec((err, data) => {
        if (err || (data && data.length == 0)) {
          cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
        } else if (data && data.length == 2) {
          vendors = data;
          cb();
        } else {
          cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
        }
      });
  };
  asyncArr.push(fetchVendors);
  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      let followVendor = new masterSchema.followers();
      for (let vend of vendors) {
        if (vend.mobileNumber == args.mobileNumber) {
          followVendor.followers = vend._id;
        } else {
          followVendor.vendorId = vend._id;
        }
      }
      masterSchema.followers
        .findOne({
          vendorId: followVendor.vendorId,
          followers: followVendor.followers,
        })
        .exec((err, data) => {
          if (err) {
            return callback({
              status: "Fail",
              statusCode: 403,
              msg: "Error while updating vendors",
            });
          } else if (data != null) {
            return callback({
              status: "Fail",
              statusCode: 403,
              msg: "You are already following this vendor",
            });
          } else {
            followVendor.save((err, reply) => {
              if (err) {
                return callback({
                  status: "Fail",
                  statusCode: 403,
                  msg: "Error while updating vendors",
                });
              } else {
                return callback({
                  status: "Success",
                  statusCode: 200,
                  msg: "Followers updated Successfully",
                });
              }
            });
          }
        });
    }
  });
};

exports.unFollowThisVendor = (args, callback) => {
  let vendors,
    asyncArr = [];
  let fetchVendors = (cb) => {
    let matchAggr = {
      $match: {
        mobileNumber: { $in: [args.mobileNumber, args.followerNumber] },
      },
    };
    let projectAggr = { $project: { _id: 1, mobileNumber: 1 } };
    masterSchema.vendors
      .aggregate([matchAggr, projectAggr])
      .exec((err, data) => {
        if (err || (data && data.length == 0)) {
          cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
        } else if (data && data.length == 2) {
          vendors = data;
          cb();
        } else {
          cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
        }
      });
  };
  asyncArr.push(fetchVendors);
  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      let followVendor = {};
      for (let vend of vendors) {
        if (vend.mobileNumber == args.mobileNumber) {
          followVendor.followers = vend._id;
        } else {
          followVendor.vendorId = vend._id;
        }
      }
      masterSchema.followers
        .remove({
          vendorId: followVendor.vendorId,
          followers: followVendor.followers,
        })
        .exec((err, data) => {
          if (err) {
            return callback({
              status: "Fail",
              statusCode: 403,
              msg: "Error while un following vendors",
            });
          } else {
            return callback({
              status: "Success",
              statusCode: 200,
              msg: "You Successfully unfollowed this vendor",
            });
          }
        });
    }
  });
};

exports.searchVendor = (args, callback) => {
  //get all vendors data

  let userData, nearestVendorsList, searchList;

  let fetchVendor = (cb) => {
    masterSchema.vendors
      .findOne({ mobileNumber: args.mobileNumber })
      .exec((err, data) => {
        if (err) {
          return cb({
            status: "Fail",
            statusCode: 403,
            msg: "Error while fetching vendors " + JSON.stringify(err),
          });
        } else {
          userData = data;
          cb();
        }
      });
  };

  let getNearVendorsFunc = (cb) => {
    exports.getNearVendors({ userData: userData }, function (
      nearestVendorList
    ) {
      if (nearestVendorList != null && nearestVendorList.length != 0) {
        nearestVendorsList = nearestVendorList;
      }
      cb();
    });
  };

  let fetchVendoritems = (cb) => {
    if (
      !nearestVendorsList ||
      (nearestVendorsList && nearestVendorsList.length == 0)
    ) {
      cb();
    } else {
      let matchAggr = {
        $match: {
          mobileNumber: {
            $in: nearestVendorsList.map(function (x) {
              return x.mobileNumber;
            }),
          },
        },
      };
      let lookupAggr = {
        $lookup: {
          from: "items",
          let: { vend: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$vendorId", "$$vend"] }],
                },
              },
            },
            { $sort: { insertedDate: -1 } },
            //  { $limit: 10 },
            { $limit: 1 },
            {
              $project: {
                mainImage: 1,
                _id: 0,
                itemName: 1,
                itemDescription: 1,
              },
            },
          ],

          as: "items",
        },
      };
      let projectAggr = {
        $project: {
          _id: 0,
          profilePic: 1,
          firstName: 1,
          lastName: 1,
          mobileNumber: 1,
          items: 1,
        },
      };
      masterSchema.vendors
        .aggregate([matchAggr, lookupAggr, projectAggr])
        .exec((err, data) => {
          if (err) {
            cb({
              status: "Fail",
              statusCode: 403,
              msg: "Error retrieving  " + JSON.stringify(err),
            });
          } else {
            searchList = data;
            cb();
          }
        });
    }
  };

  let asyncArr = [];
  asyncArr.push(fetchVendor);
  asyncArr.push(getNearVendorsFunc);
  asyncArr.push(fetchVendoritems);
  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({ status: "Success", statusCode: 200, data: searchList });
    }
  });
};

exports.updateMessage = (args, callback) => {
  masterSchema.vendorMessages.update(
    { _id: args.messageId },
    { $set: { isRead: true } },
    (err, data) => {
      if (err) {
        return callback({
          status: "Fail",
          statusCode: 403,
          msg: "Error updating vendor message  " + JSON.stringify(err),
        });
      } else {
        return callback({
          status: "Success",
          statusCode: 200,
          msg: "Message updated Successfully",
        });
      }
    }
  );
};

exports.showMessages = (args, callback) => {
  let vendor, messagesList, itemList;
  let fetchVendor = (cb) => {
    let matchAggr = { $match: { mobileNumber: args.mobileNumber } };
    masterSchema.vendors.aggregate([matchAggr]).exec((err, data) => {
      if (err) {
        cb({
          status: "Fail",
          statusCode: 403,
          msg: "Error fetching vendor info  " + JSON.stringify(err),
        });
      } else {
        vendor = data[0];
        cb();
      }
    });
  };

  let fetchMessages = (cb) => {
    let matchAggr = { $match: { vendorId: vendor._id } };
    masterSchema.vendorMessages.aggregate([matchAggr]).exec((err, data) => {
      if (err) {
        cb({
          status: "Fail",
          statusCode: 403,
          msg: "Error fetching vendor messages  " + JSON.stringify(err),
        });
      } else {
        messagesList = data;
        for (let i in messagesList) {
          if (itemList == undefined) {
            itemList = {};
          }
          itemList[messagesList[i].itemId] = mongoose.Types.ObjectId(
            messagesList[i].itemId
          );
        }
        cb();
      }
    });
  };

  let fetchItemsInMessages = (cb) => {
    if (!itemList) {
      return cb({
        status: "Fail",
        statusCode: 403,
        msg: "Error fetching vendor message items  ",
      });
    }
    let matchAggr = { $match: { _id: { $in: Object.values(itemList) } } };
    masterSchema.items.aggregate([matchAggr]).exec((err, itemsData) => {
      if (err) {
        cb({
          status: "Fail",
          statusCode: 403,
          msg: "Error fetching vendor message items  " + JSON.stringify(err),
        });
      } else {
        for (let j in itemsData) {
          if (itemList[itemsData[j]._id]) {
            itemList[itemsData[j]._id] = itemsData[j];
          }
        }
        for (let k in messagesList) {
          messagesList[k].itemData = itemList[messagesList[k].itemId].mainImage;
        }
        cb();
      }
    });
  };

  let asyncArr = [];
  asyncArr.push(fetchVendor);
  asyncArr.push(fetchMessages);
  asyncArr.push(fetchItemsInMessages);

  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({ status: "Success", statusCode: 200, msgList: messagesList });
    }
  });
};

exports.changePassword = (req, callback) => {
  let userData;
  let fetchVendor = (cb) => {
    masterSchema.vendors
      .findOne({ mobileNumber: req.authDetails.mobileNumber })
      .exec((err, data) => {
        if (err) {
          cb({ status: "Fail", statusCode: 403, msg: "no vendor found" });
        } else {
          userData = data;
          cb();
        }
      });
  };

  let verifyAndUpdate = (cb) => {
    if (userData.password == req.body.currentPwd) {
      masterSchema.vendors.updateOne(
        { _id: userData._id },
        { $set: { password: req.body.newPwd } },
        (err, data) => {
          if (err) {
            cb({
              status: "Fail",
              statusCode: 403,
              msg: "error while updating the password",
            });
          } else {
            cb();
          }
        }
      );
    } else {
      cb({
        status: "Fail",
        statusCode: 403,
        msg: "Current password is not matching with database",
      });
    }
  };

  async.series([fetchVendor, verifyAndUpdate], (err) => {
    if (err) {
      return callback(err);
    } else {
      return callback({
        status: "Success",
        statusCode: 200,
        msg: "Password changed successfully",
      });
    }
  });
};

exports.forgotPassword = (req, callback) => {
  let accesstoken;
  let fetchVendor = (cb) => {
    masterSchema.vendors
      .findOne({ mobileNumber: req.body.mobileNumber })
      .exec((err, data) => {
        if (err) {
          cb({ status: "Fail", statusCode: 403, msg: "no vendor found" });
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
    myaccountService.generateNewAccessToken(args, (status) => {
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
      });
    }
  });
};

exports.verifyForgotPwd = (req, callback) => {
  let accesstoken;
  let verifyForgotPwdToken = (cb) => {
    if (req.authDetails.forgotPwd) {
      cb();
    } else {
      cb({
        status: "Fail",
        statusCode: 403,
        msg: "Unauthorized access to Change password",
      });
    }
  };

  let verifyOtpFunc = (cb) => {
    let args = {
      mobileNumber: req.authDetails.mobileNumber,
      otpEntered: req.body.otpEntered,
    };
    msgService.verifyOtp(args, (status) => {
      if (status.status == "Success") {
        console.log("otp verify success ----");
        cb();
      } else {
        console.log("error while verify otp ---", JSON.stringify(status));
        cb(status);
      }
    });
  };

  let updateVendorPwd = (cb) => {
    masterSchema.vendors
      .findOne({ mobileNumber: req.authDetails.mobileNumber })
      .exec((err, data) => {
        if (err) {
          cb({ status: "Fail", statusCode: 403, msg: "no vendor found" });
        } else {
          data.password = req.body.newPwd;
          data.save((err, reply) => {
            if (err) {
              cb({
                status: "Fail",
                statusCode: 403,
                msg: "error while updating password" + JSON.stringify(err),
              });
            } else {
              cb();
            }
          });
        }
      });
  };

  let removeOldTokens = (cb) => {
    console.log(
      "req.body.mobileNumber -- remove old tokens ---",
      req.authDetails.mobileNumber
    );
    masterSchema.tokens
      .deleteOne({ token: req.authDetails.accesstoken })
      .exec((err, data) => {
        console.log(
          "this the err and data for removing the tokens ===",
          err,
          data
        );
        cb();
      });
  };

  let generateNewAccessToken = (cb) => {
    appSecurity.tokenGeneration(req.authDetails.device, (status1) => {
      if (status1.status == "Success") {
        delete req.authDetails;
        accesstoken = status1.accesstoken;
        cb();
      } else {
        cb(status);
      }
    });
  };

  let asyncArr = [];
  asyncArr.push(verifyForgotPwdToken);
  asyncArr.push(verifyOtpFunc);
  asyncArr.push(updateVendorPwd);
  asyncArr.push(removeOldTokens);
  asyncArr.push(generateNewAccessToken);

  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        msg: "Vendor password updated successfully",
        accesstoken: accesstoken,
      });
    }
  });
};
