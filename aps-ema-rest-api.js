const service = require('restana')({});
const bodyParser = require('body-parser');
const request = require('request');
const querystring = require('querystring');
const config = require('config');
const api = require('./aps-ema-extractor-service');
const util = require('./util');
const dateUtil = require('./date-util');
const logger = require('./logger');

service.use(bodyParser.json());

let logLevel = logger.logError;
if(config.has('logLevel')) {
	logLevel = config.get('logLevel');
	logger.init(logLevel);
}

// 01 - access token
// TODO: service.get('/v1/AccessToken/app/:appId');

// 02 - authenticate
// TODO: service.get('/v1/users/:username/:accessToken/:password');
// OR service.get('/v1/users/:username/:accessToken/') with password in body or header

// 03 - daily energy details without callback
// Endpoint: service.get('/v1/ecu/:ecuId/daily-details/:date/:token')
service.get('/v1/ecu/:ecuId/daily-details/:date/:token', async (req, res) => {
	let ecuId = req.params.ecuId;
	let date = req.params.date;
	let token = req.params.token;
	
	date = preprocessDate(date);
	
	let dailyEnergyDetailsCSV = await handleDailyEnergyDetails(ecuId, date, token);
	
	res.send(dailyEnergyDetailsCSV);
});

// 03.b - daily energy details with callback to IFTTT
// Endpoint: service.get('/v1/ecu/:ecuId/daily-details/:date/:token/ifttt/:webhook/:iftttkey')
service.get('/v1/ecu/:ecuId/daily-details/:date/:token/ifttt/:webhook/:iftttkey', async (req, res) => {
	let ecuId = req.params.ecuId;
	let date = req.params.date;
	let token = req.params.token;
	let webhook = req.params.webhook;
	let iftttKey = req.params.iftttkey;
	
	date = preprocessDate(date);
	
	let dailyEnergyDetailsCSV = await handleDailyEnergyDetails(ecuId, date, token);
	
	//let dailyPower = util.dataProcessorOutputDailyTotal(dailyEnergyDetails.data);
	//console.log('Daily power: ' + dailyPower);
	
	// post response to webhook
	// let webhookUrl = 'https://ift.tt/' + webhook;
	// https://maker.ifttt.com/trigger/solarpv_energy_report_available/with/key/fhYjVh5smIXZ103Edn7LKq5rmTwncNZJVvLGWPxfMI5
	let webhookUrl = `https://maker.ifttt.com/trigger/${webhook}/with/key/${iftttKey}`;
	let webhookBody = {
		value1: date,
		value2: 42,
		value3: dailyEnergyDetailsCSV
	};

	postSummary(webhookUrl, webhookBody);
	
	res.send(dailyEnergyDetailsCSV);
});

// 04 - weekly/month energy details with callback to IFTTT
// Endpoint: service.get('/v1/ecu/:ecuId/summary/:period/:endDate');
service.post('/v1/ecu/:ecuId/summary/:period/:endDate', async (req, res) => {
	// read params from URL
	let ecuId = req.params.ecuId;
	let period = req.params.period;
	let endDate = req.params.endDate;
	
	endDate = preprocessDate(endDate);
	
	// read token and callback info from body
	let body = req.body;
	let token = body.token;
	let callbackTarget = body.callback;
	
	let iftttEvent = '';
	let iftttKey = '';
	if(callbackTarget == 'ifttt') {
		iftttEvent = body.iftttEvent;
		iftttKey = body.iftttKey;
	}
	
	// call API method to fetch details
    let dailyEnergyDetailsStr = await api.fetchEndOfMonthData(ecuId, endDate, token);
	let dailyEnergyDetails = JSON.parse(dailyEnergyDetailsStr);

	let times = JSON.parse(dailyEnergyDetails.data.time);
	let energy = JSON.parse(dailyEnergyDetails.data.energy);
	
	if(period == 'week') {
		// select last 7 items
		times = times.slice(-7);
		energy = energy.slice(-7);		
	}
	
	let httpTable = util.dataProcessorOutputHTMLTableForSummary(times, energy);
	
	let weeklySum = energy.map((value, index, array) => parseInt(value, 10)).reduce((total, amount) => total + amount);
		
	// post response to webhook
	// https://maker.ifttt.com/trigger/solarpv_energy_report_available/with/key/fhYjVh5smIXZ103Edn7LKq5rmTwncNZJVvLGWPxfMI5
	if(callbackTarget && iftttEvent && iftttKey) {
		let webhookUrl = `https://maker.ifttt.com/trigger/${iftttEvent}/with/key/${iftttKey}`;
		let webhookBody = {
			value1: endDate,
			value2: weeklySum,
			value3: httpTable
		};
		postSummary(webhookUrl, webhookBody);
	}
	
	res.send(httpTable);
});


async function handleDailyEnergyDetails(ecuId, date, token) {
	// call API method to fetch details
    let dailyEnergyDetails = await api.getDailyEnergyDetails(ecuId, date, token);
	
	// convert JSON data to CSV format so that we can easily plot with a spreadsheet
	let dailyEnergyDetailsCSV = util.dataProcessorOutputHTMLTable(dailyEnergyDetails.data);
	
	let dailyPower = util.dataProcessorOutputDailyTotal(dailyEnergyDetails.data);
	console.log('Daily power: ' + dailyPower);
	
	return dailyEnergyDetailsCSV;
}

function preprocessDate(date) {
	let before = date;
	if(date == 'today') {
		date = dateUtil.getToday();
	}
	else if(date == 'yesterday') {
		date = dateUtil.getYesterday();
	}
	
	console.log(`Before: ${before}, after: ${date}`);
	
	return date;
}

function postSummary(callbackUrl, callbackBody) {
	if(callbackUrl) {
		logger.logVerbose('About to post to ' + callbackUrl);
		
		request.post({ url: callbackUrl, form: callbackBody },
			function (error, response, body) {
				if (!error && response.statusCode == 200) {
					logger.logVerbose('callback returned: ' + body);
				}
				else {
					logger.logError('error: ' + error);
					logger.logError('statusCode: ' + response.statusCode);
				}
			}
		);
	}
	
	
}

var port = process.env.PORT || 8080;
service.start(port).then((server) => { console.log(`Listening on :${port}...`); });