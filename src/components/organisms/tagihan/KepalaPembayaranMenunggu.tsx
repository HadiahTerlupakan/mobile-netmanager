import { Clock } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { HitungMundur } from '@/hooks/tagihan/useHitungMundurPembayaran';

/** orange-600, gray-500 */
const WARNA_MENUNGGU = '#ea580c';
const WARNA_KEDALUWARSA = '#6b7280';
const UKURAN_IKON = 20;

interface KepalaPembayaranMenungguProps {
  hitungMundur: HitungMundur;
  /** Metode, nomor tagihan, dan batas bayar. */
  keterangan: string;
}

/** Judul kartu checkout yang menunggu: sisa waktu, atau keterangan bahwa waktunya habis. */
export function KepalaPembayaranMenunggu({ hitungMundur, keterangan }: KepalaPembayaranMenungguProps) {
  const { sisa, isKedaluwarsa } = hitungMundur;
  return (
    <>
      <View style={tw`flex-row items-center mb-4`}>
        <Clock size={UKURAN_IKON} color={isKedaluwarsa ? WARNA_KEDALUWARSA : WARNA_MENUNGGU} />
        <Text style={tw`font-bold ml-2 text-sm ${isKedaluwarsa ? 'text-gray-700' : 'text-orange-600'}`}>
          {isKedaluwarsa ? 'Waktu Pembayaran Habis' : 'Selesaikan Pembayaran'}
        </Text>
        {sisa !== '' && (
          <View style={tw`ml-auto bg-orange-100 px-3 py-1 rounded-full`}>
            <Text style={tw`text-orange-600 font-bold text-xs`}>{`Sisa ${sisa}`}</Text>
          </View>
        )}
      </View>
      <Text style={tw`text-xs text-gray-500 -mt-2 mb-4`}>{keterangan}</Text>
    </>
  );
}
