/**
 * LocationTrackingService - Background location tracking for mobile app
 * Tracking aktif setelah check-in dan berhenti setelah check-out
 * 
 * NOTE: expo-task-manager & expo-location perlu dikonfigurasi di app.json:
 * "ios": { "infoPlist": { "UIBackgroundModes": ["location", "fetch"] } }
 * "android": { "permissions": ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION"] }
 */

import { isAxiosError } from 'axios';
import { HTTP_TIMEOUTS } from '@/constants/httpTimeouts';
import { Storage } from '@/utils/storage';
import { calculateDistance } from '@/utils/geo';
import { getLocationConfig } from './locationTrackingConfig';
import { isSesiTrackingKedaluwarsa } from './batasSesiTracking';
import { RefreshTokenService } from './RefreshTokenService';
import { TokenService } from './TokenService';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Alert, Linking } from 'react-native';
import { extractApiErrorMessage } from '@/utils/errorHandling';
import {
    ensureDisclosureBeforeBackground,
    requestForegroundLocationWithDisclosure,
} from '@/utils/locationDisclosure';
import { logger } from '../utils/logger';
import api from './api';

const TASK_NAME = 'BACKGROUND_LOCATION_TASK';
const STORAGE_KEY_TRACKING = '@location_tracking_enabled';
const STORAGE_KEY_TOKEN = 'session_token'; // Must match AuthContext key
const STORAGE_KEY_PENDING = '@pending_locations';
const STORAGE_KEY_LAST_SENT = '@last_sent_location'; // New key for movement check
const STORAGE_KEY_STARTED_AT = '@location_tracking_started_at';
const HTTP_UNAUTHORIZED = 401;

/**
 * Token sesi untuk request tracking. Task background bisa berjalan tanpa
 * AuthContext (app ditutup) sehingga token di memori kosong — ambil dari
 * penyimpanan aman lalu pasang agar interceptor api mengirimnya.
 */
async function ambilTokenSesi(): Promise<string | null> {
    const diMemori = TokenService.getToken();
    if (diMemori) return diMemori;
    const tersimpan = await SecureStore.getItemAsync(STORAGE_KEY_TOKEN);
    if (tersimpan) TokenService.setToken(tersimpan);
    return tersimpan;
}

/**
 * Apakah server menyuruh berhenti melacak.
 *
 * Balasan server dibungkus `apiSuccess`, sehingga muatannya ada di
 * `body.data.shouldStopTracking` — bukan `body.shouldStopTracking`. Pembacaan
 * yang salah lapis inilah yang membuat tracking terus berjalan setelah
 * check-out: server memang mengirim perintah berhenti setiap kali, dan klien
 * tidak pernah melihatnya.
 *
 * Keduanya diterima karena jalur galat (`apiError`) menaruh bendera itu di
 * akar, sedangkan jalur sukses membungkusnya.
 */
function serverMintaBerhenti(body: unknown): boolean {
    if (typeof body !== 'object' || body === null) return false;
    const akar = body as { shouldStopTracking?: unknown; data?: unknown };
    if (akar.shouldStopTracking === true) return true;

    const dalam = akar.data;
    if (typeof dalam !== 'object' || dalam === null) return false;
    return (dalam as { shouldStopTracking?: unknown }).shouldStopTracking === true;
}

/** Galat 401: token sesi ditolak server. */
function isTidakTerautentikasi(error: unknown): boolean {
    return isAxiosError(error) && error.response?.status === HTTP_UNAUTHORIZED;
}

/**
 * Kirim request tracking; bila token kedaluwarsa (401) coba refresh sekali.
 * Mengembalikan null bila sesi login sudah tidak berlaku.
 */
async function kirimDenganSesi<T>(kirim: () => Promise<T>): Promise<T | null> {
    try {
        return await kirim();
    } catch (error) {
        if (!isTidakTerautentikasi(error)) throw error;
        const tokenBaru = await RefreshTokenService.refreshAccessToken();
        if (!tokenBaru) return null;
        return kirim();
    }
}

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


export class LocationTrackingService {
    private static initialPushTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Start background location tracking
     * Called after successful check-in
     * Prominent disclosure MUST appear before any location permission request (Google Play policy).
     */
    static async startTracking(): Promise<boolean> {
        try {
            // Foreground: gerbang terpusat menjamin disclosure tampil tepat sebelum
            // izin OS diminta (jika belum granted). Konsisten dengan seluruh app.
            const { status: foregroundStatus } = await requestForegroundLocationWithDisclosure();
            if (foregroundStatus !== 'granted') {
                logger.warn('[LocationTracking] Foreground permission denied / disclosure ditolak');
                return false;
            }

            // Background: hanya minta jika belum granted, dan disclosure WAJIB
            // tampil tepat sebelum dialog OS background (Google Play policy).
            const { status: existingBackgroundStatus } = await Location.getBackgroundPermissionsAsync();
            if (existingBackgroundStatus !== 'granted') {
                const disclosureAccepted = await ensureDisclosureBeforeBackground();
                if (!disclosureAccepted) {
                    logger.warn('[LocationTracking] User menolak disclosure background');
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
                    return false; // Cannot track without background permission
                }
            }

            // Check Battery & Movement for Adaptive Interval
            let batteryLevel = 1.0;
            let isMoving = false;

            try {
                // Race condition protection for battery check
                batteryLevel = await Promise.race([
                    Battery.getBatteryLevelAsync(),
                    new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
                ]) as number;

                // Check last known movement state
                const lastSentStr = await Storage.getItem(STORAGE_KEY_LAST_SENT);
                if (lastSentStr) {
                    const lastSent = JSON.parse(lastSentStr);
                    isMoving = lastSent.isMoving || false;
                }
            } catch (e) {
                logger.warn('[LocationTracking] Battery/movement check failed, using defaults', e);
            }

            // Get adaptive config
            const config = __DEV__
                ? { timeInterval: 60000, distanceInterval: 20, accuracy: Location.Accuracy.Balanced } // DEV: 1 min
                : getLocationConfig(batteryLevel, isMoving);

            logger.info(`[LocationTracking] Config: Battery ${(batteryLevel * 100).toFixed(0)}%, Moving: ${isMoving}, Interval: ${config.timeInterval / 60000}m`);

            // Check if already tracking
            const isTracking = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
            if (isTracking) {
                try {
                    // Update options if already running (re-registering updates options)
                    await Location.startLocationUpdatesAsync(TASK_NAME, {
                        accuracy: config.accuracy,
                        timeInterval: config.timeInterval,
                        distanceInterval: config.distanceInterval,
                        deferredUpdatesInterval: __DEV__ ? 30000 : 15 * 60 * 1000,
                        foregroundService: {
                            notificationTitle: 'RADPRO sedang melacak lokasi Anda',
                            notificationBody: 'Pelacakan aktif selama jam kerja. Berhenti otomatis saat check-out.',
                            notificationColor: '#0a46aa'
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
            logger.info(`[LocationTracking] Starting updates...`);
            try {
                await Location.startLocationUpdatesAsync(TASK_NAME, {
                    accuracy: config.accuracy,
                    timeInterval: config.timeInterval,
                    distanceInterval: config.distanceInterval,
                    deferredUpdatesInterval: __DEV__ ? 30000 : 15 * 60 * 1000,
                    foregroundService: {
                        notificationTitle: 'RADPRO sedang melacak lokasi Anda',
                        notificationBody: 'Pelacakan aktif selama jam kerja. Berhenti otomatis saat check-out.',
                        notificationColor: '#0a46aa'
                    },
                    pausesUpdatesAutomatically: false, // Don't let OS pause tracking
                    showsBackgroundLocationIndicator: true, // iOS: Show blue bar to indicate active tracking
                    activityType: Location.ActivityType.OtherNavigation
                });
            } catch (error) {
                if (__DEV__) {
                    logger.warn('[LocationTracking] Background updates failed start (ignoring in DEV):', error);
                } else {
                    throw error;
                }
            }

            await Storage.setItem(STORAGE_KEY_TRACKING, 'true');
            await Storage.setItem(STORAGE_KEY_STARTED_AT, new Date().toISOString());
            logger.info('[LocationTracking] Started background tracking');

            // Initial position push (tracked for cleanup on stopTracking)
            this.initialPushTimer = setTimeout(async () => {
                this.initialPushTimer = null;
                try {
                    const initialLoc = await this.getCurrentPosition();
                    if (initialLoc) {
                        logger.info('[LocationTracking] Initial location sent');
                        const sent = await this.sendLocation(initialLoc);
                        if (sent !== false) {
                            await Storage.setItem(STORAGE_KEY_LAST_SENT, JSON.stringify(initialLoc));
                        }
                    }
                } catch (e) {
                    logger.warn('[LocationTracking] Initial location force-push failed:', e);
                }
            }, 2000);

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
            if (this.initialPushTimer) {
                clearTimeout(this.initialPushTimer);
                this.initialPushTimer = null;
            }
            const isTracking = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
            if (isTracking) {
                await Location.stopLocationUpdatesAsync(TASK_NAME);
            }
            await Storage.setItem(STORAGE_KEY_TRACKING, 'false');
            await Storage.removeItem(STORAGE_KEY_LAST_SENT); // Clear session data
            await Storage.removeItem(STORAGE_KEY_STARTED_AT);
            logger.info('[LocationTracking] Stopped tracking');
        } catch (error) {
            logger.error('[LocationTracking] Stop tracking cleanup failed:', error);
        }
    }

    /**
     * Full Cleanup - Called on Logout or when App is killed
     */
    static async cleanup(): Promise<void> {
        try {
            await this.stopTracking();
            await Storage.removeItem(STORAGE_KEY_LAST_SENT);
            await Storage.removeItem(STORAGE_KEY_PENDING);
            logger.info('[LocationTracking] Cleanup complete');
        } catch (error) {
            logger.error('[LocationTracking] Cleanup error:', error);
        }
    }

    /**
     * Check if tracking is currently active
     */
    static async isTrackingActive(): Promise<boolean> {
        try {
            return await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
        } catch (error) {
            logger.error('[LocationTracking] Failed to check tracking state:', error);
            return false;
        }
    }

    /**
     * Hentikan tracking bila sesinya melewati batas aman (lupa check-out
     * sambil offline). Sesi lama tanpa catatan waktu mulai dicatat sekarang.
     * Mengembalikan true bila tracking dihentikan.
     */
    static async hentikanBilaLewatBatas(sekarang: Date = new Date()): Promise<boolean> {
        const mulai = await Storage.getItem(STORAGE_KEY_STARTED_AT);
        if (!mulai) {
            await Storage.setItem(STORAGE_KEY_STARTED_AT, sekarang.toISOString());
            return false;
        }
        if (!isSesiTrackingKedaluwarsa(mulai, sekarang)) return false;
        logger.warn('[LocationTracking] Sesi tracking melewati batas jam kerja, dihentikan');
        await this.stopTracking();
        return true;
    }

    /**
     * Send location to server
     * Called by background task
     * Returns true if sent successfully or saved to queue, false if failed/stopped
     */
    static async sendLocation(locationData: LocationData): Promise<boolean> {
        try {
            const token = await ambilTokenSesi();
            if (!token) {
                // Tidak ada sesi login (sudah logout) → tidak ada alasan melacak.
                logger.warn(`[LocationTracking] No session token, stopping tracking`);
                await this.stopTracking();
                return false;
            }

            logger.info(`[LocationTracking] Sending to server...`);
            // Only log summary in prod to save logs space, detailed in DEV
            if (__DEV__) logger.info(`[LocationTracking] Data:`, JSON.stringify(locationData));

            const response = await kirimDenganSesi(() =>
                api.post(`/api/mobile/location`, locationData, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: HTTP_TIMEOUTS.short,
                    // 401 ditangani di sini (refresh sekali), bukan logout global
                    // — task background tidak boleh mengeluarkan pengguna.
                    skipGlobalAuthHandler: true,
                })
            );
            if (!response) {
                logger.warn(`[LocationTracking] Session expired, stopping tracking`);
                await this.stopTracking();
                return false;
            }

            logger.info(`[LocationTracking] ✅ Location sent successfully!`);

            if (serverMintaBerhenti(response.data)) {
                logger.info(`[LocationTracking] Server requested stop tracking`);
                await this.stopTracking();
                return false;
            }

            return true;

            } catch (error) {
                const backendMessage = isAxiosError(error) ? extractApiErrorMessage(error.response?.data) : undefined;
                const errorMessage = backendMessage || (error instanceof Error ? error.message : 'Unknown error');
                logger.error('[LocationTracking] Failed to send location:', errorMessage);

            if (isAxiosError(error) && serverMintaBerhenti(error.response?.data)) {
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

            await Storage.setItem(STORAGE_KEY_PENDING, JSON.stringify(pending));
        } catch (error) {
            logger.error('[LocationTracking] Failed to save pending location:', error);
        }
    }

    /**
     * Get pending locations
     */
    static async getPendingLocations(): Promise<LocationData[]> {
        try {
            const data = await Storage.getItem(STORAGE_KEY_PENDING);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            logger.error('[LocationTracking] Failed to read pending locations:', error);
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

            const token = await ambilTokenSesi();
            if (!token) return 0;

            const response = await kirimDenganSesi(() =>
                api.post(`/api/mobile/location`, { locations: pending }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: HTTP_TIMEOUTS.sync,
                    skipGlobalAuthHandler: true,
                })
            );
            if (!response) return 0;

            // Clear pending queue
            await Storage.removeItem(STORAGE_KEY_PENDING);
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
    const timestamp = new Date().toISOString();
    logger.info(`[LocationTracking][${timestamp}] Background task triggered`);

    // Guard: stop gracefully if permission was revoked while checked in
    const { status: permissionStatus } = await Location.getForegroundPermissionsAsync();
    if (permissionStatus !== 'granted') {
        logger.warn(`[LocationTracking][${timestamp}] Permission revoked, stopping tracking`);
        await LocationTrackingService.stopTracking();
        return;
    }

    if (error) {
        logger.error(`[LocationTracking][${timestamp}] Background task error:`, error);
        return;
    }

    if (await LocationTrackingService.hentikanBilaLewatBatas()) return;

    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        logger.info(`[LocationTracking][${timestamp}] Received ${locations?.length || 0} locations from OS`);

        if (locations && locations.length > 0) {
            const location = locations[0];

            // Get battery level for monitoring
            let batteryLevel: number | undefined;
            try {
                // Race condition protection
                batteryLevel = await Promise.race([
                    Battery.getBatteryLevelAsync(),
                    new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
                ]) as number;
                logger.info(`[LocationTracking][${timestamp}] Battery level: ${(batteryLevel * 100).toFixed(0)}%`);
            } catch (e) {
                logger.warn(`[LocationTracking][${timestamp}] Failed to get battery level:`, e);
            }

            // --- MOVEMENT CHECK LOGIC START ---
            let shouldSend = true;
            let lastSent: LocationData | null = null;

            try {
                const lastSentStr = await Storage.getItem(STORAGE_KEY_LAST_SENT);
                if (lastSentStr) {
                    lastSent = JSON.parse(lastSentStr);
                }
            } catch (e) {
                logger.warn('Failed to read last sent location:', e);
            }

            if (lastSent) {
                const distance = calculateDistance(
                    lastSent.latitude,
                    lastSent.longitude,
                    location.coords.latitude,
                    location.coords.longitude
                );

                const timeSinceLast = new Date().getTime() - new Date(lastSent.recordedAt).getTime();
                const MIN_DISTANCE_METERS = 20; // 20 meters threshold
                const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

                logger.info(`[LocationTracking] Distance from last: ${distance.toFixed(1)}m, Time: ${(timeSinceLast / 60000).toFixed(1)}min`);

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

                logger.info(`[LocationTracking][${timestamp}] Sending location to server`);
                const sent = await LocationTrackingService.sendLocation(locationData);

                // If sent (or saved to queue), update last sent reference
                if (sent !== false) {
                    await Storage.setItem(STORAGE_KEY_LAST_SENT, JSON.stringify(locationData));
                }
            }
        }
    } else {
        logger.info(`[LocationTracking][${timestamp}] No location data in callback`);
    }
});
