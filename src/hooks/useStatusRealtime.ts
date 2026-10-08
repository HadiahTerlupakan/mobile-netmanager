import { useSyncExternalStore } from 'react';

import {
  dengarkanStatusRealtime,
  statusRealtimeSaatIni,
  type StatusRealtime,
} from '@/services/statusRealtime';

/**
 * Status langganan realtime untuk ditampilkan di layar.
 *
 * Dipakai menggantikan `!!token`, yang hanya berarti "sudah login" dan karena
 * itu tidak pernah bisa menunjukkan langganan yang mati.
 */
export function useStatusRealtime(): StatusRealtime {
  return useSyncExternalStore(dengarkanStatusRealtime, statusRealtimeSaatIni, statusRealtimeSaatIni);
}
