import { useAuth } from '@/context/AuthContext';
import { useInfiniteQuery } from '@/hooks/queries';
import api from '@/services/api';
import { useRouter } from 'expo-router';
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, TrendingUp, Wallet } from 'lucide-react-native';
import React from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface WalletData {
    balance: {
        balance: number;
        totalEarnings: number;
        totalWithdrawn: number;
    };
    transactions: {
        transactions: Transaction[];
        total: number;
    };
}

interface Transaction {
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function MitraWalletScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const {
        data: pages,
        isPending: loading,
        isRefetching: refreshing,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage: loadingMore,
    } = useInfiniteQuery<WalletData>({
        queryKey: ['mitra', 'wallet'],
        queryFn: ({ pageParam }) =>
            api.get(`/api/mobile/mitra/wallet?page=${pageParam}`).then((res) => res.data.data),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((n, p) => n + p.transactions.transactions.length, 0);
            return loaded < lastPage.transactions.total ? allPages.length + 1 : undefined;
        },
    });

    // Rekonstruksi bentuk lama agar JSX di bawah tidak berubah (balance dari page
    // pertama, transaksi digabung antar-page — sama seperti merge manual dulu).
    const data: WalletData | null = pages
        ? {
            balance: pages.pages[0].balance,
            transactions: {
                transactions: pages.pages.flatMap((p) => p.transactions.transactions),
                total: pages.pages[0].transactions.total,
            },
        }
        : null;

    const onRefresh = () => refetch();

    const isMitraTeknisi = user?.employeeType === 'MITRA_TEKNISI';

    if (loading) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50 items-center justify-center`}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={tw`text-gray-500 mt-3`}>Memuat wallet...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={tw`pb-6`}
            >
                {/* Header */}
                <View style={tw`px-5 pt-4 pb-6 bg-white`}>
                    <Text style={tw`text-xl font-bold text-gray-900`}>Wallet Saya</Text>
                    <Text style={tw`text-sm text-gray-500 mt-1`}>
                        {isMitraTeknisi ? 'Mitra Teknisi' : 'Mitra Sales'}
                    </Text>
                </View>

                {/* Balance Card */}
                <View style={tw`mx-4 -mt-2 rounded-2xl bg-blue-600 p-6 shadow-lg`}>
                    <View style={tw`flex-row items-center mb-2`}>
                        <Wallet size={20} color="white" />
                        <Text style={tw`text-white text-sm ml-2 opacity-80`}>Saldo Tersedia</Text>
                    </View>
                    <Text style={tw`text-white text-3xl font-bold`}>
                        {formatCurrency(data?.balance?.balance || 0)}
                    </Text>

                    <View style={tw`flex-row mt-4 gap-4`}>
                        <View style={tw`flex-1 bg-white/15 rounded-xl p-3`}>
                            <View style={tw`flex-row items-center mb-1`}>
                                <ArrowDownCircle size={14} color="white" />
                                <Text style={tw`text-white text-xs ml-1 opacity-80`}>Total Earning</Text>
                            </View>
                            <Text style={tw`text-white text-sm font-bold`}>
                                {formatCurrency(data?.balance?.totalEarnings || 0)}
                            </Text>
                        </View>
                        <View style={tw`flex-1 bg-white/15 rounded-xl p-3`}>
                            <View style={tw`flex-row items-center mb-1`}>
                                <ArrowUpCircle size={14} color="white" />
                                <Text style={tw`text-white text-xs ml-1 opacity-80`}>Total WD</Text>
                            </View>
                            <Text style={tw`text-white text-sm font-bold`}>
                                {formatCurrency(data?.balance?.totalWithdrawn || 0)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Button */}
                <View style={tw`mx-4 mt-4`}>
                    <TouchableOpacity
                        style={tw`bg-green-600 rounded-xl py-3.5 flex-row items-center justify-center shadow-sm`}
                        onPress={() => router.push('/mitra-withdraw')}
                    >
                        <ArrowUpCircle size={20} color="white" />
                        <Text style={tw`text-white font-bold ml-2 text-base`}>Tarik Saldo</Text>
                    </TouchableOpacity>
                </View>

                {/* Transactions */}
                <View style={tw`mx-4 mt-6`}>
                    <View style={tw`flex-row items-center justify-between mb-3`}>
                        <Text style={tw`text-lg font-bold text-gray-900`}>Riwayat Transaksi</Text>
                        <Text style={tw`text-sm text-gray-500`}>
                            {data?.transactions?.total || 0} transaksi
                        </Text>
                    </View>

                    {(!data?.transactions?.transactions || data.transactions.transactions.length === 0) ? (
                        <View style={tw`bg-white rounded-xl p-8 items-center`}>
                            <TrendingUp size={40} color="#9ca3af" />
                            <Text style={tw`text-gray-400 mt-3 text-center`}>Belum ada transaksi</Text>
                        </View>
                    ) : (
                        <View style={tw`bg-white rounded-xl overflow-hidden`}>
                            {data.transactions.transactions.map((tx, index) => (
                                <View
                                    key={tx.id}
                                    style={tw`px-4 py-3 flex-row items-center justify-between ${index < data.transactions.transactions.length - 1 ? 'border-b border-gray-100' : ''
                                        }`}
                                >
                                    <View style={tw`flex-1 mr-3`}>
                                        <Text style={tw`text-sm font-medium text-gray-900`} numberOfLines={1}>
                                            {tx.description}
                                        </Text>
                                        <Text style={tw`text-xs text-gray-500 mt-0.5`}>
                                            {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    </View>
                                    <Text
                                        style={tw`text-sm font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                    >
                                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                    </Text>
                                </View>
                            ))}

                            {hasNextPage && (
                                <TouchableOpacity
                                    style={tw`px-4 py-3 flex-row items-center justify-center border-t border-gray-100`}
                                    onPress={() => fetchNextPage()}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? (
                                        <ActivityIndicator size="small" color="#2563eb" />
                                    ) : (
                                        <>
                                            <Text style={tw`text-sm text-blue-600 font-medium`}>Muat Lebih Banyak</Text>
                                            <ChevronRight size={16} color="#2563eb" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
