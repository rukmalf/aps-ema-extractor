// throttle.js - used for throttling calls to this API
// usage: let result = await canQuery(ecuID);

var config = require('config');
var datastore = require('nedb');
var db =  new datastore({ filename: 'datafile', autoload: true });
var logger = require('./logger');

// read exlcusion list from config and cache locally
let excluded = [];

let throttleDuration = 3480000; // default throttle duration is at least 58 minutes between successive calls for the same ECU ID

// throttle duration can be overridden in either config or Heroku config var
if(config.has('throttle-duration')) {
	throttleDuration = config.get('throttle-duration');
}
if(process.env.THROTTLE_DURATION) {
	logger.logVerbose(`process.env.THROTTLE_DURATION = "${process.env.THROTTLE_DURATION}"`);
	let throttleDurationOverride = parseInt(process.env.THROTTLE_DURATION);
	if(throttleDurationOverride > 0) {
		logger.logVerbose('Overriding throttle duration from ENV');
		throttleDuration = throttleDurationOverride;
	}
}
logger.logVerbose(`Throttle duration: ${throttleDuration} ms.`);

// exclusion list is loaded from config, or if provided, overridden by Heroku config var
if(config.has("none-throttled-ecus")) {
	logger.logVerbose('Overriding throttle exclude list from config');
	excluded = JSON.parse(config.get("none-throttled-ecus"));
}
if(process.env.NONE_THROTTLED_ECUS) {
	logger.logVerbose(`process.env.NONE_THROTTLED_ECUS = "${process.env.NONE_THROTTLED_ECUS}"`);
	let noneThrottledEcus = JSON.parse(process.env.NONE_THROTTLED_ECUS);
	if(noneThrottledEcus) {
		logger.logVerbose('Overriding throttle exclude list from ENV');
		excluded = noneThrottledEcus;
	}
}

// log the ECU ID's we will exclude from throttling
logger.logVerbose(`${excluded.length} ECU ID(s) will be excluded from throttling.`);
excluded.map(value => logger.logVerbose(`  excluded ECU ID: ${value}.`));

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
				logger.logVerbose(`db.insert with ${record.lastAccess} for ${targetEcuId}`);
				db.insert(record);
				
				resolve(true);
			}
			else {
				// ideally it should be one object, but we'll take the first anyway
				let record = docs[0];
				let msSinceLastAccess = new Date().getTime() - record.lastAccess.getTime();
				let allowed = (msSinceLastAccess > throttleDuration);

				logger.logVerbose(`${msSinceLastAccess} ms since last access for ${targetEcuId}, returning ${allowed}`);
				if(allowed) {
					// throttle duration has passed since last call for this ECU, update DB with current timestamp and proceed
					record.lastAccess = new Date();
					logger.logVerbose(`db.update with ${record.lastAccess}`);
					db.update( {ecuId: targetEcuId }, record, {}, function(err, numReplaced) { logger.logVerbose(`${numReplaced} instances updated for ${targetEcuId}.`); });

					resolve(true);
				}
				else {
					// still in throttle period for this ECU, can not proceed. Timestamp should not be updated.
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
	
	let excludedEcuId = "___EXCLUDED_ECU_ID___";
	let excludedDefault = excluded;
	excluded = ['foo', excludedEcuId, 'bar'];
	
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
	
	// test 4 - wait 6s (more than throttle duration) make one call (should succeed), wait 3s and make call (should fail), wait 3s more and make third call (should succeed).
	await pause(6000);
	result = await assertCanQuery(testEcuId, true, "4.1 - first call - should succeed");
	await pause(3000);
	result = result && (await assertCanQuery(testEcuId, false, "4.2 - second call within throttle duration, should fail"));
	await pause(3000);
	result = result && (await assertCanQuery(testEcuId, true, "4.3 - third call just after throttle duration, should succeed"));
	testCount++; if(result) testPassCount++; 
	
	// test 5 - repeat above with excluded ECU ID, all should return true
	result = await assertCanQuery(excludedEcuId, true, "5.1 - first call with excluded ECU ID");
	await pause(6000);
	result = result && (await assertCanQuery(excludedEcuId, true, "5.2 - second call after throttle duration"));
	await pause(1000);
	result = result && (await assertCanQuery(excludedEcuId, true, "5.3 - third call within throttle duration"));
	testCount++; if(result) testPassCount++; 
	
	// clear DB
	console.log("Teardown: clearing DB...");
	db.remove( {ecuId: testEcuId }, { multi: true }, function(err, numRemoved) { console.log(`${numRemoved} records removed. err = ${err}`); });
	await pause(1000); // wait for DB operation
	console.log("Teardown: DB cleared.");
	
	console.log(`${testCount} tests run, ${testPassCount} passed.`);
	
	// reset previous state
	throttleDuration = throttleDurationDefault;
	excluded = excludedDefault;
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