import { useInfiniteQuery } from "@tanstack/react-query";

import { PelangganPage, PelangganService } from "@/services/PelangganService";

const PAGE_SIZE = 20;
const STALE_TIME_MS = 5 * 60 * 1000;

/** Halaman berikutnya, atau undefined bila sudah halaman terakhir. */
export const getNextPelangganPage = (lastPage: PelangganPage): number | undefined =>
  lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined;

/** Daftar pelanggan berpaginasi untuk layar Isolir dan picker Ajukan WO. */
export function usePelangganList(params: { status?: string; search?: string }) {
  return useInfiniteQuery<PelangganPage>({
    queryKey: ["pelanggan", "list", params],
    queryFn: ({ pageParam }) =>
      PelangganService.list({ ...params, page: pageParam as number, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: getNextPelangganPage,
    staleTime: STALE_TIME_MS,
  });
}
