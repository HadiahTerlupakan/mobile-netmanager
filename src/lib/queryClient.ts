/**
 * TanStack Query Client Configuration
 *
 * Setup QueryClient dengan:
 * - Default options untuk queries dan mutations
 * - AsyncStorage persister untuk offline caching
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

// Query Client dengan konfigurasi optimal untuk mobile
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 menit - data dianggap fresh
      gcTime: 1000 * 60 * 60 * 24, // 24 jam - garbage collection time
      retry: 2, // Retry 2x jika gagal
      refetchOnWindowFocus: false, // Mobile tidak punya window focus
      refetchOnReconnect: true, // Refetch saat kembali online
      networkMode: "offlineFirst", // Prioritaskan cache saat offline
    },
    mutations: {
      retry: 1,
      networkMode: "offlineFirst",
    },
  },
});

// AsyncStorage Persister untuk menyimpan cache ke storage
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "TANSTACK_QUERY_CACHE",
  throttleTime: 1000, // Throttle writes ke 1 detik
});

// Query key factory patterns
export const queryKeys = {
  // Work Orders
  workOrders: {
    all: ["workOrders"] as const,
    list: () => [...queryKeys.workOrders.all, "list"] as const,
    detail: (id: string) =>
      [...queryKeys.workOrders.all, "detail", id] as const,
  },

  // Inventory / Barang
  inventory: {
    all: ["inventory"] as const,
    list: () => [...queryKeys.inventory.all, "list"] as const,
    detail: (id: string) => [...queryKeys.inventory.all, "detail", id] as const,
  },

  // Attendance
  attendance: {
    all: ["attendance"] as const,
    today: () => [...queryKeys.attendance.all, "today"] as const,
    history: () => [...queryKeys.attendance.all, "history"] as const,
  },

  // Notifications
  notifications: {
    all: ["notifications"] as const,
    list: () => [...queryKeys.notifications.all, "list"] as const,
    unread: () => [...queryKeys.notifications.all, "unread"] as const,
  },

  // Leave / Izin
  leave: {
    all: ["leave"] as const,
    list: () => [...queryKeys.leave.all, "list"] as const,
    balance: () => [...queryKeys.leave.all, "balance"] as const,
  },

  // Overtime / Lembur
  overtime: {
    all: ["overtime"] as const,
    list: () => [...queryKeys.overtime.all, "list"] as const,
  },

  // Canvasing
  canvasing: {
    all: ["canvasing"] as const,
    list: () => [...queryKeys.canvasing.all, "list"] as const,
    detail: (id: string) => [...queryKeys.canvasing.all, "detail", id] as const,
  },

  // Holidays
  holidays: {
    all: ["holidays"] as const,
    list: (year: number) => [...queryKeys.holidays.all, "list", year] as const,
  },

  // Chat
  chat: {
    all: ["chat"] as const,
    list: () => [...queryKeys.chat.all, "list"] as const,
    messages: (chatId: string) =>
      [...queryKeys.chat.all, "messages", chatId] as const,
  },
};
