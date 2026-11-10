import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { AlertTriangle, PackageSearch } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/atoms/EmptyState';
import { KartuPengajuanBarang } from '@/components/molecules/KartuPengajuanBarang';
import { FITUR_PENGAJUAN_BARANG } from '@/constants/menuCepat';
import { usePengajuanBarang } from '@/hooks/queries/usePengajuanBarang';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AMBANG_MUAT_BERIKUTNYA, useMuatHalamanBerikutnya } from '@/hooks/useMuatHalamanBerikutnya';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import type { PengajuanBarang } from '@/types/pengajuanBarang';

const PESAN_GAGAL_BAWAAN = 'Daftar pengajuan belum bisa dimuat. Tarik layar ke bawah untuk coba lagi.';

/** Pesan galat dari server bila ada (mis. akun belum punya site), selain itu kalimat umum. */
function pesanGalat(error: unknown): string {
  const pesanServer = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof pesanServer === 'string' && pesanServer ? pesanServer : PESAN_GAGAL_BAWAAN;
}

/**
 * Status pengajuan barang untuk gudang di site pengguna — hanya untuk dilihat.
 * Mengajukan, menyetujui, dan mencatat barang datang tetap lewat web admin.
 */
export default function PengajuanBarangScreen() {
  const { tw, warna } = useTemaPersona();
  useFeatureGuard(FITUR_PENGAJUAN_BARANG);
  const insets = useSafeAreaInsets();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching, isRefetching, refetch, isError, error } =
    usePengajuanBarang();
  const daftar = data?.pages.flatMap((halaman) => halaman.data) ?? [];
  const handleMuatBerikutnya = useMuatHalamanBerikutnya({ hasNextPage, isFetchingNextPage, fetchNextPage });

  return (
    <View style={[tw`flex-1`, { paddingTop: insets.top, backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={tw`px-4 pt-4 pb-3`}>
        <Text style={tw`text-2xl font-bold text-slate-900`}>Pengajuan Barang</Text>
        <Text style={tw`text-sm text-slate-500 mt-0.5`}>Status pengajuan barang untuk gudang di site Anda</Text>
      </View>

      <FlashList
        data={daftar}
        keyExtractor={(item: PengajuanBarang) => item.id}
        renderItem={({ item }: { item: PengajuanBarang }) => <KartuPengajuanBarang pengajuan={item} />}
        onEndReached={handleMuatBerikutnya}
        onEndReachedThreshold={AMBANG_MUAT_BERIKUTNYA}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={warna.utamaKuat} />}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={tw`py-4`}>
              <ActivityIndicator color={warna.utamaKuat} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isFetching && !isError ? (
            <View style={tw`items-center justify-center py-20 px-8`}>
              <ActivityIndicator size="large" color={warna.utamaKuat} />
            </View>
          ) : (
            <EmptyState
              ikon={isError ? AlertTriangle : PackageSearch}
              judul={isError ? 'Gagal memuat' : 'Belum ada pengajuan'}
              pesan={isError ? pesanGalat(error) : 'Belum ada pengajuan barang untuk gudang di site Anda.'}
              aksi={isError ? { label: 'Coba lagi', onTekan: () => void refetch() } : undefined}
            />
          )
        }
      />
    </View>
  );
}
