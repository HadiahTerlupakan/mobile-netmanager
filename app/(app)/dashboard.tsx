import { useOfflineQueryCompat as useOfflineQuery } from '@/hooks/queries';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { CanvasingCard } from '@/components/dashboard/CanvasingCard';
import { DashboardHeader } from '@/components/dashboard/Header';
import { PerformanceStats } from '@/components/dashboard/PerformanceStats';
import { QuickMenu } from '@/components/dashboard/QuickMenu';
import { WorkOrderCard } from '@/components/dashboard/WorkOrderCard';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

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

interface CanvasingSummary {
    total: number;
    woStartedToday: number;
    completedToday: number;
    completedWeek: number;
    completedMonth: number;
    pending: number;
    approved: number;
    rejected: number;
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

    // Fetch canvasing summary
    const { data: canvasingSummary, refetch: refetchCanvasing } = useOfflineQuery({
        key: 'canvasing_summary',
        fetcher: async () => {
            const res = await axios.get(`${Config.API_URL}/api/marketing/canvasing/summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data as CanvasingSummary;
        },
        enabled: !!token
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

    const hasWorkOrder = hasFeature('m_work_order');
    const hasCanvasing = hasFeature('m_canvasing');

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetch(), refetchProfile(), refetchCanvasing()]);
        setRefreshing(false);
    }, [refetch, refetchProfile, refetchCanvasing]);

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

                {/* Cards Carousel - Show only accessible cards */}
                {(() => {
                    const cards = [];
                    if (hasWorkOrder) {
                        cards.push(
                            <View key="wo" style={{ width: width }}>
                                <WorkOrderCard
                                    assigned={stats?.workOrdersAssigned || 0}
                                    pending={stats?.workOrdersPending || 0}
                                    onPress={() => router.push('/(app)/work-order' as any)}
                                    disabled={false}
                                />
                            </View>
                        );
                    }
                    if (hasCanvasing) {
                        cards.push(
                            <View key="canvasing" style={{ width: width }}>
                                <CanvasingCard
                                    assigned={canvasingSummary?.approved || 0} 
                                    completed={canvasingSummary?.woStartedToday || 0} 
                                    onPress={() => {
                                        // Strict Sales Check
                                        if (!user?.isSales) {
                                            Alert.alert(
                                                'Akses Terbatas',
                                                'Fitur ini hanya dapat diakses oleh Sales yang aktif.',
                                                [{ text: 'OK' }]
                                            );
                                            return;
                                        }
                                        router.push('/(app)/marketing/canvasing' as any);
                                    }}
                                    disabled={false}
                                />
                            </View>
                        );
                    }
                    // Fallback if no cards accessible
                    if (cards.length === 0) {
                        cards.push(
                            <View key="no-access" style={{ width: width }}>
                                <View style={tw`mx-4 bg-gray-100 rounded-2xl p-6 items-center`}>
                                    <Text style={tw`text-gray-500`}>Tidak ada modul aktif</Text>
                                </View>
                            </View>
                        );
                    }
                    return (
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
                                {cards}
                            </ScrollView>

                            {/* Pagination Dots - Only show if more than 1 card */}
                            {cards.length > 1 && (
                                <View style={tw`flex-row justify-center items-center mt-2 mb-4 gap-2`}>
                                    {cards.map((_, index) => (
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
                            )}
                        </View>
                    );
                })()}

                {/* Performance Stats - Show based on active card considering access */}
                {(() => {
                    // Determine which card is currently showing based on access and index
                    // If only WO: activeIndex=0 shows WO
                    // If only Canvasing: activeIndex=0 shows Canvasing (WO not in list)
                    // If both: activeIndex=0 shows WO, activeIndex=1 shows Canvasing
                    const isShowingWO = hasWorkOrder && activeIndex === 0;
                    const isShowingCanvasing = hasCanvasing && (
                        (!hasWorkOrder && activeIndex === 0) || // Only canvasing card exists
                        (hasWorkOrder && activeIndex === 1)      // Both exist, canvasing is second
                    );
                    
                    if (isShowingWO) {
                        return (
                            <PerformanceStats
                                title="Tiket Selesai"
                                today={stats?.woCompletedToday || 0}
                                week={stats?.woCompletedWeek || 0}
                                month={stats?.woCompletedMonth || 0}
                            />
                        );
                    } else if (isShowingCanvasing) {
                        return (
                            <PerformanceStats
                                title="Canvasing Selesai"
                                today={canvasingSummary?.completedToday || 0}
                                week={canvasingSummary?.completedWeek || 0}
                                month={canvasingSummary?.completedMonth || 0}
                            />
                        );
                    }
                    return null; // No cards
                })()}

                {/* Quick Menu - Pass features for access control */}
                <QuickMenu features={profileData?.features || []} isSales={user?.isSales ?? false} />

            </ScrollView>
        </SafeAreaView>
    );
}
