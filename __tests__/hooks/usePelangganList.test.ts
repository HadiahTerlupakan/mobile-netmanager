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

const mockList = jest.fn();

jest.mock('@/services/PelangganService', () => ({
  PelangganService: { list: (...args: any[]) => mockList(...args) },
}));

import { keepPreviousData } from '@tanstack/react-query';
import { getNextPelangganPage, usePelangganList } from '@/hooks/queries/usePelangganList';

const PAGE_SIZE = 20;

/** Opsi terakhir yang diterima useInfiniteQuery. */
const lastQueryOptions = () =>
  mockUseInfiniteQuery.mock.calls[mockUseInfiniteQuery.mock.calls.length - 1][0] as {
    queryKey: unknown[];
    queryFn: (context: { pageParam: number }) => unknown;
    initialPageParam: number;
  };

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
  it('memakai query key [pelanggan, list, params] supaya cache terpisah per filter', () => {
    const params = { status: 'ISOLIR', search: 'budi' };

    renderHook(() => usePelangganList(params));

    expect(lastQueryOptions().queryKey).toEqual(['pelanggan', 'list', params]);
  });

  it('meminta halaman pertama lebih dulu', () => {
    renderHook(() => usePelangganList({ status: 'ISOLIR' }));

    expect(lastQueryOptions().initialPageParam).toBe(1);
  });

  it('meneruskan pageParam dan filter ke PelangganService.list', () => {
    renderHook(() => usePelangganList({ status: 'ISOLIR', search: 'budi' }));

    lastQueryOptions().queryFn({ pageParam: 2 });

    expect(mockList).toHaveBeenCalledWith({
      status: 'ISOLIR',
      search: 'budi',
      page: 2,
      limit: PAGE_SIZE,
    });
  });

  it('meneruskan placeholderData: keepPreviousData supaya daftar tidak berkedip kosong saat query key berubah', () => {
    renderHook(() => usePelangganList({ status: 'ISOLIR', search: 'budi' }));

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ placeholderData: keepPreviousData }),
    );
  });
});
