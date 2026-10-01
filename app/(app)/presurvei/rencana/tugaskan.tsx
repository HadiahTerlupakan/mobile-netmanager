import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LayarFormRencana } from '@/components/organisms/presurvei/LayarFormRencana';
import { PilihSalesRencana } from '@/components/organisms/presurvei/PilihSalesRencana';
import { AppFeature } from '@/constants/features';
import { useLayarTugaskanRencana } from '@/hooks/presurvei/useLayarFormRencana';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

/**
 * Layar tugaskan rencana kunjungan ke anggota tim (kepala sales/admin).
 * Tombolnya hanya tampil bagi pemberi tugas; server tetap menolak (403/422)
 * sales di luar lingkup.
 */
export default function TugaskanRencanaScreen() {
  const isDiizinkan = useFeatureGuard(AppFeature.PRESURVEI);
  const { salesId, tanggal } = useLocalSearchParams<{ salesId?: string; tanggal?: string }>();
  const layar = useLayarTugaskanRencana(isDiizinkan, salesId ?? null, tanggal ?? null);

  if (!isDiizinkan) return null;
  return (
    <LayarFormRencana
      judul="Tugaskan Rencana"
      labelSimpan="Kirim Penugasan"
      layar={layar}
      kepalaForm={<PilihSalesRencana sales={layar.sales} />}
    />
  );
}
