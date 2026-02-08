var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;
var schema = new Schema({
    "vendorId": { type: mongoose.SchemaTypes.ObjectId, required: true },
    "itemName": { type: String },
    "category": { type: String },
    "itemDescription": { type: String },
    "otherImages": [],
    "mainImage": { type: String },
    "itemSizes": { type: String },
  //  "insertedDate": { type: Date, default: Date.now }
    "insertedDate": { type: Date, default: moment() },
    // Admin features - post approval and flagging
    "isAdminPost": { type: Boolean, default: false },
    "approvalStatus": { type: String, enum: ['pending', 'approved', 'rejected', 'flagged', 'hidden'], default: 'pending' },
    "rejectionReason": { type: String },
    "flaggedReason": { type: String },
    "flaggedBy": { type: mongoose.SchemaTypes.ObjectId },
    "updatedAt": { type: Date, default: moment() }
})

//schema.index({insertedDate:-1})

module.exports = mongoose.model('items', schema, 'items');