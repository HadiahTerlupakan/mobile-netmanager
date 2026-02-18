import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { ArrowLeft, Receipt, Router, AlertCircle, XCircle, CheckCircle, Tag } from 'lucide-react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  remainingAmount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  items: { description: string }[];
}

const fetchInvoices = async () => {
  const res = await api.get('/api/customer/invoices?limit=20');
  return res.data.invoices as Invoice[];
};

export default function CustomerTagihanScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'FAILED'>('ALL');
  
  // Payment State
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, amount: number } | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: fetchInvoices
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredInvoices = invoices?.filter(inv => {
    if (filter === 'ALL') return true;
    if (filter === 'PAID') return inv.status === 'PAID';
    if (filter === 'UNPAID') return ['SENT', 'OVERDUE'].includes(inv.status);
    if (filter === 'FAILED') return inv.status === 'VOID';
    return true;
  }) || [];

  const pendingInvoices = invoices?.filter(inv => ['SENT', 'OVERDUE'].includes(inv.status)) || [];
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  const nextDueDate = pendingInvoices.length > 0 
    ? pendingInvoices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate 
    : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID': return { label: 'Lunas', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
      case 'SENT': return { label: 'Belum Bayar', color: 'text-orange-600', bg: 'bg-orange-100', icon: Router };
      case 'OVERDUE': return { label: 'Terlambat', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle };
      default: return { label: status, color: 'text-gray-600', bg: 'bg-gray-100', icon: Receipt };
    }
  };

  const handleCheckCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setAppliedDiscount(null);

    try {
      const res = await api.post('/api/coupons/verify', {
        code: couponCode,
        amount: totalPending,
        pelangganId: 'CURRENT_USER' 
      });
      
      if (res.data.valid) {
        setAppliedDiscount({
          code: res.data.code,
          amount: res.data.discountAmount
        });
        Alert.alert('Sukses', 'Kupon berhasil digunakan!');
      } else {
        Alert.alert('Gagal', res.data.error || 'Kupon tidak valid');
      }
    } catch {
      Alert.alert('Error', 'Gagal memverifikasi kupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!pendingInvoices.length) return;
    setPaymentLoading(true);
    try {
      const res = await api.post('/api/customer/payments', {
        invoiceIds: pendingInvoices.map(inv => inv.id),
        couponCode: appliedDiscount?.code || null,
        paymentMethod: 'MANUAL',
        notes: 'Payment via Mobile App'
      });
      
      if (res.data.success) {
        Alert.alert('Berhasil', 'Pembayaran berhasil dibuat! Silakan konfirmasi ke admin.');
        refetch();
        setAppliedDiscount(null);
        setCouponCode('');
      } else {
        Alert.alert('Gagal', res.data.error || 'Gagal membuat pembayaran');
      }
    } catch {
      Alert.alert('Error', 'Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 border-b border-gray-100 flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={tw`text-lg font-bold text-gray-900`}>Tagihan & Pembayaran</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Info', 'Hubungi CS jika ada kendala pembayaran')}>
          <AlertCircle size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={tw`pb-24`}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#0d9488" />
        }
      >
        {/* Bill Summary Card */}
        <View style={tw`p-4`}>
          <View style={tw`bg-teal-600 rounded-2xl p-5 shadow-lg overflow-hidden relative`}>
            {/* Abstract Pattern */}
            <View style={tw`absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full`} />
            
            <View style={tw`flex-row justify-between items-start mb-4 relative z-10`}>
              <View>
                <Text style={tw`text-teal-100 text-sm font-medium mb-1`}>Total Tagihan Bulan Ini</Text>
                <Text style={tw`text-3xl font-bold text-white`}>
                  {formatCurrency(totalPending)}
                </Text>
                {nextDueDate ? (
                  <View style={tw`flex-row items-center mt-2`}>
                    <AlertCircle size={14} color="#ccfbf1" style={tw`mr-1`} />
                    <Text style={tw`text-teal-100 text-xs`}>
                      Jatuh tempo {dayjs(nextDueDate).format('D MMM YYYY')}
                    </Text>
                  </View>
                ) : (
                  <View style={tw`flex-row items-center mt-2`}>
                    <CheckCircle size={14} color="#ccfbf1" style={tw`mr-1`} />
                    <Text style={tw`text-teal-100 text-xs`}>
                      Tidak ada tagihan tertunggak
                    </Text>
                  </View>
                )}
              </View>
              <View style={tw`bg-white/20 p-2 rounded-lg`}>
                <Receipt size={24} color="white" />
              </View>
            </View>

            {/* Payment Actions */}
            {totalPending > 0 && (
              <View style={tw`mt-4 bg-white/10 rounded-xl p-3 border border-white/20`}>
                {/* Coupon */}
                <View style={tw`flex-row gap-2 mb-3`}>
                  <View style={tw`flex-1 bg-white/10 rounded-lg flex-row items-center px-3 border border-white/10`}>
                    <Tag size={16} color="white" />
                    <TextInput 
                      placeholder="KODE KUPON" 
                      placeholderTextColor="#ccfbf1"
                      style={tw`flex-1 text-white text-xs font-bold ml-2 py-2`}
                      value={couponCode}
                      onChangeText={text => setCouponCode(text.toUpperCase())}
                      editable={!appliedDiscount}
                    />
                  </View>
                  {appliedDiscount ? (
                    <TouchableOpacity 
                      onPress={() => { setAppliedDiscount(null); setCouponCode(''); }}
                      style={tw`bg-red-500/80 px-3 justify-center rounded-lg`}
                    >
                      <XCircle size={16} color="white" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      onPress={handleCheckCoupon}
                      disabled={couponLoading || !couponCode}
                      style={tw`bg-white px-4 justify-center rounded-lg ${!couponCode ? 'opacity-50' : ''}`}
                    >
                      <Text style={tw`text-teal-700 text-xs font-bold`}>
                        {couponLoading ? '...' : 'CEK'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {appliedDiscount && (
                  <View style={tw`flex-row justify-between mb-3 px-1`}>
                    <Text style={tw`text-teal-100 text-xs`}>Diskon</Text>
                    <Text style={tw`text-white text-xs font-bold`}>-{formatCurrency(appliedDiscount.amount)}</Text>
                  </View>
                )}

                {/* Pay Button */}
                <TouchableOpacity 
                  onPress={handlePayment}
                  disabled={paymentLoading}
                  style={tw`bg-white h-10 rounded-lg flex-row items-center justify-center gap-2`}
                >
                  {paymentLoading ? (
                    <ActivityIndicator color="#0d9488" size="small" />
                  ) : (
                    <>
                      <Text style={tw`text-teal-700 font-bold text-sm`}>Bayar Sekarang</Text>
                      <Text style={tw`text-teal-600 font-bold text-sm`}>
                        {formatCurrency(totalPending - (appliedDiscount?.amount || 0))}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* History List */}
        <View style={tw`px-4 pb-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>Riwayat Tagihan</Text>
          
          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 mb-4`}>
            {['ALL', 'UNPAID', 'PAID', 'FAILED'].map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f as any)}
                style={tw`px-4 py-1.5 rounded-full ${filter === f ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}
              >
                <Text style={tw`text-xs font-bold ${filter === f ? 'text-white' : 'text-gray-600'}`}>
                  {f === 'ALL' ? 'Semua' : f === 'UNPAID' ? 'Belum Bayar' : f === 'PAID' ? 'Lunas' : 'Gagal'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={tw`gap-3`}>
            {filteredInvoices.map((inv) => {
              const status = getStatusConfig(inv.status);
              const StatusIcon = status.icon;
              return (
                <View key={inv.id} style={tw`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-row items-center gap-3`}>
                  <View style={tw`w-10 h-10 rounded-full ${status.bg} items-center justify-center`}>
                    <StatusIcon size={20} style={tw`${status.color}`} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`font-bold text-gray-900 text-sm`}>
                      {inv.items[0]?.description || 'Tagihan Internet'}
                    </Text>
                    <Text style={tw`text-xs text-gray-500 mt-0.5`}>
                      #{inv.invoiceNumber} • {dayjs(inv.createdAt).format('D MMM YYYY')}
                    </Text>
                  </View>
                  <View style={tw`items-end`}>
                    <Text style={tw`font-bold text-gray-900 text-sm`}>{formatCurrency(inv.amount)}</Text>
                    <Text style={tw`text-[10px] font-bold ${status.color} mt-0.5`}>{status.label}</Text>
                  </View>
                </View>
              );
            })}
            
            {filteredInvoices.length === 0 && (
              <View style={tw`py-8 items-center`}>
                <Text style={tw`text-gray-400 text-sm`}>Tidak ada data tagihan</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
