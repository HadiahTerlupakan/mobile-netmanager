import NetInfo from '@react-native-community/netinfo';
import axios from 'axios'; // Keep for isAxiosError check
import pLimit from 'p-limit';
import { Config } from '../constants/Config';
import { DatabaseService, SyncQueueItem } from './DatabaseService';
import * as SecureStore from 'expo-secure-store'; // Ensure SyncQueueItem is exported
import { NotificationService } from './NotificationService';
import { logger } from '../utils/logger';
import api from './api';

// Helper for upload (outside component)
const uploadFile = async (uri: string, type: string, watermarkLines?: string[]): Promise<string | null> => {
    try {
        const formData = new FormData();
        const filename = uri.split('/').pop() || 'photo.jpg';

        formData.append('file', {
            uri,
            type: 'image/jpeg',
            name: filename,
        } as any); // React Native FormData handles file objects differently than web

        formData.append('type', type);
        if (watermarkLines) {
            formData.append('watermarkLines', JSON.stringify(watermarkLines));
        }

        const res = await api.post('/api/mobile/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            // @ts-ignore
            skipGlobalAuthHandler: true
        });
        return res.data?.url || null;
    } catch (error) {
        logger.error('[SyncService] File upload failed:', error);
        return null;
    }
};

export const SyncService = {
  isMonitoring: false,

  isOnline: async () => {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable;
  },

  startMonitoring: () => {
    if (SyncService.isMonitoring) return;

    SyncService.isMonitoring = true;
    logger.sync('[SyncService] Starting network monitoring...');

    // Subscribe to network state updates
    NetInfo.addEventListener(state => {
      logger.sync('[SyncService] Network state changed:', state.isConnected);
      if (state.isConnected && state.isInternetReachable) {
        SyncService.processQueue();
      }
    });
  },

  processQueue: async () => {
    logger.sync('[SyncService] Checking sync queue...');

    // Wait for database to be ready before proceeding
    if (!DatabaseService.isReady()) {
      logger.sync('[SyncService] Database not ready, waiting...');
      try {
        await DatabaseService.waitForReady();
      } catch (error) {
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

    // Helper to get token (can't use hook here outside component)
    const token = await SecureStore.getItemAsync('session_token');

    // CONCURRENCY LIMIT
    // 3 parallel requests is safe for most mobile devices/networks
    const limit = pLimit(3);

    // Process all items with concurrency limit
    const promises = queue.map(item => limit(() => SyncService.processQueueItem(item, token)));

    await Promise.allSettled(promises);

    logger.sync('[SyncService] Queue processing batch complete.');
  },

  /**
   * Process a single queue item with retry logic
   */
  processQueueItem: async (item: SyncQueueItem, token: string | null) => {
      try {
        console.log(`[SyncService] Processing item ${item.id}: ${item.method} ${item.url}`);

        const body = item.body ? JSON.parse(item.body) : {};
        const meta = item.meta ? JSON.parse(item.meta) : {};

        // 1. Legacy: Support Photo Uploads (Parallel if multiple)
        if (meta.photos && Array.isArray(meta.photos) && meta.photos.length > 0) {
            console.log(`[SyncService] Uploading ${meta.photos.length} photos...`);

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
            console.log(`[SyncService] Processing photoMap for item ${item.id}...`);

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
          url: item.url.startsWith('http') ? item.url : `${Config.API_URL}${item.url}`,
          data: body,
          headers: headers
        });

        if (response.status >= 200 && response.status < 300) {
          console.log(`[SyncService] Item ${item.id} synced successfully.`);
          await DatabaseService.removeFromQueue(item.id);
        } else {
            console.warn(`[SyncService] Item ${item.id} failed with status ${response.status}`);
            await DatabaseService.markAsRetry(item.id);
        }

      } catch (error: any) {
        console.error(`[SyncService] Failed to sync item ${item.id}:`, error.message);
        
        // Smart Error Handling
        if (axios.isAxiosError(error) && error.response) {
            const status = error.response.status;
            
            // 4xx Errors -> Permanent Failure -> Remove from Queue
            if (status >= 400 && status < 500) {
                 console.log(`[SyncService] Client Error (${status}). Removing item ${item.id}.`);
                 
                 await DatabaseService.removeFromQueue(item.id);

                 // Notify User
                 const urlPart = item.url.split('/').pop() || 'Unknown';
                 const errorMsg = error.response.data?.message || error.message || 'Data tidak valid';
                 
                 let title = 'Gagal Sinkronisasi Data';
                 if (urlPart.includes('masuk')) title = 'Gagal Sync Barang Masuk';
                 else if (urlPart.includes('keluar')) title = 'Gagal Sync Barang Keluar';
                 else if (urlPart.includes('check-in')) title = 'Gagal Sync Absensi';

                 await NotificationService.showLocalNotification(
                     title,
                     `Data dibatalkan: ${errorMsg}`
                 );
                 return;
            }
        }
        
        // 5xx or Network Error -> Retry logic could be expanded here (e.g. exponential backoff delay)
        // For now, DatabaseService.markAsRetry simply keeps it in queue for next network event
        await DatabaseService.markAsRetry(item.id);
      }
  }
};
