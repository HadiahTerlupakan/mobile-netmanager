import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { DashboardHeader } from '@/components/organisms/dashboard/DashboardHeader';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { CreditCard, MapPin, Search, Target, TrendingUp } from 'lucide-react-native';
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

export function MitraSalesDashboardScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);

    // Mocking for now since MitraService/Wallet is not implemented yet
    const loadingStats = false;
    const commissionData = { summary: { pendingCommission: 0, totalCanvasing: 0 } };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Simulation
        setTimeout(() => setRefreshing(false), 500);
    }, []);

    const formatCurrency = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

    const renderSalesMetrics = () => {
        if (loadingStats) {
            return (
                <View style={tw`h-[200px] items-center justify-center`}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            );
        }

        const pendingCommission = commissionData?.summary?.pendingCommission || 0;
        const totalSuccessful = commissionData?.summary?.totalCanvasing || 0; // Or specific sales metric

        return (
            <View style={[tw`mt-6 px-4 py-6 rounded-3xl bg-[#1e1e24] shadow-lg`, styles.premiumCard]}>
                <View style={tw`flex-row justify-between items-start mb-6`}>
                    <View>
                        <Text style={tw`text-slate-400 text-sm font-medium mb-1`}>Estimasi Pendapatan Sales</Text>
                        <View style={tw`flex-row items-end gap-1`}>
                            <Text style={tw`text-white text-3xl font-bold tracking-tight`}>
                                {formatCurrency(pendingCommission)}
                            </Text>
                            <Text style={tw`text-slate-500 text-sm font-medium mb-1.5`}>/bln ini</Text>
                        </View>
                    </View>
                    <View style={tw`w-12 h-12 rounded-full bg-emerald-500/15 items-center justify-center border border-emerald-500/30`}>
                        <TrendingUp size={24} color="#34d399" />
                    </View>
                </View>

                {/* Sales specific KPI split */}
                <View style={tw`flex-row bg-[#2a2a30] rounded-2xl p-1 mb-6 border border-white/5`}>
                    <View style={tw`flex-1 items-center justify-center py-3 border-r border-white/10`}>
                        <Text style={tw`text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1`}>Target Harian</Text>
                        <View style={tw`flex-row items-center gap-1.5`}>
                            <Target size={16} color="#fbbf24" />
                            <Text style={tw`text-white font-bold text-lg`}>5</Text>
                        </View>
                    </View>
                    <View style={tw`flex-1 items-center justify-center py-3`}>
                        <Text style={tw`text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1`}>Sukses Closing</Text>
                        <Text style={tw`text-emerald-400 font-bold text-lg`}>{totalSuccessful}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/mitra-wallet')}
                    style={tw`w-full bg-emerald-600 rounded-xl py-4 flex-row justify-center items-center gap-2 shadow-lg`}
                    activeOpacity={0.8}
                >
                    <CreditCard size={20} color="white" />
                    <Text style={tw`text-white font-bold text-base`}>Cairkan Komisi</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderActionGrid = () => (
        <View style={tw`mt-8`}>
            <Text style={tw`text-slate-800 text-lg font-bold mb-4 px-1`}>Menu Operasional Sales</Text>

            <View style={tw`flex-row flex-wrap justify-between`}>
                <TouchableOpacity
                    onPress={() => router.push('/marketing/canvasing')}
                    style={[tw`w-[48%] bg-white rounded-3xl p-5 mb-4 border border-slate-100 items-center`, styles.gridItemShadow]}
                    activeOpacity={0.7}
                >
                    <View style={tw`w-14 h-14 rounded-2xl bg-indigo-50 items-center justify-center mb-4`}>
                        <Search size={28} color="#6366f1" />
                    </View>
                    <Text style={tw`text-slate-800 font-bold text-sm text-center mb-1`}>Canvasing Baru</Text>
                    <Text style={tw`text-slate-400 text-xs text-center`}>Cari pelanggan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => { }}
                    style={[tw`w-[48%] bg-white rounded-3xl p-5 mb-4 border border-slate-100 items-center`, styles.gridItemShadow]}
                    activeOpacity={0.7}
                >
                    <View style={tw`w-14 h-14 rounded-2xl bg-amber-50 items-center justify-center mb-4`}>
                        <MapPin size={28} color="#f59e0b" />
                    </View>
                    <Text style={tw`text-slate-800 font-bold text-sm text-center mb-1`}>Peta Jangkauan</Text>
                    <Text style={tw`text-slate-400 text-xs text-center`}>Cek coverage ODP</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScreenErrorBoundary screenName="MitraSalesDashboard">
            <View style={[tw`flex-1 bg-slate-50`, { paddingTop: insets.top }]}>
                <DashboardHeader
                    userName={user?.name || "Mitra Sales"}
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
                    {renderSalesMetrics()}
                    {renderActionGrid()}
                </ScrollView>
            </View>
        </ScreenErrorBoundary>
    );
}

const styles = StyleSheet.create({
    premiumCard: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    gridItemShadow: {
        shadowColor: "#64748b",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    }
});
