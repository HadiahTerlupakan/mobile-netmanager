import { describe, expect, it } from '@jest/globals';

import { nomorWhatsApp } from '@/utils/kontak';

describe('nomorWhatsApp', () => {
  it('menormalkan nomor lokal ke format 62', () => {
    expect(nomorWhatsApp('0812-3456-7890')).toBe('6281234567890');
    expect(nomorWhatsApp('81234567890')).toBe('6281234567890');
    expect(nomorWhatsApp('+62 812 3456 7890')).toBe('6281234567890');
  });
});

describe('hariLewatJatuhTempo', () => {
  const { hariLewatJatuhTempo } = require('@/utils/kontak') as typeof import('@/utils/kontak');
  const sekarang = new Date(2026, 9, 2, 15, 0);

  it('menghitung hari kalender lewat jatuh tempo', () => {
    expect(hariLewatJatuhTempo(new Date(2026, 8, 25, 23, 0).toISOString(), sekarang)).toBe(7);
    expect(hariLewatJatuhTempo(new Date(2026, 9, 2, 8, 0).toISOString(), sekarang)).toBe(0);
  });

  it('belum jatuh tempo atau tanggal rusak = 0', () => {
    expect(hariLewatJatuhTempo(new Date(2026, 9, 10).toISOString(), sekarang)).toBe(0);
    expect(hariLewatJatuhTempo('bukan-tanggal', sekarang)).toBe(0);
  });
});
