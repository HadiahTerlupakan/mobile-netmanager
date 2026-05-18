import { getUserFriendlyError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { TokenService } from '@/services/TokenService';
import { TenantService } from '@/services/TenantService';
import { HTTP_TIMEOUTS } from '@/constants/httpTimeouts';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

export type UploadType =
  | 'employee-attendance'
  | 'employee-leave'
  | 'work-order-updates'
  | 'workorder-completion'
  | 'inventory-masuk'
  | 'inventory-keluar'
  | 'marketing/point-claims'
  | 'marketing'; // Added for Canvasing

export interface UploadProgress {
  total: number;
  uploaded: number;
  percentage: number;
}

const UPLOAD_HARD_TIMEOUT_MS = HTTP_TIMEOUTS.long;
const UPLOAD_NO_PROGRESS_TIMEOUT_MS = 30_000;

class UploadTimeoutError extends Error {
  constructor(reason: 'hard' | 'no-progress') {
    super(
      reason === 'hard'
        ? 'Upload melebihi batas waktu 60 detik. Periksa koneksi dan coba lagi.'
        : 'Upload terhenti — tidak ada progres selama 30 detik. Periksa koneksi.',
    );
    this.name = 'UploadTimeoutError';
  }
}

interface WatchdogHandle {
  reportProgress(): void;
  finish(): void;
  wasCancelled(): { cancelled: boolean; reason: 'hard' | 'no-progress' };
}

/**
 * Bungkus upload task dengan watchdog: hard timeout (total) + no-progress timeout.
 * Mencegah upload menggantung tanpa batas saat koneksi 4G drop di tengah jalan.
 */
function startUploadWatchdog(task: FileSystem.UploadTask): WatchdogHandle {
  let lastProgressAt = Date.now();
  let cancelReason: 'hard' | 'no-progress' | null = null;

  const cancelOnce = (reason: 'hard' | 'no-progress') => {
    if (cancelReason) return;
    cancelReason = reason;
    try { void task.cancelAsync(); } catch { /* ignore */ }
  };

  const hardTimer = setTimeout(() => cancelOnce('hard'), UPLOAD_HARD_TIMEOUT_MS);
  const watchdog = setInterval(() => {
    if (Date.now() - lastProgressAt > UPLOAD_NO_PROGRESS_TIMEOUT_MS) {
      cancelOnce('no-progress');
    }
  }, 5_000);

  return {
    reportProgress: () => { lastProgressAt = Date.now(); },
    finish: () => {
      clearTimeout(hardTimer);
      clearInterval(watchdog);
    },
    wasCancelled: () => ({
      cancelled: cancelReason !== null,
      reason: cancelReason ?? 'hard',
    }),
  };
}

class UploadService {
  /**
   * Uploads a file to the server using expo-file-system for better reliability.
   * Handles authentication and retries automatically.
   *
   * @param uri Local file URI
   * @param type Upload type (folder/category on backend)
   * @param options Optional configuration (maxRetries, additional params like watermarkLines)
   */
  async uploadFile(
    uri: string,
    type: UploadType,
    options: {
      maxRetries?: number;
      params?: Record<string, string>;
      onProgress?: (progress: UploadProgress) => void;
    } = {}
  ): Promise<string> {
    const { maxRetries = 2, params = {}, onProgress } = options;
    // Optimization: Use in-memory token first
    let token = TokenService.getToken();
    if (!token) {
        token = await SecureStore.getItemAsync('session_token');
    }

    if (!token) {
      throw new Error('Authentication required for upload');
    }

    const filename = uri.split('/').pop() || 'photo.jpg';
    const fileType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const uploadUrl = `${TenantService.getTenantUrl()}/api/mobile/upload`;

    let attempt = 0;
    let lastError: any;

    while (attempt <= maxRetries) {
      try {
        logger.info(`[UploadService] Uploading ${type} (Attempt ${attempt + 1}/${maxRetries + 1})`);

        const uploadOptions: FileSystem.FileSystemUploadOptions = {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: fileType,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          parameters: {
            type,
            folder: type,
            ...params
          },
        };

        // Selalu pakai createUploadTask agar bisa di-cancel via watchdog.
        // Tanpa cancel, koneksi 4G drop = upload gantung 5 menit.
        let watchdog: WatchdogHandle | null = null;
        const uploadTask = FileSystem.createUploadTask(
          uploadUrl,
          uri,
          uploadOptions,
          (data) => {
            watchdog?.reportProgress();
            if (onProgress && data.totalBytesExpectedToSend > 0) {
              const percentage = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
              onProgress({
                total: data.totalBytesExpectedToSend,
                uploaded: data.totalBytesSent,
                percentage: Math.min(percentage, 100),
              });
            }
          },
        );
        watchdog = startUploadWatchdog(uploadTask);

        let responseBody: string | undefined;
        let responseStatus: number | undefined;
        try {
          const result = await uploadTask.uploadAsync();
          const cancellation = watchdog.wasCancelled();
          if (cancellation.cancelled) {
            throw new UploadTimeoutError(cancellation.reason);
          }
          responseBody = result?.body;
          responseStatus = result?.status;
        } finally {
          watchdog.finish();
        }

        if (responseStatus && responseStatus >= 200 && responseStatus < 300) {
          const data = JSON.parse(responseBody || '{}');
          if (data && data.url) {
            logger.info(`[UploadService] Success: ${data.url}`);
            return data.url;
          }
          throw new Error('Invalid response from upload server');
        } else {
          throw new Error(`Upload failed with status ${responseStatus}: ${responseBody}`);
        }

      } catch (error) {
        lastError = error;
        logger.error(`[UploadService] Attempt ${attempt + 1} failed:`, error);
        attempt++;

        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Enhance the error object with user-friendly message before throwing
    const friendlyError = getUserFriendlyError(lastError || new Error('Upload failed after max retries'));
    // We can attach the friendly message to the error object or throw a new one
    // For now, let's keep the original error but log the friendly one
    logger.warn(`[UploadService] Final failure: ${friendlyError.message}`);

    throw lastError || new Error('Upload failed after max retries');
  }

  /**
   * Batch upload multiple files
   */
  async uploadBatch(
    uris: string[],
    type: UploadType,
    onProgress?: (currentIndex: number, totalFiles: number, fileProgress: UploadProgress) => void
  ): Promise<string[]> {
    const results: string[] = [];
    // Sequential upload to avoid overwhelming network/server, could be parallelized with Promise.all
    for (let i = 0; i < uris.length; i++) {
      const uri = uris[i];
      const url = await this.uploadFile(uri, type, {
        onProgress: (progress) => {
            if (onProgress) {
                onProgress(i + 1, uris.length, progress);
            }
        }
      });
      results.push(url);
    }
    return results;
  }

  async deleteUploadedFile(url: string): Promise<void> {
    let token = TokenService.getToken();
    if (!token) {
      token = await SecureStore.getItemAsync('session_token');
    }

    if (!token) {
      throw new Error('Authentication required for upload cleanup');
    }

    const cleanupUrl = `${TenantService.getTenantUrl()}/api/mobile/upload?url=${encodeURIComponent(url)}`;
    const response = await fetch(cleanupUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload cleanup failed with status ${response.status}`);
    }
  }

  /**
   * Uploads a file to a specific endpoint (custom upload)
   * Useful for profile photos, chat images, etc.
   */
  async uploadCustom(
    uri: string,
    endpoint: string,
    options: {
      fieldName?: string;
      params?: Record<string, string>;
      headers?: Record<string, string>;
      maxRetries?: number;
      mimeType?: string;
      onProgress?: (progress: UploadProgress) => void;
    } = {}
  ): Promise<any> {
    const {
      fieldName = 'file',
      params = {},
      headers = {},
      maxRetries = 2,
      mimeType,
      onProgress
    } = options;

    // Optimization: Use in-memory token first
    let token = TokenService.getToken();
    if (!token) {
        token = await SecureStore.getItemAsync('session_token');
    }

    if (!token) {
      throw new Error('Authentication required for upload');
    }

    const filename = uri.split('/').pop() || 'file.bin';
    const match = /\.(\w+)$/.exec(filename);
    const calculatedFileType = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'application/octet-stream';
    const fileType = mimeType || calculatedFileType;

    // Ensure endpoint has leading slash if not absolute url (assuming relative to API_URL)
    const uploadUrl = endpoint.startsWith('http')
      ? endpoint
      : `${TenantService.getTenantUrl()}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    let attempt = 0;
    let lastError: any;

    while (attempt <= maxRetries) {
      try {
        logger.info(`[UploadService] Uploading to ${endpoint} (Attempt ${attempt + 1}/${maxRetries + 1})`);

        const uploadOptions: FileSystem.FileSystemUploadOptions = {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName,
          mimeType: fileType,
          headers: {
            Authorization: `Bearer ${token}`,
            ...headers,
          },
          parameters: params,
        };

        // Selalu pakai createUploadTask agar bisa di-cancel via watchdog.
        let watchdog: WatchdogHandle | null = null;
        const uploadTask = FileSystem.createUploadTask(
          uploadUrl,
          uri,
          uploadOptions,
          (data) => {
            watchdog?.reportProgress();
            if (onProgress && data.totalBytesExpectedToSend > 0) {
              const percentage = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
              onProgress({
                total: data.totalBytesExpectedToSend,
                uploaded: data.totalBytesSent,
                percentage: Math.min(percentage, 100),
              });
            }
          },
        );
        watchdog = startUploadWatchdog(uploadTask);

        let responseBody: string | undefined;
        let responseStatus: number | undefined;
        try {
          const result = await uploadTask.uploadAsync();
          const cancellation = watchdog.wasCancelled();
          if (cancellation.cancelled) {
            throw new UploadTimeoutError(cancellation.reason);
          }
          responseBody = result?.body;
          responseStatus = result?.status;
        } finally {
          watchdog.finish();
        }

        if (responseStatus && responseStatus >= 200 && responseStatus < 300) {
          try {
            return JSON.parse(responseBody || '{}');
          } catch {
             // Fallback for non-JSON responses if any
             return responseBody;
          }
        } else {
          throw new Error(`Upload failed with status ${responseStatus}: ${responseBody}`);
        }

      } catch (error) {
        lastError = error;
        logger.error(`[UploadService] Attempt ${attempt + 1} failed:`, error);
        attempt++;

        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error('Upload failed after max retries');
  }
}

export const uploadService = new UploadService();
