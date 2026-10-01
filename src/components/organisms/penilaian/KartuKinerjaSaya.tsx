import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

import type { PenilaianSales } from '@/types/penilaian';
import { daftarIndikatorSales } from '@/utils/presurvei/penilaianKinerja';
import { BilahIndikator } from './BilahIndikator';
import { KerangkaKartuKinerja } from './KerangkaKartuKinerja';
import { SkorDanPredikat } from './SkorDanPredikat';

interface KartuKinerjaSayaProps {
  penilaian: PenilaianSales;
  onBuka: () => void;
}

/** Beranda sales: skor bulan ini, predikat, dan tiga indikator ringkas. */
export function KartuKinerjaSaya({ penilaian, onBuka }: KartuKinerjaSayaProps) {
  return (
    <KerangkaKartuKinerja judul="Kinerja saya bulan ini" onBuka={onBuka}>
      <SkorDanPredikat skor={penilaian.skor} predikat={penilaian.predikat} />
      <View style={tw`mt-3`}>
        {daftarIndikatorSales(penilaian.indikator).map((baris) => (
          <BilahIndikator key={baris.kunci} baris={baris} isRingkas />
        ))}
      </View>
    </KerangkaKartuKinerja>
  );
}
