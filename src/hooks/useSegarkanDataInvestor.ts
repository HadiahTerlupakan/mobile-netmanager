import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { queryKeys } from '@/lib/queryClient';

/** Jeda minimal antar-penyegaran agar pindah tab bolak-balik tidak membanjiri server. */
export const JEDA_SEGAR_INVESTOR_MS = 30_000;

let terakhirDisegarkan = 0;

/** Segarkan semua data investor bila penyegaran terakhir sudah lewat jeda. */
export function segarkanBilaPerlu(segarkan: () => void, sekarang: number = Date.now()): boolean {
  if (sekarang - terakhirDisegarkan < JEDA_SEGAR_INVESTOR_MS) return false;
  terakhirDisegarkan = sekarang;
  segarkan();
  return true;
}

/** Hanya untuk test: lupakan waktu penyegaran terakhir. */
export function aturUlangJedaSegarInvestor() {
  terakhirDisegarkan = 0;
}

/**
 * Data keuangan investor dipersist ke disk dan layar tab tetap terpasang, jadi
 * tanpa ini angka Beranda bisa tertinggal dari Rincian Proyek. Hook memuat
 * ulang data investor saat layar dibuka dan saat aplikasi kembali aktif.
 */
export function useSegarkanDataInvestor() {
  const queryClient = useQueryClient();
  const segarkan = useCallback(() => {
    segarkanBilaPerlu(() => void queryClient.invalidateQueries({ queryKey: queryKeys.investor.all }));
  }, [queryClient]);

  useFocusEffect(segarkan);

  useEffect(() => {
    const langganan = AppState.addEventListener('change', (keadaan) => {
      if (keadaan === 'active') segarkan();
    });
    return () => langganan.remove();
  }, [segarkan]);
}
