import { useAuth, User } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/queries';
import { queryKeys, queryClient } from '@/lib/queryClient';
import { realtimeService } from '@/services/RealtimeService';
import { logger } from '@/utils/logger';
import { useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UserProfile {
    id?: string;
    name: string | null;
    email: string | null;
    image: string | null;
    nik?: string | null;
    fotoDiri?: string | null;
    createdAt?: string;
    mitraType?: string;
    features?: string[];
    role?: {
        id: string;
        name: string;
    } | null;
    departments?: {
        id: string;
        name: string;
    } | null;
    sites?: {
        id: string;
        name: string;
    } | null;
    workingHourMode?: string | null;
    startWorkTime?: string | null;
    endWorkTime?: string | null;
    workDays?: string | null;
    isOnLeave?: boolean;
    requiresFaceVerification?: boolean;
}

interface UseProfileSyncOptions {
    enableBackgroundSync?: boolean;
}

/**
 * Module-scoped singleton state untuk realtime profile listener. Tanpa ini,
 * setiap component yang panggil `useProfileSync({ enableBackgroundSync })`
 * akan create listener Firestore terpisah ke `users/{id}/events`. Saat
 * `profile.refresh` event masuk, N listener trigger N concurrent refetch
 * `/api/mobile/profile` → bandwidth waste + race condition di updateUser.
 *
 * Ref counting: subscribe sekali saat counter naik dari 0 → 1, unsubscribe
 * saat counter turun dari 1 → 0. Refetch via queryClient agar cache shared
 * antar consumer.
 */
const profileListenerState: {
  userId: string | null;
  refCount: number;
  unsubscribe: (() => void) | null;
} = { userId: null, refCount: 0, unsubscribe: null };

function acquireProfileListener(userId: string): () => void {
  if (profileListenerState.userId !== userId) {
    // User berbeda — release listener lama
    profileListenerState.unsubscribe?.();
    profileListenerState.unsubscribe = null;
    profileListenerState.refCount = 0;
    profileListenerState.userId = userId;
  }

  if (profileListenerState.refCount === 0) {
    profileListenerState.unsubscribe = realtimeService.subscribeToUserStream(
      userId,
      (event) => {
        if (event.type !== 'profile.refresh') return;
        logger.info('[useProfileSync] profile.refresh received — invalidating profile cache');
        // Invalidate via queryClient agar semua consumer auto-refetch
        // dengan data shared, bukan multi-fetch paralel.
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.detail() });
      },
    );
  }

  profileListenerState.refCount++;

  return () => {
    profileListenerState.refCount--;
    if (profileListenerState.refCount <= 0) {
      profileListenerState.unsubscribe?.();
      profileListenerState.unsubscribe = null;
      profileListenerState.refCount = 0;
      profileListenerState.userId = null;
    }
  };
}

export function useProfileSync({ enableBackgroundSync = false }: UseProfileSyncOptions = {}) {
    const { user, token, updateUser } = useAuth();

    // Use offline query to persist user profile and features
    // This ensures app works offline even after restart
    // NO polling — profile updates are pushed via Socket.IO (profile:refresh event)
    const query = useOfflineQuery<any, Error, UserProfile>({
        queryKey: queryKeys.profile.detail(),
        endpoint: '/api/mobile/profile',
        select: (data: any) => data?.data || data, // Handle wrapped response
        enabled: !!token,
        staleTime: 5 * 60 * 1000, // 5 minutes — we only refetch on demand via socket or app focus
    });

    const profileData = query.data;
    const { refetch } = query;
    const refetchProfile = useCallback(() => refetch(), [refetch]);

    useEffect(() => {
        if (!enableBackgroundSync || !user?.id) {
            return;
        }

        // Acquire singleton listener — module-level ref count memastikan
        // hanya 1 listener Firestore per user walau hook dipanggil dari
        // multiple component sekaligus.
        return acquireProfileListener(user.id);
    }, [enableBackgroundSync, user?.id]);

    // Refetch on app focus so it gets instant trigger
    useEffect(() => {
        if (!enableBackgroundSync) {
            return;
        }

        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && token) {
                refetchProfile();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [enableBackgroundSync, refetchProfile, token]);

    useEffect(() => {
        if (!enableBackgroundSync || !profileData || !user) {
            return;
        }

        const currentFeatures = JSON.stringify([...(user.features || [])].sort());
        const newFeatures = JSON.stringify([...(profileData.features || [])].sort());
        const safeName = profileData.name || user.name || '';

        const hasNameChanged = user.name !== safeName;
        const hasFeaturesChanged = currentFeatures !== newFeatures;
        const hasImageChanged = user.image !== profileData.image;
        const hasLeaveStatusChanged = user.isOnLeave !== profileData.isOnLeave;
        const hasVerificationChanged = user.requiresFaceVerification !== profileData.requiresFaceVerification;

        if (hasNameChanged || hasFeaturesChanged || hasImageChanged || hasLeaveStatusChanged || hasVerificationChanged) {
            logger.info('[useProfileSync] Syncing fresh profile data to AuthContext');

            const updatedUser: User = {
                ...user,
                name: safeName,
                features: profileData.features || user.features,
                image: profileData.image,
                isOnLeave: profileData.isOnLeave,
                requiresFaceVerification: profileData.requiresFaceVerification
            };

            updateUser(updatedUser);
        }
    }, [enableBackgroundSync, profileData, user, updateUser]);

    const hasFeature = (feature: string) => {
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        // Check fresh data first, then fall back to auth context
        return profileData?.features?.includes(feature) ?? user.features?.includes(feature) ?? false;
    };

    return {
        profileData,
        isPending: query.isPending,
        refetch: refetchProfile,
        hasFeature
    };
}
