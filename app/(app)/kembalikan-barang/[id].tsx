import LoadingModal from "@/components/molecules/LoadingModal";
import { useAuth } from "@/context/AuthContext";
import {
  isOfflineMutationQueuedResult,
  useApiMutation,
  useApiQuery,
} from "@/hooks/queries";
import { presentAppError, presentInfoMessage, presentSuccessMessage } from "@/utils/errorPresenter";
import { WorkOrderMaterialBatchSchema, validateData } from "@/utils/validation";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronDown,
  Filter,
  Minus,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AppFeature } from '@/constants/features';

interface Barang {
  id: string;
  kode: string;
  nama: string;
  satuan: string;
  isWorkOrderMaterial: boolean;
}

interface Gudang {
  id: string;
  nama: string;
  lokasi: string;
}

interface SelectedItem {
  barangId: string;
  barang: Barang;
  gudangId: string;
  jumlah: number;
  kondisi: "BARU" | "BEKAS" | "RUSAK";
}

// Memoized List Item
const BarangItem = React.memo(({ item, onAdd }: { item: Barang, onAdd: (barang: Barang, kondisi: "BARU" | "BEKAS" | "RUSAK") => void }) => {
  return (
    <View style={tw`bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-3`}>
      <View style={tw`mb-3`}>
        <Text style={tw`text-xs text-gray-400 font-mono mb-0.5`}>{item.kode}</Text>
        <Text style={tw`font-semibold text-gray-900 text-base`}>{item.nama}</Text>
        <Text style={tw`text-xs text-gray-500`}>{item.satuan}</Text>
      </View>

      <View style={tw`flex-row gap-2`}>
        <TouchableOpacity
          onPress={() => onAdd(item, "BARU")}
          style={tw`flex-1 py-2.5 rounded-lg items-center bg-green-50 active:bg-green-100`}
        >
          <Text style={tw`text-[10px] font-bold text-green-700`}>BARU</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAdd(item, "BEKAS")}
          style={tw`flex-1 py-2.5 rounded-lg items-center bg-yellow-50 active:bg-yellow-100`}
        >
          <Text style={tw`text-[10px] font-bold text-yellow-700`}>BEKAS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAdd(item, "RUSAK")}
          style={tw`flex-1 py-2.5 rounded-lg items-center bg-red-50 active:bg-red-100`}
        >
          <Text style={tw`text-[10px] font-bold text-red-700`}>RUSAK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
BarangItem.displayName = 'BarangItem';

// Memoized Selected Item
const SelectedBarangItem = React.memo(({ item, onUpdate }: { item: SelectedItem, onUpdate: (delta: number) => void }) => {
  return (
    <View style={tw`flex-row items-center justify-between p-3 border-b border-gray-50 last:border-0`}>
      <View style={tw`flex-1`}>
        <Text style={tw`font-medium text-gray-900`} numberOfLines={1}>{item.barang.nama}</Text>
        <View style={tw`flex-row items-center gap-2 mt-1`}>
          <View style={tw`px-1.5 py-0.5 rounded ${item.kondisi === "BARU" ? "bg-green-100" : item.kondisi === "BEKAS" ? "bg-yellow-100" : "bg-red-100"}`}>
            <Text style={tw`text-[10px] font-bold ${item.kondisi === "BARU" ? "text-green-700" : item.kondisi === "BEKAS" ? "text-yellow-700" : "text-red-700"}`}>
              {item.kondisi}
            </Text>
          </View>
          <Text style={tw`text-xs text-gray-500`}>{item.barang.satuan}</Text>
        </View>
      </View>
      <View style={tw`flex-row items-center gap-3 bg-gray-50 rounded-lg p-1`}>
        <TouchableOpacity onPress={() => onUpdate(-1)} style={tw`w-7 h-7 bg-white rounded-md items-center justify-center shadow-sm`}>
          <Minus size={14} color="#374151" />
        </TouchableOpacity>
        <Text style={tw`font-bold text-gray-900 w-4 text-center`}>{item.jumlah}</Text>
        <TouchableOpacity onPress={() => onUpdate(1)} style={tw`w-7 h-7 bg-white rounded-md items-center justify-center shadow-sm`}>
          <Plus size={14} color="#374151" />
        </TouchableOpacity>
      </View>
    </View>
  );
});
SelectedBarangItem.displayName = 'SelectedBarangItem';

export default function KembalikanBarangScreen() {
  useFeatureGuard(AppFeature.BARANG);

  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workOrderId = id;
  const { token } = useAuth();

  const [gudangs, setGudangs] = useState<Gudang[]>([]);
  const [barangs, setBarangs] = useState<Barang[]>([]);
  const [selectedGudang, setSelectedGudang] = useState<string>("");
  const [showGudangModal, setShowGudangModal] = useState(false);
  const [gudangSearch, setGudangSearch] = useState("");
  const [search, setSearch] = useState("");
  const [showAllItems, setShowAllItems] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: gudangData } = useApiQuery<{ gudangList: Gudang[] }>({
    queryKey: ['gudang_list', workOrderId],
    endpoint: `/api/mobile/inventory/gudang?workOrderId=${workOrderId}`,
    enabled: !!token && !!workOrderId,
  });

  const { data: barangData, isPending: loadingBarangNet, refetch: refetchBarang } = useApiQuery<{ barangList: Barang[] }>({
    queryKey: ['barang_list', 'masuk'],
    endpoint: "/api/mobile/inventory/barang?mode=masuk",
    enabled: !!token,
  });

  const returnMutation = useApiMutation({
    endpoint: `/api/mobile/work-orders/${workOrderId}/return`,
    method: "POST",
    invalidateKeys: [['work_order', workOrderId]],
    showErrorAlert: false
  });

  useEffect(() => {
    if (gudangData?.gudangList) {
      setGudangs(gudangData.gudangList);
      if (!selectedGudang && gudangData.gudangList.length > 0) {
        setSelectedGudang(gudangData.gudangList[0].id);
      }
    }
  }, [gudangData, selectedGudang]);

  useEffect(() => {
    if (barangData?.barangList) {
      setBarangs(barangData.barangList);
    }
  }, [barangData]);

  const addItem = useCallback((barang: Barang, kondisi: "BARU" | "BEKAS" | "RUSAK") => {
    setSelectedItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.barangId === barang.id && i.kondisi === kondisi);
      if (existingIdx >= 0) {
        const newItems = [...prev];
        newItems[existingIdx].jumlah += 1;
        return newItems;
      }
      return [...prev, { barangId: barang.id, barang, gudangId: selectedGudang, jumlah: 1, kondisi }];
    });
  }, [selectedGudang]);

  const updateQuantity = useCallback((idx: number, delta: number) => {
    setSelectedItems((prev) => {
      const item = prev[idx];
      const newQty = item.jumlah + delta;
      if (newQty <= 0) {
        const newItems = [...prev];
        newItems.splice(idx, 1);
        return newItems;
      }
      const newItems = [...prev];
      newItems[idx].jumlah = newQty;
      return newItems;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedItems.length === 0 || !selectedGudang) return;

    const itemsToSend = selectedItems.map((item) => ({
      barangId: item.barangId,
      gudangId: selectedGudang,
      jumlah: item.jumlah,
      kondisi: item.kondisi,
    }));

    const validation = validateData(WorkOrderMaterialBatchSchema, { items: itemsToSend });
    if (!validation.success) {
      presentInfoMessage(validation.error, "Data Tidak Valid");
      return;
    }

    setSubmitting(true);
    returnMutation.mutate({ items: validation.data.items }, {
      onSuccess: (data) => {
        setSubmitting(false);
        const isOffline = isOfflineMutationQueuedResult(data);
        if (isOffline) {
          presentInfoMessage("Data diantrikan", "Offline");
        } else {
          presentSuccessMessage("Barang berhasil dikembalikan");
        }
        router.replace(`/(app)/work-order-detail/${workOrderId}`);
      },
      onError: (err) => {
        setSubmitting(false);
        presentAppError(err, {
          screen: 'ReturnItemScreen',
          route: '/(app)/kembalikan-barang/[id]',
        });
      },
    });
  }, [selectedItems, selectedGudang, returnMutation, workOrderId, router]);

  const filteredBarangs = useMemo(() => {
    return barangs.filter((b) => {
      const matchesSearch = b.nama.toLowerCase().includes(search.toLowerCase()) || b.kode.toLowerCase().includes(search.toLowerCase());
      const matchesType = showAllItems || b.isWorkOrderMaterial;
      return matchesSearch && matchesType;
    });
  }, [barangs, search, showAllItems]);

  const ListHeader = useMemo(() => (
    <View>
      <View style={tw`bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex-row items-center justify-between shadow-sm`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`p-2 rounded-full bg-gray-100`}><ArrowLeft size={20} color="#374151" /></TouchableOpacity>
        <View style={tw`flex-row items-center gap-2`}><ArrowDown size={18} color="#16a34a" /><Text style={tw`text-lg font-bold text-gray-900`}>Kembalikan Barang</Text></View>
        <View style={tw`w-9`} />
      </View>

      <View style={tw`mx-4 mt-4 bg-green-50 p-3 rounded-lg border border-green-200 flex-row items-center gap-3`}>
        <Package size={20} color="#16a34a" />
        <Text style={tw`flex-1 text-xs text-green-800`}>Masukkan barang yang dikembalikan dari pelanggan ke gudang. Stok gudang akan bertambah.</Text>
      </View>

      <View style={tw`px-4 pt-4`}>
        <Text style={tw`text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide`}>Gudang Tujuan</Text>
        <TouchableOpacity onPress={() => setShowGudangModal(true)} style={tw`flex-row items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-xl`}>
          <View style={tw`flex-row items-center gap-3`}>
            <View style={tw`w-8 h-8 rounded-full bg-green-100 items-center justify-center`}><Package size={16} color="#16a34a" /></View>
            <View>
              <Text style={tw`font-bold text-gray-900 text-sm`}>{selectedGudang ? gudangs.find((g) => g.id === selectedGudang)?.nama : "Pilih Gudang"}</Text>
              <Text style={tw`text-xs text-gray-500`}>{selectedGudang ? gudangs.find((g) => g.id === selectedGudang)?.lokasi || "Lokasi tidak tersedia" : "Ketuk untuk memilih"}</Text>
            </View>
          </View>
          <ChevronDown size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <View style={tw`px-4 py-4 gap-3`}>
        <View style={tw`flex-row gap-2`}>
          <View style={tw`flex-1 flex-row items-center bg-white border border-gray-200 rounded-xl px-3 h-11`}>
            <Search size={20} color="#9ca3af" />
            <TextInput style={tw`flex-1 ml-2 text-base h-10`} placeholder="Cari barang..." value={search} onChangeText={setSearch} />
          </View>
          <TouchableOpacity onPress={() => setShowAllItems(!showAllItems)} style={tw`w-11 h-11 items-center justify-center rounded-xl border ${showAllItems ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}><Filter size={20} color={showAllItems ? "#16a34a" : "#6b7280"} /></TouchableOpacity>
        </View>
      </View>

      {selectedItems.length > 0 && (
        <View style={tw`mx-4 mb-4 bg-white rounded-xl border border-green-100 shadow-sm overflow-hidden`}>
          <View style={tw`bg-green-50 px-4 py-3 border-b border-green-100 flex-row justify-between items-center`}>
            <Text style={tw`font-semibold text-green-900`}>Barang Dikembalikan ({selectedItems.length})</Text>
            <TouchableOpacity onPress={() => setSelectedItems([])}><Text style={tw`text-xs text-red-600 font-medium`}>Hapus Semua</Text></TouchableOpacity>
          </View>
          <View style={tw`p-2`}>
            {selectedItems.map((item, idx) => (
              <SelectedBarangItem key={`${item.barangId}-${item.kondisi}`} item={item} onUpdate={(delta) => updateQuantity(idx, delta)} />
            ))}
          </View>
        </View>
      )}

      <View style={tw`px-4 mb-2`}>
        <Text style={tw`text-xs font-semibold text-gray-500 uppercase tracking-wide`}>Pilih Barang</Text>
      </View>
    </View>
  ), [router, selectedGudang, gudangs, search, showAllItems, selectedItems, updateQuantity]);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top"]}>
      <View style={tw`flex-1`}>
        <FlashList
          data={filteredBarangs}
          renderItem={({ item }: { item: Barang }) => <BarangItem item={item} onAdd={addItem} />}
          keyExtractor={(item: Barang) => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={tw`pb-32`}
          refreshControl={
            <RefreshControl refreshing={loadingBarangNet} onRefresh={refetchBarang} tintColor="#16a34a" />
          }
          ListEmptyComponent={
            !loadingBarangNet ? (
              <View style={tw`py-10 items-center`}><Package size={32} color="#d1d5db" /><Text style={tw`text-sm text-gray-400 mt-2`}>Barang tidak ditemukan</Text></View>
            ) : null
          }
        />
      </View>

      {selectedItems.length > 0 && (
        <View style={tw`absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-2xl`}>
          <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={tw`bg-green-600 rounded-xl py-3.5 flex-row items-center justify-center gap-2`}>
            <Check size={20} color="white" />
            <Text style={tw`text-white font-bold text-base`}>Kembalikan Barang ({selectedItems.reduce((a, b) => a + b.jumlah, 0)})</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showGudangModal} animationType="slide" transparent={true} onRequestClose={() => setShowGudangModal(false)}>
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl h-[80%] overflow-hidden`}>
            <View style={tw`px-4 py-3 border-b border-gray-100 flex-row items-center justify-between bg-gray-50`}>
              <Text style={tw`font-bold text-lg text-gray-900`}>Pilih Gudang Tujuan</Text>
              <TouchableOpacity onPress={() => setShowGudangModal(false)} style={tw`p-2 bg-gray-200 rounded-full`}><X size={20} color="#374151" /></TouchableOpacity>
            </View>
            <View style={tw`p-4 flex-1`}>
              <View style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 h-12 mb-4`}><Search size={20} color="#9ca3af" /><TextInput style={tw`flex-1 ml-2 text-base text-gray-900`} placeholder="Cari gudang..." value={gudangSearch} onChangeText={setGudangSearch} /></View>
              <FlashList
                data={gudangs.filter((g) => g.nama.toLowerCase().includes(gudangSearch.toLowerCase()))}
                keyExtractor={(item: Gudang) => item.id}
                renderItem={({ item }: { item: Gudang }) => (
                  <TouchableOpacity onPress={() => { setSelectedGudang(item.id); setShowGudangModal(false); }} style={tw`flex-row items-center justify-between p-4 mb-2 rounded-xl border ${selectedGudang === item.id ? "bg-green-50 border-green-200" : "bg-white border-gray-100"}`}>
                    <View><Text style={tw`font-bold text-gray-900 ${selectedGudang === item.id ? "text-green-700" : ""}`}>{item.nama}</Text><Text style={tw`text-xs text-gray-500 mt-0.5`}>{item.lokasi}</Text></View>
                    {selectedGudang === item.id && <CheckCircle size={20} color="#16a34a" />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </View>
      </Modal>

      <LoadingModal visible={submitting} message="Menyimpan data..." />
    </SafeAreaView>
  );
}
