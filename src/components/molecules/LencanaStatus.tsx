import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { NadaStatus, TampilanStatus } from '@/constants/investor';

/** Warna MAKNA status — sengaja tidak ikut tema persona. */
const GAYA_NADA: Readonly<Record<NadaStatus, { latar: string; teks: string }>> = {
  berhasil: { latar: 'bg-green-100', teks: 'text-green-800' },
  menunggu: { latar: 'bg-amber-100', teks: 'text-amber-800' },
  gagal: { latar: 'bg-red-100', teks: 'text-red-800' },
  netral: { latar: 'bg-gray-100', teks: 'text-gray-700' },
};

/** Lencana status berlabel kata biasa, diwarnai sesuai maknanya. */
export function LencanaStatus({ status }: { status: TampilanStatus }) {
  const gaya = GAYA_NADA[status.nada];
  return (
    <View style={tw`self-start rounded-full px-2.5 py-1 ${gaya.latar}`}>
      <Text style={tw`text-xs font-semibold ${gaya.teks}`}>{status.label}</Text>
    </View>
  );
}
