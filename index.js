// we use request for the HTTP calls
var request = require('request');
var config = require('config');

// global variables
var access_token = '<not set>'
var username = '<not set>';
var password = '<not set>';
var ecuId = '<not set>';
var userId = '<not set>';

if(config.has('username')) {
  username = config.get('username');
  console.log('Found username: ' + username);
}

if(config.has('password')) {
  username = config.get('password');
  console.log('Found password.');
}

// Get Access Token
request.post(
    'http://api.apsystemsema.com:8073/apsema/v1/users/authorize?appid=yuneng128',
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
			access_token = JSON.parse(body).access_token;
			console.log('Access token: ' + access_token);
			
			// force other calls to be synchronus
			authenticate();
        }
		else {
			console.log('error: ' + error);
			console.log('statusCode: ' + response.statusCode);
		}
    }
);

function authenticate() {
	// Login call
	request.post(
		`http://api.apsystemsema.com:8073/apsema/v1/users/loginAndGetViewList?username=${username}&password=${password}&access_token=${access_token}&devicetype=android`,
		{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var responseObj = JSON.parse(body);
				var data = JSON.parse(responseObj.data);
				userId = data.userId;
				console.log('User ID: ' + userId);
				ecuId = JSON.parse(data.ecuId)[userId];
				console.log('ECU ID: ' + ecuId);
				
				fetchData();
			}
			else {
				console.log('error: ' + error);
				console.log('statusCode: ' + response.statusCode);
			}
		}
	);
}

function fetchData() {
	// fetch daily summary
	var today = getDateString(new Date());
	
	request.post(
		`http://api.apsystemsema.com:8073/apsema/v1/ecu/getPowerInfo?ecuId=${ecuId}&filter=power&date=${today}&access_token=${access_token}`,
		{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var responseObj = JSON.parse(body);
				console.log('response parsed');
				var code = responseObj.code;
				var data = responseObj.data;
				
				console.log('Daily Energy');
				console.log('code: ' + code);
				console.log('data: ' + data);
			}
			else {
				console.log('error: ' + error);
				console.log('statusCode: ' + response.statusCode);
			}
		}
	);
}

function getDateString(date) {
	var monthPart = date.getMonth() + 1;
	var datePart = date.getDate();
	var dateStr = date.getFullYear().toString() + (monthPart < 10 ? '0' : '') + monthPart + (datePart < 10 ? '0' : '') + datePart;
	return dateStr;
}