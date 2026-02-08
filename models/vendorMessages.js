var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    name: { type: String },
    mobileNumber: { type: String },
    email: { type: String },
    msg: { type: String },
    itemId: { type: mongoose.SchemaTypes.ObjectId },
    isRead: { type: Boolean, default: false },
    vendorId: { type: mongoose.SchemaTypes.ObjectId, required: true },
    postedBy: { type: mongoose.SchemaTypes.ObjectId, required: true }
})

module.exports = mongoose.model('vendorMessages', schema, 'vendorMessages');