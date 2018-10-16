// we use request for the HTTP calls
var request = require('request');
var config = require('config');

// constants
const API_URL = 'http://api.apsystemsema.com:8073/apsema/v1';
const LOG_LEVEL_NONE = 0;
const LOG_LEVEL_ERRORS = 1;
const LOG_LEVEL_VERBOSE = 2;

// global variables
var access_token = '<not set>'
var username = '<not set>';
var password = '<not set>';
var ecuId = '<not set>';
var userId = '<not set>';
var logLevel = LOG_LEVEL_NONE;

if(config.has('username')) {
  username = config.get('username');
  console.log('Found username: ' + username);
}

if(config.has('password')) {
  password = config.get('password');
  console.log('Found password.');
}

if(config.has('runTests')) {
	var shouldRunTests = config.get('runTests');
	if(shouldRunTests) {
		runTests();
		return;
	}
}

if(config.has('logLevel')) {
	logLevel = config.get('logLevel');
}

// Get Access Token
var accessTokenUrl = `${API_URL}/users/authorize?appid=yuneng128`;
logVerbose('--> POST ' + accessTokenUrl);

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

function authenticate() {
	// Login call
	var authenticateUrl = `${API_URL}/users/loginAndGetViewList?username=${username}&password=${password}&access_token=${access_token}&devicetype=android`
	logVerbose('--> POST ' + authenticateUrl, LOG_LEVEL_VERBOSE);

	request.post(
		authenticateUrl,
		{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				logVerbose('<-- ' + body, LOG_LEVEL_VERBOSE);
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
		logVerbose('Override date with ' + today);
	}
		
	var dailyEnergyDetailsUrl = `${API_URL}/ecu/getPowerInfo?ecuId=${ecuId}&filter=power&date=${today}&access_token=${access_token}`
	logVerbose('--> POST ' + dailyEnergyDetailsUrl, LOG_LEVEL_VERBOSE);
	
	request.post(
		dailyEnergyDetailsUrl,
		{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var responseObj = JSON.parse(body);
				var code = responseObj.code;
				var data = responseObj.data;
				
				logVerbose('code: ' + code);
				if(code == 0) {
					// System unavailable
					logError('System unavailable (code = 0)');
				}
				
				logVerbose('data: ' + data);
				
			}
			else {
				console.log('error: ' + error);
				console.log('statusCode: ' + response.statusCode);
			}
			
			if(isLastDayOfMonth(new Date())) {
				fetchEndOfMonthData();
			}
		}
	);	
}

function logError(input) {
	if(logLevel == LOG_LEVEL_NONE) 
		return;
		
	console.log('ERROR: ' + input);
}

function logVerbose(input) {
	if(logLevel == LOG_LEVEL_NONE)
		return;

	if(logLevel == LOG_LEVEL_VERBOSE) {
		console.log(input);
	}
}

function fetchEndOfMonthData() {
	var monthlyEnergyDetailsUrl = `${API_URL}/ecu/getPowerInfo?ecuId=${ecuId}&filter=day_of_month&date=${today}&access_token=${access_token}`
	logVerbose('--> POST ' + monthlyEnergyDetailsUrl, LOG_LEVEL_VERBOSE);
	
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

function getDateString(date) {
	var monthPart = date.getMonth() + 1;
	var datePart = date.getDate();
	var dateStr = date.getFullYear().toString() + (monthPart < 10 ? '0' : '') + monthPart + (datePart < 10 ? '0' : '') + datePart;
	return dateStr;
}

function isLastDayOfMonth(date) {
	// Thirty Days Hath September...
	var month = date.getMonth() + 1; // actual month, not index
	switch(month) {
		case 2:
			if((date.getFullYear() % 4) == 0)
				return (date.getDate() == 29);
			else 
				return (date.getDate() == 28)
		case 4:
		case 6:
		case 9:
		case 11:
			return (date.getDate() == 30);
		default:
			return (date.getDate() == 31);
	}
}

function runTests() {
	console.log('Running tests...');
	// getDateString() tests
	
	// isLastDayOfMonth() tests
	console.log('Running isLastDayOfMonth() tests...');
	assertIsLastDayOfMonth(new Date(2018, 0, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 0, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 0, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 1, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 1, 27, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 1, 28, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2016, 1, 28, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2016, 1, 29, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 2, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 2, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 2, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 3, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 3, 29, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 3, 30, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 4, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 4, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 4, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 5, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 5, 29, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 5, 30, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 6, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 6, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 6, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 7, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 7, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 7, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 8, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 8, 29, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 8, 30, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 9, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 9, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 9, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 10, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 10, 29, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 10, 30, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 11, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 11, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 11, 31, 0, 0, 0, 0), true);
}

function assertIsLastDayOfMonth(date, expected) {
	var actual = isLastDayOfMonth(date);
	if(actual != expected) {
		var message = `Assert failed: expected isLastDayOfMonth(${date.getFullYear()}, ${date.getMonth()}, ${date.getDate()}) to be ${expected} but got ${actual}`;
		console.log(message);
	}
}