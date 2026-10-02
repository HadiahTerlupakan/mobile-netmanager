import { describe, expect, it } from '@jest/globals';

import { DURASI_SESI_TRACKING_MAKS_MS, isSesiTrackingKedaluwarsa } from '@/services/batasSesiTracking';

describe('batas sesi tracking', () => {
  const MULAI = '2026-10-02T01:00:00.000Z';
  const mulaiMs = new Date(MULAI).getTime();

  it('tepat di batas belum kedaluwarsa, lewat 1 ms sudah', () => {
    expect(isSesiTrackingKedaluwarsa(MULAI, new Date(mulaiMs + DURASI_SESI_TRACKING_MAKS_MS))).toBe(false);
    expect(isSesiTrackingKedaluwarsa(MULAI, new Date(mulaiMs + DURASI_SESI_TRACKING_MAKS_MS + 1))).toBe(true);
  });

  it('waktu mulai kosong atau rusak tidak dianggap kedaluwarsa', () => {
    expect(isSesiTrackingKedaluwarsa(null, new Date())).toBe(false);
    expect(isSesiTrackingKedaluwarsa('bukan-tanggal', new Date())).toBe(false);
  });
});
