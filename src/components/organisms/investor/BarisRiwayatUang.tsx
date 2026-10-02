import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import type { TampilanStatus } from '@/constants/investor';
import { GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';

const UKURAN_IKON = 18;
interface BarisRiwayatUangProps {
  judul: string;
  tanggal: string;
  nominal: string;
  status: TampilanStatus;
  ikon: LucideIcon;
  /** Keterangan tambahan, mis. alasan ditolak atau rekening tujuan. */
  catatan?: string | null;
}

/** Satu baris riwayat uang (setoran modal, bagi hasil, uang diterima). */
export function BarisRiwayatUang({ judul, tanggal, nominal, status, ikon: Ikon, catatan }: BarisRiwayatUangProps) {
  const { tw: twTema, warna } = useTemaPersona();
  return (
    <View style={tw`bg-white rounded-2xl p-4 border border-slate-200/70 mb-3`}>
      <View style={tw`flex-row items-start`}>
        <View style={twTema`w-10 h-10 rounded-xl bg-utama-sangat-muda items-center justify-center mr-3`}>
          <Ikon size={UKURAN_IKON} color={warna.utamaKuat} />
        </View>
        <View style={tw`flex-1 pr-3`}>
          <Text style={tw`text-sm font-bold text-slate-900`}>{judul}</Text>
          <Text style={tw`text-xs text-slate-500 mt-0.5`}>{tanggal}</Text>
        </View>
        <Text style={[tw`text-base font-bold text-slate-900`, GAYA_ANGKA_TABULAR]}>{nominal}</Text>
      </View>
      <View style={tw`flex-row items-center mt-3 ml-13`}>
        <LencanaStatus status={status} />
      </View>
      {catatan ? <Text style={tw`text-xs text-slate-600 mt-2 ml-13`}>{catatan}</Text> : null}
    </View>
  );
}
