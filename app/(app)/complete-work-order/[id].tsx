import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import LoadingModal from "@/components/molecules/LoadingModal";
import { useApiMutation } from "@/hooks/queries";
import { SyncService } from "@/services/SyncService";
import { uploadService } from "@/services/UploadService";
import api from "@/services/api"; // Use centralized API
import { formatDate } from "@/utils/date";
import { presentAppError, presentErrorMessage, presentInfoMessage, presentSuccessMessage } from "@/utils/errorPresenter";
import { logger } from "@/utils/logger";
import {
  normalizeWorkOrderRouteParam,
  resolveCanonicalWorkOrderId,
} from "@/utils/workOrderRoute";
import { CompleteWorkOrderSchema, sanitizeInput, validateData } from "@/utils/validation";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Camera, CheckCircle, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AppFeature } from '@/constants/features';

export default function CompleteWorkOrderScreen() {
  useFeatureGuard(AppFeature.WORK_ORDER);

  const { id } = useLocalSearchParams();
  const router = useRouter();
  const routeWorkOrderId = normalizeWorkOrderRouteParam(id);

  const [resolutionNotes, setResolutionNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]); // Changed to Array
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [ticketNumber, setTicketNumber] = useState<string>(""); // To store ticket number
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Mencari Lokasi...");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [detailWorkOrderId, setDetailWorkOrderId] = useState<string | null>(null);
  const canonicalWorkOrderId = resolveCanonicalWorkOrderId(
    routeWorkOrderId,
    detailWorkOrderId,
  );
  const resolvedWorkOrderId = canonicalWorkOrderId ?? routeWorkOrderId;

  // Prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // API Mutation
  const { mutateAsync, isPending: isMutating } = useApiMutation({
    endpoint: resolvedWorkOrderId
      ? `/api/mobile/work-orders/${resolvedWorkOrderId}/update`
      : "",
    method: "POST",
    invalidateKeys: resolvedWorkOrderId
      ? [['work_order', resolvedWorkOrderId], ['work_orders']]
      : [['work_orders']],
  });

  useEffect(() => {
    (async () => {
      try {
        let currentLocation = await Location.getLastKnownPositionAsync({});
        if (!currentLocation) {
          currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
        setLocation(currentLocation);
      } catch (error) {
        logger.warn("Location Error:", error);
      }
    })();

    if (!routeWorkOrderId) {
      setTicketNumber("");
      return;
    }

    // Fetch specific WO details just for ticket number (lightweight)
    const fetchTicketNum = async () => {
      try {
        const res = await api.get(`/api/mobile/work-orders/${routeWorkOrderId}`);
        if (res.data.success) {
          const wo = res.data.data;
          const canonicalId =
            typeof wo.id === "string" && wo.id.trim() ? wo.id.trim() : null;

          setDetailWorkOrderId(canonicalId);
          setTicketNumber(
            wo.ticket?.ticketNumber || wo.workOrderNumber || canonicalId || routeWorkOrderId,
          );
          return;
        }
      } catch {
        // If offline, we might use route id as fallback
      }

      setDetailWorkOrderId(null);
      setTicketNumber(routeWorkOrderId);
    };

    fetchTicketNum();
  }, [routeWorkOrderId]);

  const handleImageSelection = () => {
    Alert.alert(
      "Pilih Sumber Foto",
      "Ambil foto dari kamera atau pilih dari galeri?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Kamera",
          onPress: async () => {
            try {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ["images"],
                allowsEditing: false,
                quality: 0.5,
              });
              if (!result.canceled)
                setPhotos((prev) => [...prev, result.assets[0].uri]);
            } catch {
              presentErrorMessage("Gagal membuka kamera", "Error");
            }
          },
        },
        {
          text: "Galeri",
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: false,
                quality: 0.5,
              });
              if (!result.canceled)
                setPhotos((prev) => [...prev, result.assets[0].uri]);
            } catch {
              presentErrorMessage("Gagal membuka galeri", "Error");
            }
          },
        },
      ],
    );
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!resolvedWorkOrderId) {
      presentInfoMessage("ID Work Order tidak valid.", "Perhatian");
      return;
    }

    // 1. Prepare & Sanitize Data
    const rawData = {
      action: "COMPLETE" as const,
      notes: sanitizeInput(resolutionNotes),
    };

    const validation = validateData(CompleteWorkOrderSchema, rawData);

    if (!validation.success) {
      presentInfoMessage(validation.error, "Data Tidak Valid");
      return;
    }

    if (photos.length === 0) {
      presentInfoMessage("Wajib upload minimal 1 foto bukti pekerjaan.", "Perhatian");
      return;
    }

    // Get fresh location
    setIsProcessingComplete(true);
    setLoadingMessage("Mencari Lokasi...");

    try {
      let finalLocation = location;
      let locationName = "";

      try {
        finalLocation = await Location.getCurrentPositionAsync({});
        if (finalLocation) {
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: finalLocation.coords.latitude,
            longitude: finalLocation.coords.longitude,
          });
          if (reverseGeocode.length > 0) {
            const addr = reverseGeocode[0];
            locationName =
              `${addr.street || ""} ${addr.district || ""} ${addr.city || ""}`.trim();
            if (!locationName) locationName = addr.name || addr.region || "";
          }
        }
      } catch {
        // Reverse geocoding sering gagal di emulator, silently ignore
        logger.debug("Location/geocode unavailable, using coordinates only");
      }

      // Watermark Lines
      const coords = finalLocation
        ? `(${finalLocation.coords.latitude.toFixed(6)}, ${finalLocation.coords.longitude.toFixed(6)})`
        : "";
      let locStr = locationName || `Loc: ${coords}` || "Loc: Unknown";

      const watermarkLines = [
        formatDate(new Date(), "dd MMM yyyy HH:mm"),
        `#${ticketNumber}`,
        `Tech: ${"Teknisi"}`,
        locStr,
      ];

      // Build photoMap from photos array (hook expects photoN pattern)
      const photoMap: Record<string, string> = {};
      photos.forEach((uri, index) => {
        photoMap[`photo${index + 1}`] = uri;
      });

      const payload = {
        ...validation.data, // action, notes (sanitized)
        latitude: finalLocation?.coords.latitude.toString(),
        longitude: finalLocation?.coords.longitude.toString(),
        locationName,
        timestamp: new Date().toISOString(),
      };

      // Check online status
      const isOnline = await SyncService.isOnline();

      if (isOnline) {
        setLoadingMessage("Mengupload foto...");
        setUploadProgress(0);

        const uploadedUrls = await uploadService.uploadBatch(
          photos,
          "workorder-completion",
          (index, total, progress) => {
            if (!isMountedRef.current) return;
            setLoadingMessage(`Mengupload foto ${index}/${total}...`);
            setUploadProgress(progress.percentage);
          }
        );

        if (!isMountedRef.current) return;
        setLoadingMessage("Mengirim laporan...");
        setUploadProgress(0);

        await mutateAsync({
          ...payload,
          photoUrls: uploadedUrls,
        });

        if (!isMountedRef.current) return;
        presentSuccessMessage("Pekerjaan telah diselesaikan dan laporan terkirim!");
        router.replace("/(app)/dashboard");
      } else {
        // Offline flow
        setLoadingMessage("Menyimpan offline...");

        await mutateAsync({
          ...payload,
          meta: {
            photoMap,
            targetField: "photoUrls",
            photoType: "workorder-completion",
            watermarkLines,
          },
        });

        if (!isMountedRef.current) return;
        presentInfoMessage("Laporan disimpan di antrian.", "Offline");
        router.replace("/(app)/dashboard");
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      presentAppError(error, {
        screen: 'CompleteWorkOrderScreen',
        route: '/(app)/complete-work-order/[id]',
      });
    } finally {
      if (isMountedRef.current) {
        setIsProcessingComplete(false);
      }
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View
        style={tw`px-4 py-3 flex-row items-center border-b border-gray-100`}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`p-2 mr-2 -ml-2`}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <View>
          <Text style={tw`font-bold text-lg text-gray-800`}>
            Laporan Penyelesaian
          </Text>
          <Text style={tw`text-xs text-gray-500`}>
            Lengkapi bukti pekerjaan
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={tw`p-5`}>
        <View style={tw`items-center mb-6`}>
          <View
            style={tw`w-14 h-14 bg-green-100 rounded-full items-center justify-center mb-2`}
          >
            <CheckCircle size={28} color="#16a34a" />
          </View>
          <Text style={tw`text-gray-500 text-center text-xs px-8`}>
            Pastikan semua bukti foto memiliki pencahayaan yang baik. Sistem
            akan otomatis menambahkan watermark (Lokasi & Waktu).
          </Text>
        </View>

        {/* Form */}
        <Text style={tw`font-bold text-gray-700 mb-2`}>
          Catatan Pengerjaan <Text style={tw`text-red-500`}>*</Text>
        </Text>
        <TextInput
          style={tw`border border-gray-200 rounded-xl p-4 text-sm h-28 mb-6 bg-gray-50`}
          multiline
          textAlignVertical="top"
          placeholder="Jelaskan apa saja yang dikerjakan..."
          value={resolutionNotes}
          onChangeText={setResolutionNotes}
        />

        <View style={tw`flex-row justify-between items-center mb-2`}>
          <Text style={tw`font-bold text-gray-700`}>
            Foto Bukti <Text style={tw`text-red-500`}>*</Text>
          </Text>
          <Text style={tw`text-xs text-gray-400`}>{photos.length} Foto</Text>
        </View>

        {/* Photo Grid */}
        <View style={tw`flex-row flex-wrap gap-2 mb-8`}>
          {photos.map((uri, index) => (
            <View key={uri} style={tw`w-[31%] aspect-square relative`}>
              <ImageWithCache
                source={uri}
                style={tw`w-full h-full rounded-xl border border-gray-200`}
                contentFit="cover"
                transition={1000} />
              <TouchableOpacity
                onPress={() => removePhoto(index)}
                style={tw`absolute -top-2 -right-2 bg-red-500 p-1.5 rounded-full border border-white`}
              >
                <X color="white" size={12} />
              </TouchableOpacity>
              <View
                style={tw`absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-white`}
              >
                <Text style={tw`text-[10px] text-white font-bold`}>
                  {index + 1}
                </Text>
              </View>
            </View>
          ))}

          {/* Add Button */}
          <TouchableOpacity
            onPress={handleImageSelection}
            style={tw`w-[31%] aspect-square rounded-xl border-2 border-dashed border-gray-300 items-center justify-center bg-gray-50 active:bg-blue-50 active:border-blue-300`}
          >
            <Camera size={24} color="#9ca3af" />
            <Text style={tw`text-[10px] text-gray-400 mt-1 font-bold`}>
              + FOTO
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={tw`p-4 border-t border-gray-100`}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isMutating}
          style={tw`w-full bg-green-600 py-4 rounded-xl items-center shadow-lg shadow-green-200 ${isMutating || !resolutionNotes || photos.length === 0 ? "opacity-70" : ""}`}
        >
          <Text style={tw`font-bold text-white text-base`}>
            Kirim Laporan & Selesai
          </Text>
        </TouchableOpacity>
      </View>

      {/* Full Screen Loading Overlay */}
      <LoadingModal
        visible={isProcessingComplete || isMutating}
        message={loadingMessage}
        progress={uploadProgress > 0 ? uploadProgress : undefined}
      />
    </SafeAreaView>
  );
}
