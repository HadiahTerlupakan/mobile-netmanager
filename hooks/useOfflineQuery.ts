import { useCallback, useEffect, useRef, useState } from 'react';
import { DatabaseService } from '../services/DatabaseService';
import { SyncService } from '../services/SyncService';

interface QueryOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  enabled?: boolean;
}

export const useOfflineQuery = <T>(options: QueryOptions<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isOfflineData, setIsOfflineData] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchData = useCallback(async () => {
    const currentOptions = optionsRef.current;
    if (currentOptions.enabled === false) return;

    setIsLoading(true);
    setError(null);
    setIsOfflineData(false);

    try {
      const isOnline = await SyncService.isOnline();

      if (isOnline) {
        // --- ONLINE ---
        try {
          const result = await currentOptions.fetcher();
          setData(result);
          
          // Save to Cache
          await DatabaseService.saveOfflineData(currentOptions.key, result);
          currentOptions.onSuccess?.(result);
        } catch (err) {
            console.warn(`[useOfflineQuery] Online fetch failed for ${currentOptions.key}, falling back to cache.`);
            // Fallback to cache if online fetch fails
            const cached = await DatabaseService.getOfflineData(currentOptions.key);
            if (cached) {
                setData(cached as T);
                setIsOfflineData(true);
                currentOptions.onSuccess?.(cached as T);
            } else {
                throw err;
            }
        }
      } else {
        // --- OFFLINE ---
        console.log(`[useOfflineQuery] Offline. Loading from cache: ${currentOptions.key}`);
        const cached = await DatabaseService.getOfflineData(currentOptions.key);
        if (cached) {
          setData(cached as T);
          setIsOfflineData(true);
          currentOptions.onSuccess?.(cached as T);
        } else {
           // No cache available
           setError(new Error('No internet and no cached data available.'));
        }
      }
    } catch (err) {
      console.error(`[useOfflineQuery] Error in ${currentOptions.key}:`, err);
      setError(err);
      currentOptions.onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, []); // Stable fetchData

  // Initial fetch
  useEffect(() => {
    if (options.enabled !== false) {
      fetchData();
    }
  }, [options.key, options.enabled, fetchData]);

  return { data, isLoading, error, isOfflineData, refetch: fetchData };
};
