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
import { HTTP_TIMEOUTS } from "@/constants/httpTimeouts";
import { AttendanceTelemetryService } from "@/services/AttendanceTelemetryService";
import { DatabaseService } from "@/services/DatabaseService";
import { SyncService } from "@/services/SyncService";
import { uploadService, UploadType } from "@/services/UploadService";
import {
  buildAttendanceIdempotencyHeaders,
  ensureAttendanceRequestId,
  isAttendanceEndpoint,
} from "@/utils/attendanceIdempotency";
import { extractApiErrorMessage } from "@/utils/errorHandling";
import { presentAppError, presentInfoMessage, presentSuccessMessage } from "@/utils/errorPresenter";
import {
  isUnggahHabisWaktu,
  salinFotoMetaUntukAntrean,
  unggahFotoMeta,
  unggahFotoTanpaUlang,
  unggahPetaFoto,
} from "@/utils/fotoMutasi";
import { logger } from "@/utils/logger";
import { requestForegroundLocationWithDisclosure } from "@/utils/locationDisclosure";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { AxiosError, isAxiosError } from "axios";
import * as Location from "expo-location";

type HttpMethod = "POST" | "PUT" | "PATCH" | "DELETE";

/** Pesan galat internal yang membelokkan mutasi ke antrean offline. */
const OFFLINE_ERROR_MESSAGE = "Offline";

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

export interface OfflineQueuedMutationResult {
  __offline_queued__: true;
  kind: "offline-queued";
  endpoint: string;
  method: HttpMethod;
  queuedAt: string;
}

export type ApiMutationResult<TData> = TData | OfflineQueuedMutationResult;

export const isOfflineMutationQueuedResult = (
  value: unknown,
): value is OfflineQueuedMutationResult => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<OfflineQueuedMutationResult>;
  return result.__offline_queued__ === true && result.kind === "offline-queued";
};

type ApiMutationError = AxiosError<ApiErrorResponse> | Error;

interface ApiMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<ApiMutationResult<TData>, ApiMutationError, TVariables>, "mutationFn"> {
  /**
   * API endpoint
   */
  endpoint: string | ((variables: TVariables) => string);

  /**
   * Build request payload from mutation variables before transport.
   */
  buildPayload?: (variables: TVariables) => Record<string, unknown>;

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
  timeoutMs = 15_000,
): Promise<{ latitude: number | null; longitude: number | null }> {
  try {
    const { status } = await requestForegroundLocationWithDisclosure();
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
 * Unggah `meta.photos` di jalur online. Habis waktu, atau galat saat NetInfo
 * sudah offline, menjadi galat offline supaya mutasi diantre dengan salinan
 * foto. Galat lain (mis. 413) diteruskan; pemanggil masih memegang isian form.
 */
async function unggahFotoMetaAtauAntre(
  meta: MutationMeta | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await unggahFotoMeta(meta, payload, unggahFotoTanpaUlang);
  } catch (error) {
    if (isUnggahHabisWaktu(error) || !(await SyncService.isOnline())) {
      throw new Error(OFFLINE_ERROR_MESSAGE);
    }
    throw error;
  }
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
    onSuccess,
    onError,
    buildPayload,
    ...mutationOptions
  } = options;

  const getEndpoint = (variables: TVariables) =>
    typeof endpoint === "function" ? endpoint(variables) : endpoint;

  return useMutation<ApiMutationResult<TData>, ApiMutationError, TVariables>({
    ...mutationOptions,
    mutationFn: async (variables) => {
      const startedAt = Date.now();
      const resolvedEndpoint = getEndpoint(variables);
      const attendanceMutation = isAttendanceEndpoint(resolvedEndpoint);
      const payload: Record<string, unknown> = buildPayload
        ? buildPayload(variables)
        : attendanceMutation
          ? ensureAttendanceRequestId({ ...variables })
          : { ...variables };
      const requestId = typeof payload.requestId === "string" ? payload.requestId : undefined;

      if (attendanceMutation) {
        AttendanceTelemetryService.track("attendance_submit_started", {
          requestId,
          endpoint: resolvedEndpoint,
          networkState: "online",
        });
      }

      try {
        await unggahPetaFoto(variables.meta, payload, uploadFile);

        // Add location if requested
        if (includeLocation) {
          const { latitude, longitude } = await getCurrentLocation();
          payload.latitude = payload.latitude ?? latitude;
          payload.longitude = payload.longitude ?? longitude;
        }

        // Check connectivity before request
        const isOnline = await SyncService.isOnline();
        if (!isOnline) {
          throw new Error(OFFLINE_ERROR_MESSAGE);
        }

        // Setelah cek online: saat offline, unggahan hanya menunda antrean.
        await unggahFotoMetaAtauAntre(variables.meta, payload);

        // Make API request with updated payload.
        // skipErrorToast=true → axios interceptor tidak emit toast; biarkan
        // onError di hook (presentAppError) yang pegang keputusan UI agar
        // tidak terjadi double/triple toast (interceptor + onError + caller).
        const response = await api.request<TData>({
          url: resolvedEndpoint,
          method,
          data: payload,
          timeout: HTTP_TIMEOUTS.standard,
          headers: buildAttendanceIdempotencyHeaders(requestId),
          skipErrorToast: true,
        });

        if (attendanceMutation) {
          AttendanceTelemetryService.track("attendance_api_succeeded", {
            requestId,
            endpoint: resolvedEndpoint,
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
          error instanceof Error && error.message === OFFLINE_ERROR_MESSAGE;

        if (isExplicitOffline || isNetworkError) {
          logger.info(
            `[useApiMutation] Offline/Network error detected. Queuing mutation: ${method} ${resolvedEndpoint}`,
          );

          const queueMeta = await salinFotoMetaUntukAntrean({
            ...((variables.meta as Record<string, unknown>) || {}),
            ...(requestId ? { requestId } : {}),
          });

          // Add to offline queue
          await DatabaseService.addToQueue(
            resolvedEndpoint,
            method,
            payload,
            queueMeta,
          );

          return {
            __offline_queued__: true,
            kind: "offline-queued",
            endpoint: resolvedEndpoint,
            method,
            queuedAt: new Date().toISOString(),
          } satisfies OfflineQueuedMutationResult;
        }

        if (attendanceMutation) {
          AttendanceTelemetryService.track("attendance_api_failed", {
            requestId,
            endpoint: resolvedEndpoint,
            reason: error instanceof Error ? error.message : "Unknown error",
            latencyMs: Date.now() - startedAt,
          });
        }

        throw error;
      }
    },
    onSuccess: (data, variables, onMutateResult, context) => {
      const isOffline = isOfflineMutationQueuedResult(data);

      if (!isOffline) {
        for (const keys of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: [...keys] });
        }
      }

      if (successMessage) {
        if (isOffline) {
          presentInfoMessage(
            "Koneksi tidak tersedia. Data disimpan offline dan akan dikirim otomatis saat internet kembali.",
            "Offline",
          );
        } else {
          presentSuccessMessage(successMessage);
        }
      } else if (isOffline && showErrorAlert) {
        presentInfoMessage(
          "Koneksi tidak tersedia. Perubahan Anda disimpan secara lokal.",
          "Offline",
        );
      }

      onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response) {
        const { status, data } = error.response;
        const backendMessage = extractApiErrorMessage(data);
        logger.error(
          `[useApiMutation] ${method} ${endpoint} failed:`,
          `status=${status}`,
          backendMessage || "No message",
        );
      } else {
        logger.error(
          `[useApiMutation] ${method} ${endpoint} failed:`,
          error instanceof Error ? error.message : error,
        );
      }

      if (showErrorAlert) {
        presentAppError(error, {
          source: "mutation",
          route: typeof endpoint === "function" ? endpoint(variables) : endpoint,
          report: false,
        });
      }

      onError?.(error, variables, onMutateResult, context);
    },
  });
}
