import dayjs from 'dayjs';

import type { User } from '@/context/AuthContext';
import { PERAN_INVESTOR, type TampilanStatus } from '@/constants/investor';
import { formatDate } from '@/utils/date';

const FORMAT_RUPIAH = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/** Apakah pengguna login sebagai investor (punya grup layar sendiri). */
export function isAkunInvestor(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === PERAN_INVESTOR;
}

/**
 * Rupiah tanpa desimal. Server mengirim nominal besar sebagai string (BigInt);
 * nilai tak terbaca ditampilkan Rp 0 alih-alih "NaN".
 */
export function formatRupiah(nilai: string | number | null | undefined): string {
  const angka = Number(nilai ?? 0);
  return FORMAT_RUPIAH.format(Number.isFinite(angka) ? angka : 0);
}

/** Persen dengan maksimal dua angka di belakang koma, gaya Indonesia (12,5%). */
export function formatPersen(nilai: number | null | undefined): string {
  const angka = Number.isFinite(nilai) ? Number(nilai) : 0;
  return `${angka.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
}

/** Tampilan status dari tabel label; status baru yang belum dikenal tampil apa adanya. */
export function tampilanStatus(
  tabel: Readonly<Record<string, TampilanStatus>>,
  status: string,
): TampilanStatus {
  return tabel[status] ?? { label: status, nada: 'netral' };
}

/**
 * Label capaian bulan ke-n proyek: "Bulan ke-3 · Okt 2026" bila tanggal mulai
 * proyek diketahui, selain itu "Bulan ke-3".
 */
export function labelBulanProyek(bulanKe: number, tanggalMulai: string | null): string {
  const label = `Bulan ke-${bulanKe}`;
  if (!tanggalMulai || !dayjs(tanggalMulai).isValid()) return label;
  return `${label} · ${dayjs(tanggalMulai).add(bulanKe - 1, 'month').format('MMM YYYY')}`;
}

/**
 * Label periode bagi hasil. Periode satu bulan penuh → "Agustus 2026";
 * selain itu rentang tanggal "1 Jul 2026 – 30 Sep 2026".
 */
export function labelPeriode(mulai: string, selesai: string): string {
  const awal = dayjs(mulai);
  const akhir = dayjs(selesai);
  const isSatuBulan = awal.isSame(akhir, 'month') && awal.date() === 1;
  if (isSatuBulan) return formatDate(mulai, 'MMMM yyyy');
  return `${formatDate(mulai, 'd MMM yyyy')} – ${formatDate(selesai, 'd MMM yyyy')}`;
}

const PERSEN_PENUH = 100;
const SATU_MILIAR = 1_000_000_000;
const SATU_JUTA = 1_000_000;
const SATU_RIBU = 1_000;

function keAngka(nilai: string | number | null | undefined): number {
  const angka = Number(nilai ?? 0);
  return Number.isFinite(angka) ? angka : 0;
}

/**
 * Bagian modal yang sudah kembali, 0–100 (dibatasi 100). Modal 0 atau tak
 * terbaca dianggap 0% agar tidak membagi dengan nol.
 */
export function hitungPersenModalKembali(
  modalKembali: string | number | null | undefined,
  modal: string | number | null | undefined,
): number {
  const total = keAngka(modal);
  if (total <= 0) return 0;
  return Math.min(PERSEN_PENUH, Math.max(0, (keAngka(modalKembali) / total) * PERSEN_PENUH));
}

/** Imbal hasil bagi hasil terhadap modal (persen, bisa di atas 100). */
export function hitungImbalHasil(
  bagiHasil: string | number | null | undefined,
  modal: string | number | null | undefined,
): number {
  const total = keAngka(modal);
  if (total <= 0) return 0;
  return (keAngka(bagiHasil) / total) * PERSEN_PENUH;
}

/** Rupiah ringkas untuk sumbu grafik: "Rp 4,5 jt", "Rp 850 rb". */
export function formatRupiahRingkas(nilai: string | number | null | undefined): string {
  const angka = keAngka(nilai);
  const mutlak = Math.abs(angka);
  const format = (n: number, satuan: string) =>
    `Rp ${n.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${satuan}`;
  if (mutlak >= SATU_MILIAR) return format(angka / SATU_MILIAR, 'M');
  if (mutlak >= SATU_JUTA) return format(angka / SATU_JUTA, 'jt');
  if (mutlak >= SATU_RIBU) return format(angka / SATU_RIBU, 'rb');
  return `Rp ${angka.toLocaleString('id-ID')}`;
}
