import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

import { presentForegroundNotification } from '@/services/ForegroundNotificationService';
import { normalizeMessageData } from '@/services/PushNotificationService';
import { PenjagaBurstNotifikasi } from '@/utils/burstNotifikasi';
import { logger } from '@/utils/logger';

const JUDUL_BAWAAN = 'Notifikasi Baru';
const ISI_BAWAAN = 'Anda menerima notifikasi.';

/** Push yang ditampilkan dari latar belakang juga paling banyak berbunyi sekali per burst. */
const penjagaBurst = new PenjagaBurstNotifikasi();

/**
 * Handler FCM saat aplikasi di latar belakang atau tertutup.
 *
 * Push dengan field `notification` ditampilkan Android sendiri, jadi tidak
 * ditampilkan ulang. Push data saja WAJIB ditampilkan manual, kalau tidak
 * pengguna tidak melihat apa pun. Ia memakai layanan yang sama dengan push
 * foreground: channel yang berlaku dan ikon yang ada di build, bukan channel
 * lama `high-priority` yang sudah dibuang.
 */
export async function tanganiPushLatarBelakang(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  if (remoteMessage.notification?.title || remoteMessage.notification?.body) return;

  const data = normalizeMessageData(remoteMessage.data);
  const { isBersuara } = penjagaBurst.putuskan(Date.now());
  try {
    await presentForegroundNotification(
      { title: data.title ?? JUDUL_BAWAAN, body: data.body ?? ISI_BAWAAN, data },
      { isSenyap: !isBersuara },
    );
  } catch (error) {
    // Berjalan tanpa layar; log inilah satu-satunya jejak kegagalannya.
    logger.error('[FCM BG] Failed to display data-only notification:', error);
  }
}
