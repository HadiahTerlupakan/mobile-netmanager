import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { useKegiatanProspek } from '@/hooks/queries/usePresurveiKegiatan';
import { keBarisKegiatan } from '@/utils/presurvei/daftarKegiatan';
import { KartuKegiatan } from './KartuKegiatan';

interface RiwayatKegiatanProspekProps {
  prospekId: string;
}

/** Riwayat kegiatan yang tertaut ke prospek, terbaru lebih dulu. */
export function RiwayatKegiatanProspek({ prospekId }: RiwayatKegiatanProspekProps) {
  const riwayat = useKegiatanProspek(prospekId);
  const baris = (riwayat.data?.data ?? []).map(keBarisKegiatan);
  return (
    <View style={tw`px-4 pb-24`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Riwayat kegiatan</Text>
      {riwayat.isError ? <Text style={tw`text-sm text-red-600`}>Riwayat gagal dimuat.</Text> : null}
      {baris.length === 0 && !riwayat.isPending ? <Text style={tw`text-sm text-gray-500`}>Belum ada kegiatan.</Text> : null}
      {baris.map((item) => <KartuKegiatan key={item.kunci} baris={item} />)}
    </View>
  );
}
