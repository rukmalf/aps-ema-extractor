function getDateString(date) {
	var monthPart = date.getMonth() + 1;
	var datePart = date.getDate();
	var dateStr = date.getFullYear().toString() + (monthPart < 10 ? '0' : '') + monthPart + (datePart < 10 ? '0' : '') + datePart;
	return dateStr;
}

function isLastDayOfMonth(date) {
	// Thirty Days Hath September...
	var month = date.getMonth() + 1; // actual month, not index
	switch(month) {
		case 2:
			if((date.getFullYear() % 4) == 0)
				return (date.getDate() == 29);
			else 
				return (date.getDate() == 28)
		case 4:
		case 6:
		case 9:
		case 11:
			return (date.getDate() == 30);
		default:
			return (date.getDate() == 31);
	}
}

module.exports = {
	getDateString: getDateString,
	isLastDayOfMonth: isLastDayOfMonth
}
