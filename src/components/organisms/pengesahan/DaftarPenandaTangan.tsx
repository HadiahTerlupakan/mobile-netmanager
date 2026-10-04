import { Users } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

import { BarisPenandaTangan } from '@/components/molecules/BarisPenandaTangan';
import { KartuBagian } from '@/components/molecules/KartuBagian';
import { KemajuanTandaTangan } from '@/components/molecules/KemajuanTandaTangan';
import type { PenandaTanganPengesahan } from '@/types/pengesahan';

interface DaftarPenandaTanganProps {
  penandaTangan: PenandaTanganPengesahan[];
  jumlahSelesai: number;
}

/** Kartu penanda tangan: kemajuan "x dari y" lalu daftar urut penanda tangan. */
export function DaftarPenandaTangan({ penandaTangan, jumlahSelesai }: DaftarPenandaTanganProps) {
  return (
    <KartuBagian judul="Penanda tangan" ikon={Users}>
      <View style={tw`mb-2`}>
        <KemajuanTandaTangan jumlahSelesai={jumlahSelesai} jumlahPenandaTangan={penandaTangan.length} />
      </View>
      {penandaTangan.map((orang, indeks) => (
        <BarisPenandaTangan key={orang.id} penandaTangan={orang} urutan={indeks + 1} />
      ))}
    </KartuBagian>
  );
}
