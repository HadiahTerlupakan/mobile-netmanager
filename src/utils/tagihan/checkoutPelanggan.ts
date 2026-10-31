import type { PembayaranTerakhir } from '@/types/portalPelanggan';

type PembayaranCheckout = Pick<PembayaranTerakhir, 'amount' | 'checkoutTotal' | 'checkoutInvoiceNumbers'>;

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
