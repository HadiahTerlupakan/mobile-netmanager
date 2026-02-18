import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { ArrowLeft, Wifi, Download, Upload, Calendar, Router, MapPin, CheckCircle } from 'lucide-react-native';

const fetchProfile = async () => {
  const res = await api.get('/api/customer/profile');
  return res.data.data?.profile || res.data.profile;
};

export default function CustomerPaketScreen() {
  const router = useRouter();
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['customer-profile-paket'],
    queryFn: fetchProfile
  });

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const isAktif = profile?.status === 'AKTIF';
  const paket = profile?.paket;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const getPeriodString = (jatuhTempo: string) => {
    if (!jatuhTempo) return '-';
    const due = new Date(jatuhTempo);
    const start = new Date(due);
    start.setMonth(start.getMonth() - 1);
    return `${start.toLocaleDateString('id-ID', { day: 'numeric' })} - ${due.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 border-b border-gray-100 flex-row items-center`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={tw`text-lg font-bold text-gray-900`}>Detail Layanan</Text>
      </View>

      <ScrollView
        contentContainerStyle={tw`p-4 pb-20`}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#0d9488" />
        }
      >
        {/* Hero Card */}
        <View style={tw`bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-4`}>
          <View style={tw`h-40 bg-teal-50 relative overflow-hidden`}>
            <View style={tw`absolute right-[-20] top-[-20] opacity-10`}>
              <Wifi size={180} color="#0d9488" />
            </View>
            <View style={tw`absolute bottom-4 left-4 z-10`}>
              <View style={tw`flex-row items-center gap-2 mb-2`}>
                <View style={tw`px-2 py-0.5 rounded-full flex-row items-center gap-1 ${isAktif ? 'bg-green-100' : 'bg-red-100'}`}>
                  <View style={tw`w-1.5 h-1.5 rounded-full ${isAktif ? 'bg-green-600' : 'bg-red-600'}`} />
                  <Text style={tw`text-xs font-bold ${isAktif ? 'text-green-700' : 'text-red-700'}`}>
                    {isAktif ? 'Aktif' : 'Non-Aktif'}
                  </Text>
                </View>
              </View>
              <Text style={tw`text-2xl font-bold text-gray-900`}>
                {paket?.nama || 'Belum Berlangganan'}
              </Text>
            </View>
          </View>

          <View style={tw`p-4 gap-4`}>
            <View style={tw`flex-row justify-between items-end border-b border-gray-100 pb-4`}>
              <View>
                <Text style={tw`text-gray-500 text-xs mb-1`}>Biaya Bulanan</Text>
                <Text style={tw`text-teal-600 text-xl font-bold`}>
                  {formatCurrency(paket?.harga || 0)}
                  <Text style={tw`text-xs font-normal text-gray-500 ml-1`}>/ bln</Text>
                </Text>
              </View>
              <View style={tw`items-end`}>
                <Text style={tw`text-gray-500 text-xs mb-1`}>Kuota</Text>
                <Text style={tw`font-bold text-gray-900`}>Unlimited Fiber</Text>
              </View>
            </View>

            {paket?.bandwidth && (
              <View style={tw`flex-row gap-4`}>
                <View style={tw`flex-1 flex-row items-center gap-3`}>
                  <View style={tw`w-10 h-10 rounded-full bg-teal-50 items-center justify-center`}>
                    <Download size={20} color="#0d9488" />
                  </View>
                  <View>
                    <Text style={tw`text-xs text-gray-500`}>Download</Text>
                    <Text style={tw`text-base font-bold text-gray-900`}>{paket.bandwidth.download}</Text>
                  </View>
                </View>
                <View style={tw`w-px bg-gray-100`} />
                <View style={tw`flex-1 flex-row items-center gap-3`}>
                  <View style={tw`w-10 h-10 rounded-full bg-purple-50 items-center justify-center`}>
                    <Upload size={20} color="#9333ea" />
                  </View>
                  <View>
                    <Text style={tw`text-xs text-gray-500`}>Upload</Text>
                    <Text style={tw`text-base font-bold text-gray-900`}>{paket.bandwidth.upload}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Detail Info */}
        <View style={tw`bg-white rounded-2xl shadow-sm p-5 border border-gray-100`}>
          <Text style={tw`text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider`}>Informasi Pelanggan</Text>
          
          <View style={tw`gap-5`}>
            <View style={tw`flex-row justify-between items-start`}>
              <View style={tw`flex-row items-center gap-3`}>
                <CheckCircle size={20} color="#9ca3af" />
                <Text style={tw`text-gray-500 text-sm`}>ID Pelanggan</Text>
              </View>
              <Text style={tw`text-gray-900 text-sm font-medium text-right`}>{profile?.idPelanggan}</Text>
            </View>
            <View style={tw`w-full h-px bg-gray-50`} />
            
            <View style={tw`flex-row justify-between items-start`}>
              <View style={tw`flex-row items-center gap-3`}>
                <Calendar size={20} color="#9ca3af" />
                <Text style={tw`text-gray-500 text-sm`}>Periode Tagihan</Text>
              </View>
              <Text style={tw`text-gray-900 text-sm font-medium text-right`}>
                {profile?.jatuhTempo ? getPeriodString(profile.jatuhTempo) : '-'}
              </Text>
            </View>
            <View style={tw`w-full h-px bg-gray-50`} />

            <View style={tw`flex-row justify-between items-start`}>
              <View style={tw`flex-row items-center gap-3`}>
                <Router size={20} color="#9ca3af" />
                <Text style={tw`text-gray-500 text-sm`}>Jenis IP Address</Text>
              </View>
              <Text style={tw`text-gray-900 text-sm font-medium text-right`}>Dynamic Public</Text>
            </View>
            <View style={tw`w-full h-px bg-gray-50`} />

            <View style={tw`flex-row justify-between items-start`}>
              <View style={tw`flex-row items-center gap-3`}>
                <MapPin size={20} color="#9ca3af" />
                <Text style={tw`text-gray-500 text-sm`}>Alamat Pemasangan</Text>
              </View>
              <Text style={tw`text-gray-900 text-sm font-medium text-right max-w-[50%]`}>{profile?.alamat}</Text>
            </View>
          </View>
        </View>

        {/* Promo */}
        <TouchableOpacity style={tw`mt-4 overflow-hidden rounded-xl bg-teal-700 p-4 shadow-lg`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <Text style={tw`text-xs font-medium text-teal-100`}>Rekomendasi untukmu</Text>
              <Text style={tw`text-lg font-bold text-white`}>Upgrade ke 200 Mbps?</Text>
              <Text style={tw`text-xs text-teal-100 mt-1`}>Hanya tambah Rp 50rb/bln</Text>
            </View>
            <View style={tw`bg-white/20 px-3 py-1.5 rounded-lg`}>
              <Text style={tw`text-xs font-bold text-white`}>Lihat</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
