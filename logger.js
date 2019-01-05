const config = require('config');

// constants
const LOG_LEVEL_NONE = 0;
const LOG_LEVEL_ERRORS = 1;
const LOG_LEVEL_VERBOSE = 2;

var logLevel = LOG_LEVEL_NONE;

if(config.has('logLevel')) {
	logLevel = config.get('logLevel');
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

module.exports = {
	logError: logError,
	logVerbose: logVerbose
}