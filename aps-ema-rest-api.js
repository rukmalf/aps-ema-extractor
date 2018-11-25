var api = require('./aps-ema-extractor-service');
var util = require('./util');
const service = require('restana')({});

service.get('/v1/users/:username/ecu/:ecuId/dailyEnergyDetails/:date', async(req, res) => {
	console.log('responding to request...');
	
	// call the service and return result
	var username = req.params.username;
	var ecuId = req.params.ecuId;
	var date = req.params.date;
	
	if(date === 'today') {
		// generate date string for today
	}
	
	console.log('Params: username ' + username + ', ECU ID = ' + ecuId + ', date = ' + date);
	
	api.initialize(username, '', date, 2);
	var csvContent = api.fetchData(date, util.dataProcessorOutputCSV);
	
	// res.send('ECHO username ' + username + ', ECU ID = ' + ecuId + ', date = ' + date);
	res.send(csvContent);
});

service.start(3000).then((server) => { console.log('Listening on :3000...'); });