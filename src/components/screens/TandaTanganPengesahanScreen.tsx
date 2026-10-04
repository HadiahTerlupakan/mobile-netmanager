import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { PapanTandaTangan } from '@/components/organisms/pengesahan/PapanTandaTangan';
import { useKirimTandaTangan } from '@/hooks/pengesahan/useKirimTandaTangan';
import { DESAIN_PREMIUM } from '@/theme';

/** Layar papan tanda tangan; setelah tersimpan kembali ke detail surat. */
export function TandaTanganPengesahanScreen() {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { kirim, beriTahuKosong, isMengirim } = useKirimTandaTangan(id, () => router.back());

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top', 'bottom']}>
      <KepalaLayar judul="Tanda tangani surat" isKembaliNonaktif={isMengirim} />
      <PapanTandaTangan isMengirim={isMengirim} onSimpan={kirim} onKosong={beriTahuKosong} />
    </SafeAreaView>
  );
}
