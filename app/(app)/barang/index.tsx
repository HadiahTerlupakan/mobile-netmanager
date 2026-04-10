
import { BarangIndexSkeleton } from '@/components/molecules/BarangIndexSkeleton';
import { useAuth } from '@/context/AuthContext';
import { useSocketEvent } from '@/context/SocketContext';
import { Ionicons } from '@expo/vector-icons';
import { useApiQuery } from '@/hooks/queries';
import { useRouter } from 'expo-router';
import { useCallback, useState, ComponentProps } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { queryKeys } from '@/lib/queryClient';
import { logger } from '@/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { AppFeature } from '@/constants/features';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface DashboardStats {
    barangMasukToday: number;
    barangKeluarToday: number;
}

interface MenuItem {
    id: string;
    title: string;
    subtitle: string;
    icon: IoniconName;
    color: string;
    bgColor: string;
    route: any;
}

export default function BarangIndexScreen() {
  useFeatureGuard(AppFeature.BARANG);
    const router = useRouter();
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);

    // Use dashboard.stats() query key to share cache with dashboard screen
    // This prevents duplicate API calls when navigating between screens
    const { data: stats, isPending, refetch } = useApiQuery<DashboardStats>({
        queryKey: queryKeys.dashboard.stats(),
        endpoint: '/api/mobile/dashboard',
        select: (data: any) => ({
            barangMasukToday: data.barangMasukToday || 0,
            barangKeluarToday: data.barangKeluarToday || 0
        }),
        enabled: !!token,
    });

    // Real-time updates via WebSocket
    useSocketEvent<{ type: 'masuk' | 'keluar' }>('inventory.update', useCallback((data) => {
        logger.socket('Real-time inventory update received:', data);
        // Update the shared dashboard.stats() cache
        queryClient.setQueryData<any>(queryKeys.dashboard.stats(), (prev: any) => {
            if (!prev) return prev;
            return {
                ...prev,
                barangMasukToday: data.type === 'masuk' ? (prev.barangMasukToday || 0) + 1 : prev.barangMasukToday,
                barangKeluarToday: data.type === 'keluar' ? (prev.barangKeluarToday || 0) + 1 : prev.barangKeluarToday
            };
        });
    }, [queryClient]));

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const menuItems: MenuItem[] = [
        {
            id: 'masuk',
            title: 'Barang Masuk',
            subtitle: 'Catat penerimaan stok baru',
            icon: 'arrow-down-circle',
            color: '#3B82F6',
            bgColor: '#EFF6FF',
            route: '/barang/masuk'
        },
        {
            id: 'keluar',
            title: 'Barang Keluar',
            subtitle: 'Input pengiriman barang',
            icon: 'arrow-up-circle',
            color: '#14B8A6',
            bgColor: '#F0FDFA',
            route: '/barang/keluar'
        },
        {
            id: 'riwayat',
            title: 'Riwayat Transaksi',
            subtitle: 'Lihat log aktivitas stok',
            icon: 'document-text',
            color: '#8B5CF6',
            bgColor: '#F5F3FF',
            route: '/barang/riwayat'
        }
    ];

    if (isPending && !stats) {
        return <BarangIndexSkeleton />;
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-4 border-b border-gray-100`}>
                <View style={tw`flex-row items-center justify-between`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900`}>Daftar Barang</Text>
                    <View style={tw`w-8`} />
                </View>
            </View>

            <ScrollView
                style={tw`flex-1`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={tw`p-4`}>
                    {/* Description */}
                    <Text style={tw`text-sm text-gray-500 mb-4`}>
                        Kelola stok barang masuk, keluar, dan lihat riwayat transaksi.
                    </Text>

                    {/* Menu Cards */}
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={tw`bg-white rounded-xl p-4 mb-3 flex-row items-center border border-gray-100 shadow-sm`}
                            onPress={() => router.push(item.route)}
                            activeOpacity={0.7}
                        >
                            <View style={[tw`w-14 h-14 rounded-lg items-center justify-center`, { backgroundColor: item.bgColor }]}>
                                <Ionicons name={item.icon} size={28} color={item.color} />
                            </View>
                            <View style={tw`flex-1 ml-4`}>
                                <Text style={tw`text-base font-bold text-gray-900`}>{item.title}</Text>
                                <Text style={tw`text-sm text-gray-500`}>{item.subtitle}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    ))}

                    {/* Quick Stats */}
                    <Text style={tw`text-sm font-semibold text-gray-900 mt-6 mb-3`}>Status Hari Ini</Text>
                    <View style={tw`flex-row gap-3`}>
                        <View style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100`}>
                            <Text style={tw`text-xs text-gray-500`}>Total Masuk</Text>
                            <Text style={tw`text-xl font-bold text-green-500 mt-1`}>
                                +{stats?.barangMasukToday || 0}
                            </Text>
                        </View>
                        <View style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100`}>
                            <Text style={tw`text-xs text-gray-500`}>Total Keluar</Text>
                            <Text style={tw`text-xl font-bold text-red-500 mt-1`}>
                                -{stats?.barangKeluarToday || 0}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
