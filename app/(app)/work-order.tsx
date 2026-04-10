import { ScreenErrorBoundary } from "@/components/atoms/ScreenErrorBoundary";
import { WorkOrderSkeleton } from "@/components/molecules/WorkOrderSkeleton";
import AvailableWorkOrderListItem from "@/components/organisms/dashboard/AvailableWorkOrderListItem";
import { WorkOrderListItem } from "@/components/organisms/dashboard/WorkOrderListItem";
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
import {
  CheckCircle,
  FileText,
  Inbox,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { AppFeature } from '@/constants/features';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

type TabType = "tersedia" | "aktif" | "riwayat";

// Memoized row component for Active/History items
const WorkOrderRow = React.memo(({ item, userId, onPress }: { item: WorkOrder, userId?: string, onPress: (id: string) => void }) => (
  <TouchableOpacity onPress={() => onPress(item.id)}>
    <WorkOrderListItem item={item} userId={userId} />
  </TouchableOpacity>
));
WorkOrderRow.displayName = "WorkOrderRow";

function WorkOrderScreenContent() {
  const { token, user } = useAuth();
  const router = useRouter();
  const isConnected = !!token;
  const [activeTab, setActiveTab] = useState<TabType>("tersedia");
  const [claiming, setClaiming] = useState<string | null>(null);

  // Queries
  const {
    data: availableData,
    isPending: loadingAvailable,
    refetch: refetchAvailable,
    isRefetching: refetchingAvailable,
  } = useAvailableWorkOrders({
    enabled: activeTab === "tersedia" && !!token,
  });

  const {
    data: activeData,
    isPending: loadingActive,
    refetch: refetchActive,
    isRefetching: refetchingActive,
  } = useWorkOrders(
    { type: "active", limit: 50 },
    { enabled: activeTab === "aktif" && !!token },
  );

  const {
    data: historyData,
    isPending: loadingHistory,
    refetch: refetchHistory,
    isRefetching: refetchingHistory,
  } = useWorkOrders(
    { type: "history", limit: 50 },
    { enabled: activeTab === "riwayat" && !!token },
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

              await claimMutate(
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
                  },
                },
              );
              setClaiming(null);
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
          <AvailableWorkOrderListItem
            item={item}
            onClaim={handleClaimWO}
            isClaiming={claiming === item.id}
          />
        );
      }

      return (
        <WorkOrderRow item={item} userId={user?.id} onPress={handleDetailPress} />
      );
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
    if (!token || !user?.id) {
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
  }, [handleWOEvent, token, user?.id]);

  const getTabStyle = useCallback((tab: TabType) => {
    const isActive = activeTab === tab;
    return {
      container: `flex-1 py-2.5 items-center border-b-2 ${isActive ? "border-blue-600" : "border-transparent"}`,
      text: `text-sm font-bold ${isActive ? "text-blue-600" : "text-gray-400"}`,
    };
  }, [activeTab]);

  const getEmptyMessage = useMemo(() => {
    switch (activeTab) {
      case "tersedia":
        return "Tidak ada tugas tersedia";
      case "aktif":
        return "Tidak ada tugas aktif";
      case "riwayat":
        return "Tidak ada riwayat tugas";
    }
  }, [activeTab]);

  const getEmptyIcon = useMemo(() => {
    switch (activeTab) {
      case "tersedia":
        return <Inbox size={48} color="#d1d5db" />;
      case "aktif":
        return <FileText size={48} color="#d1d5db" />;
      case "riwayat":
        return <CheckCircle size={48} color="#d1d5db" />;
    }
  }, [activeTab]);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-3`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-2xl font-bold text-gray-800`}>Work Order</Text>
          <View style={tw`flex-row items-center`}>
            <View
              style={tw`w-2 h-2 rounded-full mr-1.5 ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
            <Text
              style={tw`text-xs ${isConnected ? "text-green-600" : "text-red-500"}`}
            >
              {isConnected ? "Live" : "Offline"}
            </Text>
          </View>
        </View>
        <Text style={tw`text-sm text-gray-500`}>Kelola tugas teknis Anda</Text>
      </View>

      {/* Tabs */}
      <View style={tw`flex-row px-4 bg-white border-b border-gray-100`}>
        {/* Helper function to avoid repetition */}
        {(["tersedia", "aktif", "riwayat"] as TabType[]).map((tab) => {
          const styles = getTabStyle(tab);
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={tw`${styles.container}`}
            >
              <Text style={tw`${styles.text}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loadingWO && workOrders.length === 0 ? (
        <View style={tw`flex-1 px-4`}>
          <WorkOrderSkeleton />
        </View>
      ) : (
        <FlashList
          data={workOrders}
          keyExtractor={(item: WorkOrder) => item.id}
          renderItem={renderItem}
          estimatedItemSize={200}
          removeClippedSubviews={true}
          onEndReachedThreshold={0.5}
          contentContainerStyle={tw`pb-20 pt-1 px-4`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
          }
          extraData={claiming} // Ensure re-render when claiming state changes
          ListEmptyComponent={
            <View style={tw`items-center justify-center py-20`}>
              {getEmptyIcon}
              <Text style={tw`text-gray-400 mt-4`}>{getEmptyMessage}</Text>
            </View>
          }
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
