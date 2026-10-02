import { describe, expect, it } from '@jest/globals';

import { ambilDaftar } from '@/utils/ambilDaftar';

describe('ambilDaftar', () => {
  it('membaca array langsung, { data: [] }, dan { data: { kunci: [] } }', () => {
    expect(ambilDaftar([1, 2])).toEqual([1, 2]);
    expect(ambilDaftar({ data: [3] })).toEqual([3]);
    expect(ambilDaftar({ data: { history: [4] } }, 'history')).toEqual([4]);
    expect(ambilDaftar({ history: [5] }, 'history')).toEqual([5]);
  });

  it('bentuk lain menjadi daftar kosong', () => {
    expect(ambilDaftar(null)).toEqual([]);
    expect(ambilDaftar({ data: { lain: [1] } }, 'history')).toEqual([]);
    expect(ambilDaftar('teks')).toEqual([]);
  });
});
