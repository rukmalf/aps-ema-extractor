const service = require('restana')({});
const bodyParser = require('body-parser');
const request = require('request');
const querystring = require('querystring');
const config = require('config');
const api = require('./aps-ema-extractor-service');
const util = require('./util');
const dateUtil = require('./date-util');
const logger = require('./logger');
const throttle = require('./throttle');

service.use(bodyParser.json());

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
	
	// check API throttling
	let result = await throttle.canQuery(ecuId);
	if(!result) {
		res.send('This API is throttled. Please wait longer between successive calls using a given ECU ID.', 429, {});
		return;
	}
	
	let dailyEnergyDetails = await handleDailyEnergyDetails(ecuId, date, token);
	let dailyEnergyDetailsHtml = dailyEnergyDetails.html;
	
	res.send(dailyEnergyDetailsHtml);
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
	
	// check API throttling
	let result = await throttle.canQuery(ecuId);
	if(!result) {
		res.send('This API is throttled. Please wait longer between successive calls using a given ECU ID.', 429, {});
		return;
	}
	
	let dailyEnergyDetails = await handleDailyEnergyDetails(ecuId, date, token);
	let dailyEnergyDetailsHtml = dailyEnergyDetails.html;
		
	// post response to webhook
	postToIfttt(webhook, iftttKey, `Daily Summary - ${date}`, 42, dailyEnergyDetailsHTML);
	
	res.send(dailyEnergyDetailsHtml);
});

// 03.c - daily energy details, with callback to IFTTT in request body
// Endpoint: service.get('/v1/ecu/:ecuId/daily-details/:date')
service.post('/v1/ecu/:ecuId/daily-details/:date', async (req, res) => {
	let ecuId = req.params.ecuId;
	let date = req.params.date;
	date = preprocessDate(date);
	logger.logVerbose(`handling daily-details. ECU: ${ecuId}, Date: ${date}`);
	
	// check API throttling
	let result = await throttle.canQuery(ecuId);
	if(!result) {
		res.send('This API is throttled. Please wait longer between successive calls using a given ECU ID.', 429, {});
		return;
	}
	
	// read token and callback info from body
	let body = req.body;
	let token = body.token;	
	let callbackTarget = body.callback;
	
	let dailyEnergyDetails = await handleDailyEnergyDetails(ecuId, date, token);
	let dailyEnergyDetailsHTML = dailyEnergyDetails.html;
	logger.logVerbose(`HTML content ready.`);
	
	// if callback is present, send the result
	logger.logVerbose(`callback: ${callbackTarget}`);
	if(callbackTarget == 'ifttt') {
		let iftttEvent = body.iftttEvent;
		let iftttKey = body.iftttKey;
		let iftttErrorEvent = body.iftttErrorEvent;
		
		logger.logVerbose(`IFTTT event: ${iftttEvent}, Key: ${iftttKey}, IFTTT error event: ${iftttErrorEvent}`);
		
		// post response to IFTTT webhook
		if(iftttEvent && iftttKey) {
			// if we have any error info, post that separately
			if(dailyEnergyDetails.errorInfo)
				postToIfttt(iftttErrorEvent, iftttKey, `${dailyEnergyDetails.errorInfo}`, `${date}`, '');
			
			// post whatever response we have too
			postToIfttt(iftttEvent, iftttKey, `Daily Summary - ${date}`, dailyEnergyDetails.total, dailyEnergyDetailsHTML);
		}
	}	
	
	res.send(dailyEnergyDetailsHTML);
});

// 04 - weekly/month energy details with callback to IFTTT
// Endpoint: service.get('/v1/ecu/:ecuId/summary/:period/:endDate');
service.post('/v1/ecu/:ecuId/summary/:period/:endDate', async (req, res) => {
	// read params from URL
	let ecuId = req.params.ecuId;
	let period = req.params.period;
	let endDate = req.params.endDate;
	
	if(!(period == 'week' || period == 'month')) {
		res.send(`"${period}" for :period is not supported. Retry with "week" or "month" instead.`, 404, {});
		return
	}
	
	endDate = preprocessDate(endDate);
	
	// check API throttling
	let result = await throttle.canQuery(ecuId);
	if(!result) {
		res.send('This API is throttled. Please wait longer between successive calls using a given ECU ID.', 429, {});
		return;
	}
	
	// read token and callback info from body
	let body = req.body;
	let token = body.token;
	
	// call API method to fetch details
    let dailyEnergyDetailsStr = await api.fetchEndOfMonthData(ecuId, endDate, token);
	let dailyEnergyDetails = JSON.parse(dailyEnergyDetailsStr);

	let times = JSON.parse(dailyEnergyDetails.data.time);
	let energy = JSON.parse(dailyEnergyDetails.data.energy);
	
	let periodDesc = 'Monthly summary';
	if(period == 'week') {
		// select last 7 items
		times = times.slice(-7);
		energy = energy.slice(-7);
		periodDesc = 'Weekly summary';
	}
	
	let httpTable = util.dataProcessorOutputHTMLTableForSummary(times, energy);
	
	// parse values as decimal and sum them for the period's sum
	let periodSum = energy.map((value, index, array) => parseInt(value, 10)).reduce((total, amount) => total + amount);
		
	// post response to webhook
	let callbackTarget = body.callback;
	
	if(callbackTarget == 'ifttt') {
		let iftttEvent = body.iftttEvent;
		let iftttKey = body.iftttKey;

		if(callbackTarget && iftttEvent && iftttKey) {
			postToIfttt(iftttEvent, iftttKey, `${periodDesc} - ${endDate}`, periodSum, httpTable);
		}		
	}
	
	res.send(httpTable);
});


async function handleDailyEnergyDetails(ecuId, date, token) {
	// call API method to fetch details
    let dailyEnergyDetails = await api.getDailyEnergyDetails(ecuId, date, token);
	
	// convert JSON data to CSV format so that we can easily plot with a spreadsheet
	let dailyEnergyDetailsCSV = util.dataProcessorOutputCSV(dailyEnergyDetails.data);
	let dailyEnergyDetailsHTML = util.dataProcessorOutputHTMLTable(dailyEnergyDetails.data);
	
	let dailyPower = util.dataProcessorOutputDailyTotal(dailyEnergyDetails.data);
	logger.logVerbose('Daily power: ' + dailyPower);
	
	let errorInfo = '';
	if(dailyPower == -1 || dailyPower == 0)
		errorInfo = 'No energy readings. System down?';
	
	let dailyEnergyDetailsResponse = {
		csv: dailyEnergyDetailsCSV,
		html: dailyEnergyDetailsHTML,
		total: dailyPower,
		errorInfo: errorInfo
	};
	
	return dailyEnergyDetailsResponse;
}

function preprocessDate(date) {
	let before = date;
	if(date == 'today') {
		date = dateUtil.getToday();
	}
	else if(date == 'yesterday') {
		date = dateUtil.getYesterday();
	}
	
	logger.logVerbose(`preprocessDate: before = ${before}, after = ${date}`);
	
	return date;
}

function postToIfttt(iftttEvent, iftttKey, ingredient1, ingredient2, ingredient3) {
	let webhookUrl = `https://maker.ifttt.com/trigger/${iftttEvent}/with/key/${iftttKey}`;
	logger.logVerbose(`IFTTT: ${webhookUrl}, value1: ${ingredient1}, value2: ${ingredient2}`);
	let webhookBody = {
		value1: ingredient1,
		value2: ingredient2,
		value3: ingredient3
	};
	postSummary(webhookUrl, webhookBody);
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