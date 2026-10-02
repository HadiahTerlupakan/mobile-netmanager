import type { TampilanStatus } from '@/constants/status';
import type { KategoriKeluhan, PrioritasKeluhan } from '@/types/keluhan';

/** Label status tiket keluhan dari sudut pandang sales. */
export const STATUS_KELUHAN: Readonly<Record<string, TampilanStatus>> = {
  OPEN: { label: 'Menunggu helpdesk', nada: 'menunggu' },
  IN_PROGRESS: { label: 'Ditangani', nada: 'menunggu' },
  WAITING_CUSTOMER: { label: 'Perlu jawaban', nada: 'gagal' },
  RESOLVED: { label: 'Selesai', nada: 'berhasil' },
  CLOSED: { label: 'Ditutup', nada: 'netral' },
};

/** Tampilan status keluhan; kode tak dikenal tampil apa adanya. */
export function statusKeluhan(kode: string): TampilanStatus {
  return STATUS_KELUHAN[kode] ?? { label: kode, nada: 'netral' };
}

export const PILIHAN_KATEGORI_KELUHAN: readonly { nilai: KategoriKeluhan; label: string; keterangan: string }[] = [
  { nilai: 'TECHNICAL', label: 'Gangguan', keterangan: 'Internet mati, lambat, putus-putus' },
  { nilai: 'BILLING', label: 'Tagihan', keterangan: 'Pembayaran, tagihan, isolir' },
  { nilai: 'ACCOUNT', label: 'Layanan', keterangan: 'Ganti paket, pindah alamat, data akun' },
  { nilai: 'OTHER', label: 'Lainnya', keterangan: 'Keluhan di luar kategori di atas' },
];

export const PILIHAN_PRIORITAS_KELUHAN: readonly { nilai: PrioritasKeluhan; label: string }[] = [
  { nilai: 'LOW', label: 'Rendah' },
  { nilai: 'MEDIUM', label: 'Normal' },
  { nilai: 'HIGH', label: 'Tinggi' },
  { nilai: 'URGENT', label: 'Darurat' },
];

/** Label kategori keluhan untuk tampilan ringkas. */
export function labelKategoriKeluhan(kode: string): string {
  return PILIHAN_KATEGORI_KELUHAN.find((item) => item.nilai === kode)?.label ?? kode;
}
