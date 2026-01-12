import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import tw from 'twrnc';

interface Transaction {
    id: string;
    type: 'masuk' | 'keluar';
    barang: {
        kode: string;
        nama: string;
        satuan: string;
    };
    gudang: {
        nama: string;
    };
    jumlah: number;
    kondisi: string;
    keterangan: string | null;
    tanggal: string;
}

type FilterType = 'all' | 'masuk' | 'keluar';

export default function RiwayatBarangScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const { width } = useWindowDimensions();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');
    
    // Cursor for pagination (timestamp of last item)
    const nextCursorRef = useRef<string | null>(null);

    // Initial load
    useEffect(() => {
        fetchRiwayat(true);
    }, [filter]); // Re-fetch when filter changes

    const fetchRiwayat = async (isRefresh = false) => {
        if (!isRefresh && (!hasMore || loadingMore)) return;

        try {
            if (isRefresh) {
                setLoading(true);
                nextCursorRef.current = null;
            } else {
                setLoadingMore(true);
            }

            // Build Query Params
            const params = new URLSearchParams();
            params.append('type', filter);
            if (!isRefresh && nextCursorRef.current) {
                params.append('cursor', nextCursorRef.current);
            }

            const res = await axios.get(`${Config.API_URL}/api/mobile/inventory/riwayat?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newData = res.data?.data || [];
            const nextCursor = res.data?.nextCursor;

            if (isRefresh) {
                setTransactions(newData);
            } else {
                setTransactions(prev => [...prev, ...newData]);
            }

            nextCursorRef.current = nextCursor || null;
            setHasMore(!!nextCursor);

        } catch (error) {
            console.error('Failed to fetch riwayat:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRiwayat(true);
    };

    const onLoadMore = () => {
        if (hasMore && !loadingMore && !loading) {
            fetchRiwayat(false);
        }
    };

    // Memoized date formatter to avoid recreation
    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    const getStatusColor = (type: string) => {
        return type === 'masuk' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    };

    const getIcon = (type: string) => {
        return type === 'masuk' ? 'arrow-down-circle' : 'arrow-up-circle';
    };

    const filterButtons = useMemo(() => [
        { label: 'Semua', value: 'all' as const },
        { label: 'Masuk', value: 'masuk' as const },
        { label: 'Keluar', value: 'keluar' as const },
    ], []);

    // Render Item Component (Memoized for performance)
    const renderTransactionItem = useCallback(({ item }: { item: Transaction }) => (
        <View style={tw`bg-white p-4 rounded-xl border border-gray-100 mb-3 shadow-sm`}>
            <View style={tw`flex-row justify-between items-start mb-2`}>
                <View style={tw`flex-row items-center gap-2 flex-1`}>
                    <View style={tw`p-2 rounded-full ${item.type === 'masuk' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Ionicons 
                            name={getIcon(item.type)} 
                            size={20} 
                            color={item.type === 'masuk' ? '#16A34A' : '#DC2626'} 
                        />
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`font-bold text-gray-900 text-base`} numberOfLines={1}>
                            {item.barang.nama}
                        </Text>
                        <Text style={tw`text-xs text-gray-500 font-medium`}>
                            {item.barang.kode}
                        </Text>
                    </View>
                </View>
                <View style={tw`px-2 py-1 rounded-full ${getStatusColor(item.type)}`}>
                    <Text style={tw`text-xs font-bold capitalize`}>
                        {item.type}
                    </Text>
                </View>
            </View>

            <View style={tw`flex-row justify-between items-end mt-2 pt-2 border-t border-gray-50`}>
                <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center gap-1 mb-1`}>
                        <Ionicons name="business-outline" size={12} color="#6B7280" />
                        <Text style={tw`text-xs text-gray-500`}>{item.gudang.nama}</Text>
                    </View>
                    <View style={tw`flex-row items-center gap-1`}>
                        <Ionicons name="time-outline" size={12} color="#6B7280" />
                        <Text style={tw`text-xs text-gray-500`}>{formatDate(item.tanggal)}</Text>
                    </View>
                </View>
                <View style={tw`items-end`}>
                    <Text style={tw`text-lg font-bold text-gray-900`}>
                        {item.jumlah} <Text style={tw`text-sm font-normal text-gray-500`}>{item.barang.satuan}</Text>
                    </Text>
                    {item.kondisi !== 'BARU' && (
                        <Text style={tw`text-xs text-orange-600 font-medium`}>{item.kondisi}</Text>
                    )}
                </View>
            </View>
        </View>
    ), [formatDate]);

    const ListFooterComponent = useMemo(() => {
        if (!loadingMore) return <View style={tw`h-6`} />;
        return (
            <View style={tw`py-4 items-center`}>
                <ActivityIndicator size="small" color="#3B82F6" />
            </View>
        );
    }, [loadingMore]);

    const EmptyComponent = useMemo(() => (
        <View style={tw`py-12 items-center`}>
             <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
             <Text style={tw`text-gray-500 mt-2`}>Belum ada transaksi</Text>
        </View>
    ), []);

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={tw`bg-white border-b border-gray-200 pt-12 pb-2`}>
                <View style={tw`flex-row items-center justify-between px-4 mb-4`}>
                    <TouchableOpacity 
                        onPress={() => router.back()}
                        style={tw`w-8 h-8 items-center justify-center rounded-full bg-gray-50`}
                    >
                        <Ionicons name="arrow-back" size={20} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900`}>Riwayat Transaksi</Text>
                    <View style={tw`w-8`} />
                </View>

                {/* Filter Tabs */}
                <View style={tw`flex-row px-4 pb-3 gap-2`}>
                    {filterButtons.map((btn) => (
                        <TouchableOpacity
                            key={btn.value}
                            onPress={() => setFilter(btn.value)}
                            style={tw`flex-1 py-2 px-3 rounded-lg ${filter === btn.value ? 'bg-blue-600' : 'bg-gray-100'}`}
                        >
                            <Text style={tw`text-sm font-semibold text-center ${filter === btn.value ? 'text-white' : 'text-gray-600'}`}>
                                {btn.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={tw`text-gray-500 mt-4`}>Memuat riwayat...</Text>
                </View>
            ) : (
                <View style={tw`flex-1 px-4`}>
                    <FlashList
                        data={transactions}
                        renderItem={renderTransactionItem}
                        estimatedItemSize={140}
                        onEndReached={onLoadMore}
                        onEndReachedThreshold={0.5}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={EmptyComponent}
                        ListFooterComponent={ListFooterComponent}
                        contentContainerStyle={tw`py-4`}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            )}
        </View>
    );
}
