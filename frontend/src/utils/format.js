/**
 * Format date to Indonesian locale string.
 */
export function formatDate(date) {
  if (!date) return '';
  // If already a string, return as is
  if (typeof date === 'string') return date;
  // If Date object, format it
  if (date instanceof Date) {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  // Try to parse as date
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  } catch (e) {}
  return String(date);
}

/**
 * Match status display config.
 */
export const STATUS_MAP = {
  live:     { label: 'LIVE',    cls: 'live' },
  upcoming: { label: 'Upcoming', cls: 'upcoming' },
  finished: { label: 'FT',      cls: 'finished' },
}

/**
 * Pad number to 2 digits.
 */
export const pad = n => String(n).padStart(2, '0')

/**
 * Format seconds as MM:SS countdown string.
 */
export function formatCountdown(seconds) {
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
}

/**
 * Format time string (HH:MM or HH:MM:SS).
 */
export function formatTime(time) {
  if (!time) return '';
  // If time is already formatted, return as is
  if (typeof time === 'string') return time;
  // If time is Date object, format it
  if (time instanceof Date) {
    return time.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return String(time);
}
