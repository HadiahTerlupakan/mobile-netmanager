import type { PembayaranTerakhir } from '@/types/portalPelanggan';
import { isTransferManual } from '@/utils/tagihan/checkoutPelanggan';

/** Pesan untuk pelanggan tentang hasil sebuah checkout. */
export interface PesanStatusPembayaran {
  judul: string;
  pesan: string;
  isGalat: boolean;
}

/** Status akhir checkout dari SSE; CANCELLED = diganti metode lain atau dibatalkan. */
export type StatusAkhirPembayaran = 'PAID' | 'EXPIRED' | 'FAILED' | 'CANCELLED';

/** Jawaban `POST /api/customer/payments/check-status`; NONE = tidak ada checkout gateway. */
export type StatusCekPembayaran = 'PAID' | 'PENDING' | 'EXPIRED' | 'FAILED' | 'NONE';

const PESAN_WAKTU_HABIS: PesanStatusPembayaran = {
  judul: 'Waktu Habis',
  pesan: 'Waktu pembayaran habis. Silakan pilih metode dan bayar lagi.',
  isGalat: false,
};

const PESAN_GATEWAY_GAGAL: PesanStatusPembayaran = {
  judul: 'Pembayaran Gagal',
  pesan: 'Pembayaran tidak berhasil. Silakan coba lagi atau pilih metode lain.',
  isGalat: true,
};

const PESAN_BELUM_DITERIMA: PesanStatusPembayaran = {
  judul: 'Belum Diterima',
  pesan: 'Pembayaran belum kami terima. Bila baru saja membayar, tunggu 1–2 menit lalu cek lagi.',
  isGalat: false,
};

/** Admin menolak bukti transfer manual, beserta alasannya bila ada. */
export function pesanTransferDitolak(alasan: string | null | undefined): PesanStatusPembayaran {
  return {
    judul: 'Bukti Transfer Ditolak',
    pesan: alasan ? `Alasan: ${alasan}` : 'Periksa kembali bukti transfer Anda, lalu bayar lagi.',
    isGalat: true,
  };
}

/**
 * Pesan saat checkout berakhir tanpa lunas. FAILED dibedakan menurut
 * metodenya: bukti transfer manual ditolak admin, atau gateway gagal. Lunas
 * diberitahukan lembar sukses; CANCELLED berarti pelanggan sendiri yang
 * mengganti metode atau membatalkan, jadi tidak perlu pesan.
 */
export function pesanPembayaranBerakhir(status: StatusAkhirPembayaran, pembayaran?: PembayaranTerakhir): PesanStatusPembayaran | null {
  if (status === 'EXPIRED') return PESAN_WAKTU_HABIS;
  if (status !== 'FAILED') return null;
  return pembayaran && isTransferManual(pembayaran) ? pesanTransferDitolak(pembayaran.rejectionReason) : PESAN_GATEWAY_GAGAL;
}

/**
 * Pesan setelah "Cek Status". `status` null: server lama tanpa endpoint cek
 * status, jadi hanya daftar tagihan yang dimuat ulang.
 */
export function pesanHasilCekStatus(
  status: StatusCekPembayaran | null,
  hasil: { isMasihTerbuka: boolean; isLaporkanBelumDiterima: boolean },
): PesanStatusPembayaran | null {
  if (status === 'EXPIRED' || status === 'FAILED') return pesanPembayaranBerakhir(status);
  return hasil.isMasihTerbuka && hasil.isLaporkanBelumDiterima ? PESAN_BELUM_DITERIMA : null;
}
