import type { TampilanStatus } from '@/constants/status';

/**
 * Label Indonesia untuk kode work order dari server. Kode baru yang belum
 * dikenal ditampilkan apa adanya oleh `labelKodeWo`.
 */

export const STATUS_WORK_ORDER: Readonly<Record<string, TampilanStatus>> = {
  REQUESTED: { label: 'Diajukan', nada: 'menunggu' },
  PENDING: { label: 'Tersedia', nada: 'menunggu' },
  ASSIGNED: { label: 'Ditugaskan', nada: 'netral' },
  IN_PROGRESS: { label: 'Dikerjakan', nada: 'menunggu' },
  ON_HOLD: { label: 'Ditunda', nada: 'menunggu' },
  COMPLETED: { label: 'Selesai', nada: 'berhasil' },
  VERIFIED: { label: 'Terverifikasi', nada: 'berhasil' },
  CLOSED: { label: 'Ditutup', nada: 'berhasil' },
  CANCELLED: { label: 'Dibatalkan', nada: 'gagal' },
  REJECTED: { label: 'Ditolak', nada: 'gagal' },
};

export const PRIORITAS_WORK_ORDER: Readonly<Record<string, string>> = {
  LOW: 'Rendah',
  NORMAL: 'Normal',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
  URGENT: 'Mendesak',
  CRITICAL: 'Kritis',
};

/** Prioritas yang ditonjolkan (warna makna merah). */
export const PRIORITAS_MENDESAK: readonly string[] = ['HIGH', 'URGENT', 'CRITICAL'];

export const TIPE_WORK_ORDER: Readonly<Record<string, string>> = {
  INSTALLATION: 'Pemasangan',
  TROUBLESHOOT: 'Gangguan',
  MAINTENANCE: 'Pemeliharaan',
  UPGRADE: 'Upgrade',
  RELOCATION: 'Pindah lokasi',
  DISCONNECTION: 'Pemutusan',
  OTHER: 'Lainnya',
};

/** Label dari tabel; kode yang belum dikenal tampil apa adanya. */
export function labelKodeWo(tabel: Readonly<Record<string, string>>, kode: string): string {
  return tabel[kode] ?? kode;
}

/** Status work order; status baru tampil apa adanya dengan nada netral. */
export function statusWorkOrder(kode: string): TampilanStatus {
  return STATUS_WORK_ORDER[kode] ?? { label: kode, nada: 'netral' };
}
