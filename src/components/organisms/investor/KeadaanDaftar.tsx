import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import tw from 'twrnc';

import { QueryErrorState } from '@/components/molecules/QueryErrorState';

interface KeadaanDaftarProps {
  isMemuat: boolean;
  isGalat: boolean;
  isKosong: boolean;
  pesanKosong: string;
  onUlang: () => void;
  children: React.ReactNode;
}

/**
 * Bungkus isi layar investor: memuat → putaran, galat → tombol coba lagi,
 * kosong → kalimat penjelas; selain itu tampilkan isi.
 */
export function KeadaanDaftar({ isMemuat, isGalat, isKosong, pesanKosong, onUlang, children }: KeadaanDaftarProps) {
  if (isMemuat) {
    return (
      <View style={tw`py-16 items-center`}>
        <ActivityIndicator accessibilityLabel="Memuat" />
      </View>
    );
  }
  if (isGalat) return <QueryErrorState onRetry={onUlang} />;
  if (isKosong) {
    return <Text style={tw`text-center text-gray-500 py-16 px-6`}>{pesanKosong}</Text>;
  }
  return <>{children}</>;
}
