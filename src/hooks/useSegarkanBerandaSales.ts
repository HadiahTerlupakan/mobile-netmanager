import { KUNCI_TUNGGAKAN } from '@/hooks/queries/useTunggakanPelanggan';
import { queryKeys } from '@/lib/queryClient';
import { useSegarkanBeranda } from './useSegarkanBeranda';

/**
 * Kueri Beranda sales. Statistik Beranda (`dashboard`) untuk kartu pencairan
 * bonus canvasing; `presurvei.all` mencakup ringkasan, rencana hari
 * ini/terlewat, dan rekap tim; tunggakan pelanggan untuk kartu Tunggakan;
 * ringkasan pengesahan untuk tile menu cepat.
 */
const KUNCI_BERANDA_SALES = [
  queryKeys.presurvei.all,
  queryKeys.attendance.all,
  queryKeys.dashboard.all,
  KUNCI_TUNGGAKAN,
  queryKeys.pengesahan.ringkasan(),
] as const;

/**
 * Tarik-untuk-segarkan Beranda sales. Profil ikut dimuat ulang supaya izin
 * baru (mis. `m_presurvei` setelah migration Task 20) langsung berlaku.
 */
export function useSegarkanBerandaSales() {
  return useSegarkanBeranda(KUNCI_BERANDA_SALES);
}
