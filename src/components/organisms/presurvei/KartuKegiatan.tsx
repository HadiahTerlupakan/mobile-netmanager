import { Camera } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_HASIL_KEGIATAN, LABEL_JENIS_KEGIATAN } from '@/constants/presurvei';
import { formatDate } from '@/utils/date';
import type { BarisKegiatan } from '@/utils/presurvei/daftarKegiatan';

/** Ukuran dan warna ikon jumlah foto. */
const UKURAN_IKON_FOTO = 12;
const WARNA_IKON_FOTO = '#6b7280';

interface KartuKegiatanProps {
  baris: BarisKegiatan;
}

/** Satu kegiatan di daftar: jenis, jam, tempat/yang ditemui, hasil, jumlah foto, dan status kirim. */
export function KartuKegiatan({ baris }: KartuKegiatanProps) {
  return (
    <View style={tw`bg-white rounded-xl p-3 mb-2 border border-gray-100`}>
      <View style={tw`flex-row justify-between`}>
        <Text style={tw`font-semibold text-gray-900`}>{LABEL_JENIS_KEGIATAN[baris.jenis]}</Text>
        <Text style={tw`text-xs text-gray-500`}>{formatDate(baris.waktuMulai, 'HH:mm')}</Text>
      </View>
      {baris.ditemuiNama !== null ? <Text style={tw`text-sm text-gray-700`}>{baris.ditemuiNama}</Text> : null}
      {baris.tempat !== null ? <Text style={tw`text-xs text-gray-500`} numberOfLines={1}>{baris.tempat}</Text> : null}
      <View style={tw`flex-row items-center justify-between mt-1`}>
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-xs text-blue-700`}>{LABEL_HASIL_KEGIATAN[baris.hasil]}</Text>
          {baris.jumlahFoto > 0 ? (
            <View style={tw`flex-row items-center ml-2`}>
              <Camera size={UKURAN_IKON_FOTO} color={WARNA_IKON_FOTO} />
              <Text style={tw`text-xs text-gray-500 ml-1`}>{`${baris.jumlahFoto} foto`}</Text>
            </View>
          ) : null}
        </View>
        {baris.isGagal ? (
          <Text style={tw`text-xs font-semibold text-red-700 bg-red-100 rounded-full px-2 py-0.5`}>
            Gagal terkirim
          </Text>
        ) : baris.isMenunggu ? (
          <Text style={tw`text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5`}>
            Menunggu kirim
          </Text>
        ) : null}
      </View>
    </View>
  );
}
