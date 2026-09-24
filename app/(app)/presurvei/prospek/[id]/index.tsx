import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { AksiProspek } from '@/components/organisms/presurvei/AksiProspek';
import { KartuRincianProspek } from '@/components/organisms/presurvei/KartuRincianProspek';
import { PilihStatusProspekModal } from '@/components/organisms/presurvei/PilihStatusProspekModal';
import { RiwayatKegiatanProspek } from '@/components/organisms/presurvei/RiwayatKegiatanProspek';
import { AppFeature } from '@/constants/features';
import { useLayarRincianProspek } from '@/hooks/presurvei/useLayarRincianProspek';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

/** Rincian prospek: kontak, status, riwayat kegiatan, dan aksinya. */
export default function RincianProspekScreen() {
  useFeatureGuard(AppFeature.PRESURVEI);
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const layar = useLayarRincianProspek(id);

  if (layar.isPending) return <ActivityIndicator style={tw`mt-10`} />;
  // Amandemen preflight (S4): hanya `!layar.prospek`, BUKAN `isError ||
  // !prospek` — data cache tidak boleh disembunyikan hanya karena refetch
  // gagal (mis. offline); selama ada data, itu yang ditampilkan.
  if (!layar.prospek) {
    return <QueryErrorState message="Rincian prospek gagal dimuat." onRetry={() => void layar.refetch()} />;
  }
  const prospek = layar.prospek;

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView>
        <KartuRincianProspek prospek={prospek} />
        <AksiProspek
          prospek={prospek}
          isOnline={layar.isOnline}
          isMenyimpan={layar.isMenyimpan}
          onCatatFollowUp={layar.kePresurveiCatat}
          onUbahStatus={layar.bukaPilihStatus}
          onJadikanCanvasing={layar.keJadikanCanvasing}
        />
        <RiwayatKegiatanProspek prospekId={prospek.id} />
      </ScrollView>
      {layar.isPilihStatusTerbuka ? (
        <PilihStatusProspekModal
          pilihan={layar.pilihanStatus}
          onPilih={layar.pilihAksi}
          onTutup={layar.tutupPilihStatus}
        />
      ) : null}
    </SafeAreaView>
  );
}
