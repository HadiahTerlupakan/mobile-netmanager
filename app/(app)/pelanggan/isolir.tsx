import { FlashList } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { AlertTriangle, CloudOff, Search, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

import { PelangganCard } from "@/components/molecules/PelangganCard";
import { AppFeature } from "@/constants/features";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePelangganList } from "@/hooks/queries/usePelangganList";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { MobilePelanggan } from "@/services/PelangganService";
import { resolvePelangganListMessage } from "@/utils/pelangganListMessage";

const SEARCH_DEBOUNCE_MS = 400;

export default function PelangganIsolirScreen() {
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

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={tw`px-4 py-3`}>
        <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>Pelanggan Isolir</Text>
        <View style={tw`flex-row items-center bg-white px-3 rounded-lg border border-gray-200`}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            style={tw`flex-1 h-10 ml-2 text-gray-900`}
            placeholder="Cari nama, username, atau ID pelanggan..."
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={16} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlashList
        data={pelanggans}
        keyExtractor={(item: MobilePelanggan) => item.id}
        renderItem={({ item }: { item: MobilePelanggan }) => (
          <PelangganCard pelanggan={item} onRequestWorkOrder={handleRequestWorkOrder} />
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
        }
        ListEmptyComponent={
          isFetching ? (
            <View style={tw`items-center justify-center py-20 px-8`}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <View style={tw`items-center justify-center py-20 px-8`}>
              {isError ? <AlertTriangle size={40} color="#dc2626" /> : <CloudOff size={40} color="#d1d5db" />}
              <Text style={tw`text-gray-500 mt-4 text-center`}>{emptyMessage}</Text>
            </View>
          )
        }
      />
    </View>
  );
}
