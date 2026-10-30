import { Calendar, Wifi } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { PaketPelanggan } from '@/types/portalPelanggan';
import { formatDate } from '@/utils/date';
import { formatPeriodePaket } from '@/utils/paketPelanggan';
import { formatRupiah } from '@/utils/rupiah';

const UKURAN_IKON_KECIL = 14;
const UKURAN_IKON_PAKET = 36;
/** teal-600 */
const WARNA_TEAL = '#0d9488';

/** Paket yang sedang dipakai pelanggan dan masa aktifnya. */
export function KartuPaketSaatIni({ paket }: { paket: PaketPelanggan }) {
  const { package: paketAktif, subscription } = paket;
  return (
    <View style={tw`flex-row bg-white rounded-xl p-4 border border-gray-100 shadow-sm`}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-xs font-semibold text-gray-500 uppercase tracking-wider`}>Paket Saat Ini</Text>
        <Text style={tw`text-lg font-bold text-gray-900 mt-1`}>{paketAktif.nama}</Text>
        <Text style={tw`text-sm text-gray-500`}>
          {`${formatRupiah(paketAktif.harga)} / ${formatPeriodePaket(paketAktif.durasi, paketAktif.durasiUnit)}`}
        </Text>
        <View style={tw`flex-row items-center mt-1`}>
          <Calendar size={UKURAN_IKON_KECIL} color={WARNA_TEAL} />
          <Text style={tw`text-sm font-medium text-teal-600 ml-1`}>{`Aktif sampai ${formatDate(subscription.jatuhTempo)}`}</Text>
        </View>
      </View>
      <View style={tw`w-20 rounded-lg bg-teal-50 items-center justify-center`}>
        <Wifi size={UKURAN_IKON_PAKET} color={WARNA_TEAL} />
      </View>
    </View>
  );
}
