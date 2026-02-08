var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    token:{type:String,unique:true},
    ttl : {type : Date, default: Date.now,index: { expireAfterSeconds:  172800}}
})

module.exports = mongoose.model('tokens',schema,'tokens');