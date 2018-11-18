// we use request for the HTTP calls
var config = require('config');
var fs = require('fs');
var tests = require('./aps-ema-extractor.tests');
var dateutil = require('./date-util');
var logger = require('./logger');
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

if(config.has('logLevel')) {
	logLevel = config.get('logLevel');
	logger.init(logLevel);
}

if(config.has('username')) {
  username = config.get('username');
  logger.logVerbose('Found username: ' + username);
}

if(config.has('password')) {
  password = config.get('password');
  logger.logVerbose('Found password.');
}

var date = dateutil.getDateString(new Date());
if(config.has('overrideDate')) {
	date = config.get('overrideDate');
	logger.logVerbose('Override date with ' + date);
}

// authentication chains into the other calls to fetch data
service.initialize(username, password, date, logLevel);
service.authenticateAndFetchData(dataProcessorOutputCSV);

// when the daily data is fetched, we can process it with this function
function dataProcessorOutputCSV(data) {
	if(data && config.has('output')) {
		var outputType = config.get('output');
		if(outputType === 'csv') {
			var dataTimes = JSON.parse(data.time);
			var dataValues = JSON.parse(data.power);
			var output = '';

			var readingCount = dataTimes.length;
			logger.logVerbose('found ' + readingCount + ' entries...');

			output = '"Time","Power"\r\n';
			for(var i = 0; i < readingCount; i++) {
				var outputLine = '"' + dataTimes[i] + '",' + dataValues[i] + '\r\n';
				output = output + outputLine;
			}

			var filename = `output-${date}.csv`;
			fs.writeFile(filename, output, function(err) {
				if(err) {
					console.log(err);
				}

				logger.logVerbose(readingCount + ' entries written to ' + filename);
			}); 						
		}
	}
}
