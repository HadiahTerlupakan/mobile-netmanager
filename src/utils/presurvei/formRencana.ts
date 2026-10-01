import {
  ALAMAT_RENCANA_MAKS,
  ALASAN_BATAL_RENCANA_MAKS,
  ALASAN_BATAL_RENCANA_MIN,
  RENCANA_JENIS_BERALAMAT,
  TUJUAN_RENCANA_MAKS,
  type RencanaJenis,
} from '@/constants/presurvei';
import type { MuatanBuatRencana, MuatanUbahRencana, Rencana } from '@/types/presurvei';

/**
 * Aturan form rencana kunjungan. Meniru `buatRencanaSchema`/`ubahRencanaSchema`
 * dan `batalRencanaSchema` (netmanager `rencana.validator.ts`) untuk UX;
 * server tetap penentu (termasuk "hari ini" menurut zona waktu tenant).
 */

export interface NilaiFormRencana {
  /** "YYYY-MM-DD". */
  tanggal: string;
  /** "HH:mm" atau "" (tanpa jam). */
  jam: string;
  jenis: RencanaJenis | null;
  tujuan: string;
  prospekId: string | null;
  alamat: string;
}

export type MedanFormRencana = 'tanggal' | 'jenis' | 'tujuan' | 'alamat';
export type KesalahanFormRencana = Partial<Record<MedanFormRencana, string>>;

export const PESAN_FORM_RENCANA = {
  tanggalLampau: 'Tanggal rencana tidak boleh sebelum hari ini',
  jenis: 'Pilih jenis kunjungan',
  sales: 'Pilih sales yang ditugasi',
  tujuanKosong: 'Tujuan kunjungan wajib diisi',
  tujuanPanjang: `Tujuan maksimal ${TUJUAN_RENCANA_MAKS} karakter`,
  alamatPanjang: `Alamat maksimal ${ALAMAT_RENCANA_MAKS} karakter`,
  alasanPendek: `Alasan minimal ${ALASAN_BATAL_RENCANA_MIN} karakter`,
  alasanPanjang: `Alasan maksimal ${ALASAN_BATAL_RENCANA_MAKS} karakter`,
} as const;

/** Nilai awal form buat rencana pada `hariIni` ("YYYY-MM-DD"). */
export function nilaiFormRencanaBaru(hariIni: string): NilaiFormRencana {
  return { tanggal: hariIni, jam: '', jenis: 'KUNJUNGAN', tujuan: '', prospekId: null, alamat: '' };
}

/** Nilai form ubah dari rencana yang sudah ada. */
export function nilaiFormDariRencana(rencana: Rencana): NilaiFormRencana {
  return {
    tanggal: rencana.tanggal,
    jam: rencana.jam ?? '',
    jenis: rencana.jenis,
    tujuan: rencana.tujuan,
    prospekId: rencana.prospekId,
    alamat: rencana.alamat ?? '',
  };
}

/**
 * Kesalahan per medan; objek kosong berarti boleh dikirim. Tanggal
 * "YYYY-MM-DD" dibandingkan sebagai teks — urutan leksikalnya sama dengan
 * urutan kalender. Saat mengubah, tanggal yang tidak diganti (`tanggalAsal`)
 * tidak diperiksa: `PATCH` tidak mengirimnya, sehingga rencana terlewat tetap
 * bisa diubah tujuannya tanpa dijadwal ulang.
 */
export function validasiFormRencana(
  nilai: NilaiFormRencana,
  hariIni: string,
  tanggalAsal?: string,
): KesalahanFormRencana {
  const kesalahan: KesalahanFormRencana = {};
  if (nilai.tanggal !== tanggalAsal && nilai.tanggal < hariIni) kesalahan.tanggal = PESAN_FORM_RENCANA.tanggalLampau;
  if (nilai.jenis === null) kesalahan.jenis = PESAN_FORM_RENCANA.jenis;
  const tujuan = nilai.tujuan.trim();
  if (tujuan === '') kesalahan.tujuan = PESAN_FORM_RENCANA.tujuanKosong;
  else if (tujuan.length > TUJUAN_RENCANA_MAKS) kesalahan.tujuan = PESAN_FORM_RENCANA.tujuanPanjang;
  // Alamat disembunyikan untuk Telepon/Chat; kesalahannya tak akan terlihat, jadi tidak diperiksa.
  if (isJenisBeralamat(nilai.jenis) && nilai.alamat.trim().length > ALAMAT_RENCANA_MAKS) kesalahan.alamat = PESAN_FORM_RENCANA.alamatPanjang;
  return kesalahan;
}

/** Pesan kesalahan alasan batal, atau undefined bila sah. */
export function validasiAlasanBatal(alasan: string): string | undefined {
  const panjang = alasan.trim().length;
  if (panjang < ALASAN_BATAL_RENCANA_MIN) return PESAN_FORM_RENCANA.alasanPendek;
  if (panjang > ALASAN_BATAL_RENCANA_MAKS) return PESAN_FORM_RENCANA.alasanPanjang;
  return undefined;
}

const teksAtauNull = (teks: string): string | null => {
  const bersih = teks.trim();
  return bersih === '' ? null : bersih;
};

/** Apakah jenis rencana ini mendatangi tempat sehingga alamat relevan. */
export function isJenisBeralamat(jenis: NilaiFormRencana['jenis']): boolean {
  // Jenis belum dipilih: alamat tetap ditampilkan sampai jelas Telepon/Chat.
  return jenis === null || RENCANA_JENIS_BERALAMAT.includes(jenis);
}

/** Badan `POST` rencana; dipanggil setelah `validasiFormRencana` bersih. */
export function keMuatanBuatRencana(nilai: NilaiFormRencana): MuatanBuatRencana {
  if (nilai.jenis === null) throw new Error('Form rencana belum divalidasi');
  return {
    tanggal: nilai.tanggal,
    jam: nilai.jam === '' ? null : nilai.jam,
    jenis: nilai.jenis,
    tujuan: nilai.tujuan.trim(),
    prospekId: nilai.prospekId,
    // Telepon/Chat tidak mendatangi tempat: alamat yang tersisa dari jenis sebelumnya tidak dikirim.
    alamat: isJenisBeralamat(nilai.jenis) ? teksAtauNull(nilai.alamat) : null,
  };
}

/**
 * Badan `PATCH` rencana: hanya medan yang berbeda dari rencana asal. Objek
 * kosong berarti tidak ada perubahan (server menolak `{}` dengan 400).
 */
export function keMuatanUbahRencana(asal: Rencana, nilai: NilaiFormRencana): MuatanUbahRencana {
  const baru = keMuatanBuatRencana(nilai);
  const lama: MuatanBuatRencana = {
    tanggal: asal.tanggal,
    jam: asal.jam,
    jenis: asal.jenis,
    tujuan: asal.tujuan,
    prospekId: asal.prospekId,
    alamat: asal.alamat,
  };
  const medan = Object.keys(baru) as (keyof MuatanBuatRencana)[];
  return Object.fromEntries(
    medan.filter((kunci) => baru[kunci] !== lama[kunci]).map((kunci) => [kunci, baru[kunci]]),
  ) as MuatanUbahRencana;
}
