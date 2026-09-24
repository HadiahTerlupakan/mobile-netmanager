import { getUserFriendlyError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { TokenService } from '@/services/TokenService';
import { RefreshTokenService } from '@/services/RefreshTokenService';
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
  | 'marketing' // Added for Canvasing
  | 'presurvei'; // Foto bukti kegiatan presurvei

export interface UploadProgress {
  total: number;
  uploaded: number;
  percentage: number;
}

const UPLOAD_HARD_TIMEOUT_MS = HTTP_TIMEOUTS.long;
const UPLOAD_NO_PROGRESS_TIMEOUT_MS = 30_000;
const TOKEN_REFRESH_MARGIN_MS = 60_000;

async function resolveUploadToken(): Promise<string> {
  let token = TokenService.getToken();
  if (!token) {
    token = await SecureStore.getItemAsync('session_token');
    if (token) {
      TokenService.setToken(token);
    }
  }

  const expiryMs = TokenService.getExpiry();
  const needsRefresh =
    !token || (expiryMs !== null && expiryMs <= Date.now() + TOKEN_REFRESH_MARGIN_MS);

  if (needsRefresh) {
    logger.auth('[UploadService] Access token near/past expiry — refreshing before upload');
    const refreshed = await RefreshTokenService.refreshAccessToken();
    if (refreshed) {
      return refreshed;
    }
    if (!token) {
      throw new Error('Authentication required for upload');
    }
  }

  if (!token) {
    throw new Error('Authentication required for upload');
  }
  return token;
}

async function refreshTokenAfterUnauthorized(): Promise<string | null> {
  logger.auth('[UploadService] Upload got 401 — refreshing access token');
  return RefreshTokenService.refreshAccessToken();
}

function isUnauthorizedUploadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /status 401\b/.test(error.message);
}

/** Nama galat habis waktu unggah; pemanggil memakainya untuk memutuskan antre. */
export const NAMA_GALAT_UNGGAH_HABIS_WAKTU = 'UploadTimeoutError';

class UploadTimeoutError extends Error {
  constructor(reason: 'hard' | 'no-progress') {
    super(
      reason === 'hard'
        ? 'Upload melebihi batas waktu 60 detik. Periksa koneksi dan coba lagi.'
        : 'Upload terhenti — tidak ada progres selama 30 detik. Periksa koneksi.',
    );
    this.name = NAMA_GALAT_UNGGAH_HABIS_WAKTU;
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
    let token = await resolveUploadToken();
    let didAuthRetry = false;

    const filename = uri.split('/').pop() || 'photo.jpg';
    const fileType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const uploadUrl = `${TenantService.getTenantUrl()}/api/mobile/upload`;

    let attempt = 0;
    let lastError: unknown;

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

        if (!didAuthRetry && isUnauthorizedUploadError(error)) {
          const refreshed = await refreshTokenAfterUnauthorized();
          if (refreshed) {
            token = refreshed;
            didAuthRetry = true;
            continue;
          }
        }

        attempt++;
        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    const friendlyError = getUserFriendlyError(
      lastError instanceof Error ? lastError : new Error('Upload failed after max retries'),
    );
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
    let token = await resolveUploadToken();
    const cleanupUrl = `${TenantService.getTenantUrl()}/api/mobile/upload?url=${encodeURIComponent(url)}`;

    let response = await fetch(cleanupUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      const refreshed = await refreshTokenAfterUnauthorized();
      if (!refreshed) {
        throw new Error(`Upload cleanup failed with status ${response.status}`);
      }
      token = refreshed;
      response = await fetch(cleanupUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

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

    let token = await resolveUploadToken();
    let didAuthRetry = false;

    const filename = uri.split('/').pop() || 'file.bin';
    const match = /\.(\w+)$/.exec(filename);
    const calculatedFileType = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'application/octet-stream';
    const fileType = mimeType || calculatedFileType;

    const uploadUrl = endpoint.startsWith('http')
      ? endpoint
      : `${TenantService.getTenantUrl()}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    let attempt = 0;
    let lastError: unknown;

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
             return responseBody;
          }
        } else {
          throw new Error(`Upload failed with status ${responseStatus}: ${responseBody}`);
        }

      } catch (error) {
        lastError = error;
        logger.error(`[UploadService] Attempt ${attempt + 1} failed:`, error);

        if (!didAuthRetry && isUnauthorizedUploadError(error)) {
          const refreshed = await refreshTokenAfterUnauthorized();
          if (refreshed) {
            token = refreshed;
            didAuthRetry = true;
            continue;
          }
        }

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
