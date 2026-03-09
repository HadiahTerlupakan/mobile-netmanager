import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { FormSkeleton } from '@/components/molecules/FormSkeleton';
import LoadingModal from "@/components/molecules/LoadingModal";
import SelectionModal from "@/components/molecules/SelectionModal";
import { useAuth } from "@/context/AuthContext";
import {
  isOfflineMutationQueuedResult,
  useApiMutation,
  useApiQuery,
} from "@/hooks/queries";
import { queryKeys } from '@/lib/queryClient';
import { SyncService } from "@/services/SyncService";
import { uploadService } from "@/services/UploadService";
import { presentAppError, presentInfoMessage, presentSuccessMessage } from "@/utils/errorPresenter";
import { InventoryMasukSchema, sanitizeInput, validateData } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";

import { formatDateRaw } from "@/utils/date";
import { logger } from "@/utils/logger";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import tw from "twrnc";
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AppFeature } from '@/constants/features';

interface Gudang {
  id: string;
  nama: string;
  kode?: string;
}

interface Barang {
  id: string;
  kode: string;
  nama: string;
  satuan: string;
}

interface PhotoWithMeta {
  uri: string;
  width: number;
  height: number;
  capturedAt: Date;
}

const KONDISI_OPTIONS = [
  { label: "Baru", value: "BARU" },
  { label: "Bekas", value: "BEKAS" },
  { label: "Rusak", value: "RUSAK" },
];

export default function BarangMasukScreen() {
  useFeatureGuard(AppFeature.BARANG_MASUK);

  const router = useRouter();
  const { token, user } = useAuth();

  const [gudangs, setGudangs] = useState<Gudang[]>([]);
  const [barangs, setBarangs] = useState<Barang[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedGudang, setSelectedGudang] = useState("");
  const [selectedBarang, setSelectedBarang] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [kondisi, setKondisi] = useState("BARU");
  const [keterangan, setKeterangan] = useState("");
  const [photos, setPhotos] = useState<PhotoWithMeta[]>([]);

  // Modal state
  const [showGudangModal, setShowGudangModal] = useState(false);
  const [showBarangModal, setShowBarangModal] = useState(false);

  // Loading state
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showLoading, setShowLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Refs for watermark capture
  const watermarkRefs = useRef<(View | null)[]>([]);

  const masukMutation = useApiMutation({
    endpoint: "/api/mobile/inventory/masuk",
    method: "POST",
    invalidateKeys: [queryKeys.inventory.master('masuk'), queryKeys.inventory.warehouses()],
  });

  // Memoize modal items to prevent recreation on every render
  const gudangModalItems = useMemo(() => gudangs.map((g) => ({
    id: g.id,
    label: g.nama,
    subLabel: g.kode,
    value: g.id,
  })), [gudangs]);

  const barangModalItems = useMemo(() => barangs.map((b) => ({
    id: b.id,
    label: b.nama,
    subLabel: b.kode,
    value: b.id,
  })), [barangs]);

  // Api Query: Gudangs
  const { data: gudangList, isPending: isLoadingGudangs } = useApiQuery<Gudang[]>({
    queryKey: queryKeys.inventory.warehouses(),
    endpoint: "/api/mobile/inventory/gudang",
    select: (data: any) => data?.gudangList || [],
    enabled: !!token,
  });

  useEffect(() => {
    if (gudangList) setGudangs(gudangList);
  }, [gudangList]);

  // Api Query: Barangs (All items for selection)
  const { data: barangData, isPending: isLoadingBarangs } = useApiQuery<Barang[]>({
    queryKey: queryKeys.inventory.master('masuk'),
    endpoint: "/api/mobile/inventory/barang?mode=masuk",
    select: (data: any) => data?.barangList || [],
    enabled: !!token,
  });

  useEffect(() => {
    if (barangData) setBarangs(barangData);
  }, [barangData]);

  if (isLoadingGudangs && !gudangs.length) {
    return <FormSkeleton />;
  }

  // Helper to resize image
  const resizeImage = async (
    uri: string,
  ): Promise<{ uri: string; width: number; height: number }> => {
    try {
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }], // Resize to 1080px width, auto height
        { compress: 0.8, format: SaveFormat.JPEG },
      );
      return {
        uri: manipResult.uri,
        width: manipResult.width,
        height: manipResult.height,
      };
    } catch (error) {
      logger.error("Failed to resize image:", error);
      // Fallback to original if resize fails (though unlikely)
      return { uri, width: 800, height: 600 };
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      presentInfoMessage("Izin akses galeri diperlukan", "Akses Ditolak");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false, // We resize manually
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Resize immediately
      const resized = await resizeImage(asset.uri);
      setPhotos([
        ...photos,
        {
          uri: resized.uri,
          width: resized.width,
          height: resized.height,
          capturedAt: new Date(),
        },
      ]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      presentInfoMessage("Izin akses kamera diperlukan", "Akses Ditolak");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Resize immediately
      const resized = await resizeImage(asset.uri);
      setPhotos([
        ...photos,
        {
          uri: resized.uri,
          width: resized.width,
          height: resized.height,
          capturedAt: new Date(),
        },
      ]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const captureWatermarkedPhoto = async (
    index: number,
  ): Promise<string | null> => {
    const ref = watermarkRefs.current[index];
    if (!ref) return photos[index]?.uri || null;

    try {
      const uri = await captureRef(ref, {
        format: "jpg",
        quality: 0.8,
      });
      return uri;
    } catch (error) {
      logger.error("Watermark capture error:", error);
      return photos[index]?.uri || null;
    }
  };

  const processPhotos = async (): Promise<string[]> => {
    const processedUris: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const watermarkedUri = await captureWatermarkedPhoto(i);
      if (watermarkedUri) processedUris.push(watermarkedUri);
    }
    return processedUris;
  };

  const uploadPhotos = async (uris: string[]): Promise<string[]> => {
    logger.info("[Upload] Starting upload for URIs:", uris);
    try {
      setUploadProgress(0);
      return await uploadService.uploadBatch(
        uris,
        'inventory-masuk',
        (index, total, progress) => {
          setLoadingMessage(`Mengupload foto ${index}/${total}...`);
          setUploadProgress(progress.percentage);
        }
      );
    } catch (error) {
      logger.error("[Upload] Batch upload failed:", error);
      throw error; // Re-throw to be caught by handleSubmit
    }
  };

  const resetForm = () => {
    setSelectedBarang("");
    setJumlah("");
    setKondisi("BARU");
    setKeterangan("");
    setPhotos([]);
  };

  const handleSubmit = async () => {
    // 1. Prepare & Sanitize Data
    const rawData = {
      barangId: selectedBarang,
      gudangId: selectedGudang,
      jumlah: parseInt(jumlah) || 0,
      kondisi,
      keterangan: sanitizeInput(keterangan),
    };

    // 2. Validate
    const validation = validateData(InventoryMasukSchema, rawData);

    if (!validation.success) {
      presentInfoMessage(validation.error, "Data Tidak Valid");
      return;
    }

    // 1. Process Photos (Capture Watermark)
    setShowLoading(true);
    setLoadingMessage("Memproses foto...");

    try {
      const processedPhotos = await processPhotos();

      // 2. Check Connection
      const isOnline = await SyncService.isOnline();

      // 3. Prepare Data from Validation
      const payload = validation.data;

      if (isOnline) {
        setSubmitting(true);
        try {
          // Upload photos first
          setLoadingMessage("Mengupload foto...");
          const uploadedUrls = await uploadPhotos(processedPhotos);

          // Submit via Mutate (Online)
          setLoadingMessage("Menyimpan data...");
          masukMutation.mutate(
            {
              ...payload,
              fotoBukti: uploadedUrls,
            },
            {
              onSuccess: () => {
                setShowLoading(false);
                resetForm();
                presentSuccessMessage("Barang masuk berhasil dicatat");
                router.replace("/(app)/barang");
              },
              onError: (err) => {
                setShowLoading(false);
                presentAppError(err, {
                  screen: 'InventoryInScreen',
                  route: '/(app)/barang/masuk',
                });
              },
            },
          );
        } catch (error) {
          setShowLoading(false);
          presentAppError(error, {
            screen: 'InventoryInScreen',
            route: '/(app)/barang/masuk',
          });
        } finally {
          setSubmitting(false);
        }
      } else {
        // Offline - Submit to Queue with Local URIs
        setLoadingMessage("Menyimpan ke antrian offline...");
        masukMutation.mutate(
          {
            ...payload,
            fotoBukti: [], // Placeholder
            meta: {
              photos: processedPhotos, // Local URIs for SyncService
              targetField: "fotoBukti",
            },
          },
          {
            onSuccess: (data) => {
              setShowLoading(false);
              const isOffline = isOfflineMutationQueuedResult(data);
              if (isOffline) {
                resetForm();
                router.back();
              }
            },
            onError: () => {
              setShowLoading(false);
            },
          },
        );
      }
    } catch (error) {
      setShowLoading(false);
      logger.error(error);
      presentAppError(error, {
        screen: 'InventoryInScreen',
        route: '/(app)/barang/masuk',
      });
    }
  };

  const selectedBarangData = barangs.find((b) => b.id === selectedBarang);
  const selectedBarangName = selectedBarangData
    ? `${selectedBarangData.kode} - ${selectedBarangData.nama}`
    : "";
  const selectedGudangData = gudangs.find((g) => g.id === selectedGudang);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top"]}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-4 border-b border-gray-100`}>
        <View style={tw`flex-row items-center justify-between`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={tw`text-lg font-bold text-gray-900`}>Barang Masuk</Text>
          <View style={tw`w-8`} />
        </View>
      </View>

      <ScrollView style={tw`flex-1`} keyboardShouldPersistTaps="handled">
        <View style={tw`p-4`}>
          {/* Gudang Selection - Custom Modal */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
              Gudang *
            </Text>
            <TouchableOpacity
              onPress={() => setShowGudangModal(true)}
              style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between h-14`}
            >
              <Text
                style={tw`${selectedGudang ? "text-gray-900" : "text-gray-400"} text-base`}
              >
                {selectedGudangData
                  ? selectedGudangData.nama
                  : "Pilih Gudang..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Barang Selection - Custom Modal */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
              Barang *
            </Text>
            <TouchableOpacity
              onPress={() => setShowBarangModal(true)}
              style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between h-14`}
            >
              <Text
                style={tw`${selectedBarang ? "text-gray-900" : "text-gray-400"} text-base flex-1 mr-2`}
                numberOfLines={1}
              >
                {selectedBarangName || "Pilih Barang..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {selectedBarangData && (
              <View style={tw`mt-2 p-3 bg-blue-50 rounded-lg`}>
                <Text style={tw`text-xs text-blue-700 font-medium`}>
                  Satuan: {selectedBarangData.satuan}
                </Text>
              </View>
            )}
          </View>

          {/* Kondisi */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
              Kondisi
            </Text>
            <View style={tw`flex-row gap-2`}>
              {KONDISI_OPTIONS.map((k) => (
                <TouchableOpacity
                  key={k.value}
                  onPress={() => setKondisi(k.value)}
                  style={tw`flex-1 py-3 rounded-xl border items-center ${kondisi === k.value
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white border-gray-200"
                    }`}
                >
                  <Text
                    style={tw`font-medium ${kondisi === k.value ? "text-blue-700" : "text-gray-600"
                      }`}
                  >
                    {k.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Jumlah */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
              Jumlah *
            </Text>
            <TextInput
              style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-base`}
              placeholder="Masukkan jumlah"
              keyboardType="numeric"
              value={jumlah}
              onChangeText={setJumlah}
            />
          </View>

          {/* Keterangan */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
              Keterangan
            </Text>
            <TextInput
              style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-base h-24`}
              placeholder="Catatan tambahan (opsional)"
              value={keterangan}
              onChangeText={setKeterangan}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Photo Upload */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
              Foto Bukti
            </Text>

            {/* Small Thumbnail Grid */}
            {photos.length > 0 && (
              <View style={tw`flex-row flex-wrap gap-2 mb-3`}>
                {photos.map((photo, index) => (
                  <View key={photo.uri} style={tw`relative`}>
                    <ImageWithCache source={photo.uri}
                      style={tw`w-20 h-20 rounded-lg`}
                      contentFit="cover" transition={1000} />
                    <TouchableOpacity
                      style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full p-1`}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Hidden Watermark Views for Capture */}
            <View
              style={[
                tw`absolute`,
                { top: 0, left: 0, right: 0, opacity: 0, zIndex: -10 },
              ]}
              pointerEvents="none"
            >
              {photos.map((photo, index) => (
                <View
                  key={photo.uri}
                  ref={(ref) => {
                    watermarkRefs.current[index] = ref;
                  }}
                  collapsable={false}
                  style={{
                    width: photo.width,
                    height: photo.height,
                    backgroundColor: "black",
                  }}
                >
                  <ImageWithCache source={photo.uri}
                    style={{ width: photo.width, height: photo.height }}
                    contentFit="contain"
                    transition={1000} />
                  {/* Watermark Overlay - Dynamic Sizing */}
                  <View
                    style={[
                      tw`absolute bottom-0 left-0 right-0 bg-black/70`,
                      { padding: photo.width * 0.04 },
                    ]}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        marginBottom: photo.width * 0.01,
                        fontSize: photo.width * 0.05,
                      }}
                    >
                      📦 BARANG MASUK
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontSize: photo.width * 0.035,
                        marginBottom: photo.width * 0.005,
                      }}
                    >
                      {selectedBarangName || "Memilih barang..."}
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontSize: photo.width * 0.035,
                        marginBottom: photo.width * 0.02,
                      }}
                    >
                      Jumlah: {jumlah || "0"} | Kondisi: {kondisi}
                    </Text>
                    <View style={tw`flex-row items-center mt-1`}>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: photo.width * 0.03,
                        }}
                      >
                        ⏰ {formatDateRaw(photo.capturedAt, "HH:mm:ss")} •{" "}
                        {formatDateRaw(photo.capturedAt, "D MMM YYYY")}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: photo.width * 0.03,
                        marginTop: photo.width * 0.01,
                      }}
                    >
                      👤 {user?.name || "User"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Photo Buttons */}
            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                style={tw`flex-1 flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3`}
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={20} color="#3B82F6" />
                <Text style={tw`ml-2 text-blue-600 font-medium`}>Kamera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex-1 flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3`}
                onPress={pickImage}
              >
                <Ionicons name="images" size={20} color="#3B82F6" />
                <Text style={tw`ml-2 text-blue-600 font-medium`}>Galeri</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={tw`bg-blue-600 rounded-xl py-4 items-center ${submitting || masukMutation.isPending ? "opacity-50" : ""}`}
            onPress={handleSubmit}
            disabled={submitting || masukMutation.isPending}
          >
            {submitting || masukMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white font-bold text-base`}>Simpan</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODALS */}
      <SelectionModal
        visible={showGudangModal}
        onClose={() => setShowGudangModal(false)}
        title="Pilih Gudang"
        searchPlaceholder="Cari gudang..."
        items={gudangModalItems}
        onSelect={(item) => setSelectedGudang(item.value)}
        selectedValue={selectedGudang}
        loading={isLoadingGudangs}
      />

      <SelectionModal
        visible={showBarangModal}
        onClose={() => setShowBarangModal(false)}
        title="Pilih Barang"
        searchPlaceholder="Cari barang..."
        items={barangModalItems}
        onSelect={(item) => setSelectedBarang(item.value)}
        selectedValue={selectedBarang}
        loading={isLoadingBarangs}
      />

      <LoadingModal visible={showLoading} message={loadingMessage} progress={uploadProgress > 0 ? uploadProgress : undefined} />
    </SafeAreaView>
  );
}
