import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { IsianTeks } from '@/components/molecules/IsianTeks';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { TombolAksi } from '@/components/molecules/TombolAksi';
import { KameraBukti } from '@/components/organisms/presurvei/KameraBukti';
import { AppFeature } from '@/constants/features';
import { useLayarJadikanCanvasing } from '@/hooks/presurvei/useLayarJadikanCanvasing';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { PANJANG_KTP_MAKS, STATUS_DEAL } from '@/utils/presurvei/formKonversi';

const TEKS_BUTUH_ONLINE_KONVERSI = 'Butuh koneksi internet untuk menjadikan canvasing.';

/** Form Jadikan Canvasing: No. KTP, paket, kabel opsional, dan foto KTP wajib. */
export default function JadikanCanvasingScreen() {
  const isDiizinkan = useFeatureGuard(AppFeature.PRESURVEI);
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const layar = useLayarJadikanCanvasing(id, isDiizinkan);

  // Guard fitur yang mengalihkan; jangan muat atau tampilkan apa pun sebelum diizinkan.
  if (!isDiizinkan) return null;
  if (layar.isKameraTerbuka) {
    return <KameraBukti onAmbil={layar.ambilFotoKtp} onTutup={layar.tutupKamera} />;
  }
  if (layar.isPending) return <ActivityIndicator style={tw`mt-10`} />;
  if (layar.isError || !layar.prospek) {
    return <QueryErrorState message="Rincian prospek gagal dimuat." onRetry={() => void layar.refetch()} />;
  }
  const { prospek, form } = layar;

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView contentContainerStyle={tw`p-4 pb-24`} keyboardShouldPersistTaps="handled">
        <Text style={tw`text-lg font-bold text-gray-900`}>{`Jadikan Canvasing: ${prospek.nama}`}</Text>
        {prospek.status !== STATUS_DEAL ? (
          <Text style={tw`text-sm text-indigo-700 my-2`}>Prospek akan dipindah ke Deal lebih dulu.</Text>
        ) : null}
        <IsianTeks
          label="Nomor KTP"
          nilai={form.nilai.noKtp}
          kesalahan={form.kesalahan.noKtp}
          keyboardType="number-pad"
          maxLength={PANJANG_KTP_MAKS}
          onUbah={(isian) => form.ubah({ noKtp: isian })}
        />
        <IsianTeks
          label="Paket"
          nilai={form.nilai.paket}
          kesalahan={form.kesalahan.paket}
          placeholder="Contoh: Home 20 Mbps"
          onUbah={(isian) => form.ubah({ paket: isian })}
        />
        <IsianTeks
          label="Panjang kabel (meter)"
          nilai={form.nilai.kabel}
          kesalahan={form.kesalahan.kabel}
          keyboardType="number-pad"
          placeholder="Kosongkan untuk memakai estimasi survei"
          onUbah={(isian) => form.ubah({ kabel: isian })}
        />
        <View style={tw`mb-4`}>
          {form.fotoKtpLokal !== null ? (
            <Image source={{ uri: form.fotoKtpLokal }} style={tw`w-full h-40 rounded-xl mb-2`} />
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={layar.bukaKamera}
            style={tw`border border-dashed border-blue-400 rounded-xl py-3 items-center`}
          >
            <Text style={tw`text-blue-600 font-semibold`}>
              {form.fotoKtpLokal === null ? 'Ambil Foto KTP' : 'Ulangi Foto KTP'}
            </Text>
          </TouchableOpacity>
          {form.kesalahan.fotoKtp ? <Text style={tw`text-red-600 text-xs mt-1`}>{form.kesalahan.fotoKtp}</Text> : null}
        </View>
        <TombolAksi label="Jadikan Canvasing" onPress={layar.kirim} isAktif={layar.isOnline && !layar.isMenyimpan} />
        {!layar.isOnline ? <Text style={tw`text-xs text-amber-700`}>{TEKS_BUTUH_ONLINE_KONVERSI}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
