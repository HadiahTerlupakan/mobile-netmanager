import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { DatabaseService } from '@/services/DatabaseService';
import { logger } from '@/utils/logger';
import NetInfo from '@react-native-community/netinfo';
import api from '@/services/api';

// Simple in-memory cache for in-flight requests to prevent duplicates
const requestCache = new Map<string, Promise<any>>();

export interface OfflineQueryOptions<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData>
  extends UseQueryOptions<TQueryFnData, TError, TData> {
  queryKey: QueryKey; // QueryKey is required for offline storage key
  endpoint?: string;  // Optional endpoint for automatic fetch generation
}

/**
 * useOfflineQuery - Optimized Query Hook for Offline-First Data
 *
 * Features:
 * 1. Request Deduplication: Prevents "thundering herd" when multiple components request same data
 * 2. Offline Persistence: Automatically saves successful responses to local storage
 * 3. Offline Fallback: Returns cached data if network fails or device is offline
 * 4. Optimized Defaults: Higher staleTime/gcTime for less network usage
 */
export function useOfflineQuery<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData>(
  options: OfflineQueryOptions<TQueryFnData, TError, TData>
) {
  const { queryKey, queryFn, endpoint, ...restOptions } = options;

  // Create a unique key string for storage and deduplication
  const keyString = JSON.stringify(queryKey);

  // Construct the actual fetch function
  const actualQueryFn = queryFn || (async () => {
    if (!endpoint) {
      throw new Error("useOfflineQuery: Either endpoint or queryFn is required");
    }
    const response = await api.get(endpoint);
    return response.data;
  });

  const wrappedQueryFn = async (context: any) => {
    // 1. Check Network State
    const netState = await NetInfo.fetch();
    const isOffline = !netState.isConnected && netState.isInternetReachable === false;

    if (isOffline) {
       logger.info(`[OfflineQuery] Offline detected for ${keyString}, loading from storage`);
       const cached = await DatabaseService.getOfflineData<TQueryFnData>(keyString);
       if (cached) {
         return cached;
       }
       throw new Error('Offline and no cached data available');
    }

    // 2. Request Deduplication
    if (requestCache.has(keyString)) {
      logger.info(`[OfflineQuery] Deduplicating request for ${keyString}`);
      return requestCache.get(keyString) as Promise<TQueryFnData>;
    }

    // 3. Execute Request
    const promise = (async () => {
      try {
        // Execute the actual query
        // @ts-ignore - Context passing might need refinement but works for now
        const data = await actualQueryFn(context);

        // 4. Persist Success
        DatabaseService.saveOfflineData(keyString, data).catch(e =>
          logger.warn('[OfflineQuery] Failed to save offline data', e)
        );

        return data;
      } catch (error) {
        logger.warn(`[OfflineQuery] Request failed for ${keyString}, attempting offline fallback`, error);

        // 5. Error Fallback
        try {
          const cached = await DatabaseService.getOfflineData<TQueryFnData>(keyString);
          if (cached) {
            logger.info(`[OfflineQuery] Recovered with offline data for ${keyString}`);
            return cached;
          }
        } catch (storageError) {
          logger.warn('[OfflineQuery] Failed to retrieve offline fallback', storageError);
        }

        throw error;
      } finally {
        // Cleanup cache entry immediately after completion
        requestCache.delete(keyString);
      }
    })();

    requestCache.set(keyString, promise);
    return promise;
  };

  return useQuery({
    // Optimized defaults for mobile
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always',
    ...restOptions,
    queryKey,
    queryFn: wrappedQueryFn,
  });
}
