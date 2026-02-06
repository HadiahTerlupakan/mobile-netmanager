/**
 * useApiMutation - TanStack Query wrapper untuk API mutations
 *
 * Menggantikan useOfflineMutation dengan fitur:
 * - Optimistic updates
 * - Automatic cache invalidation
 * - Retry pada error
 * - Geo-location tracking
 * - Automatic file upload
 */

import api from "@/services/api";
import { DatabaseService } from "@/services/DatabaseService";
import { SyncService } from "@/services/SyncService";
import { uploadService, UploadType } from "@/services/UploadService";
import { getUserFriendlyError } from "@/utils/errorHandling";
import { logger } from "@/utils/logger";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { AxiosError, isAxiosError } from "axios";
import * as Location from "expo-location";
import { Alert } from "react-native";

type HttpMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface MutationMeta {
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

// Interface standar untuk variables yang memiliki meta data
export interface ApiMutationVariables {
  [key: string]: unknown;
  meta?: MutationMeta;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

interface ApiMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, AxiosError<ApiErrorResponse>, TVariables>, "mutationFn"> {
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
    logger.warn("[useApiMutation] Failed to get location:", error);
  }

  return { latitude: null, longitude: null };
}

/**
 * Helper to upload a single file using UploadService
 */
async function uploadFile(
  uri: string,
  type: string = "general",
): Promise<string> {
  return uploadService.uploadFile(uri, type as UploadType);
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
 *   onSuccess: (data) => logger.info('Created:', data),
 * });
 *
 * mutation.mutate({ title: 'New WO', description: '...' });
 */
export function useApiMutation<
  TData = unknown,
  TVariables extends ApiMutationVariables = ApiMutationVariables,
>(options: ApiMutationOptions<TData, TVariables>) {
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

  return useMutation<TData, AxiosError<ApiErrorResponse>, TVariables>({
    ...mutationOptions,
    mutationFn: async (variables) => {
      const payload: Record<string, unknown> = { ...variables };

      try {
        // Handle photoMap uploads
        if (variables.meta?.photoMap) {
          const photoMap = variables.meta.photoMap;
          const photoType = variables.meta.photoType || "general";

          // Upload all photos in parallel
          const uploadPromises = Object.entries(photoMap).map(
            async ([field, uri]) => {
              if (!uri || uri.startsWith("http")) return; // Skip empty or already uploaded
              const url = await uploadFile(uri, photoType);
              payload[field] = url; // Update payload with server URL
            },
          );

          await Promise.all(uploadPromises);
        }

        // Add location if requested
        if (includeLocation) {
          const { latitude, longitude } = await getCurrentLocation();
          payload.latitude = payload.latitude ?? latitude;
          payload.longitude = payload.longitude ?? longitude;
        }

        // Check connectivity before request
        const isOnline = await SyncService.isOnline();
        if (!isOnline) {
          throw new Error("Offline");
        }

        // Make API request with updated payload
        const response = await api.request<TData>({
          url: endpoint,
          method,
          data: payload,
          timeout: 15000, // Timeout for mobile networks
        });

        return response.data;
      } catch (error) {
        const isNetworkError =
          isAxiosError(error) &&
          (error.code === "ECONNABORTED" ||
            error.message === "Network Error" ||
            !error.response);
        const isExplicitOffline =
          error instanceof Error && error.message === "Offline";

        if (isExplicitOffline || isNetworkError) {
          logger.info(
            `[useApiMutation] Offline/Network error detected. Queuing mutation: ${method} ${endpoint}`,
          );

          // Add to offline queue
          await DatabaseService.addToQueue(
            endpoint,
            method,
            payload,
            (variables.meta as Record<string, unknown>) || {},
          );

          // Return dummy data to satisfy TData and trigger onSuccess
          return { __offline_queued__: true } as unknown as TData;
        }

        throw error;
      }
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      for (const keys of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: [...keys] });
      }

      const isOffline = (data as Record<string, unknown>)?.__offline_queued__;

      // Show success message
      if (successMessage) {
        if (isOffline) {
          Alert.alert(
            "Offline",
            "Koneksi tidak tersedia. Data disimpan offline dan akan dikirim otomatis saat internet kembali.",
          );
        } else {
          Alert.alert("Sukses", successMessage);
        }
      } else if (isOffline && showErrorAlert) {
        // If no success message but we want to show alerts, notify about offline status
        Alert.alert(
          "Offline",
          "Koneksi tidak tersedia. Perubahan Anda disimpan secara lokal.",
        );
      }

      // Call original onSuccess
      (mutationOptions as any).onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      logger.error("[useApiMutation] Error:", error);

      // Show error alert
      if (showErrorAlert) {
        const friendlyError = getUserFriendlyError(error);
        Alert.alert(friendlyError.title, friendlyError.message);
      }

      // Call original onError
      (mutationOptions as any).onError?.(error, variables, context);
    },
  });
}

/**
 * Backward-compatible interface untuk useOfflineMutation migration
 *
 * @deprecated Gunakan useApiMutation langsung
 */
export function useOfflineMutationCompat<TData = any>() {
  const mutate = async (
    variables: ApiMutationVariables,
    options: {
      url: string;
      method: HttpMethod;
      onSuccess?: (data: TData, isOffline: boolean) => void;
      onError?: (error: AxiosError<ApiErrorResponse>) => void;
      silent?: boolean;
    },
  ) => {
    try {
      const payload: Record<string, any> = { ...variables };

      // Handle photoMap uploads
      if (variables.meta?.photoMap) {
        const photoMap = variables.meta.photoMap;
        const photoType = variables.meta.photoType || "general";

        // Upload all photos in parallel and collect results
        const uploadResults: { field: string; url: string }[] = [];
        const uploadPromises = Object.entries(photoMap).map(
          async ([field, uri]) => {
            if (!uri) return; // Skip empty
            if (uri.startsWith("http") || uri.startsWith("/uploads")) {
              // Already uploaded, just collect it
              uploadResults.push({ field, url: uri });
              return;
            }
            try {
              const url = await uploadFile(uri, photoType);
              uploadResults.push({ field, url });
            } catch (err) {
              logger.error(`Failed to upload ${field}:`, err);
              throw err;
            }
          },
        );

        await Promise.all(uploadPromises);

        // Get target field name from meta or default based on pattern
        const targetField = (payload.meta as any)?.targetField;

        // Check if fields follow 'photoN' pattern (for photos array)
        const arrayPattern = uploadResults.filter((r) =>
          /^photo\d+$/.test(r.field),
        );
        if (arrayPattern.length > 0) {
          // Use targetField if specified, otherwise default to 'photos'
          const fieldName = targetField || "photos";
          payload[fieldName] = arrayPattern.map((r) => r.url);
        } else {
          // Assign to individual fields (e.g., startPhoto, endPhoto)
          uploadResults.forEach((r) => {
            payload[r.field] = r.url;
          });
        }
      }

      // Get location
      const { latitude, longitude } = await getCurrentLocation();

      payload.latitude = variables.latitude ?? latitude;
      payload.longitude = variables.longitude ?? longitude;

      try {
        // Check connectivity before request
        const isOnline = await SyncService.isOnline();
        if (!isOnline) {
          throw new Error("Offline");
        }

        const response = await api.request({
          url: options.url,
          method: options.method,
          data: payload,
          timeout: 15000,
        });

        options.onSuccess?.(response.data, false);
        return response.data;
      } catch (error) {
        const isNetworkError =
          isAxiosError(error) &&
          (error.code === "ECONNABORTED" ||
            error.message === "Network Error" ||
            !error.response);
        const isExplicitOffline =
          error instanceof Error && error.message === "Offline";

        if (isExplicitOffline || isNetworkError) {
          logger.info(
            `[useOfflineMutationCompat] Offline/Network error detected. Queuing: ${options.method} ${options.url}`,
          );

          await DatabaseService.addToQueue(
            options.url,
            options.method,
            payload,
            (variables.meta as Record<string, unknown>) || {},
          );

          const result = { __offline_queued__: true } as unknown as TData;
          options.onSuccess?.(result, true);
          return result;
        }

        throw error;
      }
    } catch (error) {
      logger.error("[useOfflineMutationCompat] Error:", error);
      options.onError?.(error as AxiosError<ApiErrorResponse>);

      if (!options.silent) {
        let message = "Gagal menyimpan data";
        if (error instanceof AxiosError) {
          message =
            error.response?.data?.error ||
            error.response?.data?.message ||
            message;
        }
        Alert.alert("Error", message);
      }

      throw error;
    }
  };

  return { mutate, isLoading: false };
}
