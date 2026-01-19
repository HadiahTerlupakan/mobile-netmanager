/**
 * TanStack Query Hooks - Barrel Export
 *
 * Central export point untuk semua query hooks
 */

// Query wrapper
export { useApiQuery, useOfflineQueryCompat } from "./useApiQuery";

// Mutation wrapper
export { useApiMutation, useOfflineMutationCompat } from "./useApiMutation";

// Re-export TanStack Query hooks untuk convenience
export {
    useInfiniteQuery,
    useIsFetching,
    useIsMutating, useMutation, useQuery, useQueryClient
} from "@tanstack/react-query";

// Re-export query keys
export { queryKeys } from "../../lib/queryClient";
