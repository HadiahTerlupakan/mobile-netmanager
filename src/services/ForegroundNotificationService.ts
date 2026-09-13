import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';

/**
 * Android mengunci suara sebuah channel begitu channel itu dibuat — itu hak
 * pengguna, bukan aplikasi. Mengganti nada karena itu menuntut channel dengan
 * id baru; channel lama dibuang supaya tidak menyisakan entri mati di setelan
 * notifikasi perangkat.
 */
const LEGACY_CHANNEL_ID = 'high-priority';
const FOREGROUND_NOTIFICATION_CHANNEL_ID = 'high-priority-soft';
const FOREGROUND_NOTIFICATION_CHANNEL_NAME = 'High Priority Notifications';

/**
 * Nama berkas di `res/raw` (Android, tanpa ekstensi) dan di bundle iOS.
 * Asetnya ada di `assets/sounds/notif_soft.wav`, disalin ke kedua platform
 * oleh `plugins/withNotificationSound.js` saat prebuild.
 */
const NOTIFICATION_SOUND_ANDROID = 'notif_soft';
const NOTIFICATION_SOUND_IOS = 'notif_soft.wav';

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

  // Dibuang lebih dulu, dan kegagalannya diabaikan: pada pemasangan baru
  // channel lama memang tidak pernah ada.
  await notifee.deleteChannel(LEGACY_CHANNEL_ID).catch(() => undefined);

  return notifee.createChannel({
    id: FOREGROUND_NOTIFICATION_CHANNEL_ID,
    name: FOREGROUND_NOTIFICATION_CHANNEL_NAME,
    importance: AndroidImportance.HIGH,
    sound: NOTIFICATION_SOUND_ANDROID,
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
        sound: NOTIFICATION_SOUND_IOS,
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
