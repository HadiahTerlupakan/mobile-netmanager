import type { ProspekStatus } from '@/constants/presurvei';
import type { FilterDaftarProspek } from '@/hooks/queries/usePresurveiProspek';

/** Pilihan filter status di layar; SEMUA berarti tanpa filter. */
export type FilterStatusProspek = ProspekStatus | 'SEMUA';

/** Filter daftar prospek tanpa kunci kosong (query key dan query string bersih). */
export function bangunFilterProspek(status: FilterStatusProspek, search: string): FilterDaftarProspek {
  const cari = search.trim();
  return {
    ...(status === 'SEMUA' ? {} : { status }),
    ...(cari === '' ? {} : { search: cari }),
  };
}
