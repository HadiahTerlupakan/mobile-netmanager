import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { AttendanceSkeleton } from "@/components/molecules/AttendanceSkeleton";
import LoadingModal from "@/components/molecules/LoadingModal";
import { useAuth } from "@/context/AuthContext";
import {
  useApiMutation,
  useApiQuery,
} from "@/hooks/queries";
import { queryKeys } from "@/lib/queryClient";
import { LocationTrackingService } from "@/services/LocationTrackingService";
import { SyncService } from "@/services/SyncService";
import { uploadService } from "@/services/UploadService";
import { generateSignature } from "@/utils/crypto";
import { formatDate } from "@/utils/date";
import { getUserFriendlyError } from "@/utils/errorHandling";
import { logger } from "@/utils/logger";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import {
  AlertTriangle,
  CalendarOff,
  Camera,
  Clock as ClockIcon,
  MapPin,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
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

// --- Types ---
interface GeofenceZone {
  siteId: string;
  siteName: string;
  latitude: number;
  longitude: number;
  radius: number;
}

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
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const watermarkRef = useRef<View>(null);

  // Status
  const [status, setStatus] = useState<"idle" | "checked-in" | "checked-out">("idle");
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // UI State
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<CameraType>("front");
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationName, setLocationName] = useState("Mencari lokasi...");
  const [capturedTime, setCapturedTime] = useState<Date | null>(null);

  // Holiday/Shift Status
  const [todayHoliday, setTodayHoliday] = useState({ isHoliday: false, name: null as string | null });
  const [isOffDay, setIsOffDay] = useState(false);
  const [isTukarLiburWorkDay, setIsTukarLiburWorkDay] = useState(false);
  const [isTukarLiburLeaveDay, setIsTukarLiburLeaveDay] = useState(false);

  // Geofence State
  const { data: geofenceData } = useApiQuery<{ zones: GeofenceZone[] }>({
    queryKey: queryKeys.attendance.geofence(),
    endpoint: "/api/mobile/geofence",
    select: (data: any) => data?.data,
    enabled: !!token,
  });

  const geofenceZones = React.useMemo(() => geofenceData?.zones || [], [geofenceData]);

  const [geofenceStatus, setGeofenceStatus] = useState<{
    isInside: boolean;
    distance: number | null;
    siteName: string | null;
  } | null>(null);
  const [showOutsideWarning, setShowOutsideWarning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Memproses...");
  const [uploadProgress, setUploadProgress] = useState(0);

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
    }[];
  }>({
    queryKey: queryKeys.attendance.status(),
    endpoint: "/api/mobile/attendance/history?limit=1",
    enabled: !!token,
  });

  useEffect(() => {
    if (statusData?.success) {
      setTodayHoliday({
        isHoliday: !!statusData.today?.isHoliday,
        name: statusData.today?.holidayName || null,
      });
      setIsOffDay(!!statusData.today?.isOffDay);
      setIsTukarLiburWorkDay(!!statusData.today?.isTukarLiburWorkDay);
      setIsTukarLiburLeaveDay(!!statusData.today?.isTukarLiburLeaveDay);

      if (statusData.data.length > 0) {
        const lastAttendance = statusData.data[0];
        const today = new Date().toDateString();
        const attendanceDate = new Date(lastAttendance.checkIn).toDateString();

        if (!lastAttendance.checkOut) {
          // ACTIVE SESSION (Belum check-out) walau dari hari kemaren
          setStatus("checked-in");
          setCheckInTime(formatDate(lastAttendance.checkIn, "HH:mm"));
          setCheckOutTime(null);
          LocationTrackingService.startTracking().catch(err => logger.error('Start tracking error', err));
        } else {
          // CLOSED SESSION (Sudah check-out)
          if (today === attendanceDate) {
            // Sesi ditutup hari ini, tampilkan jamnya
            setStatus("checked-out");
            setCheckInTime(formatDate(lastAttendance.checkIn, "HH:mm"));
            setCheckOutTime(formatDate(lastAttendance.checkOut, "HH:mm"));
            LocationTrackingService.stopTracking().catch(err => logger.error('Stop tracking error', err));
          } else {
            // Sesi kemarin sudah mandek tertutup, hari ini adalah "idle" baru
            setStatus("idle");
            setCheckInTime(null);
            setCheckOutTime(null);
          }
        }
      }
    }
  }, [statusData]);

  useEffect(() => {
    getLocation();
  }, [token, getLocation]);

  useEffect(() => {
    if (location && geofenceZones.length > 0) {
      checkGeofence(location.coords.latitude, location.coords.longitude, geofenceZones);
    }
  }, [geofenceZones, location, checkGeofence]);

  const handleCaptureURI = useCallback(async () => {
    if (cameraRef.current) {
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });
      setPhoto(result?.uri ?? null);
      setCapturedTime(new Date());
      setShowCamera(false);
    }
  }, []);

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
      Alert.alert("Data Belum Lengkap", "Pastikan foto dan lokasi sudah tersedia.");
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
    const payload = {
      location: locationName,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      capturedAt: (capturedTime || new Date()).toISOString(),
    };

    if (isOnline) {
      setLoading(true);
      setUploadProgress(0);
      try {
        setLoadingMessage("Mengupload foto...");
        const uploadedUrls = await uploadService.uploadBatch(
          [processedUri],
          "employee-attendance",
          (_, __, progress) => {
            setUploadProgress(progress.percentage);
          }
        );
        const photoUrl = uploadedUrls[0];
        if (!photoUrl) throw new Error("Gagal upload foto.");

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
            Alert.alert("Berhasil", status === "idle" ? "Check-in Berhasil!" : warning ? `⚠️ ${warning}\n\nCheckout berhasil.` : "Check-out Berhasil!");
            refetchStatus();
            setPhoto(null);
          },
          onError: (e) => {
            setIsProcessing(false);
            setLoading(false);
            const { title, message } = getUserFriendlyError(e);
            Alert.alert(title, message);
          },
        });
      } catch (error) {
        setIsProcessing(false);
        setLoading(false);
        const { title, message } = getUserFriendlyError(error);
        Alert.alert(title, message);
      }
    } else {
      setLoadingMessage("Menyimpan offline...");
      await mutation.mutate({
        ...payload,
        photoUrl: null,
        meta: { photos: [processedUri], targetField: "photoUrl", singleFile: true, photoType: "employee-attendance" },
        _offline_meta: {
          capturedAt: payload.capturedAt,
          signature: generateSignature({ userId: user?.id, timestamp: payload.capturedAt, latitude: payload.latitude, longitude: payload.longitude }),
        },
      }, {
        onSuccess: (data, variables) => {
          setIsProcessing(false);
          // Check if it was actually offline queued - useApiMutation might return result if online suddenly, but usually we check __offline_queued__ if available or just assume based on context
          // However, useApiMutation handles this internally.
          // The previous code checked `isOffline` arg in onSuccess.
          // useMutation's onSuccess(data, variables, context) doesn't have isOffline.
          // We can check if data has __offline_queued__ property if our backend/mutation wrapper sets it.
          // Or just display "Offline" alert as fallback.

          const isOfflineQueued = (data as any)?.__offline_queued__;
          if (isOfflineQueued) {
            setPhoto(null);
            Alert.alert("Offline", "Data disimpan offline.");
          } else {
            // If it surprisingly succeeded online
            setPhoto(null);
            Alert.alert("Berhasil", "Data berhasil dikirim.");
            refetchStatus();
          }
        },
        onError: (e) => {
          setIsProcessing(false);
          const { title, message } = getUserFriendlyError(e);
          Alert.alert(title, message);
        }
      });
    }
  }, [photo, location, status, isProcessing, captureWatermarkedPhoto, locationName, capturedTime, checkInMutation, checkOutMutation, user?.id, refetchStatus]);

  const handleSubmit = useCallback(async () => {
    if (!photo || !location) {
      Alert.alert("Data Belum Lengkap", "Lengkapi foto dan lokasi.");
      return;
    }
    if (geofenceStatus && !geofenceStatus.isInside) {
      setShowOutsideWarning(true);
      return;
    }
    await submitAttendance();
  }, [photo, location, geofenceStatus, submitAttendance]);

  const handleConfirmOutsideSubmit = useCallback(async () => {
    setShowOutsideWarning(false);
    setIsProcessing(true);
    setLoadingMessage("Memvalidasi data...");
    await submitAttendance();
  }, [submitAttendance]);

  if (showCamera) {
    if (!permission?.granted) {
      return (
        <View style={tw`flex-1 justify-center items-center`}>
          <Text>Aplikasi butuh izin kamera</Text>
          <TouchableOpacity onPress={requestPermission} style={tw`bg-blue-600 p-2 rounded mt-2`}>
            <Text style={tw`text-white`}>Izinkan</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={tw`flex-1 bg-black`}>
        <CameraView style={tw`flex-1`} facing={facing} ref={cameraRef} />
        <View style={tw`absolute inset-0 items-center justify-center pointer-events-none`}>
          <View style={[tw`w-56 h-72 border-2 border-white/60 rounded-full`, { borderStyle: "dashed" }]} />
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
            <TouchableOpacity onPress={handleCaptureURI} style={tw`h-20 w-20 bg-white rounded-full border-4 border-gray-300 items-center justify-center`}><View style={tw`h-16 w-16 bg-white rounded-full border-2 border-gray-200`} /></TouchableOpacity>
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
      <ScrollView contentContainerStyle={tw`pb-20`}>
        <AttendanceHeader
          todayHoliday={todayHoliday}
          isTukarLiburWorkDay={isTukarLiburWorkDay}
          isTukarLiburLeaveDay={isTukarLiburLeaveDay}
          isOffDay={isOffDay}
        />

        <View style={tw`px-4 -mt-8`}>
          <View style={tw`bg-white rounded-2xl shadow-sm p-4 border border-gray-100`}>
            <LocationCard locationName={locationName} onRefresh={getLocation} />
            <AttendanceStatusInfo checkInTime={checkInTime} checkOutTime={checkOutTime} />

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
                style={tw`${todayHoliday.isHoliday ? "bg-red-50 border-red-200" : isTukarLiburLeaveDay ? "bg-purple-50 border-purple-200" : isOffDay ? "bg-amber-50 border-amber-200" : isTukarLiburWorkDay ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"} border-2 border-dashed rounded-2xl h-32 items-center justify-center mb-2`}
              >
                {todayHoliday.isHoliday ? (
                  <View style={tw`items-center`}><CalendarOff size={32} color="#dc2626" /><Text style={tw`text-red-600 font-bold mt-2`}>Libur Nasional</Text></View>
                ) : (
                  <View style={tw`items-center`}><Camera size={32} color="#2563eb" /><Text style={tw`text-blue-600 font-bold mt-2`}>{status === "idle" ? "Ambil Foto Masuk" : "Ambil Foto Keluar"}</Text></View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <GeofenceWarning
        visible={showOutsideWarning}
        onCancel={() => setShowOutsideWarning(false)}
        onContinue={handleConfirmOutsideSubmit}
        geofenceStatus={geofenceStatus}
        loading={isProcessing}
      />
      <LoadingModal visible={isProcessing} message={loadingMessage} progress={uploadProgress > 0 ? uploadProgress : undefined} />
    </SafeAreaView>
  );
}
