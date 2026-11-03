import { WorkOrder } from '@/types/work-order';

/**
 * Benar bila server menandai pemirsa sebagai OBSERVER: WO hanya boleh dilihat.
 * Field yang tidak ada (server lama) berarti bukan observer, sama seperti dulu.
 */
export function isWorkOrderObserver(workOrder: Pick<WorkOrder, 'viewerAccess'> | null | undefined): boolean {
  return workOrder?.viewerAccess === 'OBSERVER';
}
