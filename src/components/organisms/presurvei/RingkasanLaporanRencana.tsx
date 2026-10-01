import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { RincianRencana } from '@/types/presurvei';
import { formatDate } from '@/utils/date';
import { labelHasilKegiatan } from '@/utils/presurvei/hasilKegiatan';

interface RingkasanLaporanRencanaProps {
  rencana: RincianRencana;
}

/** Ringkasan laporan kunjungan rencana SELESAI: hasil, catatan, waktu, jumlah foto, dan tanda terlambat. */
export function RingkasanLaporanRencana({ rencana }: RingkasanLaporanRencanaProps) {
  const { laporan } = rencana;
  return (
    <View style={tw`bg-white rounded-2xl p-4 mx-4 mb-4 border border-gray-100`}>
      <View style={tw`flex-row items-center justify-between mb-2`}>
        <Text style={tw`font-bold text-gray-900`}>Laporan kunjungan</Text>
        {rencana.isTerlambat ? (
          <Text style={tw`text-xs font-semibold text-rose-700 bg-rose-50 rounded-full px-2 py-0.5`}>Terlambat</Text>
        ) : null}
      </View>
      {laporan === null ? (
        <Text style={tw`text-sm text-gray-500`}>Rincian laporan tidak tersedia.</Text>
      ) : (
        <View>
          <Text style={tw`text-sm text-blue-700`}>{labelHasilKegiatan(laporan.hasil, laporan.jenis)}</Text>
          <Text style={tw`text-xs text-gray-500 mt-1`}>{formatDate(laporan.waktuMulai, 'dd MMM yyyy HH:mm')}</Text>
          {laporan.catatan !== null ? <Text style={tw`text-sm text-gray-700 mt-2`}>{laporan.catatan}</Text> : null}
          <Text style={tw`text-xs text-gray-500 mt-2`}>{`${laporan.jumlahFoto} foto`}</Text>
        </View>
      )}
    </View>
  );
}
