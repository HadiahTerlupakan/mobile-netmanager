import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import api from "@/services/api";
import { UserSummary } from "@/types/work-order";
import { presentAppError, presentSuccessMessage } from "@/utils/errorPresenter";
import { logger } from "@/utils/logger";

interface UseWorkOrderPartnersOptions {
  workOrderId: string | null;
  onRefresh: () => void;
}

interface UseWorkOrderPartnersReturn {
  /** Whether the partner selection modal is visible */
  isPartnerModalVisible: boolean;
  setIsPartnerModalVisible: (visible: boolean) => void;
  /** Available partners fetched from the API */
  availablePartners: UserSummary[];
  /** Current search query for filtering partners */
  searchPartnerQuery: string;
  setSearchPartnerQuery: (query: string) => void;
  /** Loading state for initial partner fetch */
  partnerLoading: boolean;
  /** Loading state for partner response (accept/reject) */
  partnerResponseLoading: boolean;
  /** Whether more partners can be loaded (pagination) */
  hasMorePartners: boolean;
  /** Loading state for fetching next page */
  isFetchingMorePartners: boolean;
  /** Add a partner to the work order */
  handleAddPartner: (userId: string) => Promise<void>;
  /** Remove a partner from the work order */
  handleRemovePartner: (assignmentId: string) => void;
  /** Accept or reject a partner invitation */
  handlePartnerResponse: (response: "APPROVED" | "REJECTED") => Promise<void>;
  /** Load next page of partners */
  loadMorePartners: () => void;
}

/**
 * Manages partner search, pagination, add/remove, and accept/reject logic
 * for a work order's team management.
 */
export function useWorkOrderPartners({
  workOrderId,
  onRefresh,
}: UseWorkOrderPartnersOptions): UseWorkOrderPartnersReturn {
  const [isPartnerModalVisible, setIsPartnerModalVisible] = useState(false);
  const [availablePartners, setAvailablePartners] = useState<UserSummary[]>([]);
  const [searchPartnerQuery, setSearchPartnerQuery] = useState("");
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerResponseLoading, setPartnerResponseLoading] = useState(false);
  const [partnerPage, setPartnerPage] = useState(1);
  const [hasMorePartners, setHasMorePartners] = useState(true);
  const [isFetchingMorePartners, setIsFetchingMorePartners] = useState(false);

  const fetchPartners = useCallback(
    async (pageNum = 1, shouldAppend = false) => {
      if (!isPartnerModalVisible) return;

      if (pageNum === 1) setPartnerLoading(true);
      else setIsFetchingMorePartners(true);

      try {
        const res = await api.get(
          `/api/mobile/partners?search=${searchPartnerQuery}&page=${pageNum}&limit=20`,
        );
        if (res.data.success) {
          const newData = res.data.data;
          const pagination = res.data.pagination;

          setAvailablePartners((prev) =>
            shouldAppend ? [...prev, ...newData] : newData,
          );
          setHasMorePartners(pageNum < (pagination?.totalPages || 0));
          setPartnerPage(pageNum);
        }
      } catch (error) {
        logger.error("Fetch Partners Error:", error);
      } finally {
        setPartnerLoading(false);
        setIsFetchingMorePartners(false);
      }
    },
    [isPartnerModalVisible, searchPartnerQuery],
  );

  useEffect(() => {
    setPartnerPage(1);
    fetchPartners(1, false);
  }, [fetchPartners]);

  const loadMorePartners = useCallback(() => {
    if (!partnerLoading && !isFetchingMorePartners && hasMorePartners) {
      fetchPartners(partnerPage + 1, true);
    }
  }, [partnerLoading, isFetchingMorePartners, hasMorePartners, fetchPartners, partnerPage]);

  /** Add a user as partner to the current work order */
  const handleAddPartner = useCallback(
    async (userId: string) => {
      if (!workOrderId) return;

      setPartnerLoading(true);
      try {
        await api.post(`/api/mobile/work-orders/${workOrderId}/partners`, {
          userId,
          role: "PARTNER",
        });
        setIsPartnerModalVisible(false);
        onRefresh();
        presentSuccessMessage("Partner berhasil ditambahkan");
      } catch (error) {
        presentAppError(error, {
          screen: "WorkOrderDetailScreen",
          route: "/(app)/work-order-detail/[id]",
        });
      } finally {
        setPartnerLoading(false);
      }
    },
    [workOrderId, onRefresh],
  );

  /** Remove a partner assignment from the work order (with confirmation) */
  const handleRemovePartner = useCallback(
    (assignmentId: string) => {
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
                await api.delete(
                  `/api/mobile/work-orders/${workOrderId}/partners?assignmentId=${assignmentId}`,
                );
                onRefresh();
                presentSuccessMessage("Partner dihapus");
              } catch (error) {
                presentAppError(error, {
                  screen: "WorkOrderDetailScreen",
                  route: "/(app)/work-order-detail/[id]",
                });
              }
            },
          },
        ],
      );
    },
    [workOrderId, onRefresh],
  );

  /** Accept or reject a partner invitation for the current user */
  const handlePartnerResponse = useCallback(
    async (response: "APPROVED" | "REJECTED") => {
      if (!workOrderId) return;

      setPartnerResponseLoading(true);
      try {
        const res = await api.post(
          `/api/mobile/work-orders/${workOrderId}/partner-response`,
          { response },
        );

        if (res.data.success) {
          presentSuccessMessage(
            `Berhasil ${response === "APPROVED" ? "menerima" : "menolak"} permintaan partner.`,
          );

          if (response === "REJECTED") {
            // Caller should handle navigation on rejection
          }

          onRefresh();
        }
      } catch (error) {
        logger.error("Partner Response Error:", error);
        presentAppError(error, {
          screen: "WorkOrderDetailScreen",
          route: "/(app)/work-order-detail/[id]",
        });
      } finally {
        setPartnerResponseLoading(false);
      }
    },
    [workOrderId, onRefresh],
  );

  return {
    isPartnerModalVisible,
    setIsPartnerModalVisible,
    availablePartners,
    searchPartnerQuery,
    setSearchPartnerQuery,
    partnerLoading,
    partnerResponseLoading,
    hasMorePartners,
    isFetchingMorePartners,
    handleAddPartner,
    handleRemovePartner,
    handlePartnerResponse,
    loadMorePartners,
  };
}
