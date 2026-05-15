import { ImageViewerModal } from '@/components/molecules/ImageViewerModal';
import LoadingModal from "@/components/molecules/LoadingModal";
import { WorkOrderDetailSkeleton } from '@/components/molecules/WorkOrderDetailSkeleton';
import {
  DiscussionTab,
  InfoTab,
  ItemsTab,
  PartnerModal,
  TasksTab,
  TimelineTab,
} from '@/components/screens/work-order';
import { AppFeature } from '@/constants/features';
import { useAuth } from "@/context/AuthContext";
import { WorkOrderActivityPayload } from "@/context/socketTypes";
import { realtimeService, RealtimeStreamEvent } from "@/services/RealtimeService";
import {
  isOfflineMutationQueuedResult,
  queryKeys,
  useApiMutation,
  useWorkOrder,
} from "@/hooks/queries";
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { useLocationWithTimeout } from '@/hooks/useLocationWithTimeout';
import { useWorkOrderTasks } from '@/hooks/useWorkOrderTasks';
import { uploadService } from "@/services/UploadService";
import { WorkOrder, WorkOrderAssignment, WorkOrderUpdate } from "@/types/work-order";
import { presentAppError, presentInfoMessage, presentSuccessMessage } from "@/utils/errorPresenter";
import { logger } from "@/utils/logger";
import {
  getWorkOrderDetailActionBarPaddingBottom,
  getWorkOrderDetailScrollPaddingBottom,
} from "@/utils/workOrderDetailLayout";
import {
  normalizeWorkOrderRouteParam,
  resolveCanonicalWorkOrderId,
} from "@/utils/workOrderRoute";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from '@react-navigation/native';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  History,
  ListChecks,
  MessageSquare,
  Package,
  Pause,
  Play,
  User,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import tw from "twrnc";

export default function WorkOrderDetailScreen() {
  useFeatureGuard(AppFeature.WORK_ORDER);

  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const routeWorkOrderId = normalizeWorkOrderRouteParam(id);

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [activeTab, setActiveTab] = useState<
    "INFO" | "TASKS" | "TIMELINE" | "ITEMS" | "DISKUSI"
  >("INFO");

  // Completion State
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  // Readonly check - Tab Tugas, Barang, Diskusi readonly sebelum Mulai Kerja
  const isWorkStarted = wo?.status === "IN_PROGRESS";

  // Role checks
  const isMitraTeknisi = user?.employeeType === "MITRA_TEKNISI" || user?.role === "MITRA";
  const isAssignedToMe = wo?.assignedToId === user?.id || wo?.assignedMitraId === user?.id;
  const myAssignment = wo?.assignments?.find((a) => a.userId === user?.id);
  const isApprovedPartner = myAssignment?.role === "PARTNER" && myAssignment?.status === "APPROVED";
  const isPendingPartner = myAssignment?.role === "PARTNER" && myAssignment?.status === "PENDING";

  // Can this user interact with WO actions?
  const canInteract = isWorkStarted && (isAssignedToMe || isApprovedPartner);

  // Partner Modal State
  const [isPartnerModalVisible, setIsPartnerModalVisible] = useState(false);
  const [partnerResponseLoading, setPartnerResponseLoading] = useState(false);
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);

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
  } = useWorkOrder(routeWorkOrderId ?? "");

  const woData = workOrderResponse?.data;
  const canonicalWorkOrderId = resolveCanonicalWorkOrderId(
    routeWorkOrderId,
    woData?.id ?? wo?.id,
  );
  const resolvedWorkOrderId = canonicalWorkOrderId ?? routeWorkOrderId;

  // Extracted hooks
  const { getLocationWithTimeout } = useLocationWithTimeout();
  const { handleToggleTask } = useWorkOrderTasks({
    workOrderId: resolvedWorkOrderId ?? null,
    workOrder: wo,
    setWorkOrder: setWo,
    onRefresh: fetchDetail,
  });

  // API Mutations
  const { mutate: updateStatus, isPending: actionLoading } = useApiMutation({
    endpoint: `/api/mobile/work-orders/${resolvedWorkOrderId ?? ""}/update`,
    method: 'POST',
    invalidateKeys: resolvedWorkOrderId
      ? [queryKeys.workOrders.detail(resolvedWorkOrderId)]
      : [],
  });

  const { mutate: updateActivity, isPending: updateConfigLoading } = useApiMutation({
    endpoint: `/api/mobile/work-orders/${resolvedWorkOrderId ?? ""}/update`,
    method: 'POST',
    invalidateKeys: resolvedWorkOrderId
      ? [queryKeys.workOrders.detail(resolvedWorkOrderId)]
      : [],
  });

  // Memoize timeline for Discussion Tab
  const discussionTimeline = useMemo(() => {
    if (!wo) return [];

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

    return [...comments, ...photos].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [wo]);

  const ensureResolvedWorkOrderId = useCallback(() => {
    if (resolvedWorkOrderId) return resolvedWorkOrderId;
    presentInfoMessage("ID Work Order tidak valid.", "Perhatian");
    return null;
  }, [resolvedWorkOrderId]);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (routeWorkOrderId && token) {
        logger.info("[WO Detail] Screen focused, refreshing data...");
        fetchDetail();
      }
    }, [routeWorkOrderId, token, fetchDetail]),
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

  // Handle real-time work order updates
  const handleWOUpdate = useCallback(
    (data: { id: string; workOrderId?: string }) => {
      logger.socket("[WS Mobile] WorkOrder Update received:", data);
      if (
        resolvedWorkOrderId &&
        (data.id === resolvedWorkOrderId || data.workOrderId === resolvedWorkOrderId)
      ) {
        fetchDetail();
      }
    },
    [resolvedWorkOrderId, fetchDetail],
  );

  // Handle real-time activity updates
  const handleActivityUpdate = useCallback(
    (data: WorkOrderActivityPayload) => {
      logger.socket("[WS Mobile] Activity received:", data.activity.type);
      if (resolvedWorkOrderId && data.workOrderId === resolvedWorkOrderId) {
        fetchDetail();
      }
    },
    [resolvedWorkOrderId, fetchDetail],
  );

  useEffect(() => {
    if (!isFocused || !resolvedWorkOrderId) return;

    return realtimeService.subscribeToScope(
      { kind: 'workorder', id: resolvedWorkOrderId },
      (event: RealtimeStreamEvent) => {
        if (event.type === 'workorder.update') {
          handleWOUpdate(event.payload as { id: string; workOrderId?: string });
        }
        if (event.type === 'workorder.activity') {
          handleActivityUpdate(event.payload as WorkOrderActivityPayload);
        }
      },
    );
  }, [handleActivityUpdate, handleWOUpdate, isFocused, resolvedWorkOrderId]);

  const [loadingMessage, setLoadingMessage] = useState("Memproses...");

  const handleUpdateStatus = async (action: "START" | "PAUSE" | "COMPLETE") => {
    const workOrderId = ensureResolvedWorkOrderId();
    if (!workOrderId) return;

    if (action === "COMPLETE") {
      router.push(`/(app)/complete-work-order/${workOrderId}` as any);
      return;
    }

    setIsProcessingStatus(true);
    setLoadingMessage("Mencari Lokasi...");

    try {
      const loc = await getLocationWithTimeout(location);
      setLoadingMessage("Mengirim Data...");

      const payload = {
        action,
        latitude: loc.latitude,
        longitude: loc.longitude,
        locationName: loc.locationName,
        timestamp: new Date().toISOString(),
      };

      updateStatus(
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
              fetchDetail();
            }
            setIsProcessingStatus(false);
          },
          onError: (err) => {
            presentAppError(err, {
              screen: 'WorkOrderDetailScreen',
              route: '/(app)/work-order-detail/[id]',
            });
            setIsProcessingStatus(false);
          },
        },
      );
    } catch (error) {
      setIsProcessingStatus(false);
      presentAppError(error, {
        screen: 'WorkOrderDetailScreen',
        route: '/(app)/work-order-detail/[id]',
      });
    }
  };

  const handleUpdateActivity = async () => {
    if (!resolutionNotes && !photo) {
      presentInfoMessage("Mohon isi catatan atau upload foto.", "Perhatian");
      return;
    }

    setIsProcessingStatus(true);
    setLoadingMessage("Mencari Lokasi...");

    const loc = await getLocationWithTimeout(location);

    let uploadedPhotoUrl: string | null = null;
    if (photo) {
      setLoadingMessage("Mengupload Foto...");
      try {
        uploadedPhotoUrl = await uploadService.uploadFile(photo, "work-order-updates");
        logger.info("[WO Comment] Photo uploaded:", uploadedPhotoUrl);
      } catch (uploadError: any) {
        logger.error("[WO Comment] Photo upload failed:", uploadError);
        presentAppError(uploadError, {
          screen: 'WorkOrderDetailScreen',
          route: '/(app)/work-order-detail/[id]',
        });
        setIsProcessingStatus(false);
        return;
      }
    }

    setLoadingMessage("Mengirim Update...");

    const payload = {
      action: "COMMENT",
      latitude: loc.latitude,
      longitude: loc.longitude,
      locationName: loc.locationName,
      notes: resolutionNotes,
      photoUrl: uploadedPhotoUrl,
      timestamp: new Date().toISOString(),
    };

    updateActivity(payload, {
      onSuccess: (data) => {
        setLoadingMessage("Berhasil!");
        const isOffline = isOfflineMutationQueuedResult(data);
        if (isOffline) {
          presentInfoMessage("Update disimpan di antrian.", "Offline");
        } else {
          presentSuccessMessage("Catatan Diperbarui");
          fetchDetail();
        }
        setResolutionNotes("");
        setPhoto(null);
        setIsProcessingStatus(false);
      },
      onError: (err) => {
        presentAppError(err, {
          screen: 'WorkOrderDetailScreen',
          route: '/(app)/work-order-detail/[id]',
        });
        setIsProcessingStatus(false);
      },
    });
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
              if (!result.canceled) setPhoto(result.assets[0].uri);
            } catch (error) {
              presentAppError(error, {
                screen: 'WorkOrderDetailScreen',
                route: '/(app)/work-order-detail/[id]',
              });
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
              presentAppError(error, {
                screen: 'WorkOrderDetailScreen',
                route: '/(app)/work-order-detail/[id]',
              });
            }
          },
        },
      ],
    );
  };

  const handlePartnerResponse = async (response: "APPROVED" | "REJECTED") => {
    const workOrderId = ensureResolvedWorkOrderId();
    if (!workOrderId) return;

    setPartnerResponseLoading(true);
    try {
      const res = await (await import("@/services/api")).default.post(
        `/api/mobile/work-orders/${workOrderId}/partner-response`,
        { response },
      );

      if (res.data.success) {
        presentSuccessMessage(
          `Berhasil ${response === "APPROVED" ? "menerima" : "menolak"} permintaan partner.`,
        );
        if (response === "REJECTED") {
          router.back();
        } else {
          fetchDetail();
        }
      }
    } catch (error) {
      logger.error("Partner Response Error:", error);
      presentAppError(error, {
        screen: 'WorkOrderDetailScreen',
        route: '/(app)/work-order-detail/[id]',
      });
    } finally {
      setPartnerResponseLoading(false);
    }
  };

  const handleRemovePartner = async (assignmentId: string) => {
    const workOrderId = ensureResolvedWorkOrderId();
    if (!workOrderId) return;

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
              await (await import("@/services/api")).default.delete(
                `/api/mobile/work-orders/${workOrderId}/partners?assignmentId=${assignmentId}`,
              );
              fetchDetail();
              presentSuccessMessage("Partner dihapus");
            } catch (error) {
              presentAppError(error, {
                screen: 'WorkOrderDetailScreen',
                route: '/(app)/work-order-detail/[id]',
              });
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

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`px-4 py-3 flex-row items-center border-b border-gray-200 bg-white`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`p-2 mr-2 -ml-2`}>
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
            style={tw`flex-1 flex-row items-center justify-center py-3 border-b-2 ${activeTab === tab.key ? "border-blue-600" : "border-transparent"}`}
          >
            <tab.icon
              size={16}
              color={activeTab === tab.key ? "#2563eb" : "#6b7280"}
              style={tw`mr-2`}
            />
            <Text style={tw`text-sm font-medium ${activeTab === tab.key ? "text-blue-600" : "text-gray-500"}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Role Indicator Banner */}
      {(isAssignedToMe || isApprovedPartner) && !isMitraTeknisi && (
        <View
          style={tw`px-4 py-2 ${isAssignedToMe ? 'bg-blue-50 border-b border-blue-100' : 'bg-indigo-50 border-b border-indigo-100'}`}
        >
          <View style={tw`flex-row items-center justify-center`}>
            <User size={14} color={isAssignedToMe ? '#2563eb' : '#6366f1'} style={tw`mr-1.5`} />
            <Text style={tw`text-xs font-bold ${isAssignedToMe ? 'text-blue-700' : 'text-indigo-700'}`}>
              {isAssignedToMe ? 'Anda adalah Lead Teknisi' : 'Anda adalah Partner'}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[tw`p-4`, { paddingBottom: getWorkOrderDetailScrollPaddingBottom(insets.bottom) }]}
      >
        {activeTab === "INFO" && (
          <InfoTab
            wo={wo}
            user={user}
            isMitraTeknisi={isMitraTeknisi}
            actionLoading={actionLoading}
            handlePartnerResponse={handlePartnerResponse}
            handleRemovePartner={handleRemovePartner}
            setIsPartnerModalVisible={setIsPartnerModalVisible}
          />
        )}
        {activeTab === "TASKS" && (
          <TasksTab
            wo={wo}
            canInteract={canInteract}
            isWorkStarted={isWorkStarted}
            handleToggleTask={handleToggleTask}
          />
        )}
        {activeTab === "ITEMS" && (
          <ItemsTab
            wo={wo}
            canInteract={canInteract}
            isWorkStarted={isWorkStarted}
            resolvedWorkOrderId={resolvedWorkOrderId}
          />
        )}
        {activeTab === "DISKUSI" && (
          <DiscussionTab
            discussionTimeline={discussionTimeline}
            canInteract={canInteract}
            isWorkStarted={isWorkStarted}
            resolutionNotes={resolutionNotes}
            setResolutionNotes={setResolutionNotes}
            photo={photo}
            handleImageSelection={handleImageSelection}
            setPhoto={setPhoto}
            handleUpdateActivity={handleUpdateActivity}
            isProcessingActivity={updateConfigLoading}
            openImageViewer={openImageViewer}
            user={user}
          />
        )}
        {activeTab === "TIMELINE" && (
          <TimelineTab wo={wo} />
        )}
      </ScrollView>

      <PartnerModal
        visible={isPartnerModalVisible}
        onClose={() => setIsPartnerModalVisible(false)}
        workOrderId={resolvedWorkOrderId}
        onRefresh={fetchDetail}
      />

      {/* Bottom Actions */}
      {(() => {
        if (!wo) return null;

        const partnerList =
          wo.assignments?.filter((a: WorkOrderAssignment) => a.role === "PARTNER") || [];
        const allPartnersResponded =
          partnerList.length === 0 ||
          partnerList.every((a: WorkOrderAssignment) => a.status !== "PENDING");

        const canStartWork =
          isAssignedToMe && wo.status === "ASSIGNED" && allPartnersResponded;
        const canResumeWork = isAssignedToMe && wo.status === "ON_HOLD";

        if (isPendingPartner) {
          return (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 bg-yellow-50 p-4 border-t border-yellow-200 shadow-lg z-20`,
                { paddingBottom: getWorkOrderDetailActionBarPaddingBottom(insets.bottom) },
              ]}
            >
              <Text style={tw`text-sm text-yellow-800 font-medium text-center mb-3`}>
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

        if (isAssignedToMe && wo.status === "IN_PROGRESS") {
          return (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex-row gap-3 shadow-lg z-20`,
                { paddingBottom: getWorkOrderDetailActionBarPaddingBottom(insets.bottom) },
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

        if (canStartWork) {
          return (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-lg z-20`,
                { paddingBottom: getWorkOrderDetailActionBarPaddingBottom(insets.bottom) },
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

        if (isAssignedToMe && wo.status === "ASSIGNED" && !allPartnersResponded) {
          return (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 bg-yellow-50 p-4 border-t border-yellow-200 shadow-lg z-20`,
                { paddingBottom: getWorkOrderDetailActionBarPaddingBottom(insets.bottom) },
              ]}
            >
              <Text style={tw`text-sm text-yellow-800 font-medium text-center`}>
                Menunggu konfirmasi partner sebelum mulai pekerjaan...
              </Text>
            </View>
          );
        }

        if (canResumeWork) {
          return (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-lg z-20`,
                { paddingBottom: getWorkOrderDetailActionBarPaddingBottom(insets.bottom) },
              ]}
            >
              <TouchableOpacity
                onPress={() => handleUpdateStatus("START")}
                disabled={actionLoading || isProcessingStatus}
                style={tw`bg-blue-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-sm`}
              >
                <Play size={20} color="white" style={tw`mr-2`} />
                <Text style={tw`font-bold text-white`}>Lanjutkan Pekerjaan</Text>
              </TouchableOpacity>
            </View>
          );
        }

        return null;
      })()}

      <LoadingModal
        visible={isProcessingStatus || updateConfigLoading || partnerResponseLoading}
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
