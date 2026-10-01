import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import tw from 'twrnc';

import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { LayarFormRencana } from '@/components/organisms/presurvei/LayarFormRencana';
import { AppFeature } from '@/constants/features';
import { useLayarUbahRencana } from '@/hooks/presurvei/useLayarFormRencana';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

/** Layar ubah (jadwal ulang) rencana terbuka: MANDIRI milik sendiri, atau rencana tim bagi pemberi tugas. */
export default function UbahRencanaScreen() {
  const isDiizinkan = useFeatureGuard(AppFeature.PRESURVEI);
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const layar = useLayarUbahRencana(id, isDiizinkan);

  if (!isDiizinkan) return null;
  if (layar.isPending) return <ActivityIndicator style={tw`mt-10`} />;
  if (!layar.rencana) {
    return <QueryErrorState message="Rencana gagal dimuat." onRetry={() => void layar.refetch()} />;
  }
  return <LayarFormRencana judul="Ubah Rencana" labelSimpan="Simpan Perubahan" layar={layar} />;
}
