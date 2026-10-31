import dayjs from 'dayjs';
import 'dayjs/locale/id';

import type { PembayaranTerakhir } from '@/types/portalPelanggan';

dayjs.locale('id');

/** Enum `PaymentMethod` server; pembayaran gateway tercatat OTHER dengan `gatewayProvider`. */
const LABEL_METODE_BAYAR: Readonly<Record<string, string>> = {
  CASH: 'Tunai',
  BANK_TRANSFER: 'Transfer Bank',
  E_WALLET: 'E-Wallet',
  CREDIT_CARD: 'Kartu Kredit',
  DEBIT_CARD: 'Kartu Debit',
  CHECK: 'Cek',
};
const LABEL_PEMBAYARAN_GATEWAY = 'Pembayaran online';
const STATUS_LUNAS = 'PAID';

function labelMetode(pembayaran: PembayaranTerakhir): string | null {
  return LABEL_METODE_BAYAR[pembayaran.method] ?? (pembayaran.gatewayProvider ? LABEL_PEMBAYARAN_GATEWAY : null);
}

/**
 * "Dibayar 12 Okt 2026 · Transfer Bank" dari pembayaran terakhir tagihan.
 * Pembayaran yang menunggu, gagal, atau dibatalkan tidak disebut; pembayaran
 * yang dicatat langsung oleh admin tidak punya status gateway.
 */
export function keteranganPembayaranRiwayat(pembayaran: PembayaranTerakhir | null | undefined): string | null {
  if (!pembayaran || (pembayaran.gatewayStatus && pembayaran.gatewayStatus !== STATUS_LUNAS)) return null;
  return [`Dibayar ${dayjs(pembayaran.date).format('D MMM YYYY')}`, labelMetode(pembayaran)].filter(Boolean).join(' · ');
}
