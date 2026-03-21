import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';


export interface PushNotificationState {
    expoPushToken?: Notifications.ExpoPushToken;
    notification?: Notifications.Notification;
}

export const usePushNotifications = (): PushNotificationState => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    const [expoPushToken, setExpoPushToken] = useState<
        Notifications.ExpoPushToken | undefined
    >();

    const [notification, setNotification] = useState<
        Notifications.Notification | undefined
    >();

    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    async function registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } =
                await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return;
            }

            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId;

            if (!projectId) {
                console.error('Project ID not found in app.json configuration');
                return;
            }

            token = await Notifications.getExpoPushTokenAsync({
                projectId,
            });
        }

        return token;
    }

    useEffect(() => {
        registerForPushNotificationsAsync().then((token) => {
            setExpoPushToken(token);
        });

        notificationListener.current =
            Notifications.addNotificationReceivedListener((notification) => {
                setNotification(notification);
            });

        responseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
                const data = response.notification.request.content.data;

                // Deep link handling for chat messages
                if (data?.type === 'chat_message' && data?.conversationId) {
                    try {
                        router.push(`/chat/${data.conversationId}`);
                    } catch (error) {
                        console.error('[PushNotification] Error routing to chat:', error);
                    }
                }
            });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return {
        expoPushToken,
        notification,
    };
};
