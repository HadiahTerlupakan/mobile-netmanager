import { Stack, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Search, Users } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { EmptyState } from '@/components/atoms/EmptyState';
import { PilihanChip, type OpsiChip } from '@/components/molecules/PilihanChip';
import { KartuPelangganSaya } from '@/components/organisms/sales/KartuPelangganSaya';
import { useAuth } from '@/context/AuthContext';
import { usePelangganSaya } from '@/hooks/queries/usePelangganSaya';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import type { PelangganSaya, StatusPelangganSaya } from '@/types/pelangganSaya';

const JEDA_CARI_MS = 400;
const SEMUA = 'SEMUA';
type SaringanStatus = StatusPelangganSaya | typeof SEMUA;

const OPSI_STATUS: readonly OpsiChip<SaringanStatus>[] = [
  { nilai: SEMUA, label: 'Semua' },
  { nilai: 'AKTIF', label: 'Aktif' },
  { nilai: 'ISOLIR', label: 'Isolir' },
  { nilai: 'MAINTENANCE', label: 'Perbaikan' },
  { nilai: 'NONAKTIF', label: 'Nonaktif' },
];

/**
 * Pelanggan saya: pelanggan yang dipegang sales (kepala sales: timnya; head of
 * sales: semua), dengan WO berjalan & keluhan terbuka. Dari sini sales
 * mencatat keluhan atas nama pelanggan, menelepon, atau membuka peta.
 */
export default function PelangganSayaScreen() {
  const { warna } = useTemaPersona();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cari, setCari] = useState('');
  const [status, setStatus] = useState<SaringanStatus>(SEMUA);
  const cariTertunda = useDebouncedValue(cari.trim(), JEDA_CARI_MS);
  const kueri = usePelangganSaya({ cari: cariTertunda || undefined, status: status === SEMUA ? undefined : status });
  const daftar = kueri.data?.pages.flatMap((halaman) => halaman.data) ?? [];
  const total = kueri.data?.pages[0]?.total;

  const laporKeluhan = useCallback(
    (pelanggan: PelangganSaya) =>
      router.push({ pathname: '/(app)/keluhan/lapor', params: { pelangganId: pelanggan.id, nama: pelanggan.nama } }),
    [router],
  );

  const muatBerikutnya = () => {
    if (kueri.hasNextPage && !kueri.isFetchingNextPage) void kueri.fetchNextPage();
  };

  return (
    <View style={[tw`flex-1`, { paddingTop: insets.top, backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={tw`flex-row items-center px-4 pt-3 pb-2`}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={tw`p-2 -ml-2 mr-1`}>
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          <Text style={tw`text-2xl font-bold text-slate-900`}>Pelanggan saya</Text>
          <Text style={tw`text-sm text-slate-500 mt-0.5`}>
            {total === undefined ? 'Pelanggan yang Anda pegang' : `${total} pelanggan`}
          </Text>
        </View>
      </View>

      <View style={tw`px-4 pb-2`}>
        <View style={tw`flex-row items-center bg-white rounded-xl border border-slate-200 px-3`}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            accessibilityLabel="Cari pelanggan"
            value={cari}
            onChangeText={setCari}
            placeholder="Cari nama, ID, nomor HP, alamat"
            placeholderTextColor="#94a3b8"
            style={tw`flex-1 py-2.5 ml-2 text-slate-900`}
            returnKeyType="search"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mt-2 -mx-4`} contentContainerStyle={tw`px-4`}>
          <View style={tw`flex-row`}>
            <PilihanChip opsi={OPSI_STATUS} terpilih={status} onPilih={setStatus} />
          </View>
        </ScrollView>
      </View>

      {kueri.isPending ? (
        <ActivityIndicator style={tw`mt-16`} color={warna.utamaKuat} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`pb-12 pt-1`}
          onEndReached={muatBerikutnya}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={kueri.isRefetching && !kueri.isFetchingNextPage} onRefresh={() => void kueri.refetch()} tintColor={warna.utamaKuat} />
          }
          renderItem={({ item }) => (
            <KartuPelangganSaya
              pelanggan={item}
              isTampilkanSales={Boolean(item.namaSales) && item.namaSales !== user?.name}
              onLaporKeluhan={laporKeluhan}
            />
          )}
          ListFooterComponent={kueri.isFetchingNextPage ? <ActivityIndicator style={tw`my-4`} color={warna.utamaKuat} /> : null}
          ListEmptyComponent={
            <EmptyState
              ikon={kueri.isError ? AlertTriangle : Users}
              judul={kueri.isError ? 'Gagal memuat' : cariTertunda ? 'Tidak ditemukan' : 'Belum ada pelanggan'}
              pesan={
                kueri.isError
                  ? 'Tarik ke bawah untuk mencoba lagi.'
                  : cariTertunda
                    ? 'Coba kata kunci lain.'
                    : 'Pelanggan muncul di sini setelah admin menetapkan Anda sebagai sales penanggung jawabnya.'
              }
              aksi={kueri.isError ? { label: 'Coba lagi', onTekan: () => void kueri.refetch() } : undefined}
            />
          }
        />
      )}
    </View>
  );
}
