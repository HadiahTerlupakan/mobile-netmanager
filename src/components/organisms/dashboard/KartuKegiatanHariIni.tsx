import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { RekapKegiatanHariIni } from '@/utils/presurvei/berandaSales';

interface KartuKegiatanHariIniProps {
  rekap: RekapKegiatanHariIni;
  jumlahMenunggu: number;
}

/** Jumlah kegiatan hari ini dan yang masih menunggu kirim. */
export function KartuKegiatanHariIni({ rekap, jumlahMenunggu }: KartuKegiatanHariIniProps) {
  const statistik = [
    { label: 'Kunjungan', nilai: rekap.kunjungan },
    { label: 'Survei', nilai: rekap.survei },
    { label: 'Telepon/Chat', nilai: rekap.teleponChat },
  ];
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Hari ini</Text>
      <View style={tw`flex-row`}>
        {statistik.map((item) => (
          <View key={item.label} accessible accessibilityLabel={`${item.label}: ${item.nilai}`} style={tw`flex-1 items-center`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>{String(item.nilai)}</Text>
            <Text style={tw`text-xs text-gray-500`}>{item.label}</Text>
          </View>
        ))}
      </View>
      <Text style={tw`text-xs text-amber-700 mt-3`}>{`Menunggu kirim: ${jumlahMenunggu}`}</Text>
    </View>
  );
}
