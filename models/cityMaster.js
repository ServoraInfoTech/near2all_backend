var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    "cityId" :{type:Number,unique:true}, 
    "cityName" : {type:String}, 
    "stateId" : {type:Number},
    "stateRef": {type:mongoose.SchemaTypes.ObjectId}
})

module.exports = mongoose.model('citySchema',schema,'cityMaster');