import api from '@/services/api';
import { logger } from '@/utils/logger';
// import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

class FirebaseMessagingService {
    /**
     * Meminta izin notifikasi dari sistem pengguna
     */
    async requestUserPermission(): Promise<boolean> {
        if (Platform.OS === 'ios') {
            // const authStatus = await messaging().requestPermission();
            // const enabled =
            //     authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            //     authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            // return enabled;
            return false;
        } else {
            // const authStatus = await messaging().requestPermission();
            // const enabled =
            //     authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            //     authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            // return enabled;
            return false;
        }
    }

    /**
     * Mendapatkan FCM Token perangkat dan mengirimnya ke backend
     */
    async syncFCMTokenToBackend(action: 'add' | 'remove' = 'add'): Promise<string | null> {
        try {
            const hasPermission = await this.requestUserPermission();
            if (!hasPermission && action === 'add') {
                logger.warn('[FCM] Push notification permission denied');
                return null;
            }

            // Daftarkan devais jika belum (untuk iOS APNs)
            // if (!messaging().isDeviceRegisteredForRemoteMessages) {
            //     await messaging().registerDeviceForRemoteMessages();
            // }

            // const token = await messaging().getToken();
            const token = null;
            if (!token) {
                logger.warn('[FCM] No token received');
                return null;
            }

            logger.info(`[FCM] Current token: ${token}, action: ${action}`);

            // Kirim ke backend Mitra API
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
        // return messaging().onTokenRefresh(async (newToken) => {
        //     logger.info('[FCM] Token refreshed:', newToken);
        //     try {
        //         await api.post('/api/mobile/mitra/fcm-token', {
        //             fcmToken: newToken,
        //             action: 'add'
        //         });
        //     } catch (error) {
        //         logger.error('[FCM] Error syncing refreshed token:', error);
        //     }
        // });
        return () => { };
    }
}

export const fcmService = new FirebaseMessagingService();
