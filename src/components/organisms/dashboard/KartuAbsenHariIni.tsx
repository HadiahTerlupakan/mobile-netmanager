import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';

import { useStatusAbsenHariIni } from '@/hooks/useStatusAbsenHariIni';
import { teksStatusAbsen } from '@/utils/presurvei/berandaSales';

/** Rute layar Absensi, tempat check-in/out yang sebenarnya. */
const RUTE_ABSENSI = '/(app)/absensi';

/** Kartu absen baca-saja; check-in/out tetap di layar Absensi (selfie, geofence). */
export function KartuAbsenHariIni() {
  const router = useRouter();
  const status = useStatusAbsenHariIni();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => router.push(RUTE_ABSENSI)}
      style={tw`bg-white rounded-2xl p-4 mx-4 mb-4 border border-gray-100`}
    >
      <Text style={tw`text-xs text-gray-500`}>Absen hari ini</Text>
      <Text style={tw`text-base font-bold text-gray-900 mt-1`}>{teksStatusAbsen(status.data?.data ?? null)}</Text>
      <Text style={tw`text-xs text-blue-600 mt-2`}>Buka Absensi</Text>
    </TouchableOpacity>
  );
}
