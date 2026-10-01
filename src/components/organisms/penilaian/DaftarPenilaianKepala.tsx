import React from 'react';
import { FlatList, Text } from 'react-native';
import tw from 'twrnc';

import type { PenilaianKepala } from '@/types/penilaian';
import { urutkanPerSkor } from '@/utils/presurvei/penilaianKinerja';
import { BarisKepalaPenilaian } from './BarisKepalaPenilaian';

/** Ruang kosong di bawah daftar supaya baris terakhir tidak menempel tepi layar. */
const JARAK_BAWAH_DAFTAR = 24;

interface DaftarPenilaianKepalaProps {
  daftar: readonly PenilaianKepala[];
  header: React.ReactElement | null;
  onBuka: (kepalaId: string) => void;
}

/** Daftar kepala sales tervirtualisasi, urut skor (belum terukur di akhir). */
export function DaftarPenilaianKepala({ daftar, header, onBuka }: DaftarPenilaianKepalaProps) {
  return (
    <FlatList
      data={urutkanPerSkor(daftar)}
      keyExtractor={(item) => item.kepalaId}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={tw`text-sm text-gray-500 text-center mt-4`}>Belum ada kepala sales.</Text>}
      renderItem={({ item }) => <BarisKepalaPenilaian penilaian={item} onBuka={() => onBuka(item.kepalaId)} />}
      contentContainerStyle={{ paddingBottom: JARAK_BAWAH_DAFTAR }}
    />
  );
}
