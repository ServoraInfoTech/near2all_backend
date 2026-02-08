var masterSchema = require("../models/index");
var async = require("async");
var helper = require("./helperService");
var myaccountService = require("./myAccountService");
var msgService = require("./msg91Service");
var config = require("../config/config-dev");
var moment = require("moment");
const Logger = require("../utils/Logger");
const logger = new Logger("services/UserService");
const appSecurity = require("./appSecurity");

/**
 * @description near vendors
 */
exports.getNearVendors = (args, callback) => {
  //find the nearest vendors
  let nearestVendors;

  let getNearVendorsFunc = (cb) => {
    let geoNearAggr = {
      $geoNear: {
        near: { type: "Point", coordinates: args.location },
        distanceField: "dist.calculated",
        maxDistance: config.nearByDistance(),
        includeLocs: "dist.location",
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
      .aggregate([geoNearAggr, projectAggr])
      .exec(function (err, result) {
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

exports.userProfile = (args, callback) => {
  let matchAggr = { $match: { mobileNumber: args.mobileNumber } };

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
        { $project: { mainImage: 1, _id: 0, itemName: 1, itemDescription: 1 } },
      ],

      as: "items",
    },
  };

  let projectAggr = { $project: { _id: 0, __v: 0 } };

  masterSchema.users
    .aggregate([matchAggr, lookupAggr, projectAggr])
    .exec(function (err, data) {
      callback(data[0]);
    });
};

/**
 *
 */
exports.loginUser = (req, callback) => {
  let signin = req.body.signin;
  let userData, accesstoken, vendorList, nearestVendorList, profileData;
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
            profileData = constructUserProfile(userData);
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
      exports.getNearVendors({ location: req.body.location }, function (
        vendorList1
      ) {
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

exports.registerUser = (req, callback) => {
  let asyncArr = [];
  let accesstoken;

  let checkUniqueUser = (cb) => {
    let matchAggr = {
      $match: { mobileNumber: req.body.userSignupData.mobileNumber },
    };
    masterSchema.uniqueUsers.aggregate([matchAggr]).exec((err, data) => {
      if (err) {
        cb({ status: "Fail", code: 403, msg: JSON.stringify(err) });
      } else if (data && data.length > 0) {
        cb({
          status: "Fail",
          code: 403,
          msg: "User Already registered as " + data[0].customerType,
        });
      } else {
        cb();
      }
    });
  };
  //checking duplicate entry the db to avoid multiple registration
  let checkUserDuplicateEntry = (cb) => {
    let matchAggr = {
      $match: { mobileNumber: req.body.userSignupData.mobileNumber },
    };
    masterSchema.users.aggregate([matchAggr], (err, data) => {
      /*  if (err || (data && data.length > 0)) {
        cb({
          status: "Fail",
          code: 403,
          msg: "User already exists. Please signin",
        });
      } else {
        cb();
      } */
      if (err || (data && data.length > 0)) {
        if (data[0].verifiedUser == true) {
          cb({
            status: "Fail",
            code: 403,
            msg: "User already exists. Please signin",
          });
        } else {
          generateNewAccessToken(() => {
            sendOTPToUser((err) => {
              if (err) {
                //callback(err);
                cb(err);
              } else {
                cb();
              }
            });
          });
        }
      } else {
        //cb();

        createNewUser(() => {
          generateNewAccessToken(() => {
            sendOTPToUser((err) => {
              if (err) {
                //callback(err);
                cb(err);
              } else {
                cb();
              }
            });
          });
        });
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
        let uniqueUsers = new masterSchema.uniqueUsers();
        uniqueUsers.mobileNumber = req.body.userSignupData.mobileNumber;
        uniqueUsers.customerType = "user";
        uniqueUsers.save();
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
    myaccountService.generateNewAccessToken(args, (status) => {
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
    asyncArr.push(checkUniqueUser);
    asyncArr.push(checkUserDuplicateEntry);
  } else {
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
  /* asyncArr.push(createNewUser);
  asyncArr.push(generateNewAccessToken);
  asyncArr.push(sendOTPToUser); */

  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        accesstoken: accesstoken,
        customerType: "user",
      });
    }
  });
};

exports.verifyUser = (req, callback) => {
  var userData,
    asyncArr = [],
    accesstoken;
  var userProfile, nearestVendorList, vendorList;

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

  let updateUser = (seriesCallback) => {
    async.parallel(
      [
        (cb) => {
          masterSchema.users.updateOne(
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
        masterSchema.users
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
    masterSchema.users.aggregate([matchQuery]).exec((err, userData1) => {
      if (err) {
        console.log("fetching user profile from mongodb---", err);
        cb(err);
      } else {
        userData = userData1[0];
        userProfile = constructUserProfile(userData);
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

  let nearestVendors = function (cb) {
    exports.getNearVendors({ location: req.body.location }, function (
      vendorList1
    ) {
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

  asyncArr.push(verifyUserFunc);
  asyncArr.push(updateUser);
  asyncArr.push(removeOldTokens);
  asyncArr.push(fetchUser);
  asyncArr.push(generateNewAccessToken);
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
        profile: userProfile,
        nearestVendors: nearestVendorList,
      });
    }
  });
};

function constructUserProfile(userData) {
  let profileData = {
    mobileNumber: userData.mobileNumber,
    name: userData.firstName + " " + userData.lastName,
    customerType: userData.customerType,
    following: userData.following,
  };
  if (userData.profilePic) {
    profileData.profilePic = userData.profilePic;
  }
  return profileData;
}

exports.saveUserProfile = (req, callback) => {
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
    masterSchema.users.updateOne(
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
      msg: "User profile image updated",
    });
  });
};

exports.displayVendors = (vendorList, callback) => {
  let nearestVendors;
  async.each(
    vendorList,
    (vendor, clb) => {
      masterSchema.items
        .find(
          { vendorId: vendor._id },
          "_id mainImage itemName itemDescription"
        )
        .sort("-insertedDate")
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
      callback(nearestVendors);
    }
  );
};

exports.userHome = (req, callback) => {
  let nearestVendorList, vendorList, userData, profileData;

  let fetchUserProfile = (cb) => {
    masterSchema.users.aggregate(
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
          userData = data[0];
          cb();
        }
      }
    );
  };

  let fetchFollowing = (cb) => {
    let matchAggr = { $match: { followers: userData._id } };
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

          profileData = constructUserProfile(userData);
          cb();
        }
      });
  };

  let nearestVendors = function (cb) {
    exports.getNearVendors({ location: req.body.location }, function (
      vendorList1
    ) {
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

  let asyncArr = [];
  asyncArr.push(fetchUserProfile);
  asyncArr.push(fetchFollowing);
  asyncArr.push(nearestVendors);
  asyncArr.push(vendorsItems);
  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        profileData: profileData,
        nearestVendors: nearestVendorList,
      });
    }
  });
};

exports.followVendors = (args, callback) => {
  let userData, followers, followersList, flwSuggest;

  let fetchUser = (cb) => {
    let matchAggr = { $match: { mobileNumber: args.mobileNumber } };
    let projectAggr = {
      $project: { _id: 1, mobileNumber: 1, location: 1, profilePic: 1 },
    };
    masterSchema.users.aggregate([matchAggr, projectAggr]).exec((err, data) => {
      if (err || (data && data.length == 0)) {
        cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
      } else {
        userData = data[0];
        cb();
      }
    });
  };

  let fetchUserFollowers = (cb) => {
    let matchAggr = { $match: { followers: userData._id } };
    let projectAggr = { $project: { vendorId: 1 } };
    let lookupAggr = {
      $lookup: {
        from: "vendors",
        let: { vend: "$followers" },
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
              firstName: 1,
              lastName: 1,
              mobileNumber: 1,
              _id: 1,
              profilePic: 1,
            },
          },
        ],

        as: "vendors",
      },
    };
    let unwindAggre = { $unwind: "$vendors" };
    let prjectAggr = {
      $project: {
        mobileNumber: "$vendors.mobileNumber",
        firstName: "$vendors.firstName",
        lastName: "$vendors.lastName",
        _id: 0,
        vendorId: "$vendors._id",
        profilePic: "$vendors.profilePic",
      },
    };
    masterSchema.followers
      .aggregate([matchAggr, projectAggr, lookupAggr, unwindAggre, prjectAggr])
      .exec((err, data) => {
        console.log("this is vendors ---- followed---", err, data);
        if (err) {
          cb({ status: "Fail", statusCode: 403, msg: "No Vendor found" });
        } else {
          if (data && data.length == 0) {
            cb();
          } else {
            followers = data;
            for (var i of data) {
              if (followersList == undefined) {
                followersList = [];
              }
              followersList.push(i.vendorId);
            }
            followersList.push(vendor._id);
            cb();
          }
        }
      });
  };

  let suggestFollowers = (cb) => {
    let matchAggr;
    if (followersList && followersList.length > 0) {
      matchAggr = {
        $match: { verifiedUser: true, _id: { $nin: followersList } },
      };
    } else {
      matchAggr = { $match: { _id: { $ne: vendor._id }, verifiedUser: true } };
    }
    let geoNearAggr = {
      $geoNear: {
        near: { type: "Point", coordinates: vendor.location.coordinates },
        distanceField: "dist.calculated",
        maxDistance: 5000,
        includeLocs: "dist.location",
      },
    };
    let projectAggr = {
      $project: { mobileNumber: 1, firstName: 1, lastName: 1, profilePic: 1 },
    };
    masterSchema.vendors
      .aggregate([geoNearAggr, matchAggr, projectAggr])
      .exec((err, data) => {
        console.log("this is vendors ---- suggest---", err, data);
        if (err) {
          cb({ status: "Fail", statusCode: 403, msg: "No Vendor found" });
        } else {
          if (data && data.length == 0) {
            cb();
          } else {
            flwSuggest = data;

            cb();
          }
        }
      });
  };

  let asyncArr = [];
  asyncArr.push(fetchUser);
  asyncArr.push(fetchUserFollowers);
  asyncArr.push(suggestFollowers);
  async.series(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      callback({
        status: "Success",
        statusCode: 200,
        followers: followers,
        flwSuggest: flwSuggest,
      });
    }
  });
};

exports.followVendors = (args, callback) => {
  let user, followersList, followersListIds, suggFlwVendors;
  let fetchUser = (cb) => {
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
    masterSchema.users.aggregate([matchAggr, projectAggr]).exec((err, data) => {
      if (err) {
        cb({
          status: "Fail",
          statusCode: 403,
          msg: "error while retrieving user info",
        });
      } else {
        user = data[0];
        cb();
      }
    });
  };

  let fetchFollowing = (cb) => {
    let matchAggr = { $match: { followers: user._id } };
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
          followersListIds.push(user._id);
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
  asyncArr.push(fetchUser);
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
  let vendor,
    asyncArr = [],
    user;
  let fetchVendors = (cb) => {
    let matchAggr = { $match: { mobileNumber: args.followerNumber } };
    let projectAggr = { $project: { _id: 1, mobileNumber: 1 } };
    masterSchema.vendors
      .aggregate([matchAggr, projectAggr])
      .exec((err, data) => {
        if (err || (data && data.length == 0)) {
          cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
        } else if (data && data.length == 1) {
          vendor = data[0];
          cb();
        } else {
          cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
        }
      });
  };
  let fetchUser = (cb) => {
    let matchAggr = { $match: { mobileNumber: args.mobileNumber } };
    let projectAggr = { $project: { _id: 1, mobileNumber: 1 } };
    masterSchema.users.aggregate([matchAggr, projectAggr]).exec((err, data) => {
      if (err || (data && data.length == 0)) {
        cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
      } else if (data && data.length == 1) {
        user = data[0];
        cb();
      } else {
        cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
      }
    });
  };
  asyncArr.push(fetchVendors);
  asyncArr.push(fetchUser);
  async.parallel(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      let followVendor = new masterSchema.followers();
      followVendor.followers = user._id;
      followVendor.vendorId = vendor._id;

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
              msg: "Error while updating users",
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
  let vendor,
    asyncArr = [],
    user;
  let fetchVendors = (cb) => {
    let matchAggr = { $match: { mobileNumber: args.followerNumber } };
    let projectAggr = { $project: { _id: 1, mobileNumber: 1 } };
    masterSchema.vendors
      .aggregate([matchAggr, projectAggr])
      .exec((err, data) => {
        if (err || (data && data.length == 0)) {
          cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
        } else if (data && data.length == 1) {
          vendor = data[0];
          cb();
        } else {
          cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
        }
      });
  };
  let fetchUser = (cb) => {
    let matchAggr = { $match: { mobileNumber: args.mobileNumber } };
    let projectAggr = { $project: { _id: 1, mobileNumber: 1 } };
    masterSchema.users.aggregate([matchAggr, projectAggr]).exec((err, data) => {
      if (err || (data && data.length == 0)) {
        cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
      } else if (data && data.length == 1) {
        user = data[0];
        cb();
      } else {
        cb({ status: "Fail", statusCode: 403, msg: "No Vendors found" });
      }
    });
  };
  asyncArr.push(fetchVendors);
  asyncArr.push(fetchUser);
  async.parallel(asyncArr, (err) => {
    if (err) {
      callback(err);
    } else {
      let followVendor = {};
      followVendor.followers = user._id;
      followVendor.vendorId = vendor._id;

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

exports.messageVendor = (args, callback) => {
  let vendor, user;
  let fetchVendor = (cb) => {
    let matchAggr = { $match: { mobileNumber: args.vendorMobileNumber } };
    masterSchema.vendors.aggregate([matchAggr]).exec((err, data) => {
      if (err) {
        return cb({
          status: "Fail",
          statusCode: 403,
          msg: "Error while fetching vendor data",
        });
      } else {
        vendor = data[0];
        cb();
      }
    });
  };
  let fetchUser = (cb) => {
    let matchAggr = { $match: { mobileNumber: args.mobileNumber } };
    masterSchema.users.aggregate([matchAggr]).exec((err, data) => {
      if (err) {
        return cb({
          status: "Fail",
          statusCode: 403,
          msg: "Error while fetching user data",
        });
      } else {
        user = data[0];
        cb();
      }
    });
  };
  async.parallel([fetchVendor, fetchUser], (err) => {
    if (err) {
      callback(err);
    } else {
      let vendMsg = new masterSchema.vendorMessages();
      vendMsg.name = args.name;
      vendMsg.mobileNumber = args.mobile;
      vendMsg.email = args.email;
      vendMsg.msg = args.msg;
      vendMsg.itemId = args.itemId;
      vendMsg.vendorId = vendor._id;
      vendMsg.postedBy = user._id;
      vendMsg.save((err, reply) => {
        if (err) {
          return callback({
            status: "Fail",
            statusCode: 403,
            msg: "Error while saving vendor message",
          });
        } else {
          return callback({
            status: "Success",
            statusCode: 200,
            msg: "Vendor will contact you shortly",
          });
        }
      });
    }
  });
};

exports.searchVendor = (args, callback) => {
  //get all vendors data

  let nearestVendorsList, searchList;

  let getNearVendorsFunc = (cb) => {
    exports.getNearVendors({ location: args.location }, function (
      nearestVendorList
    ) {
      if (nearestVendorList != null && nearestVendorList.length != 0) {
        nearestVendorsList = nearestVendorList;
      }
      cb();
    });
  };

  let fetchVendoritems = (cb) => {
    if (nearestVendorsList && nearestVendorsList.length == 0) {
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
            // { $limit: 10 },
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

exports.changePassword = (req, callback) => {
  let userData;
  let fetchUser = (cb) => {
    masterSchema.users
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
      masterSchema.users.updateOne(
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

  async.series([fetchUser, verifyAndUpdate], (err) => {
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
  let fetchUser = (cb) => {
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
  asyncArr.push(fetchUser);
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
    masterSchema.users
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
        msg: "User password updated successfully",
        accesstoken: accesstoken,
      });
    }
  });
};

/**
 *
 * @param {Object} args
 *
 */
exports.uploadUserItems = (req, callback) => {
  let imgPath = req.authDetails.customerType + "/items/";
  let imgStatus, _id;

  let fetchUserId = (cb) => {
    masterSchema.users
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
    // item.vendorId = _id;
    item.userId = _id;
    item.itemName = imgStatus.imageData.itemName;
    item.itemDescription = imgStatus.imageData.itemDescription;
    item.itemSizes = imgStatus.imageData.itemSizes;
    item.otherImages = imgStatus.imageData.otherImages;
    item.mainImage = imgStatus.imageData.mainImage;
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
          msg: "error while uploading items",
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
