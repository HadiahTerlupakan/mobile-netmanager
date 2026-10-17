import { focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * React Native tidak punya event "window focus", jadi tanpa ini TanStack Query
 * tidak pernah tahu aplikasi kembali dari latar belakang. Akibatnya layar yang
 * tetap terpasang semalaman menampilkan data kemarin — mis. status "sudah
 * check-in" padahal sesinya sudah ditutup otomatis, sehingga karyawan menekan
 * check-out, ditolak, dan hari itu tercatat ABSENT.
 *
 * Dengan fokus = AppState aktif, query yang sudah basi otomatis dimuat ulang
 * setiap aplikasi dibuka kembali (bersama `refetchOnWindowFocus`).
 */
type SumberAppState = Pick<typeof AppState, 'addEventListener'>;

export function hubungkanFokusQueryKeAppState(
  sumberAppState: SumberAppState = AppState,
): void {
  focusManager.setEventListener((tanganiFokus) => {
    const langganan = sumberAppState.addEventListener('change', (keadaan: AppStateStatus) => {
      tanganiFokus(keadaan === 'active');
    });
    return () => langganan.remove();
  });
}
