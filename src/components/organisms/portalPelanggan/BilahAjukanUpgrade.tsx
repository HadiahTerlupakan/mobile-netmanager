import { Info } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { PilihanUpgrade } from '@/types/portalPelanggan';
import { formatPeriodePaket } from '@/utils/paketPelanggan';
import { formatRupiah } from '@/utils/rupiah';

const UKURAN_IKON_INFO = 12;
/** gray-400 */
const WARNA_INFO = '#9ca3af';

interface BilahAjukanUpgradeProps {
  pilihan: PilihanUpgrade;
  isMengajukan: boolean;
  onAjukan: () => void;
}

/** Ringkasan paket terpilih dan tombol ajukan di bawah layar. */
export function BilahAjukanUpgrade({ pilihan, isMengajukan, onAjukan }: BilahAjukanUpgradeProps) {
  return (
    <View style={tw`bg-white border-t border-gray-200 p-4`}>
      <View style={tw`flex-row justify-between items-end`}>
        <View style={tw`flex-1 mr-3`}>
          <Text style={tw`text-xs text-gray-500`}>Paket Dipilih:</Text>
          <Text style={tw`font-bold text-gray-900`}>{pilihan.nama}</Text>
        </View>
        <View style={tw`items-end`}>
          <Text style={tw`text-xs text-gray-500`}>{`+${formatRupiah(pilihan.priceDifference)}`}</Text>
          <Text style={tw`font-black text-lg text-teal-600`}>
            {formatRupiah(pilihan.harga)}
            <Text style={tw`text-xs font-normal text-gray-500`}>{`/${formatPeriodePaket(pilihan.durasi, pilihan.durasiUnit)}`}</Text>
          </Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: isMengajukan }}
        disabled={isMengajukan}
        onPress={onAjukan}
        style={tw`mt-3 bg-teal-600 rounded-xl py-3.5 items-center ${isMengajukan ? 'opacity-70' : ''}`}
      >
        {isMengajukan ? <ActivityIndicator color="white" /> : <Text style={tw`text-white font-bold`}>Ajukan Upgrade</Text>}
      </TouchableOpacity>
      <View style={tw`flex-row items-center justify-center mt-2`}>
        <Info size={UKURAN_IKON_INFO} color={WARNA_INFO} />
        <Text style={tw`text-[10px] text-gray-400 ml-1`}>Paket baru berlaku mulai siklus tagihan berikutnya.</Text>
      </View>
    </View>
  );
}
