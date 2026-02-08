import api from '@/services/api';
import { logger } from '@/utils/logger';
import { isAxiosError } from 'axios';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
// Note: Handled globally in NotificationService.ts
// Notifications.setNotificationHandler({ ... });

export async function registerForPushNotificationsAsync(token?: string): Promise<string | null> {
    let pushToken: string | null = null;

    // Check if running on physical device
    // if (!Device.isDevice) {
    //     logger.info('Push notifications require a physical device');
    //     // return null; // Allow emulator to try registration
    // }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        logger.warn('Failed to get push token for push notification!');
        return null;
    }

    // Get Expo Push Token
    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

        if (!projectId) {
            logger.error('Project ID not found');
            return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        pushToken = tokenData.data;
        logger.info('Push token:', pushToken);

        // Register token with backend
        if (pushToken) {
            try {
                const config: any = { skipGlobalAuthHandler: true };
                
                // If token is provided explicitly, use it in headers
                if (token) {
                    config.headers = { Authorization: `Bearer ${token}` };
                }

                await api.post('/api/mobile/push-token', { pushToken }, config);
                logger.info('Push token registered with backend');
            } catch (error) {
                // Ignore 401 (Unauthorized) as it will be handled by AuthContext
                if (isAxiosError(error) && error.response?.status === 401) {
                    logger.info('Push registration skipped (unauthorized)');
                } else {
                    logger.error('Failed to register push token:', error);
                }
            }
        }
    } catch (error) {
        logger.error('Error getting push token:', error);
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    return pushToken;
}

// Send local notification (for testing)
export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: data || {},
            sound: true,
        },
        trigger: null, // immediately
    });
}

// Add notification listeners
export function addNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
    const receivedListener = Notifications.addNotificationReceivedListener(notification => {
        logger.info('Notification received:', notification);
        onNotificationReceived?.(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        logger.info('Notification response:', response);
        onNotificationResponse?.(response);
    });

    return () => {
        receivedListener.remove();
        responseListener.remove();
    };
}
