import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { periksaKesiapanTracking, type KendalaTracking } from '@/services/kesiapanTracking';
import { logger } from '@/utils/logger';

/**
 * Kendala tracking saat ini, diperiksa ulang setiap aplikasi kembali aktif —
 * termasuk sesudah karyawan kembali dari Pengaturan.
 */
export function useKendalaTracking() {
  const [kendala, setKendala] = useState<KendalaTracking | null>(null);

  const segarkan = useCallback(async () => {
    try {
      setKendala(await periksaKesiapanTracking());
    } catch (error) {
      logger.warn('[LocationTracking] Kesiapan tracking tidak terbaca:', error);
    }
  }, []);

  useEffect(() => {
    void segarkan();
    const langganan = AppState.addEventListener('change', (next) => {
      if (next === 'active') void segarkan();
    });
    return () => langganan.remove();
  }, [segarkan]);

  return { kendala, segarkan };
}
