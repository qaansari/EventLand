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

/**
 * Converts any UTC/ISO date string to `YYYY-MM-DDTHH:mm` format in Pakistan Standard Time (Asia/Karachi),
 * suitable for binding directly to `<input type="datetime-local">`.
 */
export function toDateTimeLocalValue(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Karachi'
  });

  const parts = formatter.formatToParts(d);
  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  let hour = partMap.hour || '00';
  if (hour === '24') hour = '00';

  return `${partMap.year}-${partMap.month}-${partMap.day}T${hour}:${partMap.minute}`;
}

/**
 * Converts a `YYYY-MM-DDTHH:mm` string from `<input type="datetime-local">` (which represents
 * local Pakistan Standard Time) back into a strict UTC ISO 8601 string (`.toISOString()`).
 */
export function fromDateTimeLocalValue(localString) {
  if (!localString) return null;
  if (localString.includes('Z') || (localString.includes('+') && localString.length > 19)) {
    const d = new Date(localString);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  const normalized = localString.length === 16
    ? `${localString}:00+05:00`
    : (localString.length === 19 ? `${localString}+05:00` : localString);

  const d = new Date(normalized);
  if (isNaN(d.getTime())) {
    const fallback = new Date(localString);
    return isNaN(fallback.getTime()) ? null : fallback.toISOString();
  }
  return d.toISOString();
}

/**
 * Normalizes event publication status from any case/format (e.g. "LIVE", "SELLING FAST", 1)
 * into standard EventLand enum casing: 'Live', 'SellingFast', 'SoldOut', 'Upcoming', 'Closed', 'Draft', 'Cancelled'.
 */
export function normalizeEventStatus(status) {
  if (!status) return 'Live';
  const s = String(status).trim().toUpperCase().replace(/[\s_]+/g, '');
  if (s === 'LIVE' || s === '1') return 'Live';
  if (s === 'SELLINGFAST') return 'SellingFast';
  if (s === 'SOLDOUT') return 'SoldOut';
  if (s === 'UPCOMING') return 'Upcoming';
  if (s === 'CLOSED' || s === 'COMPLETED' || s === '2') return 'Closed';
  if (s === 'DRAFT' || s === '0') return 'Draft';
  if (s === 'CANCELLED' || s === 'CANCELED' || s === '3') return 'Cancelled';
  return 'Live';
}


