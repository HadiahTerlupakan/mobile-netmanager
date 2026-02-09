/**
 * TanStack Query Client Configuration
 *
 * Setup QueryClient dengan:
 * - Default options untuk queries dan mutations
 * - AsyncStorage persister untuk offline caching
 */

import { Storage } from "@/utils/storage";
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

// AsyncStorage-based Persister untuk menyimpan cache ke storage
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => await Storage.getItem(key),
    setItem: async (key, value) => {
      await Storage.setItem(key, value);
    },
    removeItem: async (key) => {
      await Storage.removeItem(key);
    },
  },
  key: "TANSTACK_QUERY_CACHE",
  throttleTime: 1000, // Throttle writes ke 1 detik
});

// Query key factory patterns
export const queryKeys = {
  // Work Orders
  workOrders: {
    all: ["workOrders"] as const,
    list: (filter?: string) =>
      filter ? [...queryKeys.workOrders.all, "list", filter] as const : [...queryKeys.workOrders.all, "list"] as const,
    detail: (id: string) =>
      [...queryKeys.workOrders.all, "detail", id] as const,
  },

  // Inventory / Barang
  inventory: {
    all: ["inventory"] as const,
    list: (gudangId?: string) => gudangId ? [...queryKeys.inventory.all, "list", gudangId] as const : [...queryKeys.inventory.all, "list"] as const,
    detail: (id: string) => [...queryKeys.inventory.all, "detail", id] as const,
    history: (filter?: string) => filter ? [...queryKeys.inventory.all, "history", filter] as const : [...queryKeys.inventory.all, "history"] as const,
    warehouses: () => [...queryKeys.inventory.all, "warehouses"] as const,
    stats: () => [...queryKeys.inventory.all, "stats"] as const,
    master: (mode?: string) => mode ? [...queryKeys.inventory.all, "master", mode] as const : [...queryKeys.inventory.all, "master"] as const,
  },

  // Attendance
  attendance: {
    all: ["attendance"] as const,
    today: () => [...queryKeys.attendance.all, "today"] as const,
    history: () => [...queryKeys.attendance.all, "history"] as const,
    status: () => [...queryKeys.attendance.all, "status"] as const,
    geofence: () => [...queryKeys.attendance.all, "geofence"] as const,
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
    summary: () => [...queryKeys.canvasing.all, "summary"] as const,
    detail: (id: string) => [...queryKeys.canvasing.all, "detail", id] as const,
  },

  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
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
    global: () => [...queryKeys.chat.all, "global"] as const,
    users: (search?: string) => [...queryKeys.chat.all, "users", search] as const,
    messages: (chatId: string) =>
      [...queryKeys.chat.all, "messages", chatId] as const,
  },

  // Profile
  profile: {
    all: ["profile"] as const,
    detail: () => [...queryKeys.profile.all, "detail"] as const,
  },
};
