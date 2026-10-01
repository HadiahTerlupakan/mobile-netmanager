import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaLayar } from '@/components/molecules/KepalaLayar';

import { FormTambahProspek } from '@/components/organisms/presurvei/FormTambahProspek';
import { AppFeature } from '@/constants/features';
import { ruteRincianProspek } from '@/constants/rutePresurvei';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';


/**
 * Layar Tambah Prospek (calon pelanggan atau perantara). Tabs mempertahankan instance layar, jadi
 * form dipasang ulang (kosong) setiap kali layar ditinggalkan. Sukses →
 * form ditutup (`back`) lalu rincian dibuka (`push`). Layar ini route
 * tersembunyi di Tabs ber-`backBehavior="history"`, jadi `replace` tidak
 * menghapus form dari riwayat — Kembali dari rincian akan membuka form kosong.
 */
export default function TambahProspekScreen() {
  const isDiizinkan = useFeatureGuard(AppFeature.PRESURVEI);
  const router = useRouter();
  const [kunciForm, setKunciForm] = useState(0);

  useFocusEffect(useCallback(() => () => setKunciForm((kunci) => kunci + 1), []));

  const bukaRincian = (id: string) => {
    router.back();
    router.push(ruteRincianProspek(id));
  };

  // Guard fitur yang mengalihkan; jangan tampilkan form sebelum diizinkan.
  if (!isDiizinkan) return null;
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <KepalaLayar judul="Tambah Prospek" />
      <FormTambahProspek key={kunciForm} onBerhasil={(prospek) => bukaRincian(prospek.id)} />
    </SafeAreaView>
  );
}
