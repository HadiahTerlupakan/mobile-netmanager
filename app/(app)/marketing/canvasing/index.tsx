import { Config } from "@/constants/Config";
import { useAuth } from "@/context/AuthContext";
import { useOfflineQueryCompat as useOfflineQuery } from "@/hooks/queries";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useMemo, useState, useCallback } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

interface PointClaim {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    points: number;
}

interface CanvasingRequest {
    id: string;
    nama: string;
    alamat: string;
    paket: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    workOrder?: {
        status: string;
    };
    pointClaims?: PointClaim[];
}

interface PointSummary {
    totalPoints: number;
    pendingClaims: number;
}

interface UserProfile {
    features: string[];
    isSales: boolean;
    canvasingTarget?: number;
}

// Memoized StatBox to prevent re-renders
const StatBox = React.memo(({ label, value, icon }: { label: string; value: string | number; icon: keyof typeof Ionicons.glyphMap }) => {
  return (
    <View style={tw`flex-1 bg-white/10 rounded-2xl p-3 border border-white/10`}>
      <View style={tw`flex-row items-center mb-1.5`}>
        <Ionicons name={icon} size={12} color="white" style={tw`opacity-60`} />
        <Text
          style={tw`text-[9px] text-white font-bold uppercase ml-1 opacity-70`}
        >
          {label}
        </Text>
      </View>
      <Text style={tw`text-white text-lg font-black`}>{value}</Text>
    </View>
  );
});
StatBox.displayName = 'StatBox';

// Memoized List Item Component
const CanvasingItem = React.memo(({ 
    item, 
    onPress, 
    getStatusUI, 
    canClaimPoints, 
    hasClaimPending, 
    hasClaimApproved 
}: { 
    item: CanvasingRequest; 
    onPress: (id: string) => void; 
    getStatusUI: (status: string, woStatus?: string) => any;
    canClaimPoints: (item: CanvasingRequest) => boolean;
    hasClaimPending: (item: CanvasingRequest) => boolean;
    hasClaimApproved: (item: CanvasingRequest) => boolean;
}) => {
  const statusUI = getStatusUI(item.status, item.workOrder?.status);
  
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={tw`bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100`}
      onPress={() => onPress(item.id)}
    >
      <View style={tw`flex-row justify-between items-start mb-4`}>
        <View style={tw`flex-1 mr-3`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-1 leading-tight`}>
            {item.nama}
          </Text>
          <View style={tw`flex-row items-center`}>
            <View style={tw`w-2 h-2 rounded-full bg-blue-500 mr-2`} />
            <Text style={tw`text-blue-600 font-bold text-xs uppercase tracking-tight`}>
              {item.paket}
            </Text>
          </View>
        </View>
        <View style={tw`px-3 py-1.5 rounded-xl flex-row items-center ${statusUI.bg}`}>
          <Ionicons
            name={statusUI.icon}
            size={14}
            color={tw.color(statusUI.color.replace("text-", ""))}
          />
          <Text style={tw`ml-1.5 text-[11px] font-extrabold ${statusUI.color} uppercase`}>
            {statusUI.label}
          </Text>
        </View>
      </View>

      <View style={tw`bg-gray-50 rounded-2xl p-3 mb-4`}>
        <View style={tw`flex-row items-start`}>
          <Ionicons name="location" size={16} color="#4b5563" style={tw`mt-0.5`} />
          <Text style={tw`text-xs text-gray-600 ml-2 flex-1 leading-4`} numberOfLines={2}>
            {item.alamat}
          </Text>
        </View>
      </View>

      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
          <Text style={tw`text-[11px] text-gray-400 font-medium ml-1.5`}>
            {new Date(item.createdAt).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>

        <View style={tw`flex-row items-center gap-2`}>
          {canClaimPoints(item) && (
            <View style={tw`flex-row items-center bg-purple-100 px-2 py-1 rounded-lg`}>
              <Ionicons name="gift" size={14} color="#7c3aed" />
              <Text style={tw`text-[10px] font-bold text-purple-600 ml-1`}>Claim</Text>
            </View>
          )}
          {hasClaimPending(item) && (
            <View style={tw`flex-row items-center bg-pink-100 px-2 py-1 rounded-lg`}>
              <Ionicons name="hourglass" size={12} color="#db2777" />
              <Text style={tw`text-[10px] font-bold text-pink-600 ml-1`}>Pending</Text>
            </View>
          )}
          {hasClaimApproved(item) && (
            <View style={tw`flex-row items-center bg-yellow-100 px-2 py-1 rounded-lg`}>
              <Ionicons name="star" size={12} color="#d97706" />
              <Text style={tw`text-[10px] font-bold text-yellow-600 ml-1`}>Diklaim</Text>
            </View>
          )}
          <View style={tw`flex-row items-center bg-blue-50 px-2 py-1 rounded-lg`}>
            <Text style={tw`text-[10px] font-bold text-blue-600 mr-1`}>Detail</Text>
            <Ionicons name="chevron-forward" size={12} color="#2563eb" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});
CanvasingItem.displayName = 'CanvasingItem';

export default function CanvasingListScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: requests,
    isLoading,
    refetch,
    isOfflineData,
  } = useOfflineQuery<CanvasingRequest[]>({
    key: "marketing_canvasing_list",
    fetcher: async () => {
      const res = await axios.get(`${Config.API_URL}/api/marketing/canvasing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const { data: profile, isLoading: profileLoading } = useOfflineQuery<UserProfile>({
    key: "user_profile",
    fetcher: async () => {
      const res = await axios.get(`${Config.API_URL}/api/mobile/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  const { data: pointSummary } = useOfflineQuery<PointSummary>({
    key: "marketing_point_summary",
    fetcher: async () => {
      const res = await axios.get(
        `${Config.API_URL}/api/marketing/point-claims/summary`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.data;
    },
    enabled: !!token,
  });

  const hasAccess = useMemo(() => {
    const features = profile?.features || [];
    return features.includes("m_canvasing") || profile?.isSales === true;
  }, [profile?.features, profile?.isSales]);

  const stats = useMemo(() => {
    if (!requests)
      return { total: 0, approved: 0, pending: 0, points: 0, rate: 0, pendingClaims: 0 };

    const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
    const pendingCount = requests.filter((r) => r.status === "PENDING").length;
    const totalPoints = pointSummary?.totalPoints ?? 0;

    return {
      total: requests.length,
      approved: approvedCount,
      pending: pendingCount,
      points: totalPoints,
      rate: requests.length > 0 ? Math.round((approvedCount / requests.length) * 100) : 0,
      pendingClaims: pointSummary?.pendingClaims ?? 0,
    };
  }, [requests, pointSummary]);

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter(
      (item) =>
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.alamat.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [requests, searchQuery]);

  const getStatusUI = useCallback((status: string, woStatus?: string) => {
    const woCompleted = woStatus && ["COMPLETED", "VERIFIED", "CLOSED"].includes(woStatus);
    if (status === "APPROVED" && woCompleted) {
      return { color: "text-teal-700", bg: "bg-teal-50", icon: "checkmark-done" as const, label: "Selesai" };
    }
    const woInProgress = woStatus && ["IN_PROGRESS", "ON_HOLD"].includes(woStatus);
    if (status === "APPROVED" && woInProgress) {
      return { color: "text-blue-700", bg: "bg-blue-50", icon: "construct" as const, label: "Dikerjakan" };
    }
    switch (status) {
      case "APPROVED": return { color: "text-emerald-700", bg: "bg-emerald-50", icon: "checkmark-circle" as const, label: "Disetujui" };
      case "REJECTED": return { color: "text-rose-700", bg: "bg-rose-50", icon: "close-circle" as const, label: "Ditolak" };
      default: return { color: "text-amber-700", bg: "bg-amber-50", icon: "time" as const, label: "Pending" };
    }
  }, []);

  const canClaimPoints = useCallback((item: CanvasingRequest) => {
    const woCompleted = !!(item.workOrder?.status && ["COMPLETED", "VERIFIED", "CLOSED"].includes(item.workOrder.status));
    const hasNoClaim = !item.pointClaims || item.pointClaims.length === 0;
    return woCompleted && hasNoClaim;
  }, []);

  const hasClaimPending = useCallback((item: CanvasingRequest) => item.pointClaims?.[0]?.status === "PENDING", []);
  const hasClaimApproved = useCallback((item: CanvasingRequest) => item.pointClaims?.[0]?.status === "APPROVED", []);

  const handleItemPress = useCallback((id: string) => {
    router.push(`/(app)/marketing/canvasing/${id}`);
  }, [router]);

  const targetMonthly = profile?.canvasingTarget || 50;
  const progressPerc = Math.min((stats.total / targetMonthly) * 100, 100);

  if (profileLoading || (isLoading && !requests)) {
    return (
      <View style={tw`flex-1 bg-gray-50 items-center justify-center`}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={tw`text-gray-500 mt-4`}>Memuat Data...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={tw`flex-1 bg-gray-50 items-center justify-center px-8`}>
        <View style={tw`bg-red-50 p-5 rounded-full mb-6`}>
          <Ionicons name="lock-closed" size={48} color="#dc2626" />
        </View>
        <Text style={tw`text-xl font-bold text-gray-900 text-center mb-2`}>Akses Terbatas</Text>
        <TouchableOpacity onPress={() => router.back()} style={tw`bg-indigo-600 px-8 py-3 rounded-xl`}>
          <Text style={tw`text-white font-bold`}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top"]}>
      <View style={tw`bg-indigo-700 pb-6 px-5 shadow-lg`}>
        <View style={tw`flex-row items-center justify-between pt-4 mb-6`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`w-10 h-10 items-center justify-center bg-white/10 rounded-full`}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`text-lg font-black text-white uppercase tracking-tighter`}>Dashboard Canvasing</Text>
          <TouchableOpacity onPress={() => router.push("/(app)/marketing/canvasing/create")} style={tw`w-10 h-10 items-center justify-center bg-indigo-500 rounded-full shadow-md`}>
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <View style={tw`flex-row items-center justify-between mb-6`}>
          <View>
            <Text style={tw`text-indigo-200 text-xs font-bold uppercase tracking-widest`}>Poin Terkumpul</Text>
            <View style={tw`flex-row items-end`}>
              <Text style={tw`text-white text-4xl font-black italic`}>{stats.points}</Text>
              <Text style={tw`text-indigo-200 text-xs font-bold mb-1.5 ml-1`}>PTS</Text>
            </View>
          </View>
          <View style={tw`items-end`}>
            <View style={tw`bg-white/20 px-3 py-1 rounded-full mb-1`}>
              <Text style={tw`text-white text-[10px] font-bold`}>TARGET BULANAN</Text>
            </View>
            <Text style={tw`text-white text-lg font-black`}>{stats.total} / {targetMonthly}</Text>
          </View>
        </View>

        <View style={tw`h-2 bg-indigo-900/50 rounded-full overflow-hidden mb-6`}>
          <View style={[tw`h-full bg-emerald-400 rounded-full shadow-sm`, { width: `${progressPerc}%` }]} />
        </View>

        <View style={tw`flex-row gap-3`}>
          <StatBox label="APPROVED" value={stats.approved} icon="checkmark-done" />
          <StatBox label="CONV RATE" value={`${stats.rate}%`} icon="trending-up" />
          <StatBox label="PENDING" value={stats.pending} icon="hourglass" />
        </View>
      </View>

      <View style={tw`bg-white px-5 py-4 shadow-sm z-10`}>
        <View style={tw`flex-row items-center bg-gray-100 rounded-2xl px-4 py-1`}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            placeholder="Cari pelanggan atau alamat..."
            placeholderTextColor="#9ca3af"
            style={tw`flex-1 ml-3 h-10 text-gray-900 text-sm font-medium`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isOfflineData && (
        <View style={tw`bg-amber-500 py-1 flex-row items-center justify-center`}>
          <Ionicons name="cloud-offline" size={12} color="white" />
          <Text style={tw`text-[10px] text-white ml-2 font-bold uppercase`}>Mode Offline - Sinkronisasi Tertunda</Text>
        </View>
      )}

      <View style={tw`flex-1`}>
        <FlashList
          data={filteredRequests}
          renderItem={({ item }: { item: CanvasingRequest }) => (
            <CanvasingItem
              item={item}
              onPress={handleItemPress}
              getStatusUI={getStatusUI}
              canClaimPoints={canClaimPoints}
              hasClaimPending={hasClaimPending}
              hasClaimApproved={hasClaimApproved}
            />
          )}
          keyExtractor={(item: CanvasingRequest) => item.id.toString()}
          estimatedItemSize={180}
          contentContainerStyle={tw`p-4 pb-12`}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor="#4338ca"
            />
          }
          ListEmptyComponent={
            <View style={tw`items-center justify-center py-24`}>
              <View style={tw`w-24 h-24 bg-gray-100 items-center justify-center rounded-full mb-4`}>
                <Ionicons name="file-tray-outline" size={48} color="#d1d5db" />
              </View>
              <Text style={tw`text-gray-900 font-bold text-lg`}>Tidak Ada Data</Text>
              <Text style={tw`text-gray-500 text-center mt-2 px-12`}>
                {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : "Belum ada riwayat canvasing yang diajukan."}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
