import { CanvasingSkeleton } from "@/components/molecules/CanvasingSkeleton";
import { AppFeature } from '@/constants/features';
import { useAuth } from "@/context/AuthContext";
import { useApiQuery } from "@/hooks/queries";
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { queryKeys } from "@/lib/queryClient";
import api from "@/services/api"; // Use centralized API
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  workOrder: {
    id: string;
    workOrderNumber: string;
    status: string;
  } | null;
  pointClaims: PointClaim | null;
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

interface StatusUI {
  color: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

// Memoized List Item Component
const CanvasingItem = React.memo(({
  item,
  onPress,
  onClaimPress,
  getStatusUI,
  canClaimPoints,
  hasClaimPending,
  hasClaimApproved
}: {
  item: CanvasingRequest;
  onPress: (id: string) => void;
  onClaimPress: (id: string) => void;
  getStatusUI: (status: string, woStatus?: string) => StatusUI;
  canClaimPoints: (item: CanvasingRequest) => boolean;
  hasClaimPending: (item: CanvasingRequest) => boolean;
  hasClaimApproved: (item: CanvasingRequest) => boolean;
}) => {
  const statusUI = getStatusUI(item.status, item.workOrder?.status);

  return (
    <View
      style={tw`bg-white rounded-[24px] p-4 mb-4 shadow-sm border border-slate-100/80`}
    >
      <View style={tw`flex-row justify-between items-start mb-3`}>
        <View style={tw`flex-1 mr-3`}>
          <Text style={tw`text-lg font-black text-slate-800 mb-0.5 leading-tight tracking-tight`}>
            {item.nama}
          </Text>
          <Text style={tw`text-slate-400 font-bold text-[10px] uppercase tracking-widest`}>
            PAKET {item.paket}
          </Text>
        </View>
        <View style={tw`px-2.5 py-1 rounded-full flex-row items-center border border-white shadow-sm ${statusUI.bg}`}>
          <Ionicons
            name={statusUI.icon}
            size={12}
            color={tw.color(statusUI.color.replace("text-", ""))}
          />
          <Text style={tw`ml-1.5 text-[10px] font-black ${statusUI.color} uppercase`}>
            {statusUI.label}
          </Text>
        </View>
      </View>

      <View style={tw`border border-slate-100 bg-slate-50/50 rounded-[16px] p-3 mb-3 flex-row items-center`}>
        <View style={tw`w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm mr-3 border border-slate-50`}>
          <Ionicons name="location" size={14} color="#64748b" />
        </View>
        <Text style={tw`text-xs text-slate-500 flex-1 font-medium leading-relaxed`} numberOfLines={2}>
          {item.alamat}
        </Text>
      </View>

      <View style={tw`flex-row items-center justify-between mt-1 pt-3 border-t border-slate-100`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="calendar" size={14} color="#94a3b8" />
          <Text style={tw`text-[11px] text-slate-400 font-bold ml-1.5 uppercase`}>
            {new Date(item.createdAt).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>

        <View style={tw`flex-row items-center gap-2`}>
          {hasClaimPending(item) && (
            <View style={tw`flex-row items-center bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100`}>
              <Ionicons name="hourglass" size={12} color="#e11d48" />
              <Text style={tw`text-[10px] font-bold text-rose-600 ml-1.5`}>Menunggu</Text>
            </View>
          )}
          {hasClaimApproved(item) && (
            <View style={tw`flex-row items-center bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100`}>
              <Ionicons name="star" size={12} color="#059669" />
              <Text style={tw`text-[10px] font-bold text-emerald-600 ml-1.5`}>Selesai</Text>
            </View>
          )}

          {canClaimPoints(item) && (
            <TouchableOpacity
              onPress={() => onClaimPress(item.id)}
              activeOpacity={0.7}
              style={tw`w-8 h-8 rounded-full bg-emerald-500 items-center justify-center shadow-sm`}
            >
              <Ionicons name="gift" size={16} color="white" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => onPress(item.id)}
            activeOpacity={0.7}
            style={tw`w-8 h-8 rounded-full bg-slate-50 items-center justify-center border border-slate-100`}
          >
            <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});
CanvasingItem.displayName = 'CanvasingItem';

export default function CanvasingListScreen() {
  useFeatureGuard(AppFeature.CANVASING);
  const router = useRouter();
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["marketing_canvasing_list"],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams();
      params.append("limit", "10");
      if (pageParam) {
        params.append("cursor", pageParam as string);
      }
      const res = await api.get(`/api/marketing/canvasing?${params.toString()}`);
      return res.data;
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor || undefined,
    initialPageParam: null,
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const requests = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.data || []) || [];
  }, [data]);

  const { data: profile, isPending: profilePending } = useApiQuery<UserProfile>({
    queryKey: queryKeys.profile.detail(),
    endpoint: "/api/mobile/profile",
    select: (data: any) => data?.data || data,
    enabled: !!token,
  });

  const { data: pointSummary } = useApiQuery<PointSummary>({
    queryKey: ["marketing_point_summary"],
    endpoint: "/api/marketing/point-claims/summary",
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

  const getStatusUI = useCallback((status: string, woStatus?: string): StatusUI => {
    const woCompleted = woStatus && ["COMPLETED", "VERIFIED", "CLOSED"].includes(woStatus);
    if (status === "APPROVED" && woCompleted) {
      return { color: "text-teal-700", bg: "bg-teal-50", icon: "checkmark-done", label: "Selesai" };
    }
    const woInProgress = woStatus && ["IN_PROGRESS", "ON_HOLD"].includes(woStatus);
    if (status === "APPROVED" && woInProgress) {
      return { color: "text-blue-700", bg: "bg-blue-50", icon: "construct", label: "Dikerjakan" };
    }
    switch (status) {
      case "APPROVED": return { color: "text-emerald-700", bg: "bg-emerald-50", icon: "checkmark-circle", label: "Disetujui" };
      case "REJECTED": return { color: "text-rose-700", bg: "bg-rose-50", icon: "close-circle", label: "Ditolak" };
      default: return { color: "text-amber-700", bg: "bg-amber-50", icon: "time", label: "Pending" };
    }
  }, []);

  const canClaimPoints = useCallback((item: CanvasingRequest) => {
    const woCompleted = !!(item.workOrder?.status && ["COMPLETED", "VERIFIED", "CLOSED"].includes(item.workOrder.status));
    const hasNoClaim = !item.pointClaims;
    return woCompleted && hasNoClaim;
  }, []);

  const hasClaimPending = useCallback((item: CanvasingRequest) => item.pointClaims?.status === "PENDING", []);
  const hasClaimApproved = useCallback((item: CanvasingRequest) => item.pointClaims?.status === "APPROVED", []);

  const onLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleItemPress = useCallback((id: string) => {
    router.push(`/(app)/marketing/canvasing/${id}`);
  }, [router]);

  const handleClaimPress = useCallback((id: string) => {
    router.push(`/(app)/marketing/canvasing/${id}/claim`);
  }, [router]);

  // Memoized renderItem to prevent FlashList re-renders
  const renderCanvasingItem = useCallback(({ item }: { item: CanvasingRequest }) => (
    <CanvasingItem
      item={item}
      onPress={handleItemPress}
      onClaimPress={handleClaimPress}
      getStatusUI={getStatusUI}
      canClaimPoints={canClaimPoints}
      hasClaimPending={hasClaimPending}
      hasClaimApproved={hasClaimApproved}
    />
  ), [handleItemPress, handleClaimPress, getStatusUI, canClaimPoints, hasClaimPending, hasClaimApproved]);

  const targetMonthly = profile?.canvasingTarget || 50;
  const progressPerc = Math.min((stats.total / targetMonthly) * 100, 100);

  const insets = useSafeAreaInsets();

  if (profilePending || (isPending && !requests)) {
    return <CanvasingSkeleton />;
  }

  if (!hasAccess) {
    return (
      <View style={tw`flex-1 bg-gray-50 items-center justify-center px-8`}>
        <View style={tw`bg-red-50 p-5 rounded-full mb-6`}>
          <Ionicons name="lock-closed" size={48} color="#dc2626" />
        </View>
        <Text style={tw`text-xl font-bold text-gray-900 text-center mb-2`}>Akses Terbatas</Text>
        <TouchableOpacity onPress={() => router.back()} style={tw`bg-emerald-600 px-8 py-3 rounded-xl`}>
          <Text style={tw`text-white font-bold`}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-slate-50`}>
      {/* Dynamic Header - Minimalist, blending into the background */}
      <View style={[tw`px-5 pb-16 bg-slate-900 rounded-b-[40px]`, { paddingTop: insets.top + 16 }]}>
        <View style={tw`flex-row items-center justify-between mb-6`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`w-10 h-10 items-center justify-center bg-white/10 rounded-full`}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`text-lg font-black text-white tracking-widest`}>CANVASING</Text>
          <TouchableOpacity onPress={() => router.push("/(app)/marketing/canvasing/create")} style={tw`w-10 h-10 items-center justify-center bg-emerald-500 rounded-full shadow-md`}>
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        </View>
        <View style={tw`items-center`}>
          <Text style={tw`text-slate-400 font-bold tracking-widest text-xs mb-1`}>TOTAL POIN</Text>
          <View style={tw`flex-row items-end`}>
            <Text style={tw`text-5xl font-black text-white tracking-tighter`}>{stats.points}</Text>
            <Text style={tw`text-emerald-400 font-bold mb-2 ml-1`}>PTS</Text>
          </View>
        </View>
      </View>

      {/* Floating Target Card Overlapping Header */}
      <View style={tw`px-5 -mt-10 z-10`}>
        <View style={tw`bg-white rounded-[32px] p-6 shadow-sm border border-slate-100`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <View>
              <Text style={tw`text-slate-400 text-xs font-bold uppercase`}>Progress Target</Text>
              <Text style={tw`text-slate-800 text-xl font-black`}>{stats.total} <Text style={tw`text-slate-400 text-sm`}>/ {targetMonthly}</Text></Text>
            </View>
            <View style={tw`bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100`}>
              <Text style={tw`text-emerald-600 font-black text-xs`}>{Math.round(progressPerc)}%</Text>
            </View>
          </View>

          {/* Sleek rounded progress bar */}
          <View style={tw`h-3 bg-slate-100 rounded-full overflow-hidden mb-6`}>
            <View style={[tw`h-full bg-emerald-500 rounded-full`, { width: `${progressPerc}%` }]} />
          </View>

          {/* Micro Cards for Sub-stats */}
          <View style={tw`flex-row justify-between gap-3`}>
            <View style={tw`flex-1 bg-emerald-50 rounded-2xl p-3 border border-emerald-100/50`}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" style={tw`mb-1`} />
              <Text style={tw`text-emerald-800 font-black text-lg`}>{stats.approved}</Text>
              <Text style={tw`text-emerald-600/70 text-[10px] uppercase font-bold`}>Approved</Text>
            </View>
            <View style={tw`flex-1 bg-blue-50 rounded-2xl p-3 border border-blue-100/50`}>
              <Ionicons name="trending-up" size={16} color="#2563eb" style={tw`mb-1`} />
              <Text style={tw`text-blue-800 font-black text-lg`}>{stats.rate}%</Text>
              <Text style={tw`text-blue-600/70 text-[10px] uppercase font-bold`}>Win Rate</Text>
            </View>
            <View style={tw`flex-1 bg-amber-50 rounded-2xl p-3 border border-amber-100/50`}>
              <Ionicons name="hourglass" size={16} color="#d97706" style={tw`mb-1`} />
              <Text style={tw`text-amber-800 font-black text-lg`}>{stats.pending}</Text>
              <Text style={tw`text-amber-600/70 text-[10px] uppercase font-bold`}>Pending</Text>
            </View>
          </View>
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

      <View style={tw`flex-1`}>
        <FlashList
          data={filteredRequests}
          renderItem={renderCanvasingItem}
          keyExtractor={(item: CanvasingRequest) => item.id.toString()}
          estimatedItemSize={180}
          removeClippedSubviews={true}
          contentContainerStyle={tw`p-4 pb-12`}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#4338ca"
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={tw`py-4`}>
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            ) : null
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
    </View>
  );
}
