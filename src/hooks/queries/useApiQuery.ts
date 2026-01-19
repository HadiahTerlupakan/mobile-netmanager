/**
 * useApiQuery - TanStack Query wrapper untuk API data fetching
 *
 * Menggantikan useOfflineQuery dengan fitur:
 * - Automatic caching via AsyncStorage
 * - Stale-while-revalidate
 * - Automatic background refetching
 * - Offline support
 */

import api from "@/services/api";
import { useNetInfo } from "@react-native-community/netinfo";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

type QueryFn<T> = () => Promise<T>;

interface ApiQueryOptions<T> extends Omit<
  UseQueryOptions<T, Error>,
  "queryFn"
> {
  /**
   * API endpoint (tanpa base URL)
   * Contoh: '/api/mobile/work-orders'
   */
  endpoint?: string;

  /**
   * Custom fetch function (opsional, override endpoint)
   */
  queryFn?: QueryFn<T>;
}

/**
 * Hook untuk fetching data dari API dengan TanStack Query
 *
 * @example
 * // Dengan endpoint
 * const { data, isLoading } = useApiQuery({
 *   queryKey: ['workOrders'],
 *   endpoint: '/api/mobile/work-orders'
 * });
 *
 * @example
 * // Dengan custom queryFn
 * const { data } = useApiQuery({
 *   queryKey: ['workOrders', id],
 *   queryFn: () => api.get(`/api/mobile/work-orders/${id}`).then(r => r.data)
 * });
 */
export function useApiQuery<T>(options: ApiQueryOptions<T>) {
  const { endpoint, queryFn, ...queryOptions } = options;

  const fetchFn: QueryFn<T> =
    queryFn ||
    (async () => {
      if (!endpoint) {
        throw new Error("useApiQuery: Either endpoint or queryFn is required");
      }
      const response = await api.get(endpoint);
      return response.data;
    });

  return useQuery<T, Error>({
    ...queryOptions,
    queryFn: fetchFn,
  });
}

/**
 * Backward-compatible wrapper untuk useOfflineQuery migration
 *
 * @deprecated Gunakan useApiQuery dengan queryKey pattern baru
 */
export function useOfflineQueryCompat<T>(
  options: {
    key: string;
    fetcher: () => Promise<T>;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
  } & Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">,
) {
  const { key, fetcher, onSuccess, onError, enabled, ...queryOptions } =
    options;

  const result = useQuery<T, Error>({
    queryKey: [key],
    queryFn: fetcher,
    enabled: enabled,
    ...queryOptions,
  });

  // Trigger callbacks for backward compatibility
  if (result.isSuccess && options.onSuccess) {
    options.onSuccess(result.data);
  }
  if (result.isError && options.onError) {
    options.onError(result.error);
  }

  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  return {
    data: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error,
    isOfflineData: isOffline, // Only show offline banner if actually offline
    refetch: result.refetch,
    isStale: result.isStale,
  };
}
