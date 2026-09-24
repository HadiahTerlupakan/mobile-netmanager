import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useApiQuery } from '@/hooks/queries/useApiQuery';
import { queryKeys } from '@/lib/queryClient';
import { punyaFitur } from '@/utils/persona';
import type { StatusAbsenRingkas } from '@/utils/presurvei/berandaSales';

/** Endpoint status absen; sama dengan layar Absensi (`app/(app)/absensi.tsx:605`). */
export const ENDPOINT_STATUS_ABSEN = '/api/mobile/attendance/status';

interface ResponsStatusAbsen {
  success: boolean;
  data: StatusAbsenRingkas;
}

/**
 * Status absen hari ini; query key sama dengan layar Absensi sehingga cache
 * dipakai bersama. Tidak memanggil server tanpa izin `m_absensi` (spec §3 aturan 1).
 */
export function useStatusAbsenHariIni() {
  const { user, token } = useAuth();
  return useApiQuery<ResponsStatusAbsen>({
    queryKey: queryKeys.attendance.status(user?.id),
    endpoint: ENDPOINT_STATUS_ABSEN,
    enabled: !!token && punyaFitur(user, AppFeature.ABSENSI),
  });
}
