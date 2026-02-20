import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import LoadingModal from "@/components/molecules/LoadingModal"; // Import LoadingModal
import { LocationPickerModal } from "@/components/organisms/marketing/LocationPickerModal";

import { useApiMutation } from "@/hooks/queries";
import { SyncService } from "@/services/SyncService"; // Import SyncService
import { uploadService } from "@/services/UploadService"; // Import UploadService
import { getUserFriendlyError } from "@/utils/errorHandling";
import { logger } from "@/utils/logger";
import { CanvasingSchema, sanitizeInput, validateData } from "@/utils/validation";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  Camera,
  ChevronLeft,
  Image as ImageIcon,
  Info,
  Map as MapIcon,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  User,
  X,
  Zap,
  ZapOff,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TextInput, TextInputProps, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AppFeature } from '@/constants/features';

export default function CreateCanvasingScreen() {
  useFeatureGuard(AppFeature.CANVASING);

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<{
    nama: string;
    noKtp: string;
    noTelpon: string;
    email: string;
    alamat: string;
    kabel: string;
    odp: string;
    paket: string;
    sn: string;
    shareloc: string;
    latitude?: number;
    longitude?: number;
  }>({
    nama: "",
    noKtp: "",
    noTelpon: "",
    email: "",
    alamat: "",
    kabel: "",
    odp: "",
    paket: "",
    sn: "",
    shareloc: "",
    latitude: undefined,
    longitude: undefined,
  });

  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [fotoKtpLocal, setFotoKtpLocal] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [targetPhoto, setTargetPhoto] = useState<"foto" | "ktp">("foto");
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const cameraRef = useRef<CameraView>(null);

  const [loadingMessage, setLoadingMessage] = useState("Menyimpan data...");
  const [uploadProgress, setUploadProgress] = useState(0);

  const { mutate, isPending: isMutating } = useApiMutation({
    endpoint: "/api/marketing/canvasing",
    method: "POST",
    showErrorAlert: false, // We handle errors manually
    invalidateKeys: [["marketing_canvasing_list"]], // Refresh list after create
  });

  const openCamera = async (type: "foto" | "ktp") => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Izin Ditolak",
          "Aplikasi butuh izin kamera untuk mengambil foto.",
        );
        return;
      }
    }
    setTargetPhoto(type);
    setFacing("back"); // Default back camera
    setShowCamera(true);
  };

  const handleGalleryPick = async (type: "foto" | "ktp") => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled) {
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );

        if (type === "foto") setFotoLocal(manipulated.uri);
        else setFotoKtpLocal(manipulated.uri);
      }
    } catch (error) {
      logger.error("Gallery pick error:", error);
      const { title, message } = getUserFriendlyError(error);
      Alert.alert(title, message);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });

      if (photo?.uri) {
        // Define manipulation actions
        const actions: ImageManipulator.Action[] = [
          { resize: { width: 1024 } },
        ];

        // Retrieve current target
        // If it's KTP, we forced a Portrait photo of a Landscape doc.
        // We rotate it -90 (or 90) to restore it to Landscape orientation for the preview/upload.
        if (targetPhoto === "ktp") {
          actions.push({ rotate: -90 });
        }

        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          actions,
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );

        if (targetPhoto === "foto") setFotoLocal(manipulated.uri);
        else setFotoKtpLocal(manipulated.uri);

        setShowCamera(false);
      }
    } catch (error) {
      logger.error("Capture error:", error);
      const { title, message } = getUserFriendlyError(error);
      Alert.alert(title, message);
    }
  };

  const handleSubmit = async () => {
    // 1. Sanitize & Prepare Data
    const rawData = {
      ...form,
      kabel: form.kabel ? parseInt(form.kabel) : 0, // Convert string to number for schema
      // Sanitize string inputs
      nama: sanitizeInput(form.nama),
      noKtp: sanitizeInput(form.noKtp),
      noTelpon: sanitizeInput(form.noTelpon),
      email: sanitizeInput(form.email),
      alamat: sanitizeInput(form.alamat),
      odp: sanitizeInput(form.odp),
      paket: sanitizeInput(form.paket),
      sn: sanitizeInput(form.sn),
      shareloc: sanitizeInput(form.shareloc),
    };

    // 2. Validate Data
    const validation = validateData(CanvasingSchema, rawData);

    if (!validation.success) {
      Alert.alert("Data Tidak Valid", validation.error);
      return;
    }

    if (!fotoKtpLocal) {
      Alert.alert("Peringatan", "Foto KTP wajib diunggah");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Memproses...");
    setUploadProgress(0);

    try {
      const validData = validation.data; // Use the validated and parsed data

      // Check connection
      const isOnline = await SyncService.isOnline();

      if (isOnline) {
        // Manual upload for progress
        const photoMap: Record<string, string> = {};

        try {
          if (fotoLocal) {
            setLoadingMessage("Mengupload Foto Lokasi...");
            setUploadProgress(0);
            const url = await uploadService.uploadFile(fotoLocal, "marketing", {
              onProgress: (p) => setUploadProgress(p.percentage)
            });
            photoMap["foto"] = url;
          }

          if (fotoKtpLocal) {
            setLoadingMessage("Mengupload Foto KTP...");
            setUploadProgress(0);
            const url = await uploadService.uploadFile(fotoKtpLocal, "marketing", {
              onProgress: (p) => setUploadProgress(p.percentage)
            });
            photoMap["fotoKtp"] = url;
          }

          setLoadingMessage("Menyimpan data...");
          setUploadProgress(0); // Indeterminate

          mutate(
            {
              ...validData,
              ...photoMap, // Pass URLs directly
            },
            {
              onSuccess: () => {
                setIsLoading(false);
                Alert.alert("Berhasil", "Data canvasing berhasil disimpan", [
                  { text: "OK", onPress: () => router.back() },
                ]);
              },
              onError: (err) => {
                setIsLoading(false);
                logger.error("Submit error:", err);
                const { title, message } = getUserFriendlyError(err);
                Alert.alert(title, message);
              },
            },
          );
        } catch (uploadError) {
          setIsLoading(false);
          logger.error("Upload error:", uploadError);
          const { title, message } = getUserFriendlyError(uploadError);
          Alert.alert(title, message);
        }
      } else {
        // Offline flow
        // Prepare photo map for upload (local URIs)
        const photoMap: Record<string, string> = {};
        if (fotoLocal) photoMap["foto"] = fotoLocal;
        if (fotoKtpLocal) photoMap["fotoKtp"] = fotoKtpLocal;

        setLoadingMessage("Menyimpan offline...");
        mutate(
          {
            ...validData,
            meta: {
              photoMap,
              photoType: "marketing",
            },
          },
          {
            onSuccess: (data: any) => {
              setIsLoading(false);
              // const isOffline = data?.__offline_queued__;
              Alert.alert("Berhasil", "Data canvasing berhasil disimpan (Offline)", [
                { text: "OK", onPress: () => router.back() },
              ]);
            },
            onError: (err) => {
              setIsLoading(false);
              logger.error("Submit error:", err);
              const { title, message } = getUserFriendlyError(err);
              Alert.alert(title, message);
            },
          },
        );
      }
    } catch (error) {
      setIsLoading(false);
      logger.error("Submit exception:", error);
      const { title, message } = getUserFriendlyError(error);
      Alert.alert(title, message);
    }
  };

  // Custom Camera View
  if (showCamera) {
    return (
      <View style={tw`flex-1 bg-black`}>
        <StatusBar hidden />
        <CameraView
          style={tw`flex-1`}
          facing={facing}
          flash={flash}
          ref={cameraRef}
        />
        {/* Top Controls */}
        <View style={tw`absolute top-0 left-0 right-0 flex-row justify-between p-6 pt-12 bg-black/30 z-20`}>
          <TouchableOpacity
            onPress={() => setShowCamera(false)}
            style={tw`bg-black/40 p-2 rounded-full`}
          >
            <X color="white" size={24} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
            style={tw`bg-black/40 p-2 rounded-full`}
          >
            {flash === "on" ? (
              <Zap color="#facc15" size={24} />
            ) : (
              <ZapOff color="white" size={24} />
            )}
          </TouchableOpacity>
        </View>

        {/* Guide Overlay */}
        <View style={tw`absolute inset-0 items-center justify-center pointer-events-none z-10`}>
          {targetPhoto === "ktp" ? (
            <View style={tw`relative items-center justify-center`}>
              {/* Dark overlay around the box - top */}
              <View
                style={tw`absolute -top-[1000px] left-0 right-0 h-[1000px] bg-black/60`}
              />
              {/* Dark overlay around the box - bottom */}
              <View
                style={tw`absolute -bottom-[1000px] left-0 right-0 h-[1000px] bg-black/60`}
              />
              {/* Dark overlay around the box - left */}
              <View
                style={tw`absolute top-0 -left-[1000px] w-[1000px] bottom-0 bg-black/60`}
              />
              {/* Dark overlay around the box - right */}
              <View
                style={tw`absolute top-0 -right-[1000px] w-[1000px] bottom-0 bg-black/60`}
              />

              {/* The KTP Box - Fixed Dimensions 1:1.58 Portrait (280px x 444px) - Larger for better visibility */}
              <View
                style={tw`w-[280px] h-[444px] border-2 border-white/80 rounded-xl bg-transparent relative z-10`}
              >
                <View
                  style={tw`absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl`}
                />
                <View
                  style={tw`absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl`}
                />
                <View
                  style={tw`absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl`}
                />
                <View
                  style={tw`absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl`}
                />
              </View>
            </View>
          ) : (
            // Simple guide for location/photo
            <View
              style={tw`w-[80%] aspect-square border border-white/30 border-dashed rounded-3xl relative`}
            />
          )}
        </View>

        {/* Bottom Controls */}
        <View
          style={tw`absolute bottom-0 left-0 right-0 flex-row items-center justify-around pb-12 pt-6 bg-black/40 z-20`}
        >
          <View style={tw`w-12`} />
          <TouchableOpacity
            onPress={handleCapture}
            style={tw`w-20 h-20 bg-white rounded-full border-4 border-gray-300 items-center justify-center`}
          >
            <View
              style={tw`w-16 h-16 bg-white rounded-full border-2 border-gray-200`}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              setFacing((f) => (f === "back" ? "front" : "back"))
            }
            style={tw`w-12 items-center`}
          >
            <RotateCcw color="white" size={24} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={tw`flex-1`}
      >
        {/* Header */}
        <View
          style={tw`bg-white pb-4 px-4 pt-4 shadow-sm z-10 flex-row items-center justify-between`}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`w-10 h-10 items-center justify-center bg-gray-50 rounded-full`}
          >
            <ChevronLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={tw`text-lg font-extrabold text-gray-900`}>
            Request Canvasing
          </Text>
          <View style={tw`w-10`} />
        </View>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-32`}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Info */}
          <View style={tw`bg-blue-600 p-6 mb-2`}>
            <Text style={tw`text-white text-xl font-black mb-1`}>
              Input Data Baru
            </Text>
            <Text style={tw`text-blue-100 text-xs font-medium`}>
              Pastikan semua informasi pelanggan valid sebelum disimpan.
            </Text>
          </View>

          <View style={tw`px-4 pt-4`}>
            {/* Section: Dokumen & Foto */}
            <FormSectionHeader
              title="Dokumen & Foto"
              icon={<MapPin size={16} color="#2563eb" />}
            />
            <View
              style={tw`bg-white rounded-3xl p-5 mb-8 shadow-sm border border-gray-100`}
            >
              <PhotoPickerField
                title="Foto Lokasi / Rumah"
                value={fotoLocal}
                onPickCamera={() => openCamera("foto")}
                onPickGallery={() => handleGalleryPick("foto")}
                onRemove={() => setFotoLocal(null)}
              />
              <View style={tw`h-px bg-gray-50 my-4`} />
              <PhotoPickerField
                title="Foto Kartu Identitas (KTP)"
                value={fotoKtpLocal}
                onPickCamera={() => openCamera("ktp")}
                onPickGallery={() => handleGalleryPick("ktp")}
                onRemove={() => setFotoKtpLocal(null)}
                required
              />
            </View>

            {/* Section: Data Pelanggan */}
            <FormSectionHeader
              title="Informasi Pelanggan"
              icon={<User size={16} color="#2563eb" />}
            />
            <View
              style={tw`bg-white rounded-3xl p-5 mb-8 shadow-sm border border-gray-100`}
            >
              <InputField
                label="Nama Lengkap Sesuai KTP"
                placeholder="Contoh: Budi Santoso"
                value={form.nama}
                onChangeText={(text: string) =>
                  setForm({ ...form, nama: text })
                }
                required
              />
              <InputField
                label="NIK (16 Digit)"
                placeholder="320..."
                value={form.noKtp}
                onChangeText={(text: string) =>
                  setForm({ ...form, noKtp: text })
                }
                keyboardType="numeric"
                maxLength={16}
                required
              />
              <InputField
                label="Email"
                placeholder="nama@email.com"
                value={form.email}
                onChangeText={(text: string) =>
                  setForm({ ...form, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <InputField
                label="Nomor WhatsApp"
                placeholder="08..."
                value={form.noTelpon}
                onChangeText={(text: string) =>
                  setForm({ ...form, noTelpon: text })
                }
                keyboardType="phone-pad"
                required
              />
              <InputField
                label="Alamat Lengkap"
                placeholder="Jalan, No Rumah, RT/RW..."
                value={form.alamat}
                onChangeText={(text: string) =>
                  setForm({ ...form, alamat: text })
                }
                multiline
                required
              />
            </View>

            {/* Section: Teknis & Paket */}
            <FormSectionHeader
              title="Detail Teknis & Layanan"
              icon={<Settings size={16} color="#2563eb" />}
            />
            <View
              style={tw`bg-white rounded-3xl p-5 mb-8 shadow-sm border border-gray-100`}
            >
              <InputField
                label="Pilihan Paket Internet"
                placeholder="Contoh: HOME 20 MBps"
                value={form.paket}
                onChangeText={(text: string) =>
                  setForm({ ...form, paket: text })
                }
                required
              />
              <View style={tw`flex-row gap-4`}>
                <View style={tw`flex-1`}>
                  <InputField
                    label="Est. Kabel (M)"
                    placeholder="0"
                    value={form.kabel}
                    onChangeText={(text: string) =>
                      setForm({ ...form, kabel: text })
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={tw`flex-1`}>
                  <InputField
                    label="Nama ODP"
                    placeholder="ODP-..."
                    value={form.odp}
                    onChangeText={(text: string) =>
                      setForm({ ...form, odp: text })
                    }
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              <InputField
                label="Serial Number (SN)"
                placeholder="Contoh: ZTE..."
                value={form.sn}
                onChangeText={(text: string) => setForm({ ...form, sn: text })}
              />
              <View style={tw`mb-5`}>
                <Text
                  style={tw`text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 ml-1`}
                >
                  Link Shareloc (Google Maps)
                </Text>
                <View style={tw`flex-row gap-2 mb-2`}>
                  <TextInput
                    style={tw`flex-1 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-900 font-bold`}
                    placeholder="https://maps.google.com/..."
                    placeholderTextColor="#d1d5db"
                    value={form.shareloc}
                    onChangeText={(text: string) => {
                      let lat = form.latitude;
                      let lng = form.longitude;
                      const regex =
                        /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/;
                      const match = text.match(regex);
                      if (match) {
                        const [coords] = match;
                        const [l, g] = coords
                          .split(",")
                          .map((s) => parseFloat(s.trim()));
                        if (!isNaN(l) && !isNaN(g)) {
                          lat = l;
                          lng = g;
                        }
                      }
                      setForm({
                        ...form,
                        shareloc: text,
                        latitude: lat,
                        longitude: lng,
                      });
                    }}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowMapModal(true)}
                    style={tw`bg-blue-50 border border-blue-100 rounded-2xl px-4 items-center justify-center`}
                  >
                    <MapIcon size={20} color="#2563eb" />
                  </TouchableOpacity>
                </View>
                <View style={tw`flex-row items-center ml-1`}>
                  <View
                    style={tw`w-2 h-2 rounded-full ${form.latitude ? "bg-emerald-500" : "bg-gray-300"} mr-2`}
                  />
                  <Text
                    style={tw`text-[10px] font-bold ${form.latitude ? "text-emerald-600" : "text-gray-400"}`}
                  >
                    {form.latitude && form.longitude
                      ? `Tikor: ${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
                      : "Koordinat belum terdeteksi"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={isLoading || isMutating}
              style={tw`bg-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-200 flex-row items-center justify-center ${isLoading || isMutating ? "opacity-50" : ""}`}
            >
              {isLoading || isMutating ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Package size={20} color="white" />
                  <Text style={tw`text-white font-black text-base ml-3`}>
                    Submit Request
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Hint */}
            <View style={tw`flex-row items-center justify-center mt-6`}>
              <Info size={14} color="#9ca3af" />
              <Text
                style={tw`text-gray-400 text-[10px] font-bold uppercase ml-2 tracking-widest`}
              >
                (*) Wajib diisi dengan benar
              </Text>
            </View>
          </View>
        </ScrollView>

        <LocationPickerModal
          visible={showMapModal}
          onClose={() => setShowMapModal(false)}
          onSelectLocation={(lat, lng) => {
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            setForm((prev) => ({
              ...prev,
              shareloc: mapsUrl,
              latitude: lat,
              longitude: lng,
            }));
            setShowMapModal(false);
          }}
        />
        <LoadingModal visible={isLoading} message={loadingMessage} progress={uploadProgress > 0 ? uploadProgress : undefined} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface FormSectionHeaderProps {
  title: string;
  icon: React.ReactNode;
}

function FormSectionHeader({ title, icon }: FormSectionHeaderProps) {
  return (
    <View style={tw`flex-row items-center mb-4 ml-1`}>
      <View
        style={tw`w-8 h-8 bg-blue-50 items-center justify-center rounded-xl mr-3`}
      >
        {icon}
      </View>
      <Text style={tw`text-base font-black text-gray-900`}>{title}</Text>
    </View>
  );
}

interface InputFieldProps extends TextInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
}

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  required,
  ...props
}: InputFieldProps) {
  return (
    <View style={tw`mb-5`}>
      <Text
        style={tw`text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 ml-1`}
      >
        {label} {required && <Text style={tw`text-rose-500`}>*</Text>}
      </Text>
      <TextInput
        style={tw`bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-900 font-bold`}
        placeholder={placeholder}
        placeholderTextColor="#d1d5db"
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    </View>
  );
}

interface PhotoPickerFieldProps {
  title: string;
  value: string | null;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onRemove: () => void;
  required?: boolean;
  onScan?: () => void;
  isScanning?: boolean;
}

function PhotoPickerField({
  title,
  value,
  onPickCamera,
  onPickGallery,
  onRemove,
  required,
  onScan,
  isScanning,
}: PhotoPickerFieldProps) {
  return (
    <View>
      <Text
        style={tw`text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 ml-1`}
      >
        {title} {required && <Text style={tw`text-rose-500`}>*</Text>}
      </Text>
      {value ? (
        <View style={tw`bg-gray-50 p-2 rounded-3xl border border-gray-100`}>
          <View
            style={tw`relative rounded-2xl overflow-hidden aspect-video bg-gray-200`}
          >
            <ImageWithCache source={value} style={tw`w-full h-full`} contentFit="cover" transition={1000} />
            <TouchableOpacity
              onPress={onRemove}
              style={tw`absolute top-3 right-3 bg-black/40 w-10 h-10 items-center justify-center rounded-full z-10`}
            >
              <X size={20} color="white" />
            </TouchableOpacity>

            {/* Scan Button Overlay */}
            {onScan && (
              <View style={tw`absolute bottom-3 right-3 left-3`}>
                <TouchableOpacity
                  onPress={onScan}
                  disabled={isScanning}
                  style={tw`bg-blue-600/90 p-3 rounded-xl flex-row items-center justify-center border border-white/20`}
                >
                  {isScanning ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Zap size={16} color="white" style={tw`mr-2`} />
                      <Text style={tw`text-white font-bold text-xs`}>
                        Scan KTP (AI)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={tw`flex-row gap-3`}>
          <TouchableOpacity
            onPress={onPickCamera}
            activeOpacity={0.7}
            style={tw`flex-1 h-20 items-center justify-center bg-blue-50/50 border border-dashed border-blue-200 rounded-2xl gap-2`}
          >
            <View style={tw`bg-blue-100 p-2 rounded-lg`}>
              <Camera size={18} color="#2563eb" />
            </View>
            <Text style={tw`text-blue-600 text-[10px] font-black uppercase`}>
              Kamera
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onPickGallery}
            activeOpacity={0.7}
            style={tw`flex-1 h-20 items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl gap-2`}
          >
            <View style={tw`bg-gray-100 p-2 rounded-lg`}>
              <ImageIcon size={18} color="#6b7280" />
            </View>
            <Text style={tw`text-gray-500 text-[10px] font-black uppercase`}>
              Galeri
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
