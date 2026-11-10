import type { NadaStatus } from '@/constants/status';
import type { BarisPengajuanBarang, KodeStatusPengajuan, PengajuanBarang } from '@/types/pengajuanBarang';

/** Keadaan satu tahap di garis tahap kartu pengajuan. */
export type KeadaanTahap = 'selesai' | 'berjalan' | 'berhenti' | 'belum';

const NADA_STATUS: Readonly<Record<KodeStatusPengajuan, NadaStatus>> = {
  AWAITING_APPROVAL: 'menunggu',
  REJECTED: 'gagal',
  NO_ORDER: 'menunggu',
  NOT_PURCHASED: 'menunggu',
  PURCHASING: 'menunggu',
  PURCHASED: 'menunggu',
  PARTIAL: 'menunggu',
  COMPLETE: 'berhasil',
  COMPLETE_SHORT: 'netral',
  SERVICE_PENDING: 'menunggu',
  CANCELLED: 'gagal',
};

/** Warna lencana status; kode yang belum dikenal aplikasi dianggap netral. */
export function nadaStatusPengajuan(kode: string): NadaStatus {
  return NADA_STATUS[kode as KodeStatusPengajuan] ?? 'netral';
}

/**
 * Keadaan tahap ke-`nomor` (mulai 1). Tahap sebelum tahap berjalan sudah
 * selesai; pengajuan yang ditolak/dibatalkan berhenti di `berhentiDi`.
 * Pengajuan yang selesai tidak punya tahap berjalan: semua tahap selesai.
 */
export function keadaanTahap(tahap: PengajuanBarang['tahap'], nomor: number, kode: string): KeadaanTahap {
  if (tahap.berhentiDi !== null) {
    if (nomor < tahap.berhentiDi) return 'selesai';
    return nomor === tahap.berhentiDi ? 'berhenti' : 'belum';
  }
  if (kode === 'COMPLETE' || kode === 'COMPLETE_SHORT') return 'selesai';
  if (tahap.sekarang === null) return 'belum';
  if (nomor < tahap.sekarang) return 'selesai';
  return nomor === tahap.sekarang ? 'berjalan' : 'belum';
}

function denganSatuan(jumlah: number, satuan: string): string {
  return satuan ? `${jumlah} ${satuan}` : String(jumlah);
}

/**
 * Ringkasan angka satu barang, mis. "Diminta 10 roll · Disetujui 10 ·
 * Dibeli 4 · Datang 2". Barang ditolak cukup "Ditolak".
 */
export function ringkasanBarisPengajuan(baris: BarisPengajuanBarang): string {
  const diminta = `Diminta ${denganSatuan(baris.diminta, baris.satuanDiminta)}`;
  if (baris.isDitolak) return `${diminta} · Ditolak`;
  if (baris.disetujui === null) return `${diminta} · Menunggu keputusan`;
  const bagian = [
    diminta,
    `Disetujui ${denganSatuan(baris.disetujui, baris.satuan)}`,
    `Dibeli ${baris.dibeli}`,
    `Datang ${baris.datang}`,
  ];
  if (baris.tidakDatang > 0) bagian.push(`Tidak datang ${baris.tidakDatang}`);
  return bagian.join(' · ');
}
