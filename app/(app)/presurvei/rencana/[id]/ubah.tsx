import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import tw from 'twrnc';

import { LayarGalatBerkepala } from '@/components/molecules/LayarGalatBerkepala';
import { LayarFormRencana } from '@/components/organisms/presurvei/LayarFormRencana';
import { AppFeature } from '@/constants/features';
import { useLayarUbahRencana } from '@/hooks/presurvei/useLayarFormRencana';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { isTidakDitemukan } from '@/utils/httpStatus';
import { PESAN_RENCANA_HILANG } from '@/utils/presurvei/rencana';

/** Layar ubah (jadwal ulang) rencana terbuka: MANDIRI milik sendiri, atau rencana tim bagi pemberi tugas. */
export default function UbahRencanaScreen() {
  const isDiizinkan = useFeatureGuard(AppFeature.PRESURVEI);
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const layar = useLayarUbahRencana(id, isDiizinkan);

  if (!isDiizinkan) return null;
  if (layar.isPending) return <ActivityIndicator style={tw`mt-10`} />;
  if (!layar.rencana) {
    const isHilang = isTidakDitemukan(layar.galat);
    return (
      <LayarGalatBerkepala
        judul="Ubah Rencana"
        pesan={isHilang ? PESAN_RENCANA_HILANG : 'Rencana gagal dimuat.'}
        onCobaLagi={isHilang ? undefined : () => void layar.refetch()}
      />
    );
  }
  return <LayarFormRencana judul="Ubah Rencana" labelSimpan="Simpan Perubahan" layar={layar} />;
}
