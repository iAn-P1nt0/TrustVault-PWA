/**
 * Time Formatting Utilities
 * Human-readable relative time formatting using ChronCraft
 */

import {
  createDate,
  now as chronNow,
  format,
  diff,
  formatRelativeTime as chronFormatRelativeTime,
  formatShortRelativeTime as chronFormatShortRelativeTime,
  formatDistanceToNow as chronFormatDistanceToNow,
} from 'chroncraft';

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 * Uses ChronCraft's native formatRelativeTime
 * @param date - Date to format
 * @param baseTime - Current time (defaults to Date.now())
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date | number, baseTime: number = Date.now()): string {
  return chronFormatRelativeTime(date, { baseDate: new Date(baseTime) });
}

/**
 * Format a date as a short relative time (e.g., "2h", "3d")
 * Uses ChronCraft's native formatShortRelativeTime
 * @param date - Date to format
 * @param baseTime - Current time (defaults to Date.now())
 * @returns Short relative time string
 */
export function formatShortRelativeTime(date: Date | number, baseTime: number = Date.now()): string {
  return chronFormatShortRelativeTime(date, { baseDate: new Date(baseTime) });
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
  const secondsAgo = diff(targetDate, baseDate, 'second');

  // Less than 7 days: use relative time
  if (secondsAgo < 7 * 24 * 60 * 60) {
    return formatRelativeTime(date, Date.now());
  }

  // 7 days or more: use absolute date
  return formatAbsoluteDate(date, false);
}

/**
 * Format distance to now - Uses ChronCraft's native formatDistanceToNow
 * Returns human-readable relative time string
 * @param date - Date to format
 * @param options - Formatting options
 * @returns Human-readable distance string
 */
export function formatDistanceToNow(
  date: Date | number | string,
  options: { addSuffix?: boolean; includeSeconds?: boolean } = {}
): string {
  return chronFormatDistanceToNow(date, options);
}
