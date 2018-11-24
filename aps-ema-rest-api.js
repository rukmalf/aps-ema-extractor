const service = require('restana')({});

service.get('/v1/users/:username/ecu/:ecuId/dailyEnergyDetails/:date', async(req, res) => {
	// call the service and return result
	var username = req.params.username;
	var ecuId = req.params.ecuId;
	var date = req.params.date;
	
	res.send('ECHO username ' + username + ', ECU ID = ' + ecuId + ', date = ' + date);
});

service.start(3000).then((server) => { console.log('Listening on :3000...'); });