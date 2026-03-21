/**
 * Work Orders Query Hooks
 *
 * Contoh implementasi TanStack Query untuk Work Orders feature
 */

import { queryKeys } from "@/lib/queryClient";
import { useApiMutation } from "./useApiMutation";
import { useOfflineQuery } from "../useOfflineQuery";
import { WorkOrder } from "@/types/work-order";

// Types
interface WorkOrdersResponse {
  data: WorkOrder[];
  nextCursor?: string;
  total?: number;
}

interface CreateWorkOrderPayload {
  [key: string]: unknown;
  customerName?: string;
  address?: string;
  description: string;
  priority?: WorkOrder["priority"];
  scheduledDate?: string;
}

interface UpdateWorkOrderPayload {
  [key: string]: unknown;
  id: string;
  status?: WorkOrder["status"];
  notes?: string;
  photos?: string[];
}

/**
 * Fetch all work orders with optional type filtering
 */
export function useWorkOrders(params: { type?: "active" | "history"; limit?: number } = {}, options?: { enabled?: boolean }) {
  const { type, limit = 10 } = params;
  const endpoint = type
    ? `/api/mobile/work-orders?type=${type}&limit=${limit}`
    : `/api/mobile/work-orders?limit=${limit}`;

  return useOfflineQuery<WorkOrdersResponse>({
    queryKey: [...queryKeys.workOrders.list(), type, limit],
    endpoint,
    enabled: options?.enabled,
  });
}

/**
 * Fetch available work orders (to be claimed)
 */
export function useAvailableWorkOrders(options?: { enabled?: boolean }) {
  return useOfflineQuery<WorkOrdersResponse>({
    queryKey: [...queryKeys.workOrders.list(), "available"],
    endpoint: "/api/mobile/work-orders/available",
    enabled: options?.enabled,
  });
}

/**
 * Fetch single work order by ID
 */
export function useWorkOrder(id: string) {
  return useOfflineQuery<{ data: WorkOrder }>({
    queryKey: queryKeys.workOrders.detail(id),
    endpoint: `/api/mobile/work-orders/${id}`,
    enabled: !!id,
  });
}

/**
 * Claim an available work order
 */
export function useClaimWorkOrder(options?: any) {
  return useApiMutation<any, { workOrderId: string }>({
    endpoint: "/api/mobile/work-orders/available",
    method: "POST",
    invalidateKeys: [queryKeys.workOrders.list()],
    successMessage: "Tugas berhasil diambil!",
    ...options,
  });
}

/**
 * Create new work order request
 */
export function useCreateWorkOrderRequest(options?: any) {
  return useApiMutation<{ data: WorkOrder }, any>({
    endpoint: "/api/mobile/work-orders/request",
    method: "POST",
    includeLocation: true,
    invalidateKeys: [queryKeys.workOrders.list()],
    ...options,
  });
}

/**
 * Create new work order (Direct)
 */
export function useCreateWorkOrder(options?: any) {
  return useApiMutation<{ data: WorkOrder }, CreateWorkOrderPayload>({
    endpoint: "/api/mobile/work-orders",
    method: "POST",
    includeLocation: true,
    invalidateKeys: [queryKeys.workOrders.list()],
    successMessage: "Work Order berhasil dibuat",
    ...options,
  });
}

/**
 * Update work order status
 */
export function useUpdateWorkOrder() {
  return useApiMutation<{ data: WorkOrder }, UpdateWorkOrderPayload>({
    endpoint: "/api/mobile/work-orders",
    method: "PATCH",
    includeLocation: true,
    invalidateKeys: [queryKeys.workOrders.list()],
  });
}

/**
 * Complete work order action
 */
export function useCompleteWorkOrder() {
  return useApiMutation<
    { data: WorkOrder },
    { id: string; notes?: string; photos?: string[] }
  >({
    endpoint: "/api/mobile/work-orders/complete",
    method: "POST",
    includeLocation: true,
    invalidateKeys: [queryKeys.workOrders.list()],
    successMessage: "Work Order berhasil diselesaikan",
  });
}
