import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { ArrowLeft, Search, Receipt } from 'lucide-react-native';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { BarisRiwayatTagihan } from '@/components/organisms/tagihan/BarisRiwayatTagihan';
import type { TagihanPelanggan } from '@/types/portalPelanggan';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { ambilMuatan } from '@/utils/responsPelanggan';
import { isTagihanDibatalkan, isTagihanTerutang, labelStatusTagihan, statusTampilTagihan } from '@/utils/statusTagihanPelanggan';

dayjs.locale('id');

const fetchHistory = async () => {
  const res = await api.get('/api/customer/invoices?limit=50');
  return ambilMuatan<TagihanPelanggan[]>(res.data, 'invoices') ?? [];
};

export default function CustomerHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: invoices, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['customer-history'],
    queryFn: fetchHistory
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Tagihan bisa dilunasi atau terbit selama layar ini tertutup.
  useFocusEffect(onRefresh);

  const filteredInvoices = invoices?.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const status = statusTampilTagihan(inv);
    if (filter === 'ALL') return true;
    if (filter === 'SUCCESS') return status === 'PAID';
    if (filter === 'PENDING') return isTagihanTerutang(status);
    if (filter === 'CANCELLED') return isTagihanDibatalkan(status);
    return true;
  }) || [];

  // Group by Month
  const groupedInvoices = filteredInvoices.reduce((acc, inv) => {
    const date = dayjs(inv.issueDate);
    const monthYear = date.format('MMMM YYYY');
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(inv);
    return acc;
  }, {} as Record<string, TagihanPelanggan[]>);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 border-b border-gray-100 flex-row items-center`}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={tw`mr-3`}>
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={tw`text-lg font-bold text-gray-900`}>Riwayat Transaksi</Text>
      </View>

      {/* Search & Filter */}
      <View style={tw`bg-white px-4 py-3 border-b border-gray-100`}>
        <View style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mb-3`}>
          <Search size={20} color="#9ca3af" />
          <TextInput
            style={tw`flex-1 ml-2 text-gray-900`}
            placeholder="Cari ID Tagihan..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2`}>
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'SUCCESS', label: 'Berhasil' },
            { id: 'PENDING', label: 'Menunggu' },
            { id: 'CANCELLED', label: labelStatusTagihan('CANCELLED') },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setFilter(item.id as any)}
              style={tw`px-4 py-1.5 rounded-full ${filter === item.id ? 'bg-teal-600' : 'bg-gray-100'}`}
            >
              <Text style={tw`text-xs font-bold ${filter === item.id ? 'text-white' : 'text-gray-600'}`}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {isError ? (
        <QueryErrorState onRetry={refetch} />
      ) : (
      <ScrollView
        contentContainerStyle={tw`pb-20`}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} tintColor="#0d9488" />
        }
      >
        {isLoading && !invoices ? (
          <View style={tw`py-10`}>
            <ActivityIndicator size="large" color="#0d9488" />
          </View>
        ) : Object.keys(groupedInvoices).length === 0 ? (
          <View style={tw`items-center justify-center py-10`}>
            <Receipt size={48} color="#d1d5db" />
            <Text style={tw`text-gray-500 mt-4 text-center`}>Belum ada riwayat transaksi</Text>
          </View>
        ) : (
          Object.entries(groupedInvoices).map(([month, items]) => (
            <View key={month}>
              <Text style={tw`px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 uppercase tracking-wider`}>
                {month}
              </Text>
              {items.map((invoice) => (
                <BarisRiwayatTagihan key={invoice.id} tagihan={invoice} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}
