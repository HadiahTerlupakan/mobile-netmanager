import { ScreenErrorBoundary } from "@/components/atoms/ScreenErrorBoundary";
import { QueryErrorState } from "@/components/molecules/QueryErrorState";
import { WorkOrderSkeleton } from "@/components/molecules/WorkOrderSkeleton";
import { EmptyState } from "@/components/atoms/EmptyState";
import { SegmenPilihan } from "@/components/molecules/SegmenPilihan";
import { KartuWorkOrder } from "@/components/organisms/workOrder/KartuWorkOrder";
import { useStatusRealtime } from "@/hooks/useStatusRealtime";
import { useAuth } from "@/context/AuthContext";
import { realtimeService, RealtimeStreamEvent } from "@/services/RealtimeService";
import {
  isOfflineMutationQueuedResult,
  useAvailableWorkOrders,
  useClaimWorkOrder,
  useWorkOrders,
} from "@/hooks/queries";
import { SyncService } from "@/services/SyncService";
import { WorkOrder } from "@/types/work-order";
import { presentInfoMessage, presentSuccessMessage } from "@/utils/errorPresenter";
import { logger } from "@/utils/logger";
import { FlashList } from "@shopify/flash-list";
import { Href, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { CheckCircle, FileText, Inbox, type LucideIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DESAIN_PREMIUM, useTemaPersona } from "@/theme";
import { AppFeature } from '@/constants/features';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

type TabType = "tersedia" | "aktif" | "riwayat";

const OPSI_TAB: { nilai: TabType; label: string }[] = [
  { nilai: "tersedia", label: "Tersedia" },
  { nilai: "aktif", label: "Aktif" },
  { nilai: "riwayat", label: "Riwayat" },
];

/** Keadaan kosong per tab. */
const KOSONG_PER_TAB: Record<TabType, { ikon: LucideIcon; judul: string; pesan: string }> = {
  tersedia: { ikon: Inbox, judul: "Tidak ada tugas tersedia", pesan: "Tugas baru di site Anda akan muncul di sini." },
  aktif: { ikon: FileText, judul: "Tidak ada tugas aktif", pesan: "Ambil tugas dari tab Tersedia untuk mulai bekerja." },
  riwayat: { ikon: CheckCircle, judul: "Belum ada riwayat tugas", pesan: "Tugas yang selesai akan tercatat di sini." },
};

function WorkOrderScreenContent() {
  const { tw } = useTemaPersona();
  const { token, user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();
  // Keadaan langganan sebenarnya, bukan `!!token`. Yang terakhir hanya berarti
  // "sudah login", sehingga indikatornya tidak pernah bisa merah walau realtime
  // sudah menyerah menyambung.
  const statusRealtime = useStatusRealtime();
  const [activeTab, setActiveTab] = useState<TabType>("tersedia");
  const [claiming, setClaiming] = useState<string | null>(null);

  // Queries
  const {
    data: availableData,
    isPending: loadingAvailable,
    isError: errorAvailable,
    refetch: refetchAvailable,
    isRefetching: refetchingAvailable,
  } = useAvailableWorkOrders({
    enabled: isFocused && activeTab === "tersedia" && !!token,
  });

  const {
    data: activeData,
    isPending: loadingActive,
    isError: errorActive,
    refetch: refetchActive,
    isRefetching: refetchingActive,
  } = useWorkOrders(
    { type: "active", limit: 50 },
    { enabled: isFocused && activeTab === "aktif" && !!token },
  );

  const {
    data: historyData,
    isPending: loadingHistory,
    isError: errorHistory,
    refetch: refetchHistory,
    isRefetching: refetchingHistory,
  } = useWorkOrders(
    { type: "history", limit: 50 },
    { enabled: isFocused && activeTab === "riwayat" && !!token },
  );

  // Derive current list data based on tab
  const workOrders = useMemo(() => {
    switch (activeTab) {
      case "tersedia":
        return availableData?.data || [];
      case "aktif":
        return activeData?.data || [];
      case "riwayat":
        return historyData?.data || [];
      default:
        return [];
    }
  }, [activeTab, availableData, activeData, historyData]);

  const loadingWO =
    (activeTab === "tersedia" && loadingAvailable) ||
    (activeTab === "aktif" && loadingActive) ||
    (activeTab === "riwayat" && loadingHistory);

  const isError =
    (activeTab === "tersedia" && errorAvailable) ||
    (activeTab === "aktif" && errorActive) ||
    (activeTab === "riwayat" && errorHistory);

  const isRefetching =
    refetchingAvailable || refetchingActive || refetchingHistory;

  // Offline Mutation for Claim
  const { mutate: claimMutate } = useClaimWorkOrder();

  const onRefresh = useCallback(async () => {
    if (activeTab === "tersedia") await refetchAvailable();
    else if (activeTab === "aktif") await refetchActive();
    else await refetchHistory();
  }, [activeTab, refetchAvailable, refetchActive, refetchHistory]);

  const handleClaimWO = useCallback(
    async (workOrderId: string) => {
      Alert.alert(
        "Ambil Tugas",
        "Apakah Anda yakin ingin mengambil tugas ini?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Ya, Ambil",
            onPress: async () => {
              setClaiming(workOrderId);

              const isOnline = await SyncService.isOnline();

              // Optimistic Update (Offline)
              if (!isOnline) {
                presentInfoMessage("Permintaan disimpan di antrian.", "Offline");
              }

              claimMutate(
                {
                  workOrderId,
                },
                {
                  onSuccess: (data) => {
                    const isOffline = isOfflineMutationQueuedResult(data);
                    if (isOnline && !isOffline) {
                      presentSuccessMessage("Tugas berhasil diambil!");
                    }
                    setActiveTab("aktif");
                    setClaiming(null);
                  },
                  onSettled: () => {
                    setClaiming(null);
                  },
                },
              );
            },
          },
        ],
      );
    },
    [claimMutate],
  );

  const handleDetailPress = useCallback((id: string) => {
    router.push(`/(app)/work-order-detail/${id}` as Href);
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: WorkOrder }) => {
      if (activeTab === "tersedia") {
        return (
          <KartuWorkOrder
            item={item}
            userId={user?.id}
            aksiAmbil={{ onAmbil: handleClaimWO, isMengambil: claiming === item.id }}
          />
        );
      }

      return <KartuWorkOrder item={item} userId={user?.id} onBuka={handleDetailPress} />;
    },
    [activeTab, claiming, handleClaimWO, handleDetailPress, user?.id],
  );

  // WebSocket: Auto-refresh on WO updates (only active tab)
  const handleWOEvent = useCallback(
    () => {
      logger.socket("WO Event received, refreshing active tab...");
      // Only refresh the currently active tab to avoid unnecessary requests
      switch (activeTab) {
        case "tersedia":
          refetchAvailable();
          break;
        case "aktif":
          refetchActive();
          break;
        case "riwayat":
          refetchHistory();
          break;
      }
    },
    [activeTab, refetchAvailable, refetchActive, refetchHistory],
  );

  useEffect(() => {
    if (!isFocused || !token || !user?.id) {
      return;
    }

    return realtimeService.subscribeToUserStream(user.id, (event: RealtimeStreamEvent) => {
      if (
        event.type === 'workorder.new' ||
        event.type === 'workorder.update' ||
        event.type === 'workorder.assigned'
      ) {
        handleWOEvent();
      }
    });
  }, [handleWOEvent, isFocused, token, user?.id]);

  const kosong = KOSONG_PER_TAB[activeTab];

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      {/* Header */}
      <View style={tw`px-4 pt-4 pb-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-2xl font-bold text-slate-900`}>Work Order</Text>
          <View
            style={tw`flex-row items-center`}
            accessibilityLabel={`Status realtime: ${statusRealtime}`}
          >
            <View
              style={tw`w-2 h-2 rounded-full mr-1.5 ${statusRealtime === "terhubung" ? "bg-green-500" : statusRealtime === "mencoba" ? "bg-amber-500" : "bg-red-500"}`}
            />
            <Text
              style={tw`text-xs ${statusRealtime === "terhubung" ? "text-green-600" : statusRealtime === "mencoba" ? "text-amber-600" : "text-red-500"}`}
            >
              {statusRealtime === "terhubung" ? "Live" : statusRealtime === "mencoba" ? "Menyambung" : "Terputus"}
            </Text>
          </View>
        </View>
        <Text style={tw`text-sm text-slate-500 mt-0.5`}>Kelola tugas teknis Anda</Text>
      </View>

      {/* Tabs */}
      <View style={tw`px-4 mb-2`}>
        <SegmenPilihan opsi={OPSI_TAB} terpilih={activeTab} onPilih={setActiveTab} />
      </View>

      {/* Content */}
      {isError ? (
        <QueryErrorState onRetry={onRefresh} />
      ) : loadingWO && workOrders.length === 0 ? (
        <View style={tw`flex-1 px-4`}>
          <WorkOrderSkeleton />
        </View>
      ) : (
        <FlashList
          data={workOrders}
          keyExtractor={(item: WorkOrder) => item.id}
          renderItem={renderItem}
          removeClippedSubviews={true}
          onEndReachedThreshold={0.5}
          contentContainerStyle={tw`pb-20 pt-1 px-4`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
          }
          extraData={claiming} // Ensure re-render when claiming state changes
          ListEmptyComponent={<EmptyState ikon={kosong.ikon} judul={kosong.judul} pesan={kosong.pesan} />}
        />
      )}
    </SafeAreaView>
  );
}

export default function WorkOrderScreen() {
  useFeatureGuard(AppFeature.WORK_ORDER);
  return (
    <ScreenErrorBoundary screenName="WorkOrder">
      <WorkOrderScreenContent />
    </ScreenErrorBoundary>
  );
}
