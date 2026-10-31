import { AlertCircle } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

/** red-600 */
const WARNA_IKON = '#dc2626';
const UKURAN_IKON = 20;

interface BannerTransferDitolakProps {
  /** Alasan admin; boleh kosong bila admin tidak menuliskannya. */
  alasan: string | null | undefined;
}

/** Admin menolak bukti transfer manual terakhir; tagihannya bisa dibayar lagi. */
export function BannerTransferDitolak({ alasan }: BannerTransferDitolakProps) {
  return (
    <View accessibilityRole="alert" style={tw`flex-row bg-red-50 border border-red-200 rounded-xl p-4 mb-4`}>
      <AlertCircle size={UKURAN_IKON} color={WARNA_IKON} />
      <View style={tw`flex-1 ml-3`}>
        <Text style={tw`text-red-800 font-bold`}>Bukti transfer ditolak</Text>
        {alasan ? <Text style={tw`text-red-700 text-sm mt-1`}>{`Alasan: ${alasan}`}</Text> : null}
        <Text style={tw`text-red-700 text-xs mt-1`}>Silakan bayar lagi dengan bukti transfer yang benar, atau pilih metode lain.</Text>
      </View>
    </View>
  );
}
