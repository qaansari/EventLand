/**
 * Formats event start & end dates according to EventLand requirements:
 * - If start and end dates are on different days: "Saturday January 9 2027 - Sunday January 10 2027"
 * - If start and end dates are on the same day: "Saturday January 9 2027" (no end date shown)
 */
export function formatEventDateRange(startDateInput, endDateInput) {
  if (!startDateInput) return 'Upcoming Date';

  const startDate = new Date(startDateInput);
  if (isNaN(startDate.getTime())) {
    return String(startDateInput);
  }

  const formatOptions = { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    timeZone: 'Asia/Karachi'
  };
  const formattedStart = startDate.toLocaleDateString('en-US', formatOptions).replace(/,/g, '');

  if (!endDateInput) return formattedStart;

  const endDate = new Date(endDateInput);
  if (isNaN(endDate.getTime())) return formattedStart;

  // Compare PKT calendar dates
  const startPkt = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Karachi' });
  const endPkt = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Karachi' });

  if (startPkt === endPkt) {
    return formattedStart;
  }

  const formattedEnd = endDate.toLocaleDateString('en-US', formatOptions).replace(/,/g, '');
  return `${formattedStart} - ${formattedEnd}`;
}

/**
 * Extracts and formats the dedicated Start Time string in Pakistan Standard Time (PKT, e.g. "7:00 PM PKT")
 */
export function formatEventStartTime(startDateInput, customTime = null) {
  if (customTime) return customTime;
  if (!startDateInput) return '7:00 PM PKT';

  const startDate = new Date(startDateInput);
  if (isNaN(startDate.getTime())) return '7:00 PM PKT';

  const timeStr = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi'
  });

  return `${timeStr} PKT`;
}
