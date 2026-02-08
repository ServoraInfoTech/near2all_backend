var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    "vendorId": { type: mongoose.SchemaTypes.ObjectId, required: true },
    "followers": { type: mongoose.SchemaTypes.ObjectId, required: true },
    "insertedDate": { type: Date, default: Date.now }
})

module.exports = mongoose.model('followers', schema, 'followers');