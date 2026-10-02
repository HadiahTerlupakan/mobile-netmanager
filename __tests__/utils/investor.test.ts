import { describe, expect, it } from '@jest/globals';

import { STATUS_SETORAN } from '@/constants/investor';
import { formatPersen, formatRupiah, isAkunInvestor, labelPeriode, tampilanStatus } from '@/utils/investor';

/** Intl memakai spasi tak putus antara "Rp" dan angka; samakan agar mudah dibandingkan. */
const rapikan = (teks: string) => teks.replace(/\s/g, ' ');

describe('utilitas investor', () => {
  it('isAkunInvestor hanya untuk role INVESTOR', () => {
    expect(isAkunInvestor({ role: 'INVESTOR' })).toBe(true);
    expect(isAkunInvestor({ role: 'CUSTOMER' })).toBe(false);
    expect(isAkunInvestor({ role: 'MITRA' })).toBe(false);
    expect(isAkunInvestor(null)).toBe(false);
  });

  it('formatRupiah menerima angka atau string BigInt dari server, tanpa NaN', () => {
    expect(rapikan(formatRupiah('15000000'))).toBe('Rp 15.000.000');
    expect(rapikan(formatRupiah(2500.6))).toBe('Rp 2.501');
    expect(rapikan(formatRupiah('bukan-angka'))).toBe('Rp 0');
    expect(rapikan(formatRupiah(null))).toBe('Rp 0');
  });

  it('formatPersen memakai koma desimal', () => {
    expect(formatPersen(12.5)).toBe('12,5%');
    expect(formatPersen(33.333)).toBe('33,33%');
    expect(formatPersen(Number.NaN)).toBe('0%');
  });

  it('labelPeriode: satu bulan penuh jadi nama bulan, selain itu rentang tanggal', () => {
    expect(labelPeriode('2026-08-01T00:00:00.000Z', '2026-08-31T00:00:00.000Z')).toBe('Agustus 2026');
    expect(labelPeriode('2026-07-01T00:00:00.000Z', '2026-09-30T00:00:00.000Z')).toBe('1 Jul 2026 – 30 Sep 2026');
  });

  it('status yang belum dikenal aplikasi tetap tampil apa adanya', () => {
    expect(tampilanStatus(STATUS_SETORAN, 'COMPLETED')).toEqual({ label: 'Diterima', nada: 'berhasil' });
    expect(tampilanStatus(STATUS_SETORAN, 'DIAUDIT')).toEqual({ label: 'DIAUDIT', nada: 'netral' });
  });
});
