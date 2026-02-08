var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    mobileNumber: { type: String, unique: true },
    customerType: { type: String }
})

module.exports = mongoose.model('uniqueUsers', schema, 'uniqueUsers');