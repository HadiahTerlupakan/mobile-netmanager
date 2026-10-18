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
import { buildLocationTaskOptions, getLocationConfig } from './locationTrackingConfig';
import {
    catatKonfigurasiTerpasang,
    lupakanKonfigurasiTerpasang,
    sesuaikanKonfigurasi,
} from './locationTrackingAdaptive';
import {
    STORAGE_KEY_PENDING,
    bacaAntrean,
    buangDariAntrean,
    tambahKeAntrean,
} from './locationPendingQueue';
import {
    bacaLevelBaterai,
    keDataLokasi,
    pisahkanTitikTerbaru,
    type LocationData,
} from './locationSample';
import { isSesiTrackingKedaluwarsa } from './batasSesiTracking';
import { RefreshTokenService } from './RefreshTokenService';
import { TokenService } from './TokenService';
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
const STORAGE_KEY_LAST_SENT = '@last_sent_location'; // New key for movement check
const STORAGE_KEY_STARTED_AT = '@location_tracking_started_at';
const HTTP_UNAUTHORIZED = 401;
/**
 * Penolakan isi antrean itu sendiri (validasi). 403/404/413 sengaja tidak
 * masuk: itu bisa datang dari proxy atau deploy setengah jadi, dan membuang
 * antrean karenanya menghapus jejak yang sebenarnya sah.
 */
const STATUS_ISI_DITOLAK = new Set([400, 422]);

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
 * Server menolak isi antrean secara permanen. Mengirim ulang isi yang sama
 * tidak akan pernah berhasil, dan tanpa ini satu titik cacat menahan seluruh
 * antrean selamanya.
 */
function isDitolakPermanen(error: unknown): boolean {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    return status !== undefined && STATUS_ISI_DITOLAK.has(status);
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

export class LocationTrackingService {
    private static initialPushTimer: ReturnType<typeof setTimeout> | null = null;
    private static sedangSinkron = false;

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
            const batteryLevel = (await bacaLevelBaterai()) ?? 1.0;
            let isMoving = false;

            try {
                // Check last known movement state
                const lastSentStr = await Storage.getItem(STORAGE_KEY_LAST_SENT);
                if (lastSentStr) {
                    const lastSent = JSON.parse(lastSentStr);
                    isMoving = lastSent.isMoving || false;
                }
            } catch (e) {
                logger.warn('[LocationTracking] Movement check failed, using defaults', e);
            }

            // Get adaptive config
            const config = __DEV__
                ? { timeInterval: 60000, distanceInterval: 20, accuracy: Location.Accuracy.Balanced } // DEV: 1 min
                : getLocationConfig(batteryLevel, isMoving);
            const taskOptions = buildLocationTaskOptions(config);

            logger.info(`[LocationTracking] Config: Battery ${(batteryLevel * 100).toFixed(0)}%, Moving: ${isMoving}, Interval: ${config.timeInterval / 60000}m`);

            // Check if already tracking
            const isTracking = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
            if (isTracking) {
                try {
                    // Update options if already running (re-registering updates options)
                    await Location.startLocationUpdatesAsync(TASK_NAME, taskOptions);
                    await catatKonfigurasiTerpasang(config);

                    const current = await this.getCurrentPosition();
                    if (current) {
                        logger.info('[LocationTracking] Tracking updated. Current loc:', current.latitude, current.longitude);
                        await this.kirimTitikAwal(current);
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
                await Location.startLocationUpdatesAsync(TASK_NAME, taskOptions);
                await catatKonfigurasiTerpasang(config);
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
                        await this.kirimTitikAwal(initialLoc);
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
            await lupakanKonfigurasiTerpasang();
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
                // Antrean ikut dibuang: titiknya milik sesi yang sudah keluar, dan
                // bila tersisa ia akan terkirim atas nama pengguna berikutnya.
                logger.warn(`[LocationTracking] No session token, stopping tracking`);
                await this.stopTracking();
                await Storage.removeItem(STORAGE_KEY_PENDING);
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

            // Sinyal kembali: kirim juga titik yang tertahan selama offline.
            await this.syncPendingLocations();
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
     * Kirim titik pertama sebuah sesi, lalu jadikan acuan penyaring jarak.
     */
    private static async kirimTitikAwal(locationData: LocationData): Promise<void> {
        const sent = await this.sendLocation(locationData);
        if (sent !== false) {
            await Storage.setItem(STORAGE_KEY_LAST_SENT, JSON.stringify(locationData));
        }
    }

    /**
     * Save location to pending queue when offline
     */
    static async savePendingLocation(locationData: LocationData): Promise<void> {
        await tambahKeAntrean([locationData]);
    }

    /**
     * Get pending locations
     */
    static async getPendingLocations(): Promise<LocationData[]> {
        return bacaAntrean();
    }

    /**
     * Kirim antrean lokasi offline. Dipanggil sesudah satu titik berhasil
     * terkirim dan setiap aplikasi kembali aktif; dulu tidak dipanggil di mana
     * pun, sehingga jejak dari area tanpa sinyal tidak pernah sampai ke server.
     * Mengembalikan jumlah titik yang keluar dari antrean.
     */
    static async syncPendingLocations(): Promise<number> {
        if (this.sedangSinkron) return 0;
        this.sedangSinkron = true;
        try {
            return await this.kirimAntrean();
        } finally {
            this.sedangSinkron = false;
        }
    }

    private static async kirimAntrean(): Promise<number> {
        const pending = await this.getPendingLocations();
        if (pending.length === 0) return 0;
        if (!(await ambilTokenSesi())) return 0;

        try {
            const response = await kirimDenganSesi(() =>
                api.post(`/api/mobile/location`, { locations: pending }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: HTTP_TIMEOUTS.sync,
                    skipGlobalAuthHandler: true,
                })
            );
            if (!response) return 0;
        } catch (error) {
            if (!isDitolakPermanen(error)) {
                logger.error('[LocationTracking] Failed to sync pending locations:', error);
                return 0;
            }
            logger.warn('[LocationTracking] Server menolak antrean lokasi, dibuang:', error);
        }

        await buangDariAntrean(pending);
        logger.info(`[LocationTracking] Synced ${pending.length} pending locations`);
        return pending.length;
    }

    /**
     * Get current position manually (for immediate update)
     */
    static async getCurrentPosition(): Promise<LocationData | null> {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            return keDataLokasi(location, await bacaLevelBaterai());
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

/** Perpindahan minimum sebelum titik baru dikirim. */
const JARAK_MINIMUM_M = 20;

/** HP yang diam tetap mengirim posisi sesering ini, agar peta tahu ia masih aktif. */
const INTERVAL_HEARTBEAT_MS = 30 * 60 * 1000;

async function bacaTitikTerakhir(): Promise<LocationData | null> {
    try {
        const tersimpan = await Storage.getItem(STORAGE_KEY_LAST_SENT);
        return tersimpan ? JSON.parse(tersimpan) : null;
    } catch (e) {
        logger.warn('Failed to read last sent location:', e);
        return null;
    }
}

/** Kirim bila sudah berpindah cukup jauh, atau sebagai heartbeat bila lama diam. */
function harusDikirim(lastSent: LocationData | null, location: Location.LocationObject): boolean {
    if (!lastSent) return true;
    const distance = calculateDistance(
        lastSent.latitude,
        lastSent.longitude,
        location.coords.latitude,
        location.coords.longitude
    );
    const timeSinceLast = Date.now() - new Date(lastSent.recordedAt).getTime();
    logger.info(`[LocationTracking] Distance from last: ${distance.toFixed(1)}m, Time: ${(timeSinceLast / 60000).toFixed(1)}min`);
    return distance >= JARAK_MINIMUM_M || timeSinceLast >= INTERVAL_HEARTBEAT_MS;
}

/**
 * Titik lama di batch tetap jejak perjalanan; dikirim lewat antrean. Baru
 * diantre sesudah sesi login terbukti masih ada: task yang terpicu sesudah
 * logout tidak boleh meninggalkan titik yang kemudian terkirim atas nama
 * pengguna berikutnya di HP yang sama.
 */
async function antreTitikLama(titikLama: Location.LocationObject[], batteryLevel?: number): Promise<void> {
    if (titikLama.length === 0 || !(await ambilTokenSesi())) return;
    await tambahKeAntrean(titikLama.map((titik) => keDataLokasi(titik, batteryLevel)));
    await LocationTrackingService.syncPendingLocations();
}

async function prosesTitikDariOs(locations: Location.LocationObject[]): Promise<void> {
    const { terbaru, sebelumnya } = pisahkanTitikTerbaru(locations);
    if (!terbaru) return;
    const batteryLevel = await bacaLevelBaterai();
    const locationData = keDataLokasi(terbaru, batteryLevel);

    if (harusDikirim(await bacaTitikTerakhir(), terbaru)) {
        const sent = await LocationTrackingService.sendLocation(locationData);
        // Tracking sudah dihentikan: jangan sampai penyesuaian di bawah memulainya lagi.
        if (!sent) return;
        await Storage.setItem(STORAGE_KEY_LAST_SENT, JSON.stringify(locationData));
    }
    await antreTitikLama(sebelumnya, batteryLevel);
    await sesuaikanKonfigurasi(TASK_NAME, { batteryLevel, isMoving: locationData.isMoving ?? false });
}

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

    const locations = data?.locations ?? [];
    logger.info(`[LocationTracking][${timestamp}] Received ${locations.length} locations from OS`);
    await prosesTitikDariOs(locations);
});
