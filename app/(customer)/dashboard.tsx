import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { DashboardHeader } from '@/components/organisms/dashboard/DashboardHeader';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowRight, CheckCircle, FileText, Headset, History, Receipt, Rocket, Router, Zap } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface Invoice {
  id: string;
  status: string;
  remainingAmount: string;
  dueDate: string;
}

const fetchDashboardData = async () => {
  const [profileRes, usageRes, invoicesRes] = await Promise.all([
    api.get('/api/customer/profile'),
    api.get('/api/customer/usage'),
    api.get('/api/customer/invoices?limit=20'),
  ]);

  const profile = profileRes.data.data?.profile || profileRes.data.profile;
  const connection = usageRes.data.data?.connection || usageRes.data.connection;
  const invoices = invoicesRes.data.invoices || [];

  const pendingInvoices = invoices.filter(
    (inv: Invoice) => inv.status === 'SENT' || inv.status === 'OVERDUE'
  );

  const firstDue = pendingInvoices.length > 0 ? pendingInvoices[0].dueDate : null;
  const totalAmount = pendingInvoices.reduce((sum: number, inv: Invoice) => sum + parseInt(inv.remainingAmount), 0);

  return {
    profile,
    connection,
    pendingInvoice: pendingInvoices.length > 0 ? {
      count: pendingInvoices.length,
      totalAmount,
      dueDate: firstDue
    } : null,
  };
};

export default function CustomerDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customer-dashboard-full'],
    queryFn: fetchDashboardData,
    enabled: !!user // Only run if user exists
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const isOnline = data?.connection?.isOnline ?? false;
  const packageName = data?.profile?.paket?.nama || 'Belum berlangganan';
  const speed = data?.profile?.paket?.bandwidth?.download || '0 Mbps';

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header */}
      <DashboardHeader
        userName={user?.name || ''}
        userImage={user?.image}
        notificationCount={0}
        onNotificationPress={() => { }}
        onProfilePress={() => router.push('/(customer)/profile')}
      />

      <ScrollView
        contentContainerStyle={tw`pb-24`}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} tintColor="#0d9488" />
        }
      >
        {/* Greeting Section */}
        <View style={tw`px-6 pt-6 pb-2`}>
          <Text style={tw`text-sm font-medium text-gray-500`}>Selamat datang kembali,</Text>
          <Text style={tw`text-2xl font-bold text-gray-900`}>{data?.profile?.nama || user?.name}</Text>
        </View>

        {/* Service Status Card */}
        <View style={tw`px-4 mt-2`}>
          <View style={tw`bg-white rounded-xl p-5 shadow-sm border border-gray-100`}>
            <View style={tw`flex-row items-start mb-4`}>
              <View style={tw`w-12 h-12 rounded-xl bg-teal-50 items-center justify-center mr-4`}>
                <Router size={24} color="#0d9488" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-lg font-bold text-gray-900`}>Internet Rumah</Text>
                <Text style={tw`text-sm text-gray-500 mt-0.5`}>{packageName}</Text>

                <View style={tw`flex-row items-center mt-2`}>
                  <View
                    style={tw`w-2.5 h-2.5 mr-2 relative`}
                    accessibilityLabel={isOnline ? "Status koneksi: aktif" : "Status koneksi: offline"}
                  >
                    <View style={tw`absolute inset-0 rounded-full opacity-75 ${isOnline ? 'bg-green-400 animate-ping' : 'bg-red-400'}`} />
                    <View style={tw`absolute inset-0 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  </View>
                  <Text style={tw`text-xs font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Aktif & Stabil' : 'Gangguan / Offline'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={tw`flex-row gap-3 mt-2`}>
              <View style={tw`flex-1 bg-gray-50 p-3 rounded-lg`}>
                <Text style={tw`text-xs text-gray-500 mb-1`}>Kecepatan</Text>
                <View style={tw`flex-row items-center`}>
                  <Zap size={16} color="#0d9488" style={tw`mr-1.5`} />
                  <Text style={tw`font-bold text-sm text-gray-900`}>{speed}</Text>
                </View>
              </View>
              <View style={tw`flex-1 bg-gray-50 p-3 rounded-lg`}>
                <Text style={tw`text-xs text-gray-500 mb-1`}>Status Perangkat</Text>
                <View style={tw`flex-row items-center`}>
                  <CheckCircle size={16} color="#0d9488" style={tw`mr-1.5`} />
                  <Text style={tw`font-bold text-sm text-gray-900`}>Normal</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Billing Card - Gradient */}
        <View style={tw`px-4 mt-4`}>
          <View style={tw`rounded-xl overflow-hidden shadow-lg`}>
            {/* Gradient Background simulation with solid color fallback */}
            <View style={tw`bg-teal-700 p-5 relative`}>
              {/* Decorative Blur Circle */}
              <View style={tw`absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white opacity-10`} />

              <View style={tw`flex-row justify-between items-start mb-4`}>
                <View>
                  <Text style={tw`text-teal-100 text-sm font-medium mb-1`}>Tagihan Bulan Ini</Text>
                  <Text style={tw`text-3xl font-bold text-white`}>
                    Rp {(data?.pendingInvoice?.totalAmount || 0).toLocaleString('id-ID')}
                  </Text>
                </View>
                <View style={tw`p-2 bg-white/20 rounded-lg`}>
                  <Receipt size={20} color="white" />
                </View>
              </View>

              <View style={tw`flex-row items-center mb-4`}>
                <View style={tw`w-2 h-2 rounded-full mr-2 ${data?.pendingInvoice ? 'bg-orange-400' : 'bg-green-400'}`} />
                <Text style={tw`text-sm font-medium text-teal-50`}>
                  {data?.pendingInvoice?.dueDate
                    ? `Jatuh tempo: ${new Date(data.pendingInvoice.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : 'Tagihan Lunas'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(customer)/tagihan')} // Fixed route
                style={tw`w-full bg-white py-3 px-4 rounded-lg flex-row items-center justify-center`}
              >
                <Text style={tw`text-teal-700 font-bold text-sm mr-2`}>
                  {data?.pendingInvoice ? 'Bayar Sekarang' : 'Lihat Riwayat'}
                </Text>
                <ArrowRight size={16} color="#0f766e" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Menu Grid */}
        <View style={tw`px-6 mt-6`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>Menu Cepat</Text>
          <View style={tw`flex-row flex-wrap justify-between`}>
            {/* Detail Layanan */}
            <TouchableOpacity
              onPress={() => router.push('/(customer)/paket')}
              style={tw`w-[48%] bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3`}
              accessibilityRole="button"
              accessibilityLabel="Detail Layanan - Info Paket"
            >
              <View style={tw`w-10 h-10 rounded-lg bg-teal-50 items-center justify-center mb-3`}>
                <FileText size={24} color="#0d9488" />
              </View>
              <Text style={tw`text-sm font-bold text-gray-900`}>Detail Layanan</Text>
              <Text style={tw`text-xs text-gray-500 mt-1`}>Info Paket</Text>
            </TouchableOpacity>

            {/* Dukungan */}
            <TouchableOpacity
              onPress={() => router.push('/(customer)/tickets')}
              style={tw`w-[48%] bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3`}
              accessibilityRole="button"
              accessibilityLabel="Dukungan - Bantuan Live"
            >
              <View style={tw`w-10 h-10 rounded-lg bg-orange-50 items-center justify-center mb-3`}>
                <Headset size={24} color="#ea580c" />
              </View>
              <Text style={tw`text-sm font-bold text-gray-900`}>Dukungan</Text>
              <Text style={tw`text-xs text-gray-500 mt-1`}>Bantuan Live</Text>
            </TouchableOpacity>

            {/* Riwayat */}
            <TouchableOpacity
              onPress={() => router.push('/(customer)/riwayat')}
              style={tw`w-[48%] bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3`}
              accessibilityRole="button"
              accessibilityLabel="Riwayat - Transaksi"
            >
              <View style={tw`w-10 h-10 rounded-lg bg-purple-50 items-center justify-center mb-3`}>
                <History size={24} color="#9333ea" />
              </View>
              <Text style={tw`text-sm font-bold text-gray-900`}>Riwayat</Text>
              <Text style={tw`text-xs text-gray-500 mt-1`}>Transaksi</Text>
            </TouchableOpacity>

            {/* Upgrade */}
            <TouchableOpacity
              style={tw`w-[48%] bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3`}
              accessibilityRole="button"
              accessibilityLabel="Upgrade paket - segera hadir"
              accessibilityState={{ disabled: true }}
            >
              <View style={tw`w-10 h-10 rounded-lg bg-green-50 items-center justify-center mb-3`}>
                <Rocket size={24} color="#16a34a" />
              </View>
              <Text style={tw`text-sm font-bold text-gray-900`}>Upgrade</Text>
              <Text style={tw`text-xs text-gray-500 mt-1`}>Tambah Kecepatan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Promo Banner */}
        <View style={tw`px-4 mt-2`}>
          <View style={tw`w-full h-32 rounded-xl overflow-hidden shadow-sm relative bg-gray-900`}>
            {/* Mock Image Background */}
            <ImageWithCache
              source="https://lh3.googleusercontent.com/aida-public/AB6AXuA15sXp8rqLYcVDOrCKu93aWPbXbK7RDttRr972e0Gtiwn2EHLcm8OjpyKoPeDOvTPBiekfaLCq-P5K1cVT6O0iHqw5aQSy5rF8Cojl9TdUIpN1I8Hl0sp59oXpEr-MqGUyBK3Rl7P_p2LirA_P55s8kEARxQJJj6tUwuCXeMn26F8d5HUHXaFD4MQfwjNN9vkFRatq5AWYzPpnVyMg-HfMinvCR6myFP4epTz0IK477pT6CQR4aJZX26e65VrY4xtTqq7RIg6xs7I"
              style={tw`absolute inset-0 w-full h-full opacity-60`}
              contentFit="cover"
            />
            <View style={tw`absolute inset-0 bg-black/40`} />
            <View style={tw`relative z-10 p-5 h-full justify-center`}>
              <View style={tw`bg-teal-600 px-2 py-0.5 rounded self-start mb-2`}>
                <Text style={tw`text-white text-xs font-bold`}>PROMO</Text>
              </View>
              <Text style={tw`text-white font-bold text-lg`}>Diskon 20% Add-on TV</Text>
              <Text style={tw`text-gray-300 text-xs mt-1`}>Nikmati channel premium bulan ini.</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
