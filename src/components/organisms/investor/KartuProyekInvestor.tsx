import { ChevronRight, MapPin, Network } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { DESAIN_INVESTOR, STATUS_PROYEK } from '@/constants/investor';
import { useTemaPersona } from '@/theme';
import { tampilanStatus } from '@/utils/investor';

const UKURAN_IKON_LOKASI = 13;
const UKURAN_IKON_PANAH = 18;
const UKURAN_IKON_PROYEK = 20;
const GAYA_ANGKA = { fontVariant: ['tabular-nums' as const] };

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
  const { tw: twTema, warna } = useTemaPersona();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Proyek ${nama}`}
      onPress={onTekan}
      activeOpacity={0.7}
      style={tw`bg-white rounded-2xl p-4 border border-slate-200/70 mb-3`}
    >
      <View style={tw`flex-row items-center`}>
        <View style={twTema`w-11 h-11 rounded-xl bg-utama-sangat-muda items-center justify-center mr-3`}>
          <Network size={UKURAN_IKON_PROYEK} color={warna.utamaKuat} />
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`text-base font-bold text-slate-900`} numberOfLines={1}>
            {nama}
          </Text>
          {lokasi ? (
            <View style={tw`flex-row items-center mt-0.5`}>
              <MapPin size={UKURAN_IKON_LOKASI} color={DESAIN_INVESTOR.ikonNetral} />
              <Text style={tw`text-xs text-slate-500 ml-1`}>{lokasi}</Text>
            </View>
          ) : null}
        </View>
        <ChevronRight size={UKURAN_IKON_PANAH} color={DESAIN_INVESTOR.ikonNetral} />
      </View>
      <View style={tw`mt-3`}>
        <LencanaStatus status={tampilanStatus(STATUS_PROYEK, status)} />
      </View>
      {rincian.length > 0 ? (
        <View style={tw`flex-row mt-4 pt-3 border-t border-slate-100`}>
          {rincian.map((baris) => (
            <View key={baris.label} style={tw`flex-1`}>
              <Text style={tw`text-[11px] font-medium text-slate-500`}>{baris.label}</Text>
              <Text style={[tw`text-sm font-bold text-slate-900 mt-0.5`, GAYA_ANGKA]} numberOfLines={1} adjustsFontSizeToFit>
                {baris.nilai}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
