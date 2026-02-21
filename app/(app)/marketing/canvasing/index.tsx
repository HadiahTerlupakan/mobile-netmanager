import { CanvasingSkeleton } from "@/components/molecules/CanvasingSkeleton";
import { useAuth } from "@/context/AuthContext";
import { useApiQuery } from "@/hooks/queries";
import { queryKeys } from "@/lib/queryClient";
import api from "@/services/api"; // Use centralized API
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
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
import { AppFeature } from '@/constants/features';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

interface PointClaim {
    id: string;
    status: "PENDING" | "APPROVED" | "INSTALASI" | "COMPLETE" | "CLAIM" | "REJECTED";
    rejectReason?: string | null;
    fotoInstalasi?: string | null;
    points: number;
}

interface CanvasingRequest {
    id: string;
    nama: string;
    alamat: string;
    paket: string;
    status: "PENDING" | "APPROVED" | "INSTALASI" | "COMPLETE" | "CLAIM" | "REJECTED";
    rejectReason?: string | null;
    fotoInstalasi?: string | null;
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

interface StatusUI {
    color: string;
    bg: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
}

// Memoized List Item Component
import { router } from 'expo-router';

import { useRouter } from 'expo-router';

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
    <View style={tw`mb-4`}>
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
            <TouchableOpacity
              onPress={() => onClaimPress(item.id)}
              activeOpacity={0.7}
              style={tw`flex-row items-center bg-purple-100 px-2 py-1 rounded-lg`}
            >
              <Ionicons name="gift" size={14} color="#7c3aed" />
              <Text style={tw`text-[10px] font-bold text-purple-600 ml-1`}>Claim</Text>
            </TouchableOpacity>
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
    
    {/* Additional Action Buttons for New Statuses */}
    {item.status === 'INSTALASI' && (
      <TouchableOpacity 
        style={tw`bg-amber-500 p-3 rounded-xl items-center mt-[-10px] mb-2 mx-2 shadow-sm z-10`}
        onPress={() => router.push(`/(app)/marketing/canvasing/${item.id}/complete` as any)}
      >
        <Text style={tw`text-white font-bold text-sm`}>Lapor Pemasangan Selesai (Foto & SN)</Text>
      </TouchableOpacity>
    )}

    {item.status === 'REJECTED' && item.rejectReason && (
      <View style={tw`bg-red-50 p-2 rounded-xl mt-[-10px] mb-2 mx-2 border border-red-100`}>
        <Text style={tw`text-red-600 text-xs italic`}>Alasan Ditolak: {item.rejectReason}</Text>
      </View>
    )}
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
    return data?.pages.flatMap((page: any) => page.data?.data || page.data || page || []) || [];
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
      case "APPROVED": return { color: "text-blue-700", bg: "bg-blue-50", icon: "checkmark-circle", label: "Disetujui" };
      case "INSTALASI": return { color: "text-amber-700", bg: "bg-amber-50", icon: "build", label: "Perlu Laporan (Instalasi Selesai)" };
      case "COMPLETE": return { color: "text-emerald-700", bg: "bg-emerald-50", icon: "checkmark-done", label: "Laporan Selesai" };
      case "CLAIM": return { color: "text-purple-700", bg: "bg-purple-50", icon: "cash", label: "Komisi Dicairkan" };
      case "REJECTED": return { color: "text-rose-700", bg: "bg-rose-50", icon: "close-circle", label: "Ditolak" };
      default: return { color: "text-amber-700", bg: "bg-amber-50", icon: "time", label: "Pending" };
    }
  }, []);

  const canClaimPoints = useCallback((item: CanvasingRequest) => {
    return item.status === "COMPLETE";
  }, []);

  const hasClaimPending = useCallback((item: CanvasingRequest) => item.pointClaims?.[0]?.status === "PENDING", []);
  const hasClaimApproved = useCallback((item: CanvasingRequest) => item.pointClaims?.[0]?.status === "APPROVED", []);

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
    </SafeAreaView>
  );
}
