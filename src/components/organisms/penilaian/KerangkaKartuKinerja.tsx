import { Award, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuHeroGradien } from '@/components/molecules/KartuHeroGradien';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';

const UKURAN_IKON = 16;
/** Redup ringan saat kartu ditekan; kartu bergradien tetap terbaca. */
const OPASITAS_SAAT_DITEKAN = 0.85;

interface KerangkaKartuKinerjaProps {
  judul: string;
  onBuka: () => void;
  children: React.ReactNode;
}

/**
 * Bingkai kartu kinerja di Beranda: kartu sorotan bergradien warna persona
 * dengan judul berikon emas; seluruh kartu bisa diketuk. Isi memakai varian
 * `isDiAtasGelap` (skor emas, teks terang).
 */
export function KerangkaKartuKinerja({ judul, onBuka, children }: KerangkaKartuKinerjaProps) {
  const { warna } = useTemaPersona();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${judul}, buka rincian penilaian`}
      onPress={onBuka}
      activeOpacity={OPASITAS_SAAT_DITEKAN}
      style={tw`mb-3`}
    >
      <KartuHeroGradien>
        <View style={tw`flex-row items-center mb-4`}>
          <Award size={UKURAN_IKON} color={DESAIN_PREMIUM.aksenEmas} />
          <Text style={[tw`flex-1 ml-2 text-xs font-semibold uppercase tracking-wider`, { color: warna.utamaGaris }]}>
            {judul}
          </Text>
          <ChevronRight size={UKURAN_IKON} color={warna.utamaGaris} />
        </View>
        {children}
      </KartuHeroGradien>
    </TouchableOpacity>
  );
}

/** Kotak "Perlu perhatian: …" di atas kartu sorotan gelap. */
export function PetunjukPerhatianGelap({ teks }: { teks: string }) {
  return (
    <View style={[tw`rounded-xl px-3 py-2 mt-4`, { backgroundColor: DESAIN_PREMIUM.garisDiAtasGelap }]}>
      <Text style={tw`text-xs text-white/90`}>
        <Text style={[tw`font-semibold`, { color: DESAIN_PREMIUM.aksenEmas }]}>Perlu perhatian: </Text>
        {teks}
      </Text>
    </View>
  );
}
