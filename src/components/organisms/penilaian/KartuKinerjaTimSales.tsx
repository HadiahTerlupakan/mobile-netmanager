import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { PenilaianKepala } from '@/types/penilaian';
import { formatSkor, gayaPredikat, labelPredikat, predikatDariNilai } from '@/utils/presurvei/penilaianKinerja';
import { ringkasKepala, type SebaranPredikat } from '@/utils/presurvei/tampilanPenilaian';
import { KerangkaKartuKinerja, PetunjukPerhatianGelap } from './KerangkaKartuKinerja';
import { SkorDanPredikat } from './SkorDanPredikat';

interface KartuKinerjaTimSalesProps {
  kepala: readonly PenilaianKepala[];
  onBuka: () => void;
}

/** Deret pil kecil "Baik 3" per predikat. */
function SebaranRingkas({ sebaran }: { sebaran: readonly SebaranPredikat[] }) {
  return (
    <View style={tw`flex-row flex-wrap mt-4 -m-0.5`}>
      {sebaran.map(({ predikat, jumlah }) => {
        const gaya = gayaPredikat(predikat);
        return (
          <View key={predikat ?? 'belum'} style={tw`${gaya.latar} rounded-full px-2 py-0.5 m-0.5`}>
            <Text style={tw`text-[11px] font-semibold ${gaya.teks}`}>{`${labelPredikat(predikat)} ${jumlah}`}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Beranda lingkup SEMUA (admin/manajer): rata-rata skor kepala sales yang
 * terukur, jumlah kepala, sebaran predikat, dan kepala dengan skor terendah.
 */
export function KartuKinerjaTimSales({ kepala, onBuka }: KartuKinerjaTimSalesProps) {
  const ringkasan = ringkasKepala(kepala);
  return (
    <KerangkaKartuKinerja judul="Kinerja tim sales bulan ini" onBuka={onBuka}>
      <SkorDanPredikat
        skor={ringkasan.rataRataSkor}
        predikat={predikatDariNilai(ringkasan.rataRataSkor)}
        keterangan={`Rata-rata ${ringkasan.jumlah} kepala sales`}
        isDiAtasGelap
      />
      <SebaranRingkas sebaran={ringkasan.sebaran} />
      {ringkasan.terendah ? (
        <PetunjukPerhatianGelap teks={`${ringkasan.terendah.nama} (${formatSkor(ringkasan.terendah.skor)})`} />
      ) : null}
    </KerangkaKartuKinerja>
  );
}
