import dayjs from 'dayjs';

import type { User } from '@/context/AuthContext';
import { PERAN_INVESTOR, type TampilanStatus } from '@/constants/investor';
import { formatDate } from '@/utils/date';

export { formatRupiah, formatRupiahRingkas } from './rupiah';

/** Apakah pengguna login sebagai investor (punya grup layar sendiri). */
export function isAkunInvestor(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === PERAN_INVESTOR;
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

