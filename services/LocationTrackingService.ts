/**
 * LocationTrackingService - Background location tracking for mobile app
 * Tracking aktif setelah check-in dan berhenti setelah check-out
 * 
 * NOTE: expo-task-manager & expo-location perlu dikonfigurasi di app.json:
 * "ios": { "infoPlist": { "UIBackgroundModes": ["location", "fetch"] } }
 * "android": { "permissions": ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION"] }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert, Linking } from 'react-native';
import { Config } from '../constants/Config';

const TASK_NAME = 'BACKGROUND_LOCATION_TASK';
const INTERVAL_MINUTES = 15;
const STORAGE_KEY_TRACKING = '@location_tracking_enabled';
const STORAGE_KEY_TOKEN = '@auth_token';
const STORAGE_KEY_PENDING = '@pending_locations';

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
    recordedAt: string;
}

// Define background task
TaskManager.defineTask(TASK_NAME, async ({ data, error }: { data: any; error: any }) => {
    if (error) {
        console.error('[LocationTracking] Background task error:', error);
        return;
    }

    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        if (locations && locations.length > 0) {
            const location = locations[0];
            const locationData: LocationData = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                altitude: location.coords.altitude,
                speed: location.coords.speed,
                heading: location.coords.heading,
                recordedAt: new Date(location.timestamp).toISOString()
            };

            await LocationTrackingService.sendLocation(locationData);
        }
    }
});

export class LocationTrackingService {
    /**
     * Start background location tracking
     * Called after successful check-in
     */
    static async startTracking(): Promise<boolean> {
        try {
            // Check permissions
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') {
                console.warn('[LocationTracking] Foreground permission denied');
                return false;
            }

            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus !== 'granted') {
                console.warn('[LocationTracking] Background permission denied');
                Alert.alert(
                    'Izin Lokasi Diperlukan',
                    'Aplikasi membutuhkan izin lokasi "Sepanjang Waktu" (Allow all the time) agar tracking berjalan di background. Mohon aktifkan di pengaturan.',
                    [
                        { text: 'Batal', style: 'cancel' },
                        { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() }
                    ]
                );
            }

            // Check if already tracking
            const isTracking = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
            if (isTracking) {
                // Verify if it's a REAL tracking session or a ghost one
                try {
                    // Try to get one location to ensure we have permissions/access
                    // If this fails with "Unavailable", it's likely just GPS off/Emulator issue, NOT a permission issue suitable for restart
                    const current = await this.getCurrentPosition();
                    
                    if (current) {
                        console.log('[LocationTracking] Tracking already active and healthy.');
                        await this.sendLocation(current);
                        return true;
                    }
                } catch (e: any) {
                    const errorMessage = e?.message || '';
                    if (errorMessage.toLowerCase().includes('unavailable')) {
                        // Location services might be off, or GPS cold start. 
                        // Do NOT restart the service, as that might fail if app is backgrounded.
                        console.warn('[LocationTracking] Location unavailable (GPS off?), but service is technically running. Keeping it.');
                        return true;
                    }
                    
                    console.warn('[LocationTracking] Ghost state detected (Permission lost?). Restarting service...', e);
                    await this.stopTracking();
                }
            }

            // Start location updates
            console.log('[LocationTracking] Starting location updates...');
            try {
                await Location.startLocationUpdatesAsync(TASK_NAME, {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: __DEV__ ? 5000 : 60 * 1000, 
                    distanceInterval: __DEV__ ? 0 : 10,
                    deferredUpdatesInterval: __DEV__ ? 5000 : 60 * 1000,
                    foregroundService: {
                        notificationTitle: 'Live Tracking Aktif',
                        notificationBody: 'Lokasi Anda sedang dipantau oleh server',
                        notificationColor: '#2563eb'
                    },
                    pausesUpdatesAutomatically: false,
                    showsBackgroundLocationIndicator: false
                });
            } catch (error) {
                if (__DEV__) {
                    console.warn('[LocationTracking] Background updates failed start (ignoring in DEV):', error);
                } else {
                    throw error;
                }
            }

            await AsyncStorage.setItem(STORAGE_KEY_TRACKING, 'true');
            console.log('[LocationTracking] Started background tracking');
            
            // Try to get initial location immediately to verify access/pipeline
            // This is critical for DEV mode where background updates might not fire if no GPS signal
            setTimeout(async () => {
                try {
                    const initialLoc = await this.getCurrentPosition();
                    if (initialLoc) {
                        console.log('[LocationTracking] Initial location sent (Force Push)');
                        await this.sendLocation(initialLoc);
                    }
                } catch (e) {
                    console.warn('[LocationTracking] Initial location force-push failed:', e);
                }
            }, 1000);

            return true;

        } catch (error: any) {
            console.error('[LocationTracking] Failed to start:', error);
            // Allow this to fail silently in logs rather than alert loops, but return false
            if (error?.message?.includes('foreground service')) {
                 console.warn('[LocationTracking] App in background? Cannot start foreground service.');
            }
            return false;
        }
    }

    /**
     * Stop background location tracking
     * Called after check-out
     */
    static async stopTracking(): Promise<void> {
        try {
            const isTracking = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
            if (isTracking) {
                await Location.stopLocationUpdatesAsync(TASK_NAME);
            }
            await AsyncStorage.setItem(STORAGE_KEY_TRACKING, 'false');
            console.log('[LocationTracking] Stopped tracking');
        } catch (error) {
            // Swallow errors here - if task not found, it's already stopped.
            console.log('[LocationTracking] Stop tracking cleanup:', error);
        }
    }

    /**
     * Check if tracking is currently active
     */
    static async isTrackingActive(): Promise<boolean> {
        try {
            return await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
        } catch {
            return false;
        }
    }

    /**
     * Send location to server
     * Called by background task
     */
    static async sendLocation(locationData: LocationData): Promise<void> {
        try {
            const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
            if (!token) {
                // Save to pending queue
                await this.savePendingLocation(locationData);
                return;
            }

            await axios.post(
                `${Config.API_URL}/api/mobile/location`,
                locationData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            console.log('[LocationTracking] Location sent successfully');

        } catch (error: any) {
            console.error('[LocationTracking] Failed to send location:', error?.message);
            
            // If server says stop tracking
            if (error?.response?.data?.shouldStopTracking) {
                await this.stopTracking();
                return;
            }
            
            // Save to pending queue for later sync
            await this.savePendingLocation(locationData);
        }
    }

    /**
     * Save location to pending queue when offline
     */
    static async savePendingLocation(locationData: LocationData): Promise<void> {
        try {
            const pending = await this.getPendingLocations();
            pending.push(locationData);
            
            // Keep only last 100 locations to prevent storage overflow
            if (pending.length > 100) {
                pending.shift();
            }
            
            await AsyncStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(pending));
        } catch (error) {
            console.error('[LocationTracking] Failed to save pending location:', error);
        }
    }

    /**
     * Get pending locations
     */
    static async getPendingLocations(): Promise<LocationData[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY_PENDING);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Sync pending locations to server
     * Called when app comes online
     */
    static async syncPendingLocations(): Promise<number> {
        try {
            const pending = await this.getPendingLocations();
            if (pending.length === 0) return 0;

            const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
            if (!token) return 0;

            await axios.post(
                `${Config.API_URL}/api/mobile/location`,
                { locations: pending },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            // Clear pending queue
            await AsyncStorage.removeItem(STORAGE_KEY_PENDING);
            console.log(`[LocationTracking] Synced ${pending.length} pending locations`);
            return pending.length;

        } catch (error) {
            console.error('[LocationTracking] Failed to sync pending locations:', error);
            return 0;
        }
    }

    /**
     * Get current position manually (for immediate update)
     */
    static async getCurrentPosition(): Promise<LocationData | null> {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                altitude: location.coords.altitude,
                speed: location.coords.speed,
                heading: location.coords.heading,
                recordedAt: new Date(location.timestamp).toISOString()
            };
        } catch (error) {
            // Use warn instead of error to avoid RedBox in Simulator/Emulator if it's a known issue
            console.warn('[LocationTracking] Failed to get current position:', error);
            
            if (__DEV__) {
                console.warn('[LocationTracking] DEV MODE: Using Mock Location (Jakarta) due to failure');
                return {
                    latitude: -6.2088,
                    longitude: 106.8456,
                    accuracy: 10,
                    altitude: 0,
                    speed: 0,
                    heading: 0,
                    recordedAt: new Date().toISOString()
                };
            }
            return null;
        }
    }
}
