import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LayarFormRencana } from '@/components/organisms/presurvei/LayarFormRencana';
import { AppFeature } from '@/constants/features';
import { useLayarBuatRencana } from '@/hooks/presurvei/useLayarFormRencana';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

/** Layar buat rencana kunjungan untuk diri sendiri (MANDIRI). */
export default function BuatRencanaScreen() {
  const isDiizinkan = useFeatureGuard(AppFeature.PRESURVEI);
  const { tanggal } = useLocalSearchParams<{ tanggal?: string }>();
  const layar = useLayarBuatRencana(isDiizinkan, tanggal ?? null);

  // Guard fitur yang mengalihkan; jangan tampilkan form sebelum diizinkan.
  if (!isDiizinkan) return null;
  return <LayarFormRencana judul="Buat Rencana" labelSimpan="Simpan Rencana" layar={layar} />;
}
