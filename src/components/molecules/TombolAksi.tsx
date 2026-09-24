import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';

interface TombolAksiProps {
  label: string;
  onPress: () => void;
  isAktif: boolean;
  varian?: 'utama' | 'kedua';
}

/** Tombol aksi lebar penuh; nonaktif tampil abu-abu dan tidak bisa ditekan. */
export function TombolAksi({ label, onPress, isAktif, varian = 'utama' }: TombolAksiProps) {
  const warna = !isAktif ? 'bg-gray-300' : varian === 'utama' ? 'bg-blue-600' : 'bg-white border border-blue-600';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isAktif }}
      disabled={!isAktif}
      onPress={onPress}
      style={tw`rounded-xl py-3 items-center mb-2 ${warna}`}
    >
      <Text style={tw`font-bold ${varian === 'kedua' && isAktif ? 'text-blue-600' : 'text-white'}`}>{label}</Text>
    </TouchableOpacity>
  );
}
