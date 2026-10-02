import type { KategoriKeluhan, MuatanLaporKeluhan, PrioritasKeluhan } from '@/types/keluhan';

export const SUBJEK_MIN = 3;
export const SUBJEK_MAKS = 200;
export const DESKRIPSI_MIN = 5;
export const DESKRIPSI_MAKS = 2000;
export const FOTO_KELUHAN_MAKS = 5;

export interface NilaiFormKeluhan {
  kategori: KategoriKeluhan;
  prioritas: PrioritasKeluhan;
  subjek: string;
  deskripsi: string;
  /** URI lokal foto; diunggah saat dikirim. */
  fotoLokal: string[];
}

export type KesalahanFormKeluhan = Partial<Record<'subjek' | 'deskripsi' | 'foto', string>>;

/** Nilai awal form: gangguan teknis berprioritas normal (keluhan paling umum). */
export const NILAI_FORM_KELUHAN_BARU: NilaiFormKeluhan = {
  kategori: 'TECHNICAL',
  prioritas: 'MEDIUM',
  subjek: '',
  deskripsi: '',
  fotoLokal: [],
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
  if (nilai.fotoLokal.length === 0) {
    kesalahan.foto = 'Lampirkan minimal satu foto: lampu modem, layar speedtest, atau kondisi di lokasi.';
  }
  return kesalahan;
}

/** Nilai form + URL foto terunggah → muatan `POST /api/mobile/keluhan`. */
export function keMuatanLaporKeluhan(pelangganId: string, nilai: NilaiFormKeluhan, foto: string[]): MuatanLaporKeluhan {
  return {
    pelangganId,
    foto,
    kategori: nilai.kategori,
    prioritas: nilai.prioritas,
    subjek: nilai.subjek.trim(),
    deskripsi: nilai.deskripsi.trim(),
  };
}
