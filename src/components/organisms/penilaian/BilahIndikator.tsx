import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import {
  formatSkor,
  gayaPredikat,
  lebarBilah,
  predikatDariNilai,
  TEKS_BELUM_TERUKUR,
  type BarisIndikator,
} from '@/utils/presurvei/penilaianKinerja';

interface BilahIndikatorProps {
  baris: BarisIndikator;
  /** Ringkas (Beranda): tanpa bobot, huruf lebih kecil. */
  isRingkas?: boolean;
  /** Di atas kartu gradien gelap: teks terang, alur bilah transparan. */
  isDiAtasGelap?: boolean;
}

/** Warna teks nilai indikator sesuai latar dan apakah sudah terukur. */
function warnaNilai(nilai: number | null, isDiAtasGelap: boolean): string {
  if (isDiAtasGelap) return nilai === null ? 'text-white/50' : 'text-white';
  return nilai === null ? 'text-gray-400' : 'text-gray-900';
}

/** Satu indikator: label (+ bobot), nilai, dan bilah berwarna sesuai ambang predikat. */
export function BilahIndikator({ baris, isRingkas = false, isDiAtasGelap = false }: BilahIndikatorProps) {
  const gaya = gayaPredikat(predikatDariNilai(baris.nilai));
  const teksNilai = baris.nilai === null ? TEKS_BELUM_TERUKUR : formatSkor(baris.nilai);
  const tinggi = isRingkas ? 'h-1.5' : 'h-2';
  return (
    <View testID="bilah-indikator" style={tw`${isRingkas ? 'mb-2' : 'mb-3'}`}>
      <View style={tw`flex-row justify-between items-baseline`}>
        <Text style={tw`flex-1 mr-2 ${isRingkas ? 'text-xs' : 'text-sm'} ${isDiAtasGelap ? 'text-white/80' : 'text-gray-700'}`} numberOfLines={1}>
          {isRingkas ? baris.label : `${baris.label} · bobot ${baris.bobot}%`}
        </Text>
        <Text style={tw`${isRingkas ? 'text-xs' : 'text-sm'} font-semibold ${warnaNilai(baris.nilai, isDiAtasGelap)}`}>
          {teksNilai}
        </Text>
      </View>
      <View style={tw`${tinggi} ${isDiAtasGelap ? 'bg-white/15' : 'bg-gray-100'} rounded-full mt-1 overflow-hidden`}>
        <View style={[tw`${tinggi} ${gaya.bilah} rounded-full`, { width: `${lebarBilah(baris.nilai)}%` }]} />
      </View>
    </View>
  );
}
