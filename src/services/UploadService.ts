import { Config } from '@/constants/Config';
import { logger } from '@/utils/logger';
import { getUserFriendlyError } from '@/utils/errorHandling';
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
    const token = await SecureStore.getItemAsync('session_token');

    if (!token) {
      throw new Error('Authentication required for upload');
    }

    const filename = uri.split('/').pop() || 'photo.jpg';
    const fileType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const uploadUrl = `${Config.API_URL}/api/mobile/upload`;

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

        let responseBody: string | undefined;
        let responseStatus: number | undefined;

        if (onProgress) {
          const uploadTask = FileSystem.createUploadTask(
            uploadUrl,
            uri,
            uploadOptions,
            (data) => {
              if (data.totalBytesExpectedToSend > 0) {
                const percentage = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
                onProgress({
                  total: data.totalBytesExpectedToSend,
                  uploaded: data.totalBytesSent,
                  percentage: Math.min(percentage, 100) // Ensure it doesn't exceed 100
                });
              }
            }
          );
          const result = await uploadTask.uploadAsync();
          responseBody = result?.body;
          responseStatus = result?.status;
        } else {
          const result = await FileSystem.uploadAsync(uploadUrl, uri, uploadOptions);
          responseBody = result.body;
          responseStatus = result.status;
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
      onProgress?: (progress: UploadProgress) => void;
    } = {}
  ): Promise<any> {
    const {
      fieldName = 'file',
      params = {},
      headers = {},
      maxRetries = 2,
      onProgress
    } = options;

    const token = await SecureStore.getItemAsync('session_token');

    if (!token) {
      throw new Error('Authentication required for upload');
    }

    const filename = uri.split('/').pop() || 'file.bin';
    const match = /\.(\w+)$/.exec(filename);
    const fileType = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'application/octet-stream';

    // Ensure endpoint has leading slash if not absolute url (assuming relative to API_URL)
    const uploadUrl = endpoint.startsWith('http')
      ? endpoint
      : `${Config.API_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

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

        let responseBody: string | undefined;
        let responseStatus: number | undefined;

        if (onProgress) {
          const uploadTask = FileSystem.createUploadTask(
            uploadUrl,
            uri,
            uploadOptions,
            (data) => {
              if (data.totalBytesExpectedToSend > 0) {
                const percentage = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
                onProgress({
                  total: data.totalBytesExpectedToSend,
                  uploaded: data.totalBytesSent,
                  percentage: Math.min(percentage, 100)
                });
              }
            }
          );
          const result = await uploadTask.uploadAsync();
          responseBody = result?.body;
          responseStatus = result?.status;
        } else {
           const result = await FileSystem.uploadAsync(uploadUrl, uri, uploadOptions);
           responseBody = result.body;
           responseStatus = result.status;
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
