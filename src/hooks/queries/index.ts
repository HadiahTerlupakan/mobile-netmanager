/**
 * TanStack Query Hooks - Barrel Export
 *
 * Central export point untuk semua query hooks
 */

// Query wrapper
export { useApiQuery } from "./useApiQuery";
export { useOfflineQuery } from "../useOfflineQuery";

// Mutation wrapper
export { isOfflineMutationQueuedResult, useApiMutation } from "./useApiMutation";

// Feature hooks
export * from "./useWorkOrders";
export * from "./usePengesahan";

// Re-export TanStack Query hooks untuk convenience
export {
    useInfiniteQuery,
    useIsFetching,
    useIsMutating, useMutation, useQuery, useQueryClient
} from "@tanstack/react-query";

// Re-export query keys
export { queryKeys } from "@/lib/queryClient";
