/**
 * useApiMutation - TanStack Query wrapper untuk API mutations
 *
 * Fitur:
 * - Optimistic updates
 * - Automatic cache invalidation
 * - Retry pada error
 * - Geo-location tracking
 * - Automatic file upload
 */

import api from "@/services/api";
import { AttendanceTelemetryService } from "@/services/AttendanceTelemetryService";
import { DatabaseService } from "@/services/DatabaseService";
import { SyncService } from "@/services/SyncService";
import { uploadService, UploadType } from "@/services/UploadService";
import {
  buildAttendanceIdempotencyHeaders,
  ensureAttendanceRequestId,
  isAttendanceEndpoint,
} from "@/utils/attendanceIdempotency";
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
  requestId?: string;
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
      const startedAt = Date.now();
      const attendanceMutation = isAttendanceEndpoint(endpoint);
      const payload: Record<string, unknown> = attendanceMutation
        ? ensureAttendanceRequestId({ ...variables })
        : { ...variables };
      const requestId = typeof payload.requestId === "string" ? payload.requestId : undefined;

      if (attendanceMutation) {
        AttendanceTelemetryService.track("attendance_submit_started", {
          requestId,
          endpoint,
          networkState: "online",
        });
      }

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
          headers: buildAttendanceIdempotencyHeaders(requestId),
        });

        if (attendanceMutation) {
          AttendanceTelemetryService.track("attendance_api_succeeded", {
            requestId,
            endpoint,
            networkState: "online",
            latencyMs: Date.now() - startedAt,
          });
        }

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

          const queueMeta = {
            ...((variables.meta as Record<string, unknown>) || {}),
            ...(requestId ? { requestId } : {}),
          };

          // Add to offline queue
          await DatabaseService.addToQueue(
            endpoint,
            method,
            payload,
            queueMeta,
          );

          if (attendanceMutation) {
            const queueDepth = (await DatabaseService.getPendingQueue()).length;
            AttendanceTelemetryService.track("attendance_queued_offline", {
              requestId,
              endpoint,
              networkState: "offline",
              queueDepth,
            });
          }

          // Return dummy data to satisfy TData and trigger onSuccess
          return { __offline_queued__: true } as unknown as TData;
        }

        if (attendanceMutation) {
          AttendanceTelemetryService.track("attendance_api_failed", {
            requestId,
            endpoint,
            reason: error instanceof Error ? error.message : "Unknown error",
            latencyMs: Date.now() - startedAt,
          });
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
      // Log concise error info instead of raw AxiosError object
      if (isAxiosError(error) && error.response) {
        const { status, data } = error.response;
        const backendMessage = (data as any)?.message || (data as any)?.error;
        logger.error(
          `[useApiMutation] ${method} ${endpoint} failed:`,
          `status=${status}`,
          backendMessage || 'No message'
        );
      } else {
        logger.error(
          `[useApiMutation] ${method} ${endpoint} failed:`,
          error instanceof Error ? error.message : error
        );
      }

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
