/**
 * useApiQuery - TanStack Query wrapper untuk API data fetching
 *
 * Fitur:
 * - Automatic caching via Secure Storage (MMKV)
 * - Stale-while-revalidate
 * - Automatic background refetching
 * - Offline support
 */

import api from "@/services/api";
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

