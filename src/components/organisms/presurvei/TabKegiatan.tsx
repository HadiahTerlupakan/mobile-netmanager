import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { NavigasiTanggal } from '@/components/molecules/NavigasiTanggal';
import { RUTE_CATAT_KEGIATAN } from '@/constants/rutePresurvei';
import { useKegiatanHarian, useKegiatanMenungguKirim } from '@/hooks/queries/usePresurveiKegiatan';
import { gabungKegiatanHarian } from '@/utils/presurvei/daftarKegiatan';
import { geserHari, rentangHariLokal } from '@/utils/presurvei/rentangHari';
import { KartuKegiatan } from './KartuKegiatan';

/** Sub-tab Kegiatan: daftar per tanggal, termasuk yang masih menunggu/gagal kirim. */
export function TabKegiatan() {
  const router = useRouter();
  const [tanggal, setTanggal] = useState(() => new Date());
  const kegiatan = useKegiatanHarian(tanggal);
  const antrean = useKegiatanMenungguKirim();
  const baris = gabungKegiatanHarian(kegiatan.data?.data ?? [], antrean.data ?? [], rentangHariLokal(tanggal));
  const segarkan = () => {
    void kegiatan.refetch();
    void antrean.refetch();
  };

  return (
    <View style={tw`flex-1`}>
      <NavigasiTanggal tanggal={tanggal} onGeser={(jumlah) => setTanggal((lama) => geserHari(lama, jumlah))} />
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => router.push(RUTE_CATAT_KEGIATAN)}
        style={tw`mx-4 mb-3 bg-blue-600 rounded-xl py-3 items-center`}
      >
        <Text style={tw`text-white font-bold`}>Catat Kegiatan</Text>
      </TouchableOpacity>
      {kegiatan.isError ? (
        // Amandemen preflight (S3): galat server ditampilkan sebagai banner,
        // BUKAN mengganti seluruh daftar — kegiatan yang masih di antrean
        // offline (termasuk yang FAILED) tetap harus terlihat saat offline.
        <View style={tw`mx-4 mb-2 bg-red-50 border border-red-200 rounded-xl p-3`}>
          <Text style={tw`text-red-700 text-sm`}>
            Kegiatan dari server gagal dimuat. Menampilkan yang tersimpan di perangkat.
          </Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Coba lagi" onPress={segarkan}>
            <Text style={tw`text-red-700 font-semibold text-sm mt-1`}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={baris}
        keyExtractor={(item) => item.kunci}
        renderItem={({ item }) => <KartuKegiatan baris={item} />}
        contentContainerStyle={tw`px-4 pb-24`}
        refreshControl={<RefreshControl refreshing={kegiatan.isRefetching} onRefresh={segarkan} />}
        ListEmptyComponent={
          kegiatan.isPending ? (
            <ActivityIndicator />
          ) : (
            <Text style={tw`text-center text-gray-500 mt-8`}>Belum ada kegiatan di tanggal ini.</Text>
          )
        }
      />
    </View>
  );
}
