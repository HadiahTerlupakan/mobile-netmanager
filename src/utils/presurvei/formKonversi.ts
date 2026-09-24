import { KABEL_METER_MAKS, type ProspekStatus } from '@/constants/presurvei';
import type { MuatanJadikanCanvasing } from '@/types/presurvei';

/**
 * Form Jadikan Canvasing, meniru `jadikanCanvasingSchema`
 * (netmanager `konversi.validator.ts:11-24`) dan batas kabel marketing
 * (`app/admin/presurvei/prospek/konversiFormState.ts:17-21`, minimal 1 meter).
 */

const PANJANG_KTP_MIN = 16;
/**
 * Batas panjang No. KTP (schema `jadikanCanvasingSchema`). Diekspor supaya
 * layar dan hook memakai angka yang sama persis (`maxLength` isian) —
 * amandemen preflight-scan.md G12: sebelumnya diduplikasi di layar.
 */
export const PANJANG_KTP_MAKS = 20;
const PANJANG_PAKET_MAKS = 120;
const KABEL_MINIMAL_METER = 1;
const POLA_BILANGAN_BULAT = /^\d+$/;

/**
 * Status yang menandai prospek sudah boleh langsung dikonversi tanpa
 * dipindah lebih dulu. Diekspor dari sini (bukan dari
 * `useJadikanCanvasing.ts`) supaya layar dan hook memakai satu sumber tanpa
 * saling bergantung, dan supaya nilainya tetap tersedia di test layar yang
 * memock `useJadikanCanvasing` (amandemen preflight-scan.md G12).
 */
export const STATUS_DEAL: ProspekStatus = 'DEAL';

/** Nilai form Jadikan Canvasing: No. KTP, paket, dan panjang kabel opsional (teks mentah, belum divalidasi). */
export interface NilaiFormKonversi {
  noKtp: string;
  paket: string;
  kabel: string;
}

/** Nilai awal form, sebelum sales mengisi apa pun. */
export const NILAI_FORM_KONVERSI_KOSONG: NilaiFormKonversi = Object.freeze({ noKtp: '', paket: '', kabel: '' });

/** Pesan kesalahan per field form; objek kosong berarti form boleh dikirim. */
export type KesalahanFormKonversi = Partial<Record<keyof NilaiFormKonversi | 'fotoKtp', string>>;

/** Teks pesan kesalahan form Jadikan Canvasing, satu per field. */
export const PESAN_FORM_KONVERSI = {
  noKtp: `Nomor KTP harus ${PANJANG_KTP_MIN}–${PANJANG_KTP_MAKS} karakter`,
  paket: 'Paket wajib diisi',
  kabel: `Panjang kabel harus bilangan bulat ${KABEL_MINIMAL_METER}–${KABEL_METER_MAKS} meter`,
  // Sengaja beda jauh dari label tombol "Ambil Foto KTP"/"Ulangi Foto KTP"
  // (amandemen preflight-scan.md R15: sebelumnya cuma beda huruf besar/kecil,
  // rapuh untuk test berbasis teks).
  fotoKtp: 'Foto KTP belum diambil',
} as const;

function isKabelSah(teks: string): boolean {
  const kabel = teks.trim();
  if (kabel === '') return true;
  if (!POLA_BILANGAN_BULAT.test(kabel)) return false;
  const meter = Number(kabel);
  return meter >= KABEL_MINIMAL_METER && meter <= KABEL_METER_MAKS;
}

/** Kesalahan form konversi; objek kosong berarti boleh dikirim. */
export function validasiFormKonversi(nilai: NilaiFormKonversi, fotoKtpLokal: string | null): KesalahanFormKonversi {
  const kesalahan: KesalahanFormKonversi = {};
  const panjangKtp = nilai.noKtp.trim().length;
  const panjangPaket = nilai.paket.trim().length;
  if (panjangKtp < PANJANG_KTP_MIN || panjangKtp > PANJANG_KTP_MAKS) kesalahan.noKtp = PESAN_FORM_KONVERSI.noKtp;
  if (panjangPaket === 0 || panjangPaket > PANJANG_PAKET_MAKS) kesalahan.paket = PESAN_FORM_KONVERSI.paket;
  if (!isKabelSah(nilai.kabel)) kesalahan.kabel = PESAN_FORM_KONVERSI.kabel;
  if (fotoKtpLokal === null) kesalahan.fotoKtp = PESAN_FORM_KONVERSI.fotoKtp;
  return kesalahan;
}

/**
 * Badan konversi. Kabel kosong TIDAK dikirim (bukan null): `kabel` di schema
 * hanya `.optional()`, dan server lalu memakai estimasi survei terakhir
 * (netmanager `ProspekKonversiService.ts`, `bangunMasukanCanvasing`).
 */
export function keMuatanKonversi(nilai: NilaiFormKonversi, fotoKtpUrl: string): MuatanJadikanCanvasing {
  const kabel = nilai.kabel.trim();
  return {
    noKtp: nilai.noKtp.trim(),
    paket: nilai.paket.trim(),
    ...(kabel === '' ? {} : { kabel: Number(kabel) }),
    fotoKtp: fotoKtpUrl,
  };
}
