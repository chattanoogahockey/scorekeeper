/**
 * Utility functions for consistent Eastern Time handling across the application
 */

/**
 * Get current Eastern Time as ISO string
 * @returns {string} Eastern time in ISO format
 */
export function getEasternTimeISO() {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2T$4:$5:$6');
}

/**
 * Get current Eastern Time as readable string
 * @returns {string} Eastern time in readable format with timezone
 */
export function getEasternTimeString() {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
}

/**
 * Convert any date to Eastern Time ISO string
 * @param {Date|string} date - Date to convert
 * @returns {string} Eastern time in ISO format
 */
export function toEasternTimeISO(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2T$4:$5:$6');
}
