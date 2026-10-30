import { describe, expect, it } from '@jest/globals';

import { isTagihanDibatalkan, isTagihanTerutang, labelStatusTagihan } from '@/utils/statusTagihanPelanggan';

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
