import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { DashboardSkeleton } from '@/components/molecules/DashboardSkeleton';
import { useAuth } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/queries';
import { useProfileSync } from '@/hooks/useProfileSync';
import { queryKeys } from '@/lib/queryClient';
import { TenantService } from '@/services/TenantService';
import { Href, useRouter } from 'expo-router';
import {
    Briefcase,
    CalendarCheck,
    ChevronRight,
    ClipboardList,
    MapPin,
    TrendingUp,
    Wallet
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

// Define stats interface based on what the API returns
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
    completedToday: number;
    completedMonth: number;
    pending: number;
}

function MitraDashboardScreenContent() {
    const { user, token } = useAuth();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const { profileData, hasFeature, refetch: refetchProfile, isPending: loadingProfile } = useProfileSync();

    // Fetch dashboard stats
    const { data: statsData, isPending: loadingStats, refetch: refetchStats } = useOfflineQuery<DashboardStats>({
        queryKey: queryKeys.dashboard.stats(),
        endpoint: '/api/mobile/dashboard',
        enabled: !!token
    });

    // Fetch canvasing summary
    const { data: canvasingSummary, refetch: refetchCanvasing } = useOfflineQuery<CanvasingSummary>({
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

    const isLoading = (loadingStats && !statsData) || (loadingProfile && !profileData);

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const baseUrl = TenantService.getTenantUrl().replace(/\/$/, '');
        const imagePath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${imagePath}`;
    };

    if (isLoading) return <DashboardSkeleton />;

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Custom Modern Header */}
            <View style={tw`flex-row items-center justify-between px-5 pt-2 pb-4`}>
                <View>
                    <Text style={tw`text-sm font-medium text-slate-500 mb-1`}>Halo Mitra,</Text>
                    <Text style={tw`text-2xl font-black text-slate-900`}>{profileData?.name || user?.name || 'User'}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(app)/profile' as Href)}>
                    {getImageUrl(profileData?.image || user?.image) ? (
                        <View style={tw`w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500`}>
                            <Image source={{ uri: getImageUrl(profileData?.image || user?.image)! }} style={tw`w-full h-full`} resizeMode="cover" />
                        </View>
                    ) : (
                        <View style={tw`w-12 h-12 rounded-full bg-slate-200 items-center justify-center border-2 border-slate-300`}>
                            <Text style={tw`text-lg font-bold text-slate-600`}>{(profileData?.name || 'M').charAt(0)}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`pb-20`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
            >
                {/* Premium Wallet / Earning Card */}
                <View style={tw`px-5 py-2`}>
                    <View style={tw`bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden`}>
                        {/* Decorative Background Elements */}
                        <View style={tw`absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl`} />
                        <View style={tw`absolute -left-10 -bottom-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl`} />

                        <View style={tw`flex-row justify-between items-start mb-6 z-10`}>
                            <View>
                                <Text style={tw`text-slate-400 text-sm font-medium mb-1`}>Estimasi Pendapatan</Text>
                                <View style={tw`flex-row items-end gap-2`}>
                                    <Text style={tw`text-slate-100 text-3xl font-black tracking-tight`}>Rp -</Text>
                                    <Text style={tw`text-slate-400 text-xs font-semibold pb-1.5`}>/bln ini</Text>
                                </View>
                            </View>
                            <View style={tw`bg-slate-800/80 p-3 rounded-2xl border border-slate-700`}>
                                <Wallet size={24} color="#a5b4fc" />
                            </View>
                        </View>

                        <View style={tw`flex-row bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 z-10`}>
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-slate-400 text-xs font-medium mb-1`}>Tiket Diselesaikan</Text>
                                <Text style={tw`text-indigo-300 text-lg font-bold`}>{statsData?.woCompletedMonth || 0}</Text>
                            </View>
                            <View style={tw`w-[1px] bg-slate-700 mx-4`} />
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-slate-400 text-xs font-medium mb-1`}>Canvasing Sukses</Text>
                                <Text style={tw`text-emerald-300 text-lg font-bold`}>{canvasingSummary?.completedMonth || 0}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={tw`mt-5 bg-indigo-600 rounded-xl py-3.5 items-center justify-center flex-row gap-2`}
                            onPress={() => router.push('/(app)/mitra-wallet' as any)}
                        >
                            <Text style={tw`text-white font-bold text-sm tracking-wide`}>Tarik Saldo Komisi</Text>
                            <ChevronRight size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Actions Panel */}
                <View style={tw`px-5 mt-6`}>
                    <Text style={tw`text-lg font-bold text-slate-800 mb-4`}>Menu Operasional</Text>
                    <View style={tw`flex-row flex-wrap justify-between gap-y-4`}>
                        {hasWorkOrder && (
                            <TouchableOpacity
                                onPress={() => router.push('/(app)/work-order' as Href)}
                                style={tw`w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-slate-100 items-center justify-center`}
                            >
                                <View style={tw`w-12 h-12 bg-sky-50 rounded-full items-center justify-center mb-3`}>
                                    <ClipboardList size={22} color="#0284c7" />
                                </View>
                                <Text style={tw`font-bold text-slate-700`}>Work Orders</Text>
                                <Text style={tw`text-xs text-slate-400 text-center mt-1`}>{statsData?.workOrdersPending || 0} Tiket Menunggu</Text>
                            </TouchableOpacity>
                        )}

                        {hasCanvasing && (
                            <TouchableOpacity
                                onPress={() => router.push('/(app)/marketing/canvasing' as Href)}
                                style={tw`w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-slate-100 items-center justify-center`}
                            >
                                <View style={tw`w-12 h-12 bg-emerald-50 rounded-full items-center justify-center mb-3`}>
                                    <TrendingUp size={22} color="#059669" />
                                </View>
                                <Text style={tw`font-bold text-slate-700`}>Canvasing</Text>
                                <Text style={tw`text-xs text-slate-400 text-center mt-1`}>{canvasingSummary?.completedToday || 0} Selesai Hari Ini</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={() => router.push('/(app)/topology-map' as Href)}
                            style={tw`w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-slate-100 items-center justify-center`}
                        >
                            <View style={tw`w-12 h-12 bg-amber-50 rounded-full items-center justify-center mb-3`}>
                                <MapPin size={22} color="#d97706" />
                            </View>
                            <Text style={tw`font-bold text-slate-700`}>Peta Jaringan</Text>
                            <Text style={tw`text-xs text-slate-400 text-center mt-1`}>Cek Coverage</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/(app)/chat' as Href)}
                            style={tw`w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-slate-100 items-center justify-center`}
                        >
                            <View style={tw`w-12 h-12 bg-purple-50 rounded-full items-center justify-center mb-3`}>
                                <Briefcase size={22} color="#7e22ce" />
                            </View>
                            <Text style={tw`font-bold text-slate-700`}>Tim Support</Text>
                            <Text style={tw`text-xs text-slate-400 text-center mt-1`}>Tanya & Bantuan</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Performance Summary */}
                <View style={tw`px-5 mt-8`}>
                    <View style={tw`flex-row items-center justify-between mb-4`}>
                        <Text style={tw`text-lg font-bold text-slate-800`}>Ringkasan Performa</Text>
                    </View>

                    <View style={tw`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm gap-4`}>
                        {hasWorkOrder && (
                            <View style={tw`flex-row items-center gap-4`}>
                                <View style={tw`w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center`}>
                                    <CalendarCheck size={18} color="#2563eb" />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-sm font-bold text-slate-700 mb-0.5`}>WO Selesai Hari Ini</Text>
                                    <Text style={tw`text-xs text-slate-500`}>Meningkatkan estimasi komisi Anda</Text>
                                </View>
                                <Text style={tw`text-xl font-black text-blue-600`}>{statsData?.woCompletedToday || 0}</Text>
                            </View>
                        )}

                        {hasWorkOrder && hasCanvasing && <View style={tw`h-[1px] bg-slate-100 my-1`} />}

                        {hasCanvasing && (
                            <View style={tw`flex-row items-center gap-4`}>
                                <View style={tw`w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center`}>
                                    <TrendingUp size={18} color="#059669" />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-sm font-bold text-slate-700 mb-0.5`}>Canvasing Selesai Hari Ini</Text>
                                    <Text style={tw`text-xs text-slate-500`}>Aktivitas promosi & sales</Text>
                                </View>
                                <Text style={tw`text-xl font-black text-emerald-600`}>{canvasingSummary?.completedToday || 0}</Text>
                            </View>
                        )}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

export function MitraDashboardScreen() {
    return (
        <ScreenErrorBoundary screenName="MitraDashboard">
            <MitraDashboardScreenContent />
        </ScreenErrorBoundary>
    );
}

export default MitraDashboardScreen;
