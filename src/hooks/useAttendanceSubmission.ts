import { useCallback, useState } from "react";
import {
  isOfflineMutationQueuedResult,
  useApiMutation,
} from "@/hooks/queries";
import { queryKeys } from "@/lib/queryClient";
import { AttendanceTelemetryService } from "@/services/AttendanceTelemetryService";
import { LocationTrackingService } from "@/services/LocationTrackingService";
import { SyncService } from "@/services/SyncService";
import { uploadService } from "@/services/UploadService";
import { ensureAttendanceRequestId } from "@/utils/attendanceIdempotency";
import { presentAppError, presentInfoMessage } from "@/utils/errorPresenter";
import { logger } from "@/utils/logger";
import { Alert } from "react-native";
import * as Location from "expo-location";

type AttendanceUiStatus = "idle" | "checked-in" | "checked-out" | "loading";

interface UseAttendanceSubmissionDeps {
  user: { id: string } | null;
  status: AttendanceUiStatus;
  location: Location.LocationObject | null;
  locationName: string;
  capturedTime: Date | null;
  photo: string | null;
  captureWatermarkedPhoto: () => Promise<string | null>;
  refetchStatus: () => void;
  setPhoto: (photo: string | null) => void;
  setPendingCheckoutWarning: (warning: string | null) => void;
  setShowCheckoutWarning: (show: boolean) => void;
}

interface UseAttendanceSubmissionReturn {
  submitAttendance: () => Promise<void>;
  isSubmitting: boolean;
  isProcessing: boolean;
  loadingMessage: string;
  uploadProgress: number;
  setIsProcessing: (v: boolean) => void;
  setLoadingMessage: (msg: string) => void;
}

/**
 * Encapsulates the attendance submission logic including photo upload,
 * offline fallback, telemetry, and location tracking start/stop.
 */
export function useAttendanceSubmission({
  user,
  status,
  location,
  locationName,
  capturedTime,
  photo,
  captureWatermarkedPhoto,
  refetchStatus,
  setPhoto,
  setPendingCheckoutWarning,
  setShowCheckoutWarning,
}: UseAttendanceSubmissionDeps): UseAttendanceSubmissionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Memproses...");
  const [uploadProgress, setUploadProgress] = useState(0);

  const attendanceStatusQueryKey = queryKeys.attendance.status(user?.id);

  const checkInMutation = useApiMutation({
    endpoint: "/api/mobile/attendance/check-in",
    method: "POST",
    invalidateKeys: [attendanceStatusQueryKey],
    showErrorAlert: false,
    // Aktifkan toast offline default dari hook (showErrorAlert hanya
    // mengontrol error toast). Tanpa successMessage, hook akan emit
    // info "data disimpan offline" sendiri — caller cukup tidak duplikat.
    successMessage: "Check-in Berhasil!",
  });

  const checkOutMutation = useApiMutation({
    endpoint: "/api/mobile/attendance/check-out",
    method: "POST",
    invalidateKeys: [attendanceStatusQueryKey],
    showErrorAlert: false,
    successMessage: "Check-out Berhasil!",
  });

  const submitAttendance = useCallback(async () => {
    if (!photo || !location) {
      setIsProcessing(false);
      presentInfoMessage("Pastikan foto dan lokasi sudah tersedia.", "Data Belum Lengkap");
      return;
    }

    const mutation = status === "idle" ? checkInMutation : checkOutMutation;
    if (!isProcessing) setIsProcessing(true);

    setLoadingMessage("Memproses foto...");
    const processedUri = await captureWatermarkedPhoto();
    if (!processedUri) {
      setIsProcessing(false);
      Alert.alert("Error", "Gagal memproses foto.");
      return;
    }

    const isOnline = await SyncService.isOnline();
    const payload = ensureAttendanceRequestId({
      location: locationName,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      capturedAt: (capturedTime || new Date()).toISOString(),
    });

    AttendanceTelemetryService.track("attendance_submit_started", {
      requestId: payload.requestId,
      userId: user?.id,
      action: status === "idle" ? "check-in" : "check-out",
      networkState: isOnline ? "online" : "offline",
    });

    const offlineQueueMeta = {
      photos: [processedUri],
      photoType: "employee-attendance",
      targetField: "photoUrl",
      singleFile: true,
    };

    if (!isOnline) {
      setLoading(true);
      setUploadProgress(0);
      setLoadingMessage("Menyimpan data offline...");

      try {
        // Mutation akan resolve dengan offline-queued result; toast offline
        // di-emit oleh useApiMutation.onSuccess (successMessage path).
        await mutation.mutateAsync({
          ...payload,
          photoUrl: processedUri,
          meta: offlineQueueMeta,
        });

        setIsProcessing(false);
        setLoading(false);
        setPhoto(null);
      } catch (error) {
        setIsProcessing(false);
        setLoading(false);
        presentAppError(error, {
          screen: 'AttendanceScreen',
          route: '/(app)/absensi',
        });
      }

      return;
    }

    setLoading(true);
    setUploadProgress(0);
    try {
      setLoadingMessage("Mengupload foto...");
      AttendanceTelemetryService.track("attendance_photo_upload_started", {
        requestId: payload.requestId,
        userId: user?.id,
        action: status === "idle" ? "check-in" : "check-out",
        networkState: "online",
      });
      const uploadedUrls = await uploadService.uploadBatch(
        [processedUri],
        "employee-attendance",
        (_, __, progress) => {
          setUploadProgress(progress.percentage);
        }
      );
      const photoUrl = uploadedUrls[0];
      if (!photoUrl) throw new Error("Gagal upload foto.");

      AttendanceTelemetryService.track("attendance_photo_upload_succeeded", {
        requestId: payload.requestId,
        userId: user?.id,
        action: status === "idle" ? "check-in" : "check-out",
        networkState: "online",
      });

      setLoadingMessage("Mengirim data...");
      setUploadProgress(0);
      let data;

      try {
        data = await mutation.mutateAsync({ ...payload, photoUrl });
      } catch (mutationError) {
        try {
          await uploadService.deleteUploadedFile(photoUrl);
        } catch (cleanupError) {
          logger.warn('[Absensi] Failed to cleanup uploaded attendance photo:', cleanupError);
        }

        throw mutationError;
      }

      setIsProcessing(false);
      setLoading(false);
      setPhoto(null);

      if (isOfflineMutationQueuedResult(data)) {
        // Toast offline sudah di-emit oleh useApiMutation.onSuccess.
        return;
      }

      try {
        if (status === "idle") {
          logger.info('[Absensi] Check-in success, starting location tracking...');
          const trackingStarted = await LocationTrackingService.startTracking();
          logger.info(`[Absensi] Tracking started: ${trackingStarted}`);
        } else {
          logger.info('[Absensi] Check-out success, stopping location tracking...');
          await LocationTrackingService.stopTracking();
        }
      } catch (trackingError) {
        logger.error('[Absensi] Tracking error:', trackingError);
      }

      const warning = (data as { warning?: string })?.warning;

      if (status === "checked-in" && warning) {
        setIsProcessing(false);
        setLoading(false);
        setPendingCheckoutWarning(warning);
        setShowCheckoutWarning(true);
        return;
      }

      // Success toast di-emit oleh useApiMutation.onSuccess (successMessage).
      refetchStatus();
    } catch (error) {
      AttendanceTelemetryService.track("attendance_photo_upload_failed", {
        requestId: payload.requestId,
        userId: user?.id,
        action: status === "idle" ? "check-in" : "check-out",
        networkState: "online",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
      setIsProcessing(false);
      setLoading(false);
      presentAppError(error, {
        screen: 'AttendanceScreen',
        route: '/(app)/absensi',
      });
    }
  }, [
    photo,
    location,
    status,
    isProcessing,
    captureWatermarkedPhoto,
    locationName,
    capturedTime,
    checkInMutation,
    checkOutMutation,
    user?.id,
    refetchStatus,
    setPhoto,
    setPendingCheckoutWarning,
    setShowCheckoutWarning,
  ]);

  return {
    submitAttendance,
    isSubmitting: loading,
    isProcessing,
    loadingMessage,
    uploadProgress,
    setIsProcessing,
    setLoadingMessage,
  };
}
