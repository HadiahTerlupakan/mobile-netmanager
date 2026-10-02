import { EmptyState } from "@/components/atoms/EmptyState";
import { CanvasingSkeleton } from "@/components/molecules/CanvasingSkeleton";
import { Inbox } from "lucide-react-native";
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
import { KartuPoinCanvasing } from '@/components/organisms/canvasing/KartuPoinCanvasing';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';

/** Target canvasing per bulan bila profil belum menetapkannya. */
const TARGET_CANVASING_BULANAN_BAWAAN = 50;
/** Abu-abu ikon & placeholder sekunder (slate-400). */
const WARNA_IKON_SEKUNDER = '#94a3b8';

/** Jarak judul layar dari batas aman atas. */
const JARAK_ATAS = 16;

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
      style={tw`bg-white rounded-2xl p-4 mb-3 border border-slate-200/70`}
    >
      <View style={tw`flex-row justify-between items-start mb-3`}>
        <View style={tw`flex-1 mr-3`}>
          <Text style={tw`text-base font-bold text-slate-900 mb-0.5`}>
            {item.nama}
          </Text>
          <Text style={tw`text-xs text-slate-500`}>
            Paket {item.paket}
          </Text>
        </View>
        <View style={tw`px-2.5 py-1 rounded-full flex-row items-center ${statusUI.bg}`}>
          <Ionicons
            name={statusUI.icon}
            size={12}
            color={tw.color(statusUI.color.replace("text-", ""))}
          />
          <Text style={tw`ml-1 text-[11px] font-semibold ${statusUI.color}`}>
            {statusUI.label}
          </Text>
        </View>
      </View>

      <View style={tw`bg-slate-50 rounded-xl p-3 mb-3 flex-row items-center`}>
        <View style={tw`w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm mr-3 border border-slate-50`}>
          <Ionicons name="location" size={14} color="#64748b" />
        </View>
        <Text style={tw`text-xs text-slate-500 flex-1 font-medium leading-relaxed`} numberOfLines={2}>
          {item.alamat}
        </Text>
      </View>

      <View style={tw`flex-row items-center justify-between mt-1 pt-3 border-t border-slate-100`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="calendar" size={14} color={WARNA_IKON_SEKUNDER} />
          <Text style={tw`text-xs text-slate-500 ml-1.5`}>
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
            <Ionicons name="chevron-forward" size={14} color={WARNA_IKON_SEKUNDER} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});
CanvasingItem.displayName = 'CanvasingItem';

export default function CanvasingListScreen() {
  const { warna } = useTemaPersona();
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
    select: (data: any) => data?.data || data,
    enabled: !!token,
  });

  const hasAccess = useMemo(
    () => (profile?.features || []).includes(AppFeature.CANVASING),
    [profile?.features],
  );

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
      default: return { color: "text-amber-700", bg: "bg-amber-50", icon: "time", label: "Menunggu" };
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

  const targetMonthly = profile?.canvasingTarget || TARGET_CANVASING_BULANAN_BAWAAN;

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

  const kepalaDaftar = (
    <View style={[tw`pb-2`, { paddingTop: insets.top + JARAK_ATAS }]}>
      <View style={tw`flex-row items-center mb-5`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-2xl font-bold text-slate-900`}>Canvasing</Text>
          <Text style={tw`text-sm text-slate-500 mt-0.5`}>Pelanggan baru & poin bonus</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Tambah canvasing"
          onPress={() => router.push("/(app)/marketing/canvasing/create")}
          style={[tw`flex-row items-center px-4 h-10 rounded-full`, { backgroundColor: warna.utamaKuat }]}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={tw`text-white font-semibold ml-1`}>Tambah</Text>
        </TouchableOpacity>
      </View>

      <KartuPoinCanvasing
        ringkasan={{
          poin: stats.points,
          jumlahPengajuan: stats.total,
          target: targetMonthly,
          disetujui: stats.approved,
          tingkatBerhasil: stats.rate,
          menunggu: stats.pending,
        }}
      />

      <View style={tw`flex-row items-center bg-white rounded-2xl px-4 mt-4 mb-2 border border-slate-200/70`}>
        <Ionicons name="search-outline" size={18} color={DESAIN_PREMIUM.ikonNetral} />
        <TextInput
          placeholder="Cari pelanggan atau alamat..."
          placeholderTextColor={WARNA_IKON_SEKUNDER}
          style={tw`flex-1 ml-3 h-11 text-slate-900 text-sm`}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity accessibilityLabel="Hapus pencarian" onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={DESAIN_PREMIUM.ikonNetral} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={tw`text-base font-bold text-slate-900 mt-4 mb-1`}>Riwayat pengajuan</Text>
    </View>
  );

  return (
    <View style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      <View style={tw`flex-1`}>
        <FlashList
          data={filteredRequests}
          renderItem={renderCanvasingItem}
          keyExtractor={(item: CanvasingRequest) => item.id.toString()}
          removeClippedSubviews={true}
          contentContainerStyle={tw`px-4 pb-12`}
          ListHeaderComponent={kepalaDaftar}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={warna.utamaKuat}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={tw`py-4`}>
                <ActivityIndicator size="small" color={warna.utamaKuat} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              ikon={Inbox}
              judul={searchQuery ? "Tidak ditemukan" : "Belum ada pengajuan"}
              pesan={
                searchQuery
                  ? `Tidak ada hasil untuk "${searchQuery}".`
                  : "Ajukan calon pelanggan baru untuk mulai mengumpulkan poin."
              }
              aksi={searchQuery ? undefined : { label: "Tambah canvasing", onTekan: () => router.push("/(app)/marketing/canvasing/create") }}
            />
          }
        />
      </View>
    </View>
  );
}
