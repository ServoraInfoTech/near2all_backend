var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var schema = new Schema({
  firstName: { type: String },
  lastName: { type: String },
  customerType: { type: String },
  mobileNumber: { type: String },
  emailId: { type: String },
  address1: { type: String },
  address2: { type: String },
  address3: { type: String },
  area: { type: String },
  landMark: { type: String },
  //city: { type: Number },
  city: { type: String },
  pincode: { type: String },
  //state: { type: Number },
  state: { type: String },
  profilePic: { type: String },
  category: { type: String },
  subCategory: { type: String },
  verifiedUser: { type: Boolean },
  password: { type: String },
  webSite: { type: String },
  socialMedia: [{ type: { type: String }, link: { type: String } }],
  location: {},
  latitude: { type: String },
  longitude: { type: String },
  longitude: { type: String },
  registrationPic: { type: String },
  // Admin features - vendor approval
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'flagged', 'hidden'], default: 'pending' },
  rejectionReason: { type: String },
  flaggedReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("vendors", schema, "vendors");
