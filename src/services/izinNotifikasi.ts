/**
 * Gerbang permintaan izin notifikasi.
 *
 * `syncFCMTokenToBackend` sengaja tidak pernah memunculkan dialog izin: dialog
 * sistem yang muncul tiba-tiba saat sign-in, tanpa penjelasan, hampir selalu
 * ditolak — dan di Android 13+ penolakan itu permanen sampai pengguna masuk ke
 * Pengaturan sendiri. Komentarnya menitipkan dialog itu ke "onboarding screen",
 * tetapi layar itu tidak pernah dibuat. Akibatnya `POST_NOTIFICATIONS` tidak
 * pernah diminta sama sekali: token FCM tidak pernah terdaftar, dan push ke
 * teknisi diam-diam tidak pernah sampai.
 *
 * Modul ini yang menutup lubang itu: menjelaskan dulu untuk apa notifikasi
 * dipakai, baru meminta izin OS, dan hanya bertanya sekali.
 */

import { fcmService } from '@/services/FirebaseMessagingService';
import { Storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

/** Penanda bahwa pre-prompt sudah pernah dijawab — setuju maupun menolak. */
const KUNCI_SUDAH_DITANYA = 'izin_notifikasi_sudah_ditanya';

const SUDAH = 'ya';

/**
 * Apakah pre-prompt perlu ditampilkan sekarang.
 *
 * Tidak ditampilkan bila izin sudah diberikan (tidak ada yang perlu diminta)
 * atau bila pengguna sudah pernah menjawabnya. Menanyakan ulang setiap kali
 * aplikasi dibuka akan terasa seperti memaksa, dan dialog OS-nya pun tidak akan
 * muncul lagi setelah ditolak.
 */
export async function perluTanyaIzinNotifikasi(): Promise<boolean> {
  if (await fcmService.hasUserPermission()) return false;
  return (await Storage.getItem(KUNCI_SUDAH_DITANYA)) !== SUDAH;
}

/** Catat bahwa pengguna sudah menjawab pre-prompt, apa pun jawabannya. */
export async function catatIzinNotifikasiSudahDitanya(): Promise<void> {
  await Storage.setItem(KUNCI_SUDAH_DITANYA, SUDAH);
}

/**
 * Minta izin OS lalu daftarkan token FCM. Mengembalikan true bila push aktif.
 *
 * Pendaftaran token ikut di sini karena izin tanpa token tidak mengirimkan apa
 * pun: `syncFCMTokenToBackend` terakhir berjalan saat izin masih ditolak dan
 * berhenti di gerbangnya sendiri, jadi tidak ada yang memanggilnya lagi sampai
 * sesi berikutnya.
 */
export async function aktifkanNotifikasi(): Promise<boolean> {
  const diizinkan = await fcmService.requestUserPermission();
  if (!diizinkan) {
    logger.info('[IzinNotifikasi] Pengguna menolak izin notifikasi di dialog OS.');
    return false;
  }

  await fcmService.syncFCMTokenToBackend('add');
  return true;
}
