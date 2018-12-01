const fs = require('fs');
const logger = require('./logger');
const config = require('config');

// when the daily data is fetched, we can process it with this function
function dataProcessorOutputCSV(data, fnOutput) {
	if(data && config && config.has('output')) {
		let outputType = config.get('output');
		if(outputType === 'csv') {
			let dataTimes = JSON.parse(data.time);
			let dataValues = JSON.parse(data.power);
			let output = '';

			let readingCount = dataTimes.length;
			logger.logVerbose('found ' + readingCount + ' entries...');

			output = '"Time","Power"\r\n';
			for(let i = 0; i < readingCount; i++) {
				let outputLine = '"' + dataTimes[i] + '",' + dataValues[i] + '\r\n';
				output = output + outputLine;
			}
			
			return output; 
		}
	}
}

function dataProcessorOutputCSV(data, fnOutput) {
	let dataTimes = JSON.parse(data.time);
	let dataValues = JSON.parse(data.power);
	let output = '';

	let readingCount = dataTimes.length;
	logger.logVerbose('found ' + readingCount + ' entries...');

	output = '"Time","Power"\r\n';
	for(let i = 0; i < readingCount; i++) {
		let outputLine = '"' + dataTimes[i] + '",' + dataValues[i] + '\r\n';
		output = output + outputLine;
	}
	
	return output; 
}

function dataProcessorOutputHTMLTable(data, fnOutput) {
	let dataTimes = JSON.parse(data.time);
	let dataValues = JSON.parse(data.power);
	let output = '';

	let readingCount = dataTimes.length;
	logger.logVerbose('found ' + readingCount + ' entries...');

	output = '<table border="1"><tr><th>Time</th><th>Power</th></tr>';
	for(let i = 0; i < readingCount; i++) {
		let outputLine = '<tr><td>' + dataTimes[i] + '</td><td>' + dataValues[i] + '</td></tr>';
		output = output + outputLine;
	}
	output = output + '</table>';
	
	console.log('HTML');
	console.log(output);
	
	return output; 
}

function dataProcessorOutputCSVFile(data) {
	let content = dataProcessorOutputToCSV(data);
	let filename = `output-${date}.csv`;			
	
	fs.writeFile(filename, content, function(err) {
		if(err) {
			console.log(err);
		}

		logger.logVerbose(readingCount + ' entries written to ' + filename);
	});
}

module.exports = {
	dataProcessorOutputHTMLTable: dataProcessorOutputHTMLTable,
	dataProcessorOutputCSV: dataProcessorOutputCSV,
	dataProcessorOutputCSVFile: dataProcessorOutputCSVFile
}