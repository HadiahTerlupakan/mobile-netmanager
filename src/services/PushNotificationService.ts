import {
  FirebaseMessagingTypes,
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';

import { logger } from '@/utils/logger';

type NotificationBridgePayload = {
  title?: string | null;
  body?: string | null;
  data?: Record<string, string>;
};

type RemoteMessageLike = FirebaseMessagingTypes.RemoteMessage | null | undefined;

function normalizeMessageData(
  data: FirebaseMessagingTypes.RemoteMessage['data'] | undefined,
): Record<string, string> {
  if (!data) {
    return {};
  }

  return Object.entries(data).reduce<Record<string, string>>(
    (normalizedData, [key, value]) => {
      if (typeof value === 'string') {
        normalizedData[key] = value;
      }

      return normalizedData;
    },
    {},
  );
}

function buildNotificationPayload(
  remoteMessage: RemoteMessageLike,
): NotificationBridgePayload | null {
  if (!remoteMessage) {
    return null;
  }

  return {
    title: remoteMessage.notification?.title ?? null,
    body: remoteMessage.notification?.body ?? null,
    data: normalizeMessageData(remoteMessage.data),
  };
}

export async function getInitialNotificationData(): Promise<Record<string, string> | null> {
  const messaging = getMessaging();
  const remoteMessage = await getInitialNotification(messaging);
  const notificationData = normalizeMessageData(remoteMessage?.data);

  return Object.keys(notificationData).length > 0 ? notificationData : null;
}

export function addNotificationListeners(
  onNotificationReceived?: (notification: NotificationBridgePayload) => void,
  onNotificationResponse?: (response: NotificationBridgePayload) => void,
) {
  const messaging = getMessaging();

  const unsubscribeOnMessage = onMessage(messaging, async (remoteMessage) => {
    logger.info('Notification received:', remoteMessage);
    const payload = buildNotificationPayload(remoteMessage);

    if (payload) {
      onNotificationReceived?.(payload);
    }
  });

  const unsubscribeOnOpen = onNotificationOpenedApp(messaging, (remoteMessage) => {
    logger.info('Notification response:', remoteMessage);
    const payload = buildNotificationPayload(remoteMessage);

    if (payload) {
      onNotificationResponse?.(payload);
    }
  });

  return () => {
    unsubscribeOnMessage();
    unsubscribeOnOpen();
  };
}
