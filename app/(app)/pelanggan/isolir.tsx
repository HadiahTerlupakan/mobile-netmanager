import { FlashList } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { AlertTriangle, Search, ShieldCheck, Wrench, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/atoms/EmptyState";
import { DESAIN_PREMIUM, useTemaPersona } from "@/theme";

import { PelangganCard } from "@/components/molecules/PelangganCard";
import { AppFeature } from "@/constants/features";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePelangganList } from "@/hooks/queries/usePelangganList";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { AMBANG_MUAT_BERIKUTNYA, useMuatHalamanBerikutnya } from "@/hooks/useMuatHalamanBerikutnya";
import { MobilePelanggan } from "@/services/PelangganService";
import { resolvePelangganListMessage } from "@/utils/pelangganListMessage";

const SEARCH_DEBOUNCE_MS = 400;
const UKURAN_IKON_KOLOM_CARI = 18;
/** slate-400 */
const WARNA_PLACEHOLDER = "#94a3b8";

/** Pelanggan terisolir (teknisi): cari, hubungi, buka peta, atau ajukan WO pemulihan. */
export default function PelangganIsolirScreen() {
  const { tw, warna } = useTemaPersona();
  useFeatureGuard(AppFeature.PELANGGAN);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage,
    isFetching, isRefetching, refetch, isError, error,
  } = usePelangganList({ status: "ISOLIR", search: debouncedSearch });

  const pelanggans = data?.pages.flatMap((page) => page.data) ?? [];
  const jumlahTotal = data?.pages[0]?.meta.total;
  const emptyMessage = resolvePelangganListMessage({
    isError,
    error,
    emptyMessage: "Tidak ada pelanggan terisolir.",
  });

  const handleRequestWorkOrder = useCallback(
    (pelanggan: MobilePelanggan) => {
      router.push({
        pathname: "/(app)/request-work-order",
        params: { pelangganId: pelanggan.id, pelangganNama: pelanggan.nama },
      });
    },
    [router],
  );

  const handleLoadMore = useMuatHalamanBerikutnya({ hasNextPage, isFetchingNextPage, fetchNextPage });

  return (
    <View style={[tw`flex-1`, { paddingTop: insets.top, backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={tw`px-4 pt-4 pb-3`}>
        <Text style={tw`text-2xl font-bold text-slate-900`}>Pelanggan Isolir</Text>
        <Text style={tw`text-sm text-slate-500 mt-0.5 mb-4`}>
          {jumlahTotal !== undefined ? `${jumlahTotal} pelanggan terisolir karena tunggakan` : "Pelanggan terisolir karena tunggakan"}
        </Text>
        <View style={tw`flex-row items-center bg-white px-4 rounded-2xl border border-slate-200/70`}>
          <Search size={UKURAN_IKON_KOLOM_CARI} color={DESAIN_PREMIUM.ikonNetral} />
          <TextInput
            style={tw`flex-1 h-11 ml-3 text-slate-900 text-sm`}
            placeholder="Cari nama, username, atau ID pelanggan..."
            placeholderTextColor={WARNA_PLACEHOLDER}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity accessibilityLabel="Hapus pencarian" onPress={() => setSearch("")}>
              <X size={UKURAN_IKON_KOLOM_CARI} color={DESAIN_PREMIUM.ikonNetral} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlashList
        data={pelanggans}
        keyExtractor={(item: MobilePelanggan) => item.id}
        renderItem={({ item }: { item: MobilePelanggan }) => (
          <PelangganCard
            pelanggan={item}
            aksi={{ label: "Ajukan WO", ikon: Wrench, onTekan: () => handleRequestWorkOrder(item) }}
          />
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={AMBANG_MUAT_BERIKUTNYA}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={warna.utamaKuat} />
        }
        ListEmptyComponent={
          isFetching ? (
            <View style={tw`items-center justify-center py-20 px-8`}>
              <ActivityIndicator size="large" color={warna.utamaKuat} />
            </View>
          ) : (
            <EmptyState
              ikon={isError ? AlertTriangle : ShieldCheck}
              judul={isError ? "Gagal memuat" : search ? "Tidak ditemukan" : "Semua pelanggan aktif"}
              pesan={emptyMessage}
              aksi={isError ? { label: "Coba lagi", onTekan: () => void refetch() } : undefined}
            />
          )
        }
      />
    </View>
  );
}
