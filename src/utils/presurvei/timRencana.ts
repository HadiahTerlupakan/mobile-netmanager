import type { LingkupRencana } from '@/constants/presurvei';
import type { BarisRekapRencana, Rencana, SalesRencana } from '@/types/presurvei';
import { isBolehAturRencana, isRencanaTerbuka, keTanggalKalender } from './rencana';
import { geserHari } from './rentangHari';

/**
 * Aturan tampilan rencana bagi pemberi tugas (kepala sales/admin). Server
 * tetap penentu (netmanager `rencana-rules.ts` `isBolehMengatur`); ini hanya
 * menyembunyikan aksi yang pasti ditolak.
 */

/**
 * Selisih hari terjauh rekap terlewat tim. `rekapRencanaSchema` menolak
 * selisih ≥ 92 hari (`RENTANG_REKAP_HARI_MAKS`), jadi 91 adalah batas atasnya.
 */
export const RENTANG_REKAP_TERLEWAT_HARI = 91;

/** Lingkup pengguna yang sedang masuk, sebagaimana dibutuhkan layar rencana. */
export interface LingkupPengguna {
  isPemberiTugas: boolean;
  /** Id pengguna; null selama sesi belum termuat. */
  penggunaId: string | null;
}

/** Pemberi tugas = lingkup TIM (kepala sales) atau SEMUA (admin); profil lama tanpa medan = sales biasa. */
export function isPemberiTugas(lingkup: LingkupRencana | null | undefined): boolean {
  return lingkup === 'TIM' || lingkup === 'SEMUA';
}

/**
 * Filter daftar rencana "milik sendiri". Bagi pemberi tugas server
 * mengembalikan rencana tim juga, jadi `salesId` dirinya ikut dikirim; bagi
 * sales biasa filter tidak diubah (server sudah mengikatnya ke miliknya).
 */
export function filterMilikSendiri<T extends object>(
  filter: T,
  lingkup: LingkupPengguna,
): T | (T & { salesId: string }) {
  if (!lingkup.isPemberiTugas || lingkup.penggunaId === null) return filter;
  return { ...filter, salesId: lingkup.penggunaId };
}

/** Aksi yang boleh ditawarkan di rincian rencana. */
export interface HakAksesRencana {
  isBolehLaporkan: boolean;
  isBolehAtur: boolean;
}

/**
 * Sales biasa: laporkan rencana terbuka, atur hanya MANDIRI. Pemberi tugas:
 * atur semua rencana terbuka dalam lingkup, tetapi melaporkan hanya
 * rencananya sendiri (laporan adalah kunjungan si sales, bukan atasannya).
 */
export function hakAksesRencana(
  rencana: Pick<Rencana, 'salesId' | 'sumber' | 'status' | 'statusTampil'>,
  lingkup: LingkupPengguna,
): HakAksesRencana {
  const isTerbuka = isRencanaTerbuka(rencana);
  if (!lingkup.isPemberiTugas) {
    return { isBolehLaporkan: isTerbuka, isBolehAtur: isBolehAturRencana(rencana) };
  }
  return {
    isBolehLaporkan: isTerbuka && rencana.salesId === lingkup.penggunaId,
    isBolehAtur: isTerbuka,
  };
}

/** Rentang rekap terlewat tim: 91 hari ke belakang sampai hari ini ("YYYY-MM-DD"). */
export function rentangTerlewatTim(hariIni: Date): { dari: string; sampai: string } {
  return {
    dari: keTanggalKalender(geserHari(hariIni, -RENTANG_REKAP_TERLEWAT_HARI)),
    sampai: keTanggalKalender(hariIni),
  };
}

/** Satu baris kartu "Tim hari ini". */
export interface BarisTimHariIni {
  salesId: string;
  namaSales: string;
  /** Rencana hari ini yang tidak batal. */
  total: number;
  selesai: number;
  /** Rencana hari-hari sebelumnya yang belum dilaporkan. */
  terlewat: number;
}

const NAMA_SALES_CADANGAN = 'Sales';

/**
 * Gabung rekap hari ini (total/selesai) dan rekap rentang lampau (terlewat).
 * Rekap satu hari tidak pernah punya terlewat — terlewat berarti tanggalnya
 * sudah lewat — sehingga butuh rekap kedua. Sales yang hanya punya terlewat
 * tetap tampil, yang semua rencananya batal tidak; urut nama supaya posisi baris stabil antar-penyegaran.
 */
export function gabungRekapTimHariIni(
  hariIni: readonly BarisRekapRencana[],
  lampau: readonly BarisRekapRencana[],
): BarisTimHariIni[] {
  const perSales = new Map<string, BarisTimHariIni>();
  const ambil = (baris: BarisRekapRencana): BarisTimHariIni => {
    const ada = perSales.get(baris.salesId);
    if (ada) return ada;
    const baru = {
      salesId: baris.salesId,
      namaSales: baris.namaSales ?? NAMA_SALES_CADANGAN,
      total: 0,
      selesai: 0,
      terlewat: 0,
    };
    perSales.set(baris.salesId, baru);
    return baru;
  };
  for (const baris of hariIni) {
    const tujuan = ambil(baris);
    tujuan.total = baris.total - baris.batal;
    tujuan.selesai = baris.selesai;
  }
  for (const baris of lampau) {
    if (baris.terlewat > 0) ambil(baris).terlewat = baris.terlewat;
  }
  return [...perSales.values()]
    .filter((baris) => baris.total > 0 || baris.terlewat > 0)
    .sort((a, b) => a.namaSales.localeCompare(b.namaSales));
}

/**
 * Toast sukses Tugaskan. Menugaskan diri sendiri melahirkan rencana MANDIRI
 * (tanpa notifikasi), jadi pesannya sama dengan Buat Rencana.
 */
export function pesanSuksesTugaskan(
  salesId: string,
  daftarSales: readonly SalesRencana[],
  penggunaId: string | null,
): string {
  if (salesId === penggunaId) return 'Rencana dibuat';
  const nama = daftarSales.find((sales) => sales.id === salesId)?.nama ?? NAMA_SALES_CADANGAN;
  return `Penugasan terkirim ke ${nama}`;
}

/** Tampilan sub-tab Rencana bagi pemberi tugas; sales biasa selalu "saya". */
export type TampilanRencana = 'saya' | 'tim';

/**
 * Filter daftar untuk tampilan yang aktif: "tim" = seluruh lingkup atau satu
 * anggota (`salesIdTim`), selain itu milik sendiri (`filterMilikSendiri`).
 */
export function filterTampilanRencana<T extends object>(
  filter: T,
  tampilan: TampilanRencana,
  lingkup: LingkupPengguna,
  salesIdTim: string | null,
): T | (T & { salesId: string }) {
  if (tampilan !== 'tim' || !lingkup.isPemberiTugas) return filterMilikSendiri(filter, lingkup);
  return salesIdTim === null ? filter : { ...filter, salesId: salesIdTim };
}

/** Huruf awal nama untuk avatar ringkas; nama kosong → "?". */
export function hurufAwalNama(nama: string | null | undefined): string {
  return nama?.trim().charAt(0).toUpperCase() || '?';
}

/** Teks ringkasan agenda satu hari, mis. "5 rencana · 2 selesai"; kosong → null. */
export function ringkasanAgenda(daftar: readonly Pick<Rencana, 'statusTampil'>[]): string | null {
  if (daftar.length === 0) return null;
  const selesai = daftar.filter((rencana) => rencana.statusTampil === 'SELESAI').length;
  return `${daftar.length} rencana · ${selesai} selesai`;
}

/** Label anggota tim; diri sendiri ditandai supaya jelas hasilnya rencana MANDIRI. */
export function labelAnggotaTim(sales: SalesRencana, penggunaId: string | null): string {
  return sales.id === penggunaId ? `${sales.nama} (Saya)` : sales.nama;
}

/** Saring anggota tim menurut nama (tanpa beda huruf besar/kecil); kata kunci kosong → semua. */
export function saringAnggotaTim<T extends SalesRencana>(daftar: readonly T[], kataKunci: string): T[] {
  const kunci = kataKunci.trim().toLocaleLowerCase();
  if (kunci === '') return [...daftar];
  return daftar.filter((sales) => sales.nama.toLocaleLowerCase().includes(kunci));
}

/** Selesai/total satu anggota pada satu hari; total tanpa rencana batal. */
export interface ProgresHarian {
  selesai: number;
  total: number;
}

/** Peta salesId → progres harian dari rekap satu hari; anggota tanpa rencana aktif dilewati. */
export function petaProgresRekap(baris: readonly BarisRekapRencana[]): Map<string, ProgresHarian> {
  const peta = new Map<string, ProgresHarian>();
  for (const item of baris) {
    const total = item.total - item.batal;
    if (total > 0) peta.set(item.salesId, { selesai: item.selesai, total });
  }
  return peta;
}

/** Jumlah rencana terlewat satu anggota. */
export interface TerlewatAnggota {
  salesId: string;
  namaSales: string;
  jumlah: number;
}

const urutNama = (a: { namaSales: string }, b: { namaSales: string }) => a.namaSales.localeCompare(b.namaSales);

/** Kelompokkan rencana terlewat per anggota: terbanyak dulu, lalu nama. */
export function hitungTerlewatPerAnggota(daftar: readonly Rencana[]): TerlewatAnggota[] {
  const perSales = new Map<string, TerlewatAnggota>();
  for (const rencana of daftar) {
    const ada = perSales.get(rencana.salesId);
    if (ada) {
      ada.jumlah += 1;
      continue;
    }
    perSales.set(rencana.salesId, {
      salesId: rencana.salesId,
      namaSales: rencana.namaSales ?? NAMA_SALES_CADANGAN,
      jumlah: 1,
    });
  }
  return [...perSales.values()].sort((a, b) => b.jumlah - a.jumlah || urutNama(a, b));
}

/** Satu bagian agenda tim: rencana satu anggota pada hari yang dilihat. */
export interface BagianAgendaTim {
  salesId: string;
  namaSales: string;
  /** Rencana hari itu yang tidak batal. */
  total: number;
  selesai: number;
  /** Rencana yang masih bisa dilaporkan (direncanakan/terlewat). */
  terbuka: number;
  /** Rencana terlewat anggota ini (dari daftar terlewat, lintas tanggal). */
  terlewat: number;
  data: Rencana[];
}

/**
 * Kelompokkan agenda satu hari per anggota untuk tampilan Tim "Semua".
 * Urutan: yang punya terlewat dulu, lalu rencana terbuka terbanyak, lalu nama.
 */
export function kelompokkanAgendaTim(
  harian: readonly Rencana[],
  terlewat: readonly TerlewatAnggota[],
): BagianAgendaTim[] {
  const jumlahTerlewat = new Map(terlewat.map((item) => [item.salesId, item.jumlah]));
  const perSales = new Map<string, BagianAgendaTim>();
  for (const rencana of harian) {
    let bagian = perSales.get(rencana.salesId);
    if (!bagian) {
      bagian = {
        salesId: rencana.salesId,
        namaSales: rencana.namaSales ?? NAMA_SALES_CADANGAN,
        total: 0,
        selesai: 0,
        terbuka: 0,
        terlewat: jumlahTerlewat.get(rencana.salesId) ?? 0,
        data: [],
      };
      perSales.set(rencana.salesId, bagian);
    }
    bagian.data.push(rencana);
    if (rencana.statusTampil !== 'BATAL') bagian.total += 1;
    if (rencana.statusTampil === 'SELESAI') bagian.selesai += 1;
    if (isRencanaTerbuka(rencana)) bagian.terbuka += 1;
  }
  return [...perSales.values()].sort(
    (a, b) => Number(b.terlewat > 0) - Number(a.terlewat > 0) || b.terbuka - a.terbuka || urutNama(a, b),
  );
}

/** Anggota tim yang belum punya rencana apa pun di hari yang dilihat, urut nama. */
export function anggotaTanpaRencana(
  daftarSales: readonly SalesRencana[],
  harian: readonly Pick<Rencana, 'salesId'>[],
): SalesRencana[] {
  const punyaRencana = new Set(harian.map((rencana) => rencana.salesId));
  return daftarSales
    .filter((sales) => !punyaRencana.has(sales.id))
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

/** Ringkasan seluruh tim untuk kartu Beranda. */
export interface RingkasanTim {
  selesai: number;
  total: number;
  /** Selesai ÷ total, dibulatkan 0–100; 0 bila belum ada rencana. */
  persen: number;
  terlewat: number;
}

const PERSEN_PENUH = 100;

/** Persentase selesai ÷ total yang dibulatkan; total 0 → 0. */
export function persenSelesai(selesai: number, total: number): number {
  return total === 0 ? 0 : Math.round((selesai / total) * PERSEN_PENUH);
}

/** Jumlahkan progres dan terlewat seluruh anggota. */
export function ringkasTimHariIni(baris: readonly BarisTimHariIni[]): RingkasanTim {
  const selesai = baris.reduce((jumlah, item) => jumlah + item.selesai, 0);
  const total = baris.reduce((jumlah, item) => jumlah + item.total, 0);
  const terlewat = baris.reduce((jumlah, item) => jumlah + item.terlewat, 0);
  return { selesai, total, persen: persenSelesai(selesai, total), terlewat };
}

/** Jumlah anggota yang ditampilkan kartu Beranda. */
export const JUMLAH_ANGGOTA_PERLU_PERHATIAN = 4;

/**
 * Anggota yang paling perlu diperhatikan: terlewat terbanyak, lalu rencana
 * belum selesai terbanyak, lalu nama.
 */
export function anggotaPerluPerhatian(
  baris: readonly BarisTimHariIni[],
  jumlah: number = JUMLAH_ANGGOTA_PERLU_PERHATIAN,
): BarisTimHariIni[] {
  const belumSelesai = (item: BarisTimHariIni) => item.total - item.selesai;
  return [...baris]
    .sort((a, b) => b.terlewat - a.terlewat || belumSelesai(b) - belumSelesai(a) || urutNama(a, b))
    .slice(0, jumlah);
}
