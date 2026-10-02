import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

import { DESAIN_PREMIUM } from '@/theme';
import type { PenilaianSales } from '@/types/penilaian';
import { daftarIndikatorSales } from '@/utils/presurvei/penilaianKinerja';
import { BilahIndikator } from './BilahIndikator';
import { KerangkaKartuKinerja } from './KerangkaKartuKinerja';
import { SkorDanPredikat } from './SkorDanPredikat';

interface KartuKinerjaSayaProps {
  penilaian: PenilaianSales;
  onBuka: () => void;
}

/** Beranda sales: skor bulan ini (emas), predikat, dan tiga indikator ringkas. */
export function KartuKinerjaSaya({ penilaian, onBuka }: KartuKinerjaSayaProps) {
  return (
    <KerangkaKartuKinerja judul="Kinerja saya bulan ini" onBuka={onBuka}>
      <SkorDanPredikat skor={penilaian.skor} predikat={penilaian.predikat} isDiAtasGelap />
      <View style={[tw`mt-4 pt-3 border-t`, { borderColor: DESAIN_PREMIUM.garisDiAtasGelap }]}>
        {daftarIndikatorSales(penilaian.indikator).map((baris) => (
          <BilahIndikator key={baris.kunci} baris={baris} isRingkas isDiAtasGelap />
        ))}
      </View>
    </KerangkaKartuKinerja>
  );
}
