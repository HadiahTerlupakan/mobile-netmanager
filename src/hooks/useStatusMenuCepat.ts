import { useMemo } from 'react';

import type { IdMenuCepat } from '@/constants/menuCepat';
import { useRingkasanPengesahan } from '@/hooks/queries/usePengesahan';
import { tentukanMenuPengesahan } from '@/utils/pengesahan/tampilanPengesahan';

/** Keadaan dinamis menu cepat dari data server: tile yang disembunyikan dan angka lencananya. */
export interface StatusMenuCepat {
  idTersembunyi: readonly IdMenuCepat[];
  lencana: Partial<Record<IdMenuCepat, number>>;
}

/** Pengesahan hanya tampil bila pengguna punya surat; lencananya surat yang menunggu tanda tangan. */
export function useStatusMenuCepat(): StatusMenuCepat {
  const { data: ringkasan } = useRingkasanPengesahan();
  const { isTampil, jumlahLencana } = tentukanMenuPengesahan(ringkasan);
  return useMemo(
    () => ({ idTersembunyi: isTampil ? [] : ['pengesahan'], lencana: { pengesahan: jumlahLencana } }),
    [isTampil, jumlahLencana],
  );
}
