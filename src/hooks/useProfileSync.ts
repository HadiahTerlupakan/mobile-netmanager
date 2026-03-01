import { useAuth, User } from '@/context/AuthContext';
import { useSocketEvent } from '@/context/SocketContext';
import { SOCKET_EVENTS } from '@/context/socketTypes';
import { useOfflineQuery } from '@/hooks/queries';
import { queryKeys } from '@/lib/queryClient';
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

export function useProfileSync() {
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

    // Listen for real-time profile refresh pushed by admin (e.g. requiresFaceVerification toggled)
    const handleProfileRefresh = useCallback(() => {
        logger.info('[useProfileSync] Received profile:refresh via Socket.IO — refetching...');
        query.refetch();
    }, [query]);

    useSocketEvent<{ timestamp: string }>(SOCKET_EVENTS.PROFILE_REFRESH, handleProfileRefresh);

    // Refetch on app focus so it gets instant trigger
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && token) {
                query.refetch();
            }
        });

        return () => {
            subscription.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, query.refetch]);

    useEffect(() => {
        if (profileData && user) {
            // Safe access properties with defaults
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
        }
    }, [profileData, user, updateUser]);

    const hasFeature = (feature: string) => {
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        // Check fresh data first, then fall back to auth context
        return profileData?.features?.includes(feature) ?? user.features?.includes(feature) ?? false;
    };

    return {
        profileData,
        isPending: query.isPending,
        refetch: query.refetch,
        hasFeature
    };
}
