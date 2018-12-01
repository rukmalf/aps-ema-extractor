var api = require('./aps-ema-extractor-service');
var util = require('./util');
var dateUtil = require('./date-util');
const service = require('restana')({});

// 01 - access token
// TODO: service.get('/v1/AccessToken/app/:appId');

// 02 - authenticate
// TODO: service.get('/v1/users/:username/:accessToken/:password');
// OR service.get('/v1/users/:username/:accessToken/') with password in body or header

// 03 - daily energy details
// Endpoint: service.get('/v1/ecu/:ecuId/daily-details/:date/:token')
service.get('/v1/ecu/:ecuId/daily-details/:date/:token', async (req, res) => {
	var ecuId = req.params.ecuId;
	var date = req.params.date;
	var token = req.params.token;
	if(date == 'today') {
		date = dateUtil.getDateString(new Date());
	}

	// call API method to fetch details
    var dailyEnergyDetails = await api.getDailyEnergyDetails(ecuId, date, token);
	
	// convert JSON data to CSV format so that we can easily plot with a spreadsheet
	var dailyEnergyDetailsCSV = util.dataProcessorOutputCSV(dailyEnergyDetails.data);
    
	res.send(dailyEnergyDetailsCSV);
});

service.start(3000).then((server) => { console.log('Listening on :3000...'); });