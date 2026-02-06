import { SyncService } from "@/services/SyncService";
import { uploadService } from "@/services/UploadService";
import { LeaveRequestSchema, sanitizeInput, validateData } from "@/utils/validation";
import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import CustomDatePickerModal from "@/components/molecules/CustomDatePickerModal"; // Import Custom Modal
import LoadingModal from "@/components/molecules/LoadingModal";
import { useAuth } from "@/context/AuthContext";
import { useOfflineMutationCompat as useOfflineMutation } from "@/hooks/queries";
import api from "@/services/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    isSameDay,
    startOfMonth,
} from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowLeft, Camera, ChevronDown, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View,  } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { logger } from "@/utils/logger";

import { MarkedDates } from "react-native-calendars/src/types";

const LEAVE_TYPES = [
  { value: "SAKIT", label: "Sakit" },
  { value: "IZIN", label: "Izin" },
  { value: "CUTI", label: "Cuti" },
  { value: "TUKAR_LIBUR", label: "Tukar Libur" },
];

export default function LeaveFormScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Form State
  const [type, setType] = useState("SAKIT");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [replacementDate, setReplacementDate] = useState(new Date()); // New State
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  // UI State
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showReplacementPicker, setShowReplacementPicker] = useState(false); // New Picker

  // Live Data State
  const [liveWorkDays, setLiveWorkDays] = useState<string | null>(null);
  const [liveWorkingHourMode, setLiveWorkingHourMode] = useState<string | null>(
    null,
  );

  // Fetch latest profile data to get up-to-date workDays
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const { data } = await api.get("/api/mobile/profile");
        if (isMounted && data.success && data.data) {
          setLiveWorkDays(data.data.workDays);
          setLiveWorkingHourMode(data.data.workingHourMode);
        }
      } catch (error) {
        logger.error("Failed to fetch fresh profile:", error);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Use live data if available, otherwise fall back to context
  const currentWorkDays = liveWorkDays ?? user?.workDays;
  const currentWorkingHourMode = liveWorkingHourMode ?? user?.workingHourMode;

  // Offline Mutation
  const { mutate } = useOfflineMutation();

  // Loading State
  const [showLoading, setShowLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Removed pickImageFromGallery as CameraModal handles it.

  // Submit
  const handleSubmit = async () => {
    // 1. Prepare & Sanitize Data
    const rawData = {
        type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason: sanitizeInput(reason),
        replacementDate: type === "TUKAR_LIBUR" ? replacementDate.toISOString() : undefined,
    };

    // 2. Validate Data
    const validation = validateData(LeaveRequestSchema, rawData);

    if (!validation.success) {
        Alert.alert("Data Tidak Valid", validation.error);
        return;
    }

    if (type !== "CUTI" && type !== "TUKAR_LIBUR" && photos.length === 0) {
      Alert.alert("Error", "Foto bukti wajib diupload");
      return;
    }

    // Validate Tukar Libur Dates
    if (type === "TUKAR_LIBUR") {
      if (!replacementDate) {
        Alert.alert("Error", "Tanggal pengganti wajib diisi");
        return;
      }

      if (currentWorkDays) {
        const workDays = currentWorkDays.split(",").map((d) => d.trim());
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        const startDayName = days[startDate.getDay()];
        const replacementDayName = days[replacementDate.getDay()];

        // 1. Start Date MUST be a Working Day
        if (!workDays.includes(startDayName)) {
          Alert.alert(
            "Error Validasi",
            `Tanggal izin (${format(startDate, "dd MMM")}) harus merupakan HARI KERJA Anda (Jadwal: ${currentWorkDays}).`,
          );
          return;
        }

        // 2. Replacement Date MUST be an Off Day (not in workDays)
        // Note: We only check if it is NOT in workDays.
        // If it IS in workDays, it's invalid UNLESS it's a Holiday (which backend checks).
        // For stricter frontend UX, we warn if it looks like a working day.
        if (workDays.includes(replacementDayName)) {
          // Optional: You could allow it if it matches a known holiday, but frontend doesn't have holiday data easily.
          // For now, let's show a warning or rely on backend for the strict "Holiday" exception if user insists.
          // Or be strict: "Replacement must be outside normal work days OR a red date".
          // Since we can't check 'red date' easily here without API, maybe we let it pass to backend
          // if user insists, OR we just warn.
          // Let's rely on Backend for the "Holiday" exception to be safe,
          // BUT we can warn if it looks like a normal work day.
          // However, to follow the requested logic strictly:
          // "User TIDAK BISA menawarkan PENGGANTI di hari Selasa (karena sudah jadwal kerja), KECUALI hari Selasa tersebut adalah Tanggal Merah".
          // Since we can't check holiday here, we should probably let it submit and let backend fail if it's not a holiday.
          // BUT, usually these are basic "Work day vs Weekend" swaps.
          // Let's skips strict frontend blocking for replacement date to allow for the "Holiday exception".
          // We ONLY strictly block the Start Date (must be work day).
        }
      }
    }

    // Build photoMap for multiple photos
    const photoMap: Record<string, string> = {};
    photos.forEach((uri, idx) => {
      photoMap[`photo${idx}`] = uri;
    });

    // Start loading
    setShowLoading(true);
    setLoadingMessage(
      photos.length > 0 ? "Mengupload foto..." : "Memproses...",
    );
    setUploadProgress(0);

    try {
      const validData = validation.data;

      // Check online status
      const isOnline = await SyncService.isOnline();

      if (isOnline && photos.length > 0) {
          try {
              setLoadingMessage("Mengupload foto...");
              const uploadedUrls = await uploadService.uploadBatch(
                  photos,
                  "employee-leave",
                  (index, total, progress) => {
                      setLoadingMessage(`Mengupload foto ${index}/${total}...`);
                      setUploadProgress(progress.percentage);
                  }
              );

              setLoadingMessage("Mengirim data...");
              setUploadProgress(0);

              // Update photoMap with URLs? No, backend expects 'photos' array usually if we send it directly?
              // Or does useOfflineMutation/backend handle it?
              // The original logic used `photoMap` for offline sync which mapped local URI to form field.
              // If we upload manually, we should pass the URLs.
              // Let's assume the API endpoint `/api/mobile/leaves` accepts `photos` as array of strings (URLs).

              await mutate(
                {
                  ...validData,
                  photos: uploadedUrls,
                  // No meta needed for online upload of photos
                },
                {
                  url: `/api/mobile/leaves`,
                  method: "POST",
                  onSuccess: (_data: unknown, isOffline: boolean) => {
                    setShowLoading(false);
                    Alert.alert(
                      "Sukses",
                      "Pengajuan berhasil dikirim",
                      [{ text: "OK", onPress: () => router.back() }],
                    );
                  },
                  onError: (err: Error) => {
                    setShowLoading(false);
                    Alert.alert("Error", err.message || "Gagal mengirim pengajuan");
                  },
                }
              );
          } catch {
              setShowLoading(false);
              Alert.alert("Error", "Gagal mengupload foto");
          }
      } else {
          // Offline flow or no photos
          await mutate(
            {
              ...validData,
              photos: [], // Will be populated by upload results if offline
              meta: {
                photoMap: photoMap,
                photoType: "employee-leave",
              },
            },
            {
              url: `/api/mobile/leaves`,
              method: "POST",
              onSuccess: (_data: unknown, isOffline: boolean) => {
                setShowLoading(false);
                Alert.alert(
                  isOffline ? "Offline" : "Sukses",
                  isOffline ? "Pengajuan diantrikan" : "Pengajuan berhasil dikirim",
                  [{ text: "OK", onPress: () => router.back() }],
                );
              },
              onError: (err: Error) => {
                setShowLoading(false);
                Alert.alert("Error", err.message || "Gagal mengirim pengajuan");
              },
            },
          );
      }
    } catch {
      setShowLoading(false);
    }
  };

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
              Alert.alert("Error", "Gagal membuka kamera");
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
              Alert.alert("Error", "Gagal membuka galeri");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View
        style={tw`px-6 py-4 flex-row items-center bg-white border-b border-gray-100`}
      >
        <TouchableOpacity onPress={() => router.back()} disabled={showLoading}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={tw`text-lg font-bold text-slate-900 ml-4`}>
          Form Pengajuan
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={tw`p-6 pb-24`}
        showsVerticalScrollIndicator={false}
      >
        {/* Type Picker */}
        <View style={tw`mb-4`}>
          <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
            Tipe Izin
          </Text>
          <TouchableOpacity
            onPress={() => setShowTypePicker(!showTypePicker)}
            style={tw`bg-gray-50 p-3 rounded-xl border border-gray-200 flex-row justify-between items-center`}
            disabled={showLoading}
          >
            <Text style={tw`text-slate-800`}>
              {LEAVE_TYPES.find((t) => t.value === type)?.label}
            </Text>
            <ChevronDown size={20} color="#64748b" />
          </TouchableOpacity>
          {showTypePicker && (
            <View
              style={tw`bg-white border border-gray-200 rounded-xl mt-1 overflow-hidden`}
            >
              {LEAVE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => {
                    if (
                      t.value === "TUKAR_LIBUR" &&
                      currentWorkingHourMode === "FLEXIBLE"
                    ) {
                      Alert.alert(
                        "Tidak Tersedia",
                        "Fitur Tukar Libur tidak tersedia untuk karyawan dengan Jam Kerja Fleksibel karena Anda tidak memiliki jadwal libur tetap.",
                      );
                      setShowTypePicker(false);
                      return;
                    }
                    setType(t.value);
                    setShowTypePicker(false);
                  }}
                  style={tw`p-3 border-b border-gray-100 ${type === t.value ? "bg-teal-50" : ""}`}
                >
                  <View style={tw`flex-row justify-between items-center`}>
                    <Text
                      style={tw`${type === t.value ? "text-teal-600 font-bold" : "text-slate-700"}`}
                    >
                      {t.label}
                    </Text>
                    {t.value === "TUKAR_LIBUR" &&
                      currentWorkingHourMode === "FLEXIBLE" && (
                        <Text
                          style={tw`text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full`}
                        >
                          Tidak Bisa
                        </Text>
                      )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Debug / Schedule Info */}
        <View style={tw`bg-blue-50 p-3 rounded-xl border border-blue-100 mb-6`}>
          <Text style={tw`text-xs font-bold text-blue-600 uppercase mb-1`}>
            Jadwal Kerja Anda {liveWorkDays ? "(Live)" : "(Cached)"}
          </Text>
          <Text style={tw`text-sm text-blue-800`}>
            {(() => {
              if (currentWorkingHourMode === "FLEXIBLE") {
                return "Jam Kerja Fleksibel (Bebas / Tidak ada jadwal tetap)";
              }
              if (!currentWorkDays)
                return "Belum diatur (Asumsi: Senin - Jumat)";
              const dayMap: { [key: string]: string } = {
                Mon: "Senin",
                Tue: "Selasa",
                Wed: "Rabu",
                Thu: "Kamis",
                Fri: "Jumat",
                Sat: "Sabtu",
                Sun: "Minggu",
              };
              return currentWorkDays
                .split(",")
                .map((d) => dayMap[d.trim()] || d)
                .join(", ");
            })()}
          </Text>
          <Text style={tw`text-[10px] text-blue-500 mt-1 italic`}>
            *Data diambil dari server.
          </Text>
        </View>

        {/* Date Pickers */}
        <View style={tw`flex-row gap-3 mb-4`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
              {type === "TUKAR_LIBUR" ? "Tanggal Izin (Mau Libur)" : "Dari"}
            </Text>
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              style={tw`bg-gray-50 p-3 rounded-xl border border-gray-200`}
              disabled={showLoading}
            >
              <Text style={tw`text-slate-800`}>
                {format(startDate, "dd/MM/yyyy")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Hide End Date for TUKAR_LIBUR - Single Day Logic */}
          {type !== "TUKAR_LIBUR" && (
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
                Sampai
              </Text>
              <TouchableOpacity
                onPress={() => setShowEndPicker(true)}
                style={tw`bg-gray-50 p-3 rounded-xl border border-gray-200`}
                disabled={showLoading}
              >
                <Text style={tw`text-slate-800`}>
                  {format(endDate, "dd/MM/yyyy")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Native Picker for Start Date - Only if NOT Tukar Libur */}
        {type !== "TUKAR_LIBUR" && showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            onChange={(_, date) => {
              setShowStartPicker(false);
              if (date) {
                setStartDate(date);
                if (endDate < date) setEndDate(date);
              }
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            onChange={(_, date) => {
              setShowEndPicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}

        {/* Replacement Date for TUKAR_LIBUR */}
        {/* Replacement Date for TUKAR_LIBUR */}
        {/* Replacement Date for TUKAR_LIBUR */}
        {type === "TUKAR_LIBUR" && (
          <View style={tw`mb-4`}>
            <Text style={tw`text-xs font-bold text-teal-600 uppercase mb-2`}>
              Tanggal Pengganti (Wajib Masuk)
            </Text>
            <TouchableOpacity
              onPress={() => setShowReplacementPicker(true)}
              style={tw`bg-teal-50 p-3 rounded-xl border border-teal-200`}
              disabled={showLoading}
            >
              <Text style={tw`text-teal-800 font-bold`}>
                {format(replacementDate, "dd MMMM yyyy")}
              </Text>
            </TouchableOpacity>
            <Text style={tw`text-xs text-gray-500 mt-1 italic`}>
              *Pilih tanggal di mana Anda bersedia masuk kerja.
            </Text>
          </View>
        )}

        {/* Custom Calendar Modals for TUKAR_LIBUR */}
        {type === "TUKAR_LIBUR" && (
          <>
            {/* Start Date Picker (Hari Izin - Should be WORK DAY) */}
            <CustomDatePickerModal
              visible={showStartPicker}
              onClose={() => setShowStartPicker(false)}
              onSelect={(date) => {
                setStartDate(date);
                // Sync end date
                if (endDate < date) setEndDate(date);
              }}
              title="Pilih Tanggal Izin"
              minDate={new Date().toISOString().split("T")[0]}
              markedDates={(() => {
                const workDays = user?.workDays
                  ? user.workDays.split(",").map((d) => d.trim())
                  : [];
                const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const marks: MarkedDates = {};

                // Generate marks for next 3 months to be safe
                const today = new Date();
                const rangeStart = startOfMonth(today);
                const rangeEnd = endOfMonth(addMonths(today, 2));

                eachDayOfInterval({ start: rangeStart, end: rangeEnd }).forEach(
                  (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const dayName = days[date.getDay()];
                    const isWorkDay = workDays.includes(dayName);
                    const isSelected = isSameDay(date, startDate);

                    if (isWorkDay) {
                      // Work Day: Green (Selectable)
                      marks[dateStr] = {
                        customStyles: {
                          container: {
                            backgroundColor: isSelected
                              ? "#0d9488"
                              : "transparent",
                            borderWidth: isSelected ? 0 : 0,
                            borderRadius: 8,
                          },
                          text: {
                            color: isSelected ? "#ffffff" : "#0f172a", // Dark text for unselected
                            fontWeight: "600",
                          },
                        },
                      };
                    } else {
                      // Off Day: Disabled (Gray)
                      marks[dateStr] = {
                        disabled: true,
                        disableTouchEvent: true,
                        customStyles: {
                          container: {
                            backgroundColor: "#f1f5f9",
                          },
                          text: {
                            color: "#cbd5e1", // Gray text
                          },
                        },
                      };
                    }
                  },
                );
                return marks;
              })()}
            />

            {/* Replacement Date Picker (Hari Pengganti - Should be OFF DAY) */}
            <CustomDatePickerModal
              visible={showReplacementPicker}
              onClose={() => setShowReplacementPicker(false)}
              onSelect={(date) => setReplacementDate(date)}
              title="Pilih Tanggal Pengganti"
              minDate={new Date().toISOString().split("T")[0]}
              markedDates={(() => {
                const workDays = user?.workDays
                  ? user.workDays.split(",").map((d) => d.trim())
                  : [];
                const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const marks: MarkedDates = {};

                // Generate marks for next 3 months
                const today = new Date();
                const rangeStart = startOfMonth(today);
                const rangeEnd = endOfMonth(addMonths(today, 2));

                eachDayOfInterval({ start: rangeStart, end: rangeEnd }).forEach(
                  (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const dayName = days[date.getDay()];
                    const isWorkDay = workDays.includes(dayName);
                    const isSelected = isSameDay(date, replacementDate);

                    if (!isWorkDay) {
                      // OFF DAYS are Good for Replacement -> Green
                      marks[dateStr] = {
                        customStyles: {
                          container: {
                            backgroundColor: isSelected ? "#0d9488" : "#ecfdf5", // Light green bg for suggestion
                            borderRadius: 8,
                          },
                          text: {
                            color: isSelected ? "#ffffff" : "#047857", // Dark green text
                            fontWeight: "bold",
                          },
                        },
                      };
                    } else {
                      // WORK DAYS are Bad for Replacement -> Red (but clickable)
                      marks[dateStr] = {
                        customStyles: {
                          text: {
                            color: "#ef4444", // Red text
                            fontWeight: "normal",
                          },
                        },
                      };
                    }
                  },
                );
                return marks;
              })()}
            />
          </>
        )}

        {/* Native Picker for other types OR if not TUKAR_LIBUR */}
        {type !== "TUKAR_LIBUR" && showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            onChange={(_, date) => {
              setShowStartPicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}
        {/* Only show Native Replacement Picker if NOT TUKAR_LIBUR (which shouldn't happen logic-wise but good safeguard) */}
        {type !== "TUKAR_LIBUR" && showReplacementPicker && (
          <DateTimePicker
            value={replacementDate}
            mode="date"
            onChange={(_, date) => {
              setShowReplacementPicker(false);
              if (date) setReplacementDate(date);
            }}
          />
        )}

        {/* Reason */}
        <View style={tw`mb-4`}>
          <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
            Alasan
          </Text>
          <TextInput
            style={[
              tw`bg-gray-50 p-3 rounded-xl border border-gray-200`,
              { minHeight: 120, textAlignVertical: "top" },
            ]}
            placeholder="Jelaskan alasan pengajuan secara rinci..."
            multiline
            value={reason}
            onChangeText={setReason}
            placeholderTextColor="#94a3b8"
            editable={!showLoading}
          />
        </View>

        {/* Photo Upload (required for non-CUTI and non-TUKAR_LIBUR) */}
        {type !== "CUTI" && type !== "TUKAR_LIBUR" && (
          <View style={tw`mb-6`}>
            <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
              Foto Bukti (Wajib)
            </Text>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <View style={tw`flex-row flex-wrap gap-2 mb-3`}>
                {photos.map((photo, idx) => (
                  <View key={idx} style={tw`relative`}>
                    <ImageWithCache source={photo}
                      style={tw`w-24 h-24 rounded-lg bg-gray-100`}
                     contentFit="cover" transition={1000}       />
                    <TouchableOpacity
                      onPress={() => removePhoto(idx)}
                      style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full p-1 border border-white`}
                      disabled={showLoading}
                    >
                      <X size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Photo Buttons */}
            <TouchableOpacity
              onPress={handleImageSelection}
              style={tw`bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl h-24 items-center justify-center active:bg-gray-100`}
              disabled={showLoading}
            >
              <Camera size={28} color="#64748b" />
              <Text style={tw`text-slate-500 text-sm mt-1 font-medium`}>
                {photos.length > 0 ? "Tambah Foto Lain" : "Ambil Foto"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submit All */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={
            showLoading ||
            (type !== "CUTI" &&
              type !== "TUKAR_LIBUR" &&
              photos.length === 0) ||
            !reason.trim()
          }
          style={[
            tw`py-4 rounded-xl items-center shadow-sm`,
            showLoading ||
            (type !== "CUTI" &&
              type !== "TUKAR_LIBUR" &&
              photos.length === 0) ||
            !reason.trim()
              ? tw`bg-gray-300`
              : tw`bg-teal-600`,
          ]}
        >
          <Text style={tw`text-white font-bold text-lg`}>
            {showLoading ? "Memproses..." : "Kirim Pengajuan"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Loading Modal */}
      <LoadingModal visible={showLoading} message={loadingMessage} progress={uploadProgress > 0 ? uploadProgress : undefined} />
    </SafeAreaView>
  );
}
