import axios from 'axios';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Config } from '../constants/Config';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/DatabaseService';
import { SyncService } from '../services/SyncService';

interface MutationOptions {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  onSuccess?: (data: any, isOffline: boolean) => void;
  onError?: (error: any) => void;
  /** Optional: for testing, skip Alert */
  silent?: boolean;
}

// Helper function for showing alerts - can be mocked in tests
export const showMutationAlert = (title: string, message: string) => {
  Alert.alert(title, message);
};

// Helper for uploading files (same as SyncService)
const uploadFile = async (uri: string, token: string, type: string, watermarkLines?: string[]): Promise<string | null> => {
    try {
        const formData = new FormData();
        const filename = uri.split('/').pop() || 'photo.jpg';

        // @ts-ignore - React Native specific FormData append
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
        console.error('[useOfflineMutation] File upload failed:', error);
        return null;
    }
};

export const useOfflineMutation = () => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (variables: any, options: MutationOptions) => {
    setIsLoading(true);
    try {
      // 1. Get Location (Tikor) - Attempt to get GPS coordinates
      let location = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
           // Use Promise.race to enforce timeout
           const locPromise = Location.getCurrentPositionAsync({ 
             accuracy: Location.Accuracy.Balanced
           });
           
           const timeoutPromise = new Promise<null>((resolve) => 
               setTimeout(() => resolve(null), 5000)
           );

           location = await Promise.race([locPromise, timeoutPromise]) as Location.LocationObject | null;
        }
      } catch (e) {
        console.log('[useOfflineMutation] Failed to access location:', e);
      }

      const meta = {
        latitude: location?.coords.latitude || null,
        longitude: location?.coords.longitude || null,
        capturedAt: new Date().toISOString(),
        ...variables.meta // Allow overriding or adding extra meta
      };

      // 2. Check Connection
      const isOnline = await SyncService.isOnline();

      // Prepare payload - merge location if expected by backend?
      // User asked for "tikor". We send it in body if possible, AND keep in meta.
      let payload = {
          ...variables,
          latitude: meta.latitude,
          longitude: meta.longitude,
          _offline_meta: meta // Optional: backend might ignore this
      };

      if (isOnline) {
        // --- ONLINE MODE ---
        console.log('[useOfflineMutation] Online. Submitting directly:', options.url);
        
        // Upload photos first if they exist in meta
        if (meta.photos && Array.isArray(meta.photos) && meta.photos.length > 0) {
            console.log(`[useOfflineMutation] Uploading ${meta.photos.length} photos...`);
            const uploadedUrls: string[] = [];
            
            for (const photoUri of meta.photos) {
                if (photoUri.startsWith('file://') || photoUri.startsWith('/')) {
                    const url = await uploadFile(
                        photoUri, 
                        token || '', 
                        meta.photoType || 'general',
                        meta.watermarkLines
                    );
                    if (url) uploadedUrls.push(url);
                } else if (photoUri.startsWith('http')) {
                    uploadedUrls.push(photoUri); // Already remote URL
                }
            }

            // Update payload with uploaded URLs
            if (meta.targetField) {
                if (meta.singleFile) {
                    payload[meta.targetField as keyof typeof payload] = uploadedUrls[0] || null;
                } else {
                    payload[meta.targetField as keyof typeof payload] = uploadedUrls as any;
                }
            }
            
            console.log(`[useOfflineMutation] Photos uploaded:`, uploadedUrls);

            // SAFETY CHECK: If we had photos to upload but none succeeded, DO NOT PROCEED.
            // This prevents sending empty photos[] to backend which causes "Foto wajib diupload" error.
            if (meta.photos.length > 0 && uploadedUrls.length === 0) {
                 throw new Error('Gagal mengupload foto bukti. Mohon periksa koneksi internet Anda dan coba lagi.');
            }
        }
        
        const response = await axios({
            method: options.method,
            url: options.url.startsWith('http') ? options.url : `${Config.API_URL}${options.url}`,
            data: payload,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        options.onSuccess?.(response.data, false);

      } else {
        // --- OFFLINE MODE ---
        console.log('[useOfflineMutation] Offline. Adding to queue:', options.url);
        
        await DatabaseService.addToQueue(
            options.url,
            options.method,
            payload,
            meta
        );

        if (!options.silent) {
          showMutationAlert(
              'Disimpan Offline',
              'Tidak ada koneksi internet. Data (termasuk Lokasi) disimpan di HP dan akan diupload otomatis saat online.'
          );
        }

        // Simulate success response structure
        options.onSuccess?.({ success: true, offline: true, message: 'Saved to queue' }, true);
      }

    } catch (error: any) {
      console.error('[useOfflineMutation] Mutation failed:', error);
      
      // If error is network related (e.g. timeout), maybe fallback to offline queue?
      // Axios network error code is usually "ERR_NETWORK"
      if (error.code === 'ERR_NETWORK' || !error.response) {
         console.log('[useOfflineMutation] Network error detected during online attempt. Fallback to queue.');
          // TODO: Refactor the offline logic to be reusable here
          // For now, simple error alert. 
          // Ideally we should prompt user: "Network failed. Save offline?"
      }
      
      options.onError?.(error);
      if (!options.silent) {
        showMutationAlert('Error', error.response?.data?.error || 'Gagal menyimpan data.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
};
