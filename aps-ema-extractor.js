// we use request for the HTTP calls
var config = require('config');
var tests = require('./aps-ema-extractor.tests');
var util = require('./util');
var dateutil = require('./date-util');
var logger = require('./logger');
var service = require('./aps-ema-extractor-service');

// constants
const LOG_LEVEL_NONE = 0;
const LOG_LEVEL_ERROR = 1;
const LOG_LEVEL_VERBOSE = 2;

// global variables
var username = '<not set>';
var password = '<not set>';
var logLevel = LOG_LEVEL_ERROR;

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
  logger.logVerbose('Found username: ' + username);
}

if(config.has('password')) {
  password = config.get('password');
  logger.logVerbose('Found password.');
}

var date = dateutil.getToday();
if(config.has('overrideDate')) {
	date = config.get('overrideDate');
	logger.logVerbose('Override date with ' + date);
}

var outputCsv = false;
if(config.has('output')) {
	outputCsv = config.get('output');
}

// call the service to authenticate and fetch data
var response = service.authenticateAndFetchData(username, password, date, util.dataProcessorOutputCSV);
response.then(function(result) {
	logger.logVerbose('Response resolved: ' + result);
},
function(error) {
	logger.logError('Error: ' + error);
});
logger.logVerbose('Promise obtained');




