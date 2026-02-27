import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { DashboardHeader } from '@/components/organisms/dashboard/DashboardHeader';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Activity, CheckCircle2, ClipboardList, MessageCircle, Timer } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

export function MitraTeknisiDashboardScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);

    // Mocking for now since MitraService/Wallet is not implemented
    const loadingStats = false;
    const requestData = { summary: { pendingCommission: 0, totalTickets: 0 } };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Simulation
        setTimeout(() => setRefreshing(false), 500);
    }, []);

    const renderTeknisiMetrics = () => {
        if (loadingStats) {
            return (
                <View style={tw`h-[200px] items-center justify-center`}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            );
        }

        const totalTickets = requestData?.summary?.totalTickets || 0;
        const pendingCommission = requestData?.summary?.pendingCommission || 0; // Still show them their pay

        return (
            <View style={[tw`mt-6 px-4 py-6 rounded-3xl bg-[#0f172a] shadow-lg`, styles.techCard]}>
                <View style={tw`flex-row justify-between items-start mb-6`}>
                    <View>
                        <Text style={tw`text-slate-400 text-sm font-medium mb-1`}>Status Lapangan</Text>
                        <View style={tw`flex-row items-center gap-2`}>
                            <View style={tw`w-3 h-3 rounded-full bg-emerald-500`} />
                            <Text style={tw`text-white text-2xl font-bold tracking-tight`}>Active Duty</Text>
                        </View>
                    </View>
                    <View style={tw`w-12 h-12 rounded-full bg-blue-500/15 items-center justify-center border border-blue-500/30`}>
                        <Activity size={24} color="#60a5fa" />
                    </View>
                </View>

                {/* Tech specific KPI split */}
                <View style={tw`flex-row bg-[#1e293b] rounded-2xl p-1 mb-6 border border-white/5`}>
                    <View style={tw`flex-1 items-center justify-center py-3 border-r border-white/10`}>
                        <Text style={tw`text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1`}>Tiket Selesai</Text>
                        <View style={tw`flex-row items-center gap-1.5`}>
                            <CheckCircle2 size={16} color="#4ade80" />
                            <Text style={tw`text-white font-bold text-lg`}>{totalTickets}</Text>
                        </View>
                    </View>
                    <View style={tw`flex-1 items-center justify-center py-3`}>
                        <Text style={tw`text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1`}>Menunggu</Text>
                        <View style={tw`flex-row items-center gap-1.5`}>
                            <Timer size={16} color="#fbbf24" />
                            <Text style={tw`text-white font-bold text-lg`}>0</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/mitra-wallet')}
                    style={tw`w-full bg-[#1e293b] border border-[#334155] rounded-xl py-4 flex-row justify-between items-center px-5 shadow-lg`}
                    activeOpacity={0.8}
                >
                    <View style={tw`flex-row items-center gap-3`}>
                        <View style={tw`bg-emerald-500/20 p-2 rounded-lg`}>
                            <Text style={tw`text-emerald-400 font-bold`}>Rp</Text>
                        </View>
                        <Text style={tw`text-slate-300 font-medium text-sm`}>Wallet Fee</Text>
                    </View>
                    <Text style={tw`text-white font-bold text-base`}>Cek Saldo ➔</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderActionGrid = () => (
        <View style={tw`mt-8`}>
            <Text style={tw`text-slate-800 text-lg font-bold mb-4 px-1`}>Menu Teknisi</Text>

            <View style={tw`flex-row flex-wrap justify-between`}>
                <TouchableOpacity
                    onPress={() => router.push('/work-order')}
                    style={[tw`w-[48%] bg-white rounded-3xl p-5 mb-4 border border-slate-100 items-center`, styles.gridItemShadow]}
                    activeOpacity={0.7}
                >
                    <View style={tw`w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-4`}>
                        <ClipboardList size={28} color="#3b82f6" />
                    </View>
                    <Text style={tw`text-slate-800 font-bold text-sm text-center mb-1`}>Work Orders</Text>
                    <Text style={tw`text-slate-400 text-xs text-center`}>Tugas Instalas & SPK</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/chat')}
                    style={[tw`w-[48%] bg-white rounded-3xl p-5 mb-4 border border-slate-100 items-center`, styles.gridItemShadow]}
                    activeOpacity={0.7}
                >
                    <View style={tw`w-14 h-14 rounded-2xl bg-purple-50 items-center justify-center mb-4`}>
                        <MessageCircle size={28} color="#a855f7" />
                    </View>
                    <Text style={tw`text-slate-800 font-bold text-sm text-center mb-1`}>Chat Admin</Text>
                    <Text style={tw`text-slate-400 text-xs text-center`}>Bantuan & Diskusi</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScreenErrorBoundary screenName="MitraTeknisiDashboard">
            <View style={[tw`flex-1 bg-slate-50`, { paddingTop: insets.top }]}>
                <DashboardHeader
                    userName={user?.name || "Mitra Teknisi"}
                    userImage={user?.image}
                />
                <ScrollView
                    style={tw`flex-1 px-5`}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
                    }
                >
                    {renderTeknisiMetrics()}
                    {renderActionGrid()}
                </ScrollView>
            </View>
        </ScreenErrorBoundary>
    );
}

const styles = StyleSheet.create({
    techCard: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 10,
    },
    gridItemShadow: {
        shadowColor: "#64748b",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    }
});
