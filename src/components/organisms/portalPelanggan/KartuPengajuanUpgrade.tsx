import { Info } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { PengajuanUpgrade } from '@/types/portalPelanggan';
import { formatDate } from '@/utils/date';

const UKURAN_IKON = 20;
/** teal-600 */
const WARNA_TEAL = '#0d9488';

interface KartuPengajuanUpgradeProps {
  pengajuan: PengajuanUpgrade;
  isMembatalkan: boolean;
  onBatalkan: () => void;
}

/** Pengajuan upgrade yang menunggu siklus tagihan berikutnya, dengan tombol batal. */
export function KartuPengajuanUpgrade({ pengajuan, isMembatalkan, onBatalkan }: KartuPengajuanUpgradeProps) {
  const kapan = pengajuan.applyAt ? `pada ${formatDate(pengajuan.applyAt)}` : 'pada siklus tagihan berikutnya';
  return (
    <View style={tw`flex-row mt-3 rounded-xl border border-teal-200 bg-teal-50 p-4`}>
      <Info size={UKURAN_IKON} color={WARNA_TEAL} />
      <View style={tw`flex-1 ml-3`}>
        <Text style={tw`font-bold text-gray-900`}>Pengajuan upgrade sedang diproses</Text>
        <Text style={tw`text-sm text-gray-600 mt-1`}>{`${pengajuan.nama} akan aktif ${kapan}.`}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: isMembatalkan }}
          disabled={isMembatalkan}
          onPress={onBatalkan}
          style={tw`mt-3 self-start px-4 py-2 rounded-lg border border-gray-300 bg-white`}
        >
          {isMembatalkan ? <ActivityIndicator color={WARNA_TEAL} /> : <Text style={tw`text-sm font-bold text-gray-700`}>Batalkan Pengajuan</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
