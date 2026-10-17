import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { queryKeys } from '@/lib/queryClient';

/** Jeda minimal antar-penyegaran agar pindah tab bolak-balik tidak membanjiri server. */
export const JEDA_SEGAR_STATUS_ABSEN_MS = 10_000;

let terakhirDisegarkan = 0;

/** Hanya untuk test: lupakan waktu penyegaran terakhir. */
export function aturUlangJedaSegarStatusAbsen() {
  terakhirDisegarkan = 0;
}

/**
 * Layar Absensi tetap terpasang di antara tab, jadi status absen harus dimuat
 * ulang setiap layar dibuka: tombol "Ambil Foto Masuk/Keluar" wajib mengikuti
 * keadaan server, bukan cache kemarin.
 */
export function useSegarkanStatusAbsen() {
  const queryClient = useQueryClient();
  const segarkan = useCallback(() => {
    const sekarang = Date.now();
    if (sekarang - terakhirDisegarkan < JEDA_SEGAR_STATUS_ABSEN_MS) return;
    terakhirDisegarkan = sekarang;
    void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
  }, [queryClient]);

  useFocusEffect(segarkan);
}
