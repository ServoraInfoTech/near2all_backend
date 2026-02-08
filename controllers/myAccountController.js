var myAccountService = require('../services/myAccountService');

exports.getStateCityList = (req,res) =>{
    myAccountService.getCityStateData((status)=>{
        res.json(status);
    });
}

exports.forgotPwd = (req,res) => {
    myAccountService.forgotPassword(req,(status)=>{
        res.json(status);
    });
}