// throttle.js - used for throttling calls to this API
// usage: let result = await canQuery(ecuID);

var config = require('config');
var datastore = require('nedb');
var db =  new datastore({ filename: 'datafile', autoload: true });
var logger = require('./logger');

// read exlcusion list from config and cache locally
let excluded = [];

let throttleDuration = 3600000; // default throttle duration is at least one hour between successive calls for the same ECU ID

// allow exclusion list and throttle duration to be overridden in config
if(config.has('no-throttle')) {
	excluded = config.get('no-throttle');
}

if(config.has('throttle-duration')) {
	throttleDuration = config.get('throttle-duration');
}

// test mode
if(process.argv.length > 0) {	
	if(process.argv[2] == 'test') {
		console.log('test mode');
		
		runTests();
	}
}

async function canQuery(targetEcuId) {
	// is this ECU ID in our exclusion list? Then it's never throttled, so we return true
	if(excluded.includes(targetEcuId))
		return true;
		
	let result = await checkThrottling(targetEcuId);
	return result;
}

function checkThrottling(targetEcuId) {
	return new Promise((resolve, reject) => {
		// check throttling rules
		db.find({ecuId: targetEcuId }, function(err, docs) {
			logger.logVerbose(`db.find returned ${docs.length} results`);
			if(err) {
				logger.logError(`Rejecting due to ${err}`);
				reject(err);
			}
			
			if(docs.length == 0) {
				// no record found, so note this and return true
				// finally, note this request with timestamp
				let record = { ecuId: targetEcuId, lastAccess: new Date()};
				logger.logVerbose(`db.insert with ${record.lastAccess}`);
				db.insert(record);
				
				resolve(true);
			}
			else {
				// ideally it should be one object, but we'll take the first anyway
				let record = docs[0];
				let msSinceLastAccess = new Date().getTime() - record.lastAccess.getTime();

				// update DB with latest timestamp
				record.lastAccess = new Date();
				logger.logVerbose(`db.update with ${record.lastAccess}`);
				db.update( {ecuId: targetEcuId }, record, {}, function(err, numReplaced) { console.log(`${numReplaced} instances updated for ${targetEcuId}.`); });

				logger.logVerbose(`${msSinceLastAccess} ms since last access`);
				if(msSinceLastAccess > throttleDuration) {
					// throttle duration has passed since last call for this ECU, can proceed					
					resolve(true);
				}
				else {
					// still in throttle period for this ECU, can not proceed					
					resolve(false);
				}
			}
		});
	});
}

async function runTests() {
	// save the old value, set it to a lower value for testing, and reset it
	let throttleDurationDefault = throttleDuration;
	throttleDuration = 5000; // set to 5 seconds for test
	let testEcuId = "___TEST_ECU_ID___";
	
	let testCount = 0;
	let testPassCount = 0;
	
	console.log(`Setup: throttle duration = ${throttleDuration}, ECU ID = ${testEcuId}`);
	
	// clear DB
	console.log("Setup: clearing DB...");
	db.remove( {ecuId: testEcuId }, { multi: true }, function(err, numRemoved) { console.log(`${numRemoved} records removed. err = ${err}`); });
	await pause(1000); // wait for DB operation
	console.log("Setup: DB cleared.");
	
	// test 1 - first call with no previous records, should return true.
	let result = await assertCanQuery(testEcuId, true, "1 - first call");
	testCount++; if(result) testPassCount++; 
	
	// test 2 - wait 1s (less than throttle duration) and call again, should return false
	await pause(1000);
	result = await assertCanQuery(testEcuId, false, "2 - second call within throttle duration");
	testCount++; if(result) testPassCount++; 
	
	// test 3 - wait 6s (more than throttle duration) and call again, should return true
	await pause(6000);
	result = await assertCanQuery(testEcuId, true, "3 - third call after throttle duration");
	testCount++; if(result) testPassCount++;
	
	// clear DB
	console.log("Teardown: clearing DB...");
	db.remove( {ecuId: testEcuId }, { multi: true }, function(err, numRemoved) { console.log(`${numRemoved} records removed. err = ${err}`); });
	await pause(1000); // wait for DB operation
	console.log("Teardown: DB cleared.");
	
	console.log(`${testCount} tests run, ${testPassCount} passed.`);
	
	// reset previous duration
	throttleDuration = throttleDurationDefault;
}

async function assertCanQuery(ecuId, expected, description) {
	let result = await canQuery(ecuId);
	if(result == expected) {
		console.log(`Success: expected ${expected} for ${ecuId}. Test: ${description}`);
	}
	else {
		console.log(`Failure: expected ${expected} for ${ecuId} but got ${result}. Test: ${description}`);
	}
	
	return (result == expected);
}

async function pause(duration) {
	let promise = new Promise((resolve, reject) => {
		setTimeout(() => resolve(true), duration)
	});

	let result = await promise; // wait till the promise resolves

	return result;
}

module.exports = {
	canQuery: canQuery
}