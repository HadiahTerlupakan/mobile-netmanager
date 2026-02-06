import LoadingModal from "@/components/molecules/LoadingModal";
import { useAuth } from "@/context/AuthContext";
import {
    useOfflineMutationCompat as useOfflineMutation,
    useOfflineQueryCompat as useOfflineQuery,
} from "@/hooks/queries";
import api from "@/services/api"; // Use centralized API
import { WorkOrderMaterialBatchSchema, validateData } from "@/utils/validation";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    AlertCircle,
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
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    Alert,
    Modal,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

interface Barang {
  id: string;
  kode: string;
  nama: string;
  satuan: string;
  stokBaru: number;
  stokBekas: number;
  stokRusak: number;
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

interface UsedMaterial {
  barangId: string;
  gudangId: string;
  jumlah: number;
  kondisi?: "BARU" | "BEKAS" | "RUSAK";
  name?: string;
  nama?: string;
  satuan?: string;
}

// Memoized List Item
const BarangItem = React.memo(({ item, onAdd }: { item: Barang, onAdd: (barang: Barang, kondisi: "BARU" | "BEKAS" | "RUSAK") => void }) => {
  const hasStock = item.stokBaru > 0 || item.stokBekas > 0 || item.stokRusak > 0;
  
  return (
    <View style={tw`bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-3`}>
      <View style={tw`mb-3`}>
        <Text style={tw`text-xs text-gray-400 font-mono mb-0.5`}>{item.kode}</Text>
        <Text style={tw`font-semibold text-gray-900 text-base`}>{item.nama}</Text>
        <Text style={tw`text-xs text-gray-500`}>{item.satuan}</Text>
      </View>

      {!hasStock ? (
        <Text style={tw`text-xs text-red-500 font-medium text-center py-2 bg-red-50 rounded-lg`}>Stok Kosong</Text>
      ) : (
        <View style={tw`flex-row gap-2`}>
          <TouchableOpacity
            onPress={() => onAdd(item, "BARU")}
            disabled={item.stokBaru <= 0}
            style={tw`flex-1 py-2 rounded-lg items-center ${item.stokBaru > 0 ? "bg-green-50" : "bg-gray-50 opacity-50"}`}
          >
            <Text style={tw`text-[10px] font-bold text-green-700`}>BARU</Text>
            <Text style={tw`text-xs text-green-800`}>{item.stokBaru}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onAdd(item, "BEKAS")}
            disabled={item.stokBekas <= 0}
            style={tw`flex-1 py-2 rounded-lg items-center ${item.stokBekas > 0 ? "bg-yellow-50" : "bg-gray-50 opacity-50"}`}
          >
            <Text style={tw`text-[10px] font-bold text-yellow-700`}>BEKAS</Text>
            <Text style={tw`text-xs text-yellow-800`}>{item.stokBekas}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onAdd(item, "RUSAK")}
            disabled={item.stokRusak <= 0}
            style={tw`flex-1 py-2 rounded-lg items-center ${item.stokRusak > 0 ? "bg-red-50" : "bg-gray-50 opacity-50"}`}
          >
            <Text style={tw`text-[10px] font-bold text-red-700`}>RUSAK</Text>
            <Text style={tw`text-xs text-red-800`}>{item.stokRusak}</Text>
          </TouchableOpacity>
        </View>
      )}
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

export default function AmbilBarangScreen() {
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
  const [initialQuantities, setInitialQuantities] = useState<Record<string, number>>({});
  const [woDataLoaded, setWoDataLoaded] = useState(false);

  const { data: gudangData } = useOfflineQuery({
    key: `gudang_list_wo_${workOrderId}`,
    fetcher: async () => {
      const res = await api.get(`/api/mobile/inventory/gudang?workOrderId=${workOrderId}`);
      return res.data;
    },
    enabled: !!token && !!workOrderId,
  });

  const { data: woData } = useOfflineQuery({
    key: `work_order_${workOrderId}`,
    fetcher: async () => {
      const res = await api.get(`/api/mobile/work-orders/${workOrderId}`);
      return res.data?.data;
    },
    enabled: !!token && !!workOrderId,
  });

  const { data: barangData, isLoading: loadingBarangNet, refetch: refetchBarang } = useOfflineQuery({
    key: `barang_list_${selectedGudang}`,
    fetcher: async () => {
      const res = await api.get(`/api/mobile/inventory/barang?gudangId=${selectedGudang}`);
      return res.data;
    },
    enabled: !!token && !!selectedGudang,
  });

  const { mutate } = useOfflineMutation();

  useEffect(() => {
    if (gudangData?.gudangList) {
      setGudangs(gudangData.gudangList);
      if (!selectedGudang && gudangData.gudangList.length > 0) {
        setSelectedGudang(gudangData.gudangList[0].id);
      }
    }
  }, [gudangData, selectedGudang]);

  useEffect(() => {
    if (woData && woData.usedMaterials && !woDataLoaded) {
      const existing: SelectedItem[] = [];
      const initials: Record<string, number> = {};
      (woData.usedMaterials as UsedMaterial[]).forEach((m) => {
        if (m.barangId && m.gudangId) {
          const key = `${m.barangId}-${m.kondisi || "BARU"}`;
          initials[key] = (initials[key] || 0) + m.jumlah;
          const idx = existing.findIndex((e) => e.barangId === m.barangId && e.kondisi === (m.kondisi || "BARU"));
          if (idx >= 0) existing[idx].jumlah += m.jumlah;
          else {
            existing.push({
              barangId: m.barangId, gudangId: m.gudangId, jumlah: m.jumlah, kondisi: m.kondisi || "BARU",
              barang: { id: m.barangId, nama: m.name || m.nama || "Item", satuan: m.satuan || "pcs", kode: "EXISTING", stokBaru: 999, stokBekas: 999, stokRusak: 999, isWorkOrderMaterial: true }
            });
          }
        }
      });
      if (existing.length > 0) {
        setSelectedItems(existing);
        setInitialQuantities(initials);
        if (existing[0].gudangId) setSelectedGudang(existing[0].gudangId);
      }
      setWoDataLoaded(true);
    }
  }, [woData, woDataLoaded]);

  useEffect(() => {
    if (barangData?.barangList) setBarangs(barangData.barangList);
  }, [barangData]);

  const addItem = useCallback((barang: Barang, kondisi: "BARU" | "BEKAS" | "RUSAK") => {
    const stok = kondisi === "BARU" ? barang.stokBaru : kondisi === "BEKAS" ? barang.stokBekas : barang.stokRusak;
    setSelectedItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.barangId === barang.id && i.kondisi === kondisi);
      if (existingIdx >= 0) {
        if (prev[existingIdx].jumlah < stok) {
          const newItems = [...prev];
          newItems[existingIdx].jumlah += 1;
          return newItems;
        }
        Alert.alert("Stok Habis", `Maksimal stok tersedia: ${stok}`);
        return prev;
      }
      if (stok > 0) return [...prev, { barangId: barang.id, barang, gudangId: selectedGudang, jumlah: 1, kondisi }];
      return prev;
    });
  }, [selectedGudang]);

  const updateQuantity = useCallback((idx: number, delta: number) => {
    setSelectedItems((prev) => {
      const item = prev[idx];
      const stok = item.kondisi === "BARU" ? item.barang.stokBaru : item.kondisi === "BEKAS" ? item.barang.stokBekas : item.barang.stokRusak;
      const newQty = item.jumlah + delta;
      if (newQty <= 0) {
        const newItems = [...prev];
        newItems.splice(idx, 1);
        return newItems;
      }
      if (newQty > stok) {
        Alert.alert("Stok Habis", `Maksimal stok tersedia: ${stok}`);
        return prev;
      }
      const newItems = [...prev];
      newItems[idx].jumlah = newQty;
      return newItems;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedItems.length === 0) return;
    const itemsToSend = [];
    const warnings = [];
    for (const item of selectedItems) {
      const key = `${item.barangId}-${item.kondisi}`;
      const diff = item.jumlah - (initialQuantities[key] || 0);
      if (diff > 0) itemsToSend.push({ barangId: item.barangId, gudangId: item.gudangId, jumlah: diff, kondisi: item.kondisi });
      else if (diff < 0) warnings.push(`${item.barang.nama} (${diff})`);
    }
    if (warnings.length > 0) { Alert.alert("Tidak Didukung", `Pengurangan barang belum didukung.\n${warnings.join("\n")}`); return; }
    if (itemsToSend.length === 0) { Alert.alert("Info", "Tidak ada penambahan barang baru."); return; }

    const validation = validateData(WorkOrderMaterialBatchSchema, { items: itemsToSend });
    if (!validation.success) {
        Alert.alert("Data Tidak Valid", validation.error);
        return;
    }

    setSubmitting(true);
    await mutate({ items: validation.data.items }, {
      url: `/api/mobile/work-orders/${workOrderId}/materials`,
      method: "POST",
      onSuccess: (_, isOffline: boolean) => {
        setSubmitting(false);
        Alert.alert(isOffline ? "Offline" : "Berhasil", isOffline ? "Data diantrikan" : "Barang diperbarui", [
          { text: "OK", onPress: () => router.replace(`/(app)/work-order-detail/${workOrderId}`) },
        ]);
      },
      onError: (err) => {
        setSubmitting(false);
        const errorMessage = err instanceof Error ? err.message : "Gagal menyimpan";
        Alert.alert("Gagal", errorMessage);
      },
    });
  }, [selectedItems, initialQuantities, mutate, workOrderId, router]);

  const filteredBarangs = useMemo(() => {
    return barangs.filter((b) => (b.nama.toLowerCase().includes(search.toLowerCase()) || b.kode.toLowerCase().includes(search.toLowerCase())) && (showAllItems || b.isWorkOrderMaterial));
  }, [barangs, search, showAllItems]);

  const ListHeader = useMemo(() => (
    <View>
      <View style={tw`bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex-row items-center justify-between shadow-sm`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`p-2 rounded-full bg-gray-100`}><ArrowLeft size={20} color="#374151" /></TouchableOpacity>
        <Text style={tw`text-lg font-bold text-gray-900`}>Ambil Barang</Text>
        <View style={tw`w-9`} />
      </View>

      {selectedItems.length > 0 && selectedItems[0].gudangId !== selectedGudang && (
        <View style={tw`mx-4 mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex-row items-center gap-3`}><AlertCircle size={20} color="#a16207" /><Text style={tw`flex-1 text-xs text-yellow-800`}>Item terpilih dari gudang lain akan dihapus jika Anda mengganti gudang.</Text></View>
      )}

      <View style={tw`px-4 pt-4`}>
        <Text style={tw`text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide`}>Gudang Sumber</Text>
        <TouchableOpacity onPress={() => setShowGudangModal(true)} style={tw`flex-row items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-xl`}>
          <View style={tw`flex-row items-center gap-3`}>
            <View style={tw`w-8 h-8 rounded-full bg-blue-100 items-center justify-center`}><Package size={16} color="#2563eb" /></View>
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
          <TouchableOpacity onPress={() => setShowAllItems(!showAllItems)} style={tw`w-11 h-11 items-center justify-center rounded-xl border ${showAllItems ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"}`}><Filter size={20} color={showAllItems ? "#2563eb" : "#6b7280"} /></TouchableOpacity>
        </View>
      </View>

      {selectedItems.length > 0 && (
        <View style={tw`mx-4 mb-4 bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden`}>
          <View style={tw`bg-blue-50 px-4 py-3 border-b border-blue-100 flex-row justify-between items-center`}><Text style={tw`font-semibold text-blue-900`}>Keranjang ({selectedItems.length})</Text><TouchableOpacity onPress={() => setSelectedItems([])}><Text style={tw`text-xs text-red-600 font-medium`}>Hapus Semua</Text></TouchableOpacity></View>
          <View style={tw`p-2`}>{selectedItems.map((item, idx) => (<SelectedBarangItem key={`${item.barangId}-${item.kondisi}`} item={item} onUpdate={(delta) => updateQuantity(idx, delta)} />))}</View>
        </View>
      )}

      <View style={tw`px-4 mb-2`}><Text style={tw`text-xs font-semibold text-gray-500 uppercase tracking-wide`}>Daftar Barang</Text></View>
    </View>
  ), [router, selectedItems, selectedGudang, gudangs, search, showAllItems, updateQuantity]);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top"]}>
      <FlashList
        data={filteredBarangs}
        renderItem={({ item }: { item: Barang }) => <BarangItem item={item} onAdd={addItem} />}
        keyExtractor={(item: Barang) => item.id}
        estimatedItemSize={120}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={tw`pb-32`}
        refreshControl={<RefreshControl refreshing={loadingBarangNet} onRefresh={refetchBarang} tintColor="#2563eb" />}
        ListEmptyComponent={!loadingBarangNet ? (<View style={tw`py-10 items-center`}><Package size={32} color="#d1d5db" /><Text style={tw`text-sm text-gray-400 mt-2`}>Barang tidak ditemukan</Text></View>) : null}
      />

      {selectedItems.length > 0 && (
        <View style={tw`absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-2xl`}>
          <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={tw`bg-blue-600 rounded-xl py-3.5 flex-row items-center justify-center gap-2`}><Check size={20} color="white" /><Text style={tw`text-white font-bold text-base`}>Ambil Barang ({selectedItems.reduce((a, b) => a + b.jumlah, 0)})</Text></TouchableOpacity>
        </View>
      )}

      <Modal visible={showGudangModal} animationType="slide" transparent onRequestClose={() => setShowGudangModal(false)}>
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl h-[80%] overflow-hidden`}>
            <View style={tw`px-4 py-3 border-b border-gray-100 flex-row items-center justify-between bg-gray-50`}><Text style={tw`font-bold text-lg text-gray-900`}>Pilih Gudang Sumber</Text><TouchableOpacity onPress={() => setShowGudangModal(false)} style={tw`p-2 bg-gray-200 rounded-full`}><X size={20} color="#374151" /></TouchableOpacity></View>
            <View style={tw`p-4 flex-1`}>
              <View style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 h-12 mb-4`}><Search size={20} color="#9ca3af" /><TextInput style={tw`flex-1 ml-2 text-base text-gray-900`} placeholder="Cari gudang..." value={gudangSearch} onChangeText={setGudangSearch} /></View>
              <FlashList
                data={gudangs.filter((g) => g.nama.toLowerCase().includes(gudangSearch.toLowerCase()))}
                keyExtractor={(item: Gudang) => item.id}
                estimatedItemSize={70}
                renderItem={({ item }: { item: Gudang }) => (
                  <TouchableOpacity onPress={() => { if (selectedItems.length > 0 && selectedGudang !== item.id) { Alert.alert("Konfirmasi", "Ganti gudang akan menghapus item terpilih. Lanjutkan?", [{ text: "Batal", style: "cancel" }, { text: "Ya", onPress: () => { setSelectedItems([]); setSelectedGudang(item.id); setShowGudangModal(false); } }]); } else { setSelectedGudang(item.id); setShowGudangModal(false); } }} style={tw`flex-row items-center justify-between p-4 mb-2 rounded-xl border ${selectedGudang === item.id ? "bg-blue-50 border-blue-200" : "bg-white border-gray-100"}`}><View><Text style={tw`font-bold text-gray-900 ${selectedGudang === item.id ? "text-blue-700" : ""}`}>{item.nama}</Text><Text style={tw`text-xs text-gray-500 mt-0.5`}>{item.lokasi}</Text></View>{selectedGudang === item.id && <CheckCircle size={20} color="#2563eb" />}</TouchableOpacity>
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
