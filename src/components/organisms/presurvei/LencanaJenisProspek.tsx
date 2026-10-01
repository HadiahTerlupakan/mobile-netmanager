import { Handshake } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { ProspekJenis } from '@/constants/presurvei';
import { teksLencanaJenisProspek } from '@/utils/presurvei/jenisProspek';

const UKURAN_IKON = 14;
const WARNA_IKON = '#6b21a8';

interface LencanaJenisProspekProps {
  prospek: { jenis: ProspekJenis; peran: string | null };
}

/**
 * Lencana ungu "Perantara · Ketua RT 03" supaya perantara tidak tertukar
 * dengan calon pelanggan. Calon pelanggan (jenis bawaan) tanpa lencana.
 */
export function LencanaJenisProspek({ prospek }: LencanaJenisProspekProps) {
  const teks = teksLencanaJenisProspek(prospek);
  if (teks === null) return null;
  return (
    <View testID="lencana-perantara" style={tw`flex-row items-center self-start bg-purple-100 rounded-full px-2 py-0.5 my-1`}>
      <Handshake size={UKURAN_IKON} color={WARNA_IKON} />
      <Text style={tw`ml-1 text-xs font-semibold text-purple-800 flex-shrink`} numberOfLines={1}>
        {teks}
      </Text>
    </View>
  );
}
