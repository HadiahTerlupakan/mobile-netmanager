import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, RefreshCw, Download, Upload, Activity, Lightbulb } from 'lucide-react-native';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { usePemakaianPelanggan } from '@/hooks/queries/usePemakaianPelanggan';

export default function CustomerConnectionScreen() {
  const router = useRouter();
  const { data, isLoading, isError, isFetching, refetch } = usePemakaianPelanggan();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Tab tetap terpasang: sesi yang putus atau tersambung lagi harus terbaca saat tab dibuka.
  useFocusEffect(onRefresh);

  const connection = data?.connection;
  const pemakaian = data?.pemakaianBulanIni;
  const isOnline = connection?.isOnline ?? false;
  const ipAddress = connection?.ipAddress ?? '-';
  const uptime = connection?.sessionDurationFormatted ?? '0j 0m';
  const kartuPemakaian = [
    { label: 'Unduh', Ikon: Download, nilai: pemakaian?.download.formatted },
    { label: 'Unggah', Ikon: Upload, nilai: pemakaian?.upload.formatted },
    { label: 'Total', Ikon: Activity, nilai: pemakaian?.total.formatted },
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 border-b border-gray-100 flex-row items-center justify-between`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`w-10 h-10 items-center justify-center rounded-full bg-gray-50`}>
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={tw`text-lg font-bold text-gray-900`}>Status Koneksi</Text>
        <TouchableOpacity onPress={onRefresh} style={tw`w-10 h-10 items-center justify-center rounded-full bg-gray-50`}>
          <RefreshCw size={20} color="#1f2937" />
        </TouchableOpacity>
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
        {/* Status Card */}
        <View style={tw`bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-4`}>
          <View style={tw`h-32 bg-teal-50 relative overflow-hidden`}>
            {/* Background Pattern */}
            <View style={tw`absolute inset-0 opacity-10 bg-teal-900`} />
            <View style={tw`absolute bottom-4 left-4 flex-row items-center gap-2`}>
              <View style={tw`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-lg shadow-green-500' : 'bg-red-500 shadow-lg shadow-red-500'}`} />
              <View style={tw`bg-white/90 px-2 py-0.5 rounded-full`}>
                <Text style={tw`text-xs font-bold text-gray-900`}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>

          <View style={tw`p-5 gap-4`}>
            <View style={tw`flex-row justify-between items-start`}>
              <View>
                <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider mb-1`}>Status Saat Ini</Text>
                <Text style={tw`text-2xl font-bold text-gray-900`}>
                  {isOnline ? 'Terhubung' : 'Terputus'}
                </Text>
              </View>
              <View style={tw`items-end`}>
                <Text style={tw`text-xs font-medium text-gray-500 mb-1`}>Uptime</Text>
                <Text style={tw`text-sm font-bold text-gray-900`}>{uptime}</Text>
              </View>
            </View>

            <View style={tw`h-px bg-gray-100`} />

            <View>
              <Text style={tw`text-xs text-gray-500 mb-1`}>IP Address</Text>
              <Text style={tw`text-sm font-medium text-gray-900 font-mono`}>{ipAddress}</Text>
            </View>
          </View>
        </View>

        <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider mb-2`}>Pemakaian Bulan Ini</Text>
        <View style={tw`flex-row gap-3 mb-4`}>
          {kartuPemakaian.map(({ label, Ikon, nilai }) => (
            <View key={label} style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm`}>
              <View style={tw`flex-row items-center gap-2 mb-2`}>
                <Ikon size={16} color="#6b7280" />
                <Text style={tw`text-xs font-bold text-gray-500 uppercase`}>{label}</Text>
              </View>
              <Text style={tw`text-lg font-bold text-gray-900`}>{nilai ?? '-'}</Text>
            </View>
          ))}
        </View>

        {/* Tips */}
        <View style={tw`bg-teal-50 rounded-xl p-4 border border-teal-100 flex-row gap-3`}>
          <Lightbulb size={20} color="#0d9488" style={tw`mt-0.5`} />
          <View style={tw`flex-1`}>
            <Text style={tw`font-bold text-gray-900 text-sm mb-1`}>Tips Koneksi</Text>
            <Text style={tw`text-sm text-gray-600 leading-relaxed`}>
              Jika internet terasa lambat, cobalah mendekat ke router atau matikan perangkat yang tidak digunakan.
            </Text>
          </View>
        </View>

      </ScrollView>
      )}
    </SafeAreaView>
  );
}
