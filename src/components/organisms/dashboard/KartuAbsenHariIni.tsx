import { useRouter } from 'expo-router';
import { ChevronRight, Fingerprint } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { useStatusAbsenHariIni } from '@/hooks/useStatusAbsenHariIni';
import { teksStatusAbsen } from '@/utils/presurvei/berandaSales';

/** Rute layar Absensi, tempat check-in/out yang sebenarnya. */
const RUTE_ABSENSI = '/(app)/absensi';
const WARNA_IKON = '#2563eb';
const UKURAN_IKON = 22;

/** Kartu absen baca-saja; check-in/out tetap di layar Absensi (selfie, geofence). */
export function KartuAbsenHariIni() {
  const router = useRouter();
  const status = useStatusAbsenHariIni();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => router.push(RUTE_ABSENSI)}
      style={tw`flex-row items-center bg-white rounded-2xl p-4 mx-4 mb-4 border border-gray-100 shadow-sm`}
    >
      <View style={tw`w-11 h-11 rounded-xl bg-blue-50 items-center justify-center mr-3`}>
        <Fingerprint size={UKURAN_IKON} color={WARNA_IKON} />
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`text-xs font-medium text-gray-500`}>Absen hari ini</Text>
        <Text style={tw`text-base font-bold text-gray-900 mt-0.5`}>{teksStatusAbsen(status.data?.data ?? null)}</Text>
      </View>
      <View style={tw`flex-row items-center bg-blue-50 rounded-full pl-3 pr-2 py-1.5`}>
        <Text style={tw`text-xs font-semibold text-blue-600`}>Buka Absensi</Text>
        <ChevronRight size={14} color={WARNA_IKON} />
      </View>
    </TouchableOpacity>
  );
}
