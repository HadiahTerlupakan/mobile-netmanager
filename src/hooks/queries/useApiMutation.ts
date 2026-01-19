/**
 * useApiMutation - TanStack Query wrapper untuk API mutations
 *
 * Menggantikan useOfflineMutation dengan fitur:
 * - Optimistic updates
 * - Automatic cache invalidation
 * - Retry pada error
 * - Geo-location tracking
 */

import api from "@/services/api";
import {
    useMutation,
    UseMutationOptions,
    useQueryClient,
} from "@tanstack/react-query";
import * as Location from "expo-location";
import { Alert } from "react-native";

type HttpMethod = "POST" | "PUT" | "PATCH" | "DELETE";

interface MutationMeta {
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string;
  photos?: string[];
  photoType?: string;
  watermarkLines?: string[];
  targetField?: string;
  singleFile?: boolean;
  photoMap?: Record<string, string>;
}

interface ApiMutationOptions<TData, TVariables> extends Omit<
  UseMutationOptions<TData, Error, TVariables>,
  "mutationFn"
> {
  /**
   * API endpoint
   */
  endpoint: string;

  /**
   * HTTP Method
   */
  method: HttpMethod;

  /**
   * Include geo-location in request
   */
  includeLocation?: boolean;

  /**
   * Query keys to invalidate on success
   */
  invalidateKeys?: readonly (readonly unknown[])[];

  /**
   * Show alert on success
   */
  successMessage?: string;

  /**
   * Show alert on error
   */
  showErrorAlert?: boolean;
}

/**
 * Get current location dengan timeout
 */
async function getCurrentLocation(
  timeoutMs = 5000,
): Promise<{ latitude: number | null; longitude: number | null }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { latitude: null, longitude: null };
    }

    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs),
    );

    const location = await Promise.race([locationPromise, timeoutPromise]);

    if (location) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    }
  } catch (error) {
    console.warn("[useApiMutation] Failed to get location:", error);
  }

  return { latitude: null, longitude: null };
}

/**
 * Hook untuk mutations API dengan TanStack Query
 *
 * @example
 * const mutation = useApiMutation({
 *   endpoint: '/api/mobile/work-orders',
 *   method: 'POST',
 *   includeLocation: true,
 *   invalidateKeys: [['workOrders']],
 *   onSuccess: (data) => console.log('Created:', data),
 * });
 *
 * mutation.mutate({ title: 'New WO', description: '...' });
 */
export function useApiMutation<TData = unknown, TVariables = unknown>(
  options: ApiMutationOptions<TData, TVariables>,
) {
  const queryClient = useQueryClient();
  const {
    endpoint,
    method,
    includeLocation = false,
    invalidateKeys = [],
    successMessage,
    showErrorAlert = true,
    ...mutationOptions
  } = options;

  return useMutation<TData, Error, TVariables>({
    ...mutationOptions,
    mutationFn: async (variables) => {
      let payload: any = { ...variables };

      // Add location if requested
      if (includeLocation) {
        const { latitude, longitude } = await getCurrentLocation();
        payload = {
          ...payload,
          latitude: payload.latitude ?? latitude,
          longitude: payload.longitude ?? longitude,
        };
      }

      // Make API request
      const response = await api.request({
        url: endpoint,
        method,
        data: payload,
      });

      return response.data;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      for (const keys of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: [...keys] });
      }

      // Show success message
      if (successMessage) {
        Alert.alert("Sukses", successMessage);
      }

      // Call original onSuccess - cast to any to avoid complex type inference
      (mutationOptions.onSuccess as any)?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      console.error("[useApiMutation] Error:", error);

      // Show error alert
      if (showErrorAlert) {
        const message =
          (error as any)?.response?.data?.error || "Gagal menyimpan data";
        Alert.alert("Error", message);
      }

      // Call original onError - cast to any to avoid complex type inference
      (mutationOptions.onError as any)?.(error, variables, context);
    },
  });
}

/**
 * Backward-compatible interface untuk useOfflineMutation migration
 *
 * @deprecated Gunakan useApiMutation langsung
 */
export function useOfflineMutationCompat() {
  const queryClient = useQueryClient();

  const mutate = async (
    variables: any,
    options: {
      url: string;
      method: HttpMethod;
      onSuccess?: (data: any, isOffline: boolean) => void;
      onError?: (error: any) => void;
      silent?: boolean;
    },
  ) => {
    try {
      // Get location
      const { latitude, longitude } = await getCurrentLocation();

      const payload = {
        ...variables,
        latitude: variables.latitude ?? latitude,
        longitude: variables.longitude ?? longitude,
      };

      const response = await api.request({
        url: options.url,
        method: options.method,
        data: payload,
      });

      options.onSuccess?.(response.data, false);
      return response.data;
    } catch (error: any) {
      console.error("[useOfflineMutationCompat] Error:", error);
      options.onError?.(error);

      if (!options.silent) {
        const message = error?.response?.data?.error || "Gagal menyimpan data";
        Alert.alert("Error", message);
      }

      throw error;
    }
  };

  return { mutate, isLoading: false };
}
