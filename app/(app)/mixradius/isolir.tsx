import {
    MixRadiusCustomer,
    MixRadiusService,
    OwnerGroup,
} from "@/services/MixRadiusService";
import { format } from "date-fns";
import { Stack } from "expo-router";
import {
    Building,
    Calendar,
    CloudOff,
    Filter,
    MapPin,
    Phone,
    Search,
    X,
    Trash2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
    ActivityIndicator,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    FlatList,
    Platform,
    Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

// Helper to safely parse dates
const safeDate = (dateString?: string): Date | null => {
  if (!dateString) return null;
  const isoString = dateString.replace(' ', 'T');
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
};

// Customer Item Component
const CustomerItem = ({ item, onDismantle }: { item: MixRadiusCustomer, onDismantle: (c: MixRadiusCustomer) => void }) => {
  const displayDate = useMemo(() => {
    try {
      const d = safeDate(item.expired_on) || safeDate(item.expiration);
      if (!d) return "-";
      return format(d, "dd MMM yyyy");
    } catch (e) {
      return "-";
    }
  }, [item.expired_on, item.expiration]);

  const username = item?.username || "Unknown";
  const name = item?.fullname || item?.name || "-";
  const address = item?.address || "Tidak ada alamat";
  const phone = item?.phonenumber || "-";
  const group = item?.group_name || item?.owner_name || "-";
  const plan = item?.plan_name || "-";

  const handlePhone = () => {
      if (phone && phone !== '-' && phone.length > 3) {
          let formattedPhone = phone.replace(/\D/g, '');
          if (formattedPhone.startsWith('0')) {
              formattedPhone = '62' + formattedPhone.substring(1);
          }
          if (formattedPhone.startsWith('8')) {
              formattedPhone = '62' + formattedPhone;
          }

          const whatsappUrl = `whatsapp://send?phone=${formattedPhone}`;
          Linking.canOpenURL(whatsappUrl).then(supported => {
              if (supported) {
                  Linking.openURL(whatsappUrl);
              } else {
                  Linking.openURL(`tel:${phone}`);
              }
          }).catch(() => {
              Linking.openURL(`tel:${phone}`);
          });
      }
  };

  const handleAddress = () => {
    if (address && address !== 'Tidak ada alamat' && address !== '-') {
        const url = Platform.select({
            ios: `maps:0,0?q=${encodeURIComponent(address)}`,
            android: `geo:0,0?q=${encodeURIComponent(address)}`
        });
        Linking.openURL(url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    }
  };

  return (
    <View
      style={{
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{username}</Text>
          <Text style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>{name}</Text>
          <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{plan}</Text>
        </View>
        <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: '#b91c1c', fontSize: 10, fontWeight: 'bold' }}>ISOLIR</Text>
        </View>
      </View>

      <View style={{ gap: 6, marginBottom: 12 }}>
        <TouchableOpacity onPress={handleAddress} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <MapPin size={14} color="#2563eb" style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 12, color: '#374151', marginLeft: 6, flex: 1, lineHeight: 18, textDecorationLine: 'underline' }}>
            {address}
            </Text>
        </TouchableOpacity>

        <TouchableOpacity
            onPress={handlePhone}
            disabled={!phone || phone === '-' || phone.length < 4}
            style={{ flexDirection: 'row', alignItems: 'center' }}
        >
            <Phone size={14} color="#16a34a" />
            <Text style={{
                fontSize: 12,
                color: (phone && phone !== '-' && phone.length > 3) ? '#16a34a' : '#6b7280',
                marginLeft: 6,
                fontWeight: (phone && phone !== '-' && phone.length > 3) ? '600' : '400'
            }}>
            {phone} (WhatsApp)
            </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Calendar size={14} color="#dc2626" />
          <Text style={{ fontSize: 12, color: '#dc2626', marginLeft: 6, fontWeight: '500' }}>Exp: {displayDate}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Building size={14} color="#9ca3af" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#4b5563', marginLeft: 4, marginRight: 12 }}>{group}</Text>

            <TouchableOpacity
              onPress={() => onDismantle(item)}
              style={{
                backgroundColor: '#fee2e2',
                padding: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#fecaca',
                marginLeft: 8
              }}
            >
              <Trash2 size={16} color="#dc2626" />
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function MixRadiusIsolirScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MixRadiusCustomer[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [hasSelected, setHasSelected] = useState(false);

  const [groups, setGroups] = useState<OwnerGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<OwnerGroup | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const result = await MixRadiusService.getOwnerGroups();
      if (Array.isArray(result)) {
        setGroups(result);
      } else if (result && typeof result === 'object' && Array.isArray((result as any).data)) {
        setGroups((result as any).data);
      } else {
        setGroups([]);
        console.warn("Invalid groups data received:", result);
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
      setGroups([]);
    }
  }, []);

  const loadData = useCallback(async (reset = false, groupOverride?: string | null, searchOverride?: string) => {
    // Prevent auto-loading via onEndReached or Refresh if no group selected
    if (groupOverride === undefined && !hasSelected) {
        setLoading(false);
        setRefreshing(false);
        return;
    }

    if (loading || (!reset && !hasMore)) return;

    setLoading(true);
    const nextPage = reset ? 0 : page + 1;

    let activeGroupId: string | undefined;
    if (groupOverride === undefined) {
        activeGroupId = selectedGroup?.id;
    } else if (groupOverride === null) {
        activeGroupId = undefined;
    } else {
        activeGroupId = groupOverride;
    }

    const activeSearch = searchOverride !== undefined ? searchOverride : search;

    try {
      console.log(`[Isolir] Fetching data: page=${nextPage}, search="${activeSearch}", group=${activeGroupId}`);
      const result = await MixRadiusService.getIsolirCustomers(
        activeSearch,
        nextPage,
        20,
        undefined,
        activeGroupId
      );

      const count = result.data?.length || 0;
      const filteredTotal = result.recordsFiltered !== undefined ? result.recordsFiltered : (result.recordsTotal || 0);

      console.log(`[Isolir] Received ${count} records. Filtered Total: ${filteredTotal}`);

      if (reset) {
        setData(result.data || []);
      } else {
        const newItems = (result.data || []).filter((newItem: MixRadiusCustomer) =>
          !data.some(existingItem => existingItem.username === newItem.username)
        );
        setData((prev) => [...prev, ...newItems]);
      }

      setTotalCount(filteredTotal);
      setPage(nextPage);
      setHasMore(count === 20 && (data.length + count < filteredTotal));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, hasMore, page, search, selectedGroup, data]);

  useEffect(() => {
    loadGroups();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const handleSelectGroup = useCallback((group: OwnerGroup | null) => {
    setSelectedGroup(group);
    setHasSelected(true);
    setShowGroupModal(false);
    const groupIdToFetch = group ? group.id : null;
    setTimeout(() => loadData(true, groupIdToFetch), 0);
  }, [loadData]);

  const handleDismantle = useCallback((customer: MixRadiusCustomer) => {
    Alert.alert(
      "Konfirmasi Bongkar",
      `Apakah Anda yakin ingin membuat Work Order (SPK) untuk membongkar perangkat pelanggan ${customer.username}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Buat WO",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await MixRadiusService.requestDismantle(
                customer.id,
                "Isolir/Tunggakan",
                "Request otomatis dari Aplikasi Mobile (Menu Isolir)"
              );
              Alert.alert("Sukses", "Work Order Dismantle berhasil dibuat!");
              loadData(true); // Refresh list
            } catch (err: any) {
              console.error(err);
              Alert.alert("Gagal", err.message || "Gagal membuat Work Order.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [loadData]);

  const ListHeader = useMemo(() => (
    <View style={tw`p-4 pb-2`}>
      <View style={tw`flex-row items-center bg-white rounded-xl px-4 py-1 border border-gray-200 shadow-sm mb-3`}>
        <Search size={18} color="#9ca3af" />
        <TextInput
          style={tw`flex-1 h-10 ml-2 text-gray-900`}
          placeholder="Cari username atau nama..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadData(true, undefined, search)}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => {
            setSearch("");
            loadData(true, undefined, "");
          }}>
            <X size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <View style={tw`flex-row justify-between items-center mb-4`}>
        <TouchableOpacity
          onPress={() => setShowGroupModal(true)}
          style={tw`flex-row items-center bg-blue-50 px-3 py-2 rounded-lg border border-blue-100`}
        >
          <Filter size={14} color="#2563eb" />
          <Text style={tw`text-blue-700 text-xs font-bold ml-2`}>
            {selectedGroup ? selectedGroup.name : (hasSelected ? "Semua Site" : "Pilih Site")}
          </Text>
        </TouchableOpacity>
        <Text style={tw`text-gray-500 text-xs font-medium`}>
          Total: <Text style={tw`text-gray-900 font-bold`}>{totalCount} ({data.length})</Text>
        </Text>
      </View>
    </View>
  ), [search, selectedGroup, totalCount, data.length, loadData]);

  return (
    <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={data}
        renderItem={({ item }) => <CustomerItem item={item} onDismantle={handleDismantle} />}
        keyExtractor={(item, index) => `${item.username}-${index}`}
        ListHeaderComponent={ListHeader}
        onEndReached={() => {
            if (!loading && hasMore) {
                loadData(false);
            }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
        contentContainerStyle={tw`pb-20`}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        style={tw`flex-1`}
        ListEmptyComponent={
          !loading ? (
            <View style={tw`items-center justify-center py-20`}>
              <CloudOff size={48} color="#d1d5db" />
              <Text style={tw`text-gray-400 mt-4`}>
                {!hasSelected ? "Pilih Site / Group terlebih dahulu" : "Tidak ada pelanggan ditemukan"}
              </Text>
              {!hasSelected && (
                <TouchableOpacity
                  onPress={() => setShowGroupModal(true)}
                  style={tw`mt-4 bg-blue-600 px-6 py-2 rounded-full`}
                >
                  <Text style={tw`text-white font-bold`}>Pilih Site</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        ListFooterComponent={
          loading && !refreshing ? (
            <View style={tw`py-4`}><ActivityIndicator color="#2563eb" /></View>
          ) : null
        }
      />

      {/* Group Selector Modal */}
      <Modal visible={showGroupModal} transparent animationType="slide">
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl h-[70%]`}>
            <View style={tw`flex-row justify-between items-center p-4 border-b border-gray-100`}>
              <Text style={tw`text-lg font-bold text-gray-900`}>Pilih Site / Group</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}><X size={24} color="#374151" /></TouchableOpacity>
            </View>
            <ScrollView>
              {Array.isArray(groups) && groups.map((group) => (
                <TouchableOpacity key={group.id} onPress={() => handleSelectGroup(group)} style={tw`p-4 border-b border-gray-50 flex-row justify-between items-center`}>
                  <Text style={tw`${selectedGroup?.id === group.id ? "text-blue-600 font-bold" : "text-gray-700"}`}>{group.name}</Text>
                  {selectedGroup?.id === group.id && <View style={tw`w-2 h-2 rounded-full bg-blue-600`} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
