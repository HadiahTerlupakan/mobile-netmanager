import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

import {
  bisaDimintaLewatDialog,
  laporStatusTracking,
  mintaIzinTracking,
  periksaKesiapanTracking,
  STATUS_SERVER_KENDALA,
  type KendalaTracking,
} from '@/services/kesiapanTracking';
import { LocationTrackingService } from '@/services/LocationTrackingService';
import { logger } from '@/utils/logger';
import {
  tampilkanPeringatanTracking,
  type KonteksPeringatan,
} from '@/utils/peringatanTracking';

/**
 * Check-in hanya boleh bila tracking lokasi bisa berjalan: GPS menyala dan
 * izin lokasi "Izinkan sepanjang waktu". Bila belum, izin diminta lewat
 * disclosure; yang tidak bisa diminta lagi diarahkan ke Pengaturan. Peringatan
 * muncul di setiap percobaan sampai kendalanya beres.
 */
export async function gerbangCheckIn(): Promise<boolean> {
  const kendala = await mintaIzinTracking();
  if (!kendala) return true;
  await peringatkan(kendala, 'check-in');
  return false;
}

/**
 * Mulai tracking sesudah server menerima check-in. Status sesi baru selalu
 * dilaporkan: server belum punya status apa pun untuk sesi ini.
 */
export async function mulaiTrackingCheckIn(): Promise<boolean> {
  const berjalan = await LocationTrackingService.startTracking();
  void laporStatusTracking(berjalan ? 'ACTIVE' : 'START_FAILED', { paksa: true });
  return berjalan;
}

let pemulihanBerjalan: Promise<void> | null = null;

/**
 * Dipanggil selama karyawan masih check-in (aplikasi dibuka lagi, status absen
 * disegarkan). Kendala dilaporkan ke server lalu diperingatkan; bila izinnya
 * sudah kembali, tracking yang mati dinyalakan lagi.
 */
export function pulihkanTrackingSesi(): Promise<void> {
  // Rekonsiliasi saat aplikasi aktif dan layar absensi sering memanggil ini
  // bersamaan; tanpa digabung, "Buka Pengaturan" membuka dua layar pengaturan
  // dan tracking dimulai dua kali.
  if (!pemulihanBerjalan) {
    pemulihanBerjalan = pulihkan().finally(() => {
      pemulihanBerjalan = null;
    });
  }
  return pemulihanBerjalan;
}

async function pulihkan(): Promise<void> {
  const kendala = await periksaKesiapanTracking();
  if (kendala) {
    void laporStatusTracking(STATUS_SERVER_KENDALA[kendala]);
    await peringatkan(kendala, 'sesi');
    // Izin yang diaktifkan dari peringatan: rekonsiliasi saat karyawan kembali
    // ke aplikasi ikut menunggu proses ini, jadi tracking dinyalakan di sini.
    if (await periksaKesiapanTracking()) return;
  }
  if (!(await LocationTrackingService.isTrackingActive())) {
    const berjalan = await LocationTrackingService.startTracking();
    void laporStatusTracking(berjalan ? 'ACTIVE' : 'START_FAILED');
    return;
  }
  void laporStatusTracking('ACTIVE');
}

async function peringatkan(kendala: KendalaTracking, konteks: KonteksPeringatan) {
  const hasil = await tampilkanPeringatanTracking({ kendala, konteks });
  if (hasil === 'pengaturan') await bukaPengaturan(kendala);
}

/**
 * Selama Android masih mengizinkan, izin diminta lewat sistem (didahului
 * disclosure): untuk izin latar belakang itu langsung membuka halaman Izin
 * Lokasi aplikasi. Sesudah diblokir, hanya halaman info aplikasi yang bisa.
 */
async function bukaPengaturan(kendala: KendalaTracking) {
  try {
    if (await bisaDimintaLewatDialog(kendala)) {
      await mintaIzinTracking();
      return;
    }
    if (kendala === 'gps-mati' && Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS,
      );
      return;
    }
    await Linking.openSettings();
  } catch (error) {
    logger.warn('[LocationTracking] Gagal membuka pengaturan:', error);
  }
}
