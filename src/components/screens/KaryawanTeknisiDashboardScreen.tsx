import { DashboardSkeleton } from '@/components/molecules/DashboardSkeleton';
import { BerandaModeCuti } from '@/components/organisms/dashboard/BerandaModeCuti';
import { CanvasingCard } from '@/components/organisms/dashboard/CanvasingCard';
import { DashboardHeader } from '@/components/organisms/dashboard/DashboardHeader';
import { KartuPencairanCanvasing } from '@/components/organisms/dashboard/KartuPencairanCanvasing';
import { PerformanceStats } from '@/components/organisms/dashboard/PerformanceStats';
import { QuickMenu } from '@/components/organisms/dashboard/QuickMenu';
import { WorkOrderCard } from '@/components/organisms/dashboard/WorkOrderCard';
import { useAuth } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/queries';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useStatistikBeranda } from '@/hooks/useStatistikBeranda';
import { queryKeys } from '@/lib/queryClient';
import { TenantService } from '@/services/TenantService';
import { presentInfoMessage } from '@/utils/errorPresenter';
import { isPersonaMitra, tentukanPersona } from '@/utils/persona';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { Href, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, useWindowDimensions, View, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

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

/** Beranda teknisi karyawan (dan bawaan saat user belum dimuat): karusel WO/canvasing, statistik, menu cepat. */
export function KaryawanTeknisiDashboardScreen() {
    const { user, token } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [refreshing, setRefreshing] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const { profileData, hasFeature, refetch: refetchProfile, isPending: loadingProfile } = useProfileSync();

    const { data: statsData, isPending: loadingStats, refetch: refetchStats } = useStatistikBeranda();

    // Fetch canvasing summary
    const { data: canvasingSummary, isPending: loadingCanvasing, refetch: refetchCanvasing } = useOfflineQuery<CanvasingSummary>({
        queryKey: queryKeys.canvasing.summary(),
        endpoint: '/api/marketing/canvasing/summary',
        select: (data: any) => data?.data || data,
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
            presentInfoMessage('Fitur ini hanya dapat diakses oleh Sales yang aktif.', 'Akses Terbatas');
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
                    completed: canvasingSummary?.completedToday || 0
                }
            });
        }
        if (items.length === 0) {
            items.push({ type: 'empty' });
        }
        return items;
    }, [hasWorkOrder, hasCanvasing, statsData, canvasingSummary]);

    const renderCarouselItem: ListRenderItem<CarouselItem> = useCallback(({ item }: { item: CarouselItem }) => {
        const containerStyle = { width };

        let content: React.ReactNode;
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

    const getImageUrl = useCallback((path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;

        // Ensure proper slash handling
        const baseUrl = TenantService.getTenantUrl().replace(/\/$/, '');
        const imagePath = path.startsWith('/') ? path : `/${path}`;

        // Double check to prevent http duplication if path already contains full url but wasn't caught by startsWith check
        if (imagePath.includes('http')) return path;

        return `${baseUrl}${imagePath}`;
    }, []);

    // Memoize header props
    const headerProps = useMemo(() => ({
        userName: profileData?.name || user?.name || 'Karyawan',
        userImage: getImageUrl(profileData?.image)
    }), [getImageUrl, profileData?.name, user?.name, profileData?.image]);

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

    if (user?.isOnLeave) {
        return <BerandaModeCuti userName={headerProps.userName} userImage={headerProps.userImage} />;
    }

    const currentItem = carouselData[activeIndex];

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={tw`flex-1 bg-gray-50`}>
            <DashboardHeader
                userName={headerProps.userName}
                userImage={headerProps.userImage}
            />

            <ScrollView
                contentContainerStyle={tw`pb-4 pt-4`}
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
                    />

                    {carouselData.length > 1 && (
                        <View style={tw`flex-row justify-center items-center mt-2 mb-4 gap-2`}>
                            {carouselData.map((carouselItem, index) => (
                                <View
                                    key={carouselItem.type}
                                    style={tw`h-2 rounded-full ${index === activeIndex
                                        ? 'bg-blue-600 w-6'
                                        : 'bg-gray-300 w-2'
                                        }`}
                                    accessibilityLabel={`Halaman ${index + 1}`}
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
                    <>
                        <PerformanceStats
                            title="Canvasing Selesai"
                            today={canvasingStatsProps.today}
                            week={canvasingStatsProps.week}
                            month={canvasingStatsProps.month}
                        />

                        {user?.isSales && (
                            <KartuPencairanCanvasing statistik={statsData} onBerhasilCair={refetchStats} />
                        )}
                    </>
                )}

                <QuickMenu
                    features={profileData?.features || user?.features || []}
                    isSales={user?.isSales ?? false}
                    role={user?.role}
                    isMitra={isPersonaMitra(tentukanPersona(user))}
                />
            </ScrollView>
        </SafeAreaView>
    );
}
