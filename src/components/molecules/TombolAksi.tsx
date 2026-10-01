import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { useTemaPersona } from '@/theme';

interface TombolAksiProps {
  label: string;
  onPress: () => void;
  isAktif: boolean;
  varian?: 'utama' | 'kedua';
}

/** Tombol aksi lebar penuh; nonaktif tampil abu-abu dan tidak bisa ditekan. */
export function TombolAksi({ label, onPress, isAktif, varian = 'utama' }: TombolAksiProps) {
  const { tw } = useTemaPersona();
  const gayaLatar = !isAktif ? 'bg-gray-300' : varian === 'utama' ? 'bg-utama-kuat' : 'bg-white border border-utama-kuat';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isAktif }}
      disabled={!isAktif}
      onPress={onPress}
      style={tw`rounded-xl py-3 items-center mb-2 ${gayaLatar}`}
    >
      <Text style={tw`font-bold ${varian === 'kedua' && isAktif ? 'text-utama-kuat' : 'text-white'}`}>{label}</Text>
    </TouchableOpacity>
  );
}
