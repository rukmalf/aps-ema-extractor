var fs = require('fs');

// when the daily data is fetched, we can process it with this function
function dataProcessorOutputCSV(data, fnOutput) {
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
			
			return output; 
		}
	}
}

function dataProcessorOutputCSVFile(data) {
	var content = dataProcessorOutputToCSV(data);
	var filename = `output-${date}.csv`;			
	
	fs.writeFile(filename, content, function(err) {
		if(err) {
			console.log(err);
		}

		logger.logVerbose(readingCount + ' entries written to ' + filename);
	});
}

module.exports = {
	dataProcessorOutputCSV: dataProcessorOutputCSV,
	dataProcessorOutputCSVFile: dataProcessorOutputCSVFile
}