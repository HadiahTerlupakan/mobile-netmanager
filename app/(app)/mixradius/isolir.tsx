import {
    MixRadiusCustomer,
    MixRadiusCustomerDetail,
    MixRadiusService,
    OwnerGroup,
} from "@/services/MixRadiusService";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Stack, useRouter } from "expo-router";
import {
    Building,
    Calendar,
    CloudOff,
    Filter,
    MapPin,
    Phone,
    Receipt,
    Search,
    User,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

export default function MixRadiusIsolirScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MixRadiusCustomer[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Site (Group) Filter States
  const [groups, setGroups] = useState<OwnerGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<OwnerGroup | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [hasSelectedGroup, setHasSelectedGroup] = useState(false);

  // Customer Detail Modal States
  const [selectedCustomer, setSelectedCustomer] =
    useState<MixRadiusCustomer | null>(null);
  const [customerDetail, setCustomerDetail] =
    useState<MixRadiusCustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    // Fetch groups on mount
    MixRadiusService.getOwnerGroups().then(setGroups).catch(console.error);
  }, []);

  const fetchData = useCallback(
    async (
      isRefresh = false,
      searchQuery = search,
      groupFilter = selectedGroup,
    ) => {
      // Logic change: If no selection has been made (and not "All Sites" explicit selection), don't fetch
      // We interpret "hasSelectedGroup" as user has interacted with selection.
      if (!hasSelectedGroup && !searchQuery) return;

      if (loading) return;

      try {
        setLoading(true);
        setError(null);

        const currentPage = isRefresh ? 0 : page;
        // Pass groupId if a group is selected
        const groupId = groupFilter ? groupFilter.id : undefined;

        const response = await MixRadiusService.getIsolirCustomers(
          searchQuery,
          currentPage,
          pageSize,
          undefined, // ownerName (legacy)
          groupId, // groupId
        );

        if (isRefresh) {
          setData(response.data);
          setTotalCount(response.recordsFiltered || 0);
        } else {
          setData((prev) => [...prev, ...response.data]);
        }

        setHasMore(response.data.length === pageSize);

        if (!isRefresh) {
          setPage((prev) => prev + 1);
        } else {
          setPage(1); // Next page
        }
      } catch (err: any) {
        console.error("Error fetching isolir data:", err);
        setError("Gagal memuat data pelanggan");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, loading, search, selectedGroup, hasSelectedGroup],
  );

  // Trigger fetch when hasSelectedGroup becomes true or search changes
  useEffect(() => {
    if (hasSelectedGroup || search) {
      fetchData(true, search, selectedGroup);
    }
  }, [selectedGroup, hasSelectedGroup]);

  const onRefresh = () => {
    if (!hasSelectedGroup && !search) return;
    setRefreshing(true);
    fetchData(true);
  };

  const onEndReached = () => {
    if (hasMore && !loading && (hasSelectedGroup || search)) {
      fetchData(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
  };

  const onSubmitSearch = () => {
    if (!selectedGroup) {
      Alert.alert(
        "Pilih Site",
        "Mohon pilih site terlebih dahulu sebelum mencari.",
      );
      return;
    }
    setHasSelectedGroup(true);
    fetchData(true, search);
  };

  const handleOpenWhatsApp = (phone?: string) => {
    if (!phone) return;
    let formatted = phone.replace(/\D/g, ""); // Remove non-digits
    if (formatted.startsWith("0")) {
      formatted = "62" + formatted.substring(1);
    }
    const url = `whatsapp://send?phone=${formatted}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "WhatsApp tidak terinstall");
      }
    });
  };

  const handleOpenMaps = (address?: string) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: idLocale });
    } catch (e) {
      return dateStr;
    }
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    try {
      return new Date(dateStr) < new Date();
    } catch (e) {
      return false;
    }
  };

  const handleOpenDetail = async (customer: MixRadiusCustomer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
    setLoadingDetail(true);
    setCustomerDetail(null);

    try {
      const detail = await MixRadiusService.getCustomerDetail(customer.id);
      setCustomerDetail(detail);
    } catch (error) {
      console.error("Failed to fetch customer detail:", error);
      Alert.alert("Error", "Gagal memuat detail pelanggan");
    } finally {
      setLoadingDetail(false);
    }
  };

  const renderItem = ({ item }: { item: MixRadiusCustomer }) => {
    const expired = isExpired(item.expired_on);

    return (
      <TouchableOpacity
        style={tw`bg-white p-4 mb-3 rounded-xl border border-gray-100 shadow-sm`}
        onPress={() => handleOpenDetail(item)}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row justify-between items-start mb-2`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-xs font-mono text-gray-500 mb-1`}>
              {item.member_id}
            </Text>
            <Text style={tw`text-base font-bold text-gray-900`}>
              {item.fullname}
            </Text>
          </View>
          <View
            style={tw`bg-red-50 px-2 py-1 rounded-full border border-red-100`}
          >
            <Text style={tw`text-xs text-red-700 font-medium`}>Isolir</Text>
          </View>
        </View>

        <TouchableOpacity
          style={tw`flex-row items-center mb-1 active:bg-green-50 rounded-lg p-1 -ml-1`}
          onPress={(e) => {
            e.stopPropagation();
            handleOpenWhatsApp(item.phonenumber);
          }}
        >
          <Phone size={14} style={tw`text-green-600 mr-2`} />
          <Text
            style={tw`text-sm text-green-700 font-mono font-medium underline`}
          >
            {item.phonenumber || "-"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`flex-row items-center mb-1 active:bg-blue-50 rounded-lg p-1 -ml-1`}
          onPress={(e) => {
            e.stopPropagation();
            handleOpenMaps(item.address);
          }}
        >
          <MapPin size={14} style={tw`text-blue-500 mr-2`} />
          <Text
            style={tw`text-sm text-blue-600 flex-1 underline`}
            numberOfLines={2}
          >
            {item.address || "-"}
          </Text>
        </TouchableOpacity>

        <View style={tw`flex-row items-center mb-1`}>
          <Calendar size={14} style={tw`text-gray-400 mr-2`} />
          <Text
            style={tw`text-sm ${expired ? "text-red-600 font-bold" : "text-gray-600"}`}
          >
            Jatuh Tempo: {formatDateStr(item.expired_on)}
          </Text>
        </View>

        <View
          style={tw`flex-row items-center justify-between mt-2 pt-2 border-t border-gray-50`}
        >
          {item.owner_name ? (
            <View style={tw`flex-row items-center`}>
              <User size={14} style={tw`text-gray-400 mr-2`} />
              <Text style={tw`text-xs text-gray-500`}>
                Owner: {item.owner_name}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <View
            style={tw`flex-row items-center bg-blue-50 px-2 py-1 rounded-lg`}
          >
            <Receipt size={12} style={tw`text-blue-600 mr-1`} />
            <Text style={tw`text-xs text-blue-600 font-medium`}>
              Lihat Riwayat
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Custom Header Area with Safe Area Padding */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderBottomColor: "#f3f4f6",
        }}
      >
        {selectedGroup && (
          <View style={tw`px-4 pt-3 bg-white`}>
            <View
              style={tw`flex-row items-center justify-between bg-blue-50 px-3 py-2 rounded-lg border border-blue-100`}
            >
              <View>
                <Text style={tw`text-sm text-blue-800`}>
                  Filter Site:{" "}
                  <Text style={tw`font-bold`}>{selectedGroup.name}</Text>
                </Text>
                <Text style={tw`text-xs text-blue-600 mt-1`}>
                  Total Isolir: <Text style={tw`font-bold`}>{totalCount}</Text>{" "}
                  Pelanggan
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedGroup(null);
                  setHasSelectedGroup(false);
                  setData([]); // Clear data
                  setTotalCount(0);
                  setShowGroupModal(false);
                }}
              >
                <X size={16} color="#1e40af" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Removed "Total Isolir (Semua Site)" view since it's disabled */}
        {false && !selectedGroup && hasSelectedGroup && (
          <View style={tw`px-4 pt-3 bg-white`}>
            <View
              style={tw`flex-row items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100`}
            >
              <Text style={tw`text-sm text-gray-600`}>
                Total Isolir (Semua Site):{" "}
                <Text style={tw`font-bold text-gray-900`}>{totalCount}</Text>
              </Text>
            </View>
          </View>
        )}

        <View style={tw`px-4 py-3 bg-white`}>
          <View style={tw`flex-row items-center gap-2`}>
            <View
              style={tw`flex-1 flex-row items-center bg-gray-100 rounded-lg px-3 py-2`}
            >
              <Search size={20} style={tw`text-gray-400 mr-2`} />
              <TextInput
                style={tw`flex-1 text-gray-900 py-1`}
                placeholder="Cari nama, ID, atau telepon"
                value={search}
                onChangeText={handleSearch}
                onSubmitEditing={onSubmitSearch}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity
              onPress={() => setShowGroupModal(true)}
              style={tw`bg-gray-100 p-2.5 rounded-lg active:bg-gray-200 relative`}
            >
              <Filter size={20} color={selectedGroup ? "#2563eb" : "#6b7280"} />
              {selectedGroup && (
                <View
                  style={tw`absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border border-white`}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={[tw`p-4`, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator size="small" color="#3b82f6" style={tw`py-4`} />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            !hasSelectedGroup && !search ? (
              <View style={tw`items-center justify-center py-10 opacity-60`}>
                <Building size={64} style={tw`text-gray-300 mb-4`} />
                <Text
                  style={tw`text-gray-600 text-center text-lg font-bold mb-2`}
                >
                  Pilih Site Terlebih Dahulu
                </Text>
                <Text style={tw`text-gray-500 text-center px-8`}>
                  Silakan tekan tombol filter di kanan atas untuk memilih
                  site/grup dan menampilkan data pelanggan.
                </Text>
                <TouchableOpacity
                  style={tw`mt-6 bg-blue-600 px-6 py-3 rounded-full`}
                  onPress={() => setShowGroupModal(true)}
                >
                  <Text style={tw`text-white font-bold`}>Pilih Site</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={tw`items-center justify-center py-10`}>
                <CloudOff size={48} style={tw`text-gray-300 mb-3`} />
                <Text style={tw`text-gray-500 text-center`}>
                  Tidak ada data pelanggan isolir
                </Text>
              </View>
            )
          ) : null
        }
      />

      {/* Group Filter Modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupModal(false)}
        statusBarTranslucent
      >
        <View style={tw`flex-1 justify-end bg-black/50`}>
          <TouchableOpacity
            style={tw`absolute inset-0`}
            activeOpacity={1}
            onPress={() => setShowGroupModal(false)}
          />
          <View
            style={[
              tw`bg-white rounded-t-2xl max-h-[70%]`,
              { paddingBottom: insets.bottom },
            ]}
          >
            <View
              style={tw`flex-row justify-between items-center p-4 border-b border-gray-100`}
            >
              <Text style={tw`text-lg font-bold text-gray-900`}>
                Pilih Site (Grup Owner)
              </Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={tw`p-4`}>
              {groups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={tw`py-3 border-b border-gray-50 ${selectedGroup?.id === group.id ? "bg-blue-50 rounded-lg px-2" : ""}`}
                  onPress={() => {
                    setSelectedGroup(group);
                    setHasSelectedGroup(true);
                    setShowGroupModal(false);
                  }}
                >
                  <Text
                    style={tw`text-base ${selectedGroup?.id === group.id ? "text-blue-600 font-bold" : "text-gray-700"}`}
                  >
                    {group.name}
                  </Text>
                  <Text style={tw`text-xs text-gray-400 mt-0.5`}>
                    {group.owners.length} owners
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={tw`h-8`} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer Detail Modal with Invoice History */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
        statusBarTranslucent
      >
        <View style={tw`flex-1 justify-end bg-black/50`}>
          <TouchableOpacity
            style={tw`absolute inset-0`}
            activeOpacity={1}
            onPress={() => setShowDetailModal(false)}
          />
          <View
            style={[
              tw`bg-white rounded-t-2xl max-h-[85%]`,
              { paddingBottom: insets.bottom },
            ]}
          >
            <View
              style={tw`flex-row justify-between items-center p-4 border-b border-gray-100`}
            >
              <View style={tw`flex-1`}>
                <Text style={tw`text-lg font-bold text-gray-900`}>
                  {selectedCustomer?.fullname || "Detail Pelanggan"}
                </Text>
                <Text style={tw`text-xs text-gray-500 font-mono`}>
                  {selectedCustomer?.member_id}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {loadingDetail ? (
              <View style={tw`p-8 items-center justify-center`}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={tw`text-gray-500 mt-3`}>
                  Memuat riwayat tagihan...
                </Text>
              </View>
            ) : customerDetail ? (
              <ScrollView style={tw`p-4`}>
                {/* Summary Card */}
                <View
                  style={tw`bg-gradient-to-r from-blue-500 to-blue-600 bg-blue-600 p-4 rounded-xl mb-4`}
                >
                  <View style={tw`flex-row items-center justify-between`}>
                    <View>
                      <Text style={tw`text-white/80 text-sm`}>
                        Total Langganan
                      </Text>
                      <Text style={tw`text-white text-3xl font-bold`}>
                        {customerDetail.invoices?.length || 0}
                      </Text>
                      <Text style={tw`text-white/80 text-sm`}>
                        Kali Pembayaran
                      </Text>
                    </View>
                    <View style={tw`bg-white/20 p-3 rounded-full`}>
                      <Receipt size={32} color="white" />
                    </View>
                  </View>
                </View>

                {/* Customer Info */}
                <View style={tw`bg-gray-50 p-3 rounded-xl mb-4`}>
                  <View style={tw`flex-row justify-between mb-2`}>
                    <Text style={tw`text-gray-500 text-sm`}>Paket</Text>
                    <Text style={tw`text-gray-900 font-medium text-sm`}>
                      {customerDetail.plan_name || "-"}
                    </Text>
                  </View>
                  <View style={tw`flex-row justify-between mb-2`}>
                    <Text style={tw`text-gray-500 text-sm`}>Tipe Bayar</Text>
                    <Text style={tw`text-gray-900 font-medium text-sm`}>
                      {customerDetail.payment_type || "-"}
                    </Text>
                  </View>
                  <View style={tw`flex-row justify-between`}>
                    <Text style={tw`text-gray-500 text-sm`}>Jatuh Tempo</Text>
                    <Text style={tw`text-red-600 font-bold text-sm`}>
                      {formatDateStr(customerDetail.expired_on)}
                    </Text>
                  </View>
                </View>

                {/* Invoice History */}
                <Text style={tw`text-base font-bold text-gray-900 mb-3`}>
                  Riwayat Tagihan
                </Text>

                {customerDetail.invoices &&
                customerDetail.invoices.length > 0 ? (
                  customerDetail.invoices.map((invoice, index) => (
                    <View
                      key={invoice.id || index}
                      style={tw`bg-white border border-gray-100 p-3 rounded-xl mb-2`}
                    >
                      <View
                        style={tw`flex-row justify-between items-start mb-2`}
                      >
                        <View style={tw`flex-1`}>
                          <Text style={tw`text-xs text-gray-500 font-mono`}>
                            {invoice.invoice_number}
                          </Text>
                          <Text style={tw`text-sm font-medium text-gray-900`}>
                            {invoice.plan_name}
                          </Text>
                        </View>
                        <View
                          style={tw`${invoice.status?.toLowerCase().includes("unpaid") || invoice.status?.toLowerCase().includes("belum") ? "bg-red-100" : invoice.status?.toLowerCase().includes("paid") || invoice.status?.toLowerCase().includes("lunas") ? "bg-green-100" : "bg-yellow-100"} px-2 py-1 rounded-full`}
                        >
                          <Text
                            style={tw`text-xs ${invoice.status?.toLowerCase().includes("unpaid") || invoice.status?.toLowerCase().includes("belum") ? "text-red-700" : invoice.status?.toLowerCase().includes("paid") || invoice.status?.toLowerCase().includes("lunas") ? "text-green-700" : "text-yellow-700"} font-medium uppercase`}
                          >
                            {invoice.status || "Unknown"}
                          </Text>
                        </View>
                      </View>
                      <View style={tw`flex-row justify-between`}>
                        <Text style={tw`text-sm text-gray-600`}>
                          {invoice.activation_date} - {invoice.deadline_date}
                        </Text>
                        <Text style={tw`text-sm font-bold text-blue-600`}>
                          {invoice.amount}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={tw`bg-gray-50 p-4 rounded-xl items-center`}>
                    <Receipt size={32} style={tw`text-gray-300 mb-2`} />
                    <Text style={tw`text-gray-500 text-center`}>
                      Tidak ada riwayat tagihan
                    </Text>
                  </View>
                )}

                <View style={tw`h-8`} />
              </ScrollView>
            ) : (
              <View style={tw`p-8 items-center justify-center`}>
                <Text style={tw`text-gray-500`}>Gagal memuat data</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
