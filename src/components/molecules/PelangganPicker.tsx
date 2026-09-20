import { FlashList } from "@shopify/flash-list";
import { Search, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

import { PelangganPickerRow } from "@/components/molecules/PelangganPickerRow";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePelangganList } from "@/hooks/queries/usePelangganList";
import { MobilePelanggan } from "@/services/PelangganService";
import { resolvePelangganListMessage } from "@/utils/pelangganListMessage";

const SEARCH_DEBOUNCE_MS = 400;

interface PelangganPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (pelanggan: MobilePelanggan) => void;
}

/** Modal pencarian pelanggan terdaftar untuk ditautkan ke work order. */
export function PelangganPicker({ visible, onClose, onSelect }: PelangganPickerProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  // Tanpa filter status: pelanggan aktif maupun isolir boleh dipilih.
  // Backend sudah mengecualikan DISMANTLE.
  const { data, fetchNextPage, hasNextPage, isFetching, isError, error } = usePelangganList({
    search: debouncedSearch,
  });
  const pelanggans = data?.pages.flatMap((page) => page.data) ?? [];
  const emptyMessage = resolvePelangganListMessage({
    isError,
    error,
    emptyMessage: "Pelanggan tidak ditemukan",
  });

  const handleSelect = useCallback(
    (pelanggan: MobilePelanggan) => {
      onSelect(pelanggan);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetching) fetchNextPage();
  }, [hasNextPage, isFetching, fetchNextPage]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={tw`flex-1 bg-white pt-12 px-4`}>
        <View style={tw`flex-row items-center mb-4`}>
          <Text style={tw`flex-1 text-lg font-bold text-gray-900`}>Pilih Pelanggan</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <View style={tw`flex-row items-center bg-gray-50 px-3 rounded-lg border border-gray-200 mb-3`}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            style={tw`flex-1 h-10 ml-2 text-gray-900`}
            placeholder="Cari pelanggan terdaftar..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <FlashList
          data={pelanggans}
          keyExtractor={(item: MobilePelanggan) => item.id}
          renderItem={({ item }: { item: MobilePelanggan }) => (
            <PelangganPickerRow pelanggan={item} onPress={handleSelect} />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            isFetching ? (
              <View style={tw`items-center justify-center py-10`}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : (
              <Text style={tw`text-gray-400 text-center py-10`}>{emptyMessage}</Text>
            )
          }
        />
      </View>
    </Modal>
  );
}
