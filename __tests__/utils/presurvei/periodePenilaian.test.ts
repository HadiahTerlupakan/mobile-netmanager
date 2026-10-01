import { describe, expect, it } from '@jest/globals';

import {
  geserBulan,
  isBolehMajuPeriode,
  labelPeriode,
  periodeDariTanggal,
  teksDihitungSampai,
} from '@/utils/presurvei/periodePenilaian';

const SEKARANG = new Date(2026, 8, 26, 10, 0);

describe('periodeDariTanggal', () => {
  it('bulan berbasis 1', () => {
    expect(periodeDariTanggal(SEKARANG)).toEqual({ tahun: 2026, bulan: 9 });
    expect(periodeDariTanggal(new Date(2026, 0, 1))).toEqual({ tahun: 2026, bulan: 1 });
  });
});

describe('geserBulan', () => {
  it('melewati batas tahun ke dua arah', () => {
    expect(geserBulan({ tahun: 2026, bulan: 1 }, -1)).toEqual({ tahun: 2025, bulan: 12 });
    expect(geserBulan({ tahun: 2025, bulan: 12 }, 1)).toEqual({ tahun: 2026, bulan: 1 });
    expect(geserBulan({ tahun: 2026, bulan: 9 }, -14)).toEqual({ tahun: 2025, bulan: 7 });
  });
});

describe('isBolehMajuPeriode', () => {
  it('bulan berjalan tidak boleh maju; bulan lampau boleh', () => {
    expect(isBolehMajuPeriode({ tahun: 2026, bulan: 9 }, SEKARANG)).toBe(false);
    expect(isBolehMajuPeriode({ tahun: 2026, bulan: 8 }, SEKARANG)).toBe(true);
    expect(isBolehMajuPeriode({ tahun: 2025, bulan: 12 }, SEKARANG)).toBe(true);
  });
});

describe('label', () => {
  it('nama bulan Indonesia', () => {
    expect(labelPeriode({ tahun: 2026, bulan: 9 })).toBe('September 2026');
    expect(labelPeriode({ tahun: 2027, bulan: 1 })).toBe('Januari 2027');
  });

  it('dihitung sampai dari YYYY-MM-DD tanpa geseran zona waktu', () => {
    expect(teksDihitungSampai('2026-09-05')).toBe('Dihitung sampai 5 September 2026');
    expect(teksDihitungSampai('2026-12-31')).toBe('Dihitung sampai 31 Desember 2026');
  });

  it('format tak dikenal ditulis apa adanya', () => {
    expect(teksDihitungSampai('kemarin')).toBe('Dihitung sampai kemarin');
    expect(teksDihitungSampai('2026-13-01')).toBe('Dihitung sampai 2026-13-01');
  });
});
