import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { IsiTabPenilaian } from '@/components/organisms/penilaian/IsiTabPenilaian';
import { ModalRincianAnggota } from '@/components/organisms/penilaian/ModalRincianAnggota';
import { ModalRincianKepala } from '@/components/organisms/penilaian/ModalRincianKepala';
import { AppFeature } from '@/constants/features';
import { useLayarPenilaian } from '@/hooks/presurvei/useLayarPenilaian';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { anggotaTimKepala, bacaTabPenilaian } from '@/utils/presurvei/tampilanPenilaian';

/**
 * Penilaian kinerja per bulan, bertab sesuai jenis tampilan: sales biasa
 * tanpa tab; kepala sales "Saya" + "Tim"; lingkup SEMUA "Kepala sales" +
 * "Semua sales". Param `tab` (+ `diminta`) membuka tab tertentu.
 */
export default function PenilaianKinerjaScreen() {
  const isDiizinkan = useFeatureGuard(AppFeature.PRESURVEI);
  const param = useLocalSearchParams<{ tab?: string; diminta?: string }>();
  const layar = useLayarPenilaian(isDiizinkan, { tab: bacaTabPenilaian(param.tab), diminta: param.diminta });

  if (!isDiizinkan) return null;
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <KepalaLayar judul="Penilaian Kinerja" />
      <IsiTabPenilaian layar={layar} />
      {layar.salesTerbuka ? <ModalRincianAnggota penilaian={layar.salesTerbuka} onTutup={layar.tutupRincian} /> : null}
      {layar.kepalaTerbuka ? (
        <ModalRincianKepala
          kepala={layar.kepalaTerbuka}
          anggota={anggotaTimKepala(layar.hasil?.sales ?? [], layar.kepalaTerbuka.kepalaId)}
          onTutup={layar.tutupRincian}
        />
      ) : null}
    </SafeAreaView>
  );
}
