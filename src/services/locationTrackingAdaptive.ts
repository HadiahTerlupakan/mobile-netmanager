import * as Location from 'expo-location';
import { Storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import {
  buildLocationTaskOptions,
  getLocationConfig,
  kunciKonfigurasi,
  type LocationTrackingConfig,
} from './locationTrackingConfig';

export const STORAGE_KEY_CONFIG = '@location_tracking_config';

/** Catat konfigurasi yang baru dipasang agar task tahu kapan perlu menggantinya. */
export async function catatKonfigurasiTerpasang(config: LocationTrackingConfig): Promise<void> {
  await Storage.setItem(STORAGE_KEY_CONFIG, kunciKonfigurasi(config));
}

/** Lupakan konfigurasi terpasang saat tracking dihentikan. */
export async function lupakanKonfigurasiTerpasang(): Promise<void> {
  await Storage.removeItem(STORAGE_KEY_CONFIG);
}

/**
 * Check-out yang terjadi selagi pendaftaran ulang berjalan menghapus catatan
 * konfigurasi dan menghentikan task; pendaftaran ulang yang selesai sesudahnya
 * menyalakannya lagi. Bila catatannya hilang, hentikan kembali.
 */
async function batalkanBilaSudahDihentikan(taskName: string): Promise<boolean> {
  if (await Storage.getItem(STORAGE_KEY_CONFIG)) return false;
  await Location.stopLocationUpdatesAsync(taskName);
  return true;
}

/**
 * Pasang ulang opsi tracking bila baterai atau status bergerak menuntut tier
 * lain. Dulu konfigurasi hanya dihitung saat check-in: check-in dengan baterai
 * 12% berarti interval 60 menit seharian walau HP sudah dicas, dan check-in
 * sambil diam berarti tidak pernah dipercepat saat karyawan mulai jalan.
 *
 * Di Android, mendaftar ulang dari background hanya memulai ulang permintaan
 * lokasi; foreground service yang sudah berjalan tidak disentuh.
 */
export async function sesuaikanKonfigurasi(
  taskName: string,
  kondisi: { batteryLevel?: number; isMoving: boolean },
): Promise<void> {
  if (__DEV__ || kondisi.batteryLevel === undefined) return;
  const config = getLocationConfig(kondisi.batteryLevel, kondisi.isMoving);
  const terpasang = await Storage.getItem(STORAGE_KEY_CONFIG);
  // Tanpa catatan berarti tracking tidak sedang dijalankan aplikasi ini
  // (sudah dihentikan, atau dimulai versi lama): mendaftar ulang di sini akan
  // menyalakan lagi tracking yang seharusnya mati.
  if (!terpasang || terpasang === kunciKonfigurasi(config)) return;
  try {
    await Location.startLocationUpdatesAsync(taskName, buildLocationTaskOptions(config));
    if (await batalkanBilaSudahDihentikan(taskName)) return;
    await catatKonfigurasiTerpasang(config);
    logger.info(`[LocationTracking] Interval disesuaikan: ${config.timeInterval / 60000}m`);
  } catch (error) {
    logger.warn('[LocationTracking] Gagal menyesuaikan interval, tetap memakai yang lama:', error);
  }
}
