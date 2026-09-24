import { useState } from 'react';

import { JEDA_CARI_PROSPEK_MS } from '@/constants/presurvei';
import { useDaftarProspek } from '@/hooks/queries/usePresurveiProspek';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ProspekListItem } from '@/types/presurvei';

/** Keadaan daftar pemilih prospek yang menentukan isi layar kosong. */
export type KeadaanCariProspek = 'ada' | 'memuat' | 'offline' | 'galat' | 'kosong';

type DaftarProspek = ReturnType<typeof useDaftarProspek>;

/**
 * `offline` dibedakan dari `memuat`: `networkMode: 'offlineFirst'`
 * (`src/lib/queryClient.ts:145`) membuat retry pertama yang gagal karena
 * jaringan berhenti di `fetchStatus: 'paused'` dengan `isPending` tetap true,
 * sehingga tanpa pembeda ini layar menampilkan "Memuat…" selamanya.
 */
function tentukanKeadaan(daftar: DaftarProspek, jumlah: number): KeadaanCariProspek {
  if (jumlah > 0) return 'ada';
  if (daftar.isError) return 'galat';
  if (daftar.fetchStatus === 'paused') return 'offline';
  if (daftar.isPending) return 'memuat';
  return 'kosong';
}

/** Pencarian ter-debounce atas prospek milik sendiri, berhalaman. */
export function useCariProspek() {
  const [cari, setCari] = useState('');
  const cariTertunda = useDebouncedValue(cari.trim(), JEDA_CARI_PROSPEK_MS);
  const daftar = useDaftarProspek(cariTertunda === '' ? {} : { search: cariTertunda });
  const prospek: ProspekListItem[] = daftar.data?.pages.flatMap((halaman) => halaman.data) ?? [];

  const muatBerikutnya = () => {
    if (daftar.hasNextPage && !daftar.isFetchingNextPage) void daftar.fetchNextPage();
  };
  const muatUlang = () => {
    void daftar.refetch();
  };

  return { cari, setCari, prospek, keadaan: tentukanKeadaan(daftar, prospek.length), muatBerikutnya, muatUlang };
}
