import { Eye } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useTemaPersona } from '@/theme';

export const OBSERVER_MODE_MESSAGE = 'Mode lihat saja — Anda bukan teknisi WO ini.';

/** Catatan kecil bahwa detail WO dibuka dalam mode lihat saja (OBSERVER). */
export function ObserverModeNotice() {
  const { tw } = useTemaPersona();
  return (
    <View
      style={tw`px-4 py-2 bg-gray-100 border-b border-gray-200 flex-row items-center justify-center`}
    >
      <Eye size={14} color="#4b5563" style={tw`mr-1.5`} />
      <Text style={tw`text-xs font-medium text-gray-700`}>{OBSERVER_MODE_MESSAGE}</Text>
    </View>
  );
}
