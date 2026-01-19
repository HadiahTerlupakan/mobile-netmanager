/**
 * Logger utility untuk mengatasi masalah terminal corruption
 *
 * Masalah: Terminal menjadi berantakan karena terlalu banyak console.log
 * dan ANSI escape codes yang tidak proper
 *
 * Solusi: Menggunakan environment variable untuk mengontrol logging
 */

const LOG_PREFIX = '[NetManager]';
const ENABLE_LOGS = process.env.EXPO_DEBUG === 'true' || __DEV__;

// Check jika environment support colors (React Native doesn't have process.stdout)
const isTTY = typeof process !== 'undefined' && process.stdout && process.stdout.isTTY;

// Disable colors di React Native untuk menghindari corruption
const USE_COLORS = isTTY && process.env.EXPO_USE_COLORS === 'true';

// ANSI color codes - hanya gunakan jika terminal support
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function formatMessage(prefix: string, message: string, color: string = colors.reset): string {
  if (!USE_COLORS) {
    // Plain text untuk React Native atau jika colors disabled
    return `${LOG_PREFIX} ${prefix} ${message}`;
  }
  // With colors untuk Node.js terminal
  return `${color}${LOG_PREFIX} ${prefix}${colors.reset} ${message}`;
}

export const logger = {
  log: (...args: any[]) => {
    if (!ENABLE_LOGS) return;
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    console.log(formatMessage('✓', message, colors.green));
  },

  warn: (...args: any[]) => {
    if (!ENABLE_LOGS) return;
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    console.warn(formatMessage('⚠', message, colors.yellow));
  },

  error: (...args: any[]) => {
    // Error selalu ditampilkan
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    console.error(formatMessage('✗', message, colors.red));
  },

  info: (...args: any[]) => {
    if (!ENABLE_LOGS) return;
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    console.info(formatMessage('ℹ', message, colors.cyan));
  },

  // Label-specific loggers
  auth: (...args: any[]) => {
    if (!ENABLE_LOGS) return;
    console.log(formatMessage('[AUTH]', args.join(' '), colors.blue));
  },

  socket: (...args: any[]) => {
    if (!ENABLE_LOGS) return;
    // Socket logging sering menyebabkan corruption, disable by default
    if (process.env.EXPO_DEBUG_SOCKET !== 'true') return;
    console.log(formatMessage('[SOCKET]', args.join(' '), colors.dim));
  },

  sync: (...args: any[]) => {
    if (!ENABLE_LOGS) return;
    console.log(formatMessage('[SYNC]', args.join(' '), colors.cyan));
  },

  db: (...args: any[]) => {
    if (!ENABLE_LOGS) return;
    console.log(formatMessage('[DB]', args.join(' '), colors.dim));
  },
};

// Export singleton
export default logger;
