/**
 * Logger utility untuk mengatasi masalah terminal corruption
 *
 * Masalah: Terminal menjadi berantakan karena terlalu banyak console.log
 * dan ANSI escape codes yang tidak proper
 *
 * Solusi: Menggunakan environment variable untuk mengontrol logging
 */

const LOG_PREFIX = '[RADPRO]';
const ENABLE_LOGS = process.env.EXPO_DEBUG === 'true' || __DEV__;

let currentTenantId: string | null = null;

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
  const tenantLabel = currentTenantId ? `[T:${currentTenantId}]` : '';
  if (!USE_COLORS) {
    // Plain text untuk React Native atau jika colors disabled
    return `${LOG_PREFIX}${tenantLabel} ${prefix} ${message}`;
  }
  // With colors untuk Node.js terminal
  return `${color}${LOG_PREFIX}${tenantLabel} ${prefix}${colors.reset} ${message}`;
}

function safeStringify(obj: unknown): string {
  try {
    if (obj instanceof Error) {
      const axiosErr = obj as any;
      if (axiosErr.isAxiosError) {
        const status = axiosErr.response?.status || 'Unknown';
        const url = axiosErr.config?.url || 'Unknown URL';
        const data = axiosErr.response?.data ? JSON.stringify(axiosErr.response.data) : 'No response data';
        return `[AxiosError] ${obj.message} | Status: ${status} | URL: ${url} | Response: ${data}`;
      }
      return `[Error] ${obj.message}`;
    }
    if (typeof obj === 'object' && obj !== null) {
      return JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
        2
      );
    }
    return String(obj);
  } catch {
    return `[Unserializable Object: ${typeof obj}]`;
  }
}

export const logger = {
  setTenantId: (tenantId: string | null) => {
    currentTenantId = tenantId;
  },

  log: (...args: unknown[]) => {
    if (!ENABLE_LOGS) return;
    const message = args.map(safeStringify).join(' ');
    console.log(formatMessage('✓', message, colors.green));
  },

  warn: (...args: unknown[]) => {
    if (!ENABLE_LOGS) return;
    const message = args.map(safeStringify).join(' ');
    console.warn(formatMessage('⚠', message, colors.yellow));
  },

  error: (...args: unknown[]) => {
    // Error selalu ditampilkan
    const message = args.map(safeStringify).join(' ');
    console.error(formatMessage('✗', message, colors.red));
  },

  info: (...args: unknown[]) => {
    if (!ENABLE_LOGS) return;
    const message = args.map(safeStringify).join(' ');
    console.info(formatMessage('ℹ', message, colors.cyan));
  },

  // Label-specific loggers
  auth: (...args: unknown[]) => {
    if (!ENABLE_LOGS) return;
    const message = args.map(safeStringify).join(' ');
    console.log(formatMessage('[AUTH]', message, colors.blue));
  },

  socket: (...args: unknown[]) => {
    if (!ENABLE_LOGS) return;
    // Socket logging sering menyebabkan corruption, disable by default
    if (process.env.EXPO_DEBUG_SOCKET !== 'true') return;
    const message = args.map(safeStringify).join(' ');
    console.log(formatMessage('[SOCKET]', message, colors.dim));
  },

  sync: (...args: unknown[]) => {
    if (!ENABLE_LOGS) return;
    const message = args.map(safeStringify).join(' ');
    console.log(formatMessage('[SYNC]', message, colors.cyan));
  },

  db: (...args: unknown[]) => {
    if (!ENABLE_LOGS) return;
    const message = args.map(safeStringify).join(' ');
    console.log(formatMessage('[DB]', message, colors.dim));
  },

  debug: (...args: unknown[]) => {
    if (!ENABLE_LOGS) return;
    const message = args.map(safeStringify).join(' ');
    console.log(formatMessage('[DEBUG]', message, colors.dim));
  },
};

// Export singleton
export default logger;
