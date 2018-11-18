// we use request for the HTTP calls
var config = require('config');
var tests = require('./aps-ema-extractor.tests');
var service = require('./aps-ema-extractor-service');

// constants
const LOG_LEVEL_NONE = 0;
const LOG_LEVEL_ERRORS = 1;
const LOG_LEVEL_VERBOSE = 2;

// global variables
var username = '<not set>';
var password = '<not set>';
var logLevel = LOG_LEVEL_NONE;

// check if test mode
if(config.has('runTests')) {
	var shouldRunTests = config.get('runTests');
	console.log('runTests = ' + shouldRunTests);
	if(shouldRunTests) {
		tests.runTests();
		return;
	}
}

if(config.has('username')) {
  username = config.get('username');
  console.log('Found username: ' + username);
}

if(config.has('password')) {
  password = config.get('password');
  console.log('Found password.');
}

if(config.has('logLevel')) {
	logLevel = config.get('logLevel');
}

// authentication chains into the other calls to fetch data
service.initialize(username, password, logLevel);
service.authenticateAndFetchData();


