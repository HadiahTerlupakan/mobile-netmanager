import type { DetailPengesahanSaya, RingkasanPengesahan } from '@/types/pengesahan';
import { formatDate } from '@/utils/date';

const FORMAT_TANGGAL_BERLAKU = 'dd MMM yyyy';
const PERSEN_PENUH = 100;

/** Teks kemajuan tanda tangan, mis. "2 dari 3 sudah tanda tangan". */
export function labelKemajuanTandaTangan(jumlahSelesai: number, jumlahPenandaTangan: number): string {
  return `${jumlahSelesai} dari ${jumlahPenandaTangan} sudah tanda tangan`;
}

/** Teks batas berlaku surat; `null` bila surat tidak punya batas. */
export function labelBatasBerlaku(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  return `Berlaku sampai ${formatDate(expiresAt, FORMAT_TANGGAL_BERLAKU)}`;
}

/** Persen kemajuan 0–100 untuk bilah kemajuan; aman untuk surat tanpa penanda tangan. */
export function hitungPersenKemajuan(jumlahSelesai: number, jumlahPenandaTangan: number): number {
  if (jumlahPenandaTangan <= 0) return 0;
  return Math.min(PERSEN_PENUH, Math.max(0, (jumlahSelesai / jumlahPenandaTangan) * PERSEN_PENUH));
}

/** Aturan menu cepat Pengesahan: tampil hanya bila ada surat, lencana = surat menunggu tanda tangan saya. */
export function tentukanMenuPengesahan(ringkasan: RingkasanPengesahan | undefined): { isTampil: boolean; jumlahLencana: number } {
  if (!ringkasan || ringkasan.totalCount <= 0) return { isTampil: false, jumlahLencana: 0 };
  return { isTampil: true, jumlahLencana: Math.max(0, ringkasan.menungguCount) };
}

/** Kalimat keadaan surat bagi saya di detail; `null` bila saya bisa menandatangani sekarang. */
export function pesanKeadaanSurat(surat: DetailPengesahanSaya): string | null {
  if (surat.status === 'CANCELLED') return surat.cancelReason ? `Surat dibatalkan: ${surat.cancelReason}` : 'Surat dibatalkan.';
  if (surat.status === 'EXPIRED') return 'Surat sudah kedaluwarsa.';
  if (surat.status === 'COMPLETED') return 'Surat sah. Semua pihak sudah tanda tangan.';
  if (surat.mySignerStatus === 'SIGNED') return 'Anda sudah menandatangani surat ini.';
  if (surat.mySignerStatus === 'DECLINED') return 'Anda menolak menandatangani surat ini.';
  return surat.canSign ? null : 'Belum giliran Anda menandatangani.';
}
