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
