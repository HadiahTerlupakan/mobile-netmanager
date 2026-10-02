import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { PredikatPenilaian } from '@/types/penilaian';
import { formatSkor } from '@/utils/presurvei/penilaianKinerja';
import { DESAIN_PREMIUM } from '@/theme';
import { LencanaPredikat } from './LencanaPredikat';

interface SkorDanPredikatProps {
  skor: number | null;
  predikat: PredikatPenilaian | null;
  /** Teks kecil di bawah lencana (mis. jumlah anggota). */
  keterangan?: string;
  /** Di atas kartu gradien gelap: skor emas, teks terang. */
  isDiAtasGelap?: boolean;
}

/** Warna skor besar; null (belum terukur) selalu redup. */
function kelasSkor(skor: number | null, isDiAtasGelap: boolean): string {
  if (skor === null) return isDiAtasGelap ? 'text-white/40' : 'text-gray-300';
  return isDiAtasGelap ? '' : 'text-gray-900';
}

/** Skor besar "78/100" berdampingan dengan lencana predikat. */
export function SkorDanPredikat({ skor, predikat, keterangan, isDiAtasGelap = false }: SkorDanPredikatProps) {
  const warnaSkorGelap = isDiAtasGelap && skor !== null ? { color: DESAIN_PREMIUM.aksenEmas } : null;
  return (
    <View style={tw`flex-row items-center`}>
      <View style={tw`flex-row items-baseline mr-3`}>
        <Text testID="skor-penilaian" style={[tw`text-4xl font-bold ${kelasSkor(skor, isDiAtasGelap)}`, warnaSkorGelap]}>
          {formatSkor(skor)}
        </Text>
        <Text style={tw`text-sm ${isDiAtasGelap ? 'text-white/60' : 'text-gray-400'} ml-1`}>/100</Text>
      </View>
      <View style={tw`flex-1`}>
        <LencanaPredikat predikat={predikat} />
        {keterangan ? (
          <Text style={tw`text-xs ${isDiAtasGelap ? 'text-white/70' : 'text-gray-500'} mt-1`}>{keterangan}</Text>
        ) : null}
      </View>
    </View>
  );
}
