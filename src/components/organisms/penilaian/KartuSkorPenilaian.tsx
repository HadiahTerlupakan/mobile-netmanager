import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { PredikatPenilaian } from '@/types/penilaian';
import { ringkasBobot, TEKS_BOBOT_DIBAGI_ULANG, type BarisIndikator } from '@/utils/presurvei/penilaianKinerja';
import { BilahIndikator } from './BilahIndikator';
import { SkorDanPredikat } from './SkorDanPredikat';

interface KartuSkorPenilaianProps {
  judul: string;
  skor: number | null;
  predikat: PredikatPenilaian | null;
  indikator: readonly BarisIndikator[];
  keterangan?: string;
}

/** Skor, predikat, seluruh indikator berbobot, dan penjelasan singkat pembobotan. */
export function KartuSkorPenilaian({ judul, skor, predikat, indikator, keterangan }: KartuSkorPenilaianProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-3 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-3`}>{judul}</Text>
      <SkorDanPredikat skor={skor} predikat={predikat} keterangan={keterangan} />
      <View style={tw`mt-4`}>
        {indikator.map((baris) => (
          <BilahIndikator key={baris.kunci} baris={baris} />
        ))}
      </View>
      <Text style={tw`text-[11px] text-gray-500 leading-4`}>
        {`Bobot skor: ${ringkasBobot(indikator)}. ${TEKS_BOBOT_DIBAGI_ULANG}`}
      </Text>
    </View>
  );
}
