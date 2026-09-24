import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useProfileSync } from '@/hooks/useProfileSync';
import { queryKeys } from '@/lib/queryClient';

/**
 * Tarik-untuk-segarkan Beranda sales. Profil ikut dimuat ulang supaya izin
 * baru (mis. `m_presurvei` setelah migration Task 20) langsung berlaku;
 * `useProfileSync` di `app/(app)/_layout.tsx` menyalinnya ke AuthContext.
 * Statistik Beranda ikut disegarkan untuk kartu pencairan bonus canvasing.
 */
export function useSegarkanBerandaSales() {
  const queryClient = useQueryClient();
  const { refetch: refetchProfile } = useProfileSync();
  const [isMenyegarkan, setIsMenyegarkan] = useState(false);

  const segarkan = async () => {
    setIsMenyegarkan(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      refetchProfile(),
    ]);
    setIsMenyegarkan(false);
  };

  return { isMenyegarkan, segarkan };
}
