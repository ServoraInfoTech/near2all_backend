var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    "countryId" :{type:Number,unique:true}, 
    "countryName" : {type:String}, 
    "countryCode" : {type:String},
    "countryAreaCode" : {type:String}
})

module.exports = mongoose.model('countrySchema',schema,'countryMaster');