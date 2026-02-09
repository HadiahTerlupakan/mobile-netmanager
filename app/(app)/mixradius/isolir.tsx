import { IsolirSkeleton } from "@/components/molecules/IsolirSkeleton";
import SelectionModal from "@/components/molecules/SelectionModal";
import { useApiMutation, useApiQuery } from "@/hooks/queries";
import {
    MixRadiusCustomer,
    MixRadiusService,
    OwnerGroup,
} from "@/services/MixRadiusService";
import { FlashList } from "@shopify/flash-list";
import { formatDate } from "@/utils/date";
import { Stack } from "expo-router";
import {
    AlertTriangle,
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
import React, { useCallback, useState, useMemo, memo } from "react";
import {
    ActivityIndicator,
    Linking,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
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
const CustomerItem = memo(({ item, onDismantle }: { item: MixRadiusCustomer, onDismantle: (c: MixRadiusCustomer) => void }) => {
  const displayDate = useMemo(() => {
    try {
      const d = safeDate(item.expired_on) || safeDate(item.expiration);
      if (!d) return "-";
      return formatDate(d, "dd MMM yyyy");
    } catch {
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
});
CustomerItem.displayName = 'CustomerItem';

export default function MixRadiusIsolirScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [hasSelected, setHasSelected] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<OwnerGroup | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Load Groups
  const { data: groups = [] } = useApiQuery<OwnerGroup[]>({
    queryKey: ["mixradius", "groups"],
    queryFn: async () => {
      return await MixRadiusService.getOwnerGroups();
    },
  });

  // Load Customers
  const {
    data: customerData,
    isFetching,
    refetch,
    isRefetching: refreshing,
    isError,
    error,
  } = useApiQuery<any>({
    queryKey: ["mixradius", "isolir", selectedGroup?.id, search],
    queryFn: () =>
      MixRadiusService.getIsolirCustomers(
        search,
        0,
        100, // Fetch more at once since we are using useApiQuery with caching
        undefined,
        selectedGroup?.id
      ),
    enabled: hasSelected,
    retry: false, // Don't retry on 403 permission errors
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Use isFetching for actual loading state (isPending stays true when query is disabled)
  const loading = isFetching && !refreshing;

  const data = useMemo(() => {
    if (!customerData) return [];
    if (Array.isArray(customerData)) return customerData;
    if (customerData.data && Array.isArray(customerData.data)) return customerData.data;
    return [];
  }, [customerData]);

  // Helper to get user-friendly error message
  const getErrorMessage = useMemo(() => {
    if (!error) return "Terjadi kesalahan saat mengambil data";

    // Check for Axios error with response status
    const axiosError = error as any;
    if (axiosError?.response?.status === 403) {
      return "Anda tidak memiliki akses ke fitur ini. Hubungi administrator untuk mendapatkan permission.";
    }
    if (axiosError?.response?.status === 401) {
      return "Sesi Anda telah berakhir. Silakan login kembali.";
    }
    if (axiosError?.response?.status === 404) {
      return "Integrasi MixRadius belum dikonfigurasi.";
    }
    if (axiosError?.response?.status >= 500) {
      return "Server sedang mengalami gangguan. Coba lagi nanti.";
    }

    return error.message || "Terjadi kesalahan saat mengambil data";
  }, [error]);

  const totalCount = useMemo(() => {
    if (!customerData) return 0;
    return customerData.recordsFiltered ?? customerData.recordsTotal ?? (Array.isArray(customerData) ? customerData.length : 0);
  }, [customerData]);

  // Dismantle Mutation
  const dismantleMutation = useApiMutation({
    endpoint: "/api/integrations/mixradius/dismantle",
    method: "POST",
    successMessage: "Work Order Dismantle berhasil dibuat!",
    invalidateKeys: [["mixradius", "isolir"]],
  });

  const handleSelectGroup = useCallback((group: OwnerGroup | null) => {
    setSelectedGroup(group);
    setHasSelected(true);
    setShowGroupModal(false);
  }, []);

  const handleDismantle = useCallback((customer: MixRadiusCustomer) => {
    Alert.alert(
      "Konfirmasi Bongkar",
      `Apakah Anda yakin ingin membuat Work Order (SPK) untuk membongkar perangkat pelanggan ${customer.username}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Buat WO",
          style: "destructive",
          onPress: () => {
            dismantleMutation.mutate({
              customerId: customer.id,
              reason: "Isolir/Tunggakan",
              notes: "Request otomatis dari Aplikasi Mobile (Menu Isolir)"
            });
          }
        }
      ]
    );
  }, [dismantleMutation]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const ListHeader = useMemo(() => (
    <View style={tw`p-4 pb-2`}>
      <View style={tw`flex-row items-center bg-white rounded-xl px-4 py-1 border border-gray-200 shadow-sm mb-3`}>
        <Search size={18} color="#9ca3af" />
        <TextInput
          style={tw`flex-1 h-10 ml-2 text-gray-900`}
          placeholder="Cari username atau nama..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => refetch()}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => {
            setSearch("");
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
  ), [search, selectedGroup, totalCount, data.length, hasSelected, refetch]);

  // Only show skeleton when query is enabled, actually loading, no data yet, and no error
  if (hasSelected && loading && data.length === 0 && !isError) {
    return (
      <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <IsolirSkeleton />
      </View>
    );
  }

  return (
    <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlashList
        data={data}
        renderItem={({ item }: { item: MixRadiusCustomer }) => <CustomerItem item={item} onDismantle={handleDismantle} />}
        keyExtractor={(item: MixRadiusCustomer, index: number) => `${item.username}-${index}`}
        ListHeaderComponent={ListHeader}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
        contentContainerStyle={tw`pb-20`}
        estimatedItemSize={180}
        style={tw`flex-1`}
        ListEmptyComponent={
          !loading ? (
            <View style={tw`items-center justify-center py-20`}>
              {isError ? (
                <>
                  <AlertTriangle size={48} color="#dc2626" />
                  <Text style={tw`text-red-600 mt-4 font-medium`}>Gagal memuat data</Text>
                  <Text style={tw`text-gray-400 mt-1 text-xs text-center px-8`}>
                    {getErrorMessage}
                  </Text>
                  <TouchableOpacity
                    onPress={() => refetch()}
                    style={tw`mt-4 bg-red-600 px-6 py-2 rounded-full`}
                  >
                    <Text style={tw`text-white font-bold`}>Coba Lagi</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
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
                </>
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

      <SelectionModal
        visible={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title="Pilih Site / Group"
        items={groups.map(g => ({
          id: g.id,
          label: g.name,
          value: g
        }))}
        onSelect={(item) => handleSelectGroup(item.value as OwnerGroup)}
        selectedValue={selectedGroup}
      />
    </View>
  );
}
