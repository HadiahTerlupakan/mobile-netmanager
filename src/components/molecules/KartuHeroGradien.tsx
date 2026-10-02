import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import tw from 'twrnc';

import { LatarGradien } from '@/components/atoms/LatarGradien';
import { useTemaPersona } from '@/theme';

interface KartuHeroGradienProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Kartu sorotan premium: gradien warna identitas persona (pekat → hampir
 * hitam) dengan ornamen lingkaran samar. Isi memakai teks putih dan
 * `warna.utamaGaris` untuk teks lembut.
 */
export function KartuHeroGradien({ children, style }: KartuHeroGradienProps) {
  const { warna } = useTemaPersona();
  return (
    <View style={[tw`rounded-3xl overflow-hidden`, style]}>
      <LatarGradien dari={warna.gradienAwal} ke={warna.gradienAkhir} />
      <View style={tw`p-5`}>{children}</View>
    </View>
  );
}
