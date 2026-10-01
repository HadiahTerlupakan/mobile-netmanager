/**
 * Aturan isian data inti prospek yang dipakai bersama oleh form
 * "Catat Kegiatan" (prospek baru dari kegiatan) dan form "Tambah
 * Prospek". Meniru netmanager `prospek.validator.ts` (`buatProspekSchema`)
 * dan `kegiatan.validator.ts` (`dataProspekBaruSchema`) — batasnya sama.
 * Hanya untuk UX; server tetap penentu.
 */

export const PANJANG_NAMA_PROSPEK_MIN = 2;
export const PANJANG_NAMA_PROSPEK_MAKS = 120;
export const PANJANG_TELP_PROSPEK_MIN = 8;
export const PANJANG_TELP_PROSPEK_MAKS = 20;
export const PANJANG_ALAMAT_PROSPEK_MIN = 5;
export const PANJANG_ALAMAT_PROSPEK_MAKS = 500;
export const PANJANG_PAKET_PROSPEK_MAKS = 120;
export const PANJANG_CATATAN_PROSPEK_MAKS = 1000;
export const PANJANG_NAMA_REFERRAL_MAKS = 120;

/** Data inti prospek yang diketik sales. */
export interface IsianProspekBaru {
  nama: string;
  noTelp: string;
  alamat: string;
  paketDiminati: string;
}

export type MedanIsianProspek = keyof IsianProspekBaru;

export type KesalahanIsianProspek = Partial<Record<MedanIsianProspek, string>>;

/** Pesan kesalahan berbahasa sederhana untuk sales di lapangan. */
export const PESAN_ISIAN_PROSPEK = {
  namaKosong: 'Nama wajib diisi',
  namaPendek: `Nama terlalu pendek. Tulis minimal ${PANJANG_NAMA_PROSPEK_MIN} huruf`,
  telpKosong: 'Nomor HP wajib diisi',
  telpPendek: `Nomor HP terlalu pendek. Minimal ${PANJANG_TELP_PROSPEK_MIN} angka`,
  telpPanjang: `Nomor HP terlalu panjang. Paling banyak ${PANJANG_TELP_PROSPEK_MAKS} angka`,
  alamatKosong: 'Alamat wajib diisi',
  alamatPendek: 'Alamat terlalu pendek. Tulis lebih lengkap',
  terlaluPanjang: 'Tulisan terlalu panjang. Persingkat sedikit',
} as const;

const panjangBersih = (teks: string): number => teks.trim().length;

/** Pesan untuk isian wajib dengan batas panjang, atau undefined bila sah. */
function periksaPanjang(
  teks: string,
  batas: { min: number; maks: number },
  pesan: { kosong: string; pendek: string; panjang: string },
): string | undefined {
  const panjang = panjangBersih(teks);
  if (panjang === 0) return pesan.kosong;
  if (panjang < batas.min) return pesan.pendek;
  if (panjang > batas.maks) return pesan.panjang;
  return undefined;
}

/**
 * Nomor HP hanya diperiksa panjangnya, tanpa pola karakter — server juga
 * hanya `z.string().min(8).max(20)`. Memaksa hanya-angka akan menolak nomor
 * berspasi/bertanda hubung yang server terima.
 */
function periksaTelp(noTelp: string): string | undefined {
  return periksaPanjang(
    noTelp,
    { min: PANJANG_TELP_PROSPEK_MIN, maks: PANJANG_TELP_PROSPEK_MAKS },
    { kosong: PESAN_ISIAN_PROSPEK.telpKosong, pendek: PESAN_ISIAN_PROSPEK.telpPendek, panjang: PESAN_ISIAN_PROSPEK.telpPanjang },
  );
}

/** Apakah teks opsional melewati batas panjangnya. */
export function isTerlaluPanjang(teks: string, batas: number): boolean {
  return panjangBersih(teks) > batas;
}

/** Kesalahan per medan data inti prospek; objek kosong berarti sah. */
export function validasiIsianProspek(isian: IsianProspekBaru): KesalahanIsianProspek {
  const kesalahan: KesalahanIsianProspek = {
    nama: periksaPanjang(
      isian.nama,
      { min: PANJANG_NAMA_PROSPEK_MIN, maks: PANJANG_NAMA_PROSPEK_MAKS },
      { kosong: PESAN_ISIAN_PROSPEK.namaKosong, pendek: PESAN_ISIAN_PROSPEK.namaPendek, panjang: PESAN_ISIAN_PROSPEK.terlaluPanjang },
    ),
    noTelp: periksaTelp(isian.noTelp),
    alamat: periksaPanjang(
      isian.alamat,
      { min: PANJANG_ALAMAT_PROSPEK_MIN, maks: PANJANG_ALAMAT_PROSPEK_MAKS },
      { kosong: PESAN_ISIAN_PROSPEK.alamatKosong, pendek: PESAN_ISIAN_PROSPEK.alamatPendek, panjang: PESAN_ISIAN_PROSPEK.terlaluPanjang },
    ),
    paketDiminati: isTerlaluPanjang(isian.paketDiminati, PANJANG_PAKET_PROSPEK_MAKS)
      ? PESAN_ISIAN_PROSPEK.terlaluPanjang
      : undefined,
  };
  return buangMedanSah(kesalahan);
}

/** Buang medan tanpa kesalahan supaya objek kosong berarti sah. */
export function buangMedanSah<K extends string>(kesalahan: Partial<Record<K, string | undefined>>): Partial<Record<K, string>> {
  return Object.fromEntries(
    Object.entries(kesalahan).filter(([, pesan]) => pesan !== undefined),
  ) as Partial<Record<K, string>>;
}

/** Teks dipangkas; kosong menjadi null (medan opsional server `.nullable()`). */
export function teksAtauNull(teks: string): string | null {
  const bersih = teks.trim();
  return bersih === '' ? null : bersih;
}
