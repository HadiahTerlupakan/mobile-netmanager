import type { HasilPenilaian, PenilaianKepala, PenilaianSales, PredikatPenilaian } from '@/types/penilaian';
import { PREDIKAT_PENILAIAN } from '@/types/penilaian';

/**
 * Jenis tampilan penilaian ditentukan dari ISI respons + id pengguna, bukan
 * dari `lingkupRencana` profil. Server sudah memotong respons sesuai lingkup
 * izin penilaian pemanggil, jadi respons adalah sumber kebenaran tunggal:
 * profil lama/cache offline bisa tertinggal dari izin yang berubah, dan
 * lingkup rencana tidak harus sama dengan lingkup penilaian.
 *
 * - KEPALA: ada baris `kepala` milik pengguna (server mengirim dirinya + timnya).
 * - SALES : tak ada baris kepala sama sekali dan ada baris `sales` milik pengguna.
 * - SEMUA : selain itu, bila respons berisi baris (admin/manajer melihat
 *           kepala-kepala orang lain dan/atau seluruh sales).
 * - null  : respons kosong.
 */
export type TampilanPenilaian =
  | { jenis: 'KEPALA'; kepala: PenilaianKepala; sales: PenilaianSales | null }
  | { jenis: 'SALES'; sales: PenilaianSales }
  | { jenis: 'SEMUA'; kepala: PenilaianKepala[]; sales: PenilaianSales[] }
  | null;

/** Jenis tampilan untuk respons & pengguna ini (lihat aturan di atas). */
export function tentukanTampilanPenilaian(hasil: HasilPenilaian, penggunaId: string | null): TampilanPenilaian {
  const kepalaSaya = hasil.kepala.find((baris) => baris.kepalaId === penggunaId);
  const salesSaya = hasil.sales.find((baris) => baris.salesId === penggunaId) ?? null;
  if (kepalaSaya) return { jenis: 'KEPALA', kepala: kepalaSaya, sales: salesSaya };
  if (hasil.kepala.length === 0 && salesSaya) return { jenis: 'SALES', sales: salesSaya };
  // Sesi belum termuat, lingkup sales biasa (tepat satu baris) tetap dikenali.
  if (penggunaId === null && hasil.kepala.length === 0 && hasil.sales.length === 1) {
    return { jenis: 'SALES', sales: hasil.sales[0] };
  }
  if (hasil.kepala.length === 0 && hasil.sales.length === 0) return null;
  return { jenis: 'SEMUA', kepala: hasil.kepala, sales: hasil.sales };
}

/** Tab layar penilaian. */
export type TabPenilaian = 'SAYA' | 'TIM' | 'KEPALA' | 'SALES';

const TAB_VALID: readonly TabPenilaian[] = ['SAYA', 'TIM', 'KEPALA', 'SALES'];

/** Opsi tab (bentuk `OpsiChip`). */
export interface OpsiTabPenilaian {
  nilai: TabPenilaian;
  label: string;
}

/** Anggota tim kepala sales, tanpa baris sales milik kepala itu sendiri. */
export function anggotaTimKepala(sales: readonly PenilaianSales[], kepalaId: string): PenilaianSales[] {
  return sales.filter((baris) => baris.kepalaSalesId === kepalaId && baris.salesId !== kepalaId);
}

/** Anggota tim pengguna (kepala): seluruh sales dalam respons kecuali dirinya. */
export function anggotaTimSaya(sales: readonly PenilaianSales[], penggunaId: string): PenilaianSales[] {
  return sales.filter((baris) => baris.salesId !== penggunaId);
}

/** Tab yang tersedia: sales biasa tanpa tab; kepala Saya + Tim; lingkup SEMUA Kepala sales + Semua sales. */
export function opsiTabPenilaian(tampilan: TampilanPenilaian): OpsiTabPenilaian[] {
  if (tampilan === null || tampilan.jenis === 'SALES') return [];
  if (tampilan.jenis === 'KEPALA') {
    return [
      { nilai: 'SAYA', label: 'Saya' },
      { nilai: 'TIM', label: `Tim (${tampilan.kepala.jumlahAnggota})` },
    ];
  }
  return [
    { nilai: 'KEPALA', label: `Kepala sales (${tampilan.kepala.length})` },
    { nilai: 'SALES', label: `Semua sales (${tampilan.sales.length})` },
  ];
}

/** Tab aktif: pilihan pengguna bila tersedia pada tampilan ini, selain itu tab pertama (null = tanpa tab). */
export function tabAktifPenilaian(opsi: readonly OpsiTabPenilaian[], dipilih: TabPenilaian | null): TabPenilaian | null {
  if (dipilih !== null && opsi.some((item) => item.nilai === dipilih)) return dipilih;
  return opsi[0]?.nilai ?? null;
}

/** Baca param rute `tab`; nilai tak dikenal → null. */
export function bacaTabPenilaian(nilai: string | undefined): TabPenilaian | null {
  return TAB_VALID.find((tab) => tab === nilai) ?? null;
}

/** Nama kepala per id, untuk keterangan kecil di baris "Semua sales". */
export function petaNamaKepala(kepala: readonly PenilaianKepala[]): ReadonlyMap<string, string> {
  return new Map(kepala.map((baris) => [baris.kepalaId, baris.nama]));
}

/** Jumlah kepala per predikat (hanya yang ada, null = belum terukur di akhir). */
export interface SebaranPredikat {
  predikat: PredikatPenilaian | null;
  jumlah: number;
}

/** Ringkasan kinerja seluruh kepala sales untuk Beranda lingkup SEMUA. */
export interface RingkasanKepala {
  jumlah: number;
  /** Rata-rata skor kepala yang terukur; null bila belum ada. */
  rataRataSkor: number | null;
  sebaran: SebaranPredikat[];
  /** Kepala terukur dengan skor terendah. */
  terendah: PenilaianKepala | null;
}

const rataRata = (nilai: readonly number[]): number | null =>
  nilai.length === 0 ? null : nilai.reduce((jumlah, satu) => jumlah + satu, 0) / nilai.length;

/** Sebaran predikat dalam urutan predikat, lalu belum terukur. */
function sebaranPredikat(kepala: readonly PenilaianKepala[]): SebaranPredikat[] {
  return [...PREDIKAT_PENILAIAN, null]
    .map((predikat) => ({ predikat, jumlah: kepala.filter((baris) => baris.predikat === predikat).length }))
    .filter((item) => item.jumlah > 0);
}

/** Ringkas daftar kepala: jumlah, rata-rata skor terukur, sebaran predikat, dan skor terendah. */
export function ringkasKepala(kepala: readonly PenilaianKepala[]): RingkasanKepala {
  const terukur = kepala.filter((baris): baris is PenilaianKepala & { skor: number } => baris.skor !== null);
  const terendah = terukur.reduce<PenilaianKepala | null>(
    (paling, baris) => (paling === null || baris.skor < (paling.skor ?? Infinity) ? baris : paling),
    null,
  );
  return {
    jumlah: kepala.length,
    rataRataSkor: rataRata(terukur.map((baris) => baris.skor)),
    sebaran: sebaranPredikat(kepala),
    terendah,
  };
}
