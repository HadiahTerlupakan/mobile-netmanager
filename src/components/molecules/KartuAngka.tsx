import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { useTemaPersona } from '@/theme';

interface KartuAngkaProps {
  label: string;
  nilai: string;
  keterangan?: string;
  ikon?: LucideIcon;
}

const UKURAN_IKON = 14;
/** Angka sejajar per digit agar nominal mudah dibandingkan. */
const GAYA_ANGKA = { fontVariant: ['tabular-nums' as const] };

/** Kotak satu angka penting: ikon, label kecil, nilai tebal, keterangan. */
export function KartuAngka({ label, nilai, keterangan, ikon: Ikon }: KartuAngkaProps) {
  const { tw: twTema, warna } = useTemaPersona();
  return (
    <View style={tw`flex-1 bg-white rounded-2xl p-4 border border-slate-200/70`}>
      <View style={tw`flex-row items-center`}>
        {Ikon ? (
          <View style={twTema`w-7 h-7 rounded-lg bg-utama-sangat-muda items-center justify-center mr-2`}>
            <Ikon size={UKURAN_IKON} color={warna.utamaKuat} />
          </View>
        ) : null}
        <Text style={tw`flex-1 text-xs font-medium text-slate-500`}>{label}</Text>
      </View>
      <Text style={[tw`text-lg font-bold text-slate-900 mt-2`, GAYA_ANGKA]} numberOfLines={1} adjustsFontSizeToFit>
        {nilai}
      </Text>
      {keterangan ? <Text style={tw`text-xs text-slate-500 mt-1`}>{keterangan}</Text> : null}
    </View>
  );
}
