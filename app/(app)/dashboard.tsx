import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
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
}

export default function Dashboard() {
    const { user, token } = useAuth();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    
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

    // Fetch user profile for image
    const { data: profileData, refetch: refetchProfile } = useOfflineQuery({
        key: 'user_profile',
        fetcher: async () => {
            const res = await axios.get(`${Config.API_URL}/api/mobile/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data?.data as UserProfile;
        },
        enabled: !!token
    });

    const stats = statsData || null;

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

                {/* Work Order Card */}
                <WorkOrderCard
                    assigned={stats?.workOrdersAssigned || 0}
                    pending={stats?.workOrdersPending || 0}
                    onPress={() => router.push('/(app)/work-order' as any)}
                />

                {/* Performance Stats */}
                <PerformanceStats
                    today={stats?.woCompletedToday || 0}
                    week={stats?.woCompletedWeek || 0}
                    month={stats?.woCompletedMonth || 0}
                />

                {/* Quick Menu */}
                <QuickMenu />

            </ScrollView>
        </SafeAreaView>
    );
}
