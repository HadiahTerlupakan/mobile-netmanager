import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { KartuNotifikasi } from '@/components/organisms/portalPelanggan/KartuNotifikasi';
import { KartuPengumuman } from '@/components/organisms/portalPelanggan/KartuPengumuman';
import { useNotifikasiPelanggan, usePengumumanPelanggan, useTandaiPengumumanDibaca } from '@/hooks/queries/useKabarPelanggan';

/** teal-600 */
const WARNA_TEAL = '#0d9488';

/** Pengumuman aktif dan notifikasi pelanggan (balasan tiket, kabar tagihan). */
export default function NotifikasiPelangganScreen() {
  const router = useRouter();
  const notifikasi = useNotifikasiPelanggan();
  const pengumuman = usePengumumanPelanggan();
  const tandai = useTandaiPengumumanDibaca();
  const idBelumDibaca = new Set((notifikasi.data?.announcements ?? []).map((item) => item.id));
  const { refetch: muatUlangNotifikasi } = notifikasi;
  const { refetch: muatUlangPengumuman } = pengumuman;
  const muatUlang = useCallback(() => {
    void muatUlangNotifikasi();
    void muatUlangPengumuman();
  }, [muatUlangNotifikasi, muatUlangPengumuman]);

  useFocusEffect(muatUlang);

  if (notifikasi.isPending || pengumuman.isPending) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
        <KepalaLayar judul="Notifikasi" />
        <ActivityIndicator style={tw`mt-16`} color={WARNA_TEAL} />
      </SafeAreaView>
    );
  }
  const daftarPengumuman = pengumuman.data ?? [];
  const daftarNotifikasi = notifikasi.data?.notifications ?? [];
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <KepalaLayar judul="Notifikasi" />
      {notifikasi.isError && pengumuman.isError ? (
        <QueryErrorState onRetry={muatUlang} />
      ) : (
        <ScrollView
          contentContainerStyle={tw`p-4 pb-8`}
          refreshControl={<RefreshControl refreshing={notifikasi.isRefetching || pengumuman.isRefetching} onRefresh={muatUlang} tintColor={WARNA_TEAL} />}
        >
          <Text style={tw`text-sm font-bold text-gray-500 uppercase mb-2`}>Pengumuman</Text>
          {daftarPengumuman.length === 0 ? <Text style={tw`text-sm text-gray-500 mb-4`}>Tidak ada pengumuman.</Text> : null}
          {daftarPengumuman.map((item) => (
            <KartuPengumuman key={item.id} pengumuman={item} isBaru={idBelumDibaca.has(item.id)} onBuka={(id) => idBelumDibaca.has(id) && tandai.mutate(id)} />
          ))}
          <Text style={tw`text-sm font-bold text-gray-500 uppercase mt-4 mb-2`}>Notifikasi</Text>
          {daftarNotifikasi.length === 0 ? <Text style={tw`text-sm text-gray-500`}>Belum ada notifikasi.</Text> : null}
          {daftarNotifikasi.map((item) => (
            <KartuNotifikasi
              key={item.id}
              notifikasi={item}
              onBukaTiket={(id) => router.push({ pathname: '/(customer)/tickets/[id]', params: { id } })}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
