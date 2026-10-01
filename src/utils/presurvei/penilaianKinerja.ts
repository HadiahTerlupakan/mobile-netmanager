import type {
  IndikatorKepala,
  IndikatorPenilaian,
  IndikatorSales,
  PenilaianSales,
  PredikatPenilaian,
} from '@/types/penilaian';
import { PREDIKAT_PENILAIAN } from '@/types/penilaian';

/**
 * Aturan tampilan penilaian kinerja. Skor dan predikat dihitung server;
 * di sini hanya label, warna, urutan, dan penyaringan.
 */

/** Ambang predikat (sama dengan server): ≥85 sangat baik, ≥70 baik, ≥55 cukup. */
export const AMBANG_SANGAT_BAIK = 85;
export const AMBANG_BAIK = 70;
export const AMBANG_CUKUP = 55;

const PERSEN_MIN = 0;
const PERSEN_MAKS = 100;

export const TEKS_BELUM_TERUKUR = 'Belum terukur';
/** Pengganti angka skor yang belum terukur. */
export const TEKS_SKOR_KOSONG = '–';

export const LABEL_PREDIKAT: Record<PredikatPenilaian, string> = {
  SANGAT_BAIK: 'Sangat baik',
  BAIK: 'Baik',
  CUKUP: 'Cukup',
  PERLU_PEMBINAAN: 'Perlu pembinaan',
};

/** Kelas twrnc satu predikat: lencana (latar + teks) dan bilah. */
export interface GayaPredikat {
  latar: string;
  teks: string;
  bilah: string;
}

const GAYA_PREDIKAT: Record<PredikatPenilaian, GayaPredikat> = {
  SANGAT_BAIK: { latar: 'bg-emerald-50', teks: 'text-emerald-700', bilah: 'bg-emerald-500' },
  BAIK: { latar: 'bg-blue-50', teks: 'text-blue-700', bilah: 'bg-blue-500' },
  CUKUP: { latar: 'bg-amber-50', teks: 'text-amber-700', bilah: 'bg-amber-500' },
  PERLU_PEMBINAAN: { latar: 'bg-rose-50', teks: 'text-rose-700', bilah: 'bg-rose-500' },
};

const GAYA_BELUM_TERUKUR: GayaPredikat = { latar: 'bg-gray-100', teks: 'text-gray-500', bilah: 'bg-gray-300' };

/** Gaya predikat; null (belum terukur) abu-abu. */
export function gayaPredikat(predikat: PredikatPenilaian | null): GayaPredikat {
  return predikat === null ? GAYA_BELUM_TERUKUR : GAYA_PREDIKAT[predikat];
}

/** Label predikat; null → "Belum terukur". */
export function labelPredikat(predikat: PredikatPenilaian | null): string {
  return predikat === null ? TEKS_BELUM_TERUKUR : LABEL_PREDIKAT[predikat];
}

/** Predikat untuk sebuah nilai 0–100 (mewarnai bilah indikator); null tetap null. */
export function predikatDariNilai(nilai: number | null): PredikatPenilaian | null {
  if (nilai === null) return null;
  if (nilai >= AMBANG_SANGAT_BAIK) return 'SANGAT_BAIK';
  if (nilai >= AMBANG_BAIK) return 'BAIK';
  if (nilai >= AMBANG_CUKUP) return 'CUKUP';
  return 'PERLU_PEMBINAAN';
}

/** Skor dibulatkan untuk tampilan; null → "–". */
export function formatSkor(skor: number | null): string {
  return skor === null ? TEKS_SKOR_KOSONG : String(Math.round(skor));
}

/** Lebar bilah 0–100 (persen pencapaian bisa melewati 100); null → 0. */
export function lebarBilah(nilai: number | null): number {
  if (nilai === null) return PERSEN_MIN;
  return Math.min(PERSEN_MAKS, Math.max(PERSEN_MIN, nilai));
}

export const LABEL_INDIKATOR_SALES: Record<keyof IndikatorSales, string> = {
  aktivitas: 'Aktivitas (kunjungan & prospek)',
  konversi: 'Konversi',
  realisasi: 'Realisasi rencana',
};

export const LABEL_INDIKATOR_KEPALA: Record<keyof IndikatorKepala, string> = {
  aktivitasTim: 'Aktivitas tim',
  konversiTim: 'Konversi tim',
  realisasiPenugasan: 'Realisasi penugasan',
  cakupanPembinaan: 'Cakupan pembinaan',
  kinerjaPribadi: 'Kinerja pribadi',
};

/** Satu indikator siap tampil. */
export interface BarisIndikator extends IndikatorPenilaian {
  kunci: string;
  label: string;
}

/** Ubah peta indikator menjadi baris berurutan sesuai urutan label. */
function keBarisIndikator<K extends string>(
  indikator: Record<K, IndikatorPenilaian>,
  label: Record<K, string>,
): BarisIndikator[] {
  return (Object.keys(label) as K[]).map((kunci) => ({ kunci, label: label[kunci], ...indikator[kunci] }));
}

/** Tiga indikator sales berurutan (aktivitas, konversi, realisasi). */
export function daftarIndikatorSales(indikator: IndikatorSales): BarisIndikator[] {
  return keBarisIndikator(indikator, LABEL_INDIKATOR_SALES);
}

/** Lima indikator kepala sales berurutan sesuai bobot. */
export function daftarIndikatorKepala(indikator: IndikatorKepala): BarisIndikator[] {
  return keBarisIndikator(indikator, LABEL_INDIKATOR_KEPALA);
}

/** Indikator bernilai terendah (yang belum terukur diabaikan); null bila semuanya belum terukur. */
export function indikatorTerlemah(daftar: readonly BarisIndikator[]): BarisIndikator | null {
  return daftar.reduce<BarisIndikator | null>((terlemah, baris) => {
    if (baris.nilai === null) return terlemah;
    if (terlemah === null || terlemah.nilai === null || baris.nilai < terlemah.nilai) return baris;
    return terlemah;
  }, null);
}

/** Penjelasan bobot skor, mis. "Konversi 30% · Realisasi rencana 30%". */
export function ringkasBobot(daftar: readonly BarisIndikator[]): string {
  return daftar.map((baris) => `${baris.label} ${baris.bobot}%`).join(' · ');
}

/** Catatan pembagian ulang bobot indikator yang belum terukur. */
export const TEKS_BOBOT_DIBAGI_ULANG =
  'Indikator yang belum terukur tidak dihitung; bobotnya dibagi ke indikator lain.';

/** Filter daftar anggota: semua, satu predikat, atau yang belum terukur. */
export type FilterPredikat = 'SEMUA' | PredikatPenilaian | 'BELUM_TERUKUR';

const cocokFilter = (sales: PenilaianSales, filter: FilterPredikat): boolean => {
  if (filter === 'SEMUA') return true;
  if (filter === 'BELUM_TERUKUR') return sales.predikat === null;
  return sales.predikat === filter;
};

/** Urut skor tertinggi (sales maupun kepala), belum terukur di akhir, seri diurut nama; masukan tidak diubah. */
export function urutkanPerSkor<T extends { skor: number | null; nama: string }>(daftar: readonly T[]): T[] {
  return [...daftar].sort((a, b) => {
    if (a.skor === b.skor) return a.nama.localeCompare(b.nama);
    if (a.skor === null) return 1;
    if (b.skor === null) return -1;
    return b.skor - a.skor;
  });
}

/** Anggota yang cocok filter, urut skor. */
export function saringPerPredikat(daftar: readonly PenilaianSales[], filter: FilterPredikat): PenilaianSales[] {
  return urutkanPerSkor(daftar.filter((sales) => cocokFilter(sales, filter)));
}

/** Opsi chip filter (bentuk `OpsiChip`). */
export interface OpsiFilterPredikat {
  nilai: FilterPredikat;
  label: string;
}

const URUTAN_FILTER: readonly Exclude<FilterPredikat, 'SEMUA'>[] = [...PREDIKAT_PENILAIAN, 'BELUM_TERUKUR'];

const labelFilter = (filter: Exclude<FilterPredikat, 'SEMUA'>): string =>
  filter === 'BELUM_TERUKUR' ? TEKS_BELUM_TERUKUR : LABEL_PREDIKAT[filter];

/** "Semua (n)" lalu hanya predikat yang punya anggota, masing-masing dengan jumlahnya. */
export function opsiFilterPredikat(daftar: readonly PenilaianSales[]): OpsiFilterPredikat[] {
  const opsiPredikat = URUTAN_FILTER.map((filter) => ({
    nilai: filter,
    jumlah: daftar.filter((sales) => cocokFilter(sales, filter)).length,
  }))
    .filter((opsi) => opsi.jumlah > 0)
    .map((opsi) => ({ nilai: opsi.nilai as FilterPredikat, label: `${labelFilter(opsi.nilai)} (${opsi.jumlah})` }));
  return [{ nilai: 'SEMUA', label: `Semua (${daftar.length})` }, ...opsiPredikat];
}
