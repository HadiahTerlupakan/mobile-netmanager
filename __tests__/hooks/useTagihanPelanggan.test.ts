import { describe, expect, it } from '@jest/globals';

import { isPerluDipolling, type DataTagihanPelanggan } from '@/hooks/tagihan/useTagihanPelanggan';
import type { PembayaranTerakhir, TagihanPelanggan } from '@/types/portalPelanggan';

const SEKARANG = new Date('2026-10-31T10:00:00.000Z').getTime();

function data(status: string, pembayaran: Partial<PembayaranTerakhir> | null): DataTagihanPelanggan {
  const tagihan = {
    id: 'inv-1',
    invoiceNumber: 'INV-1',
    status,
    totalAmount: 11100,
    remainingAmount: 11100,
    dueDate: '2026-10-30T00:00:00.000Z',
    issueDate: '2026-10-27T00:00:00.000Z',
    items: [],
    lastPayment: pembayaran ? { amount: 11100, date: '2026-10-30T00:00:00.000Z', method: 'OTHER', ...pembayaran } : null,
  } as TagihanPelanggan;
  return { terbuka: [tagihan], terbaru: [] };
}

// Polling tiap 15 detik adalah cadangan SSE; checkout yang sudah lewat batas
// tidak akan lunas lagi, jadi memuat ulang terus hanya membebani server.
describe('isPerluDipolling', () => {
  it.each([
    ['checkout menunggu yang masih berjalan', data('OVERDUE', { gatewayStatus: 'PENDING', expiresAt: '2026-10-31T11:00:00.000Z' }), true],
    ['transfer manual tanpa batas waktu', data('OVERDUE', { gatewayStatus: 'PENDING', expiresAt: null }), true],
    ['checkout menunggu yang lewat batas', data('OVERDUE', { gatewayStatus: 'PENDING', expiresAt: '2026-10-31T09:59:00.000Z' }), false],
    ['pembayaran lunas, tagihan belum dilunasi server', data('OVERDUE', { gatewayStatus: 'PAID' }), true],
    ['tanpa checkout', data('OVERDUE', null), false],
  ])('%s', (_kasus, isi, harapan) => {
    expect(isPerluDipolling(isi, SEKARANG)).toBe(harapan);
  });
});
