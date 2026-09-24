import type { LocationResult } from '@/hooks/useLocationWithTimeout';

/** Titik GPS kegiatan; tidak pernah diketik manual. */
export interface TitikGps {
  latitude: number;
  longitude: number;
  akurasiMeter: number | null;
}

export type StatusLokasi = 'belum' | 'mencari' | 'siap' | 'gagal' | 'izin_ditolak';

/** Keadaan pencarian lokasi kegiatan. */
export interface KeadaanLokasi {
  status: StatusLokasi;
  titik: TitikGps | null;
  alamatTerdeteksi: string;
}

// Amandemen preflight (task-10, G11): konstanta dibekukan agar konsumen
// tidak bisa diam-diam memutasi state bersama ini.
export const KEADAAN_LOKASI_AWAL: KeadaanLokasi = Object.freeze({
  status: 'belum',
  titik: null,
  alamatTerdeteksi: '',
});
export const KEADAAN_LOKASI_MENCARI: KeadaanLokasi = Object.freeze({
  status: 'mencari',
  titik: null,
  alamatTerdeteksi: '',
});
/**
 * Amandemen preflight (task-10, S16): izin lokasi ditolak BUKAN "GPS gagal" —
 * sales perlu diarahkan membuka pengaturan izin, bukan disuruh menyalakan GPS.
 */
export const KEADAAN_LOKASI_IZIN_DITOLAK: KeadaanLokasi = Object.freeze({
  status: 'izin_ditolak',
  titik: null,
  alamatTerdeteksi: '',
});

/** Teks status lokasi; `Record` memaksa status baru dijawab saat kompilasi. */
export const TEKS_STATUS_LOKASI: Record<StatusLokasi, string> = {
  belum: 'Menunggu GPS…',
  mencari: 'Mencari lokasi GPS…',
  siap: 'Lokasi didapat',
  gagal: 'GPS gagal. Pastikan GPS aktif lalu coba lagi.',
  izin_ditolak: 'Izin lokasi ditolak. Buka Pengaturan untuk mengizinkan lokasi, lalu coba lagi.',
};

/**
 * Titik dari hasil hook lokasi, atau null bila koordinat tidak didapat.
 * Dibandingkan dengan string kosong, bukan truthiness: "0" adalah koordinat sah.
 */
export function bacaTitikGps(hasil: LocationResult): TitikGps | null {
  if (hasil.latitude === '' || hasil.longitude === '') return null;
  const latitude = Number(hasil.latitude);
  const longitude = Number(hasil.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude, akurasiMeter: hasil.accuracy };
}

/** Keadaan akhir satu pencarian lokasi. */
export function keadaanDariHasil(hasil: LocationResult): KeadaanLokasi {
  const titik = bacaTitikGps(hasil);
  if (titik === null) return { status: 'gagal', titik: null, alamatTerdeteksi: '' };
  return { status: 'siap', titik, alamatTerdeteksi: hasil.locationName };
}

/** Teks akurasi untuk ditampilkan di bawah peta. */
export function teksAkurasi(akurasiMeter: number | null): string {
  return akurasiMeter === null ? 'Akurasi tidak diketahui' : `±${Math.round(akurasiMeter)} m`;
}
