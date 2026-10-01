import React from 'react';
import { Text, View } from 'react-native';

import { useTemaPersona } from '@/theme';
import type { PencapaianPenilaian } from '@/types/penilaian';
import { barisTargetBeranda, TEKS_TARGET_BELUM_DITETAPKAN } from '@/utils/presurvei/berandaSales';
import { lebarBilah } from '@/utils/presurvei/penilaianKinerja';

interface KartuPencapaianPenilaianProps {
  pencapaian: PencapaianPenilaian | null;
}

/** Pencapaian target periode (tercapai / target); target kosong ditulis apa adanya. */
export function KartuPencapaianPenilaian({ pencapaian }: KartuPencapaianPenilaianProps) {
  const { tw } = useTemaPersona();
  const daftar = barisTargetBeranda(pencapaian);
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-3 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-3`}>Pencapaian target</Text>
      {daftar === null ? (
        <Text style={tw`text-sm text-gray-500`}>{TEKS_TARGET_BELUM_DITETAPKAN}</Text>
      ) : (
        daftar.map((baris) => (
          <View key={baris.label} style={tw`mb-3`}>
            <View style={tw`flex-row justify-between items-baseline`}>
              <Text style={tw`text-sm text-gray-700`}>{baris.label}</Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>{`${baris.teks} · ${baris.persen}%`}</Text>
            </View>
            <View style={tw`h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden`}>
              <View style={[tw`h-2 bg-utama rounded-full`, { width: `${lebarBilah(baris.persen)}%` }]} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}
