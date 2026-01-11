import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { CanvasingCard } from '../../components/dashboard/CanvasingCard';
import { DashboardHeader } from '../../components/dashboard/Header';
import { PerformanceStats } from '../../components/dashboard/PerformanceStats';
import { QuickMenu } from '../../components/dashboard/QuickMenu';
import { WorkOrderCard } from '../../components/dashboard/WorkOrderCard';
import { Config } from '../../constants/Config';
import { useAuth } from '../../context/AuthContext';

// Define stats interface
interface DashboardStats {
    workOrdersAssigned: number;
    workOrdersPending: number;
    woCompletedToday: number;
    woCompletedWeek: number;
    woCompletedMonth: number;
    barangKeluarToday: number;
    barangMasukToday: number;
}

interface UserProfile {
    name: string | null;
    image: string | null;
    features?: string[]; // Feature permissions from role
}

export default function Dashboard() {
    const { user, token } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [refreshing, setRefreshing] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = (event: any) => {
        const slideSize = width;
        const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
        setActiveIndex(index);
    };
    
    // Fetch dashboard stats
    const { data: statsData, isLoading: loading, refetch } = useOfflineQuery({
        key: 'dashboard_stats',
        fetcher: async () => {
            const res = await axios.get(`${Config.API_URL}/api/mobile/dashboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        },
        enabled: !!token
    });

    // Fetch user profile for image and features
    const { data: profileData, refetch: refetchProfile } = useOfflineQuery({
        key: 'user_profile',
        fetcher: async () => {
            const res = await axios.get(`${Config.API_URL}/api/mobile/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data?.data as UserProfile;
        },
        enabled: !!token,
        onSuccess: (data) => {
             // Sync latest features to AuthContext so Navbar updates
             if (data && user) {
                 const updatedUser = { ...user, ...data };
                 // Only update if features changed to avoid loop (though useOfflineQuery handles stable data usually)
                 // But simple merge is safe.
                 // Actually we need to access updateUser from context.
             }
        }
    });

    // Effect to sync user data
    const { updateUser } = useAuth();
    useEffect(() => {
        if (profileData && user) {
            // Check if features invalid or different to avoid loop if possible, 
            // but for now just update if profileData is loaded.
            // Ideally check deep equality but JSON stringify is cheap for this size.
            const currentFeatures = JSON.stringify(user.features || []);
            const newFeatures = JSON.stringify(profileData.features || []);
            
            // Ensure name is string (fallback to empty) for type safety
            const safeName = profileData.name || user.name;
            // Since AuthContext User type doesn't have image, we might need to extend it or just pass safe data
            // But updateUser expects User type.
            // Let's modify AuthContext type first or cast here.
            // Casting for now to avoid breaking AuthContext widely if not ready.
            const updatedUser = { 
                ...user, 
                name: safeName, 
                features: profileData.features,
                image: profileData.image // This might be ignored or cause error if strict
            } as any; 
            
            if (currentFeatures !== newFeatures || user.name !== safeName) {
                console.log('[Dashboard] Syncing fresh profile data to AuthContext');
                updateUser(updatedUser);
            }
        }
    }, [profileData]);

    const stats = statsData || null;

    // Helper to check features (duplicated from layout, ideal to move to hook but okay for now)
    const hasFeature = (feature: string) => {
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        return profileData?.features?.includes(feature) ?? false;
    };

    const isWorkOrderDisabled = !hasFeature('m_work_order');

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetch(), refetchProfile()]);
        setRefreshing(false);
    }, [refetch, refetchProfile]);

    if (loading && !stats) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50 items-center justify-center`}>
                <ActivityIndicator size="large" color="#2563eb" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <DashboardHeader 
                userName={profileData?.name || user?.name || 'Karyawan'} 
                userImage={profileData?.image}
            />

            <ScrollView
                contentContainerStyle={tw`pb-10 pt-4`}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Greeting */}
                <View style={tw`px-4 pb-4`}>
                    <Text style={tw`text-sm font-medium text-gray-500`}>Selamat datang,</Text>
                    <Text style={tw`text-2xl font-bold text-gray-900`}>{profileData?.name || user?.name || 'User'}</Text>
                </View>

                {/* Cards Carousel */}
                <View>
                    <ScrollView 
                        horizontal 
                        pagingEnabled 
                        showsHorizontalScrollIndicator={false}
                        decelerationRate="fast"
                        snapToInterval={width}
                        snapToAlignment="center"
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                    >
                        <View style={{ width: width }}>
                            <WorkOrderCard
                                assigned={stats?.workOrdersAssigned || 0}
                                pending={stats?.workOrdersPending || 0}
                                onPress={() => router.push('/(app)/work-order' as any)}
                                disabled={isWorkOrderDisabled}
                            />
                        </View>
                        
                        <View style={{ width: width }}>
                            <CanvasingCard
                                assigned={0} 
                                completed={0} 
                                onPress={() => router.push('/(app)/marketing/canvasing' as any)}
                                disabled={!hasFeature('m_canvasing')}
                            />
                        </View>
                    </ScrollView>

                    {/* Pagination Dots */}
                    <View style={tw`flex-row justify-center items-center mt-2 mb-4 space-x-2`}>
                        {[0, 1].map((index) => (
                            <View
                                key={index}
                                style={tw`h-2 rounded-full ${
                                    index === activeIndex 
                                        ? 'bg-blue-600 w-6' 
                                        : 'bg-gray-300 w-2'
                                }`}
                            />
                        ))}
                    </View>
                </View>

                {/* Performance Stats */}
                <PerformanceStats
                    title={activeIndex === 0 ? 'Tiket Selesai' : 'Kunjungan Selesai'}
                    today={activeIndex === 0 ? (stats?.woCompletedToday || 0) : 0}
                    week={activeIndex === 0 ? (stats?.woCompletedWeek || 0) : 0}
                    month={activeIndex === 0 ? (stats?.woCompletedMonth || 0) : 0}
                />

                {/* Quick Menu - Pass features for access control */}
                <QuickMenu features={profileData?.features || []} />

            </ScrollView>
        </SafeAreaView>
    );
}
