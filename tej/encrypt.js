var path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = "prod";

var utils = require('../services/utils');

console.log(new Date());
let text =  `${process.argv[2]}#${new Date()}`;
console.log(utils.encryptAppToken(text));