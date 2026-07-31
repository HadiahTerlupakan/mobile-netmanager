import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';

const FOREGROUND_NOTIFICATION_CHANNEL_ID = 'high-priority';
const FOREGROUND_NOTIFICATION_CHANNEL_NAME = 'High Priority Notifications';

type ForegroundNotificationPayload = {
  title?: string | null;
  body?: string | null;
  data?: Record<string, string>;
};

/** Menyiapkan channel Android prioritas tinggi untuk push foreground. */
export async function ensureForegroundNotificationChannel(): Promise<string | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  return notifee.createChannel({
    id: FOREGROUND_NOTIFICATION_CHANNEL_ID,
    name: FOREGROUND_NOTIFICATION_CHANNEL_NAME,
    importance: AndroidImportance.HIGH,
  });
}

/** Menampilkan heads-up notification (Android) atau alert iOS saat FCM diterima di foreground. */
export async function presentForegroundNotification(
  payload: ForegroundNotificationPayload,
): Promise<void> {
  if (!payload.title && !payload.body) {
    return;
  }

  if (Platform.OS === 'ios') {
    // iOS by default suppress notifikasi foreground. Tampilkan eksplisit
    // via notifee dengan foregroundPresentationOptions agar high-priority
    // alert (work-order assigned, payment due) tidak terlewat user.
    await notifee.displayNotification({
      title: payload.title ?? 'Notifikasi Baru',
      body: payload.body ?? 'Anda menerima notifikasi baru.',
      data: payload.data,
      ios: {
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
    });
    return;
  }

  if (Platform.OS !== 'android') {
    return;
  }

  const channelId = await ensureForegroundNotificationChannel();
  if (!channelId) {
    return;
  }

  await notifee.displayNotification({
    title: payload.title ?? 'Notifikasi Baru',
    body: payload.body ?? 'Anda menerima notifikasi baru.',
    data: payload.data,
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
      // WORKAROUND(OTA): `ic_notification` tidak ada di native build saat ini
      // → notifee throw & heads-up gagal tampil. `ic_launcher` selalu ada.
      // Kembalikan ke 'ic_notification' setelah icon masuk build EAS berikutnya.
      smallIcon: 'ic_launcher',
    },
  });
}
