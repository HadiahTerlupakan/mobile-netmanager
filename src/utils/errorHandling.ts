import { AxiosError } from 'axios';

export interface ErrorMessage {
  title: string;
  message: string;
  action?: string;
}

type ErrorPayload = Record<string, unknown>;

const ERROR_MESSAGES = {
  'ERR_NETWORK': {
    title: 'Koneksi Bermasalah',
    message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.',
    action: 'Coba Lagi'
  },
  'ECONNABORTED': {
    title: 'Waktu Habis',
    message: 'Permintaan memakan waktu terlalu lama. Silakan coba lagi.',
    action: 'Coba Lagi'
  },
  'AUTH_FAILED': {
    title: 'Sesi Berakhir',
    message: 'Sesi login Anda telah berakhir. Silakan login kembali.',
    action: 'Login'
  },
  'VALIDATION_ERROR': {
    title: 'Data Tidak Valid',
    message: 'Mohon periksa kembali data yang Anda masukkan.',
  },
  'SERVER_ERROR': {
    title: 'Gangguan Server',
    message: 'Terjadi kesalahan pada server. Silakan coba lagi dalam beberapa saat.',
    action: 'Coba Lagi'
  },
  'NOT_FOUND': {
    title: 'Data Tidak Ditemukan',
    message: 'Data yang Anda cari tidak ditemukan atau telah dihapus.',
  },
  'OFFLINE': {
    title: 'Mode Offline',
    message: 'Anda sedang offline. Beberapa fitur mungkin tidak tersedia.',
  },
  'RATE_LIMIT': {
    title: 'Terlalu Banyak Permintaan',
    message: 'Permintaan Anda terlalu sering. Silakan tunggu sebentar lalu coba lagi.',
  },
  'CONFLICT': {
    title: 'Data Berubah',
    message: 'Data ini sudah berubah. Muat ulang data dan coba lagi.',
  },
  'UPDATE_REQUIRED': {
    title: 'Perlu Update Aplikasi',
    message: 'Versi aplikasi Anda sudah tidak didukung. Silakan update untuk melanjutkan.',
  }
};

const isRecord = (value: unknown): value is ErrorPayload => typeof value === 'object' && value !== null;

const getStringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

export function extractApiErrorMessage(data: unknown): string | undefined {
  if (!isRecord(data)) {
    return getStringValue(data);
  }

  const directMessage = getStringValue(data.message) || getStringValue(data.error);
  if (directMessage) {
    return directMessage;
  }

  if (Array.isArray(data.errors)) {
    const nestedMessages = data.errors
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry;
        }

        if (isRecord(entry)) {
          return getStringValue(entry.message) || getStringValue(entry.error);
        }

        return undefined;
      })
      .filter((entry): entry is string => Boolean(entry));

    if (nestedMessages.length > 0) {
      return nestedMessages.join('\n');
    }
  }

  return undefined;
}

const getSafeErrorMessage = (message: string): string => {
  const normalized = message.trim();
  if (!normalized) {
    return 'Terjadi kesalahan yang tidak terduga.';
  }

  const looksTechnical = /(TypeError|SyntaxError|undefined|null|JSON|Network request failed)/i.test(normalized);
  if (looksTechnical || normalized.length > 160) {
    return 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
  }

  return normalized;
};

/**
 * Maps technical errors to user-friendly messages
 */
export function getUserFriendlyError(error: unknown): ErrorMessage {
  // Handle Axios Errors
  if (isAxiosError(error)) {
    // Network Error
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return ERROR_MESSAGES['ERR_NETWORK'];
    }

    // Timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return ERROR_MESSAGES['ECONNABORTED'];
    }

    if (error.response) {
      const status = error.response.status;
      const backendMessage = extractApiErrorMessage(error.response.data);

      // Use backend error message if available for 400/403/422
      if ((status === 400 || status === 422) && backendMessage) {
        return {
          title: 'Periksa Data',
          message: backendMessage
        };
      }

      if (status === 401) return ERROR_MESSAGES['AUTH_FAILED'];
      if (status === 408) return ERROR_MESSAGES['ECONNABORTED'];
      if (status === 409) return backendMessage
        ? { title: ERROR_MESSAGES['CONFLICT'].title, message: backendMessage }
        : ERROR_MESSAGES['CONFLICT'];
      if (status === 403) return {
        title: 'Akses Ditolak',
        message: backendMessage || 'Anda tidak memiliki izin untuk melakukan aksi ini.'
      };
      if (status === 404) return {
        title: 'Data Tidak Ditemukan',
        message: backendMessage || ERROR_MESSAGES['NOT_FOUND'].message
      };
      if (status === 426) return ERROR_MESSAGES['UPDATE_REQUIRED'];
      if (status === 429) return ERROR_MESSAGES['RATE_LIMIT'];
      if (status >= 500) return ERROR_MESSAGES['SERVER_ERROR'];
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    if (error.message === 'Offline' || error.message.includes('Internet')) {
      return ERROR_MESSAGES['OFFLINE'];
    }
    return {
      title: 'Terjadi Kesalahan',
      message: getSafeErrorMessage(error.message)
    };
  }

  // Fallback
  return {
    title: 'Terjadi Kesalahan',
    message: 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.'
  };
}

function isAxiosError(error: unknown): error is AxiosError {
  if (!isRecord(error)) {
    return false;
  }

  return 'isAxiosError' in error || 'response' in error || 'code' in error;
}
