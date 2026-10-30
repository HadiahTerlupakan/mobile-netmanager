import { CheckCircle } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { PilihanUpgrade } from '@/types/portalPelanggan';
import { formatPeriodePaket, ringkasBandwidth } from '@/utils/paketPelanggan';
import { formatRupiah } from '@/utils/rupiah';

const UKURAN_IKON_CENTANG = 18;
/** green-600 */
const WARNA_CENTANG = '#16a34a';

interface KartuPilihanUpgradeProps {
  pilihan: PilihanUpgrade;
  isTerpilih: boolean;
  onPilih: () => void;
}

/** Keterangan kecepatan: nama profil plus rinciannya bila berbeda. */
function keteranganKecepatan(pilihan: PilihanUpgrade): string | null {
  if (!pilihan.bandwidth) return null;
  const rincian = ringkasBandwidth(pilihan.bandwidth);
  const nama = pilihan.bandwidth.nama;
  return rincian && rincian !== nama ? `Kecepatan ${nama} (${rincian})` : `Kecepatan ${nama}`;
}

/** Satu paket tujuan upgrade yang bisa dipilih. */
export function KartuPilihanUpgrade({ pilihan, isTerpilih, onPilih }: KartuPilihanUpgradeProps) {
  const kecepatan = keteranganKecepatan(pilihan);
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityLabel={`Paket ${pilihan.nama}`}
      accessibilityState={{ selected: isTerpilih }}
      onPress={onPilih}
      style={tw`mb-4 rounded-xl p-5 ${isTerpilih ? 'border-2 border-teal-600 bg-teal-50' : 'border border-gray-200 bg-white'}`}
    >
      {pilihan.isFeatured ? (
        <View style={tw`self-start bg-teal-600 px-3 py-1 rounded-full mb-2`}>
          <Text style={tw`text-white text-xs font-bold uppercase`}>Direkomendasikan</Text>
        </View>
      ) : null}
      <View style={tw`flex-row items-start`}>
        <Text style={tw`flex-1 text-lg font-bold text-gray-900`}>{pilihan.nama}</Text>
        <View style={tw`w-6 h-6 rounded-full border-2 items-center justify-center ${isTerpilih ? 'border-teal-600' : 'border-gray-300'}`}>
          {isTerpilih ? <View style={tw`w-3 h-3 rounded-full bg-teal-600`} /> : null}
        </View>
      </View>
      <Text style={tw`text-2xl font-black text-gray-900 mt-2`}>
        {formatRupiah(pilihan.harga)}
        <Text style={tw`text-sm font-medium text-gray-500`}>{` /${formatPeriodePaket(pilihan.durasi, pilihan.durasiUnit)}`}</Text>
      </Text>
      <View style={tw`h-px bg-gray-100 my-3`} />
      {kecepatan ? (
        <View style={tw`flex-row items-center mb-2`}>
          <CheckCircle size={UKURAN_IKON_CENTANG} color={WARNA_CENTANG} />
          <Text style={tw`text-sm text-gray-700 ml-2 flex-1`}>{kecepatan}</Text>
        </View>
      ) : null}
      <View style={tw`flex-row items-center`}>
        <CheckCircle size={UKURAN_IKON_CENTANG} color={WARNA_CENTANG} />
        <Text style={tw`text-sm text-gray-700 ml-2 flex-1`}>{`Tambahan ${formatRupiah(pilihan.priceDifference)} dari paket sekarang`}</Text>
      </View>
    </TouchableOpacity>
  );
}
