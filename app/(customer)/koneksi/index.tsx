import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { ArrowLeft, RefreshCw, Download, Upload, Activity, Zap, Power, Wrench, Lightbulb, Wifi, Router } from 'lucide-react-native';

const fetchUsage = async () => {
  const res = await api.get('/api/customer/usage');
  return res.data.data?.connection || res.data.connection;
};

export default function CustomerConnectionScreen() {
  const router = useRouter();
  const { data: connection, isLoading, refetch } = useQuery({
    queryKey: ['customer-connection'],
    queryFn: fetchUsage
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const isOnline = connection?.isOnline ?? false;
  const ipAddress = connection?.ipAddress ?? '-';
  const uptime = connection?.sessionDurationFormatted ?? '0j 0m';
  const downloadSpeed = '150'; // Placeholder
  const uploadSpeed = '50';   // Placeholder
  const ping = '12';          // Placeholder

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

      <ScrollView
        contentContainerStyle={tw`p-4 pb-20`}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#0d9488" />
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

            <View style={tw`flex-row justify-between items-center`}>
              <View>
                <Text style={tw`text-xs text-gray-500 mb-1`}>IP Address</Text>
                <Text style={tw`text-sm font-medium text-gray-900 font-mono`}>{ipAddress}</Text>
              </View>
              <TouchableOpacity style={tw`bg-teal-50 px-3 py-1.5 rounded-lg`}>
                <Text style={tw`text-teal-700 text-xs font-bold`}>Detail Perangkat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={tw`flex-row gap-3 mb-4`}>
          <View style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm`}>
            <View style={tw`flex-row items-center gap-2 mb-2`}>
              <Download size={16} color="#6b7280" />
              <Text style={tw`text-xs font-bold text-gray-500 uppercase`}>Down</Text>
            </View>
            <Text style={tw`text-xl font-bold text-gray-900`}>{downloadSpeed}</Text>
            <Text style={tw`text-xs text-gray-500`}>Mbps</Text>
          </View>
          <View style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm`}>
            <View style={tw`flex-row items-center gap-2 mb-2`}>
              <Upload size={16} color="#6b7280" />
              <Text style={tw`text-xs font-bold text-gray-500 uppercase`}>Up</Text>
            </View>
            <Text style={tw`text-xl font-bold text-gray-900`}>{uploadSpeed}</Text>
            <Text style={tw`text-xs text-gray-500`}>Mbps</Text>
          </View>
          <View style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm`}>
            <View style={tw`flex-row items-center gap-2 mb-2`}>
              <Activity size={16} color="#6b7280" />
              <Text style={tw`text-xs font-bold text-gray-500 uppercase`}>Ping</Text>
            </View>
            <Text style={tw`text-xl font-bold text-gray-900`}>{ping}</Text>
            <Text style={tw`text-xs text-gray-500`}>ms</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={tw`flex-row gap-3 mb-4`}>
          <TouchableOpacity style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-row items-center gap-3 active:bg-gray-50`}>
            <View style={tw`w-10 h-10 rounded-full bg-teal-50 items-center justify-center`}>
              <Zap size={20} color="#0d9488" />
            </View>
            <View>
              <Text style={tw`font-bold text-gray-900`}>Tes Kecepatan</Text>
              <Text style={tw`text-xs text-gray-500`}>Cek performa</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-row items-center gap-3 active:bg-gray-50`}>
            <View style={tw`w-10 h-10 rounded-full bg-orange-50 items-center justify-center`}>
              <Power size={20} color="#ea580c" />
            </View>
            <View>
              <Text style={tw`font-bold text-gray-900`}>Restart</Text>
              <Text style={tw`text-xs text-gray-500`}>Reboot router</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Diagnosis */}
        <View style={tw`bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4`}>
          <View style={tw`flex-row gap-4 mb-4`}>
            <View style={tw`w-10 h-10 rounded-full bg-blue-50 items-center justify-center`}>
              <Wrench size={20} color="#2563eb" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`font-bold text-gray-900`}>Diagnosa Otomatis</Text>
              <Text style={tw`text-sm text-gray-500 mt-1`}>
                Deteksi masalah dan optimalkan koneksi Anda secara otomatis.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={tw`w-full bg-teal-600 py-2.5 rounded-lg items-center`}>
            <Text style={tw`text-white font-bold text-sm`}>Mulai Diagnosa</Text>
          </TouchableOpacity>
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
    </SafeAreaView>
  );
}
