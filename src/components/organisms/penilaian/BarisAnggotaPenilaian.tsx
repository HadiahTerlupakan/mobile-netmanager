import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { AvatarAnggota } from '@/components/organisms/presurvei/AvatarAnggota';
import type { PenilaianSales } from '@/types/penilaian';
import { formatSkor } from '@/utils/presurvei/penilaianKinerja';
import { LencanaPredikat } from './LencanaPredikat';
import { RealisasiRencanaMini } from './RealisasiRencanaMini';

interface BarisAnggotaPenilaianProps {
  penilaian: PenilaianSales;
  isSaya: boolean;
  /** Teks kecil di bawah nama, mis. nama kepala sales-nya (tab "Semua sales"). */
  keterangan?: string;
  onBuka: () => void;
}

/** Baris ringkas anggota: avatar, nama, realisasi rencana mini, skor, dan lencana predikat. */
export function BarisAnggotaPenilaian({ penilaian, isSaya, keterangan, onBuka }: BarisAnggotaPenilaianProps) {
  const nama = isSaya ? `${penilaian.nama} (Anda)` : penilaian.nama;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Penilaian ${nama}, skor ${formatSkor(penilaian.skor)}`}
      onPress={onBuka}
      style={tw`flex-row items-center bg-white px-4 py-3 border-b border-gray-100`}
    >
      <AvatarAnggota nama={penilaian.nama} ukuran="kecil" />
      <View style={tw`flex-1 mr-2`}>
        <Text style={tw`text-sm font-semibold text-gray-900`} numberOfLines={1}>{nama}</Text>
        {keterangan ? <Text style={tw`text-[11px] text-gray-500`} numberOfLines={1}>{keterangan}</Text> : null}
        <RealisasiRencanaMini rencana={penilaian.rencana} />
      </View>
      <View style={tw`items-end`}>
        <Text style={tw`text-base font-bold ${penilaian.skor === null ? 'text-gray-300' : 'text-gray-900'}`}>
          {formatSkor(penilaian.skor)}
        </Text>
        <LencanaPredikat predikat={penilaian.predikat} />
      </View>
    </TouchableOpacity>
  );
}
