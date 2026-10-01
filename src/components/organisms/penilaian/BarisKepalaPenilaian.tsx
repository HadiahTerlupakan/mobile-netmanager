import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { AvatarAnggota } from '@/components/organisms/presurvei/AvatarAnggota';
import type { PenilaianKepala } from '@/types/penilaian';
import { daftarIndikatorKepala, formatSkor, indikatorTerlemah } from '@/utils/presurvei/penilaianKinerja';
import { LencanaPredikat } from './LencanaPredikat';

interface BarisKepalaPenilaianProps {
  penilaian: PenilaianKepala;
  onBuka: () => void;
}

/** Keterangan baris kepala: jumlah anggota dan indikator terlemah bila ada. */
const keteranganKepala = (penilaian: PenilaianKepala): string => {
  const terlemah = indikatorTerlemah(daftarIndikatorKepala(penilaian.indikator));
  const anggota = `${penilaian.jumlahAnggota} anggota`;
  return terlemah ? `${anggota} · lemah: ${terlemah.label} (${formatSkor(terlemah.nilai)})` : anggota;
};

/** Baris ringkas kepala sales: nama, jumlah anggota, indikator terlemah, skor, dan lencana. */
export function BarisKepalaPenilaian({ penilaian, onBuka }: BarisKepalaPenilaianProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Penilaian kepala ${penilaian.nama}, skor ${formatSkor(penilaian.skor)}`}
      onPress={onBuka}
      style={tw`flex-row items-center bg-white px-4 py-3 border-b border-gray-100`}
    >
      <AvatarAnggota nama={penilaian.nama} ukuran="kecil" />
      <View style={tw`flex-1 mr-2`}>
        <Text style={tw`text-sm font-semibold text-gray-900`} numberOfLines={1}>{penilaian.nama}</Text>
        <Text style={tw`text-[11px] text-gray-500 mt-0.5`} numberOfLines={1}>{keteranganKepala(penilaian)}</Text>
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
