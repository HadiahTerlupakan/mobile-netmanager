import { useCallback } from "react";
import api from "@/services/api";
import { WorkOrder } from "@/types/work-order";
import { presentAppError } from "@/utils/errorPresenter";
import { logger } from "@/utils/logger";

interface UseWorkOrderTasksOptions {
  workOrderId: string | null;
  workOrder: WorkOrder | null;
  setWorkOrder: (wo: WorkOrder) => void;
  onRefresh: () => void;
}

interface UseWorkOrderTasksReturn {
  /** Toggle a task between PENDING and COMPLETED with optimistic update */
  handleToggleTask: (taskId: string, currentStatus: string) => Promise<void>;
}

/**
 * Handles task toggle logic with optimistic updates and rollback on error.
 */
export function useWorkOrderTasks({
  workOrderId,
  workOrder,
  setWorkOrder,
  onRefresh,
}: UseWorkOrderTasksOptions): UseWorkOrderTasksReturn {
  const handleToggleTask = useCallback(
    async (taskId: string, currentStatus: string) => {
      if (!workOrder || !workOrderId) return;

      // Optimistic update
      const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
      const updatedTasks = workOrder.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus as "PENDING" | "COMPLETED" }
          : t,
      );
      setWorkOrder({ ...workOrder, tasks: updatedTasks });

      try {
        await api.patch(
          `/api/mobile/work-orders/${workOrderId}/tasks`,
          {
            taskId,
            isCompleted: newStatus === "COMPLETED",
          },
        );
        // Background refresh to sync fully
        onRefresh();
      } catch (error) {
        logger.error("Task Toggle Error:", error);
        presentAppError(error, {
          screen: "WorkOrderDetailScreen",
          route: "/(app)/work-order-detail/[id]",
        });
        // Revert on error
        onRefresh();
      }
    },
    [workOrder, workOrderId, setWorkOrder, onRefresh],
  );

  return { handleToggleTask };
}
