/**
 * Apakah perangkat dianggap online. Nilai null (belum diketahui) dianggap
 * online, sama dengan penentu offline di `src/hooks/useOfflineQuery.ts`
 * (yang memakai formula ini lewat `isStatusOnline`, bukan menyalinnya lagi).
 */
export function isStatusOnline(state: {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}
