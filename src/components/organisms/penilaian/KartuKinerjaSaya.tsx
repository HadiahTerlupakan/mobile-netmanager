import { Award, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuHeroGradien } from '@/components/molecules/KartuHeroGradien';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import type { PenilaianSales } from '@/types/penilaian';
import { daftarIndikatorSales } from '@/utils/presurvei/penilaianKinerja';
import { BilahIndikator } from './BilahIndikator';
import { SkorDanPredikat } from './SkorDanPredikat';

const UKURAN_IKON = 16;
const JUDUL = 'Kinerja saya bulan ini';

interface KartuKinerjaSayaProps {
  penilaian: PenilaianSales;
  onBuka: () => void;
}

/**
 * Kartu sorotan Beranda sales: skor bulan ini (emas), predikat, dan tiga
 * indikator ringkas di atas gradien warna persona. Seluruh kartu membuka
 * rincian penilaian.
 */
export function KartuKinerjaSaya({ penilaian, onBuka }: KartuKinerjaSayaProps) {
  const { warna } = useTemaPersona();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${JUDUL}, buka rincian penilaian`}
      onPress={onBuka}
      activeOpacity={0.85}
      style={tw`mb-3`}
    >
      <KartuHeroGradien>
        <View style={tw`flex-row items-center mb-4`}>
          <Award size={UKURAN_IKON} color={DESAIN_PREMIUM.aksenEmas} />
          <Text style={[tw`flex-1 ml-2 text-xs font-semibold uppercase tracking-wider`, { color: warna.utamaGaris }]}>
            {JUDUL}
          </Text>
          <ChevronRight size={UKURAN_IKON} color={warna.utamaGaris} />
        </View>
        <SkorDanPredikat skor={penilaian.skor} predikat={penilaian.predikat} isDiAtasGelap />
        <View style={[tw`mt-4 pt-3 border-t`, { borderColor: DESAIN_PREMIUM.garisDiAtasGelap }]}>
          {daftarIndikatorSales(penilaian.indikator).map((baris) => (
            <BilahIndikator key={baris.kunci} baris={baris} isRingkas isDiAtasGelap />
          ))}
        </View>
      </KartuHeroGradien>
    </TouchableOpacity>
  );
}
