var got = require('got');
var moment = require('moment');
var fs = require('fs');
var path = require('path');

const Logger = require('../utils/Logger');
const logger = new Logger('services/helperService');
var formidable = require('formidable');
const config = require('../config/config-' + process.env.NODE_ENV + ".js");

exports.urlRequestHelper = function (options, callback) {
	var reqStartTime = moment().format('DD-MM-YYYY-HH:mm:ss:SSS'), reqEndTime;
	var data = null, header = { 'content-type': 'application/json' };
	if (options.header) {
		header = options.header;
	}
	if (options.data && typeof options.data == "string") {
		data = options.data;
	}
	else if (options.data && IsJsonString(options.data) == false) {
		data = JSON.stringify(options.data);
	}
	var reqObj = {
		method: options.method || 'POST',
		timeout: options.timeout || 180000,
		retries: 0,
		headers: header
	};
	if (reqObj.method == "POST") {
		reqObj.body = data;
	}
	logger.apireq(Logger.formatParams('----external request object ', reqObj));
	got(options.uri, reqObj)
		.then(response => {
			reqEndTime = moment().format('DD-MM-YYYY-HH:mm:ss:SSS');
			let data = {
				startTime: reqStartTime,
				endTime: reqEndTime,
				url: options.uri,
				response: response.body
			};
			logger.apires('response object', response.body);
			return callback(null, response, response.body);
		})
		.catch(error => {
			//console.log(error);
			let data = {
				err: error,
				opt: options,
				reqFailedtime: moment().format('DD-MM-YYYY-HH:mm:ss:SSS'),
				startTime: reqStartTime
			};
			logger.error(Logger.formatParams('response error', error));
			callback(error, null, null);
		});
};


function IsJsonString(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}


exports.logWriter = function (data, filename, folderName, append) {
	if (typeof data === 'object') {
		data = JSON.stringify(data);
	}
	logPath = createLogFolder(folderName);
	logPath = logPath + filename + '.log';
	if (append) {
		var newData = "\n" + data;
		fs.appendFile(logPath, newData, function () {

		});
	} else {
		fs.writeFileSync(logPath, data);
	}
}

function createLogFolder(folderName) {
	var currentDate = moment().format('DD-MM-YYYY');
	var currentHr = moment().format('HH');
	var logPathDir = path.join(__dirname, '../../logs');
	if (!fs.existsSync(logPathDir)) {
		fs.mkdirSync(logPathDir);
	}
	logPathDir = path.join(logPathDir + '/' + currentDate);
	if (!fs.existsSync(logPathDir)) {
		fs.mkdirSync(logPathDir);
	}
	logPathDir = path.join(logPathDir + '/' + currentHr);
	if (!fs.existsSync(logPathDir)) {
		fs.mkdirSync(logPathDir);
	}
	logPathDir = path.join(logPathDir + '/' + folderName);
	if (!fs.existsSync(logPathDir)) {
		fs.mkdirSync(logPathDir);
	}
	return logPathDir + "/";
}

/***
 * @returns the distance between two points
 * @param t from latitude
 * @param a from longitude
 * @param s to latitude
 * @param i to longitude
 */
exports.latLonToDistance = (t, a, s, i) => {
	var n = 3958.7558657440545, o = toRadius(s - t),
		h = toRadius(i - a),
		M = Math.sin(o / 2) * Math.sin(o / 2) + Math.cos(toRadius(t)) * Math.cos(toRadius(s)) * Math.sin(h / 2) * Math.sin(h / 2),
		u = 2 * Math.atan2(Math.sqrt(M), Math.sqrt(1 - M)), r = n * u;
	return (1.609344 * r).toFixed(1)
}

let toRadius = (t) => { return t * Math.PI / 180 };

exports.saveImages = (req, imgPath, callback) => {
	var form = new formidable.IncomingForm();
	form.multiples = true;
	form.keepExtensions = true;
	//form.uploadDir = __dirname + '/../../' + imgPath + '/';
	let imgPathArr = imgPath.split('/'), uploadDir = __dirname + '/../../';
	for(let i=0;i<imgPathArr.length-1;i++){
	   uploadDir =  `${uploadDir}/${imgPathArr[i]}`;
	  if (!fs.existsSync(uploadDir)) {
		fs.mkdirSync(uploadDir);
	 }
	}
	form.uploadDir = uploadDir;
	
	form.parse(req, function (err, fields, files) {
		if (err) {
			callback({ status: "Fail", statusCode: 403, msg: err });
		}
		else {

			let imageData = { "mainImage": convertLocalImgPath(files.mainImage.path, imgPath) };
			if (files.otherImages) {
				imageData["otherImages"] = [];
				for (var i in files.otherImages) {
					imageData["otherImages"].push(convertLocalImgPath(files.otherImages[i].path, imgPath));
				}
			}
			for (let i in fields) {
				imageData[i] = fields[i];
			}
			callback({ status: "Success", statusCode: 200, imageData: imageData });
		}
	});
}

function convertLocalImgPath(filePath, imgPath) {
	let splitPath = filePath.split(imgPath);
	let convertedImgPath = config.serverUrl() + imgPath + splitPath[1];
	return convertedImgPath;
}

exports.crashReport = function(data,folderName){
	var currentDate = moment().format('DD-MM-YYYY HH:mm');
	var newData = "\n"+currentDate+"\t"+data;
	logPath = createLogFolder(folderName);
	logPath = logPath+folderName+'.log';
	fs.appendFile(logPath, newData,function(err,done){
		if(err)console.log("error while writing "+ folderName+" :",err);
		else console.log(folderName+" sucessfully writtend");
	});
}