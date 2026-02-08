var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    "stateId" :{type:Number,unique:true}, 
    "stateName" : {type:String}, 
    "countryRef": {type:mongoose.SchemaTypes.ObjectId},
    "countryId" :{type:Number}
})

module.exports = mongoose.model('stateSchema',schema,'stateMaster');