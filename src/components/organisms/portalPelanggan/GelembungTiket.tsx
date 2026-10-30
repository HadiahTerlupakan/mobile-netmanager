import { Image } from 'expo-image';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { formatDate } from '@/utils/date';
import { sumberGambarUpload } from '@/utils/sumberGambarUpload';
import { urlGambarTenant } from '@/utils/urlGambarTenant';

const UKURAN_LAMPIRAN = 96;
const FORMAT_WAKTU = 'dd MMM HH:mm';

interface GelembungTiketProps {
  pesan: string;
  waktu: string;
  /** Pesan pelanggan sendiri tampil di kanan berwarna teal; staf di kiri. */
  isDariSaya: boolean;
  namaPengirim?: string;
  lampiran: string[];
  onBukaGambar: (url: string) => void;
}

/** Satu pesan percakapan tiket beserta lampiran gambarnya. */
export function GelembungTiket({ pesan, waktu, isDariSaya, namaPengirim, lampiran, onBukaGambar }: GelembungTiketProps) {
  const urlLampiran = lampiran.map(urlGambarTenant).filter((url): url is string => url !== null);
  return (
    <View style={tw`mb-3 ${isDariSaya ? 'items-end' : 'items-start'}`}>
      <View style={tw`max-w-[85%] rounded-2xl p-3 ${isDariSaya ? 'bg-teal-600 rounded-tr-sm' : 'bg-gray-100 rounded-tl-sm'}`}>
        {namaPengirim ? <Text style={tw`text-[10px] font-semibold text-teal-700 mb-1`}>{namaPengirim}</Text> : null}
        {pesan ? <Text style={tw`text-sm ${isDariSaya ? 'text-white' : 'text-gray-900'}`}>{pesan}</Text> : null}
        {urlLampiran.length > 0 ? (
          <View style={tw`flex-row flex-wrap mt-2 -m-0.5`}>
            {urlLampiran.map((url) => (
              <TouchableOpacity key={url} accessibilityRole="imagebutton" accessibilityLabel="Buka lampiran" onPress={() => onBukaGambar(url)} style={tw`m-0.5`}>
                <Image source={sumberGambarUpload(url)} style={[tw`rounded-lg bg-gray-200`, { width: UKURAN_LAMPIRAN, height: UKURAN_LAMPIRAN }]} contentFit="cover" />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <Text style={tw`text-[10px] mt-2 text-right ${isDariSaya ? 'text-teal-100' : 'text-gray-500'}`}>{formatDate(waktu, FORMAT_WAKTU)}</Text>
      </View>
    </View>
  );
}
