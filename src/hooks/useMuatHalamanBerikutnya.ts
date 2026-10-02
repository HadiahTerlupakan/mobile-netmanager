import { useCallback } from 'react';

/** Sisa jarak gulir (dalam tinggi layar) saat halaman berikutnya mulai dimuat. */
export const AMBANG_MUAT_BERIKUTNYA = 0.4;

interface KueriBerhalaman {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}

/** Penangan `onEndReached`: muat halaman berikutnya bila ada dan belum sedang dimuat. */
export function useMuatHalamanBerikutnya({ hasNextPage, isFetchingNextPage, fetchNextPage }: KueriBerhalaman) {
  return useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
}
