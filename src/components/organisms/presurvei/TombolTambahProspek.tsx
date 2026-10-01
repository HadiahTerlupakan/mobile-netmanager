import { UserPlus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';

const UKURAN_IKON = 20;
const WARNA_IKON = '#ffffff';

interface TombolTambahProspekProps {
  label: string;
  onTekan: () => void;
}

/** Tombol biru menonjol untuk membuka form Tambah Prospek. */
export function TombolTambahProspek({ label, onTekan }: TombolTambahProspekProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onTekan}
      style={tw`flex-row items-center justify-center min-h-12 bg-blue-600 rounded-xl py-3 mb-3`}
    >
      <UserPlus size={UKURAN_IKON} color={WARNA_IKON} />
      {/* Satu baris: tanpa ini Android bisa memecah kata terakhir ke baris kedua yang terpotong tinggi tombol. */}
      <Text numberOfLines={1} style={tw`ml-2 text-base font-bold text-white`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
