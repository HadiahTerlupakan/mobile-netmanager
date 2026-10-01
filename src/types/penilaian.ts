import type { BarisPencapaian } from '@/types/presurvei';

/**
 * Penilaian kinerja sales & kepala sales (`GET /api/presurvei/penilaian`).
 * Bentuk disalin dari netmanager `modules/presurvei` (HasilPenilaian).
 */

export const PREDIKAT_PENILAIAN = ['SANGAT_BAIK', 'BAIK', 'CUKUP', 'PERLU_PEMBINAAN'] as const;
export type PredikatPenilaian = (typeof PREDIKAT_PENILAIAN)[number];

/** Satu indikator: nilai 0–100, null = belum terukur (bobotnya dibagi ulang server). */
export interface IndikatorPenilaian {
  nilai: number | null;
  bobot: number;
}

/** Pencapaian target bulanan; bentuk barisnya sama dengan target Beranda. */
export interface PencapaianPenilaian {
  kunjungan: BarisPencapaian;
  prospek: BarisPencapaian;
  konversi: BarisPencapaian;
}

/** Rekap realisasi rencana kunjungan pada periode. */
export interface RealisasiRencanaPenilaian {
  tepatWaktu: number;
  terlambat: number;
  terlewat: number;
}

export interface IndikatorSales {
  aktivitas: IndikatorPenilaian;
  konversi: IndikatorPenilaian;
  realisasi: IndikatorPenilaian;
}

export interface IndikatorKepala {
  aktivitasTim: IndikatorPenilaian;
  konversiTim: IndikatorPenilaian;
  realisasiPenugasan: IndikatorPenilaian;
  cakupanPembinaan: IndikatorPenilaian;
  kinerjaPribadi: IndikatorPenilaian;
}

export interface PenilaianSales {
  salesId: string;
  nama: string;
  kepalaSalesId: string | null;
  skor: number | null;
  predikat: PredikatPenilaian | null;
  indikator: IndikatorSales;
  /** null = target bulan ini belum ditetapkan. */
  pencapaian: PencapaianPenilaian | null;
  rencana: RealisasiRencanaPenilaian;
}

export interface PenilaianKepala {
  kepalaId: string;
  nama: string;
  jumlahAnggota: number;
  skor: number | null;
  predikat: PredikatPenilaian | null;
  indikator: IndikatorKepala;
}

/** Periode penilaian; `bulan` 1–12. */
export interface PeriodePenilaian {
  tahun: number;
  bulan: number;
}

export interface HasilPenilaian {
  periode: PeriodePenilaian;
  /** "YYYY-MM-DD". */
  dihitungSampai: string;
  kepala: PenilaianKepala[];
  /** Urut skor tertinggi, null di akhir. */
  sales: PenilaianSales[];
}
