import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

interface BilahKemajuanProps {
  /** 0–100. */
  persen: number;
  warnaIsi: string;
  warnaLatar: string;
  tinggi?: number;
}

const TINGGI_BAWAAN = 8;
const PERSEN_PENUH = 100;

/** Bilah kemajuan horizontal, mis. bagian modal yang sudah kembali. */
export function BilahKemajuan({ persen, warnaIsi, warnaLatar, tinggi = TINGGI_BAWAAN }: BilahKemajuanProps) {
  const lebar = Math.min(PERSEN_PENUH, Math.max(0, persen));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: PERSEN_PENUH, now: Math.round(lebar) }}
      style={[tw`w-full rounded-full overflow-hidden`, { height: tinggi, backgroundColor: warnaLatar }]}
    >
      <View style={[tw`h-full rounded-full`, { width: `${lebar}%`, backgroundColor: warnaIsi }]} />
    </View>
  );
}
