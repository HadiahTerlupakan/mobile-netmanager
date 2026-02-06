/**
 * LocationTrackingService - Background location tracking for mobile app
 * Tracking aktif setelah check-in dan berhenti setelah check-out
 * 
 * NOTE: expo-task-manager & expo-location perlu dikonfigurasi di app.json:
 * "ios": { "infoPlist": { "UIBackgroundModes": ["location", "fetch"] } }
 * "android": { "permissions": ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION"] }
 */

import { isAxiosError } from 'axios';
import { Storage } from '@/utils/storage';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Alert, Linking } from 'react-native';
import { logger } from '../utils/logger';
import api from './api';

const TASK_NAME = 'BACKGROUND_LOCATION_TASK';
const STORAGE_KEY_TRACKING = '@location_tracking_enabled';
const STORAGE_KEY_TOKEN = 'session_token'; // Must match AuthContext key
const STORAGE_KEY_PENDING = '@pending_locations';
const STORAGE_KEY_LAST_SENT = '@last_sent_location'; // New key for movement check

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
    batteryLevel?: number;
    isMoving?: boolean;
    recordedAt: string;
}

// Helper: Haversine Distance Calculation (in Meters)
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in meters
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}



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
                logger.warn('[LocationTracking] Foreground permission denied');
                return false;
            }

            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus !== 'granted') {
                logger.warn('[LocationTracking] Background permission denied');
                Alert.alert(
                    'Izin Lokasi Diperlukan',
                    'Aplikasi membutuhkan izin lokasi "Sepanjang Waktu" (Allow all the time) agar tracking berjalan di background. Mohon aktifkan di pengaturan.',
                    [
                        { text: 'Batal', style: 'cancel' },
                        { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() }
                    ]
                );
            }

            // Check Battery Level for Adaptive Interval
            let batteryLevel = 1.0;
            try {
                batteryLevel = await Battery.getBatteryLevelAsync();
            } catch (e) {
                logger.warn('[LocationTracking] Battery check failed, assuming full', e);
            }

            // Dynamic Interval Logic
            let timeInterval = 10 * 60 * 1000; // Normal: 10 mins (Audit recommendation)
            let distanceInterval = 50; // Normal: 50m

            const isLowBattery = batteryLevel < 0.20 && batteryLevel !== -1;
            const isGoodBattery = batteryLevel > 0.50;

            if (isLowBattery) {
                // Low Battery (<20%): Less frequent (30 mins)
                logger.info('[LocationTracking] Low Battery Mode (<20%). Reducing frequency.');
                timeInterval = 30 * 60 * 1000;
                distanceInterval = 200;
            } else if (isGoodBattery) {
                 // Good Battery (>50%): More frequent (5 mins)
                 timeInterval = 5 * 60 * 1000;
                 distanceInterval = 30;
            }

            if (__DEV__) {
                logger.info('[LocationTracking] DEV MODE: Using fast intervals');
                timeInterval = 30000;
                distanceInterval = 10;
            }

            // Check if already tracking
            const isTracking = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
            if (isTracking) {
                try {
                    // Update options if already running (re-registering updates options)
                    await Location.startLocationUpdatesAsync(TASK_NAME, {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval,
                        distanceInterval,
                        deferredUpdatesInterval: 15 * 60 * 1000,
                        foregroundService: {
                            notificationTitle: 'Mode Absensi Aktif',
                            notificationBody: 'Jam kerja Anda sedang berjalan',
                            notificationColor: '#ffffff'
                        },
                        pausesUpdatesAutomatically: true,
                        showsBackgroundLocationIndicator: false,
                        activityType: Location.ActivityType.AutomotiveNavigation
                    });

                    const current = await this.getCurrentPosition();
                    if (current) {
                        logger.info('[LocationTracking] Tracking updated. Current loc:', current.latitude, current.longitude);
                         await this.sendLocation(current);
                        return true;
                    }
                } catch (e) {
                    const errorMessage = (e as Error)?.message || '';
                    if (errorMessage.toLowerCase().includes('unavailable')) {
                        logger.warn('[LocationTracking] Location unavailable (GPS off?); Service running.');
                        return true;
                    }
                    logger.warn('[LocationTracking] Ghost state detected. Restarting service...', e);
                    await this.stopTracking();
                }
            }

            // Start location updates with adaptive options
            logger.info(`[LocationTracking] Starting updates with interval: ${timeInterval/60000}m, distance: ${distanceInterval}m`);
            try {
                await Location.startLocationUpdatesAsync(TASK_NAME, {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval,
                    distanceInterval,
                    deferredUpdatesInterval: 15 * 60 * 1000,
                    foregroundService: {
                        notificationTitle: 'Mode Absensi Aktif',
                        notificationBody: 'Jam kerja Anda sedang berjalan',
                        notificationColor: '#ffffff'
                    },
                    pausesUpdatesAutomatically: true,
                    showsBackgroundLocationIndicator: false,
                    activityType: Location.ActivityType.AutomotiveNavigation // Helps iOS optimize
                });
            } catch (error) {
                if (__DEV__) {
                    logger.warn('[LocationTracking] Background updates failed start (ignoring in DEV):', error);
                } else {
                    throw error;
                }
            }

            Storage.setItem(STORAGE_KEY_TRACKING, 'true');
            logger.info('[LocationTracking] Started background tracking');

            // Initial position push
            setTimeout(async () => {
                try {
                    const initialLoc = await this.getCurrentPosition();
                    if (initialLoc) {
                        logger.info('[LocationTracking] Initial location sent');
                        const sent = await this.sendLocation(initialLoc);
                        if (sent !== false) {
                            Storage.setItem(STORAGE_KEY_LAST_SENT, JSON.stringify(initialLoc));
                        }
                    }
                } catch (e) {
                    logger.warn('[LocationTracking] Initial location force-push failed:', e);
                }
            }, 1000);

            return true;

        } catch (error) {
            logger.error('[LocationTracking] Failed to start:', error);
            if (error instanceof Error && error.message.includes('foreground service')) {
                 logger.warn('[LocationTracking] App in background? Cannot start foreground service.');
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
            Storage.setItem(STORAGE_KEY_TRACKING, 'false');
            Storage.removeItem(STORAGE_KEY_LAST_SENT); // Clear session data
            logger.info('[LocationTracking] Stopped tracking');
        } catch (error) {
            logger.info('[LocationTracking] Stop tracking cleanup:', error);
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
     * Returns true if sent successfully or saved to queue, false if failed/stopped
     */
    static async sendLocation(locationData: LocationData): Promise<boolean> {
        try {
            const token = await SecureStore.getItemAsync(STORAGE_KEY_TOKEN);
            if (!token) {
                logger.warn(`[LocationTracking] No token found, saving to pending queue`);
                await this.savePendingLocation(locationData);
                return true;
            }

            logger.info(`[LocationTracking] Sending to server...`);
            // Only log summary in prod to save logs space, detailed in DEV
            if (__DEV__) logger.info(`[LocationTracking] Data:`, JSON.stringify(locationData));

            await api.post(
                `/api/mobile/location`,
                locationData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000,
                    skipGlobalAuthHandler: true
                }
            );

            logger.info(`[LocationTracking] ✅ Location sent successfully!`);
            return true;

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                logger.error(`[LocationTracking] ❌ Failed to send:`, errorMessage);

            if (isAxiosError(error) && error.response?.data?.shouldStopTracking) {
                logger.info(`[LocationTracking] Server requested stop tracking`);
                await this.stopTracking();
                return false;
            }

            // Save to pending queue for later sync
            await this.savePendingLocation(locationData);
            return true; // Still counting as "handled"
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

            Storage.setItem(STORAGE_KEY_PENDING, JSON.stringify(pending));
        } catch (error) {
            logger.error('[LocationTracking] Failed to save pending location:', error);
        }
    }

    /**
     * Get pending locations
     */
    static async getPendingLocations(): Promise<LocationData[]> {
        try {
            const data = Storage.getItem(STORAGE_KEY_PENDING);
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

            const token = await SecureStore.getItemAsync(STORAGE_KEY_TOKEN);
            if (!token) return 0;

            // Optional: Filter duplicates or optimize pending list before sending
            // For now, send all
            await api.post(
                `/api/mobile/location`,
                { locations: pending },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000,
                    skipGlobalAuthHandler: true
                }
            );

            // Clear pending queue
            Storage.removeItem(STORAGE_KEY_PENDING);
            logger.info(`[LocationTracking] Synced ${pending.length} pending locations`);
            return pending.length;

        } catch (error) {
            logger.error('[LocationTracking] Failed to sync pending locations:', error);
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
            logger.warn('[LocationTracking] Failed to get current position:', error);

            if (__DEV__) {
                // Mock for emulator
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

// Define background task
TaskManager.defineTask(TASK_NAME, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    logger.info(`[LocationTracking] Background task triggered`);

    if (error) {
        logger.error(`[LocationTracking] Background task error:`, error);
        return;
    }

    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        logger.info(`[LocationTracking] Received ${locations?.length || 0} locations from OS`);

        if (locations && locations.length > 0) {
            const location = locations[0];

            // Get battery level for monitoring
            let batteryLevel: number | undefined;
            try {
                batteryLevel = await Battery.getBatteryLevelAsync();
                logger.info(`[LocationTracking] Battery level: ${(batteryLevel * 100).toFixed(0)}%`);
            } catch (e) {
                logger.warn(`[LocationTracking] Failed to get battery level:`, e);
            }

            // --- MOVEMENT CHECK LOGIC START ---
            let shouldSend = true;
            let lastSent: LocationData | null = null;

            try {
                const lastSentStr = Storage.getItem(STORAGE_KEY_LAST_SENT);
                if (lastSentStr) {
                    lastSent = JSON.parse(lastSentStr);
                }
            } catch (e) {
                logger.warn('Failed to read last sent location:', e);
            }

            if (lastSent) {
                const distance = getDistanceFromLatLonInMeters(
                    lastSent.latitude,
                    lastSent.longitude,
                    location.coords.latitude,
                    location.coords.longitude
                );

                const timeSinceLast = new Date().getTime() - new Date(lastSent.recordedAt).getTime();
                const MIN_DISTANCE_METERS = 20; // 20 meters threshold
                const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

                logger.info(`[LocationTracking] Distance from last: ${distance.toFixed(1)}m, Time: ${(timeSinceLast/60000).toFixed(1)}min`);

                if (distance < MIN_DISTANCE_METERS) {
                    // User hasn't moved enough
                    if (timeSinceLast < HEARTBEAT_INTERVAL_MS) {
                        shouldSend = false;
                        logger.info(`[LocationTracking] SKIPPING UPDATE: Moved only ${distance.toFixed(1)}m (Threshold: ${MIN_DISTANCE_METERS}m)`);
                    } else {
                        logger.info(`[LocationTracking] SENDING HEARTBEAT: Stationary but interval > 30mins`);
                    }
                }
            }
            // --- MOVEMENT CHECK LOGIC END ---

            if (shouldSend) {
                // Detect movement: speed > 0.5 m/s = ~1.8 km/h (walking pace)
                const isMoving = location.coords.speed !== null && location.coords.speed > 0.5;

                const locationData: LocationData = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    accuracy: location.coords.accuracy,
                    altitude: location.coords.altitude,
                    speed: location.coords.speed,
                    heading: location.coords.heading,
                    batteryLevel,
                    isMoving,
                    recordedAt: new Date(location.timestamp).toISOString()
                };

                logger.info(`[LocationTracking] Sending location to server`);
                const sent = await LocationTrackingService.sendLocation(locationData);

                // If sent (or saved to queue), update last sent reference
                if (sent !== false) {
                     Storage.setItem(STORAGE_KEY_LAST_SENT, JSON.stringify(locationData));
                }
            }
        }
    } else {
        logger.info(`[LocationTracking] No location data in callback`);
    }
});
