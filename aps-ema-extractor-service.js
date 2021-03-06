var request = require('request');
var dateutil = require('./date-util');
var logger = require('./logger');

// constants
const API_URL = 'http://api.apsystemsema.com:8073/apsema/v1';
//const API_URL = 'http://demo1881045.mockable.io';
const options = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 60000 };

function postSync(url, headers) {
	return new Promise((resolve, reject) => {
		logger.logVerbose('==> POST ' + url);
		
		request.post(url, headers, (error, response, body) => {
			if(error) {
				logger.logError('Rejecting promise due to error: ' + error);
				reject(error);
			}
			if(response.statusCode != 200) {
				logger.logError('Rejecting promise due to invalid status code: ' + response.statusCode);
				reject('Invalid status code <' + response.statusCode + '>');
			}
			
			logger.logVerbose('<== ' + body);
			resolve(body);
		});
	});
}

// 01 - Access token
async function getAccessToken() {
	// Get Access Token
	var accessTokenUrl = `${API_URL}/users/authorize?appid=yuneng128`;
	let accessTokenResponse = await postSync(accessTokenUrl, options);
	
	let access_token = JSON.parse(accessTokenResponse).access_token;
	logger.logVerbose('Access token: ' + access_token);
	
	return access_token;
}

// 02 - Authentication, user details and ECU details
async function getUserDetails(username, password, accessToken) {
	var authenticateUrl = `${API_URL}/users/loginAndGetViewList?username=${username}&password=${password}&access_token=${accessToken}&devicetype=android`
	let authenticateResponse = await postSync(authenticateUrl, options);
	
	var authenticateDetails = JSON.parse(authenticateResponse);
	var data = JSON.parse(authenticateDetails.data);
	userId = data.userId;
	logger.logVerbose('User ID: ' + userId);
	var ecuId = JSON.parse(data.ecuId)[userId];
	logger.logVerbose('ECU ID: ' + ecuId);
	
	var userDetails = {};
	userDetails.userId = userId;
	userDetails.ecuId = ecuId;
	
	return userDetails;
}

// 03 - Daily energy details
async function getDailyEnergyDetails(ecuId, date, access_token) {
	var dailyEnergyDetailsUrl = `${API_URL}/ecu/getPowerInfo?ecuId=${ecuId}&filter=power&date=${date}&access_token=${access_token}`
	let fetchDataResponse = await postSync(dailyEnergyDetailsUrl, options);
	
	var dailyEnergyDetails = JSON.parse(fetchDataResponse);
	
	return dailyEnergyDetails;
}

// 04 - A single synchronous method to get access token, authenticate and get daily details
async function authenticateAndFetchData(username, password, date, processor) {
	
	// call 1 - get access token
	let access_token = await getAccessToken();
	logger.logVerbose('Access Token: ' + access_token);
	
	// call 2 - get user details including ECU ID
	var userDetails = await getUserDetails(username, password, access_token);
	
	// call 3 - get daily details
	var energyDetails = await getDailyEnergyDetails(userDetails.ecuId, date, access_token);
	
	logger.logVerbose('code: ' + energyDetails.code);
	if(energyDetails.code == 0) {
		// System unavailable
		logger.logError('System unavailable (code = 0)');
	}				
	
	// did we get a response?
	if(energyDetails.data) {		
		// do we have a processor function - e.g.: to output data to CSV?
		if(processor)  {
			logger.logVerbose('Processing data...');
			var energyDetailsProcessed = processor(energyDetails.data);
			return energyDetailsProcessed;
		}
		
		return energyDetails;
	}
	
	return;
}

// 05 - Monthly energy summary
async function fetchEndOfMonthData(ecuId, date, access_token) {
	var monthlyEnergyDetailsUrl = `${API_URL}/ecu/getPowerInfo?ecuId=${ecuId}&filter=day_of_month&date=${date}&access_token=${access_token}`
	
	let monthlyEnergyResponse = await postSync(monthlyEnergyDetailsUrl, options);
	
	return monthlyEnergyResponse;
}

module.exports = {
	getAccessToken: getAccessToken,
	getUserDetails: getUserDetails,
	getDailyEnergyDetails: getDailyEnergyDetails,
	authenticateAndFetchData: authenticateAndFetchData,
	fetchEndOfMonthData: fetchEndOfMonthData
}
