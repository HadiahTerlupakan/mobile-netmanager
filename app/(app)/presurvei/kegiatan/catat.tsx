import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTemaPersona } from '@/theme';

import { KepalaLayar } from '@/components/molecules/KepalaLayar';

import { FormCatatKegiatan } from '@/components/organisms/presurvei/FormCatatKegiatan';
import { KameraBukti } from '@/components/organisms/presurvei/KameraBukti';
import { PilihProspekModal } from '@/components/organisms/presurvei/PilihProspekModal';
import { AppFeature } from '@/constants/features';
import { useLayarCatatKegiatan, type ParamCatatKegiatan } from '@/hooks/presurvei/useLayarCatatKegiatan';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

/** Ukuran dan warna ikon kembali di kepala layar. */

/** Layar catat kegiatan presurvei (form satu halaman). */
export default function CatatKegiatanScreen() {
  const { tw } = useTemaPersona();
  const isDiizinkan = useFeatureGuard(AppFeature.PRESURVEI);
  const router = useRouter();
  const param = useLocalSearchParams<ParamCatatKegiatan>();
  const layar = useLayarCatatKegiatan(param, () => router.back(), isDiizinkan);
  const [isKameraTerbuka, setIsKameraTerbuka] = useState(false);
  const [isPilihProspekTerbuka, setIsPilihProspekTerbuka] = useState(false);
  const isLaporanRencana = layar.form.nilai.rencanaId !== null;

  // Guard fitur yang mengalihkan; jangan tampilkan form sebelum diizinkan.
  if (!isDiizinkan) return null;

  if (isKameraTerbuka) {
    return (
      <KameraBukti
        onAmbil={(uri) => {
          layar.form.tambahFoto(uri);
          setIsKameraTerbuka(false);
        }}
        onTutup={() => setIsKameraTerbuka(false)}
      />
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Nonaktif selama menyimpan: hasilnya menutup layar ini (review akhir M4). */}
      <KepalaLayar judul={isLaporanRencana ? 'Laporkan Kunjungan' : 'Catat Kegiatan'} isKembaliNonaktif={layar.isMenyimpan} />
      {isLaporanRencana ? (
        <Text style={tw`px-4 py-2 bg-utama-sangat-muda text-sm text-utama-gelap`}>
          Kegiatan ini dicatat sebagai laporan rencana kunjungan Anda.
        </Text>
      ) : null}
      <ScrollView contentContainerStyle={tw`p-4 pb-32`} keyboardShouldPersistTaps="handled">
        <FormCatatKegiatan
          form={layar.form}
          lokasi={layar.lokasi}
          namaProspek={layar.namaProspek}
          onBukaKamera={() => setIsKameraTerbuka(true)}
          onBukaPilihProspek={() => setIsPilihProspekTerbuka(true)}
          onLepasProspek={layar.lepasProspek}
        />
      </ScrollView>
      <View style={tw`absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100`}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: layar.isMenyimpan }}
          disabled={layar.isMenyimpan}
          onPress={layar.simpan}
          style={tw`rounded-xl py-3 items-center ${layar.isMenyimpan ? 'bg-gray-400' : 'bg-utama-kuat'}`}
        >
          <Text style={tw`text-white font-bold`}>{layar.isMenyimpan ? 'Menyimpan…' : 'Simpan Kegiatan'}</Text>
        </TouchableOpacity>
      </View>
      {isPilihProspekTerbuka ? (
        <PilihProspekModal
          onTutup={() => setIsPilihProspekTerbuka(false)}
          onPilih={(prospek) => {
            layar.pilihProspek(prospek);
            setIsPilihProspekTerbuka(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
