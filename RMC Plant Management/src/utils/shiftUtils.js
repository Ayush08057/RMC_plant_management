/**
 * RMC Plant Management System - Indian 12-Hour Shift Time Utilities
 * Formats 24-hour military times (09:00, 18:00, 20:00, 05:00) into standard Indian 12-hour format with AM / PM.
 */

/**
 * Converts a 24-hour time string into Indian 12-hour format (e.g. "09:00 AM", "06:00 PM", "02:30:15 PM").
 * @param {string} timeStr - Time string like "09:00", "18:00", "20:00:15", or range "09:00 - 18:00"
 * @returns {string} 12-hour formatted time with AM/PM
 */
export function formatToIndian12Hr(timeStr) {
  if (!timeStr) return '';
  const clean = String(timeStr).trim();

  // If already contains AM or PM
  if (/[ap]m/i.test(clean)) {
    return clean;
  }

  // If passed as a range like "09:00 - 18:00" or "09:00-18:00"
  if (clean.includes('-')) {
    const parts = clean.split('-').map((p) => p.trim());
    return parts.map((p) => formatToIndian12Hr(p)).join(' - ');
  }

  // Parse HH:mm or HH:mm:ss
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return clean;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const seconds = match[3];
  if (isNaN(hours)) return clean;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour converts to 12 AM
  const formattedHours = hours.toString().padStart(2, '0');

  return seconds 
    ? `${formattedHours}:${minutes}:${seconds} ${ampm}` 
    : `${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Parses any time string (24-hour or 12-hour AM/PM) into total minutes from midnight (0 - 1439).
 * Used for safe mathematical calculations of duty hours, overtime, and punctuality.
 * @param {string} timeStr - e.g. "09:00", "09:00 AM", "18:00", "06:00 PM", "14:30"
 * @returns {number} Minutes from midnight (e.g. 540 for 09:00 AM, 1080 for 06:00 PM)
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const clean = String(timeStr).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([AP]M))?/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10) || 0;
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

/**
 * Returns the current time formatted in standard Indian 12-hour format.
 * @param {boolean} includeSeconds - Whether to include seconds (default false)
 * @returns {string} e.g. "03:15 PM" or "03:15:22 PM"
 */
export function getNowIndian12Hr(includeSeconds = false) {
  const d = new Date();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  return includeSeconds
    ? `${formattedHours}:${minutes}:${seconds} ${ampm}`
    : `${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Formats start and end times into an Indian 12-hour range (e.g. "09:00 AM - 06:00 PM").
 * @param {string} startTime - e.g. "09:00" or "20:00"
 * @param {string} endTime - e.g. "18:00" or "05:00"
 * @returns {string} e.g. "09:00 AM - 06:00 PM"
 */
export function formatShiftRange(startTime, endTime) {
  if (!endTime) {
    return formatToIndian12Hr(startTime) || '09:00 AM - 06:00 PM';
  }
  const start = formatToIndian12Hr(startTime) || '09:00 AM';
  const end = formatToIndian12Hr(endTime) || '06:00 PM';
  return `${start} - ${end}`;
}

/**
 * Formats a shift object for dropdown options or labels.
 * @param {object} shift - Object with { name, startTime, endTime }
 * @returns {string} e.g. "General Morning Shift (09:00 AM - 06:00 PM)"
 */
export function formatShiftOption(shift) {
  if (!shift) return 'General Morning Shift (09:00 AM - 06:00 PM)';
  const name = shift.name || 'General Shift';
  const range = formatShiftRange(shift.startTime, shift.endTime);
  return `${name} (${range})`;
}
/**
 * Splits any time string (12-hour or 24-hour) into 12-hour parts: hour ('01'-'12'), minute ('00'-'59'), ampm ('AM'/'PM').
 * @param {string} timeStr - e.g. "09:00", "09:00 AM", "18:00", "06:00 PM", "20:30"
 * @returns {{ hour: string, minute: string, ampm: 'AM'|'PM' }}
 */
export function splitTimeTo12Hr(timeStr) {
  if (!timeStr) return { hour: '09', minute: '00', ampm: 'AM' };
  const clean = String(timeStr).trim();

  // Check if it already has AM or PM
  const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    if (isNaN(h) || h < 1) h = 12;
    if (h > 12) h = h % 12 || 12;
    const m = match12[2].padStart(2, '0');
    const ampm = match12[3].toUpperCase();
    return {
      hour: String(h).padStart(2, '0'),
      minute: m,
      ampm: ampm === 'PM' ? 'PM' : 'AM',
    };
  }

  // Check 24-hour HH:mm
  const match24 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2].padStart(2, '0');
    if (isNaN(h)) h = 9;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return {
      hour: String(h).padStart(2, '0'),
      minute: m,
      ampm,
    };
  }

  return { hour: '09', minute: '00', ampm: 'AM' };
}

/**
 * Builds a standardized 12-hour time string with AM/PM (e.g. "09:00 AM", "06:00 PM").
 * @param {string|number} hour - 1 to 12
 * @param {string|number} minute - 0 to 59
 * @param {string} ampm - 'AM' or 'PM'
 * @returns {string} e.g. "09:00 AM"
 */
export function build12HrTime(hour, minute, ampm) {
  let h = parseInt(hour, 10);
  if (isNaN(h) || h < 1) h = 12;
  if (h > 12) h = h % 12 || 12;
  const m = String(minute !== undefined && minute !== null ? minute : '00').padStart(2, '0');
  const period = String(ampm || 'AM').toUpperCase() === 'PM' ? 'PM' : 'AM';
  return `${String(h).padStart(2, '0')}:${m} ${period}`;
}

/**
 * Converts a 12-hour or 24-hour time string to 24-hour format "HH:mm".
 * @param {string} timeStr - e.g. "09:00 AM" or "06:00 PM"
 * @returns {string} e.g. "09:00" or "18:00"
 */
export function convertTo24Hr(timeStr) {
  if (!timeStr) return '09:00';
  const clean = String(timeStr).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([AP]M))?/i);
  if (!match) return '09:00';

  let h = parseInt(match[1], 10);
  const m = match[2].padStart(2, '0');
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm === 'PM' && h < 12) {
    h += 12;
  } else if (ampm === 'AM' && h === 12) {
    h = 0;
  }
  return `${String(h).padStart(2, '0')}:${m}`;
}


