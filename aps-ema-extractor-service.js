var request = require('request');
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
var date = '<not set>';
var output = '';

function initialize(usernameVal, passwordVal, dateVal, logLevelVal) {
	username = usernameVal;
	password = passwordVal;
	date = dateVal;
	logLevel = logLevelVal;
}

function authenticateAndFetchData(processor) {
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
				authenticate(processor);
			}
			else {
				console.log('error: ' + error);
				console.log('statusCode: ' + response.statusCode);
			}
		}
	);
}

function authenticate(processor) {
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
				
				fetchData(date, processor);
			}
			else {
				console.log('error: ' + error);
				console.log('statusCode: ' + response.statusCode);
			}
		}
	);
}

function fetchData(date, processor) {
	// fetch daily summary		
	var dailyEnergyDetailsUrl = `${API_URL}/ecu/getPowerInfo?ecuId=${ecuId}&filter=power&date=${date}&access_token=${access_token}`
	logger.logVerbose('--> POST ' + dailyEnergyDetailsUrl);
	
	request.post(
		dailyEnergyDetailsUrl,
		{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				logger.logVerbose("<-- " + body);
				
				var responseObj = JSON.parse(body);
				var code = responseObj.code;
				var data = responseObj.data;
				
				logger.logVerbose('code: ' + code);
				if(code == 0) {
					// System unavailable
					logError('System unavailable (code = 0)');
				}				
				
				// did we get a response?
				if(data) {
					logger.logVerbose('data: ' + data);
					
					// do we have a processor function - e.g.: to output data to CSV?
					if(processor)  {
						logger.logVerbose('Processing data...');
						processor(data);
					}
				}				
			}
			else {
				console.log('error: ' + error);
				console.log('statusCode: ' + response.statusCode);
			}
			
			var today = new Date();
			if(dateutil.isLastDayOfMonth(today)) {
				fetchEndOfMonthData(today);
			}
		}
	);	
}

function fetchEndOfMonthData(date) {
	var monthlyEnergyDetailsUrl = `${API_URL}/ecu/getPowerInfo?ecuId=${ecuId}&filter=day_of_month&date=${date}&access_token=${access_token}`
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
	initialize: initialize,
	fetchData: fetchData
}
