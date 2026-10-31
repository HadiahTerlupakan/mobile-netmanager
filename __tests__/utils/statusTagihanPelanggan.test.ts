import { describe, expect, it } from '@jest/globals';

import {
  isTagihanDibatalkan,
  isTagihanHarusDibayar,
  isTagihanTerutang,
  labelStatusTagihan,
  statusTampilTagihan,
} from '@/utils/statusTagihanPelanggan';

describe('labelStatusTagihan', () => {
  it.each([
    ['DRAFT', 'Draf'],
    ['SENT', 'Belum Bayar'],
    ['OVERDUE', 'Terlambat'],
    ['PAID', 'Lunas'],
    ['PARTIAL_PAID', 'Dibayar Sebagian'],
    ['CANCELLED', 'Dibatalkan'],
  ])('%s → %s', (status, label) => {
    expect(labelStatusTagihan(status)).toBe(label);
  });

  it('status yang tidak dikenal tidak ditampilkan sebagai kode mentah', () => {
    expect(labelStatusTagihan('REFUNDED')).toBe('Status lain');
  });
});

describe('isTagihanTerutang', () => {
  it.each(['SENT', 'OVERDUE', 'PARTIAL_PAID'])('%s masih terutang', (status) => {
    expect(isTagihanTerutang(status)).toBe(true);
  });

  it.each(['DRAFT', 'PAID', 'CANCELLED', 'VOID'])('%s tidak terutang', (status) => {
    expect(isTagihanTerutang(status)).toBe(false);
  });
});

describe('isTagihanDibatalkan', () => {
  it('hanya CANCELLED; VOID tidak ada di enum server', () => {
    expect(isTagihanDibatalkan('CANCELLED')).toBe(true);
    expect(isTagihanDibatalkan('VOID')).toBe(false);
    expect(isTagihanDibatalkan('PAID')).toBe(false);
  });
});

// Saldo kredit dipotong saat tagihan terbit; tagihan yang habis terpotong
// tetap SENT dengan sisa Rp 0.
describe('tagihan bernominal Rp 0', () => {
  it.each([
    [{ status: 'SENT', remainingAmount: 0 }, false],
    [{ status: 'OVERDUE', remainingAmount: 11100 }, true],
    [{ status: 'PARTIAL_PAID', remainingAmount: 5000 }, true],
    [{ status: 'PAID', remainingAmount: 0 }, false],
  ])('%j harus dibayar: %s', (tagihan, harapan) => {
    expect(isTagihanHarusDibayar(tagihan)).toBe(harapan);
  });

  it('tagihan terbuka bernominal Rp 0 tampil lunas', () => {
    expect(statusTampilTagihan({ status: 'SENT', remainingAmount: 0 })).toBe('PAID');
    expect(statusTampilTagihan({ status: 'OVERDUE', remainingAmount: 11100 })).toBe('OVERDUE');
    expect(statusTampilTagihan({ status: 'CANCELLED', remainingAmount: 0 })).toBe('CANCELLED');
  });
});
