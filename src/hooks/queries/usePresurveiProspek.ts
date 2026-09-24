import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { ProspekStatus } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import type { HalamanPresurvei, ProspekListItem } from '@/types/presurvei';

const UKURAN_HALAMAN_PROSPEK = 20;
/** Halaman pertama saat query pertama kali dimuat atau filter berubah. */
const HALAMAN_PERTAMA = 1;

/** Filter layar daftar prospek. */
export interface FilterDaftarProspek {
  status?: ProspekStatus;
  search?: string;
}

/** Halaman berikutnya, atau undefined bila sudah di halaman terakhir. */
export const getHalamanProspekBerikutnya = (
  halaman: HalamanPresurvei<ProspekListItem>,
): number | undefined =>
  halaman.meta.page < halaman.meta.totalPages ? halaman.meta.page + 1 : undefined;

/** Daftar prospek milik sendiri, berhalaman. */
export function useDaftarProspek(filter: FilterDaftarProspek) {
  return useInfiniteQuery({
    queryKey: queryKeys.presurvei.prospekList(filter),
    queryFn: ({ pageParam }) =>
      PresurveiService.daftarProspek({
        ...filter,
        page: pageParam as number,
        limit: UKURAN_HALAMAN_PROSPEK,
      }),
    initialPageParam: HALAMAN_PERTAMA,
    getNextPageParam: getHalamanProspekBerikutnya,
    // Pencarian ter-debounce mengganti query key; tanpa ini daftar berkedip kosong.
    placeholderData: keepPreviousData,
  });
}

/** Rincian satu prospek. */
export function useRincianProspek(id: string) {
  return useQuery({
    queryKey: queryKeys.presurvei.prospekDetail(id),
    queryFn: () => PresurveiService.rincianProspek(id),
    enabled: id !== '',
  });
}
