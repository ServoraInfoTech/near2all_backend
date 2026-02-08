exports.secureTokenKey = () => {
    return 'nEar@ALl7799';
}
exports.appIV = () => {
    return 'lly4I8pmeAwsbjSw'
}


exports.appSecureToken = () => {
    return 'nEar@A#$Ll5678';
}

//sha 256 - near9291@all - anil1234
exports.getApiKey = () => {
    return "b825d14f6038bf9de384b0019ff34b6387430f6d811ae6f433de27c29d7c1ff5";
}

exports.msg91Config = () => {
    return {
        uri: "https://control.msg91.com/api/sendotp.php?",
        params: "authkey=" + exports.msg91AuthKey() + "&sender=NRTALL&message=Your verification code is %23%23OTP%23%23&mobile="
    }
}

exports.msg91VerifyConfig = () => {
    return {
        uri: "https://control.msg91.com/api/verifyRequestOTP.php?",
        params: "authkey=" + exports.msg91AuthKey() + "&mobile="
    }
}

exports.dbUrl = () => {
    console.log("i am in production");
    return 'mongodb+srv://swarnadunaboina_db_user:92W8xFS4YRfBgYHw@cluster0.h4rx2gg.mongodb.net/?appName=near2all';
}
exports.msg91RetryOTP = () => {
    return {
        uri: "https://control.msg91.com/api/retryotp.php?",
        params: "authkey=" + exports.msg91AuthKey() + "&mobile="
    }
}

exports.msg91AuthKey = () => {
    return "295413AZGwc2h4PC4w5d885191";
}

exports.exclusiveConfigs = () => {
    return {
        "enable_time_diff_tokens": true,
        "skip_duplicate_user_check": false,
        "skip_msg91_verification": false
    };
}

exports.nearByDistance = () => {
    return 5000;
}

exports.serverUrl = () => {
    return "http://31.220.59.107:3000/";
}

// Admin Configuration
exports.adminConfig = () => {
    return {
        "registrationCode": "NEAR2ALL-ADMIN-2024",
        "role": {
            "ADMIN": "admin",
            "USER": "user",
            "VENDOR": "vendor"
        },
        "approvalStatus": {
            "PENDING": "pending",
            "APPROVED": "approved",
            "REJECTED": "rejected",
            "FLAGGED": "flagged",
            "HIDDEN": "hidden"
        }
    };
}