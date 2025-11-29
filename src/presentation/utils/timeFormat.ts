/**
 * Time Formatting Utilities
 * Human-readable relative time formatting using ChronCraft
 */

import { createDate, now as chronNow, format, diff } from 'chroncraft';

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 * Uses ChronCraft's diff() for precise time calculations
 * @param date - Date to format
 * @param baseTime - Current time (defaults to Date.now())
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date | number, baseTime: number = Date.now()): string {
  const targetDate = createDate(typeof date === 'number' ? new Date(date) : date);
  const baseDate = createDate(new Date(baseTime));
  const secondsAgo = diff(baseDate, targetDate, 'seconds');

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
 * Uses ChronCraft's diff() for precise time calculations
 * @param date - Date to format
 * @param baseTime - Current time (defaults to Date.now())
 * @returns Short relative time string
 */
export function formatShortRelativeTime(date: Date | number, baseTime: number = Date.now()): string {
  const targetDate = createDate(typeof date === 'number' ? new Date(date) : date);
  const baseDate = createDate(new Date(baseTime));
  const secondsAgo = diff(baseDate, targetDate, 'seconds');

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
 * Format a date as an absolute date string using ChronCraft
 * @param date - Date to format
 * @param includeTime - Whether to include time (default: false)
 * @returns Formatted date string (e.g., "Jan 15, 2024" or "Jan 15, 2024 at 3:30 PM")
 */
export function formatAbsoluteDate(date: Date | number, includeTime: boolean = false): string {
  const dateObj = typeof date === 'number' ? new Date(date) : date;
  const chronDate = createDate(dateObj);
  
  if (includeTime) {
    // Use Intl for localized time formatting with AM/PM
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  
  // Use ChronCraft for date-only formatting
  return format(chronDate, 'MMM D, YYYY');
}

/**
 * Format a date as a full date-time string using ChronCraft
 * @param date - Date to format
 * @returns Formatted date-time string (e.g., "January 15, 2024 at 3:30:45 PM")
 */
export function formatFullDateTime(date: Date | number): string {
  const dateObj = typeof date === 'number' ? new Date(date) : date;
  const chronDate = createDate(dateObj);
  
  // Use ChronCraft for the date part, Intl for localized time with AM/PM
  const datePart = format(chronDate, 'MMMM D, YYYY');
  const timePart = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  
  return `${datePart} at ${timePart}`;
}

/**
 * Get a smart formatted time based on how recent the date is
 * Uses ChronCraft's diff() for precise time calculations
 * - "just now" for < 1 minute
 * - Relative time for < 7 days
 * - Absolute date for >= 7 days
 * @param date - Date to format
 * @returns Smart formatted time string
 */
export function formatSmartTime(date: Date | number): string {
  const targetDate = createDate(typeof date === 'number' ? new Date(date) : date);
  const baseDate = chronNow();
  const secondsAgo = diff(baseDate, targetDate, 'seconds');

  // Less than 7 days: use relative time
  if (secondsAgo < 7 * 24 * 60 * 60) {
    return formatRelativeTime(date, Date.now());
  }

  // 7 days or more: use absolute date
  return formatAbsoluteDate(date, false);
}

/**
 * Format distance to now - ChronCraft equivalent of date-fns formatDistanceToNow
 * Returns human-readable relative time string
 * @param date - Date to format
 * @param options - Formatting options
 * @returns Human-readable distance string
 */
export function formatDistanceToNow(
  date: Date | number | string,
  options: { addSuffix?: boolean; includeSeconds?: boolean } = {}
): string {
  const { addSuffix = true, includeSeconds = false } = options;
  
  let targetDate: ReturnType<typeof createDate>;
  if (typeof date === 'string') {
    targetDate = createDate(new Date(date));
  } else {
    targetDate = createDate(typeof date === 'number' ? new Date(date) : date);
  }
  
  const baseDate = chronNow();
  const totalSeconds = diff(baseDate, targetDate, 'seconds');
  const isPast = totalSeconds >= 0;
  const absSeconds = Math.abs(totalSeconds);
  
  let result: string;
  
  // Determine the appropriate unit
  if (absSeconds < 30 && includeSeconds) {
    result = 'less than a minute';
  } else if (absSeconds < 60) {
    result = includeSeconds ? `${absSeconds} seconds` : 'less than a minute';
  } else if (absSeconds < 3600) {
    const minutes = Math.floor(absSeconds / 60);
    result = minutes === 1 ? '1 minute' : `${minutes} minutes`;
  } else if (absSeconds < 86400) {
    const hours = Math.floor(absSeconds / 3600);
    result = hours === 1 ? 'about 1 hour' : `about ${hours} hours`;
  } else if (absSeconds < 2592000) { // ~30 days
    const days = Math.floor(absSeconds / 86400);
    result = days === 1 ? '1 day' : `${days} days`;
  } else if (absSeconds < 31536000) { // ~365 days
    const months = Math.floor(absSeconds / 2592000);
    result = months === 1 ? 'about 1 month' : `about ${months} months`;
  } else {
    const years = Math.floor(absSeconds / 31536000);
    result = years === 1 ? 'about 1 year' : `about ${years} years`;
  }
  
  if (addSuffix) {
    return isPast ? `${result} ago` : `in ${result}`;
  }
  
  return result;
}
