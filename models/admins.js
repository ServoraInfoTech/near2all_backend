var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var schema = new Schema({
  userId: { type: mongoose.SchemaTypes.ObjectId, ref: 'users', required: true },
  adminCode: { type: String },
  isActive: { type: Boolean, default: true },
  permissions: [{
    type: { type: String }, // e.g., 'approve_vendors', 'approve_posts', 'moderate_content'
    granted: { type: Boolean, default: true }
  }],
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("admins", schema, "admins");
