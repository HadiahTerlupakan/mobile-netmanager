import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { PredikatPenilaian } from '@/types/penilaian';
import { formatSkor } from '@/utils/presurvei/penilaianKinerja';
import { LencanaPredikat } from './LencanaPredikat';

interface SkorDanPredikatProps {
  skor: number | null;
  predikat: PredikatPenilaian | null;
  /** Teks kecil di bawah lencana (mis. jumlah anggota). */
  keterangan?: string;
}

/** Skor besar "78/100" berdampingan dengan lencana predikat. */
export function SkorDanPredikat({ skor, predikat, keterangan }: SkorDanPredikatProps) {
  return (
    <View style={tw`flex-row items-center`}>
      <View style={tw`flex-row items-baseline mr-3`}>
        <Text testID="skor-penilaian" style={tw`text-4xl font-bold ${skor === null ? 'text-gray-300' : 'text-gray-900'}`}>
          {formatSkor(skor)}
        </Text>
        <Text style={tw`text-sm text-gray-400 ml-1`}>/100</Text>
      </View>
      <View style={tw`flex-1`}>
        <LencanaPredikat predikat={predikat} />
        {keterangan ? <Text style={tw`text-xs text-gray-500 mt-1`}>{keterangan}</Text> : null}
      </View>
    </View>
  );
}
