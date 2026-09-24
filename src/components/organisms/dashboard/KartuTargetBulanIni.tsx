import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { TargetBulanIni } from '@/types/presurvei';
import { barisTargetBeranda, TEKS_TARGET_BELUM_DITETAPKAN } from '@/utils/presurvei/berandaSales';

interface KartuTargetBulanIniProps {
  target: TargetBulanIni | null;
}

/** Target bulan ini vs realisasi; target kosong ditulis apa adanya, bukan 0%. */
export function KartuTargetBulanIni({ target }: KartuTargetBulanIniProps) {
  const daftar = barisTargetBeranda(target);
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Target bulan ini</Text>
      {daftar === null ? (
        <Text style={tw`text-sm text-gray-500`}>{TEKS_TARGET_BELUM_DITETAPKAN}</Text>
      ) : (
        daftar.map((baris) => (
          <View key={baris.label} testID="baris-target" style={tw`mb-2`}>
            <View style={tw`flex-row justify-between`}>
              <Text style={tw`text-sm text-gray-700`}>{baris.label}</Text>
              <Text style={tw`text-sm text-gray-900`}>{baris.teks}</Text>
            </View>
            <View style={tw`h-2 bg-gray-100 rounded-full mt-1`}>
              <View testID="bilah-target" style={[tw`h-2 bg-blue-600 rounded-full`, { width: `${baris.persen}%` }]} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}
