import { describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

const mockUseInfiniteQuery = jest.fn();

// Mock utuh: file ini hanya butuh useInfiniteQuery dan keepPreviousData, dan
// menghindari perlu QueryClientProvider hanya untuk memeriksa opsi yang
// diteruskan ke useInfiniteQuery.
jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (...args: any[]) => mockUseInfiniteQuery(...args),
  keepPreviousData: 'keepPreviousData-sentinel',
}));

import { keepPreviousData } from '@tanstack/react-query';
import { getNextPelangganPage, usePelangganList } from '@/hooks/queries/usePelangganList';

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

describe('usePelangganList', () => {
  it('meneruskan placeholderData: keepPreviousData supaya daftar tidak berkedip kosong saat query key berubah', () => {
    renderHook(() => usePelangganList({ status: 'ISOLIR', search: 'budi' }));

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ placeholderData: keepPreviousData }),
    );
  });
});
