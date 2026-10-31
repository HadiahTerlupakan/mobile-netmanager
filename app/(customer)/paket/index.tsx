import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { ArrowLeft, Wifi, Download, Upload, Calendar, Router, MapPin, CheckCircle, Rocket, ChevronRight } from 'lucide-react-native';
import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { statusPelanggan } from '@/constants/pelanggan';
import { usePemakaianPelanggan } from '@/hooks/queries/usePemakaianPelanggan';
import { labelAlamatIp } from '@/utils/alamatIpPelanggan';
import { ALASAN_UPGRADE_BUTUH_AKTIF, isBolehAjukanUpgrade } from '@/utils/paketPelanggan';
import { periodeTagihan } from '@/utils/periodeTagihan';

const fetchProfile = async () => {
  const res = await api.get('/api/customer/profile');
  return res.data.data?.profile || res.data.profile;
};

export default function CustomerPaketScreen() {
  const router = useRouter();
  const { data: profile, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['customer-profile-paket'],
    queryFn: fetchProfile
  });
  const { data: pemakaian, refetch: refetchPemakaian } = usePemakaianPelanggan();

  const onRefresh = React.useCallback(() => {
    refetch();
    refetchPemakaian();
  }, [refetch, refetchPemakaian]);

  // Tab tetap terpasang: status yang diubah admin harus terbaca saat tab dibuka lagi.
  useFocusEffect(onRefresh);

  const isBolehUpgrade = isBolehAjukanUpgrade(profile?.status);
  const paket = profile?.paket;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
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

      {isError ? (
        <QueryErrorState onRetry={refetch} />
      ) : (
      <ScrollView
        contentContainerStyle={tw`p-4 pb-20`}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} tintColor="#0d9488" />
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
                {profile?.status ? <LencanaStatus status={statusPelanggan(profile.status)} /> : null}
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
                {periodeTagihan(profile?.jatuhTempo)}
              </Text>
            </View>
            <View style={tw`w-full h-px bg-gray-50`} />

            <View style={tw`flex-row justify-between items-start`}>
              <View style={tw`flex-row items-center gap-3`}>
                <Router size={20} color="#9ca3af" />
                <Text style={tw`text-gray-500 text-sm`}>Jenis IP Address</Text>
              </View>
              <Text style={tw`text-gray-900 text-sm font-medium text-right`}>{labelAlamatIp(pemakaian?.connection)}</Text>
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

        {/* Tanpa angka di sini: harga & kecepatan pilihan upgrade hanya
            ditampilkan layar Upgrade, yang membacanya dari server. */}
        <TouchableOpacity
          onPress={() => router.push('/(customer)/upgrade-paket')}
          disabled={!isBolehUpgrade}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isBolehUpgrade }}
          style={tw`mt-4 rounded-2xl p-4 flex-row items-center ${isBolehUpgrade ? 'bg-teal-600' : 'bg-gray-400'}`}
        >
          <Rocket size={22} color="white" />
          <View style={tw`flex-1 ml-3`}>
            <Text style={tw`text-white font-bold text-base`}>Upgrade Paket</Text>
            <Text style={tw`text-white/80 text-xs mt-0.5`}>
              {isBolehUpgrade ? 'Lihat paket yang tersedia di lokasi Anda' : ALASAN_UPGRADE_BUTUH_AKTIF}
            </Text>
          </View>
          <ChevronRight size={20} color="white" />
        </TouchableOpacity>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}
