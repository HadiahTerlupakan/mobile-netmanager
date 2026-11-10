import { useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { ambilPengajuanBarang } from '@/services/PengajuanBarangService';
import type { HalamanPengajuanBarang } from '@/types/pengajuanBarang';

/** Status pengajuan berubah lewat orang lain (admin, pembeli), jadi cepat dianggap basi. */
const STALE_TIME_MS = 60 * 1000;
/** 403 (izin/site belum diatur) sudah dijelaskan layar dengan pesan server; jangan ditoast lagi. */
const STATUS_DIJELASKAN_LAYAR = 403;

/** Cursor halaman berikutnya, atau undefined bila sudah halaman terakhir. */
export const ambilCursorBerikutnya = (halaman: HalamanPengajuanBarang): string | undefined =>
  halaman.nextCursor ?? undefined;

/** Daftar pengajuan barang berhalaman untuk layar "Pengajuan Barang". */
export function usePengajuanBarang() {
  return useInfiniteQuery<HalamanPengajuanBarang>({
    queryKey: queryKeys.inventory.pengajuan(),
    queryFn: ({ pageParam }) => ambilPengajuanBarang(pageParam as string | null),
    initialPageParam: null,
    getNextPageParam: ambilCursorBerikutnya,
    staleTime: STALE_TIME_MS,
    meta: { silentToastStatuses: [STATUS_DIJELASKAN_LAYAR] },
  });
}
