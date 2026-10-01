import { useState } from 'react';

import type { PenilaianSales } from '@/types/penilaian';
import { opsiFilterPredikat, saringPerPredikat, type FilterPredikat } from '@/utils/presurvei/penilaianKinerja';

/**
 * Filter predikat untuk satu daftar sales: opsi chip, filter aktif, dan hasil
 * urut skor. Filter yang tak lagi punya anggota (mis. setelah ganti bulan)
 * jatuh ke "Semua".
 */
export function useSaringPredikat(daftar: readonly PenilaianSales[]) {
  const [filter, setFilter] = useState<FilterPredikat>('SEMUA');
  const opsi = opsiFilterPredikat(daftar);
  const filterAktif = opsi.some((item) => item.nilai === filter) ? filter : 'SEMUA';
  return { opsi, filter: filterAktif, pilih: setFilter, anggota: saringPerPredikat(daftar, filterAktif) };
}
