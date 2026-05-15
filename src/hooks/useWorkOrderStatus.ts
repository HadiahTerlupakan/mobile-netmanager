import { useCallback, useState } from "react";
import * as Location from "expo-location";
import {
  isOfflineMutationQueuedResult,
  queryKeys,
  useApiMutation,
} from "@/hooks/queries";
import { uploadService } from "@/services/UploadService";
import { useLocationWithTimeout } from "@/hooks/useLocationWithTimeout";
import { presentAppError, presentInfoMessage, presentSuccessMessage } from "@/utils/errorPresenter";
import { logger } from "@/utils/logger";

interface UseWorkOrderStatusOptions {
  workOrderId: string | null;
  location: Location.LocationObject | null;
  onRefresh: () => void;
  onNavigateToComplete: (workOrderId: string) => void;
}

interface UseWorkOrderStatusReturn {
  /** Trigger a status transition (START, PAUSE, COMPLETE) */
  handleUpdateStatus: (action: "START" | "PAUSE" | "COMPLETE") => Promise<void>;
  /** Submit a comment/note activity with optional photo */
  handleUpdateActivity: (notes: string, photo: string | null) => Promise<boolean>;
  /** Whether a status update is currently being processed */
  isProcessingStatus: boolean;
  /** Current loading message for the loading modal */
  loadingMessage: string;
  /** Whether the status mutation is pending */
  actionLoading: boolean;
  /** Whether the activity mutation is pending */
  updateConfigLoading: boolean;
}

/**
 * Manages work order status transitions (start/pause/complete) and
 * activity submissions (comments with optional photo upload).
 * Uses location with timeout internally for geo-tagging.
 */
export function useWorkOrderStatus({
  workOrderId,
  location,
  onRefresh,
  onNavigateToComplete,
}: UseWorkOrderStatusOptions): UseWorkOrderStatusReturn {
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Memproses...");

  const { getLocationWithTimeout } = useLocationWithTimeout();

  const { mutate: updateStatusMutation, isPending: actionLoading } = useApiMutation({
    endpoint: `/api/mobile/work-orders/${workOrderId ?? ""}/update`,
    method: "POST",
    invalidateKeys: workOrderId
      ? [queryKeys.workOrders.detail(workOrderId)]
      : [],
  });

  const { mutate: updateActivityMutation, isPending: updateConfigLoading } = useApiMutation({
    endpoint: `/api/mobile/work-orders/${workOrderId ?? ""}/update`,
    method: "POST",
    invalidateKeys: workOrderId
      ? [queryKeys.workOrders.detail(workOrderId)]
      : [],
  });

  /** Handle status transitions: START, PAUSE, or navigate to COMPLETE screen */
  const handleUpdateStatus = useCallback(
    async (action: "START" | "PAUSE" | "COMPLETE") => {
      if (!workOrderId) {
        presentInfoMessage("ID Work Order tidak valid.", "Perhatian");
        return;
      }

      if (action === "COMPLETE") {
        onNavigateToComplete(workOrderId);
        return;
      }

      setIsProcessingStatus(true);
      setLoadingMessage("Mencari Lokasi...");

      try {
        const { latitude, longitude, locationName } =
          await getLocationWithTimeout(location);

        setLoadingMessage("Mengirim Data...");

        const payload = {
          action,
          latitude,
          longitude,
          locationName,
          timestamp: new Date().toISOString(),
        };

        updateStatusMutation(
          {
            ...payload,
            photoUrl: null,
            meta: {
              photos: [],
              targetField: "photoUrl",
              singleFile: true,
              photoType: "work-order-updates",
              watermarkLines: [],
            },
          },
          {
            onSuccess: (data) => {
              setLoadingMessage("Berhasil!");
              const isOffline = isOfflineMutationQueuedResult(data);
              if (isOffline) {
                presentInfoMessage("Update disimpan di antrian.", "Offline");
              } else {
                onRefresh();
              }
              setIsProcessingStatus(false);
            },
            onError: (err) => {
              presentAppError(err, {
                screen: "WorkOrderDetailScreen",
                route: "/(app)/work-order-detail/[id]",
              });
              setIsProcessingStatus(false);
            },
          },
        );
      } catch (error) {
        setIsProcessingStatus(false);
        presentAppError(error, {
          screen: "WorkOrderDetailScreen",
          route: "/(app)/work-order-detail/[id]",
        });
      }
    },
    [workOrderId, location, getLocationWithTimeout, updateStatusMutation, onRefresh, onNavigateToComplete],
  );

  /**
   * Submit a comment/note activity with optional photo.
   * Returns true if submission was initiated, false if validation failed.
   */
  const handleUpdateActivity = useCallback(
    async (notes: string, photo: string | null): Promise<boolean> => {
      if (!notes && !photo) {
        presentInfoMessage("Mohon isi catatan atau upload foto.", "Perhatian");
        return false;
      }

      if (!workOrderId) {
        presentInfoMessage("ID Work Order tidak valid.", "Perhatian");
        return false;
      }

      setIsProcessingStatus(true);
      setLoadingMessage("Mencari Lokasi...");

      const { latitude, longitude, locationName } =
        await getLocationWithTimeout(location);

      // Upload photo first if exists
      let uploadedPhotoUrl: string | null = null;
      if (photo) {
        setLoadingMessage("Mengupload Foto...");

        try {
          uploadedPhotoUrl = await uploadService.uploadFile(photo, "work-order-updates");
          logger.info("[WO Comment] Photo uploaded:", uploadedPhotoUrl);
        } catch (uploadError: any) {
          logger.error("[WO Comment] Photo upload failed:", uploadError);
          presentAppError(uploadError, {
            screen: "WorkOrderDetailScreen",
            route: "/(app)/work-order-detail/[id]",
          });
          setIsProcessingStatus(false);
          return false;
        }
      }

      setLoadingMessage("Mengirim Update...");

      const payload = {
        action: "COMMENT",
        latitude,
        longitude,
        locationName,
        notes,
        photoUrl: uploadedPhotoUrl,
        timestamp: new Date().toISOString(),
      };

      updateActivityMutation(payload, {
        onSuccess: (data) => {
          setLoadingMessage("Berhasil!");
          const isOffline = isOfflineMutationQueuedResult(data);
          if (isOffline) {
            presentInfoMessage("Update disimpan di antrian.", "Offline");
          } else {
            presentSuccessMessage("Catatan Diperbarui");
            onRefresh();
          }
          setIsProcessingStatus(false);
        },
        onError: (err) => {
          presentAppError(err, {
            screen: "WorkOrderDetailScreen",
            route: "/(app)/work-order-detail/[id]",
          });
          setIsProcessingStatus(false);
        },
      });

      return true;
    },
    [workOrderId, location, getLocationWithTimeout, updateActivityMutation, onRefresh],
  );

  return {
    handleUpdateStatus,
    handleUpdateActivity,
    isProcessingStatus,
    loadingMessage,
    actionLoading,
    updateConfigLoading,
  };
}
