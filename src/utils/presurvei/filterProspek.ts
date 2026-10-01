import { LABEL_JENIS_PROSPEK, type ProspekJenis, type ProspekStatus } from '@/constants/presurvei';
import type { FilterDaftarProspek } from '@/hooks/queries/usePresurveiProspek';

/** Pilihan filter status di layar; SEMUA berarti tanpa filter. */
export type FilterStatusProspek = ProspekStatus | 'SEMUA';

/** Pilihan filter jenis di layar; SEMUA berarti calon pelanggan dan perantara. */
export type FilterJenisProspek = ProspekJenis | 'SEMUA';

const FILTER_SEMUA = 'SEMUA';

/** Pilihan "Semua / Calon pelanggan / Perantara" dalam urutan tampil. */
export const OPSI_FILTER_JENIS_PROSPEK: readonly { nilai: FilterJenisProspek; label: string }[] = [
  { nilai: FILTER_SEMUA, label: 'Semua' },
  { nilai: 'CALON_PELANGGAN', label: LABEL_JENIS_PROSPEK.CALON_PELANGGAN },
  { nilai: 'PERANTARA', label: LABEL_JENIS_PROSPEK.PERANTARA },
];

/** Filter daftar prospek tanpa kunci kosong (query key dan query string bersih). */
export function bangunFilterProspek(
  status: FilterStatusProspek,
  search: string,
  jenis: FilterJenisProspek = FILTER_SEMUA,
): FilterDaftarProspek {
  const cari = search.trim();
  return {
    ...(status === FILTER_SEMUA ? {} : { status }),
    ...(jenis === FILTER_SEMUA ? {} : { jenis }),
    ...(cari === '' ? {} : { search: cari }),
  };
}
