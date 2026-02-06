import { NotificationSkeleton } from "@/components/molecules/NotificationSkeleton";
import api from "@/services/api"; // Use centralized API
import { useAuth } from "@/context/AuthContext";
import { useOfflineMutationCompat as useOfflineMutation } from "@/hooks/queries";
import { formatTimeAgo } from "@/utils/date";
import { useFocusEffect, useRouter } from "expo-router";
import {
    ArrowLeft,
    Bell,
    Briefcase,
    Calendar,
    Clock,
    Megaphone,
    Package,
} from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { useInfiniteQuery } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  sourceType?: string;
  sourceId?: string;
  createdAt: string;
}

// Memoized Notification Item
const NotificationItem = React.memo(({ item, onPress }: { item: Notification, onPress: (notif: Notification) => void }) => {
  const getIcon = (sourceType?: string) => {
    switch (sourceType) {
      case "WORK_ORDER":
        return <Briefcase size={20} color="#3b82f6" />;
      case "LEAVE":
        return <Calendar size={20} color="#10b981" />;
      case "OVERTIME":
        return <Clock size={20} color="#f59e0b" />;
      case "INVENTORY":
        return <Package size={20} color="#8b5cf6" />;
      case "ANNOUNCEMENT":
        return <Megaphone size={20} color="#ec4899" />;
      default:
        return <Bell size={20} color="#6b7280" />;
    }
  };

  const formatTime = (dateString: string) => {
    return formatTimeAgo(dateString);
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      style={tw`flex-row p-4 border-b border-gray-100 ${!item.isRead ? "bg-blue-50" : "bg-white"}`}
    >
      <View style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3`}>
        {getIcon(item.sourceType)}
      </View>
      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center justify-between mb-1`}>
          <Text style={tw`font-bold text-gray-800 flex-1`} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.isRead && (
            <View style={tw`w-2 h-2 rounded-full bg-blue-500 ml-2`} />
          )}
        </View>
        <Text style={tw`text-gray-600 text-sm mb-1`} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={tw`text-gray-400 text-xs`}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});
NotificationItem.displayName = 'NotificationItem';

export default function NotificationsScreen() {
  const { token } = useAuth();
  const router = useRouter();

  // Infinite Query for Notifications
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["notifications_list"],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams();
      params.append("limit", "15");
      if (pageParam) {
        params.append("cursor", pageParam as string);
      }
      const res = await api.get(`/api/mobile/notifications?${params.toString()}`);
      return res.data.data; // Assuming backend structure returns { data: { notifications: [], unreadCount: 0, nextCursor: ... } } or similar
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor || undefined,
    initialPageParam: null,
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
  });

  // Offline Mutation for Actions
  const { mutate } = useOfflineMutation();

  const notifications = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.notifications || []) || [];
  }, [data]);

  // Get unread count from the first page (latest data)
  const unreadCount = data?.pages[0]?.unreadCount || 0;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const onLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
    }
  };

  const markAsRead = useCallback(async (notificationId: string) => {
    await mutate(
      { action: "markRead", notificationId },
      {
        url: `/api/mobile/notifications`,
        method: "POST",
        onSuccess: () => refetch(),
      },
    );
  }, [mutate, refetch]);

  const markAllAsRead = useCallback(async () => {
    await mutate(
      { action: "markAllRead" },
      {
        url: `/api/mobile/notifications`,
        method: "POST",
        onSuccess: () => refetch(),
      },
    );
  }, [mutate, refetch]);

  const handleNotificationPress = useCallback((notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (notification.sourceType === "ANNOUNCEMENT" && notification.sourceId) {
      mutate(
        { portal: "employee" },
        { url: `/api/mobile/announcements/${notification.sourceId}/read`, method: "POST" },
      );
    }

    switch (notification.sourceType) {
      case "WORK_ORDER":
        router.push(notification.sourceId ? `/(app)/work-order-detail/${notification.sourceId}` : "/(app)/work-order");
        break;
      case "LEAVE": router.push("/(app)/izin"); break;
      case "OVERTIME": router.push("/(app)/lembur"); break;
      case "INVENTORY": router.push("/(app)/barang"); break;
      default: router.push("/(app)/dashboard"); break;
    }
  }, [markAsRead, mutate, router]);

  if (isLoading && notifications.length === 0) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`bg-blue-600 px-4 py-4 flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`text-white font-bold text-lg ml-2`}>Notifikasi</Text>
        </View>
        <NotificationSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`bg-blue-600 px-4 py-4 flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`text-white font-bold text-lg ml-2`}>Notifikasi</Text>
          {unreadCount > 0 && (
            <View style={tw`bg-red-500 rounded-full px-2 py-0.5 ml-2`}>
              <Text style={tw`text-white text-xs font-bold`}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={tw`text-blue-100 text-sm font-medium`}>Tandai Dibaca</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={tw`flex-1`}>
        <FlashList
          data={notifications}
          renderItem={({ item }: { item: Notification }) => (
            <NotificationItem item={item} onPress={handleNotificationPress} />
          )}
          keyExtractor={(item: Notification) => item.id}
          estimatedItemSize={80}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
                <View style={tw`py-4`}>
                    <ActivityIndicator size="small" color="#2563eb" />
                </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={tw`items-center justify-center py-20`}>
              <Bell size={48} color="#d1d5db" />
              <Text style={tw`text-gray-400 text-lg mt-4`}>Belum ada notifikasi</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
