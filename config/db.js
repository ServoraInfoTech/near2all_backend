// Bring Mongoose into the app 
var mongoose = require( 'mongoose' ); 
var config=require("./config-"+process.env.NODE_ENV+".js");

// Build the connection string 

/**
 *Set MongoDB URL based on Environment
 */

/**
 *Set MongoDB URL based on Environment
 */
var DBURI = config.dbUrl();


// Create the database connection 
mongoose.connect(DBURI,function(error){
	if(error){
		console.log(error);
	}
}); 

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {  
  console.log('Mongoose default connection open to ' + DBURI);
}); 

// If the connection throws an error
mongoose.connection.on('error',function (err) {  
  console.log('Mongoose default connection error: ' + err);
}); 

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {  
  console.log('Mongoose default connection disconnected'); 
});

// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function() {  
  mongoose.connection.close(function () { 
    console.log('Mongoose default connection disconnected through app termination'); 
    process.exit(0); 
  }); 
}); 