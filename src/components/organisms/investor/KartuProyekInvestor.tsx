import { ChevronRight, MapPin } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { STATUS_PROYEK } from '@/constants/investor';
import { tampilanStatus } from '@/utils/investor';

const WARNA_IKON = '#9ca3af';
const UKURAN_IKON_LOKASI = 14;
const UKURAN_IKON_PANAH = 20;

interface KartuProyekInvestorProps {
  nama: string;
  lokasi?: string | null;
  status: string;
  /** Baris angka tambahan, mis. modal ditanam & bagi hasil. */
  rincian?: { label: string; nilai: string }[];
  onTekan: () => void;
}

/** Kartu satu proyek investor; ditekan membuka rincian proyek. */
export function KartuProyekInvestor({ nama, lokasi, status, rincian = [], onTekan }: KartuProyekInvestorProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Proyek ${nama}`}
      onPress={onTekan}
      style={tw`bg-white rounded-xl p-4 border border-gray-100 mb-3`}
    >
      <View style={tw`flex-row items-start`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-base font-bold text-gray-900`}>{nama}</Text>
          {lokasi ? (
            <View style={tw`flex-row items-center mt-1`}>
              <MapPin size={UKURAN_IKON_LOKASI} color={WARNA_IKON} />
              <Text style={tw`text-xs text-gray-500 ml-1`}>{lokasi}</Text>
            </View>
          ) : null}
          <View style={tw`mt-2`}>
            <LencanaStatus status={tampilanStatus(STATUS_PROYEK, status)} />
          </View>
        </View>
        <ChevronRight size={UKURAN_IKON_PANAH} color={WARNA_IKON} />
      </View>
      {rincian.length > 0 ? (
        <View style={tw`flex-row mt-3 pt-3 border-t border-gray-100`}>
          {rincian.map((baris) => (
            <View key={baris.label} style={tw`flex-1`}>
              <Text style={tw`text-xs text-gray-500`}>{baris.label}</Text>
              <Text style={tw`text-sm font-semibold text-gray-900 mt-0.5`}>{baris.nilai}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
