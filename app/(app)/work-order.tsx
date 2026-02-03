import AvailableWorkOrderListItem from "@/components/organisms/dashboard/AvailableWorkOrderListItem";
import WorkOrderListItem from "@/components/organisms/dashboard/WorkOrderListItem";
import { Config } from "@/constants/Config";
import { useAuth } from "@/context/AuthContext";
import { useSocket, useSocketEvent } from "@/context/SocketContext";
import { SOCKET_EVENTS } from "@/context/socketTypes";
import {
    useOfflineMutationCompat as useOfflineMutation,
    useOfflineQueryCompat as useOfflineQuery,
} from "@/hooks/queries";
import api from "@/services/api"; // Use centralized API
import { SyncService } from "@/services/SyncService";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import {
    CheckCircle,
    FileText,
    Inbox,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
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
  assignments?: any[];
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

export default function WorkOrderScreen() {
  const { token, user } = useAuth();
  const { isConnected } = useSocket();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("tersedia");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  // Offline Query
  const {
    data: woData,
    isLoading: loadingWO,
    refetch: refetchWO,
  } = useOfflineQuery<WorkOrder[]>({
    key: `work_orders_${activeTab}`,
    fetcher: async () => {
      let endpoint = "";
      let params = {};
      if (activeTab === "tersedia") {
        endpoint = "/api/mobile/work-orders/available";
      } else {
        endpoint = "/api/mobile/work-orders";
        params = { type: activeTab === "aktif" ? "active" : "history" };
      }

      const res = await api.get(endpoint, {
        params,
      });
      return res.data?.data || [];
    },
    enabled: !!token,
    staleTime: 0, // Force refetch fresh data saat key berubah (pindah tab)
  });

  // Offline Mutation for Claim
  const { mutate: claimMutate } = useOfflineMutation();

  useEffect(() => {
    if (woData) setWorkOrders(woData);
  }, [woData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetchWO().finally(() => setRefreshing(false));
  }, [refetchWO]);

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
                  onError: (err: any) =>
                    Alert.alert(
                      "Error",
                      err.message || "Gagal mengambil tugas",
                    ),
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
        <TouchableOpacity
          onPress={() => router.push(`/(app)/work-order-detail/${item.id}`)}
        >
          <WorkOrderListItem item={item} userId={user?.id} />
        </TouchableOpacity>
      );
    },
    [activeTab, claiming, router, user?.id, handleClaimWO],
  );

  // WebSocket: Auto-refresh on WO updates
  const handleWOEvent = useCallback(
    () => {
      console.log("[WS Mobile] WO Event received, refreshing list...");
      refetchWO();
    },
    [refetchWO],
  );

  // Subscribe to WO events for real-time updates
  useSocketEvent(SOCKET_EVENTS.WORKORDER_NEW, handleWOEvent);
  useSocketEvent(SOCKET_EVENTS.WORKORDER_UPDATE, handleWOEvent);
  useSocketEvent(SOCKET_EVENTS.WORKORDER_ASSIGNED, handleWOEvent);

  const getTabStyle = (tab: TabType) => {
    const isActive = activeTab === tab;
    return {
      container: `flex-1 py-2.5 items-center border-b-2 ${isActive ? "border-blue-600" : "border-transparent"}`,
      text: `text-sm font-bold ${isActive ? "text-blue-600" : "text-gray-400"}`,
    };
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "tersedia":
        return "Tidak ada tugas tersedia";
      case "aktif":
        return "Tidak ada tugas aktif";
      case "riwayat":
        return "Tidak ada riwayat tugas";
    }
  };

  const getEmptyIcon = () => {
    switch (activeTab) {
      case "tersedia":
        return <Inbox size={48} color="#d1d5db" />;
      case "aktif":
        return <FileText size={48} color="#d1d5db" />;
      case "riwayat":
        return <CheckCircle size={48} color="#d1d5db" />;
    }
  };

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
        <TouchableOpacity
          onPress={() => setActiveTab("tersedia")}
          style={tw`${getTabStyle("tersedia").container}`}
        >
          <Text style={tw`${getTabStyle("tersedia").text}`}>Tersedia</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("aktif")}
          style={tw`${getTabStyle("aktif").container}`}
        >
          <Text style={tw`${getTabStyle("aktif").text}`}>Aktif</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("riwayat")}
          style={tw`${getTabStyle("riwayat").container}`}
        >
          <Text style={tw`${getTabStyle("riwayat").text}`}>Riwayat</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loadingWO && !refreshing && workOrders.length === 0 ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlashList
          data={workOrders}
          keyExtractor={(item: WorkOrder) => item.id}
          renderItem={renderItem}
          estimatedItemSize={200}
          contentContainerStyle={tw`pb-20 pt-1 px-4`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={tw`items-center justify-center py-20`}>
              {getEmptyIcon()}
              <Text style={tw`text-gray-400 mt-4`}>{getEmptyMessage()}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
