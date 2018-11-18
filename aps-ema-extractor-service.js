var request = require('request');
var fs = require('fs');
var dateutil = require('./date-util');
var logger = require('./logger');

// constants
const API_URL = 'http://api.apsystemsema.com:8073/apsema/v1';

// global variables
var access_token = '<not set>'
var ecuId = '<not set>';
var userId = '<not set>';
var username = '<not set>';
var password = '<not set>';

function initialize(usernameVal, passwordVal, logLevelVal) {
	username = usernameVal;
	password = passwordVal;
	logLevel = logLevelVal;
}

function authenticateAndFetchData() {
	// Get Access Token
	var accessTokenUrl = `${API_URL}/users/authorize?appid=yuneng128`;
	logger.logVerbose('--> POST ' + accessTokenUrl);

	request.post(
		accessTokenUrl,
		{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				access_token = JSON.parse(body).access_token;
				console.log('Access token: ' + access_token);
				
				// force other calls to be synchronus
				authenticate();
			}
			else {
				console.log('error: ' + error);
				console.log('statusCode: ' + response.statusCode);
			}
		}
	);
}

function authenticate() {
	// Login call
	var authenticateUrl = `${API_URL}/users/loginAndGetViewList?username=${username}&password=${password}&access_token=${access_token}&devicetype=android`
	logger.logVerbose('--> POST ' + authenticateUrl);

	request.post(
		authenticateUrl,
		{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				logger.logVerbose('<-- ' + body);
				var responseObj = JSON.parse(body);
				var data = JSON.parse(responseObj.data);
				userId = data.userId;
				console.log('User ID: ' + userId);
				ecuId = JSON.parse(data.ecuId)[userId];
				console.log('ECU ID: ' + ecuId);
				
				fetchData();
			}
			else {
				console.log('error: ' + error);
				console.log('statusCode: ' + response.statusCode);
			}
		}
	);
}

function fetchData() {
	// fetch daily summary
	var today = getDateString(new Date());
	if(config.has('overrideDate')) {
		today = config.get('overrideDate');
		logger.logVerbose('Override date with ' + today);
	}
		
	var dailyEnergyDetailsUrl = `${API_URL}/ecu/getPowerInfo?ecuId=${ecuId}&filter=power&date=${today}&access_token=${access_token}`
	logger.logVerbose('--> POST ' + dailyEnergyDetailsUrl);
	
	request.post(
		dailyEnergyDetailsUrl,
		{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var responseObj = JSON.parse(body);
				var code = responseObj.code;
				var data = responseObj.data;
				
				logger.logVerbose('code: ' + code);
				if(code == 0) {
					// System unavailable
					logError('System unavailable (code = 0)');
				}
				
				logger.logVerbose('data: ' + data);
				
				if(data && config.has('output')) {
					var outputType = config.get('output');
					if(outputType === 'csv') {
						var dataTimes = JSON.parse(data.time);
						var dataValues = JSON.parse(data.power);
						var output = '';

						var readingCount = dataTimes.length;
						logger.logVerbose('found ' + readingCount + ' entries...');
						console.log('"Time", "Power"');
						for(var i = 0; i < readingCount; i++) {
							var outputLine = dataTimes[i] + ', ' + dataValues[i] + '\r\n';
							output = output + outputLine;
						}

						var filename = `output-${today}.csv`;
						fs.writeFile(filename, output, function(err) {
							if(err) {
								console.log(err);
							}

							logger.logVerbose(readingCount + ' entries written to ' + filename);
						}); 						
					}
				}
				
			}
			else {
				console.log('error: ' + error);
				console.log('statusCode: ' + response.statusCode);
			}
			
			if(dateutil.isLastDayOfMonth(new Date())) {
				fetchEndOfMonthData();
			}
		}
	);	
}

function fetchEndOfMonthData() {
	var monthlyEnergyDetailsUrl = `${API_URL}/ecu/getPowerInfo?ecuId=${ecuId}&filter=day_of_month&date=${today}&access_token=${access_token}`
	logger.logVerbose('--> POST ' + monthlyEnergyDetailsUrl);
	
	request.post(
		monthlyEnergyDetailsUrl,
		{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var responseObj = JSON.parse(body);
				var code = responseObj.code;
				var data = responseObj.data;
			}
			else {
				console.log('error: ' + error);
				console.log('statusCode: ' + response.statusCode);
			}
		}
	);
	
	var today = new Date();
	if(today.getMonth() == 11) {
		// today is 31st December, fetch the end of year data too
	}
}

module.exports = {
	authenticateAndFetchData: authenticateAndFetchData,
	initialize: initialize
}
