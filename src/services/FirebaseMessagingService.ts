import { AuthorizationStatus, getMessaging, getToken, isDeviceRegisteredForRemoteMessages, onTokenRefresh, registerDeviceForRemoteMessages, requestPermission } from '@react-native-firebase/messaging';

import api from '@/services/api';
import { logger } from '@/utils/logger';
import { Platform } from 'react-native';

class FirebaseMessagingService {
    /**
     * Meminta izin notifikasi dari sistem pengguna
     */
    async requestUserPermission(): Promise<boolean> {
        if (Platform.OS !== 'ios') {
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

            logger.info(`[FCM] Current token: ${token}, action: ${action}`);

            await api.post('/api/mobile/mitra/fcm-token', {
                fcmToken: token,
                action
            });

            logger.info(`[FCM] Token successfully synced to backend (${action})`);
            return token;
        } catch (error) {
            logger.error('[FCM] Error syncing FCM token:', error);
            return null;
        }
    }

    /**
     * Menambahkan listener event perubahan token
     */
    onTokenRefresh() {
        const messaging = getMessaging();

        return onTokenRefresh(messaging, async (newToken) => {
            logger.info('[FCM] Token refreshed:', newToken);
            try {
                await api.post('/api/mobile/mitra/fcm-token', {
                    fcmToken: newToken,
                    action: 'add'
                });
            } catch (error) {
                logger.error('[FCM] Error syncing refreshed token:', error);
            }
        });
    }
}

export const fcmService = new FirebaseMessagingService();
