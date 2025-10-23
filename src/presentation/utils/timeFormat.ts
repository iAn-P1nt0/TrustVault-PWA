/**
 * Time Formatting Utilities
 * Human-readable relative time formatting
 */

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 * @param date - Date to format
 * @param now - Current time (defaults to Date.now())
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date | number, now: number = Date.now()): string {
  const timestamp = typeof date === 'number' ? date : date.getTime();
  const secondsAgo = Math.floor((now - timestamp) / 1000);

  // Future dates
  if (secondsAgo < 0) {
    return 'just now';
  }

  // Less than a minute
  if (secondsAgo < 60) {
    return 'just now';
  }

  // Less than an hour
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return minutesAgo === 1 ? '1 minute ago' : `${minutesAgo} minutes ago`;
  }

  // Less than a day
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`;
  }

  // Less than a week
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) {
    return daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
  }

  // Less than a month
  const weeksAgo = Math.floor(daysAgo / 7);
  if (weeksAgo < 4) {
    return weeksAgo === 1 ? '1 week ago' : `${weeksAgo} weeks ago`;
  }

  // Less than a year
  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo < 12) {
    return monthsAgo === 1 ? '1 month ago' : `${monthsAgo} months ago`;
  }

  // Years
  const yearsAgo = Math.floor(monthsAgo / 12);
  return yearsAgo === 1 ? '1 year ago' : `${yearsAgo} years ago`;
}

/**
 * Format a date as a short relative time (e.g., "2h", "3d")
 * @param date - Date to format
 * @param now - Current time (defaults to Date.now())
 * @returns Short relative time string
 */
export function formatShortRelativeTime(date: Date | number, now: number = Date.now()): string {
  const timestamp = typeof date === 'number' ? date : date.getTime();
  const secondsAgo = Math.floor((now - timestamp) / 1000);

  if (secondsAgo < 60) return 'now';

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m`;

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h`;

  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) return `${daysAgo}d`;

  const weeksAgo = Math.floor(daysAgo / 7);
  if (weeksAgo < 4) return `${weeksAgo}w`;

  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo < 12) return `${monthsAgo}mo`;

  const yearsAgo = Math.floor(monthsAgo / 12);
  return `${yearsAgo}y`;
}

/**
 * Format a date as an absolute date string
 * @param date - Date to format
 * @param includeTime - Whether to include time (default: false)
 * @returns Formatted date string (e.g., "Jan 15, 2024" or "Jan 15, 2024 at 3:30 PM")
 */
export function formatAbsoluteDate(date: Date | number, includeTime: boolean = false): string {
  const dateObj = typeof date === 'number' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }

  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Format a date as a full date-time string
 * @param date - Date to format
 * @returns Formatted date-time string (e.g., "January 15, 2024 at 3:30:45 PM")
 */
export function formatFullDateTime(date: Date | number): string {
  const dateObj = typeof date === 'number' ? new Date(date) : date;

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Get a smart formatted time based on how recent the date is
 * - "just now" for < 1 minute
 * - Relative time for < 7 days
 * - Absolute date for >= 7 days
 * @param date - Date to format
 * @returns Smart formatted time string
 */
export function formatSmartTime(date: Date | number): string {
  const timestamp = typeof date === 'number' ? date : date.getTime();
  const now = Date.now();
  const secondsAgo = Math.floor((now - timestamp) / 1000);

  // Less than 7 days: use relative time
  if (secondsAgo < 7 * 24 * 60 * 60) {
    return formatRelativeTime(date, now);
  }

  // 7 days or more: use absolute date
  return formatAbsoluteDate(date, false);
}
