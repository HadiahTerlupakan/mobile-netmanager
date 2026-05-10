import { AuthorizationStatus, getMessaging, getToken, isDeviceRegisteredForRemoteMessages, onTokenRefresh, registerDeviceForRemoteMessages, requestPermission } from '@react-native-firebase/messaging';

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
     * Mendapatkan FCM Token perangkat dan mengirimnya ke backend
     */
    async syncFCMTokenToBackend(action: 'add' | 'remove' = 'add'): Promise<string | null> {
        try {
            if (action === 'add') {
                const hasPermission = await this.requestUserPermission();
                if (!hasPermission) {
                    logger.warn('[FCM] Push notification permission denied');
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

            // Validate token format before sending
            if (typeof token !== 'string' || token.trim().length === 0) {
                logger.error('[FCM] Invalid token format:', { tokenType: typeof token, tokenLength: token?.length });
                return null;
            }

            const payload = {
                fcmToken: token,
                action
            };

            logger.info(`[FCM] Sending token to backend: ${maskToken(token)}, action: ${action}`);
            logger.debug('[FCM] Payload:', { action, tokenLength: token.length });

            await api.post('/api/mobile/fcm-token', payload);

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
                await api.post('/api/mobile/fcm-token', payload);
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
}

export const fcmService = new FirebaseMessagingService();
