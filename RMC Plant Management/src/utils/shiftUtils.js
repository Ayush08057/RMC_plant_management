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

