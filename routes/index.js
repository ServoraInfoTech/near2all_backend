let userRoutes = require('./myAccount/userRoutes');
let myAccountRoutes = require('./myAccount/commonRoutes');
let vendorRoutes = require('./myAccount/vendorRoutes');
let appSecurityRoutes = require('./security/appSecurityRoutes');
let adminRoutes = require('./adminRoutes');

module.exports.initialize = function(app){

  app.use('/api/security',appSecurityRoutes);
  app.use('/api/vendor',vendorRoutes);
  app.use('/api/user',userRoutes);
  app.use('/api',myAccountRoutes);
  app.use('/api/admin',adminRoutes);

}