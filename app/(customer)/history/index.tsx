import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { ArrowLeft, Search, Receipt, Router, AlertCircle, XCircle, CheckCircle } from 'lucide-react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number; // or string depending on API
  status: string; // 'PAID' | 'SENT' | 'OVERDUE' | 'VOID'
  items: Array<{ description: string }>;
  issueDate: string;
  dueDate: string;
}

const fetchHistory = async () => {
  const res = await api.get('/api/customer/invoices?limit=50');
  return res.data.invoices as Invoice[];
};

export default function CustomerHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ['customer-history'],
    queryFn: fetchHistory
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredInvoices = invoices?.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'ALL') return true;
    if (filter === 'SUCCESS') return inv.status === 'PAID';
    if (filter === 'PENDING') return ['SENT', 'OVERDUE'].includes(inv.status);
    if (filter === 'FAILED') return inv.status === 'VOID';
    return true;
  }) || [];

  // Group by Month
  const groupedInvoices = filteredInvoices.reduce((acc, inv) => {
    const date = dayjs(inv.issueDate);
    const monthYear = date.format('MMMM YYYY');
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(inv);
    return acc;
  }, {} as Record<string, Invoice[]>);

  const formatCurrency = (amount: number | string) => {
    const val = typeof amount === 'string' ? parseInt(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID':
        return { label: 'Lunas', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-100', badgeBg: 'bg-teal-100', badgeText: 'text-teal-700' };
      case 'SENT':
      case 'OVERDUE':
        return { label: 'Menunggu', icon: Router, color: 'text-orange-500', bg: 'bg-orange-100', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700' };
      default:
        return { label: 'Gagal', icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', badgeBg: 'bg-red-100', badgeText: 'text-red-700' };
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 border-b border-gray-100 flex-row items-center`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
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
            { id: 'FAILED', label: 'Gagal' },
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
      <ScrollView
        contentContainerStyle={tw`pb-20`}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#0d9488" />
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
              {items.map((invoice, idx) => {
                const config = getStatusConfig(invoice.status);
                const Icon = config.icon;
                
                return (
                  <TouchableOpacity
                    key={invoice.id}
                    style={tw`bg-white px-4 py-4 flex-row items-center border-b border-gray-100`}
                  >
                    <View style={tw`w-10 h-10 rounded-lg ${config.bg} items-center justify-center mr-3`}>
                      <Icon size={20} style={tw`${config.color}`} />
                    </View>
                    
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-sm font-bold text-gray-900 mb-0.5`}>
                        {invoice.items[0]?.description || 'Tagihan Layanan'}
                      </Text>
                      <Text style={tw`text-xs text-gray-500`}>
                        #{invoice.invoiceNumber} • {dayjs(invoice.issueDate).format('D MMM HH:mm')}
                      </Text>
                    </View>
                    
                    <View style={tw`items-end`}>
                      <Text style={tw`text-sm font-bold text-gray-900 mb-1`}>
                        {formatCurrency(invoice.totalAmount)}
                      </Text>
                      <View style={tw`px-2 py-0.5 rounded ${config.badgeBg}`}>
                        <Text style={tw`text-[10px] font-bold ${config.badgeText}`}>
                          {config.label}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
