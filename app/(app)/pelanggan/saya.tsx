import { Stack, useRouter } from 'expo-router';
import { Search, Users } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { DaftarKosong } from '@/components/molecules/DaftarKosong';
import { KepalaLayarDaftar } from '@/components/molecules/KepalaLayarDaftar';
import { PilihanChip, type OpsiChip } from '@/components/molecules/PilihanChip';
import { KartuPelangganSaya } from '@/components/organisms/sales/KartuPelangganSaya';
import { useAuth } from '@/context/AuthContext';
import { usePelangganSaya } from '@/hooks/queries/usePelangganSaya';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { AMBANG_MUAT_BERIKUTNYA, useMuatHalamanBerikutnya } from '@/hooks/useMuatHalamanBerikutnya';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import type { PelangganSaya, StatusPelangganSaya } from '@/types/pelangganSaya';

const JEDA_CARI_MS = 400;
const UKURAN_IKON_CARI = 16;
/** slate-400: ikon cari & teks placeholder. */
const WARNA_TEKS_SAMAR = '#94a3b8';
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
  const muatBerikutnya = useMuatHalamanBerikutnya(kueri);
  const daftar = kueri.data?.pages.flatMap((halaman) => halaman.data) ?? [];
  const total = kueri.data?.pages[0]?.total;

  const laporKeluhan = useCallback(
    (pelanggan: PelangganSaya) =>
      router.push({ pathname: '/(app)/keluhan/lapor', params: { pelangganId: pelanggan.id, nama: pelanggan.nama } }),
    [router],
  );

  return (
    <View style={[tw`flex-1`, { paddingTop: insets.top, backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KepalaLayarDaftar judul="Pelanggan saya" subjudul={total === undefined ? 'Pelanggan yang Anda pegang' : `${total} pelanggan`} />

      <View style={tw`px-4 pb-2`}>
        <View style={tw`flex-row items-center bg-white rounded-xl border border-slate-200 px-3`}>
          <Search size={UKURAN_IKON_CARI} color={WARNA_TEKS_SAMAR} />
          <TextInput
            accessibilityLabel="Cari pelanggan"
            value={cari}
            onChangeText={setCari}
            placeholder="Cari nama, ID, nomor HP, alamat"
            placeholderTextColor={WARNA_TEKS_SAMAR}
            style={tw`flex-1 py-2.5 ml-2 text-slate-900`}
            returnKeyType="search"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mt-2 -mx-4 flex-grow-0`} contentContainerStyle={tw`px-4 items-center`}>
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
          onEndReachedThreshold={AMBANG_MUAT_BERIKUTNYA}
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
            <DaftarKosong
              isError={kueri.isError}
              onCobaLagi={() => void kueri.refetch()}
              ikon={Users}
              judul={cariTertunda ? 'Tidak ditemukan' : 'Belum ada pelanggan'}
              pesan={
                cariTertunda
                  ? 'Coba kata kunci lain.'
                  : 'Pelanggan muncul di sini setelah admin menetapkan Anda sebagai sales penanggung jawabnya.'
              }
            />
          }
        />
      )}
    </View>
  );
}
