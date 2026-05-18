import { AuthorizationStatus, deleteToken, getMessaging, getToken, isDeviceRegisteredForRemoteMessages, onTokenRefresh, registerDeviceForRemoteMessages, requestPermission } from '@react-native-firebase/messaging';

import api from '@/services/api';
import { logger } from '@/utils/logger';
import { PermissionsAndroid, Platform } from 'react-native';

function maskToken(token: string): string {
    if (token.length <= 8) {
        return '***';
    }

    return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

class FirebaseMessagingService {
    private lastSyncedToken: string | null = null

    private lastSyncedAction: 'add' | 'remove' | null = null

    /**
     * Meminta izin notifikasi dari sistem pengguna
     */
    async requestUserPermission(): Promise<boolean> {
        if (Platform.OS === 'android') {
            if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
                const status = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                );

                return status === PermissionsAndroid.RESULTS.GRANTED;
            }

            return true;
        }

        const messaging = getMessaging();
        const authStatus = await requestPermission(messaging);

        return authStatus === AuthorizationStatus.AUTHORIZED || authStatus === AuthorizationStatus.PROVISIONAL;
    }

    /**
     * Cek apakah user sudah grant permission notifikasi tanpa memunculkan
     * dialog. Dipakai oleh `syncFCMTokenToBackend` agar tidak prompt
     * dialog sistem di tempat yang tidak kontekstual (mis. saat sync
     * background). Onboarding screen yang explicit panggil
     * `requestUserPermission` saat tepat (misal tombol "Aktifkan
     * notifikasi").
     */
    async hasUserPermission(): Promise<boolean> {
        if (Platform.OS === 'android') {
            if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
                const status = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                );
                return status;
            }
            return true;
        }

        const messaging = getMessaging();
        const authStatus = await messaging.hasPermission?.();
        if (authStatus === undefined) {
            // SDK lama tidak punya hasPermission — fallback request, tapi
            // ini path Old iOS yang sangat jarang.
            return this.requestUserPermission();
        }
        return (
            authStatus === AuthorizationStatus.AUTHORIZED ||
            authStatus === AuthorizationStatus.PROVISIONAL
        );
    }

    /**
     * Mendapatkan FCM Token perangkat dan mengirimnya ke backend.
     *
     * `requestPermissionIfNeeded` default `false` — function ini TIDAK
     * akan memunculkan dialog permission Android/iOS bila belum granted.
     * Dialog harus di-trigger dari onboarding screen yang explicit
     * (`fcmService.requestUserPermission()`) agar user paham kenapa
     * notifikasi diminta. Tanpa ini, dialog tiba-tiba muncul saat first
     * sign-in tanpa konteks.
     */
    async syncFCMTokenToBackend(
        action: 'add' | 'remove' = 'add',
        options: { requestPermissionIfNeeded?: boolean } = {},
    ): Promise<string | null> {
        try {
            if (action === 'add') {
                const granted = options.requestPermissionIfNeeded
                    ? await this.requestUserPermission()
                    : await this.hasUserPermission();
                if (!granted) {
                    logger.warn(
                        '[FCM] Push notification permission belum granted; sync skip. Pre-prompt user via onboarding.',
                    );
                    return null;
                }
            }

            const messaging = getMessaging();

            if (!isDeviceRegisteredForRemoteMessages(messaging)) {
                await registerDeviceForRemoteMessages(messaging);
            }

            const token = await getToken(messaging);
            if (!token) {
                logger.warn('[FCM] No token received');
                return null;
            }

            if (typeof token !== 'string' || token.trim().length === 0) {
                logger.error('[FCM] Invalid token format:', { tokenType: typeof token, tokenLength: token?.length });
                return null;
            }

            if (this.lastSyncedToken === token && this.lastSyncedAction === action) {
                logger.info(`[FCM] Skipping duplicate token sync: ${maskToken(token)}, action: ${action}`);
                return token;
            }

            const payload = {
                fcmToken: token,
                action
            };

            logger.info(`[FCM] Sending token to backend: ${maskToken(token)}, action: ${action}`);
            logger.debug('[FCM] Payload:', { action, tokenLength: token.length });

            await api.post('/api/mobile/fcm-token', payload, {
                headers: { 'Idempotency-Key': `fcm-${action}-${token}` },
                skipErrorToast: true,
            });

            this.lastSyncedToken = token;
            this.lastSyncedAction = action;

            logger.info(`[FCM] Token successfully synced to backend (${action})`);
            return token;
        } catch (error) {
            logger.error('[FCM] Error syncing FCM token:', error);

            // Log detailed error information for debugging
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: unknown } };
                logger.error('[FCM] Backend response:', {
                    status: axiosError.response?.status,
                    data: axiosError.response?.data
                });
            }

            return null;
        }
    }

    /**
     * Menambahkan listener event perubahan token
     */
    onTokenRefresh() {
        const messaging = getMessaging();

        return onTokenRefresh(messaging, async (newToken) => {
            logger.info('[FCM] Token refreshed:', maskToken(newToken));

            // Validate token before sending
            if (!newToken || typeof newToken !== 'string' || newToken.trim().length === 0) {
                logger.error('[FCM] Invalid refreshed token format');
                return;
            }

            try {
                const payload = {
                    fcmToken: newToken,
                    action: 'add' as const
                };

                logger.debug('[FCM] Sending refreshed token to backend');
                await api.post('/api/mobile/fcm-token', payload, {
                    headers: { 'Idempotency-Key': `fcm-add-${newToken}` },
                    skipErrorToast: true,
                });
                logger.info('[FCM] Refreshed token synced successfully');
            } catch (error) {
                logger.error('[FCM] Error syncing refreshed token:', error);

                // Log detailed error for debugging
                if (error && typeof error === 'object' && 'response' in error) {
                    const axiosError = error as { response?: { status?: number; data?: unknown } };
                    logger.error('[FCM] Backend response on refresh:', {
                        status: axiosError.response?.status,
                        data: axiosError.response?.data
                    });
                }
            }
        });
    }

    /**
     * Hapus FCM token dari device dan reset cache. Dipanggil saat logout
     * untuk mencegah token user A dipakai untuk push notification ketika
     * device dipakai user B (shared device cross-account leak).
     *
     * Tanpa ini, token sama tetap teregistrasi setelah logout — saat user A
     * login lagi di hari berikutnya, push targeted ke user B bisa nyasar
     * ke device A karena token belum rotated.
     */
    async deleteDeviceToken(): Promise<void> {
        try {
            const messaging = getMessaging();
            await deleteToken(messaging);
            this.lastSyncedToken = null;
            this.lastSyncedAction = null;
            logger.info('[FCM] Device token deleted and cache reset');
        } catch (error) {
            logger.warn('[FCM] Failed to delete device token (non-fatal):', error);
        }
    }

    /**
     * Reset cache `lastSyncedToken` tanpa hapus token native. Dipakai saat
     * clearLocalSession agar listener ulang bisa register token ke user
     * baru tanpa di-skip oleh dedupe check di line ~72.
     */
    resetSyncCache(): void {
        this.lastSyncedToken = null;
        this.lastSyncedAction = null;
    }
}

export const fcmService = new FirebaseMessagingService();
