import {
  GAME_STATUS_MESSAGES,
  CONFIDENCE_MESSAGES,
  ERROR_MESSAGES,
} from '../constants/messages/index.js';

export interface DateFormatOptions {
  timeZone?: string;
  includeTime?: boolean;
}

/**
 * Format date string with configured timeZone.
 */
export function formatDate(isoString: string, options?: DateFormatOptions): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const { timeZone = 'UTC', includeTime = false } = options || {};

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }
      : {}),
  });

  return formatter.format(date);
}

/**
 * Relative time formatter ("2 hours ago", "in 3 days").
 */
export function formatRelativeTime(isoString: string, referenceDate: Date = new Date()): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const diffMs = date.getTime() - referenceDate.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
  return rtf.format(diffDay, 'day');
}

/**
 * Renders distance exactly as returned by the backend API.
 * Requirement: Takes only distanceKm and renders it exactly as returned (no exactDistanceMeters parameter, no invented "~").
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined) return '';
  return `${distanceKm} km`;
}

/**
 * Renders rating with band label provided directly from API response.
 * Requirement: Takes the band label from the API response; do not derive a band from rating ranges.
 */
export function formatRating(rating: number | null | undefined, bandLabel?: string): string {
  if (rating === null || rating === undefined) return '';
  const rounded = Math.round(rating * 10) / 10;
  if (bandLabel) {
    return `${rounded} (${bandLabel})`;
  }
  return `${rounded}`;
}

/**
 * Returns human-readable label from GAME_STATUS_MESSAGES.
 */
export function formatGameStatus(status: keyof typeof GAME_STATUS_MESSAGES | string): string {
  return (GAME_STATUS_MESSAGES as Record<string, string>)[status] || status;
}

/**
 * Returns human-readable label from CONFIDENCE_MESSAGES.
 */
export function formatConfidence(confidence: keyof typeof CONFIDENCE_MESSAGES | string): string {
  return (CONFIDENCE_MESSAGES as Record<string, string>)[confidence] || confidence;
}

/**
 * Resolves user-friendly error string from ERROR_MESSAGES key.
 */
export function formatErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
}
