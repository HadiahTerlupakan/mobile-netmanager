import type { PembayaranTerakhir } from '@/types/portalPelanggan';

type PembayaranCheckout = Pick<PembayaranTerakhir, 'amount' | 'checkoutTotal' | 'checkoutInvoiceNumbers'>;

const STATUS_MENUNGGU = 'PENDING';
const METODE_TRANSFER_BANK = 'BANK_TRANSFER';

/** Transfer bank manual: `isManual` dari server baru, `accountId` di server lama. */
export function isTransferManual(pembayaran: Pick<PembayaranTerakhir, 'isManual' | 'method' | 'accountId'>): boolean {
  return pembayaran.isManual ?? (pembayaran.method === METODE_TRANSFER_BANK && Boolean(pembayaran.accountId));
}

/** Checkout yang masih menunggu dibayar tetapi sudah lewat `expiresAt`-nya. */
export function isCheckoutKedaluwarsa(pembayaran: Pick<PembayaranTerakhir, 'gatewayStatus' | 'expiresAt'>, sekarang: number): boolean {
  if (pembayaran.gatewayStatus !== STATUS_MENUNGGU || !pembayaran.expiresAt) return false;
  return new Date(pembayaran.expiresAt).getTime() <= sekarang;
}

/**
 * Rupiah yang harus dibayar untuk seluruh checkout pembayaran ini. `amount`
 * hanya bagian satu tagihan (dan sudah dipotong bagian diskon kuponnya), jadi
 * checkout gabungan memakai `checkoutTotal`; server lama tidak mengirimnya.
 */
export function nominalCheckout(pembayaran: PembayaranCheckout): number {
  return pembayaran.checkoutTotal ?? pembayaran.amount;
}

/** Nomor tagihan yang dicakup checkout; server lama: tagihan itu sendiri. */
export function nomorTagihanCheckout(pembayaran: PembayaranCheckout, nomorTagihan: string): string[] {
  return pembayaran.checkoutInvoiceNumbers?.length ? pembayaran.checkoutInvoiceNumbers : [nomorTagihan];
}

/** "#INV-1, #INV-2" untuk ditampilkan. */
export function tulisNomorTagihan(daftarNomor: string[]): string {
  return daftarNomor.map((nomor) => `#${nomor}`).join(', ');
}
