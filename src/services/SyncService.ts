import NetInfo from '@react-native-community/netinfo';
import { isAxiosError } from 'axios';
import pLimit from 'p-limit';
import { DatabaseService, SyncQueueItem } from './DatabaseService';
import * as SecureStore from 'expo-secure-store'; // Ensure SyncQueueItem is exported
import { NotificationService } from './NotificationService';
import { logger } from '../utils/logger';
import { uploadService, UploadType } from './UploadService';
import { eventManager } from '@/utils/EventManager';
import { AttendanceTelemetryService } from './AttendanceTelemetryService';
import { buildAttendanceIdempotencyHeaders } from '@/utils/attendanceIdempotency';
import api from './api';
import { extractApiErrorMessage } from '@/utils/errorHandling';

const SYNC_REQUEST_TIMEOUT_MS = 15000;
const PERMANENT_SYNC_FAILURE_STATUSES = new Set([400, 404, 409, 422]);

type SyncQueueMeta = {
    photos?: string[];
    photoType?: string;
    watermarkLines?: string[];
    targetField?: string;
    singleFile?: boolean;
    photoMap?: Record<string, string>;
    requestId?: string;
};

class SyncQueuePayloadError extends Error {}

const parseQueuePayload = <T extends Record<string, unknown>>(
    rawValue: string | null | undefined,
    itemId: number,
    fieldName: 'body' | 'meta'
): T => {
    if (!rawValue) {
        return {} as T;
    }

    try {
        const parsed = JSON.parse(rawValue) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as T;
        }

        throw new Error(`${fieldName} is not an object`);
    } catch (error) {
        throw new SyncQueuePayloadError(
            `Invalid queued ${fieldName} for item ${itemId}: ${error instanceof Error ? error.message : 'unknown parse error'}`
        );
    }
};

const cloneQueuePayload = <T extends Record<string, unknown>>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;

const isPermanentSyncFailure = (status: number): boolean =>
    PERMANENT_SYNC_FAILURE_STATUSES.has(status);

// Helper for upload (outside component)
const uploadFile = async (uri: string, type: string, watermarkLines?: string[]): Promise<string | null> => {
    try {
        const params: Record<string, string> = {};
        if (watermarkLines) {
            params.watermarkLines = JSON.stringify(watermarkLines);
        }

        return await uploadService.uploadFile(uri, type as UploadType, {
            params
        });
    } catch (error) {
        logger.error('[SyncService] File upload failed:', error);
        return null;
    }
};

export const SyncService = {
  isMonitoring: false,
  isProcessing: false,
  processTimeout: null as ReturnType<typeof setTimeout> | null,

  isOnline: async () => {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable;
  },

  startMonitoring: () => {
    if (SyncService.isMonitoring) return;

    SyncService.isMonitoring = true;
    logger.sync('[SyncService] Starting network monitoring...');

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      logger.sync('[SyncService] Network state changed:', state.isConnected);
      if (state.isConnected && state.isInternetReachable) {
        // Debounce sync processing
        if (SyncService.processTimeout) {
            clearTimeout(SyncService.processTimeout);
        }
        SyncService.processTimeout = setTimeout(() => {
            SyncService.processQueue();
        }, 2000);
      }
    });

    eventManager.addListener('sync', null, unsubscribe);
  },

  stopMonitoring: () => {
    if (!SyncService.isMonitoring) return;

    SyncService.isMonitoring = false;
    if (SyncService.processTimeout) {
        clearTimeout(SyncService.processTimeout);
        SyncService.processTimeout = null;
    }

    eventManager.removeAllListeners('sync');
    logger.sync('[SyncService] Stopped network monitoring.');
  },

  processQueue: async () => {
    if (SyncService.isProcessing) {
        logger.sync('[SyncService] Queue already processing, skipping...');
        return;
    }

    SyncService.isProcessing = true;
    logger.sync('[SyncService] Checking sync queue...');

    try {
        // Wait for database to be ready before proceeding
        if (!DatabaseService.isReady()) {
          logger.sync('[SyncService] Database not ready, waiting...');
          try {
            await DatabaseService.waitForReady();
          } catch (error) {
            logger.error('[SyncService] Database initialization failed, skipping queue processing', error);
            return;
          }
        }

        const queue = await DatabaseService.getPendingQueue();

        if (queue.length === 0) {
          logger.sync('[SyncService] Queue is empty.');
          return;
        }

        logger.sync(`[SyncService] Found ${queue.length} items to sync.`);

        // Prioritize queue items
        const prioritizedQueue = SyncService.prioritizeQueue(queue);

        // Adaptive concurrency based on queue size
        const concurrency = SyncService.getOptimalConcurrency(prioritizedQueue.length);
        logger.sync(`[SyncService] Processing with concurrency: ${concurrency}`);

        // Helper to get token (can't use hook here outside component)
        const token = await SecureStore.getItemAsync('session_token');
        if (!token) {
          logger.warn('[SyncService] Skipping queue processing because there is no active session token.');
          return;
        }

        const limit = pLimit(concurrency);

        // Process all items with concurrency limit
        const promises = prioritizedQueue.map(item => limit(() => SyncService.processQueueItem(item, token)));

        await Promise.allSettled(promises);

        logger.sync('[SyncService] Queue processing batch complete.');
    } catch (error) {
        logger.error('[SyncService] Global error during processing:', error);
    } finally {
        SyncService.isProcessing = false;
    }
  },

  /**
   * Prioritize queue items based on type/importance
   */
  prioritizeQueue: (queue: SyncQueueItem[]): SyncQueueItem[] => {
      // Priority: Work orders > Attendance > Inventory > Others
      const priorityMap: Record<string, number> = {
          'work-order': 1,
          'check-in': 2,
          'check-out': 2,
          'absensi': 2,
          'barang-masuk': 3,
          'barang-keluar': 3,
          'inventory': 3,
          'default': 4
      };

      return [...queue].sort((a, b) => {
          const getPriority = (url: string) => {
              for (const [key, priority] of Object.entries(priorityMap)) {
                  if (url.includes(key)) return priority;
              }
              return priorityMap.default;
          };

          const priorityA = getPriority(a.url);
          const priorityB = getPriority(b.url);

          if (priorityA !== priorityB) {
              return priorityA - priorityB;
          }

          // Same priority: sort by created date (FIFO)
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  },

  /**
   * Determine optimal concurrency based on queue size
   */
  getOptimalConcurrency: (queueSize: number): number => {
      // Small queue: process quickly
      if (queueSize <= 3) return 2;

      // Medium queue: balanced
      if (queueSize <= 10) return 3;

      // Large queue: limit to prevent overwhelming network/device
      return 4;
  },

  /**
   * Process a single queue item with retry logic (Exponential Backoff)
   */
  processQueueItem: async (item: SyncQueueItem, token: string | null) => {
      const MAX_RETRIES = 3;
      let attempt = 0;
      let baseBody: Record<string, unknown>;
      let baseMeta: SyncQueueMeta;

      try {
          baseBody = parseQueuePayload<Record<string, unknown>>(item.body, item.id, 'body');
          baseMeta = parseQueuePayload<SyncQueueMeta>(item.meta, item.id, 'meta');
      } catch (error) {
          logger.error('[SyncService] Invalid queued payload, removing item:', error);
          await DatabaseService.removeFromQueue(item.id);
          await NotificationService.showLocalNotification(
              'Data Antrean Rusak',
              'Ada data offline yang tidak bisa diproses dan dibatalkan.'
          );
          return;
      }

      while (attempt < MAX_RETRIES) {
          let requestId: string | undefined;
          const attendanceReplay = item.url.includes('/attendance/');

          try {
            logger.sync(`Processing item ${item.id} (Attempt ${attempt + 1}/${MAX_RETRIES}): ${item.method} ${item.url}`);

            const body = cloneQueuePayload(baseBody);
            const meta = cloneQueuePayload(baseMeta);
            requestId = typeof body.requestId === 'string' ? body.requestId : (typeof meta.requestId === 'string' ? meta.requestId : undefined);

            // 1. Legacy: Support Photo Uploads (Parallel if multiple)
            if (meta.photos && Array.isArray(meta.photos) && meta.photos.length > 0) {
                logger.sync(`Uploading ${meta.photos.length} photos...`);

                const uploadPromises = meta.photos.map(async (photoUri: string) => {
                     if (photoUri.startsWith('file://')) {
                        return await uploadFile(photoUri, meta.photoType || 'general', meta.watermarkLines);
                    } else {
                        return photoUri;
                    }
                });

                const uploadedUrls = (await Promise.all(uploadPromises)).filter((url): url is string => url !== null);

                if (meta.targetField) {
                     if (meta.singleFile) {
                         body[meta.targetField] = uploadedUrls[0] || null;
                     } else {
                         body[meta.targetField] = uploadedUrls;
                     }
                }
            }

            // New: Support photoMap for specific fields mapping (Parallelized)
            if (meta.photoMap && typeof meta.photoMap === 'object') {
                logger.sync(`Processing photoMap for item ${item.id}...`);

                const photoEntries = Object.entries(meta.photoMap);
                const uploadPromises = photoEntries.map(async ([field, uri]) => {
                    if (typeof uri === 'string' && uri.startsWith('file://')) {
                        const url = await uploadFile(uri, meta.photoType || 'general', meta.watermarkLines);
                        if (!url) throw new Error(`Gagal upload foto untuk field ${field}`);
                        return { field, url };
                    }
                    return null;
                });

                const results = await Promise.all(uploadPromises);

                results.forEach(result => {
                    if (result) {
                        body[result.field] = result.url;
                    }
                });
            }

            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };

            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }

            const idempotencyHeaders = buildAttendanceIdempotencyHeaders(requestId);
            if (idempotencyHeaders) {
              headers['Idempotency-Key'] = idempotencyHeaders['Idempotency-Key'];
            }

            const response = await api.request({
              method: item.method,
              url: item.url,
              data: body,
              headers: headers,
              timeout: SYNC_REQUEST_TIMEOUT_MS,
              skipGlobalAuthHandler: true,
              skipRetry: true,
            });

            if (response.status >= 200 && response.status < 300) {
              logger.sync(`Item ${item.id} synced successfully.`);
              await DatabaseService.removeFromQueue(item.id);
              if (attendanceReplay) {
                AttendanceTelemetryService.track('attendance_replay_succeeded', {
                  requestId,
                  endpoint: item.url,
                  networkState: 'online',
                });
              }
              return; // Success, exit function
            } else {
                logger.warn(`[SyncService] Item ${item.id} failed with status ${response.status}`);
                throw new Error(`Status ${response.status}`);
            }

          } catch (error) {
            const backendMessage = isAxiosError(error) ? extractApiErrorMessage(error.response?.data) : undefined;
            const errorMessage = backendMessage || (error instanceof Error ? error.message : 'Unknown error');

            // Smart Error Handling
            if (isAxiosError(error) && error.response) {
                const status = error.response.status;

                if (isPermanentSyncFailure(status)) {
                     logger.sync(`Client Error (${status}). Removing item ${item.id}.`);

                     if (attendanceReplay) {
                        if (status === 409) {
                          AttendanceTelemetryService.track('attendance_duplicate_blocked', {
                            requestId,
                            endpoint: item.url,
                            reason: 'Conflict/duplicate detected during replay',
                          });
                        } else {
                          AttendanceTelemetryService.track('attendance_replay_failed', {
                            requestId,
                            endpoint: item.url,
                            reason: `Client error ${status}`,
                          });
                        }
                     }

                     await DatabaseService.removeFromQueue(item.id);

                     // Notify User
                     const urlPart = item.url.split('/').pop() || 'Unknown';
                     const errorMsg = backendMessage || errorMessage || 'Data tidak valid';

                     let title = 'Gagal Sinkronisasi Data';
                     if (urlPart.includes('masuk')) title = 'Gagal Sync Barang Masuk';
                     else if (urlPart.includes('keluar')) title = 'Gagal Sync Barang Keluar';
                     else if (urlPart.includes('check-in')) title = 'Gagal Sync Absensi';

                     await NotificationService.showLocalNotification(
                         title,
                         `Data dibatalkan: ${errorMsg}`
                     );
                     return; // Permanent failure, exit
                }
            }

            // For other errors (network, 5xx), retry
            attempt++;
            logger.error(`[SyncService] Attempt ${attempt} failed for item ${item.id}:`, errorMessage);

            if (attempt < MAX_RETRIES) {
                // Exponential Backoff: 1s, 2s, 4s...
                const delay = Math.pow(2, attempt) * 1000;
                logger.sync(`Retrying item ${item.id} in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Max retries reached, mark as RETRY in DB for next batch
                logger.warn(`[SyncService] Max retries reached for item ${item.id}. Marking for later.`);
                await DatabaseService.markAsRetry(item.id);
                if (attendanceReplay) {
                  AttendanceTelemetryService.track('attendance_replay_failed', {
                    requestId,
                    endpoint: item.url,
                    reason: 'Max retries reached',
                    retryCount: MAX_RETRIES,
                  });
                }
            }
          }
      }
  }
};
