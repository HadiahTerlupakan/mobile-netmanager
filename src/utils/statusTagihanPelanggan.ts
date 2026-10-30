/**
 * Status tagihan pelanggan (enum `InvoiceStatus` server: DRAFT, SENT, OVERDUE,
 * PAID, PARTIAL_PAID, CANCELLED) untuk layar Tagihan dan Riwayat.
 *
 * Kedua layar dulu punya pemetaan sendiri yang hanya mengenal PAID/SENT/OVERDUE:
 * Tagihan menampilkan "CANCELLED" mentah, Riwayat menyebut sisanya "Gagal", dan
 * filter "Gagal" keduanya mencari `VOID`, status yang tidak pernah dikirim server.
 */

const LABEL_STATUS_TAGIHAN: Record<string, string> = {
  DRAFT: 'Draf',
  SENT: 'Belum Bayar',
  OVERDUE: 'Terlambat',
  PAID: 'Lunas',
  PARTIAL_PAID: 'Dibayar Sebagian',
  CANCELLED: 'Dibatalkan',
};

/** Status baru di server tidak boleh tampil sebagai kode mentah ke pelanggan. */
const LABEL_STATUS_TIDAK_DIKENAL = 'Status lain';

const STATUS_MASIH_TERUTANG = new Set(['SENT', 'OVERDUE', 'PARTIAL_PAID']);

/** Label status tagihan dalam Bahasa Indonesia. */
export function labelStatusTagihan(status: string): string {
  return LABEL_STATUS_TAGIHAN[status] ?? LABEL_STATUS_TIDAK_DIKENAL;
}

/** Tagihan yang masih harus dibayar, termasuk yang baru dibayar sebagian. */
export function isTagihanTerutang(status: string): boolean {
  return STATUS_MASIH_TERUTANG.has(status);
}

/** Tagihan yang dibatalkan. */
export function isTagihanDibatalkan(status: string): boolean {
  return status === 'CANCELLED';
}
