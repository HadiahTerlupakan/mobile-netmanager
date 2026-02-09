import NetInfo from '@react-native-community/netinfo';
import axios, { isAxiosError } from 'axios'; // Keep for isAxiosError check
import pLimit from 'p-limit';
import { TenantService } from './TenantService';
import { DatabaseService, SyncQueueItem } from './DatabaseService';
import * as SecureStore from 'expo-secure-store'; // Ensure SyncQueueItem is exported
import { NotificationService } from './NotificationService';
import { logger } from '../utils/logger';
import { uploadService, UploadType } from './UploadService';
import { eventManager } from '@/utils/EventManager';

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
          } catch {
            logger.error('[SyncService] Database initialization failed, skipping queue processing');
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

      while (attempt < MAX_RETRIES) {
          try {
            logger.sync(`Processing item ${item.id} (Attempt ${attempt + 1}/${MAX_RETRIES}): ${item.method} ${item.url}`);

            const body = item.body ? JSON.parse(item.body) : {};
            const meta = item.meta ? JSON.parse(item.meta) : {};

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

            const response = await axios({
              method: item.method,
              url: item.url.startsWith('http') ? item.url : `${TenantService.getTenantUrl()}${item.url}`,
              data: body,
              headers: headers
            });

            if (response.status >= 200 && response.status < 300) {
              logger.sync(`Item ${item.id} synced successfully.`);
              await DatabaseService.removeFromQueue(item.id);
              return; // Success, exit function
            } else {
                logger.warn(`[SyncService] Item ${item.id} failed with status ${response.status}`);
                throw new Error(`Status ${response.status}`);
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Smart Error Handling
            if (isAxiosError(error) && error.response) {
                const status = error.response.status;

                // 4xx Errors -> Permanent Failure -> Remove from Queue
                if (status >= 400 && status < 500) {
                     logger.sync(`Client Error (${status}). Removing item ${item.id}.`);

                     await DatabaseService.removeFromQueue(item.id);

                     // Notify User
                     const urlPart = item.url.split('/').pop() || 'Unknown';
                     const errorMsg = error.response.data?.message || error.response.data?.error || errorMessage || 'Data tidak valid';

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
            }
          }
      }
  }
};
