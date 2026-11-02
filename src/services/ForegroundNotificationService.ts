import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';

/**
 * Android mengunci suara sebuah channel begitu channel itu dibuat — itu hak
 * pengguna, bukan aplikasi. Mengganti nada karena itu menuntut channel dengan
 * id baru; channel lama dibuang supaya tidak menyisakan entri mati di setelan
 * notifikasi perangkat.
 */
const LEGACY_CHANNEL_IDS = ['high-priority', 'high-priority-soft'];
const FOREGROUND_NOTIFICATION_CHANNEL_ID = 'high-priority-bubble';
const FOREGROUND_NOTIFICATION_CHANNEL_NAME = 'High Priority Notifications';

/**
 * Channel push yang diredam: sisa burst dan tumpukan saat aplikasi dibuka.
 * Karena suara melekat pada channel, push senyap butuh channel sendiri;
 * importance LOW tampil di panel notifikasi tanpa bunyi dan tanpa heads-up.
 */
const QUIET_NOTIFICATION_CHANNEL_ID = 'notifikasi-senyap';
const QUIET_NOTIFICATION_CHANNEL_NAME = 'Notifikasi Senyap';
const QUIET_NOTIFICATION_CHANNEL_DESCRIPTION =
  'Notifikasi yang tiba beruntun atau saat aplikasi baru dibuka, tampil tanpa suara.';

/** Push senyap dikumpulkan dalam satu grup agar panel tidak penuh entri terpisah. */
const QUIET_NOTIFICATION_GROUP_ID = 'notifikasi-senyap';
const QUIET_NOTIFICATION_SUMMARY_ID = 'ringkasan-notifikasi-senyap';
const QUIET_NOTIFICATION_SUMMARY_BODY = 'Beberapa notifikasi tiba bersamaan.';

const DEFAULT_TITLE = 'Notifikasi Baru';
const DEFAULT_BODY = 'Anda menerima notifikasi baru.';

/**
 * Nama berkas di `res/raw` (Android, tanpa ekstensi) dan di bundle iOS.
 * Asetnya ada di `assets/sounds/notif_soft.wav`, disalin ke kedua platform
 * oleh `plugins/withNotificationSound.js` saat prebuild.
 */
const NOTIFICATION_SOUND_ANDROID = 'notif_soft';
const NOTIFICATION_SOUND_IOS = 'notif_soft.wav';

// Siluet putih logo RADPRO dari `expo.notification.icon` (app.json); prebuild
// membuatnya sebagai @drawable/notification_icon. Ikon berwarna seperti
// `ic_launcher` dirender Android sebagai kotak putih polos. Aman lewat OTA:
// mengubah app.json menggeser fingerprint runtime, jadi kode ini hanya sampai
// ke build yang sudah membawa drawable-nya.
const ANDROID_SMALL_ICON = 'notification_icon';
const PRESS_ACTION_DEFAULT = { id: 'default' };

export type ForegroundNotificationPayload = {
  title?: string | null;
  body?: string | null;
  data?: Record<string, string>;
};

/** Cara menampilkan push foreground. */
export interface ForegroundPresentationOptions {
  /** Tampil tanpa bunyi dan tanpa heads-up/banner, hanya di panel notifikasi. */
  isSenyap?: boolean;
}

/** Menyiapkan channel Android prioritas tinggi untuk push foreground. */
export async function ensureForegroundNotificationChannel(): Promise<string | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  // Dibuang lebih dulu, dan kegagalannya diabaikan: pada pemasangan baru
  // channel lama memang tidak pernah ada.
  await Promise.all(
    LEGACY_CHANNEL_IDS.map((id) => notifee.deleteChannel(id).catch(() => undefined)),
  );

  return notifee.createChannel({
    id: FOREGROUND_NOTIFICATION_CHANNEL_ID,
    name: FOREGROUND_NOTIFICATION_CHANNEL_NAME,
    importance: AndroidImportance.HIGH,
    sound: NOTIFICATION_SOUND_ANDROID,
  });
}

/** Menyiapkan channel Android tanpa suara untuk push yang diredam. */
function ensureQuietNotificationChannel(): Promise<string> {
  return notifee.createChannel({
    id: QUIET_NOTIFICATION_CHANNEL_ID,
    name: QUIET_NOTIFICATION_CHANNEL_NAME,
    description: QUIET_NOTIFICATION_CHANNEL_DESCRIPTION,
    importance: AndroidImportance.LOW,
    vibration: false,
  });
}

function notificationContent(payload: ForegroundNotificationPayload) {
  return {
    title: payload.title ?? DEFAULT_TITLE,
    body: payload.body ?? DEFAULT_BODY,
    data: payload.data,
  };
}

/**
 * iOS by default suppress notifikasi foreground. Tampilkan eksplisit via
 * notifee agar high-priority alert (work-order assigned, payment due) tidak
 * terlewat user; push senyap hanya masuk Notification Center.
 */
async function presentIosNotification(payload: ForegroundNotificationPayload, isSenyap: boolean) {
  await notifee.displayNotification({
    ...notificationContent(payload),
    ios: isSenyap
      ? { foregroundPresentationOptions: { banner: false, list: true, badge: true, sound: false } }
      : {
          sound: NOTIFICATION_SOUND_IOS,
          foregroundPresentationOptions: { alert: true, badge: true, sound: true },
        },
  });
}

async function presentAndroidAudibleNotification(payload: ForegroundNotificationPayload) {
  const channelId = await ensureForegroundNotificationChannel();
  if (!channelId) {
    return;
  }

  await notifee.displayNotification({
    ...notificationContent(payload),
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      pressAction: PRESS_ACTION_DEFAULT,
      smallIcon: ANDROID_SMALL_ICON,
    },
  });
}

async function presentAndroidQuietNotification(payload: ForegroundNotificationPayload) {
  const channelId = await ensureQuietNotificationChannel();
  const group = { channelId, importance: AndroidImportance.LOW, groupId: QUIET_NOTIFICATION_GROUP_ID };

  await notifee.displayNotification({
    ...notificationContent(payload),
    android: { ...group, pressAction: PRESS_ACTION_DEFAULT, smallIcon: ANDROID_SMALL_ICON },
  });
  // Id ringkasan tetap: menampilkannya lagi memperbarui entri yang sama.
  await notifee.displayNotification({
    id: QUIET_NOTIFICATION_SUMMARY_ID,
    title: DEFAULT_TITLE,
    body: QUIET_NOTIFICATION_SUMMARY_BODY,
    android: { ...group, groupSummary: true, pressAction: PRESS_ACTION_DEFAULT, smallIcon: ANDROID_SMALL_ICON },
  });
}

/** Menampilkan heads-up notification (Android) atau alert iOS saat FCM diterima di foreground. */
export async function presentForegroundNotification(
  payload: ForegroundNotificationPayload,
  { isSenyap = false }: ForegroundPresentationOptions = {},
): Promise<void> {
  if (!payload.title && !payload.body) {
    return;
  }

  if (Platform.OS === 'ios') {
    await presentIosNotification(payload, isSenyap);
    return;
  }

  if (Platform.OS !== 'android') {
    return;
  }

  await (isSenyap ? presentAndroidQuietNotification(payload) : presentAndroidAudibleNotification(payload));
}
