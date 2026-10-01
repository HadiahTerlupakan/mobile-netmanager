import { queryKeys } from '@/lib/queryClient';
import { useSegarkanBeranda } from './useSegarkanBeranda';

/**
 * Kueri Beranda sales. Statistik Beranda (`dashboard`) untuk kartu pencairan
 * bonus canvasing; `presurvei.all` mencakup ringkasan, rencana hari
 * ini/terlewat, dan rekap tim.
 */
const KUNCI_BERANDA_SALES = [queryKeys.presurvei.all, queryKeys.attendance.all, queryKeys.dashboard.all] as const;

/**
 * Tarik-untuk-segarkan Beranda sales. Profil ikut dimuat ulang supaya izin
 * baru (mis. `m_presurvei` setelah migration Task 20) langsung berlaku.
 */
export function useSegarkanBerandaSales() {
  return useSegarkanBeranda(KUNCI_BERANDA_SALES);
}
