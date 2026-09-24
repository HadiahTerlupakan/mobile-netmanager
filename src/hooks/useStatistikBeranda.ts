import type { StatistikPencairanCanvasing } from '@/components/organisms/dashboard/KartuPencairanCanvasing';
import { useAuth } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/queries';
import { queryKeys } from '@/lib/queryClient';

/** Statistik `/api/mobile/dashboard` yang dibaca Beranda karyawan. */
export interface StatistikBeranda extends StatistikPencairanCanvasing {
  workOrdersAssigned: number;
  workOrdersPending: number;
  woCompletedToday: number;
  woCompletedWeek: number;
  woCompletedMonth: number;
  barangKeluarToday: number;
  barangMasukToday: number;
  targetHarian?: number;
  suksesClosingMonth?: number;
  saldoKomisi?: number;
}

/** Statistik Beranda karyawan; satu query (dan satu cache) untuk layar teknisi dan sales. */
export function useStatistikBeranda() {
  const { token } = useAuth();
  return useOfflineQuery<StatistikBeranda>({
    queryKey: queryKeys.dashboard.stats(),
    endpoint: '/api/mobile/dashboard',
    select: (data: any) => data?.data || data,
    enabled: !!token,
  });
}
