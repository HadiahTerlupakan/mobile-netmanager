import { AxiosError } from 'axios';

interface ErrorMessage {
  title: string;
  message: string;
  action?: string;
}

const ERROR_MESSAGES: Record<string, ErrorMessage> = {
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
    message: 'Terjadi kesalahan pada server. Tim teknis telah dinotifikasi.',
    action: 'Coba Lagi'
  },
  'NOT_FOUND': {
    title: 'Data Tidak Ditemukan',
    message: 'Data yang Anda cari tidak ditemukan atau telah dihapus.',
  },
  'OFFLINE': {
    title: 'Mode Offline',
    message: 'Anda sedang offline. Beberapa fitur mungkin tidak tersedia.',
  }
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
      const data = error.response.data as any;

      // Use backend error message if available and looks user-friendly
      // Simple heuristic: if it's a 400/422 and has a 'message' or 'error' string
      if ((status === 400 || status === 422) && (data?.message || data?.error)) {
         return {
             title: 'Periksa Data',
             message: data.message || data.error || 'Terjadi kesalahan pada data input.'
         };
      }

      if (status === 401) return ERROR_MESSAGES['AUTH_FAILED'];
      if (status === 403) return { title: 'Akses Ditolak', message: 'Anda tidak memiliki izin untuk melakukan aksi ini.' };
      if (status === 404) return ERROR_MESSAGES['NOT_FOUND'];
      if (status >= 500) return ERROR_MESSAGES['SERVER_ERROR'];
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    if (error.message === 'Offline' || error.message.includes('Internet')) {
        return ERROR_MESSAGES['OFFLINE'];
    }
    // Return the actual error message for specific known logic errors, fallback to generic
    return {
        title: 'Terjadi Kesalahan',
        message: error.message || 'Terjadi kesalahan yang tidak terduga.'
    };
  }

  // Fallback
  return {
    title: 'Terjadi Kesalahan',
    message: 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.'
  };
}

function isAxiosError(error: any): error is AxiosError {
  return error && (error.isAxiosError || error.response || error.code);
}
