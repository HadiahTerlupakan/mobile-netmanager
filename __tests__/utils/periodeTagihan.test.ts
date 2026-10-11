import { describe, expect, it } from '@jest/globals';

import { periodeTagihan } from '@/utils/periodeTagihan';

/**
 * Awal periode selalu satu bulan sebelum jatuh tempo, jadi bulannya tidak
 * pernah sama dengan bulan jatuh tempo. Menampilkan harinya saja membuat
 * "20 Sep – 20 Okt 2026" tercetak sebagai "20 - 20 Okt 2026" — terbaca
 * sebagai periode nol hari. Terlihat di QA perangkat portal pelanggan.
 */
describe('periodeTagihan', () => {
  it('menyertakan bulan tanggal awal', () => {
    expect(periodeTagihan('2026-10-20T00:00:00.000Z')).toBe('20 Sep - 20 Okt 2026');
  });

  it('menyeberangi pergantian tahun dengan benar', () => {
    expect(periodeTagihan('2026-01-05T00:00:00.000Z')).toBe('5 Des - 5 Jan 2026');
  });

  it('memberi tanda hubung bila jatuh tempo tidak ada', () => {
    expect(periodeTagihan(null)).toBe('-');
    expect(periodeTagihan('')).toBe('-');
  });

  it('memberi tanda hubung bila tanggalnya tidak sah', () => {
    expect(periodeTagihan('bukan-tanggal')).toBe('-');
  });
});
