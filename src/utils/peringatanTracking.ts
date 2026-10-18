import { logger } from '@/utils/logger';
import type { KendalaTracking } from '@/services/kesiapanTracking';

/**
 * `check-in`: tombol check-in ditahan sampai kendalanya beres.
 * `sesi`: karyawan sedang bekerja dan tracking-nya mati.
 */
export type KonteksPeringatan = 'check-in' | 'sesi';

export type HasilPeringatan = 'pengaturan' | 'checkout' | 'tutup';

export interface PermintaanPeringatan {
  kendala: KendalaTracking;
  konteks: KonteksPeringatan;
}

type PresenterPeringatan = (permintaan: PermintaanPeringatan) => Promise<HasilPeringatan>;

let presenter: PresenterPeringatan | null = null;
let peringatanBerjalan: Promise<HasilPeringatan> | null = null;

/** Didaftarkan PeringatanTrackingProvider saat mount. */
export function setPeringatanTrackingPresenter(next: PresenterPeringatan | null) {
  presenter = next;
}

/**
 * Tampilkan peringatan tracking dan tunggu pilihan karyawan. Pemanggil yang
 * datang bersamaan (rekonsiliasi saat aplikasi aktif dan layar absensi)
 * berbagi satu modal.
 */
export function tampilkanPeringatanTracking(
  permintaan: PermintaanPeringatan,
): Promise<HasilPeringatan> {
  if (!presenter) {
    logger.warn('[LocationTracking] Presenter peringatan belum terdaftar');
    return Promise.resolve('tutup');
  }
  if (!peringatanBerjalan) {
    peringatanBerjalan = presenter(permintaan).finally(() => {
      peringatanBerjalan = null;
    });
  }
  return peringatanBerjalan;
}

/** HANYA untuk test, agar state tidak bocor antar test. */
export function __resetPeringatanTrackingForTest() {
  presenter = null;
  peringatanBerjalan = null;
}
