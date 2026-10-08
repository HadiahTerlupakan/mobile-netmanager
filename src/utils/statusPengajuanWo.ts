/**
 * Nasib sebuah pengajuan work order, dari sudut pandang pengaju.
 *
 * Status mentahnya tidak bisa langsung ditampilkan: penolakan disimpan sebagai
 * `CANCELLED` dengan `rejectionReason` terisi, sementara `CANCELLED` tanpa
 * alasan berarti pengajuannya dibatalkan, bukan ditolak. Persetujuan tidak
 * punya status sendiri sama sekali — ia hanya berpindah ke alur work order
 * biasa. Tanpa penerjemahan ini, layar akan menampilkan "CANCELLED" untuk dua
 * kejadian yang berbeda artinya bagi orang yang mengajukan.
 */

export type NasibPengajuan = 'menunggu' | 'disetujui' | 'ditolak' | 'dibatalkan';

export interface PengajuanWorkOrder {
  status: string;
  rejectionReason?: string | null;
}

const LABEL: Record<NasibPengajuan, string> = {
  menunggu: 'Menunggu persetujuan',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
};

/** Nasib pengajuan; lihat catatan modul untuk alasan pemetaannya. */
export function nasibPengajuan(pengajuan: PengajuanWorkOrder): NasibPengajuan {
  if (pengajuan.status === 'REQUESTED') return 'menunggu';
  if (pengajuan.status !== 'CANCELLED') return 'disetujui';
  return pengajuan.rejectionReason ? 'ditolak' : 'dibatalkan';
}

/** Label siap tampil untuk sebuah nasib pengajuan. */
export function labelNasibPengajuan(nasib: NasibPengajuan): string {
  return LABEL[nasib];
}
