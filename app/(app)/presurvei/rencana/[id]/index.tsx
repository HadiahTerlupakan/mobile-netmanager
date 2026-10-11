import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { LayarGalatBerkepala } from '@/components/molecules/LayarGalatBerkepala';
import { AksiRencana } from '@/components/organisms/presurvei/AksiRencana';
import { KartuRincianRencana } from '@/components/organisms/presurvei/KartuRincianRencana';
import { ModalBatalRencana } from '@/components/organisms/presurvei/ModalBatalRencana';
import { RingkasanLaporanRencana } from '@/components/organisms/presurvei/RingkasanLaporanRencana';
import { AppFeature } from '@/constants/features';
import { useLayarRincianRencana } from '@/hooks/presurvei/useLayarRincianRencana';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { isTidakDitemukan } from '@/utils/httpStatus';
import { PESAN_RENCANA_HILANG } from '@/utils/presurvei/rencana';
import { hakAksesRencana } from '@/utils/presurvei/timRencana';

/** Rincian rencana kunjungan: isi, laporan bila selesai, dan aksinya. Tujuan deep-link penugasan. */
export default function RincianRencanaScreen() {
  const isDiizinkan = useFeatureGuard(AppFeature.PRESURVEI);
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const layar = useLayarRincianRencana(id, isDiizinkan);

  if (!isDiizinkan) return null;
  if (layar.isPending) return <ActivityIndicator style={tw`mt-10`} />;
  // Seperti rincian prospek: data cache tetap ditampilkan walau refetch gagal.
  if (!layar.rencana) {
    // Notifikasi penugasan bisa menunjuk rencana yang sudah dibatalkan; 404
    // tidak akan sembuh dengan memuat ulang, jadi jangan tawarkan "Coba lagi".
    const isHilang = isTidakDitemukan(layar.galat);
    return (
      <LayarGalatBerkepala
        judul="Rencana Kunjungan"
        pesan={isHilang ? PESAN_RENCANA_HILANG : 'Rencana gagal dimuat.'}
        onCobaLagi={isHilang ? undefined : () => void layar.refetch()}
      />
    );
  }
  const { rencana, batal } = layar;

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <KepalaLayar judul="Rencana Kunjungan" />
      <ScrollView>
        <KartuRincianRencana
          rencana={rencana}
          isMenungguKirim={layar.isMenungguKirim}
          isTampilSales={layar.lingkup.isPemberiTugas}
        />
        {rencana.statusTampil === 'SELESAI' ? <RingkasanLaporanRencana rencana={rencana} /> : null}
        <AksiRencana
          hak={hakAksesRencana(rencana, layar.lingkup)}
          isOnline={layar.isOnline}
          isMenungguKirim={layar.isMenungguKirim}
          onLaporkan={layar.laporkan}
          onUbah={layar.ubah}
          onBatalkan={batal.buka}
        />
      </ScrollView>
      {batal.isTerbuka ? (
        <ModalBatalRencana
          alasan={batal.alasan}
          kesalahan={batal.kesalahan}
          isMenyimpan={batal.isMenyimpan}
          onUbahAlasan={batal.ubahAlasan}
          onKonfirmasi={batal.konfirmasi}
          onTutup={batal.tutup}
        />
      ) : null}
    </SafeAreaView>
  );
}
