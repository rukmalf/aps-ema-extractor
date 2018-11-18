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