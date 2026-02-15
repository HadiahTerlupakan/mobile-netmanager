import { DashboardSkeleton } from '@/components/molecules/DashboardSkeleton';
import { CanvasingCard } from '@/components/organisms/dashboard/CanvasingCard';
import { DashboardHeader } from '@/components/organisms/dashboard/DashboardHeader';
import { PerformanceStats } from '@/components/organisms/dashboard/PerformanceStats';
import { QuickMenu } from '@/components/organisms/dashboard/QuickMenu';
import { WorkOrderCard } from '@/components/organisms/dashboard/WorkOrderCard';
import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { TenantService } from '@/services/TenantService';
import { useAuth } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/queries';
import { useProfileSync } from '@/hooks/useProfileSync';
import { queryKeys } from '@/lib/queryClient';
import { FlashList } from '@shopify/flash-list';
import { Href, useRouter } from 'expo-router';
import { Clock, MessageCircle } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ListRenderItem, RefreshControl, ScrollView, Text, TouchableOpacity, useWindowDimensions, View, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

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

type CarouselItem =
    | { type: 'wo'; data: { assigned: number; pending: number } }
    | { type: 'canvasing'; data: { assigned: number; completed: number } }
    | { type: 'empty' };

function DashboardScreen() {
    const { user, token } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [refreshing, setRefreshing] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const { profileData, hasFeature, refetch: refetchProfile, isPending: loadingProfile } = useProfileSync();

    // Fetch dashboard stats
    const { data: statsData, isPending: loadingStats, refetch: refetchStats } = useOfflineQuery<DashboardStats>({
        queryKey: queryKeys.dashboard.stats(),
        endpoint: '/api/mobile/dashboard',
        enabled: !!token
    });

    // Fetch canvasing summary
    const { data: canvasingSummary, isPending: loadingCanvasing, refetch: refetchCanvasing } = useOfflineQuery<CanvasingSummary>({
        queryKey: queryKeys.canvasing.summary(),
        endpoint: '/api/marketing/canvasing/summary',
        enabled: !!token
    });

    const hasWorkOrder = hasFeature('m_work_order');
    const hasCanvasing = hasFeature('m_canvasing');

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchStats(), refetchProfile(), refetchCanvasing()]);
        setRefreshing(false);
    }, [refetchStats, refetchProfile, refetchCanvasing]);

    const handleWorkOrderPress = useCallback(() => {
        router.push('/(app)/work-order' as Href);
    }, [router]);

    const handleCanvasingPress = useCallback(() => {
        if (!user?.isSales) {
            Alert.alert(
                'Akses Terbatas',
                'Fitur ini hanya dapat diakses oleh Sales yang aktif.',
                [{ text: 'OK' }]
            );
            return;
        }
        router.push('/(app)/marketing/canvasing' as Href);
    }, [user?.isSales, router]);

    const carouselData = useMemo<CarouselItem[]>(() => {
        const items: CarouselItem[] = [];
        if (hasWorkOrder) {
            items.push({
                type: 'wo',
                data: {
                    assigned: statsData?.workOrdersAssigned || 0,
                    pending: statsData?.workOrdersPending || 0
                }
            });
        }
        if (hasCanvasing) {
            items.push({
                type: 'canvasing',
                data: {
                    assigned: canvasingSummary?.approved || 0,
                    completed: canvasingSummary?.woStartedToday || 0
                }
            });
        }
        if (items.length === 0) {
            items.push({ type: 'empty' });
        }
        return items;
    }, [hasWorkOrder, hasCanvasing, statsData, canvasingSummary]);

    const renderCarouselItem: ListRenderItem<CarouselItem> = useCallback(({ item }) => {
        const containerStyle = { width };
        
        let content;
        if (item.type === 'wo') {
            content = (
                <WorkOrderCard
                    assigned={item.data.assigned}
                    pending={item.data.pending}
                    onPress={handleWorkOrderPress}
                    disabled={false}
                />
            );
        } else if (item.type === 'canvasing') {
            content = (
                <CanvasingCard
                    assigned={item.data.assigned}
                    completed={item.data.completed}
                    onPress={handleCanvasingPress}
                    disabled={false}
                />
            );
        } else {
            content = (
                <View style={tw`mx-4 bg-gray-100 rounded-2xl p-6 items-center`}>
                    <Text style={tw`text-gray-500`}>Tidak ada modul aktif</Text>
                </View>
            );
        }

        return <View style={containerStyle}>{content}</View>;
    }, [width, handleWorkOrderPress, handleCanvasingPress]);

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index ?? 0);
        }
    }, []);

    const viewabilityConfig = useMemo(() => ({
        itemVisiblePercentThreshold: 50
    }), []);

    const isLoading =
        (loadingStats && !statsData) ||
        (loadingProfile && !profileData) ||
        (hasCanvasing && loadingCanvasing && !canvasingSummary);

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;

        // Ensure proper slash handling
        const baseUrl = TenantService.getTenantUrl().replace(/\/$/, '');
        const imagePath = path.startsWith('/') ? path : `/${path}`;

        // Double check to prevent http duplication if path already contains full url but wasn't caught by startsWith check
        if (imagePath.includes('http')) return path;

        return `${baseUrl}${imagePath}`;
    };

    // Memoize header props
    const headerProps = useMemo(() => ({
        userName: profileData?.name || user?.name || 'Karyawan',
        userImage: getImageUrl(profileData?.image)
    }), [profileData?.name, user?.name, profileData?.image]);

    // Memoize performance stats props to avoid re-renders when other data changes
    const woStatsProps = useMemo(() => ({
        today: statsData?.woCompletedToday || 0,
        week: statsData?.woCompletedWeek || 0,
        month: statsData?.woCompletedMonth || 0
    }), [statsData?.woCompletedToday, statsData?.woCompletedWeek, statsData?.woCompletedMonth]);

    const canvasingStatsProps = useMemo(() => ({
        today: canvasingSummary?.completedToday || 0,
        week: canvasingSummary?.completedWeek || 0,
        month: canvasingSummary?.completedMonth || 0
    }), [canvasingSummary?.completedToday, canvasingSummary?.completedWeek, canvasingSummary?.completedMonth]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    // Check if user is on leave
    if (user?.isOnLeave) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50`}>
                <DashboardHeader
                    userName={profileData?.name || user?.name || 'Karyawan'}
                    userImage={getImageUrl(profileData?.image)}
                />
                
                <View style={tw`flex-1 items-center justify-center p-6`}>
                    <View style={tw`w-24 h-24 bg-yellow-100 rounded-full items-center justify-center mb-6`}>
                        <Clock size={48} color="#ca8a04" />
                    </View>
                    <Text style={tw`text-xl font-bold text-gray-900 text-center mb-2`}>
                        Mode Cuti Aktif
                    </Text>
                    <Text style={tw`text-gray-500 text-center mb-8`}>
                        Anda sedang dalam masa cuti/izin. Akses fitur dibatasi untuk kenyamanan istirahat Anda.
                    </Text>
                    
                    <TouchableOpacity
                        onPress={() => router.push('/(app)/chat' as Href)}
                        style={tw`bg-purple-600 w-full py-4 rounded-xl flex-row items-center justify-center gap-2`}
                    >
                        <MessageCircle size={24} color="white" />
                        <Text style={tw`text-white font-bold text-lg`}>Buka Chat</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const currentItem = carouselData[activeIndex];

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            <DashboardHeader
                userName={headerProps.userName}
                userImage={headerProps.userImage}
            />

            <ScrollView
                contentContainerStyle={tw`pb-10 pt-4`}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={tw`px-4 pb-4`}>
                    <Text style={tw`text-sm font-medium text-gray-500`}>Selamat datang,</Text>
                    <Text style={tw`text-2xl font-bold text-gray-900`}>{profileData?.name || user?.name || 'User'}</Text>
                </View>

                <View>
                    <FlashList
                        data={carouselData}
                        keyExtractor={(item: CarouselItem) => item.type}
                        renderItem={renderCarouselItem}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={width}
                        snapToAlignment="center"
                        decelerationRate="fast"
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        estimatedItemSize={width}
                    />

                    {carouselData.length > 1 && (
                        <View style={tw`flex-row justify-center items-center mt-2 mb-4 gap-2`}>
                            {carouselData.map((_, index) => (
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

                {currentItem?.type === 'wo' && (
                    <PerformanceStats
                        title="Tiket Selesai"
                        today={woStatsProps.today}
                        week={woStatsProps.week}
                        month={woStatsProps.month}
                    />
                )}
                {currentItem?.type === 'canvasing' && (
                    <PerformanceStats
                        title="Canvasing Selesai"
                        today={canvasingStatsProps.today}
                        week={canvasingStatsProps.week}
                        month={canvasingStatsProps.month}
                    />
                )}

                <QuickMenu features={profileData?.features || user?.features || []} isSales={user?.isSales ?? false} role={user?.role} />
            </ScrollView>
        </SafeAreaView>
    );
}

export default function Dashboard() {
    return (
        <ScreenErrorBoundary screenName="Dashboard">
            <DashboardScreen />
        </ScreenErrorBoundary>
    );
}
