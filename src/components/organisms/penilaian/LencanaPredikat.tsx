import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { PredikatPenilaian } from '@/types/penilaian';
import { gayaPredikat, labelPredikat } from '@/utils/presurvei/penilaianKinerja';

interface LencanaPredikatProps {
  predikat: PredikatPenilaian | null;
}

/** Lencana predikat berwarna; null tampil "Belum terukur" abu-abu. */
export function LencanaPredikat({ predikat }: LencanaPredikatProps) {
  const gaya = gayaPredikat(predikat);
  return (
    <View style={tw`${gaya.latar} rounded-full px-2.5 py-1 self-start`}>
      <Text style={tw`text-[11px] font-semibold ${gaya.teks}`}>{labelPredikat(predikat)}</Text>
    </View>
  );
}
