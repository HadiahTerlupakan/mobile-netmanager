import type { KategoriKeluhan, MuatanLaporKeluhan, PrioritasKeluhan } from '@/types/keluhan';

export const SUBJEK_MIN = 3;
export const SUBJEK_MAKS = 200;
export const DESKRIPSI_MIN = 5;
export const DESKRIPSI_MAKS = 2000;

export interface NilaiFormKeluhan {
  kategori: KategoriKeluhan;
  prioritas: PrioritasKeluhan;
  subjek: string;
  deskripsi: string;
}

export type KesalahanFormKeluhan = Partial<Record<'subjek' | 'deskripsi', string>>;

/** Nilai awal form: gangguan teknis berprioritas normal (keluhan paling umum). */
export const NILAI_FORM_KELUHAN_BARU: NilaiFormKeluhan = {
  kategori: 'TECHNICAL',
  prioritas: 'MEDIUM',
  subjek: '',
  deskripsi: '',
};

/** Usulan judul cepat per kategori, agar sales cukup mengetuk. */
export const USULAN_SUBJEK: Readonly<Record<KategoriKeluhan, readonly string[]>> = {
  TECHNICAL: ['Internet mati', 'Internet lambat', 'Sering putus-putus', 'Lampu LOS merah'],
  BILLING: ['Sudah bayar tapi masih isolir', 'Tagihan tidak sesuai', 'Minta perpanjangan jatuh tempo'],
  ACCOUNT: ['Minta ganti paket', 'Pindah alamat', 'Ganti password WiFi'],
  OTHER: [],
};

/** Periksa isian; objek kosong = sah. */
export function periksaFormKeluhan(nilai: NilaiFormKeluhan): KesalahanFormKeluhan {
  const kesalahan: KesalahanFormKeluhan = {};
  if (nilai.subjek.trim().length < SUBJEK_MIN) kesalahan.subjek = `Judul minimal ${SUBJEK_MIN} huruf.`;
  if (nilai.deskripsi.trim().length < DESKRIPSI_MIN) {
    kesalahan.deskripsi = 'Ceritakan keluhannya: sejak kapan, apa yang sudah dicoba pelanggan.';
  }
  return kesalahan;
}

/** Nilai form → muatan `POST /api/mobile/keluhan`. */
export function keMuatanLaporKeluhan(pelangganId: string, nilai: NilaiFormKeluhan): MuatanLaporKeluhan {
  return {
    pelangganId,
    kategori: nilai.kategori,
    prioritas: nilai.prioritas,
    subjek: nilai.subjek.trim(),
    deskripsi: nilai.deskripsi.trim(),
  };
}
