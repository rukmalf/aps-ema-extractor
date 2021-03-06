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
	
	logger.logVerbose('HTML');
	logger.logVerbose(output);
	
	return output; 
}

function dataProcessorOutputHTMLTableForSummary(dates, energy) {
	let output = '<table border="1"><tr><th>Date</th><th>Power (KWh)</th></tr>';
	
	for(let i = 0; i < dates.length; i++) {
		let outputLine = '<tr><td>' + dates[i] + '</td><td>' + energy[i] + '</td></tr>';
		output = output + outputLine;
	}
	output = output + '</table>';
	
	return output;
}

function dataProcessorOutputDailyTotal(data) {
	let dailyPower = JSON.parse(data.power);
	if(dailyPower) {
		let dailyTotalEst = dailyPower.map((value, index, array) => parseInt(value, 10)).reduce((total, amount) => total + amount);
		if(dailyTotalEst) return Math.round(dailyTotalEst * (5 / 60000));
	}

	return -1;
}

function dataProcessorOutputCSVFile(data) {
	let content = dataProcessorOutputToCSV(data);
	let filename = `output-${date}.csv`;			
	
	fs.writeFile(filename, content, function(err) {
		if(err) {
			logger.logError(err);
		}

		logger.logVerbose(readingCount + ' entries written to ' + filename);
	});
}

module.exports = {
	dataProcessorOutputHTMLTable: dataProcessorOutputHTMLTable,
	dataProcessorOutputCSV: dataProcessorOutputCSV,
	dataProcessorOutputCSVFile: dataProcessorOutputCSVFile,
	dataProcessorOutputDailyTotal: dataProcessorOutputDailyTotal,
	dataProcessorOutputHTMLTableForSummary: dataProcessorOutputHTMLTableForSummary
}