/**
 * Work Orders Query Hooks
 *
 * Contoh implementasi TanStack Query untuk Work Orders feature
 */

import { queryKeys } from "../../lib/queryClient";
import { useApiMutation, useApiQuery, useQueryClient } from "./index";

// Types
export interface WorkOrder {
  id: string;
  ticketNumber: string;
  customerName: string;
  address: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  scheduledDate: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkOrdersResponse {
  data: WorkOrder[];
  total: number;
}

interface CreateWorkOrderPayload {
  customerName: string;
  address: string;
  description: string;
  priority?: WorkOrder["priority"];
  scheduledDate?: string;
}

interface UpdateWorkOrderPayload {
  id: string;
  status?: WorkOrder["status"];
  notes?: string;
  photos?: string[];
}

/**
 * Fetch all work orders
 */
export function useWorkOrders(options?: { enabled?: boolean }) {
  return useApiQuery<WorkOrdersResponse>({
    queryKey: queryKeys.workOrders.list(),
    endpoint: "/api/mobile/work-orders",
    enabled: options?.enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes for work orders
  });
}

/**
 * Fetch single work order by ID
 */
export function useWorkOrder(id: string) {
  return useApiQuery<{ data: WorkOrder }>({
    queryKey: queryKeys.workOrders.detail(id),
    endpoint: `/api/mobile/work-orders/${id}`,
    enabled: !!id,
  });
}

/**
 * Create new work order
 */
export function useCreateWorkOrder() {
  return useApiMutation<{ data: WorkOrder }, CreateWorkOrderPayload>({
    endpoint: "/api/mobile/work-orders",
    method: "POST",
    includeLocation: true,
    invalidateKeys: [[...queryKeys.workOrders.list()]],
    successMessage: "Work Order berhasil dibuat",
  });
}

/**
 * Update work order status (with optimistic update)
 */
export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();

  return useApiMutation<{ data: WorkOrder }, UpdateWorkOrderPayload>({
    endpoint: "/api/mobile/work-orders",
    method: "PATCH",
    includeLocation: true,
    invalidateKeys: [[...queryKeys.workOrders.list()]],
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.workOrders.detail(newData.id),
      });

      // Snapshot previous value
      const previousWorkOrder = queryClient.getQueryData(
        queryKeys.workOrders.detail(newData.id),
      );

      // Optimistically update
      if (previousWorkOrder) {
        queryClient.setQueryData(
          queryKeys.workOrders.detail(newData.id),
          (old: any) => ({
            ...old,
            data: { ...old.data, ...newData },
          }),
        );
      }

      return { previousWorkOrder };
    },
    onError: (err, variables, context: any) => {
      // Rollback on error
      if (context?.previousWorkOrder) {
        queryClient.setQueryData(
          queryKeys.workOrders.detail(variables.id),
          context.previousWorkOrder,
        );
      }
    },
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
    invalidateKeys: [[...queryKeys.workOrders.list()]],
    successMessage: "Work Order berhasil diselesaikan",
  });
}
