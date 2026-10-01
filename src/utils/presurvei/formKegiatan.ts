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
import {
  PANJANG_ALAMAT_PROSPEK_MAKS,
  PESAN_ISIAN_PROSPEK,
  isTerlaluPanjang,
  teksAtauNull,
  validasiIsianProspek,
  type IsianProspekBaru,
} from './isianProspek';
import type { TitikGps } from './lokasiGps';

export type { IsianProspekBaru } from './isianProspek';

/**
 * Aturan form catat kegiatan. Meniru `catatKegiatanSchema`
 * (netmanager `kegiatan.validator.ts`) untuk UX; server tetap penentu.
 * Medan yang tidak berlaku untuk jenisnya tidak divalidasi dan tidak dikirim.
 * Aturan data prospek baru dipakai bersama lewat `isianProspek.ts`.
 */

// Batas panjang = kegiatan.validator.ts:19-21.
const PANJANG_NAMA_MAKS = 120;
const PANJANG_ALAMAT_MAKS = PANJANG_ALAMAT_PROSPEK_MAKS;
const PANJANG_CATATAN_MAKS = 1000;
const JUMLAH_FOTO_KEGIATAN_MIN = 1;
const POLA_BILANGAN_BULAT = /^\d+$/;

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
  /** Rencana kunjungan yang dilaporkan lewat form ini; null = kegiatan biasa. */
  rencanaId: string | null;
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
  rencanaId: null,
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
  terlaluPanjang: PESAN_ISIAN_PROSPEK.terlaluPanjang,
  namaProspek: PESAN_ISIAN_PROSPEK.namaPendek,
  telpProspek: PESAN_ISIAN_PROSPEK.telpPendek,
  alamatProspek: PESAN_ISIAN_PROSPEK.alamatPendek,
} as const;

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

/** Data prospek baru memakai aturan bersama form Tambah Prospek (`isianProspek.ts`). */
function validasiProspekBaru(nilai: NilaiFormKegiatan): KesalahanFormKegiatan {
  if (!isProspekBaruDipakai(nilai)) return {};
  const { nama, noTelp, alamat, paketDiminati } = validasiIsianProspek(nilai.prospekBaru);
  const kesalahan: KesalahanFormKegiatan = {};
  if (nama) kesalahan.prospekBaruNama = nama;
  if (noTelp) kesalahan.prospekBaruNoTelp = noTelp;
  if (alamat) kesalahan.prospekBaruAlamat = alamat;
  if (paketDiminati) kesalahan.prospekBaruPaket = paketDiminati;
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
    ...(nilai.rencanaId !== null ? { rencanaId: nilai.rencanaId } : {}),
  };
}
