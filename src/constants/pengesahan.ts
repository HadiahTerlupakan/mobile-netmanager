import type { TampilanStatus } from '@/constants/status';
import type { KelompokPengesahan, StatusPenandaTangan, StatusSuratPengesahan } from '@/types/pengesahan';

/** Panjang alasan menolak, sama dengan validasi server. */
export const ALASAN_TOLAK_MIN = 3;
export const ALASAN_TOLAK_MAKS = 500;

/** Batas panjang data URL tanda tangan yang diterima server. */
export const DATA_URL_TANDA_TANGAN_MAKS = 400_000;
export const AWALAN_DATA_URL_PNG = 'data:image/png;base64,';

export const OPSI_KELOMPOK_PENGESAHAN: readonly { nilai: KelompokPengesahan; label: string }[] = [
  { nilai: 'MENUNGGU', label: 'Menunggu' },
  { nilai: 'SELESAI', label: 'Selesai' },
];

/** Status tanda tangan saya / penanda tangan lain. */
export const STATUS_PENANDA_TANGAN: Readonly<Record<StatusPenandaTangan, TampilanStatus>> = {
  PENDING: { label: 'Belum dibuka', nada: 'menunggu' },
  VIEWED: { label: 'Sudah dibuka', nada: 'menunggu' },
  SIGNED: { label: 'Sudah tanda tangan', nada: 'berhasil' },
  DECLINED: { label: 'Menolak', nada: 'gagal' },
};

/** Status surat secara keseluruhan. */
export const STATUS_SURAT_PENGESAHAN: Readonly<Record<StatusSuratPengesahan, TampilanStatus>> = {
  DRAFT: { label: 'Draf', nada: 'netral' },
  SENT: { label: 'Proses tanda tangan', nada: 'menunggu' },
  COMPLETED: { label: 'Sah', nada: 'berhasil' },
  CANCELLED: { label: 'Dibatalkan', nada: 'gagal' },
  EXPIRED: { label: 'Kedaluwarsa', nada: 'netral' },
};

/** Tampilan status penanda tangan; kode tak dikenal tampil apa adanya. */
export function tampilanStatusPenandaTangan(kode: string): TampilanStatus {
  return STATUS_PENANDA_TANGAN[kode as StatusPenandaTangan] ?? { label: kode, nada: 'netral' };
}

/** Tampilan status surat; kode tak dikenal tampil apa adanya. */
export function tampilanStatusSurat(kode: string): TampilanStatus {
  return STATUS_SURAT_PENGESAHAN[kode as StatusSuratPengesahan] ?? { label: kode, nada: 'netral' };
}
