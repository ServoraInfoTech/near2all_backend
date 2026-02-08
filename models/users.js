var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var schema = new Schema({
  firstName: { type: String },
  lastName: { type: String },
  customerType: { type: String },
  mobileNumber: { type: String },
  emailId: { type: String },
  address: { type: String },
  //city:{type:Number},
  city: { type: String },
  pincode: { type: String },
  //state:{type:Number},
  state: { type: String },
  profilePic: { type: String },
  verifiedUser: { type: Boolean },
  password: { type: String },
  // Admin features
  role: { type: String, enum: ['user', 'vendor', 'admin'], default: 'user' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("users", schema, "users");
