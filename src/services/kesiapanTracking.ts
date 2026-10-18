import * as Location from 'expo-location';

import api from '@/services/api';
import { logger } from '@/utils/logger';
import {
  ensureDisclosureBeforeBackground,
  requestForegroundLocationWithDisclosure,
} from '@/utils/locationDisclosure';
import { Storage } from '@/utils/storage';

/** Hal yang mencegah tracking lokasi berjalan selama jam kerja. */
export type KendalaTracking = 'izin-lokasi' | 'izin-latar' | 'gps-mati';

/** Status yang dikenal endpoint `/api/mobile/attendance/tracking-status`. */
export type StatusTrackingServer =
  | 'ACTIVE'
  | 'PERMISSION_DENIED'
  | 'BACKGROUND_DENIED'
  | 'GPS_OFF'
  | 'START_FAILED';

export const STATUS_SERVER_KENDALA: Record<KendalaTracking, StatusTrackingServer> = {
  'izin-lokasi': 'PERMISSION_DENIED',
  'izin-latar': 'BACKGROUND_DENIED',
  'gps-mati': 'GPS_OFF',
};

const ENDPOINT_STATUS_TRACKING = '/api/mobile/attendance/tracking-status';
const STORAGE_KEY_STATUS_TERLAPOR = '@tracking_status_terlapor';

/**
 * Kendala pertama yang membuat tracking tidak bisa berjalan, atau null bila
 * siap. Hanya membaca keadaan HP: tidak memunculkan dialog apa pun.
 */
export async function periksaKesiapanTracking(): Promise<KendalaTracking | null> {
  const depan = await Location.getForegroundPermissionsAsync();
  if (depan.status !== Location.PermissionStatus.GRANTED) return 'izin-lokasi';
  const latar = await Location.getBackgroundPermissionsAsync();
  if (latar.status !== Location.PermissionStatus.GRANTED) return 'izin-latar';
  if (!(await Location.hasServicesEnabledAsync())) return 'gps-mati';
  return null;
}

/**
 * Minta izin yang masih kurang lewat dialog OS (selalu didahului disclosure),
 * lalu periksa ulang. Dialog yang sudah diblokir OS ("jangan tanya lagi", atau
 * Android 11+ sesudah dua kali ditolak) tidak dipaksa muncul: sisanya hanya
 * bisa lewat Pengaturan.
 */
export async function mintaIzinTracking(): Promise<KendalaTracking | null> {
  let kendala = await periksaKesiapanTracking();
  if (kendala === 'izin-lokasi') {
    await requestForegroundLocationWithDisclosure();
    kendala = await periksaKesiapanTracking();
  }
  if (kendala === 'izin-latar') {
    const latar = await Location.getBackgroundPermissionsAsync();
    if (latar.canAskAgain && (await ensureDisclosureBeforeBackground())) {
      await Location.requestBackgroundPermissionsAsync();
    }
    kendala = await periksaKesiapanTracking();
  }
  return kendala;
}

/**
 * Apakah Android masih mau menampilkan dialog izin untuk kendala ini. Untuk
 * izin latar belakang di Android 11+, "dialog" itu adalah halaman Izin Lokasi
 * aplikasi, tempat pilihan "Izinkan sepanjang waktu". Sesudah dua kali
 * ditolak, Android memblokirnya dan hanya Pengaturan yang tersisa.
 */
export async function bisaDimintaLewatDialog(kendala: KendalaTracking): Promise<boolean> {
  if (kendala === 'izin-lokasi') {
    return (await Location.getForegroundPermissionsAsync()).canAskAgain;
  }
  if (kendala === 'izin-latar') {
    return (await Location.getBackgroundPermissionsAsync()).canAskAgain;
  }
  return false;
}

/**
 * Laporkan status tracking sesi kerja ke server. Hanya perubahan yang dikirim,
 * agar setiap kali aplikasi dibuka tidak menambah satu request; `paksa` untuk
 * sesi baru, yang belum punya status sama sekali di server.
 */
export async function laporStatusTracking(
  status: StatusTrackingServer,
  opsi: { paksa?: boolean } = {},
): Promise<void> {
  try {
    if (!opsi.paksa && (await Storage.getItem(STORAGE_KEY_STATUS_TERLAPOR)) === status) {
      return;
    }
    await api.post(ENDPOINT_STATUS_TRACKING, { status });
    await Storage.setItem(STORAGE_KEY_STATUS_TERLAPOR, status);
  } catch (error) {
    logger.warn('[LocationTracking] Gagal melaporkan status tracking:', error);
  }
}
