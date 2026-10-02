import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import type { TampilanStatus } from '@/constants/investor';

interface BarisRiwayatUangProps {
  judul: string;
  tanggal: string;
  nominal: string;
  status: TampilanStatus;
  /** Keterangan tambahan, mis. alasan ditolak atau rekening tujuan. */
  catatan?: string | null;
}

/** Satu baris riwayat uang (setoran modal, bagi hasil, uang diterima). */
export function BarisRiwayatUang({ judul, tanggal, nominal, status, catatan }: BarisRiwayatUangProps) {
  return (
    <View style={tw`bg-white rounded-xl p-4 border border-gray-100 mb-3`}>
      <View style={tw`flex-row items-start`}>
        <View style={tw`flex-1 pr-3`}>
          <Text style={tw`text-base font-semibold text-gray-900`}>{judul}</Text>
          <Text style={tw`text-xs text-gray-500 mt-0.5`}>{tanggal}</Text>
        </View>
        <Text style={tw`text-base font-bold text-gray-900`}>{nominal}</Text>
      </View>
      <View style={tw`mt-2`}>
        <LencanaStatus status={status} />
      </View>
      {catatan ? <Text style={tw`text-xs text-gray-600 mt-2`}>{catatan}</Text> : null}
    </View>
  );
}
