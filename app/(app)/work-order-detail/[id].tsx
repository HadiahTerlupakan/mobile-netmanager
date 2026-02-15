import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { ImageViewerModal } from '@/components/molecules/ImageViewerModal';
import LoadingModal from "@/components/molecules/LoadingModal";
import { WorkOrderDetailSkeleton } from '@/components/molecules/WorkOrderDetailSkeleton';
import { useAuth } from "@/context/AuthContext";
import { useSocketEvent, useSocketRoom } from "@/context/SocketContext";
import { SOCKET_EVENTS, WorkOrderActivityPayload } from "@/context/socketTypes";
import {
  queryKeys,
  useApiMutation,
  useWorkOrder,
} from "@/hooks/queries";
import { TenantService } from "@/services/TenantService";
import { uploadService } from "@/services/UploadService";
import api from "@/services/api"; // Use centralized API
import { UserSummary, WorkOrder, WorkOrderAssignment, WorkOrderUpdate } from "@/types/work-order";
import { formatDate } from "@/utils/date";
import { getUserFriendlyError } from "@/utils/errorHandling";
import { logger } from "@/utils/logger";
import { FlashList } from '@shopify/flash-list';
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle,
  CheckSquare,
  Clock,
  FileText,
  History,
  Image as ImageIcon,
  ListChecks,
  MapPin,
  MessageSquare,
  Package,
  Pause,
  Phone,
  Play,
  Square,
  User,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import tw from "twrnc";

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [activeTab, setActiveTab] = useState<
    "INFO" | "TASKS" | "TIMELINE" | "ITEMS" | "DISKUSI"
  >("INFO");

  // Completion State (Moved to separate screen)
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  // Readonly check - Tab Tugas, Barang, Diskusi readonly sebelum Mulai Kerja
  const isWorkStarted = wo?.status === "IN_PROGRESS";

  // Role checks - determine user's relationship to this work order
  const isAssignedToMe = wo?.assignedToId === user?.id;
  const myAssignment = wo?.assignments?.find((a) => a.userId === user?.id);
  const isApprovedPartner = myAssignment?.role === "PARTNER" && myAssignment?.status === "APPROVED";
  const isPendingPartner = myAssignment?.role === "PARTNER" && myAssignment?.status === "PENDING";

  // Can this user interact with WO actions (material, tasks, discussion)?
  // Only lead technician or approved partner, and work must be started
  const canInteract = isWorkStarted && (isAssignedToMe || isApprovedPartner);

  // Partner State
  const [isPartnerModalVisible, setIsPartnerModalVisible] = useState(false);
  const [availablePartners, setAvailablePartners] = useState<UserSummary[]>([]);
  const [searchPartnerQuery, setSearchPartnerQuery] = useState("");
  const [partnerLoading, setPartnerLoading] = useState(false);

  const [partnerResponseLoading, setPartnerResponseLoading] = useState(false);
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);

  // Partner Pagination State
  const [partnerPage, setPartnerPage] = useState(1);
  const [hasMorePartners, setHasMorePartners] = useState(true);
  const [isFetchingMorePartners, setIsFetchingMorePartners] = useState(false);

  // Image Viewer State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  const openImageViewer = useCallback((imageUrl: string) => {
    setViewerImage(imageUrl);
    setViewerVisible(true);
  }, []);

  const {
    data: workOrderResponse,
    isPending: loading,
    refetch: fetchDetail,
  } = useWorkOrder(id as string);

  const woData = workOrderResponse?.data;

  // API Mutations
  const { mutate: updateStatus, isPending: actionLoading } = useApiMutation({
    endpoint: `/api/mobile/work-orders/${id}/update`,
    method: 'POST',
    invalidateKeys: [queryKeys.workOrders.detail(id as string)],
  });

  const { mutate: updateActivity, isPending: updateConfigLoading } = useApiMutation({
    endpoint: `/api/mobile/work-orders/${id}/update`,
    method: 'POST',
    invalidateKeys: [queryKeys.workOrders.detail(id as string)],
  });

  // Memoize timeline for Discussion Tab
  const discussionTimeline = useMemo(() => {
    if (!wo) return [];

    // Merge Updates (COMMENT, NOTE) and Attachments (PHOTO)
    const comments: (WorkOrderUpdate & { isPhoto?: boolean })[] =
      wo.updates?.filter((u) =>
        ["COMMENT", "NOTE"].includes(u.updateType),
      ) || [];
    const photos: (WorkOrderUpdate & { isPhoto?: boolean })[] =
      wo.attachments?.map((a) => ({
        id: a.id,
        updateType: "PHOTO" as const,
        createdAt: a.uploadedAt,
        message: a.caption || "",
        user: a.user,
        createdBy: a.user,
        filePath: a.filePath,
        isPhoto: true,
      })) || [];

    // Combine and Sort
    return [...comments, ...photos].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [wo]);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (id && token) {
        logger.info("[WO Detail] Screen focused, refreshing data...");
        fetchDetail();
      }
    }, [id, token, fetchDetail]),
  );

  useEffect(() => {
    if (woData) setWo(woData);
  }, [woData]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Izin Lokasi Ditolak",
            "Aplikasi membutuhkan izin lokasi untuk validasi pengerjaan.",
          );
          return;
        }

        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          logger.warn("Location services are disabled");
          return;
        }

        let currentLocation = await Location.getLastKnownPositionAsync({});
        if (!currentLocation) {
          currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }

        setLocation(currentLocation);
      } catch (error) {
        logger.error("Location Error in WO Detail:", error);
      }
    })();
  }, []);

  // Join WebSocket room for this Work Order
  useSocketRoom(`workorder:${id}`);

  // Handle real-time work order updates
  const handleWOUpdate = useCallback(
    (data: { id: string; workOrderId?: string }) => {
      logger.socket("[WS Mobile] WorkOrder Update received:", data);
      // Refresh data when WO is updated
      if (data.id === id || data.workOrderId === id) {
        fetchDetail();
      }
    },
    [id, fetchDetail],
  );

  // Handle real-time activity updates
  const handleActivityUpdate = useCallback(
    (data: WorkOrderActivityPayload) => {
      logger.socket("[WS Mobile] Activity received:", data.activity.type);
      if (data.workOrderId === id) {
        fetchDetail();
      }
    },
    [id, fetchDetail],
  );

  // Subscribe to WebSocket events
  useSocketEvent(SOCKET_EVENTS.WORKORDER_UPDATE, handleWOUpdate);
  useSocketEvent(SOCKET_EVENTS.WORKORDER_ACTIVITY, handleActivityUpdate);

  // Partner search and pagination effect
  const fetchPartners = useCallback(async (pageNum = 1, shouldAppend = false) => {
    if (!isPartnerModalVisible) return;

    if (pageNum === 1) setPartnerLoading(true);
    else setIsFetchingMorePartners(true);

    try {
      const res = await api.get(
        `/api/mobile/partners?search=${searchPartnerQuery}&page=${pageNum}&limit=20`
      );
      if (res.data.success) {
        const newData = res.data.data;
        const pagination = res.data.pagination;

        setAvailablePartners(prev => shouldAppend ? [...prev, ...newData] : newData);
        setHasMorePartners(pageNum < (pagination?.totalPages || 0));
        setPartnerPage(pageNum);
      }
    } catch (error) {
      logger.error("Fetch Partners Error:", error);
    } finally {
      setPartnerLoading(false);
      setIsFetchingMorePartners(false);
    }
  }, [isPartnerModalVisible, searchPartnerQuery]);

  useEffect(() => {
    setPartnerPage(1);
    fetchPartners(1, false);
  }, [searchPartnerQuery, isPartnerModalVisible]);

  const loadMorePartners = () => {
    if (!partnerLoading && !isFetchingMorePartners && hasMorePartners) {
      fetchPartners(partnerPage + 1, true);
    }
  };

  const [loadingMessage, setLoadingMessage] = useState("Memproses...");

  // ... existing code ...

  const handleUpdateStatus = async (action: "START" | "PAUSE" | "COMPLETE") => {
    if (action === "COMPLETE") {
      router.push(`/(app)/complete-work-order/${id}`);
      return;
    }

    setIsProcessingStatus(true);
    setLoadingMessage("Mencari Lokasi...");

    try {
      // Refresh location before sending
      let finalLocation = location;
      let locationName = "";

      try {
        // Add timeout to prevent hanging
        const locPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        // Race between location fetch and 5s timeout
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 5000),
        );

        const result = await Promise.race([locPromise, timeoutPromise]);

        if (result) {
          finalLocation = result as Location.LocationObject;

          // Only verify reverse geocode if we got a new location
          try {
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
          } catch (geoError) {
            logger.error("Geocoding failed:", geoError);
          }
        } else {
          logger.info("Location fetch timed out, using cached/last known");
        }
      } catch (e) {
        logger.error("Could not update location/geocode:", e);
      }

      setLoadingMessage("Mengirim Data...");

      const payload = {
        action,
        latitude: finalLocation?.coords.latitude.toString(),
        longitude: finalLocation?.coords.longitude.toString(),
        locationName,
        timestamp: new Date().toISOString(),
      };

      updateStatus(
        {
          ...payload,
          photoUrl: null, // Placeholder, filled by SyncService
          meta: {
            photos: [],
            targetField: "photoUrl",
            singleFile: true,
            photoType: "work-order-updates",
            watermarkLines: [],
          },
        },
        {
          onSuccess: (data: any) => {
            setLoadingMessage("Berhasil!");
            const isOffline = data?.__offline_queued__;
            if (isOffline) {
              Alert.alert("Offline", "Update disimpan di antrian.");
            } else {
              // Optional: Alert can be skipped if UI update is obvious, but keeping for safety
              // Alert.alert('Berhasil', 'Status Diperbarui');
              fetchDetail();
            }
            setIsProcessingStatus(false);
          },
          onError: (err) => {
            const { title, message } = getUserFriendlyError(err);
            Alert.alert(title, message);
            setIsProcessingStatus(false);
          },
        },
      );
    } catch (error) {
      setIsProcessingStatus(false);
      const { title, message } = getUserFriendlyError(error);
      Alert.alert(title, message);
    }
  };

  const handleUpdateActivity = async () => {
    // Validation for NOTE
    if (!resolutionNotes && !photo) {
      Alert.alert("Perhatian", "Mohon isi catatan atau upload foto.");
      return;
    }

    setIsProcessingStatus(true);
    setLoadingMessage("Mencari Lokasi...");

    // Refresh location before sending
    let finalLocation = location;
    let locationName = "";

    try {
      // Add timeout to prevent hanging
      const locPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Race between location fetch and 5s timeout
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 5000),
      );

      const result = await Promise.race([locPromise, timeoutPromise]);

      if (result) {
        finalLocation = result as Location.LocationObject;

        try {
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
        } catch (geoError) {
          logger.error("Geocoding failed:", geoError);
        }
      } else {
        logger.info("Location fetch timed out, using cached/last known");
      }
    } catch {
      logger.error("Could not update location/geocode, using cached");
    }

    // Upload photo first if exists
    let uploadedPhotoUrl: string | null = null;
    if (photo) {
      setLoadingMessage("Mengupload Foto...");

      try {
        // Use the shared service
        uploadedPhotoUrl = await uploadService.uploadFile(photo, "work-order-updates");
        logger.info("[WO Comment] Photo uploaded:", uploadedPhotoUrl);
      } catch (uploadError: any) {
        logger.error("[WO Comment] Photo upload failed:", uploadError);
        const { title, message } = getUserFriendlyError(uploadError);
        Alert.alert(title, message);
        setIsProcessingStatus(false);
        return;
      }
    }

    setLoadingMessage("Mengirim Update...");

    const payload = {
      action: "COMMENT",
      latitude: finalLocation?.coords.latitude.toString(),
      longitude: finalLocation?.coords.longitude.toString(),
      locationName,
      notes: resolutionNotes,
      photoUrl: uploadedPhotoUrl, // Use uploaded URL or null
      timestamp: new Date().toISOString(),
    };

    updateActivity(payload, {
      onSuccess: (data: any) => {
        setLoadingMessage("Berhasil!");
        const isOffline = data?.__offline_queued__;
        if (isOffline) {
          Alert.alert("Offline", "Update disimpan di antrian.");
        } else {
          Alert.alert("Berhasil", "Catatan Diperbarui");
          fetchDetail();
        }
        setResolutionNotes("");
        setPhoto(null);
        setIsProcessingStatus(false);
      },
      onError: (err) => {
        const { title, message } = getUserFriendlyError(err);
        Alert.alert(title, message);
        setIsProcessingStatus(false);
      },
    });
  };

  // ... (rest of the file)

  // In render:
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
              if (!result.canceled) setPhoto(result.assets[0].uri);
            } catch (error) {
              const { title, message } = getUserFriendlyError(error);
              Alert.alert(title, message);
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
              if (!result.canceled) setPhoto(result.assets[0].uri);
            } catch (error) {
              const { title, message } = getUserFriendlyError(error);
              Alert.alert(title, message);
            }
          },
        },
      ],
    );
  };

  if (loading && !wo) {
    return <WorkOrderDetailSkeleton />;
  }

  if (!wo) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <Text>Data tidak ditemukan</Text>
      </View>
    );
  }

  const handleAddPartner = async (userId: string) => {
    setPartnerLoading(true);
    try {
      await api.post(
        `/api/mobile/work-orders/${id}/partners`,
        {
          userId,
          role: "PARTNER",
        }
      );
      setIsPartnerModalVisible(false);
      fetchDetail(); // Refresh WO data
      Alert.alert("Berhasil", "Partner berhasil ditambahkan");
    } catch (error) {
      const { title, message } = getUserFriendlyError(error);
      Alert.alert(title, message);
    } finally {
      setPartnerLoading(false);
    }
  };

  const handleRemovePartner = async (assignmentId: string) => {
    Alert.alert(
      "Hapus Partner",
      "Apakah Anda yakin ingin menghapus partner ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(
                `/api/mobile/work-orders/${id}/partners?assignmentId=${assignmentId}`
              );
              fetchDetail();
              Alert.alert("Berhasil", "Partner dihapus");
            } catch (error) {
              const { title, message } = getUserFriendlyError(error);
              Alert.alert(title, message);
            }
          },
        },
      ],
    );
  };

  const handlePartnerResponse = async (response: "APPROVED" | "REJECTED") => {
    setPartnerResponseLoading(true);
    try {
      const res = await api.post(
        `/api/mobile/work-orders/${id}/partner-response`,
        {
          response,
        }
      );

      if (res.data.success) {
        Alert.alert(
          "Sukses",
          `Berhasil ${response === "APPROVED" ? "menerima" : "menolak"} permintaan partner.`,
        );

        if (response === "REJECTED") {
          // Navigate back since user is no longer involved in this WO
          router.back();
        } else {
          fetchDetail();
        }
      }
    } catch (error) {
      logger.error("Partner Response Error:", error);
      const { title, message } = getUserFriendlyError(error);
      Alert.alert(title, message);
    } finally {
      setPartnerResponseLoading(false);
    }
  };

  const renderInfoTab = () => (
    <View>
      <View>
        {/* Status Card */}
        <View
          style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}
        >
          <View style={tw`flex-row justify-between mb-2`}>
            <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>
              Jadwal & Status
            </Text>
            <Text
              style={tw`text-xs font-bold ${wo.priority === "URGENT" ? "text-red-600" : "text-gray-500"
                }`}
            >
              {wo.priority}
            </Text>
          </View>
          <View style={tw`flex-row items-center justify-between`}>
            <View
              style={tw`px-3 py-1 rounded-full ${wo.status === "IN_PROGRESS"
                ? "bg-blue-100"
                : wo.status === "COMPLETED"
                  ? "bg-green-100"
                  : "bg-gray-100"
                }`}
            >
              <Text
                style={tw`font-bold ${wo.status === "IN_PROGRESS"
                  ? "text-blue-700"
                  : wo.status === "COMPLETED"
                    ? "text-green-700"
                    : "text-gray-700"
                  }`}
              >
                {wo.status}
              </Text>
            </View>
            {wo.scheduledDate && (
              <View
                style={tw`flex-row items-center bg-gray-50 px-3 py-1 rounded-lg`}
              >
                <Calendar size={14} color="#6b7280" style={tw`mr-1`} />
                <Text style={tw`text-xs text-gray-700 font-medium`}>
                  {formatDate(wo.scheduledDate, "dd MMM yyyy, HH:mm")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Description Card */}
        <View
          style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}
        >
          <Text style={tw`text-xs text-gray-400 font-bold mb-2 uppercase`}>
            Deskripsi Pekerjaan
          </Text>
          <Text style={tw`font-bold text-gray-800 text-lg mb-2`}>
            {wo.title}
          </Text>
          <Text
            style={tw`text-sm text-gray-600 leading-6 bg-gray-50 p-3 rounded-lg`}
          >
            {wo.description || "Tidak ada deskripsi"}
          </Text>
        </View>

        {/* Schedule & Location Card */}
        <View
          style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}
        >
          <View style={tw`flex-row mb-4`}>
            <Clock size={20} color="#2563eb" style={tw`mt-0.5 mr-3`} />
            <View>
              <Text style={tw`text-xs text-gray-400 mb-0.5`}>Jadwal</Text>
              {wo.scheduledDate ? (
                <>
                  <Text style={tw`text-sm font-bold text-gray-800`}>
                    {formatDate(wo.scheduledDate, "EEEE, dd MMMM yyyy")}
                  </Text>
                  <Text style={tw`text-xs text-gray-500`}>
                    Pukul {formatDate(wo.scheduledDate, "HH:mm")} WIB
                  </Text>
                </>
              ) : (
                <Text style={tw`text-sm text-gray-400 italic`}>
                  Belum dijadwalkan
                </Text>
              )}
            </View>
          </View>

          {wo.startedAt && (
            <View style={tw`flex-row mb-4 ml-8`}>
              <View>
                <Text style={tw`text-xs text-gray-400 mb-0.5`}>
                  Waktu Mulai
                </Text>
                <Text style={tw`text-sm font-bold text-green-600`}>
                  {formatDate(wo.startedAt, "EEEE, dd MMMM yyyy • HH.mm")}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={() => {
              const address = wo.locationAddress || wo.pelanggan?.alamat;
              if (address) {
                const query = encodeURIComponent(address);
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${query}`,
                );
              }
            }}
            style={tw`flex-row`}
          >
            <MapPin size={20} color="#dc2626" style={tw`mt-0.5 mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs text-gray-400 mb-0.5`}>Lokasi</Text>
              <Text style={tw`text-sm font-bold text-blue-600 leading-5`}>
                {wo.locationAddress || wo.pelanggan?.alamat || "-"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Contact Card */}
        {(wo.contactName ||
          wo.pelanggan?.nama ||
          wo.contactPhone ||
          wo.pelanggan?.noTelp) && (
            <View
              style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}
            >
              <Text style={tw`text-xs text-gray-400 font-bold mb-3 uppercase`}>
                Kontak
              </Text>

              {(wo.contactName || wo.pelanggan?.nama) && (
                <View style={tw`flex-row items-center mb-3`}>
                  <User size={18} color="#6b7280" style={tw`mr-3`} />
                  <View>
                    <Text style={tw`text-xs text-gray-400`}>Nama</Text>
                    <Text style={tw`text-sm font-bold text-gray-800`}>
                      {wo.contactName || wo.pelanggan?.nama}
                    </Text>
                  </View>
                </View>
              )}

              {(wo.contactPhone || wo.pelanggan?.noTelp) && (
                <TouchableOpacity
                  onPress={() => {
                    const phone = wo.contactPhone || wo.pelanggan?.noTelp;
                    if (phone) {
                      let formattedPhone = phone.replace(/\D/g, "");
                      if (formattedPhone.startsWith("0")) {
                        formattedPhone = "62" + formattedPhone.substring(1);
                      }

                      Linking.openURL(
                        `whatsapp://send?phone=${formattedPhone}`,
                      ).catch(() => {
                        Linking.openURL(`tel:${phone}`);
                      });
                    }
                  }}
                  style={tw`flex-row items-center`}
                >
                  <Phone size={18} color="#2563eb" style={tw`mr-3`} />
                  <View>
                    <Text style={tw`text-xs text-gray-400`}>Telepon</Text>
                    <Text style={tw`text-sm font-bold text-blue-600`}>
                      {wo.contactPhone || wo.pelanggan?.noTelp}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

        {/* Team & Partners Card */}
        <View
          style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}
        >
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>
              Tim Pengerjaan
            </Text>
            {wo.status !== "COMPLETED" && wo.status !== "CLOSED" && (
              <TouchableOpacity onPress={() => setIsPartnerModalVisible(true)}>
                <Text style={tw`text-xs font-bold text-blue-600`}>
                  + Tambah
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Primary Assigned */}
          {wo.assignedTo && (
            <View
              style={tw`flex-row items-center mb-3 bg-blue-50 p-2 rounded-lg`}
            >
              <View
                style={tw`w-8 h-8 bg-blue-200 rounded-full items-center justify-center mr-3`}
              >
                <Text style={tw`font-bold text-blue-700`}>
                  {wo.assignedTo.name?.charAt(0)}
                </Text>
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`font-bold text-gray-800 text-sm`}>
                  {wo.assignedTo.name}
                </Text>
                <Text style={tw`text-xs text-blue-600`}>Lead Teknisi</Text>
              </View>
            </View>
          )}

          {/* Partners */}
          {wo.assignments
            ?.filter((a) => a.userId !== wo.assignedToId)
            .map((assignment, idx: number) => (
              <View
                key={idx}
                style={tw`flex-row items-center justify-between mb-2 pb-2 border-b border-gray-50 last:border-0`}
              >
                <View style={tw`flex-row items-center flex-1`}>
                  <View
                    style={tw`w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3`}
                  >
                    <Text style={tw`font-bold text-blue-600`}>
                      {assignment.user?.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`font-bold text-gray-800 text-sm`}>
                      {assignment.user?.name}
                    </Text>
                    <View style={tw`flex-row items-center mt-0.5`}>
                      <Text style={tw`text-xs text-gray-500 mr-2`}>
                        {assignment.role || "Partner"}
                      </Text>
                      <View
                        style={tw`px-2 py-0.5 rounded-full ${assignment.status === "APPROVED"
                          ? "bg-green-100"
                          : assignment.status === "REJECTED"
                            ? "bg-red-100"
                            : "bg-yellow-100"
                          }`}
                      >
                        <Text
                          style={tw`text-[10px] font-bold ${assignment.status === "APPROVED"
                            ? "text-green-700"
                            : assignment.status === "REJECTED"
                              ? "text-red-700"
                              : "text-yellow-700"
                            }`}
                        >
                          {assignment.status === "APPROVED"
                            ? "Setuju"
                            : assignment.status === "REJECTED"
                              ? "Tolak"
                              : "Menunggu"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Action Buttons for Pending Partner (Only if it's me) */}
                {assignment.status === "PENDING" &&
                  assignment.userId === user?.id && (
                    <View style={tw`flex-row gap-2`}>
                      <TouchableOpacity
                        onPress={() => handlePartnerResponse("REJECTED")}
                        disabled={actionLoading}
                        style={tw`bg-red-50 p-2 rounded-lg border border-red-100`}
                      >
                        <X size={16} color="#ef4444" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handlePartnerResponse("APPROVED")}
                        disabled={actionLoading}
                        style={tw`bg-green-50 p-2 rounded-lg border border-green-100`}
                      >
                        <CheckCircle size={16} color="#16a34a" />
                      </TouchableOpacity>
                    </View>
                  )}

                {/* Delete Button (Only for Creator/Assigner or if not me) */}
                {(!assignment.status ||
                  assignment.status === "APPROVED" ||
                  assignment.status === "PENDING") &&
                  assignment.userId !== user?.id &&
                  wo.status !== "COMPLETED" && (
                    <TouchableOpacity
                      onPress={() => handleRemovePartner(assignment.id)}
                      style={tw`p-2`}
                    >
                      <X size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
              </View>
            ))}

          {(!wo.assignments || wo.assignments.length <= 1) &&
            !wo.assignedTo && (
              <Text style={tw`text-gray-400 text-xs italic`}>
                Belum ada tim yang ditugaskan
              </Text>
            )}
        </View>
      </View>
    </View>
  );

  const renderItemsTab = () => (
    <View
      style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100 min-h-64`}
    >
      {/* Readonly Banner */}
      {!isWorkStarted && (
        <View
          style={tw`bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex-row items-center`}
        >
          <Text style={tw`text-yellow-700 text-xs flex-1`}>
            ⚠️ Klik &quot;Mulai Kerja&quot; terlebih dahulu untuk mengambil barang
          </Text>
        </View>
      )}

      <Text style={tw`font-bold text-gray-800 mb-4`}>Barang Digunakan</Text>
      {wo.usedMaterials &&
        Array.isArray(wo.usedMaterials) &&
        wo.usedMaterials.length > 0 ? (
        wo.usedMaterials.map((item, idx: number) => (
          <View
            key={idx}
            style={tw`flex-row justify-between items-center py-2 border-b border-gray-100`}
          >
            <Text style={tw`text-gray-700`}>
              {item.name || item.barangName || item.nama}
            </Text>
            <Text style={tw`font-bold`}>
              {item.quantity || item.jumlah} {item.unit || item.satuan || "pcs"}
            </Text>
          </View>
        ))
      ) : (
        <Text style={tw`text-center text-gray-400 mt-4`}>
          Belum ada barang yang dicatat
        </Text>
      )}

      {/* Returned Materials Section (for DISCONNECTION) */}
      {wo.returnedMaterials &&
        Array.isArray(wo.returnedMaterials) &&
        wo.returnedMaterials.length > 0 && (
          <View style={tw`mt-6`}>
            <Text style={tw`font-bold text-gray-800 mb-4`}>
              Barang Dikembalikan
            </Text>
            {wo.returnedMaterials.map((item, idx: number) => (
              <View
                key={idx}
                style={tw`flex-row justify-between items-center py-2 border-b border-gray-100`}
              >
                <View style={tw`flex-1`}>
                  <Text style={tw`text-gray-700`}>
                    {item.name || item.barangName || item.nama}
                  </Text>
                  <View style={tw`flex-row items-center gap-2 mt-1`}>
                    <View
                      style={tw`px-1.5 py-0.5 rounded ${item.kondisi === "BARU"
                        ? "bg-green-100"
                        : item.kondisi === "BEKAS"
                          ? "bg-yellow-100"
                          : "bg-red-100"
                        }`}
                    >
                      <Text
                        style={tw`text-[10px] font-bold ${item.kondisi === "BARU"
                          ? "text-green-700"
                          : item.kondisi === "BEKAS"
                            ? "text-yellow-700"
                            : "text-red-700"
                          }`}
                      >
                        {item.kondisi}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={tw`font-bold`}>
                  {item.quantity || item.jumlah}{" "}
                  {item.unit || item.satuan || "pcs"}
                </Text>
              </View>
            ))}
          </View>
        )}

      <View style={tw`mt-6 gap-3`}>
        {/* Ambil Barang Button - Only for lead technician and approved partners */}
        <TouchableOpacity
          onPress={() =>
            canInteract && router.push(`/(app)/ambil-barang/${id}`)
          }
          disabled={!canInteract}
          style={tw`flex-row items-center justify-center p-3 rounded-xl border ${canInteract ? "bg-blue-50 border-blue-200 active:bg-blue-100" : "bg-gray-100 border-gray-200 opacity-60"}`}
        >
          <ImageIcon
            size={20}
            color={canInteract ? "#2563eb" : "#9ca3af"}
            style={tw`mr-2`}
          />
          <Text
            style={tw`font-bold ${canInteract ? "text-blue-600" : "text-gray-400"}`}
          >
            Ambil Barang / Material
          </Text>
        </TouchableOpacity>

        {/* Kembalikan Barang Button - For DISCONNECTION and RELOCATION */}
        {(wo.type === "DISCONNECTION" || wo.type === "RELOCATION") && (
          <TouchableOpacity
            onPress={() =>
              canInteract && router.push(`/(app)/kembalikan-barang/${id}`)
            }
            disabled={!canInteract}
            style={tw`flex-row items-center justify-center p-3 rounded-xl border ${canInteract ? "bg-green-50 border-green-200 active:bg-green-100" : "bg-gray-100 border-gray-200 opacity-60"}`}
          >
            <Package
              size={20}
              color={canInteract ? "#16a34a" : "#9ca3af"}
              style={tw`mr-2`}
            />
            <Text
              style={tw`font-bold ${canInteract ? "text-green-600" : "text-gray-400"}`}
            >
              Kembalikan Barang
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderDiscussionTab = () => (
    <View
      style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}
    >
      {/* Readonly Banner */}
      {!canInteract && (
        <View
          style={tw`bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex-row items-center`}
        >
          <Text style={tw`text-yellow-700 text-xs flex-1`}>
            {!isWorkStarted
              ? '⚠️ Klik "Mulai Kerja" terlebih dahulu untuk mengirim diskusi'
              : '⚠️ Hanya lead teknisi dan partner yang bisa mengirim diskusi'}
          </Text>
        </View>
      )}

      {/* Input Form */}
      <View style={tw`mb-6 ${!canInteract ? "opacity-60" : ""}`}>
        <TextInput
          style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm h-20 mb-3`}
          multiline
          textAlignVertical="top"
          placeholder={
            canInteract
              ? "Tulis diskusi..."
              : "Mulai kerja dulu untuk berdiskusi"
          }
          value={resolutionNotes}
          onChangeText={setResolutionNotes}
          editable={canInteract}
        />

        {photo && (
          <View style={tw`mb-3`}>
            <ImageWithCache source={photo}
              style={tw`w-24 h-24 rounded-lg`}
              contentFit="cover"
              transition={1000} />
            <TouchableOpacity
              onPress={() => setPhoto(null)}
              style={tw`absolute top-1 right-1 bg-black/50 p-1 rounded-full`}
            >
              <X color="white" size={12} />
            </TouchableOpacity>
          </View>
        )}

        <View style={tw`flex-row justify-between items-center mt-2`}>
          <TouchableOpacity
            onPress={() => canInteract && handleImageSelection()}
            disabled={!canInteract}
            style={tw`p-3 rounded-xl items-center justify-center ${canInteract ? "bg-gray-100" : "bg-gray-50"}`}
          >
            <Camera size={20} color={canInteract ? "#4b5563" : "#9ca3af"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => canInteract && handleUpdateActivity()}
            disabled={updateConfigLoading || !canInteract}
            style={tw`px-6 py-3 rounded-xl items-center justify-center shadow-sm ${canInteract ? "bg-blue-600" : "bg-gray-300"}`}
          >
            {updateConfigLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={tw`font-bold text-sm ${canInteract ? "text-white" : "text-gray-500"}`}
              >
                Kirim
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={tw`h-0.5 bg-gray-100 mb-6`} />

      <Text style={tw`text-xs text-gray-400 font-bold mb-4 uppercase`}>
        Diskusi
      </Text>
      {discussionTimeline.length === 0 ? (
        <View style={tw`items-center justify-center py-8`}>
          <MessageSquare size={32} color="#e5e7eb" style={tw`mb-2`} />
          <Text style={tw`text-center text-gray-400`}>
            Belum ada diskusi
          </Text>
          <Text style={tw`text-center text-gray-300 text-xs`}>
            Mulai percakapan dengan tim
          </Text>
        </View>
      ) : (
        discussionTimeline.map((item) => {
          const creator = item.user || item.createdBy;
          const isMe = creator?.id === user?.id;
          const isPhoto = item.updateType === "PHOTO";

          return (
            <View
              key={`${item.updateType}-${item.id}`}
              style={tw`mb-4 flex-row ${isMe ? "justify-end" : "justify-start"}`}
            >
              {!isMe && (
                <View
                  style={tw`w-8 h-8 rounded-full bg-gray-200 items-center justify-center mr-2 self-end mb-1`}
                >
                  <Text style={tw`font-bold text-gray-600 text-xs`}>
                    {creator?.name?.charAt(0) || "?"}
                  </Text>
                </View>
              )}

              <View style={tw`max-w-[80%]`}>
                <View
                  style={tw`rounded-2xl overflow-hidden ${isPhoto
                    ? "" // Photos handle their own rounding or have no bg
                    : isMe
                      ? "bg-blue-600 rounded-tr-none px-4 py-2.5"
                      : "bg-gray-100 rounded-tl-none px-4 py-2.5"
                    }`}
                >
                  {!isMe && !isPhoto && (
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>
                      {creator?.name || "Unknown"}
                    </Text>
                  )}

                  {isPhoto ? (
                    <View>
                      <TouchableOpacity
                        onPress={() => {
                          if (item.filePath) {
                            const imageUrl = item.filePath.startsWith('http') 
                              ? item.filePath 
                              : `${TenantService.getTenantUrl()}${item.filePath}`;
                            openImageViewer(imageUrl);
                          }
                        }}
                        activeOpacity={0.9}
                      >
                        <ImageWithCache 
                          source={
                            item.filePath?.startsWith('http') 
                              ? item.filePath 
                              : `${TenantService.getTenantUrl()}${item.filePath}`
                          }
                          style={tw`w-48 h-64 bg-gray-200 rounded-lg`}
                          contentFit="cover"
                          transition={1000} />
                      </TouchableOpacity>
                      {item.message && (
                        <View
                          style={tw`bg-black/50 absolute bottom-0 left-0 right-0 p-2`}
                        >
                          <Text
                            style={tw`text-white text-xs`}
                            numberOfLines={2}
                          >
                            {item.message}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text
                      style={tw`text-sm ${isMe ? "text-white" : "text-gray-800"}`}
                    >
                      {item.message}
                    </Text>
                  )}
                </View>
                <Text
                  style={tw`text-[10px] text-gray-400 mt-1 ${isMe ? "text-right" : "text-left"}`}
                >
                  {formatDate(item.createdAt, "dd MMM HH:mm")}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderTimelineTab = () => (
    <View
      style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}
    >
      <Text style={tw`text-xs text-gray-400 font-bold mb-4 uppercase`}>
        Riwayat Aktivitas
      </Text>
      {wo.updates
        ?.filter((u) => !["COMMENT", "NOTE"].includes(u.updateType))
        .map((update, index, arr) => (
          <View key={index} style={tw`flex-row mb-6 relative`}>
            {/* Line */}
            {index !== arr.length - 1 && (
              <View
                style={tw`absolute left-3 top-6 bottom--6 w-0.5 bg-gray-200`}
              />
            )}

            {/* Dot */}
            <View
              style={tw`w-6 h-6 rounded-full ${update.updateType === "PHOTO"
                ? "bg-purple-100"
                : update.updateType === "MATERIAL_PICKUP"
                  ? "bg-orange-100"
                  : update.updateType === "MATERIAL_RETURN"
                    ? "bg-green-100"
                    : update.updateType === "STATUS_CHANGE"
                      ? "bg-blue-100"
                      : "bg-gray-100"
                } items-center justify-center mr-3 z-10`}
            >
              <View
                style={tw`w-2 h-2 rounded-full ${update.updateType === "PHOTO"
                  ? "bg-purple-600"
                  : update.updateType === "MATERIAL_PICKUP"
                    ? "bg-orange-600"
                    : update.updateType === "MATERIAL_RETURN"
                      ? "bg-green-600"
                      : update.updateType === "STATUS_CHANGE"
                        ? "bg-blue-600"
                        : "bg-gray-400"
                  }`}
              />
            </View>

            {/* Content */}
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs text-gray-500 mb-0.5`}>
                {formatDate(update.createdAt, "dd MMM HH:mm")}
              </Text>
              <Text style={tw`font-bold text-gray-800 text-sm`}>
                {update.updateType === "STATUS_CHANGE"
                  ? `Status: ${update.newStatus}`
                  : update.updateType === "PHOTO"
                    ? "📷 Foto Diupload"
                    : update.updateType === "MATERIAL_PICKUP"
                      ? "📦 Ambil Barang"
                      : update.updateType === "MATERIAL_RETURN"
                        ? "↩️ Kembalikan Barang"
                        : update.updateType === "ASSIGNMENT"
                          ? "👤 Penugasan"
                          : update.updateType === "PARTNER_RESPONSE"
                            ? "🤝 Respon Partner"
                            : update.updateType}
              </Text>
              <Text style={tw`text-gray-600 text-sm mt-1 leading-5`}>
                {update.message}
              </Text>

              {update.user && (
                <Text style={tw`text-xs text-gray-400 mt-1 italic`}>
                  Oleh: {update.user.name}
                </Text>
              )}
              {/* Fallback for system updates that use createdBy but might not include user relation in some contexts, though repo ensures it */}
              {!update.user && update.createdBy && (
                <Text style={tw`text-xs text-gray-400 mt-1 italic`}>
                  Oleh: {update.createdBy.name || "System"}
                </Text>
              )}
            </View>
          </View>
        ))}
      {(!wo.updates ||
        wo.updates.filter(
          (u: WorkOrderUpdate) => !["COMMENT", "NOTE"].includes(u.updateType),
        ).length === 0) && (
          <Text style={tw`text-center text-gray-400 py-4`}>
            Belum ada riwayat sistem
          </Text>
        )}
    </View>
  );

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    if (!wo) return;
    // Optimistic update
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    const updatedTasks = wo.tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus as "PENDING" | "COMPLETED" } : t,
    );
    setWo({ ...wo, tasks: updatedTasks });

    try {
      await api.patch(
        `/api/mobile/work-orders/${id}/tasks`,
        {
          taskId,
          isCompleted: newStatus === "COMPLETED",
        }
      );
      // Background refresh to sync fully
      fetchDetail();
    } catch (error) {
      logger.error("Task Toggle Error:", error);
      const { title, message } = getUserFriendlyError(error);
      Alert.alert(title, message);
      // Revert on error
      fetchDetail();
    }
  };

  const renderTasksTab = () => (
    <View
      style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}
    >
      {/* Readonly Banner */}
      {!canInteract && (
        <View
          style={tw`bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex-row items-center`}
        >
          <Text style={tw`text-yellow-700 text-xs flex-1`}>
            {!isWorkStarted
              ? '⚠️ Klik "Mulai Kerja" terlebih dahulu untuk mencentang tugas'
              : '⚠️ Hanya lead teknisi dan partner yang bisa mengubah tugas'}
          </Text>
        </View>
      )}

      <View style={tw`flex-row justify-between items-center mb-4`}>
        <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>
          Daftar Tugas
        </Text>
        <Text style={tw`text-xs text-gray-500`}>
          {wo.tasks?.filter((t) => t.status === "COMPLETED").length || 0}/
          {wo.tasks?.length || 0} Selesai
        </Text>
      </View>

      {wo.tasks && wo.tasks.length > 0 ? (
        wo.tasks.map((task, index: number) => (
          <TouchableOpacity
            key={task.id}
            style={tw`flex-row items-center py-3 border-b border-gray-50 last:border-0 ${!canInteract ? "opacity-60" : ""}`}
            onPress={() =>
              canInteract && handleToggleTask(task.id, task.status)
            }
            disabled={!canInteract}
          >
            <View style={tw`mr-3`}>
              {task.status === "COMPLETED" ? (
                <CheckSquare size={24} color="#10b981" />
              ) : (
                <Square size={24} color="#d1d5db" />
              )}
            </View>
            <View style={tw`flex-1`}>
              <Text
                style={tw`text-sm font-medium ${task.status === "COMPLETED" ? "text-gray-400 line-through" : "text-gray-800"}`}
              >
                {task.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={tw`py-8 items-center justify-center`}>
          <ListChecks size={48} color="#e5e7eb" style={tw`mb-2`} />
          <Text style={tw`text-gray-400 text-center`}>
            Belum ada daftar tugas
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View
        style={tw`px-4 py-3 flex-row items-center border-b border-gray-200 bg-white`}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`p-2 mr-2 -ml-2`}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          <Text style={tw`font-bold text-lg text-gray-800`} numberOfLines={1}>
            {wo.workOrderNumber}
          </Text>
          <Text style={tw`text-xs text-gray-500`}>{wo.type}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={tw`flex-row bg-white border-b border-gray-200 px-2`}>
        {(
          [
            { key: "INFO", label: "Info", icon: FileText },
            { key: "TASKS", label: "Tugas", icon: ListChecks },
            { key: "ITEMS", label: "Barang", icon: Package },
            { key: "DISKUSI", label: "Diskusi", icon: MessageSquare },
            { key: "TIMELINE", label: "Riwayat", icon: History },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={tw`flex-1 flex-row items-center justify-center py-3 border-b-2 ${activeTab === tab.key ? "border-blue-600" : "border-transparent"
              }`}
          >
            <tab.icon
              size={16}
              color={activeTab === tab.key ? "#2563eb" : "#6b7280"}
              style={tw`mr-2`}
            />
            <Text
              style={tw`text-sm font-medium ${activeTab === tab.key ? "text-blue-600" : "text-gray-500"
                }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Role Indicator Banner */}
      {(isAssignedToMe || isApprovedPartner) && (
        <View style={tw`px-4 py-2 ${isAssignedToMe ? 'bg-blue-50 border-b border-blue-100' : 'bg-indigo-50 border-b border-indigo-100'}`}>
          <View style={tw`flex-row items-center justify-center`}>
            <User size={14} color={isAssignedToMe ? '#2563eb' : '#6366f1'} style={tw`mr-1.5`} />
            <Text style={tw`text-xs font-bold ${isAssignedToMe ? 'text-blue-700' : 'text-indigo-700'}`}>
              {isAssignedToMe ? 'Anda adalah Lead Teknisi' : 'Anda adalah Partner'}
            </Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={tw`p-4 pb-32`}>
        {activeTab === "INFO" && renderInfoTab()}
        {activeTab === "TASKS" && renderTasksTab()}
        {activeTab === "ITEMS" && renderItemsTab()}
        {activeTab === "DISKUSI" && renderDiscussionTab()}
        {activeTab === "TIMELINE" && renderTimelineTab()}

        {/* Completion Form - Removed (Moved to separate screen) */}
      </ScrollView>

      <Modal
        visible={isPartnerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPartnerModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl h-3/4 p-4`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`font-bold text-lg text-gray-800`}>
                Pilih Partner
              </Text>
              <TouchableOpacity
                onPress={() => setIsPartnerModalVisible(false)}
                style={tw`p-2 bg-gray-100 rounded-full`}
              >
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={tw`bg-gray-50 p-3 rounded-xl mb-4 text-gray-800`}
              placeholder="Cari nama teknisi..."
              value={searchPartnerQuery}
              onChangeText={setSearchPartnerQuery}
            />

            {partnerLoading ? (
              <ActivityIndicator
                size="large"
                color="#2563eb"
                style={tw`mt-10`}
              />
            ) : (
              <View style={tw`flex-1`}>
                <FlashList
                  data={availablePartners}
                  keyExtractor={(item: any) => item.id}
                  estimatedItemSize={70}
                  renderItem={({ item }: { item: any }) => (
                    <TouchableOpacity
                      onPress={() => handleAddPartner(item.id)}
                      style={tw`flex-row items-center p-3 border-b border-gray-100 active:bg-blue-50`}
                    >
                      <View
                        style={tw`w-10 h-10 bg-gray-200 rounded-full items-center justify-center mr-3`}
                      >
                        <Text style={tw`font-bold text-gray-600`}>
                          {item.name?.charAt(0)}
                        </Text>
                      </View>
                      <View>
                        <Text style={tw`font-bold text-gray-800`}>
                          {item.name}
                        </Text>
                        <Text style={tw`text-xs text-gray-500`}>
                          {item.role?.name || "Karyawan"} •{" "}
                          {item.site?.name || "Headquarters"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  onEndReached={loadMorePartners}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={
                    isFetchingMorePartners ? (
                      <ActivityIndicator size="small" color="#2563eb" style={tw`py-4`} />
                    ) : null
                  }
                  ListEmptyComponent={
                    !partnerLoading ? (
                      <Text style={tw`text-center text-gray-400 mt-10`}>
                        Tidak ada teknisi ditemukan
                      </Text>
                    ) : null
                  }
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Actions */}
      {(() => {
        if (!wo) return null;

        // Check if all partners responded
        const partnerList =
          wo.assignments?.filter((a: WorkOrderAssignment) => a.role === "PARTNER") || [];
        const allPartnersResponded =
          partnerList.length === 0 ||
          partnerList.every((a: WorkOrderAssignment) => a.status !== "PENDING");

        // Conditions for actions
        const canStartWork =
          isAssignedToMe && wo.status === "ASSIGNED" && allPartnersResponded;
        const canResumeWork = isAssignedToMe && wo.status === "ON_HOLD";

        // Partner pending - show accept/reject buttons
        if (isPendingPartner) {
          return (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 bg-yellow-50 p-4 border-t border-yellow-200 shadow-lg z-20`,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <Text
                style={tw`text-sm text-yellow-800 font-medium text-center mb-3`}
              >
                Anda diundang sebagai partner untuk WO ini
              </Text>
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  onPress={() => handlePartnerResponse("REJECTED")}
                  disabled={actionLoading}
                  style={tw`flex-1 bg-red-100 py-3.5 rounded-xl items-center flex-row justify-center border border-red-200`}
                >
                  <X size={20} color="#dc2626" style={tw`mr-2`} />
                  <Text style={tw`font-bold text-red-700`}>Tolak</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handlePartnerResponse("APPROVED")}
                  disabled={actionLoading}
                  style={tw`flex-1 bg-green-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-sm`}
                >
                  <CheckCircle size={20} color="white" style={tw`mr-2`} />
                  <Text style={tw`font-bold text-white`}>Terima</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        // IN_PROGRESS - Lead: pause + complete, Partner: no bottom actions (can interact via tabs)
        if (isAssignedToMe && wo.status === "IN_PROGRESS") {
          return (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex-row gap-3 shadow-lg z-20`,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <TouchableOpacity
                onPress={() => handleUpdateStatus("PAUSE")}
                disabled={actionLoading}
                style={tw`flex-1 bg-yellow-100 py-3.5 rounded-xl items-center flex-row justify-center border border-yellow-200`}
              >
                <Pause size={20} color="#854d0e" style={tw`mr-2`} />
                <Text style={tw`font-bold text-yellow-800`}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleUpdateStatus("COMPLETE")}
                disabled={actionLoading}
                style={tw`flex-1 bg-green-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-sm`}
              >
                <CheckCircle size={20} color="white" style={tw`mr-2`} />
                <Text style={tw`font-bold text-white`}>Selesai</Text>
              </TouchableOpacity>
            </View>
          );
        }

        // ASSIGNED - show start work (only for assignedTo when all partners responded)
        if (canStartWork) {
          return (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-lg z-20`,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <TouchableOpacity
                onPress={() => handleUpdateStatus("START")}
                disabled={actionLoading || isProcessingStatus}
                style={tw`bg-blue-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-sm`}
              >
                <Play size={20} color="white" style={tw`mr-2`} />
                <Text style={tw`font-bold text-white`}>Mulai Pekerjaan</Text>
              </TouchableOpacity>
            </View>
          );
        }

        // ASSIGNED but waiting for partners - show info
        if (
          isAssignedToMe &&
          wo.status === "ASSIGNED" &&
          !allPartnersResponded
        ) {
          return (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 bg-yellow-50 p-4 border-t border-yellow-200 shadow-lg z-20`,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <Text style={tw`text-sm text-yellow-800 font-medium text-center`}>
                Menunggu konfirmasi partner sebelum mulai pekerjaan...
              </Text>
            </View>
          );
        }

        // ON_HOLD - show resume (only for assignedTo)
        if (canResumeWork) {
          return (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-lg z-20`,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <TouchableOpacity
                onPress={() => handleUpdateStatus("START")}
                disabled={actionLoading || isProcessingStatus}
                style={tw`bg-blue-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-sm`}
              >
                <Play size={20} color="white" style={tw`mr-2`} />
                <Text style={tw`font-bold text-white`}>
                  Lanjutkan Pekerjaan
                </Text>
              </TouchableOpacity>
            </View>
          );
        }

        return null;
      })()}
      <LoadingModal
        visible={
          isProcessingStatus || updateConfigLoading || partnerResponseLoading
        }
        message={
          isProcessingStatus
            ? loadingMessage
            : partnerResponseLoading
              ? "Memproses Partner..."
              : "Mengirim Update..."
        }
      />

      <ImageViewerModal
        visible={viewerVisible}
        imageUrl={viewerImage}
        onClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}
