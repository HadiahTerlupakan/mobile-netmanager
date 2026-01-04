import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/Config';
import { DatabaseService } from './DatabaseService';
import { NotificationService } from './NotificationService';

// Helper for upload (outside component)
const uploadFile = async (uri: string, token: string, type: string, watermarkLines?: string[]): Promise<string | null> => {
    try {
        const formData = new FormData();
        const filename = uri.split('/').pop() || 'photo.jpg';

        // @ts-ignore
        formData.append('file', {
            uri,
            type: 'image/jpeg',
            name: filename,
        });
        formData.append('type', type);
        if (watermarkLines) {
            formData.append('watermarkLines', JSON.stringify(watermarkLines));
        }

        const res = await axios.post(`${Config.API_URL}/api/mobile/upload`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            }
        });
        return res.data?.url || null;
    } catch (error) {
        console.error('[SyncService] File upload failed:', error);
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
    console.log('[SyncService] Starting network monitoring...');

    // Subscribe to network state updates
    NetInfo.addEventListener(state => {
      console.log('[SyncService] Network state changed:', state.isConnected);
      if (state.isConnected && state.isInternetReachable) {
        SyncService.processQueue();
      }
    });
  },

  processQueue: async () => {
    console.log('[SyncService] Checking sync queue...');
    
    // Wait for database to be ready before proceeding
    if (!DatabaseService.isReady()) {
      console.log('[SyncService] Database not ready, waiting...');
      try {
        await DatabaseService.waitForReady();
      } catch (error) {
        console.error('[SyncService] Database initialization failed, skipping queue processing');
        return;
      }
    }

    const queue = await DatabaseService.getPendingQueue();

    if (queue.length === 0) {
      console.log('[SyncService] Queue is empty.');
      return;
    }

    console.log(`[SyncService] Found ${queue.length} items to sync.`);

    // Helper to get token (can't use hook here outside component)
    const token = await SecureStore.getItemAsync('session_token'); // Make sure key matches AuthContext ('session_token')

    for (const item of queue) {
      try {
        console.log(`[SyncService] Processing item ${item.id}: ${item.method} ${item.url}`);
        
        // Parse bodies
        let body = item.body ? JSON.parse(item.body) : {};
        const meta = item.meta ? JSON.parse(item.meta) : {};

        // 1. Handle Photo Uploads first if they exist in meta
        if (meta.photos && Array.isArray(meta.photos) && meta.photos.length > 0) {
            console.log(`[SyncService] Uploading ${meta.photos.length} photos...`);
            const uploadedUrls: string[] = [];
            
            for (const photoUri of meta.photos) {
                if (photoUri.startsWith('file://')) {
                    const url = await uploadFile(
                        photoUri, 
                        token || '', 
                        meta.photoType || 'general',
                        meta.watermarkLines // Pass watermark lines from meta
                    );
                    if (url) uploadedUrls.push(url);
                } else {
                    uploadedUrls.push(photoUri); // Already remote?
                }
            }

            // Update body with uploaded/remote URLs
            if (meta.targetField) {
                 if (meta.singleFile) {
                     body[meta.targetField] = uploadedUrls[0] || null;
                 } else {
                     body[meta.targetField] = uploadedUrls;
                 }
            }
        }

        let headers: any = {
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
             // Should not happen as axios throws on non-2xx usually, but just in case validateStatus is changed
            console.warn(`[SyncService] Item ${item.id} failed with status ${response.status}`);
            await DatabaseService.markAsRetry(item.id);
        }

      } catch (error: any) {
        console.error(`[SyncService] Failed to sync item ${item.id}:`, error.message);
        
        // Smart Error Handling
        if (axios.isAxiosError(error) && error.response) {
            const status = error.response.status;
            
            // 4xx Errors (Client Error) -> STOP RETRY
            // e.g. 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 422 (Validation), 409 (Conflict)
            if (status >= 400 && status < 500) {
                 console.log(`[SyncService] Client Error (${status}). Removing item ${item.id} from queue.`);
                 
                 // 1. Remove from Queue (Stop Infinite Loop)
                 await DatabaseService.removeFromQueue(item.id);

                 // 2. Notify User
                 const method = item.method.toUpperCase();
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
                 continue; // Move to next item
            }
        }
        
        // 5xx or Network Error -> Keep as RETRY
        await DatabaseService.markAsRetry(item.id);
      }
    }
    
    console.log('[SyncService] Queue processing complete.');
  }
};
