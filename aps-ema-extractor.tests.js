// REGION: Tests
var dateutil = require('./date-util');

function runTests() {
	console.log('Running tests...');
	// getDateString() tests
	
	// isLastDayOfMonth() tests
	console.log('Running isLastDayOfMonth() tests...');
	assertIsLastDayOfMonth(new Date(2018, 0, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 0, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 0, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 1, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 1, 27, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 1, 28, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2016, 1, 28, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2016, 1, 29, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 2, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 2, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 2, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 3, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 3, 29, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 3, 30, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 4, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 4, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 4, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 5, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 5, 29, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 5, 30, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 6, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 6, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 6, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 7, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 7, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 7, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 8, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 8, 29, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 8, 30, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 9, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 9, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 9, 31, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 10, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 10, 29, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 10, 30, 0, 0, 0, 0), true);
	assertIsLastDayOfMonth(new Date(2018, 11, 1, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 11, 30, 0, 0, 0, 0), false);
	assertIsLastDayOfMonth(new Date(2018, 11, 31, 0, 0, 0, 0), true);
	console.log('Completed all isLastDayOfMonth() tests.');
}

function assertIsLastDayOfMonth(date, expected) {
	var actual = dateutil.isLastDayOfMonth(date);
	if(actual != expected) {
		var message = `Assert failed: expected isLastDayOfMonth(${date.getFullYear()}, ${date.getMonth()}, ${date.getDate()}) to be ${expected} but got ${actual}`;
		console.log(message);
	}
}

module.exports = {
	runTests: runTests
}

// ENDREGION: Tests