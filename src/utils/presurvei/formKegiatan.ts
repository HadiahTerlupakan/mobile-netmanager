import {
  JUMLAH_FOTO_KEGIATAN_MAKS,
  KABEL_METER_MAKS,
  type KegiatanHasil,
  type KegiatanJenis,
} from '@/constants/presurvei';
import type { MuatanCatatKegiatan, ProspekBaruKegiatan } from '@/types/presurvei';
import {
  daftarJenisDitawarkan,
  isBolehProspekBaru,
  isButuhDataTeknis,
  isButuhLokasi,
} from './aturanPresurvei';
import type { TitikGps } from './lokasiGps';

/**
 * Aturan form catat kegiatan. Meniru `catatKegiatanSchema`
 * (netmanager `kegiatan.validator.ts`) untuk UX; server tetap penentu.
 * Medan yang tidak berlaku untuk jenisnya tidak divalidasi dan tidak dikirim.
 */

// Batas panjang = kegiatan.validator.ts:19-21 dan 57-63.
const PANJANG_NAMA_MAKS = 120;
const PANJANG_ALAMAT_MAKS = 500;
const PANJANG_CATATAN_MAKS = 1000;
const JUMLAH_FOTO_KEGIATAN_MIN = 1;
const PANJANG_NAMA_PROSPEK_MIN = 2;
const PANJANG_TELP_MIN = 8;
const PANJANG_TELP_MAKS = 20;
const PANJANG_ALAMAT_PROSPEK_MIN = 5;
const POLA_BILANGAN_BULAT = /^\d+$/;

export interface IsianProspekBaru {
  nama: string;
  noTelp: string;
  alamat: string;
  paketDiminati: string;
}

export interface NilaiFormKegiatan {
  jenis: KegiatanJenis | null;
  hasil: KegiatanHasil | null;
  ditemuiNama: string;
  alamat: string;
  catatan: string;
  odpTerdekat: string;
  estimasiKabel: string;
  catatanTeknis: string;
  prospekId: string | null;
  isBuatProspekBaru: boolean;
  prospekBaru: IsianProspekBaru;
}

export const NILAI_FORM_KEGIATAN_KOSONG: NilaiFormKegiatan = Object.freeze({
  jenis: null,
  hasil: null,
  ditemuiNama: '',
  alamat: '',
  catatan: '',
  odpTerdekat: '',
  estimasiKabel: '',
  catatanTeknis: '',
  prospekId: null,
  isBuatProspekBaru: false,
  prospekBaru: Object.freeze({ nama: '', noTelp: '', alamat: '', paketDiminati: '' }),
});

export type MedanFormKegiatan =
  | 'jenis'
  | 'hasil'
  | 'lokasi'
  | 'foto'
  | 'ditemuiNama'
  | 'alamat'
  | 'catatan'
  | 'odpTerdekat'
  | 'estimasiKabel'
  | 'catatanTeknis'
  | 'prospekBaruNama'
  | 'prospekBaruNoTelp'
  | 'prospekBaruAlamat'
  | 'prospekBaruPaket';

export type KesalahanFormKegiatan = Partial<Record<MedanFormKegiatan, string>>;

/** Konteks non-medan yang ikut menentukan keabsahan form. */
export interface KonteksFormKegiatan {
  titik: TitikGps | null;
  jumlahFoto: number;
}

export const PESAN_FORM_KEGIATAN = {
  jenis: 'Pilih jenis kegiatan',
  hasil: 'Pilih hasil kegiatan',
  lokasi: 'Lokasi GPS belum didapat',
  fotoKurang: 'Ambil minimal 1 foto bukti',
  fotoLebih: `Maksimal ${JUMLAH_FOTO_KEGIATAN_MAKS} foto`,
  kabel: `Estimasi kabel harus bilangan bulat 0–${KABEL_METER_MAKS} meter`,
  terlaluPanjang: 'Isian terlalu panjang',
  namaProspek: `Nama minimal ${PANJANG_NAMA_PROSPEK_MIN} huruf`,
  telpProspek: `Nomor HP ${PANJANG_TELP_MIN}–${PANJANG_TELP_MAKS} karakter`,
  alamatProspek: `Alamat minimal ${PANJANG_ALAMAT_PROSPEK_MIN} huruf`,
} as const;

const isTerlaluPanjang = (teks: string, batas: number): boolean => teks.trim().length > batas;

/** Apakah prospek baru benar-benar akan dikirim. */
export function isProspekBaruDipakai(nilai: NilaiFormKegiatan): boolean {
  return nilai.isBuatProspekBaru && isBolehProspekBaru(nilai);
}

function validasiPilihan(nilai: NilaiFormKegiatan): KesalahanFormKegiatan {
  const kesalahan: KesalahanFormKegiatan = {};
  if (nilai.jenis === null || !daftarJenisDitawarkan().includes(nilai.jenis)) {
    kesalahan.jenis = PESAN_FORM_KEGIATAN.jenis;
  }
  if (nilai.hasil === null) kesalahan.hasil = PESAN_FORM_KEGIATAN.hasil;
  return kesalahan;
}

function validasiLapangan(nilai: NilaiFormKegiatan, konteks: KonteksFormKegiatan): KesalahanFormKegiatan {
  if (nilai.jenis === null || !isButuhLokasi(nilai.jenis)) return {};
  const kesalahan: KesalahanFormKegiatan = {};
  if (konteks.titik === null) kesalahan.lokasi = PESAN_FORM_KEGIATAN.lokasi;
  if (konteks.jumlahFoto < JUMLAH_FOTO_KEGIATAN_MIN) kesalahan.foto = PESAN_FORM_KEGIATAN.fotoKurang;
  if (konteks.jumlahFoto > JUMLAH_FOTO_KEGIATAN_MAKS) kesalahan.foto = PESAN_FORM_KEGIATAN.fotoLebih;
  if (isTerlaluPanjang(nilai.alamat, PANJANG_ALAMAT_MAKS)) kesalahan.alamat = PESAN_FORM_KEGIATAN.terlaluPanjang;
  return kesalahan;
}

function validasiUmum(nilai: NilaiFormKegiatan): KesalahanFormKegiatan {
  const kesalahan: KesalahanFormKegiatan = {};
  if (isTerlaluPanjang(nilai.ditemuiNama, PANJANG_NAMA_MAKS)) kesalahan.ditemuiNama = PESAN_FORM_KEGIATAN.terlaluPanjang;
  if (isTerlaluPanjang(nilai.catatan, PANJANG_CATATAN_MAKS)) kesalahan.catatan = PESAN_FORM_KEGIATAN.terlaluPanjang;
  return kesalahan;
}

function isKabelSah(teks: string): boolean {
  const kabel = teks.trim();
  if (kabel === '') return true;
  return POLA_BILANGAN_BULAT.test(kabel) && Number(kabel) <= KABEL_METER_MAKS;
}

function validasiTeknis(nilai: NilaiFormKegiatan): KesalahanFormKegiatan {
  if (nilai.jenis === null || !isButuhDataTeknis(nilai.jenis)) return {};
  const kesalahan: KesalahanFormKegiatan = {};
  if (!isKabelSah(nilai.estimasiKabel)) kesalahan.estimasiKabel = PESAN_FORM_KEGIATAN.kabel;
  if (isTerlaluPanjang(nilai.odpTerdekat, PANJANG_NAMA_MAKS)) kesalahan.odpTerdekat = PESAN_FORM_KEGIATAN.terlaluPanjang;
  if (isTerlaluPanjang(nilai.catatanTeknis, PANJANG_CATATAN_MAKS)) kesalahan.catatanTeknis = PESAN_FORM_KEGIATAN.terlaluPanjang;
  return kesalahan;
}

/**
 * Panjang saja, tanpa pola karakter — server (`dataProspekBaruSchema.noTelp`,
 * `kegiatan.validator.ts:59`) juga hanya `z.string().min(8).max(20)` tanpa
 * regex. Memaksa hanya-digit di klien akan menolak nomor yang server terima.
 */
function isTelpSah(teks: string): boolean {
  const panjang = teks.trim().length;
  return panjang >= PANJANG_TELP_MIN && panjang <= PANJANG_TELP_MAKS;
}

function validasiProspekBaru(nilai: NilaiFormKegiatan): KesalahanFormKegiatan {
  if (!isProspekBaruDipakai(nilai)) return {};
  const { nama, alamat, noTelp, paketDiminati } = nilai.prospekBaru;
  const kesalahan: KesalahanFormKegiatan = {};

  const panjangNama = nama.trim().length;
  if (panjangNama < PANJANG_NAMA_PROSPEK_MIN) {
    kesalahan.prospekBaruNama = PESAN_FORM_KEGIATAN.namaProspek;
  } else if (panjangNama > PANJANG_NAMA_MAKS) {
    kesalahan.prospekBaruNama = PESAN_FORM_KEGIATAN.terlaluPanjang;
  }

  if (!isTelpSah(noTelp)) kesalahan.prospekBaruNoTelp = PESAN_FORM_KEGIATAN.telpProspek;

  const panjangAlamat = alamat.trim().length;
  if (panjangAlamat < PANJANG_ALAMAT_PROSPEK_MIN) {
    kesalahan.prospekBaruAlamat = PESAN_FORM_KEGIATAN.alamatProspek;
  } else if (panjangAlamat > PANJANG_ALAMAT_MAKS) {
    kesalahan.prospekBaruAlamat = PESAN_FORM_KEGIATAN.terlaluPanjang;
  }

  // paketDiminati opsional di server (`dataProspekBaruSchema.paketDiminati`,
  // `kegiatan.validator.ts:62`), hanya batas maksimal yang berlaku.
  if (isTerlaluPanjang(paketDiminati, PANJANG_NAMA_MAKS)) {
    kesalahan.prospekBaruPaket = PESAN_FORM_KEGIATAN.terlaluPanjang;
  }

  return kesalahan;
}

/** Kesalahan per medan; objek kosong berarti boleh disimpan. */
export function validasiFormKegiatan(
  nilai: NilaiFormKegiatan,
  konteks: KonteksFormKegiatan,
): KesalahanFormKegiatan {
  return {
    ...validasiPilihan(nilai),
    ...validasiLapangan(nilai, konteks),
    ...validasiUmum(nilai),
    ...validasiTeknis(nilai),
    ...validasiProspekBaru(nilai),
  };
}

const teksAtauNull = (teks: string): string | null => {
  const bersih = teks.trim();
  return bersih === '' ? null : bersih;
};

/** Kabel kosong → null; "0" tetap 0 (hasil survei yang sah). */
const kabelAtauNull = (teks: string): number | null => {
  const kabel = teks.trim();
  return kabel === '' ? null : Number(kabel);
};

function bagianLapangan(jenis: KegiatanJenis, nilai: NilaiFormKegiatan, titik: TitikGps | null): Partial<MuatanCatatKegiatan> {
  if (!isButuhLokasi(jenis) || titik === null) return {};
  return { latitude: titik.latitude, longitude: titik.longitude, alamatDikunjungi: teksAtauNull(nilai.alamat) };
}

function bagianTeknis(jenis: KegiatanJenis, nilai: NilaiFormKegiatan): Partial<MuatanCatatKegiatan> {
  if (!isButuhDataTeknis(jenis)) return {};
  return {
    odpTerdekat: teksAtauNull(nilai.odpTerdekat),
    estimasiKabelMeter: kabelAtauNull(nilai.estimasiKabel),
    catatanTeknis: teksAtauNull(nilai.catatanTeknis),
  };
}

function bagianProspekBaru(nilai: NilaiFormKegiatan): { prospekBaru?: ProspekBaruKegiatan } {
  if (!isProspekBaruDipakai(nilai)) return {};
  const { nama, noTelp, alamat, paketDiminati } = nilai.prospekBaru;
  return {
    prospekBaru: { nama: nama.trim(), noTelp: noTelp.trim(), alamat: alamat.trim(), paketDiminati: teksAtauNull(paketDiminati) },
  };
}

/**
 * Badan `POST /api/presurvei/kegiatan` tanpa `fotoUrls`. Dipanggil setelah
 * `validasiFormKegiatan` bersih; melempar bila jenis/hasil belum dipilih.
 */
export function keMuatanKegiatan(
  nilai: NilaiFormKegiatan,
  konteks: { titik: TitikGps | null; waktuMulai: Date },
): MuatanCatatKegiatan {
  if (nilai.jenis === null || nilai.hasil === null) {
    throw new Error('Form kegiatan belum divalidasi');
  }
  return {
    jenis: nilai.jenis,
    hasil: nilai.hasil,
    waktuMulai: konteks.waktuMulai.toISOString(),
    prospekId: nilai.prospekId,
    ditemuiNama: teksAtauNull(nilai.ditemuiNama),
    catatan: teksAtauNull(nilai.catatan),
    ...bagianLapangan(nilai.jenis, nilai, konteks.titik),
    ...bagianTeknis(nilai.jenis, nilai),
    ...bagianProspekBaru(nilai),
  };
}
