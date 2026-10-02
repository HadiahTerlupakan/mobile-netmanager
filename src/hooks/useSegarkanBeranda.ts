import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useState } from 'react';

import { useProfileSync } from '@/hooks/useProfileSync';

/**
 * Tarik-untuk-segarkan Beranda: membatalkan cache kueri yang dipakai Beranda
 * dan memuat ulang profil, supaya izin/persona baru langsung berlaku
 * (`useProfileSync` di `app/(app)/_layout.tsx` menyalinnya ke AuthContext).
 */
export function useSegarkanBeranda(kunciKueri: readonly QueryKey[]) {
  const queryClient = useQueryClient();
  const { refetch: refetchProfile } = useProfileSync();
  const [isMenyegarkan, setIsMenyegarkan] = useState(false);

  const segarkan = async () => {
    setIsMenyegarkan(true);
    try {
      await Promise.all([
        ...kunciKueri.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        refetchProfile(),
      ]);
    } finally {
      // Indikator tarik-segarkan wajib berhenti walau salah satu muat ulang gagal.
      setIsMenyegarkan(false);
    }
  };

  return { isMenyegarkan, segarkan };
}
