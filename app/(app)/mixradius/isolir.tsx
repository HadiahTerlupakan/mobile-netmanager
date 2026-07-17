import { IsolirSkeleton } from "@/components/molecules/IsolirSkeleton";
import LoadingModal from "@/components/molecules/LoadingModal";
import SelectionModal from "@/components/molecules/SelectionModal";
import { AppFeature } from "@/constants/features";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useApiQuery, useCreateWorkOrderRequest, useInfiniteQuery } from "@/hooks/queries";
import type { MixRadiusResponse } from "@/services/MixRadiusService";
import {
  MixRadiusCustomer,
  MixRadiusService,
  OwnerGroup,
} from "@/services/MixRadiusService";
import { formatDate } from "@/utils/date";
import { getUserFriendlyError } from "@/utils/errorHandling";
import { presentAppError } from "@/utils/errorPresenter";
import { isValidPhone, openMaps, openWhatsApp } from "@/utils/phone";
import { FlashList } from "@shopify/flash-list";
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
  Trash2,
  X,
} from "lucide-react-native";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 400;
const STALE_TIME_MS = 5 * 60 * 1000;

type TabKey = "isolir" | "disabled";

const TABS: { key: TabKey; label: string; authStatus: string }[] = [
  { key: "isolir", label: "Isolir", authStatus: "Isolir" },
  { key: "disabled", label: "Disabled", authStatus: "Disabled-Users" },
];

const safeDate = (dateString?: string): Date | null => {
  if (!dateString) return null;
  const isoString = dateString.replace(" ", "T");
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
};

const DISMANTLE_REASONS = [
  { id: "isolir-tunggakan", label: "Isolir / Tunggakan", value: "Isolir/Tunggakan" },
  { id: "pindah-alamat", label: "Pindah Alamat", value: "Pindah Alamat" },
  { id: "tidak-puas", label: "Tidak Puas Layanan", value: "Tidak Puas Layanan" },
  { id: "biaya-mahal", label: "Biaya Terlalu Mahal", value: "Biaya Terlalu Mahal" },
  { id: "lainnya", label: "Lainnya", value: "Lainnya" },
] as const;

type DismantleReason = (typeof DISMANTLE_REASONS)[number];

function buildDismantleDescription(customer: MixRadiusCustomer, reason: string) {
  return (
    `Permintaan pembongkaran perangkat (dismantle) untuk pelanggan MixRadius.\n\n` +
    `Alasan: ${reason}\n` +
    `Catatan: Request otomatis dari Aplikasi Mobile (Menu Isolir)\n\n` +
    `Data MixRadius:\n` +
    `- Member ID: ${customer.member_id}\n` +
    `- Paket: ${customer.plan_name}\n` +
    `- Alamat: ${customer.address}`
  );
}

function buildDismantleConfirmationMessage(customer: MixRadiusCustomer, reason: string) {
  return `Apakah Anda yakin ingin membuat Work Order (SPK) untuk membongkar perangkat pelanggan ${customer.username}?\n\nAlasan: ${reason}`;
}

const CustomerItem = memo(({
  item,
  onDismantle,
  activeTab,
}: {
  item: MixRadiusCustomer;
  onDismantle: (c: MixRadiusCustomer) => void;
  activeTab: TabKey;
}) => {
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
  const hasValidAddress = address !== "Tidak ada alamat" && address !== "-";
  const hasValidPhone = isValidPhone(item?.phonenumber);

  const handlePhone = () => {
    if (hasValidPhone) openWhatsApp(item.phonenumber);
  };

  const handleAddress = () => {
    if (hasValidAddress) openMaps(address);
  };

  const badge =
    activeTab === "disabled"
      ? { bg: "bg-gray-100", text: "text-gray-700", label: "DISABLED" }
      : { bg: "bg-red-100", text: "text-red-700", label: "ISOLIR" };

  return (
    <View style={tw`bg-white p-4 mb-3 mx-4 rounded-xl border border-gray-200 shadow-sm`}>
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <View style={tw`flex-1 mr-2`}>
          <Text style={tw`text-base font-bold text-gray-900`}>{username}</Text>
          <Text style={tw`text-xs text-gray-600 mt-0.5`}>{name}</Text>
          <Text style={tw`text-[11px] text-gray-500 mt-0.5`}>{plan}</Text>
        </View>
        <View style={tw`${badge.bg} px-2 py-1 rounded`}>
          <Text style={tw`${badge.text} text-[10px] font-bold`}>{badge.label}</Text>
        </View>
      </View>

      <View style={tw`gap-1.5 mb-3`}>
        <TouchableOpacity onPress={handleAddress} disabled={!hasValidAddress} style={tw`flex-row items-start`}>
          <MapPin size={14} color="#2563eb" style={tw`mt-0.5`} />
          <Text style={tw`text-xs text-gray-700 ml-1.5 flex-1 leading-[18px] ${hasValidAddress ? "underline" : ""}`}>
            {address}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePhone} disabled={!hasValidPhone} style={tw`flex-row items-center`}>
          <Phone size={14} color="#16a34a" />
          <Text style={tw`text-xs ml-1.5 ${hasValidPhone ? "text-green-600 font-semibold" : "text-gray-500"}`}>
            {phone} (WhatsApp)
          </Text>
        </TouchableOpacity>
      </View>

      <View style={tw`flex-row justify-between items-center pt-2.5 border-t border-gray-100`}>
        <View style={tw`flex-row items-center flex-1`}>
          <Calendar size={14} color="#dc2626" />
          <Text style={tw`text-xs text-red-600 ml-1.5 font-medium`}>Exp: {displayDate}</Text>
        </View>
        <View style={tw`flex-row items-center`}>
          <Building size={14} color="#9ca3af" />
          <Text style={tw`text-xs font-semibold text-gray-600 ml-1 mr-3`}>{group}</Text>

          <TouchableOpacity
            onPress={() => onDismantle(item)}
            style={tw`bg-red-100 p-2 rounded-lg border border-red-200 ml-2`}
          >
            <Trash2 size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});
CustomerItem.displayName = "CustomerItem";

export default function MixRadiusIsolirScreen() {
  useFeatureGuard(AppFeature.MIXRADIUS);

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("isolir");
  const [search, setSearch] = useState("");
  const [hasSelected, setHasSelected] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<OwnerGroup | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingDismantleCustomer, setPendingDismantleCustomer] = useState<MixRadiusCustomer | null>(null);

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const currentAuthStatus = useMemo(
    () => TABS.find((t) => t.key === activeTab)?.authStatus ?? "Isolir",
    [activeTab]
  );

  const handleTabChange = useCallback((key: TabKey) => {
    setActiveTab(key);
  }, []);

  const {
    data: groups = [],
    isError: isGroupsError,
    isFetching: isGroupsLoading,
    refetch: refetchGroups,
  } = useApiQuery<OwnerGroup[]>({
    queryKey: ["mixradius", "groups"],
    queryFn: () => MixRadiusService.getOwnerGroups(),
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    refetch,
    isRefetching: refreshing,
    isError,
    error,
  } = useInfiniteQuery<MixRadiusResponse>({
    queryKey: ["mixradius", "isolir", activeTab, selectedGroup?.id, debouncedSearch],
    queryFn: ({ pageParam }) =>
      MixRadiusService.getIsolirCustomers(
        debouncedSearch,
        pageParam as number,
        PAGE_SIZE,
        undefined,
        selectedGroup?.id,
        currentAuthStatus
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const fetched = allPages.length * PAGE_SIZE;
      const total = lastPage.recordsFiltered ?? lastPage.recordsTotal ?? 0;
      return fetched < total ? allPages.length : undefined;
    },
    enabled: hasSelected,
    retry: (failureCount, err) => {
      const status = (err as { status?: number })?.status;
      if (status === 403 || status === 401) return false;
      return failureCount < 2;
    },
    staleTime: STALE_TIME_MS,
  });

  const loading = isFetching && !refreshing && !isFetchingNextPage;

  const isolirCustomers = useMemo(() => {
    const rows = data?.pages.flatMap((p) => p.data) ?? [];
    const now = new Date();

    if (activeTab === "disabled") {
      return rows.filter(
        (c) => c.auth_status === "Disabled-Users" || c.auth_status === "disabled"
      );
    }

    return rows.filter((c) => {
      if (c.auth_status === "Disabled-Users" || c.auth_status === "disabled") {
        return false;
      }
      const expDate = safeDate(c.expired_on) || safeDate(c.expiration);
      return expDate !== null && expDate < now;
    });
  }, [data, activeTab]);

  const errorMessage = useMemo(() => {
    if (!error) return "Terjadi kesalahan saat mengambil data";
    const { message } = getUserFriendlyError(error);
    return message;
  }, [error]);

  const serverTotal =
    data?.pages[0]?.recordsFiltered ?? data?.pages[0]?.recordsTotal ?? 0;

  const dismantleMutation = useCreateWorkOrderRequest({
    successMessage: "Request WO Dismantle berhasil dikirim. Menunggu persetujuan Admin.",
  });

  const handleSelectGroup = useCallback((group: OwnerGroup | null) => {
    setSelectedGroup(group);
    setHasSelected(true);
    setShowGroupModal(false);
  }, []);

  const handleDismantle = useCallback((customer: MixRadiusCustomer) => {
    setPendingDismantleCustomer(customer);
    setShowReasonModal(true);
  }, []);

  const handleReasonSelected = useCallback((reason: DismantleReason) => {
    setShowReasonModal(false);

    if (!pendingDismantleCustomer) return;

    const customer = pendingDismantleCustomer;
    const reasonText = reason.value;

    Alert.alert(
      "Konfirmasi Bongkar",
      buildDismantleConfirmationMessage(customer, reasonText),
      [
        {
          text: "Batal",
          style: "cancel",
          onPress: () => setPendingDismantleCustomer(null),
        },
        {
          text: "Ya, Buat WO",
          style: "destructive",
          onPress: () => {
            dismantleMutation.mutate(
              {
                type: "DISCONNECTION",
                priority: "HIGH",
                title: `Request Dismantle: ${customer.fullname} (${customer.username})`,
                description: buildDismantleDescription(customer, reasonText),
                contactName: customer.fullname,
                contactPhone: customer.phonenumber,
                locationAddress: customer.address,
                notes: "Request otomatis dari Aplikasi Mobile (Menu Isolir)",
              },
              {
                onSuccess: () => setPendingDismantleCustomer(null),
                onError: (err: unknown) => {
                  setPendingDismantleCustomer(null);
                  presentAppError(err, {
                    screen: "MixRadiusIsolirScreen",
                    route: "/(app)/mixradius/isolir",
                    report: false,
                  });
                },
              }
            );
          },
        },
      ]
    );
  }, [pendingDismantleCustomer, dismantleMutation]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const groupModalItems = useMemo(
    () => [
      { id: "__all__", label: "Semua Site", value: null as OwnerGroup | null },
      ...groups.map((g) => ({ id: g.id, label: g.name, value: g as OwnerGroup | null })),
    ],
    [groups]
  );

  const compareGroup = useCallback(
    (selected: OwnerGroup | null | undefined, itemValue: OwnerGroup | null) => {
      if (selected === itemValue) return true;
      if (selected == null || itemValue == null) return selected == null && itemValue == null;
      return selected.id === itemValue.id;
    },
    []
  );

  const ListHeader = useMemo(
    () => (
      <View style={tw`p-4 pb-2`}>
        <View style={tw`flex-row bg-gray-100 rounded-xl p-1 mb-3`}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTabChange(tab.key)}
                style={tw`flex-1 py-2 rounded-lg ${isActive ? "bg-white shadow-sm" : ""}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={tw`text-center text-sm font-bold ${
                    isActive ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={tw`flex-row items-center bg-white rounded-xl px-4 py-1 border border-gray-200 shadow-sm mb-3`}>
          <Search size={18} color="#9ca3af" />
          <TextInput
            style={tw`flex-1 h-10 ml-2 text-gray-900`}
            placeholder="Cari username atau nama..."
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
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
              {selectedGroup ? selectedGroup.name : hasSelected ? "Semua Site" : "Pilih Site"}
            </Text>
          </TouchableOpacity>
          <Text style={tw`text-gray-500 text-xs font-medium`}>
            {serverTotal > 0
              ? `Menampilkan ${isolirCustomers.length} dari ${serverTotal}`
              : `Total: ${isolirCustomers.length}`}
          </Text>
        </View>
      </View>
    ),
    [activeTab, handleTabChange, search, selectedGroup, serverTotal, isolirCustomers.length, hasSelected]
  );

  if (hasSelected && loading && isolirCustomers.length === 0 && !isError) {
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
        data={isolirCustomers}
        renderItem={({ item, index }: { item: MixRadiusCustomer; index: number }) => (
          <CustomerItem item={item} onDismantle={handleDismantle} activeTab={activeTab} />
        )}
        keyExtractor={(item: MixRadiusCustomer, index: number) =>
          item.id || item.member_id || `${item.username}-${index}`
        }
        ListHeaderComponent={ListHeader}
        onEndReached={handleLoadMore}
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
                    {errorMessage}
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
            <View style={tw`py-4`}>
              <ActivityIndicator color="#2563eb" />
            </View>
          ) : null
        }
      />

      <SelectionModal
        visible={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title="Pilih Site / Group"
        items={groupModalItems}
        onSelect={(item) => handleSelectGroup(item.value as OwnerGroup | null)}
        selectedValue={selectedGroup}
        loading={isGroupsLoading && groups.length === 0}
        emptyText={
          isGroupsError
            ? "Gagal memuat site. Tutup lalu buka lagi untuk coba ulang."
            : "Tidak ada site tersedia"
        }
        compareBy={compareGroup}
      />

      <SelectionModal
        visible={showReasonModal}
        onClose={() => {
          setShowReasonModal(false);
          setPendingDismantleCustomer(null);
        }}
        title="Pilih Alasan Dismantle"
        items={DISMANTLE_REASONS.map((r) => ({
          id: r.id,
          label: r.label,
          value: r,
        }))}
        onSelect={(item) => handleReasonSelected(item.value as DismantleReason)}
      />

      <LoadingModal
        visible={dismantleMutation.isPending}
        message="Mengirim request dismantle..."
      />
    </View>
  );
}
