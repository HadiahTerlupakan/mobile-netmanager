import type { TampilanStatus } from '@/constants/status';

/** Label Indonesia status langganan pelanggan. */
export const STATUS_PELANGGAN: Readonly<Record<string, TampilanStatus>> = {
  AKTIF: { label: 'Aktif', nada: 'berhasil' },
  ISOLIR: { label: 'Isolir', nada: 'gagal' },
  NONAKTIF: { label: 'Nonaktif', nada: 'netral' },
  MAINTENANCE: { label: 'Perbaikan', nada: 'menunggu' },
  DISMANTLE: { label: 'Dibongkar', nada: 'netral' },
};

/** Tampilan status pelanggan; kode tak dikenal tampil apa adanya. */
export function statusPelanggan(kode: string): TampilanStatus {
  return STATUS_PELANGGAN[kode] ?? { label: kode, nada: 'netral' };
}
