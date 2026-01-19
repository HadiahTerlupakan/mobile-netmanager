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

import { Config } from "@/constants/Config";
import api from "@/services/api";
import {
    useMutation,
    UseMutationOptions,
    useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
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
 * Retry helper with exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx) except timeout/network
      const status = error?.response?.status;
      const isNetworkError =
        error.code === "ECONNABORTED" || error.message === "Network Error";

      if (status && status >= 400 && status < 500 && !isNetworkError) {
        console.log(
          `[retryWithBackoff] Client error (${status}), not retrying`,
        );
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(
          `[retryWithBackoff] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Helper to upload a single file with retry
 */
async function uploadFile(
  uri: string,
  type: string = "general",
): Promise<string> {
  return retryWithBackoff(
    async () => {
      console.log("[uploadFile] Starting upload:", {
        uri: uri.substring(0, 50),
        type,
      });

      const formData = new FormData();
      const filename = uri.split("/").pop() || `upload_${Date.now()}.jpg`;

      // @ts-ignore - React Native FormData requires this structure
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: filename,
      });

      formData.append("type", type);

      const token = await SecureStore.getItemAsync("session_token");
      console.log("[uploadFile] Token available:", !!token);
      console.log(
        "[uploadFile] Uploading to:",
        `${Config.API_URL}/api/mobile/upload`,
      );

      const response = await axios.post(
        `${Config.API_URL}/api/mobile/upload`,
        formData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "multipart/form-data",
          },
          timeout: 60000, // 60 second timeout for large files
        },
      );

      console.log("[uploadFile] Upload successful:", response.data);

      if (response.data && response.data.url) {
        return response.data.url;
      }

      throw new Error("Gagal mengupload gambar - no URL returned");
    },
    3,
    1000,
  ); // 3 retries, starting with 1 second delay
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
    mutationFn: async (variables: any) => {
      let payload = { ...variables };

      // Handle photoMap uploads
      if (payload.meta?.photoMap) {
        const photoMap = payload.meta.photoMap as Record<string, string>;
        const photoType = payload.meta.photoType || "general";

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
        payload = {
          ...payload,
          latitude: payload.latitude ?? latitude,
          longitude: payload.longitude ?? longitude,
        };
      }

      // Make API request with updated payload
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
      let payload = { ...variables };

      // Handle photoMap uploads
      if (payload.meta?.photoMap) {
        const photoMap = payload.meta.photoMap as Record<string, string>;
        const photoType = payload.meta.photoType || "general";

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
              console.error(`Failed to upload ${field}:`, err);
              throw err;
            }
          },
        );

        await Promise.all(uploadPromises);

        // Check if fields follow 'photoN' pattern (for photos array)
        const arrayPattern = uploadResults.filter((r) =>
          /^photo\d+$/.test(r.field),
        );
        if (arrayPattern.length > 0) {
          // Collect into photos array for backend
          payload.photos = arrayPattern.map((r) => r.url);
        } else {
          // Assign to individual fields (e.g., startPhoto, endPhoto)
          uploadResults.forEach((r) => {
            payload[r.field] = r.url;
          });
        }
      }

      // Get location
      const { latitude, longitude } = await getCurrentLocation();

      payload = {
        ...payload,
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
