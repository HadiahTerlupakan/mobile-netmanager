import { describe, expect, it } from '@jest/globals';
import { getNextPelangganPage } from '@/hooks/queries/usePelangganList';

const page = (current: number, totalPages: number) => ({
  data: [],
  meta: { page: current, limit: 20, total: totalPages * 20, totalPages },
});

describe('getNextPelangganPage', () => {
  it('meminta halaman berikutnya selama masih ada sisa', () => {
    expect(getNextPelangganPage(page(1, 3))).toBe(2);
  });

  it('berhenti di halaman terakhir', () => {
    expect(getNextPelangganPage(page(3, 3))).toBeUndefined();
  });

  it('berhenti ketika hasil kosong', () => {
    expect(getNextPelangganPage(page(1, 0))).toBeUndefined();
  });
});
