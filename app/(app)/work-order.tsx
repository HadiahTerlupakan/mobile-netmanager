import { WorkOrderSkeleton } from "@/components/molecules/WorkOrderSkeleton";
import AvailableWorkOrderListItem from "@/components/organisms/dashboard/AvailableWorkOrderListItem";
import { WorkOrderListItem } from "@/components/organisms/dashboard/WorkOrderListItem";
import { useAuth } from "@/context/AuthContext";
import { useSocket, useSocketEvent } from "@/context/SocketContext";
import { SOCKET_EVENTS } from "@/context/socketTypes";
import { useOfflineMutationCompat as useOfflineMutation } from "@/hooks/queries";
import api from "@/services/api"; // Use centralized API
import { SyncService } from "@/services/SyncService";
import { WorkOrderAssignment } from "@/types/work-order";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Href, useRouter } from "expo-router";
import { logger } from "@/utils/logger";
import {
    CheckCircle,
    FileText,
    Inbox,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  contactName?: string;
  contactPhone?: string;
  locationAddress?: string;
  createdAt: string;
  scheduledDate?: string;
  assignments?: WorkOrderAssignment[];
  pelanggan?: {
    nama?: string;
    noTelp?: string;
    alamat?: string;
  };
  site?: {
    name?: string;
  };
}

type TabType = "tersedia" | "aktif" | "riwayat";

// Memoized row component for Active/History items
const WorkOrderRow = React.memo(({ item, userId, onPress }: { item: WorkOrder, userId?: string, onPress: (id: string) => void }) => (
  <TouchableOpacity onPress={() => onPress(item.id)}>
    <WorkOrderListItem item={item} userId={userId} />
  </TouchableOpacity>
));
WorkOrderRow.displayName = "WorkOrderRow";

export default function WorkOrderScreen() {
  const { token, user } = useAuth();
  const { isConnected } = useSocket();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("tersedia");
  const [claiming, setClaiming] = useState<string | null>(null);

  // Infinite Query for Pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingWO,
    isRefetching,
    refetch: refetchWO,
  } = useInfiniteQuery({
    queryKey: ["work_orders", activeTab],
    queryFn: async ({ pageParam = null }) => {
      let endpoint = "";
      const params: any = { limit: 10 }; // Default limit

      if (pageParam) {
        params.cursor = pageParam;
      }

      if (activeTab === "tersedia") {
        endpoint = "/api/mobile/work-orders/available";
      } else {
        endpoint = "/api/mobile/work-orders";
        params.type = activeTab === "aktif" ? "active" : "history";
      }

      const res = await api.get(endpoint, { params });
      return res.data;
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor || undefined,
    initialPageParam: null,
    enabled: !!token,
    staleTime: 1000 * 60 * 1, // 1 minute stale time
  });

  // Flatten data
  const workOrders = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.data || []) || [];
  }, [data]);

  // Offline Mutation for Claim
  const { mutate: claimMutate } = useOfflineMutation();

  const onRefresh = useCallback(async () => {
    await refetchWO();
  }, [refetchWO]);

  const onLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
                Alert.alert("Offline", "Permintaan disimpan di antrian.");
              }

              await claimMutate(
                {
                  workOrderId,
                },
                {
                  url: "/api/mobile/work-orders/available",
                  method: "POST",
                  onSuccess: () => {
                    if (isOnline) {
                      Alert.alert("Berhasil", "Tugas berhasil diambil!");
                    }
                    setActiveTab("aktif");
                  },
                  onError: (err) => {
                    const errorMessage = err instanceof AxiosError ? err.response?.data?.error || err.message : "Gagal mengambil tugas";
                    Alert.alert(
                      "Error",
                      errorMessage,
                    );
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

  // WebSocket: Auto-refresh on WO updates
  const handleWOEvent = useCallback(
    () => {
      logger.socket("WO Event received, refreshing list...");
      refetchWO();
    },
    [refetchWO],
  );

  // Subscribe to WO events for real-time updates
  useSocketEvent(SOCKET_EVENTS.WORKORDER_NEW, handleWOEvent);
  useSocketEvent(SOCKET_EVENTS.WORKORDER_UPDATE, handleWOEvent);
  useSocketEvent(SOCKET_EVENTS.WORKORDER_ASSIGNED, handleWOEvent);

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
          onEndReached={onLoadMore}
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
          ListFooterComponent={
            isFetchingNextPage ? (
                <View style={tw`py-4`}>
                    <ActivityIndicator size="small" color="#2563eb" />
                </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
