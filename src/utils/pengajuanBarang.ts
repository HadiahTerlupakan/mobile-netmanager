import type { NadaStatus } from '@/constants/status';
import type { BarisPengajuanBarang, KodeStatusPengajuan } from '@/types/pengajuanBarang';

const NADA_STATUS: Readonly<Record<KodeStatusPengajuan, NadaStatus>> = {
  AWAITING_APPROVAL: 'menunggu',
  APPROVED: 'menunggu',
  RECEIVED: 'berhasil',
  REJECTED: 'gagal',
  CANCELLED: 'gagal',
};

const PEMISAH_RINGKASAN = ' · ';

/** Warna lencana status; kode yang belum dikenal aplikasi (mis. dari cache lama) dianggap netral. */
export function nadaStatusPengajuan(kode: string): NadaStatus {
  return NADA_STATUS[kode as KodeStatusPengajuan] ?? 'netral';
}

function denganSatuan(jumlah: number, satuan: string): string {
  return satuan ? `${jumlah} ${satuan}` : String(jumlah);
}

/**
 * Ringkasan angka satu barang, mis. "Diminta 10 roll · Disetujui 8 roll ·
 * Dimasukkan 8 roll". Barang ditolak cukup "Ditolak". Angka yang belum ada
 * tidak ditampilkan: belum diputuskan atasan berarti tanpa "Disetujui", belum
 * dimasukkan (termasuk data lama di cache tanpa `dimasukkan`) tanpa "Dimasukkan".
 */
export function ringkasanBarisPengajuan(baris: BarisPengajuanBarang): string {
  const bagian = [`Diminta ${denganSatuan(baris.diminta, baris.satuanDiminta)}`];
  if (baris.isDitolak) return [...bagian, 'Ditolak'].join(PEMISAH_RINGKASAN);
  if (typeof baris.disetujui === 'number') bagian.push(`Disetujui ${denganSatuan(baris.disetujui, baris.satuan)}`);
  if (typeof baris.dimasukkan === 'number') bagian.push(`Dimasukkan ${denganSatuan(baris.dimasukkan, baris.satuan)}`);
  return bagian.join(PEMISAH_RINGKASAN);
}
