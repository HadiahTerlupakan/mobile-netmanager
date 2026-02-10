import dayjs from 'dayjs';
import 'dayjs/locale/id';
import relativeTime from 'dayjs/plugin/relativeTime';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Extend dayjs with plugins
dayjs.extend(relativeTime);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(localeData);

// Set default locale to Indonesian
dayjs.locale('id');

// Format string mapping from date-fns to dayjs
const formatMap: Record<string, string> = {
  // Days
  'd': 'D',
  'dd': 'DD',
  // Months
  'M': 'M',
  'MM': 'MM',
  'MMM': 'MMM',
  'MMMM': 'MMMM',
  // Years
  'yy': 'YY',
  'yyyy': 'YYYY',
  // Hours
  'H': 'H',
  'HH': 'HH',
  'h': 'h',
  'hh': 'hh',
  // Minutes
  'm': 'm',
  'mm': 'mm',
  // Seconds
  's': 's',
  'ss': 'ss',
  // AM/PM
  'a': 'a',
  // Day of week
  'E': 'ddd',
  'EE': 'ddd',
  'EEE': 'ddd',
  'EEEE': 'dddd',
};

/**
 * Convert date-fns format string to dayjs format string
 * Uses placeholder-based replacement to avoid regex collision
 * (e.g. EEEE→dddd then dd→DD would corrupt dddd into DDDD)
 */
function convertFormat(dateFnsFormat: string): string {
  let result = dateFnsFormat;

  // Phase 1: Replace date-fns tokens with unique placeholders
  const placeholders: [string, string][] = [];
  // Sort by length descending to match longer tokens first
  const sortedKeys = Object.keys(formatMap).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const regex = new RegExp(key, 'g');
    if (regex.test(result)) {
      const placeholder = `\x00${placeholders.length}\x00`;
      placeholders.push([placeholder, formatMap[key]]);
      result = result.replace(new RegExp(key, 'g'), placeholder);
    }
  }

  // Phase 2: Replace placeholders with dayjs format tokens
  for (const [placeholder, value] of placeholders) {
    result = result.replace(new RegExp(placeholder.replace(/\x00/g, '\\x00'), 'g'), value);
  }

  return result;
}

/**
 * Safely formats a date string or Date object.
 * Returns a fallback string (default: '-') if the date is invalid.
 *
 * @param date - The date to format (string or Date)
 * @param formatStr - The format string (e.g., 'dd MMM yyyy') - uses date-fns format, converted internally
 * @param options - Optional fallback value
 */
export const formatDate = (
  date: string | Date | null | undefined,
  formatStr: string = 'dd MMM yyyy',
  options: { fallback?: string } = {}
): string => {
  const { fallback = '-' } = options;

  if (!date) return fallback;

  try {
    const d = dayjs(date);
    if (!d.isValid()) return fallback;

    // Convert date-fns format to dayjs format
    const dayjsFormat = convertFormat(formatStr);
    return d.format(dayjsFormat);
  } catch {
    return fallback;
  }
};

/**
 * Safely formats a date to "time ago" string (e.g., "5 menit yang lalu").
 * Returns a fallback string (default: '') if the date is invalid.
 *
 * @param date - The date to format (string or Date)
 * @param options - Optional fallback value
 */
export const formatTimeAgo = (
  date: string | Date | null | undefined,
  options: { fallback?: string; addSuffix?: boolean } = {}
): string => {
  const { fallback = '', addSuffix = true } = options;

  if (!date) return fallback;

  try {
    const d = dayjs(date);
    if (!d.isValid()) return fallback;
    return addSuffix ? d.fromNow() : d.fromNow(true);
  } catch {
    return fallback;
  }
};

// ==========================================
// Calendar/Date Manipulation Utilities
// ==========================================

/**
 * Check if a date is valid
 */
export const isValidDate = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;
  return dayjs(date).isValid();
};

/**
 * Add months to a date
 */
export const addMonths = (date: Date, amount: number): Date => {
  return dayjs(date).add(amount, 'month').toDate();
};

/**
 * Subtract months from a date
 */
export const subMonths = (date: Date, amount: number): Date => {
  return dayjs(date).subtract(amount, 'month').toDate();
};

/**
 * Get the start of the month
 */
export const startOfMonth = (date: Date): Date => {
  return dayjs(date).startOf('month').toDate();
};

/**
 * Get the end of the month
 */
export const endOfMonth = (date: Date): Date => {
  return dayjs(date).endOf('month').toDate();
};

/**
 * Get the day of the week (0 = Sunday, 6 = Saturday)
 */
export const getDay = (date: Date): number => {
  return dayjs(date).day();
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  return dayjs(date1).isSame(dayjs(date2), 'day');
};

/**
 * Get all days in an interval
 */
export const eachDayOfInterval = (interval: { start: Date; end: Date }): Date[] => {
  const days: Date[] = [];
  let current = dayjs(interval.start);
  const end = dayjs(interval.end);

  while (current.isSameOrBefore(end, 'day')) {
    days.push(current.toDate());
    current = current.add(1, 'day');
  }

  return days;
};

/**
 * Format a date using dayjs directly (for components that need raw dayjs format)
 * This is an escape hatch for when you need dayjs-native format strings
 */
export const formatDateRaw = (
  date: string | Date | null | undefined,
  formatStr: string
): string => {
  if (!date) return '-';
  const d = dayjs(date);
  if (!d.isValid()) return '-';
  return d.format(formatStr);
};

// Re-export dayjs for direct usage when needed
export { dayjs };
