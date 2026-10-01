import { Target } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useTemaPersona } from '@/theme';

import type { TargetBulanIni } from '@/types/presurvei';
import { barisTargetBeranda, TEKS_TARGET_BELUM_DITETAPKAN } from '@/utils/presurvei/berandaSales';

interface KartuTargetBulanIniProps {
  target: TargetBulanIni | null;
}

/** Target bulan ini vs realisasi; target kosong ditulis apa adanya, bukan 0%. */
export function KartuTargetBulanIni({ target }: KartuTargetBulanIniProps) {
  const { tw } = useTemaPersona();
  const daftar = barisTargetBeranda(target);
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm`}>
      <View style={tw`flex-row items-center mb-3`}>
        <Target size={18} color="#111827" />
        <Text style={tw`font-bold text-gray-900 ml-2`}>Target bulan ini</Text>
      </View>
      {daftar === null ? (
        <View style={tw`rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3`}>
          <Text style={tw`text-sm text-gray-500 text-center`}>{TEKS_TARGET_BELUM_DITETAPKAN}</Text>
        </View>
      ) : (
        daftar.map((baris) => (
          <View key={baris.label} testID="baris-target" style={tw`mb-3`}>
            <View style={tw`flex-row justify-between items-baseline`}>
              <Text style={tw`text-sm text-gray-700`}>{baris.label}</Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>{baris.teks}</Text>
            </View>
            <View style={tw`h-2.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden`}>
              <View testID="bilah-target" style={[tw`h-2.5 bg-utama rounded-full`, { width: `${baris.persen}%` }]} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}
