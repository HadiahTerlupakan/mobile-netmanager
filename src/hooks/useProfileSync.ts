import { useAuth, User } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/queries';
import { queryKeys } from '@/lib/queryClient';
import { logger } from '@/utils/logger';
import { useEffect } from 'react';

interface UserProfile {
    name: string | null;
    email: string | null;
    image: string | null;
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
}

export function useProfileSync() {
    const { user, token, updateUser } = useAuth();

    // Use offline query to persist user profile and features
    // This ensures app works offline even after restart
    const query = useOfflineQuery<any, Error, UserProfile>({
        queryKey: queryKeys.profile.detail(),
        endpoint: '/api/mobile/profile',
        select: (data: any) => data?.data || data, // Handle wrapped response
        enabled: !!token
    });

    const profileData = query.data;

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

            if (hasNameChanged || hasFeaturesChanged || hasImageChanged || hasLeaveStatusChanged) {
                logger.info('[useProfileSync] Syncing fresh profile data to AuthContext');

                const updatedUser: User = {
                    ...user,
                    name: safeName,
                    features: profileData.features || user.features,
                    image: profileData.image,
                    isOnLeave: profileData.isOnLeave
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
