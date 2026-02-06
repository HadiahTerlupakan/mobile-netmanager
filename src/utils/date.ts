import { format, formatDistanceToNow, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

/**
 * Safely formats a date string or Date object.
 * Returns a fallback string (default: '-') if the date is invalid.
 *
 * @param date - The date to format (string or Date)
 * @param formatStr - The format string (e.g., 'dd MMM yyyy')
 * @param options - Optional fallback value or locale override
 */
export const formatDate = (
  date: string | Date | null | undefined,
  formatStr: string = 'dd MMM yyyy',
  options: { fallback?: string; locale?: any } = {}
): string => {
  const { fallback = '-', locale = idLocale } = options;

  if (!date) return fallback;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(d)) return fallback;
    return format(d, formatStr, { locale });
  } catch {
    return fallback;
  }
};

/**
 * Safely formats a date to "time ago" string (e.g., "5 minutes ago").
 * Returns a fallback string (default: '') if the date is invalid.
 *
 * @param date - The date to format (string or Date)
 * @param options - Optional fallback value or locale override
 */
export const formatTimeAgo = (
  date: string | Date | null | undefined,
  options: { fallback?: string; locale?: any; addSuffix?: boolean } = {}
): string => {
  const { fallback = '', locale = idLocale, addSuffix = true } = options;

  if (!date) return fallback;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(d)) return fallback;
    return formatDistanceToNow(d, { addSuffix, locale });
  } catch {
    return fallback;
  }
};
