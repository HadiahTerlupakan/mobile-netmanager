import { describe, expect, it } from '@jest/globals';

import { geserHari, isDalamRentang, rentangHariLokal } from '@/utils/presurvei/rentangHari';

/**
 * Bergantung pada TZ yang dipatok `Asia/Jakarta` (UTC+7) di
 * `jest.global-setup.js`. Tanpa pemakuan itu, harapan di bawah bergeser
 * menurut zona mesin — cari masalahnya di sana, bukan di kode produksi.
 */

describe('rentangHariLokal', () => {
  it('mencakup satu hari lokal penuh sebagai ISO UTC', () => {
    expect(rentangHariLokal(new Date(2026, 8, 24, 10, 30))).toEqual({
      dariTanggal: '2026-09-23T17:00:00.000Z',
      sampaiTanggal: '2026-09-24T16:59:59.999Z',
    });
  });
});

describe('geserHari', () => {
  it('melewati batas bulan', () => {
    expect(geserHari(new Date(2026, 8, 30, 15), 1)).toEqual(new Date(2026, 9, 1));
  });

  it('mundur dengan jumlah negatif', () => {
    expect(geserHari(new Date(2026, 9, 1, 8), -1)).toEqual(new Date(2026, 8, 30));
  });
});

describe('isDalamRentang', () => {
  const rentang = {
    dariTanggal: '2026-09-23T17:00:00.000Z',
    sampaiTanggal: '2026-09-24T16:59:59.999Z',
  };

  it('inklusif di kedua ujung', () => {
    expect(isDalamRentang('2026-09-23T17:00:00.000Z', rentang)).toBe(true);
    expect(isDalamRentang('2026-09-24T16:59:59.999Z', rentang)).toBe(true);
  });

  it('menolak waktu di luar rentang', () => {
    expect(isDalamRentang('2026-09-23T16:59:59.999Z', rentang)).toBe(false);
    expect(isDalamRentang('2026-09-24T17:00:00.000Z', rentang)).toBe(false);
  });
});
