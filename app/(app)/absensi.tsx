import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { AttendanceSkeleton } from "@/components/molecules/AttendanceSkeleton";
import LoadingModal from "@/components/molecules/LoadingModal";
import { PendingSyncBadge } from "@/components/organisms/attendance/PendingSyncBadge";
import { useAuth } from "@/context/AuthContext";
import {
  isOfflineMutationQueuedResult,
  useApiMutation,
  useApiQuery,
} from "@/hooks/queries";
import { queryKeys } from "@/lib/queryClient";
import { AttendanceTelemetryService } from "@/services/AttendanceTelemetryService";
import { DatabaseService } from "@/services/DatabaseService";
import { LocationTrackingService } from "@/services/LocationTrackingService";
import { SyncService } from "@/services/SyncService";
import { uploadService } from "@/services/UploadService";
import { ensureAttendanceRequestId } from "@/utils/attendanceIdempotency";
import { deriveAttendanceStatus } from "@/utils/attendanceStatus";
import {
  AttendanceGeofencePolicy,
  resolveAttendanceGeofenceAction,
} from "@/utils/attendanceGeofencePolicy";
import { generateSignature } from "@/utils/crypto";
import { formatDate } from "@/utils/date";
import { presentAppError, presentInfoMessage, presentSuccessMessage } from "@/utils/errorPresenter";
import { logger } from "@/utils/logger";
import {
  AlertTriangle,
  CalendarOff,
  Camera as LucideCamera,
  Clock as ClockIcon,
  MapPin,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import tw from "twrnc";
import { AppFeature } from '@/constants/features';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

// --- Types ---
interface GeofenceZone {
  siteId: string;
  siteName: string;
  latitude: number;
  longitude: number;
  radius: number;
}

type AttendanceUiStatus = "idle" | "checked-in" | "checked-out" | "loading";

// --- Utils ---
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const EARTH_RADIUS_METERS = 6371000;
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

// --- Memoized Sub-components ---

const DigitalClock = React.memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={tw`items-center`}>
      <Text style={tw`text-white font-bold text-5xl`}>
        {formatDate(time, "HH:mm")}
      </Text>
      <Text style={tw`text-blue-100 font-medium text-sm mt-1`}>
        {formatDate(time, "EEEE, d MMMM yyyy")}
      </Text>
    </View>
  );
});
DigitalClock.displayName = 'DigitalClock';

interface AttendanceHeaderProps {
  todayHoliday: { isHoliday: boolean; name: string | null };
  isTukarLiburWorkDay: boolean;
  isTukarLiburLeaveDay: boolean;
  isOffDay: boolean;
}

const AttendanceHeader = React.memo(({ todayHoliday, isTukarLiburWorkDay, isTukarLiburLeaveDay, isOffDay }: AttendanceHeaderProps) => {
  const bgColor = todayHoliday.isHoliday ? "bg-red-600" : "bg-blue-600";

  return (
    <View style={tw`${bgColor} px-6 pt-6 pb-12 rounded-b-[40px]`}>
      <DigitalClock />
      <View style={tw`items-center mt-2`}>
        {todayHoliday.isHoliday && (
          <View style={tw`bg-white/20 px-3 py-1 rounded-full mt-2 flex-row items-center`}>
            <CalendarOff size={14} color="white" />
            <Text style={tw`text-white font-bold text-xs ml-1`}>LIBUR NASIONAL</Text>
          </View>
        )}
        {isTukarLiburWorkDay && (
          <View style={tw`bg-green-100/90 px-3 py-1 rounded-full mt-2 flex-row items-center`}>
            <CalendarOff size={14} color="#16a34a" />
            <Text style={tw`text-green-700 font-bold text-xs ml-1`}>MASUK GANTI LIBUR</Text>
          </View>
        )}
        {isTukarLiburLeaveDay && !todayHoliday.isHoliday && (
          <View style={tw`bg-purple-100/90 px-3 py-1 rounded-full mt-2 flex-row items-center`}>
            <CalendarOff size={14} color="#9333ea" />
            <Text style={tw`text-purple-700 font-bold text-xs ml-1`}>TUKAR LIBUR HARI INI</Text>
          </View>
        )}
        {isOffDay && !todayHoliday.isHoliday && !isTukarLiburWorkDay && !isTukarLiburLeaveDay && (
          <View style={tw`bg-amber-100/80 px-3 py-1 rounded-full mt-2 flex-row items-center`}>
            <CalendarOff size={14} color="#d97706" />
            <Text style={tw`text-amber-700 font-bold text-xs ml-1`}>HARI LIBUR ANDA</Text>
          </View>
        )}
        {todayHoliday.name && (
          <Text style={tw`text-white/80 text-xs mt-1 text-center max-w-[80%]`}>
            {todayHoliday.name}
          </Text>
        )}
      </View>
    </View>
  );
});
AttendanceHeader.displayName = 'AttendanceHeader';

interface LocationCardProps {
  locationName: string;
  onRefresh: () => void;
}

const LocationCard = React.memo(({ locationName, onRefresh }: LocationCardProps) => (
  <View style={tw`flex-row items-center bg-gray-50 p-3 rounded-xl mb-4`}>
    <View style={tw`bg-blue-100 p-2 rounded-full mr-3`}>
      <MapPin size={20} color="#2563eb" />
    </View>
    <View style={tw`flex-1`}>
      <Text style={tw`text-xs text-gray-400 font-medium`}>Lokasi Saat Ini</Text>
      <Text style={tw`text-gray-800 font-bold text-sm`}>{locationName}</Text>
    </View>
    <TouchableOpacity onPress={onRefresh}>
      <RefreshCw size={16} color="#9ca3af" />
    </TouchableOpacity>
  </View>
));
LocationCard.displayName = 'LocationCard';

interface AttendanceStatusInfoProps {
  checkInTime: string | null;
  checkOutTime: string | null;
}

const AttendanceStatusInfo = React.memo(({ checkInTime, checkOutTime }: AttendanceStatusInfoProps) => (
  <View style={tw`flex-row justify-between mb-6`}>
    <View style={tw`items-center flex-1 border-r border-gray-100`}>
      <Text style={tw`text-xs text-gray-400 mb-1`}>Masuk</Text>
      <Text style={tw`text-lg font-bold text-gray-800`}>{checkInTime || "--:--"}</Text>
    </View>
    <View style={tw`items-center flex-1`}>
      <Text style={tw`text-xs text-gray-400 mb-1`}>Keluar</Text>
      <Text style={tw`text-lg font-bold text-gray-800`}>{checkOutTime || "--:--"}</Text>
    </View>
  </View>
));
AttendanceStatusInfo.displayName = 'AttendanceStatusInfo';

interface AttendanceWarningProps {
  message: string | null;
}

const AttendanceWarning = React.memo(({ message }: AttendanceWarningProps) => {
  if (!message) {
    return null;
  }

  return (
    <View style={tw`flex-row items-start bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4`}>
      <AlertTriangle size={18} color="#d97706" />
      <Text style={tw`flex-1 text-amber-800 text-sm ml-2`}>
        {message}
      </Text>
    </View>
  );
});
AttendanceWarning.displayName = 'AttendanceWarning';

interface GeofenceWarningProps {
  visible: boolean;
  onCancel: () => void;
  onContinue: () => void;
  geofenceStatus: { distance: number | null; siteName: string | null } | null;
  loading: boolean;
}

const GeofenceWarning = React.memo(({ visible, onCancel, onContinue, geofenceStatus, loading }: GeofenceWarningProps) => (
  <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
    <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
      <View style={tw`bg-white rounded-2xl p-6 w-full max-w-sm`}>
        <View style={tw`items-center mb-4`}>
          <View style={tw`bg-orange-100 p-3 rounded-full mb-3`}>
            <AlertTriangle size={32} color="#f97316" />
          </View>
          <Text style={tw`text-lg font-bold text-gray-800 text-center`}>Di Luar Area Kantor</Text>
        </View>
        <Text style={tw`text-gray-600 text-center mb-2`}>Anda berada di luar area kantor yang ditentukan.</Text>
        {geofenceStatus?.distance && (
          <View style={tw`bg-orange-50 p-3 rounded-xl mb-4`}>
            <Text style={tw`text-orange-700 text-center text-sm`}>
              📍 Jarak: {geofenceStatus.distance > 1000 ? `${(geofenceStatus.distance / 1000).toFixed(1)} km` : `${geofenceStatus.distance} m`} dari {geofenceStatus.siteName || "kantor"}
            </Text>
          </View>
        )}
        <Text style={tw`text-gray-500 text-center text-sm mb-4`}>Apakah Anda ingin tetap melanjutkan absensi?</Text>
        <View style={tw`flex-row gap-3`}>
          <TouchableOpacity onPress={onCancel} style={tw`flex-1 bg-gray-100 py-3 rounded-xl items-center`}>
            <Text style={tw`font-bold text-gray-600`}>Batal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onContinue}
            disabled={loading}
            style={tw`flex-1 ${loading ? "bg-orange-300" : "bg-orange-500"} py-3 rounded-xl items-center`}
          >
            <Text style={tw`font-bold text-white`}>{loading ? "Menyimpan..." : "Lanjutkan"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));
GeofenceWarning.displayName = 'GeofenceWarning';

export default function AbsensiScreen() {
  useFeatureGuard(AppFeature.ABSENSI);
  const { user, token } = useAuth();
  const watermarkRef = useRef<View>(null);

  // --- Refs & State ---
  const [status, setStatus] = useState<AttendanceUiStatus>("idle");
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [attendanceWarning, setAttendanceWarning] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationName, setLocationName] = useState("Mencari lokasi...");
  const [capturedTime, setCapturedTime] = useState<Date | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [todayHoliday, setTodayHoliday] = useState<{ isHoliday: boolean; name: string | null }>({
    isHoliday: false,
    name: null,
  });
  const [isOffDay, setIsOffDay] = useState(false);
  const [isTukarLiburWorkDay, setIsTukarLiburWorkDay] = useState(false);
  const [isTukarLiburLeaveDay, setIsTukarLiburLeaveDay] = useState(false);

  // --- Camera & Face Detection State ---
  const cameraRef = useRef<any>(null);
  const device = useCameraDevice(facing);
  const { hasPermission, requestPermission } = useCameraPermission();
  const [faceInFrame, setFaceInFrame] = useState(false);
  const [instructionText, setInstructionText] = useState("Dekatkan wajah");
  const lastFaceReadyRef = useRef(false);

  const triggerFaceGuideHaptic = useCallback((isFaceReady: boolean) => {
    if (lastFaceReadyRef.current === isFaceReady) return;

    lastFaceReadyRef.current = isFaceReady;

    if (isFaceReady) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // --- Face Detection Logic ---
  const faceDetector = useFaceDetector({
    performanceMode: 'fast',
    landmarkMode: 'none',
    classificationMode: 'none',
  });

  const onFaceDetected = Worklets.createRunOnJS((faces: any[], frameWidth: number, frameHeight: number) => {
    let nextFaceInFrame = false;
    let nextInstructionText = "Wajah Tidak Terdeteksi";

    if (faces.length > 0) {
      const face = faces[0];
      const { bounds } = face;

      // Frame processor coordinates are usually based on the camera sensor resolution
      // We need to check if the face is roughly in the center
      // For a typical front camera, wide/high might be reversed or rotated.

      const faceCenterX = bounds.x + bounds.width / 2;
      const faceCenterY = bounds.y + bounds.height / 2;

      // Normalizing coordinates to 0-1
      const normX = faceCenterX / frameWidth;
      const normY = faceCenterY / frameHeight;

      // We want the face to be roughly in the center (around 0.5, 0.5)
      // Loosened widely for field constraints (0.10 - 0.90)
      const isCentered = normX > 0.10 && normX < 0.90 && normY > 0.10 && normY < 0.90;
      const faceWidthRatio = bounds.width / frameWidth;
      const faceHeightRatio = bounds.height / frameHeight;
      // Loosened min size threshold further (0.10)
      const isLargeEnough = Math.max(faceWidthRatio, faceHeightRatio) > 0.10;

      if (isCentered && isLargeEnough) {
        nextFaceInFrame = true;
        nextInstructionText = "Sempurna! Ambil Foto";
      } else if (!isCentered) {
        nextInstructionText = "Posisikan wajah di tengah bingkai";
      } else {
        nextInstructionText = "Dekatkan wajah";
      }
    }

    setFaceInFrame(nextFaceInFrame);
    setInstructionText(nextInstructionText);
    triggerFaceGuideHaptic(nextFaceInFrame);
  });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const faces = faceDetector.detectFaces(frame);
    onFaceDetected(faces, frame.width, frame.height);
  }, [faceDetector]);

  // Geofence State
  const { data: geofenceData } = useApiQuery<{
    policy: AttendanceGeofencePolicy;
    zones: GeofenceZone[];
  }>({
    queryKey: queryKeys.attendance.geofence(),
    endpoint: "/api/mobile/attendance/geofence",
    select: (data: any) => data?.data,
    enabled: !!token,
  });

  const geofenceZones = React.useMemo(() => geofenceData?.zones || [], [geofenceData]);
  const geofencePolicy: AttendanceGeofencePolicy = geofenceData?.policy ?? "WARN";

  const [geofenceStatus, setGeofenceStatus] = useState<{
    isInside: boolean;
    distance: number | null;
    siteName: string | null;
  } | null>(null);
  const [showOutsideWarning, setShowOutsideWarning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Memproses...");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // --- Handlers ---

  const checkGeofence = useCallback((userLat: number, userLng: number, zones: GeofenceZone[]) => {
    if (!zones || zones.length === 0) {
      setGeofenceStatus({ isInside: true, distance: null, siteName: null });
      return;
    }

    let nearestDistance = Infinity;
    let nearestSiteName: string | null = null;
    let isInside = false;

    for (const zone of zones) {
      const distance = calculateDistance(userLat, userLng, zone.latitude, zone.longitude);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSiteName = zone.siteName;
      }
      if (distance <= zone.radius) {
        isInside = true;
      }
    }

    setGeofenceStatus({
      isInside,
      distance: Math.round(nearestDistance),
      siteName: nearestSiteName,
    });
  }, []);

  const getLocation = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Ditolak", "Aplikasi membutuhkan izin lokasi untuk absensi.");
        return;
      }

      let loc = await Location.getLastKnownPositionAsync({});
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }

      setLocation(loc);
      checkGeofence(loc.coords.latitude, loc.coords.longitude, geofenceZones);

      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (reverse.length > 0) {
          const addr = reverse[0];
          setLocationName(`${addr.street || ""} ${addr.district || ""}, ${addr.city || ""}`);
        }
      } catch {
        setLocationName(`${loc.coords.latitude}, ${loc.coords.longitude}`);
      }
    } catch (error) {
      logger.warn("Location Error:", error);
      setLocationName("Lokasi tidak ditemukan (Cek GPS)");
    }
  }, [geofenceZones, checkGeofence]);

  const checkInMutation = useApiMutation({
    endpoint: "/api/mobile/attendance/check-in",
    method: "POST",
    invalidateKeys: [queryKeys.attendance.status()],
    showErrorAlert: false
  });

  const checkOutMutation = useApiMutation({
    endpoint: "/api/mobile/attendance/check-out",
    method: "POST",
    invalidateKeys: [queryKeys.attendance.status()],
    showErrorAlert: false
  });

  const { data: statusData, refetch: refetchStatus } = useApiQuery<{
    success: boolean;
    today?: {
      isHoliday?: boolean;
      holidayName?: string;
      isOffDay?: boolean;
      isTukarLiburWorkDay?: boolean;
      isTukarLiburLeaveDay?: boolean;
    };
    data: {
      checkIn: string;
      checkOut?: string;
      sessionMeta?: {
        isStaleFlexibleSession?: boolean;
      };
      user?: {
        workingHourMode?: "FIXED" | "SHIFT" | "FLEXIBLE" | null;
        shift?: {
          startTime: string;
          endTime: string;
        } | null;
      };
    }[];
  }>({
    queryKey: queryKeys.attendance.status(),
    endpoint: "/api/mobile/attendance/history?limit=1",
    enabled: !!token,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchStatus();
    await getLocation();
    const pendingQueue = await DatabaseService.getPendingQueue();
    setPendingSyncCount(pendingQueue.length);
    setRefreshing(false);
  }, [refetchStatus, getLocation]);

  const refreshPendingSyncCount = useCallback(async () => {
    try {
      const pendingQueue = await DatabaseService.getPendingQueue();
      setPendingSyncCount(pendingQueue.length);
    } catch (error) {
      logger.warn("Failed to load pending sync queue", error);
    }
  }, []);

  useEffect(() => {
    if (statusData?.success) {
      setTodayHoliday({
        isHoliday: !!statusData.today?.isHoliday,
        name: statusData.today?.holidayName || null,
      });
      setIsOffDay(!!statusData.today?.isOffDay);
      setIsTukarLiburWorkDay(!!statusData.today?.isTukarLiburWorkDay);
      setIsTukarLiburLeaveDay(!!statusData.today?.isTukarLiburLeaveDay);

      const derivedStatus = deriveAttendanceStatus(statusData.data[0]);
      setStatus(derivedStatus.status);
      setCheckInTime(derivedStatus.checkInTime);
      setCheckOutTime(derivedStatus.checkOutTime);
      setAttendanceWarning(derivedStatus.warningMessage);

      if (derivedStatus.status === "checked-in") {
        LocationTrackingService.startTracking().catch(err => logger.error('Start tracking error', err));
      } else {
        LocationTrackingService.stopTracking().catch(err => logger.error('Stop tracking error', err));
      }
    }
  }, [statusData]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  useEffect(() => {
    if (location && geofenceZones.length > 0) {
      checkGeofence(location.coords.latitude, location.coords.longitude, geofenceZones);
    }
  }, [geofenceZones, location, checkGeofence]);

  useEffect(() => {
    refreshPendingSyncCount();
    const timer = setInterval(() => {
      refreshPendingSyncCount();
    }, 15000);

    return () => clearInterval(timer);
  }, [refreshPendingSyncCount]);

  const handleCaptureURI = useCallback(async () => {
    if (!faceInFrame) {
      Alert.alert("Wajah Belum Terdeteksi", "Pastikan wajah terlihat jelas dan berada di dalam frame.");
      return;
    }

    if (cameraRef.current) {
      const result = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: true,
      });
      setPhoto(`file://${result.path}`);
      setCapturedTime(new Date());
      setShowCamera(false);
    }
  }, [faceInFrame]);

  const captureWatermarkedPhoto = useCallback(async (): Promise<string | null> => {
    if (!watermarkRef.current) return photo;
    try {
      return await captureRef(watermarkRef, { format: "jpg", quality: 0.8 });
    } catch (error) {
      logger.error("[Absensi] Watermark capture error:", error);
      return photo;
    }
  }, [photo]);

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
      queueDepth: pendingSyncCount,
    });

    if (isOnline) {
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
        setUploadProgress(0); // Indeterminate
        await mutation.mutate({ ...payload, photoUrl }, {
          onSuccess: async (data) => {
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

            setIsProcessing(false);
            setLoading(false);
            const warning = (data as { warning?: string })?.warning;
            presentSuccessMessage(status === "idle" ? "Check-in Berhasil!" : warning ? `⚠️ ${warning}\n\nCheckout berhasil.` : "Check-out Berhasil!");
            refetchStatus();
            setPhoto(null);
            refreshPendingSyncCount();
          },
          onError: (e) => {
            setIsProcessing(false);
            setLoading(false);
            presentAppError(e, {
              screen: 'AttendanceScreen',
              route: '/(app)/absensi',
            });
          },
        });
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
    } else {
      setLoadingMessage("Menyimpan offline...");
      await mutation.mutate({
        ...payload,
        photoUrl: null,
        meta: {
          photos: [processedUri],
          targetField: "photoUrl",
          singleFile: true,
          photoType: "employee-attendance",
          requestId: payload.requestId,
        },
        _offline_meta: {
          capturedAt: payload.capturedAt,
          signature: generateSignature({ userId: user?.id, timestamp: payload.capturedAt, latitude: payload.latitude, longitude: payload.longitude }),
        },
      }, {
        onSuccess: (data, variables) => {
          setIsProcessing(false);
          const isOfflineQueued = isOfflineMutationQueuedResult(data);
          if (isOfflineQueued) {
            setPhoto(null);
            presentInfoMessage("Data disimpan offline.", "Offline");
            AttendanceTelemetryService.track("attendance_queued_offline", {
              requestId: payload.requestId,
              userId: user?.id,
              action: status === "idle" ? "check-in" : "check-out",
              networkState: "offline",
            });
          } else {
            // If it surprisingly succeeded online
            setPhoto(null);
            presentSuccessMessage("Data berhasil dikirim.");
            refetchStatus();
          }
          refreshPendingSyncCount();
        },
        onError: (e) => {
          setIsProcessing(false);
          presentAppError(e, {
            screen: 'AttendanceScreen',
            route: '/(app)/absensi',
          });
        }
      });
    }
  }, [photo, location, status, isProcessing, captureWatermarkedPhoto, locationName, capturedTime, checkInMutation, checkOutMutation, user?.id, refetchStatus, pendingSyncCount, refreshPendingSyncCount]);

  const handleSubmit = useCallback(async () => {
    if (!photo || !location) {
      presentInfoMessage("Lengkapi foto dan lokasi.", "Data Belum Lengkap");
      return;
    }
    if (geofenceStatus && !geofenceStatus.isInside) {
      const geofenceAction = resolveAttendanceGeofenceAction(geofencePolicy, geofenceStatus.isInside);

      if (geofenceAction === "allow") {
        await submitAttendance();
        return;
      }
      if (geofenceAction === "block") {
        presentInfoMessage("Anda wajib berada di dalam area site untuk melakukan absensi.", "Di Luar Area Kantor");
        return;
      }
      setShowOutsideWarning(true);
      return;
    }
    await submitAttendance();
  }, [photo, location, geofencePolicy, geofenceStatus, submitAttendance]);

  const handleConfirmOutsideSubmit = useCallback(async () => {
    setShowOutsideWarning(false);
    setIsProcessing(true);
    setLoadingMessage("Memvalidasi data...");
    await submitAttendance();
  }, [submitAttendance]);

  if (showCamera) {
    if (!hasPermission) {
      return (
        <View style={tw`flex-1 justify-center items-center`}>
          <Text>Aplikasi butuh izin kamera</Text>
          <TouchableOpacity onPress={requestPermission} style={tw`bg-blue-600 p-2 rounded mt-2`}>
            <Text style={tw`text-white`}>Izinkan</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!device) {
      return <View style={tw`flex-1 bg-black items-center justify-center`}><Text style={tw`text-white`}>Kamera tidak tersedia</Text></View>;
    }

    return (
      <View style={tw`flex-1 bg-black`}>
        <Camera
          style={tw`flex-1`}
          device={device}
          isActive={showCamera}
          ref={cameraRef}
          photo={true}
          frameProcessor={frameProcessor}
          format={device.formats[0]} // Optional: choose best format
        />
        <View style={tw`absolute inset-0 items-center justify-center pointer-events-none`}>
          <View style={[
            tw`w-56 h-72 border-2 rounded-full`,
            {
              borderStyle: "dashed",
              borderColor: faceInFrame ? "#10b981" : "rgba(255,255,255,0.6)"
            }
          ]} />
          <View style={tw`bg-black/40 px-4 py-2 rounded-full mt-4`}>
            <Text style={tw`text-white font-bold text-sm`}>{instructionText}</Text>
          </View>
        </View>
        <View style={tw`absolute bottom-0 left-0 right-0 p-6 pb-12`}>
          <View style={tw`bg-black/50 p-3 rounded-xl mb-4`}>
            <View style={tw`flex-row items-center`}>
              <MapPin size={14} color="#fff" />
              <Text style={tw`text-white text-xs ml-2 flex-1`} numberOfLines={1}>{locationName}</Text>
            </View>
          </View>
          <View style={tw`flex-row justify-between items-center`}>
            <TouchableOpacity onPress={() => setShowCamera(false)} style={tw`bg-white/20 p-3 rounded-full`}><X color="white" size={24} /></TouchableOpacity>
            <TouchableOpacity
              onPress={handleCaptureURI}
              disabled={!faceInFrame}
              style={tw`h-20 w-20 ${faceInFrame ? "bg-white" : "bg-gray-400"} rounded-full border-4 border-gray-300 items-center justify-center`}
            >
              <View style={tw`h-16 w-16 ${faceInFrame ? "bg-white" : "bg-gray-300"} rounded-full border-2 border-gray-200`} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFacing((curr) => (curr === "back" ? "front" : "back"))} style={tw`bg-white/20 p-3 rounded-full`}><RotateCcw color="white" size={24} /></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!statusData) {
    return <AttendanceSkeleton />;
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView
        contentContainerStyle={tw`pb-20`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <AttendanceHeader
          todayHoliday={todayHoliday}
          isTukarLiburWorkDay={isTukarLiburWorkDay}
          isTukarLiburLeaveDay={isTukarLiburLeaveDay}
          isOffDay={isOffDay}
        />

        <View style={tw`px-4 -mt-8`}>
          <View style={tw`bg-white rounded-2xl shadow-sm p-4 border border-gray-100`}>
            <PendingSyncBadge pendingCount={pendingSyncCount} />
            <LocationCard locationName={locationName} onRefresh={getLocation} />
            <AttendanceStatusInfo checkInTime={checkInTime} checkOutTime={checkOutTime} />
            <AttendanceWarning message={attendanceWarning} />

            {photo ? (
              <View style={tw`mb-4`}>
                <View ref={watermarkRef} collapsable={false} style={tw`w-full h-80 rounded-xl overflow-hidden mb-2 bg-black`}>
                  <ImageWithCache source={photo} style={tw`w-full h-full`} contentFit="cover" transition={1000} />
                  <View style={tw`absolute bottom-0 left-0 right-0 bg-black/60 p-3`}>
                    <View style={tw`flex-row items-center mb-1`}>
                      <ClockIcon size={12} color="#fff" />
                      <Text style={tw`text-white font-bold text-sm ml-2`}>
                        {capturedTime ? formatDate(capturedTime, "HH:mm:ss") : "--:--:--"}
                      </Text>
                    </View>
                    <View style={tw`flex-row items-center`}>
                      <MapPin size={12} color="#fff" />
                      <Text style={tw`text-white text-xs ml-2 flex-1`} numberOfLines={1}>{locationName}</Text>
                    </View>
                  </View>
                </View>
                <View style={tw`flex-row gap-2`}>
                  <TouchableOpacity onPress={() => setPhoto(null)} style={tw`flex-1 bg-gray-100 py-3 rounded-xl items-center`}>
                    <Text style={tw`font-bold text-gray-600`}>Ulang Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSubmit} disabled={loading || checkInMutation.isPending || checkOutMutation.isPending} style={tw`flex-1 bg-blue-600 py-3 rounded-xl items-center`}>
                    <Text style={tw`font-bold text-white`}>{loading || checkInMutation.isPending || checkOutMutation.isPending ? "Menyimpan..." : "Kirim Absensi"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowCamera(true)}
                disabled={status === "checked-out" || todayHoliday.isHoliday || isOffDay}
                style={tw`${status === "checked-out" ? "bg-gray-100 border-gray-300" :
                  todayHoliday.isHoliday ? "bg-red-50 border-red-200" :
                    isTukarLiburLeaveDay ? "bg-purple-50 border-purple-200" :
                      isOffDay ? "bg-amber-50 border-amber-200" :
                        isTukarLiburWorkDay ? "bg-green-50 border-green-200" :
                          "bg-blue-50 border-blue-200"
                  } border-2 border-dashed rounded-2xl h-32 items-center justify-center mb-2`}
              >
                {todayHoliday.isHoliday ? (
                  <View style={tw`items-center`}><CalendarOff size={32} color="#dc2626" /><Text style={tw`text-red-600 font-bold mt-2`}>Libur Nasional</Text></View>
                ) : status === "checked-out" ? (
                  <View style={tw`items-center`}><Text style={tw`text-gray-500 font-bold text-lg`}>🎉 Absensi Selesai</Text><Text style={tw`text-gray-400 text-sm mt-1`}>Terima kasih untuk hari ini</Text></View>
                ) : (
                  <View style={tw`items-center`}><LucideCamera size={32} color="#2563eb" /><Text style={tw`text-blue-600 font-bold mt-2`}>{status === "idle" ? "Ambil Foto Masuk" : "Ambil Foto Keluar"}</Text></View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <GeofenceWarning
        visible={showOutsideWarning && geofencePolicy === "WARN"}
        onCancel={() => setShowOutsideWarning(false)}
        onContinue={handleConfirmOutsideSubmit}
        geofenceStatus={geofenceStatus}
        loading={isProcessing}
      />
      <LoadingModal visible={isProcessing} message={loadingMessage} progress={uploadProgress > 0 ? uploadProgress : undefined} />
    </SafeAreaView>
  );
}
