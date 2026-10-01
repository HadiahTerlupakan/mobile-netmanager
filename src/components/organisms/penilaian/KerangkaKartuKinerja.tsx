import { Award, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

const UKURAN_IKON_JUDUL = 18;
const UKURAN_IKON_BUKA = 18;
const WARNA_JUDUL = '#111827';
const WARNA_ABU = '#9ca3af';

interface KerangkaKartuKinerjaProps {
  judul: string;
  onBuka: () => void;
  children: React.ReactNode;
}

/** Bingkai kartu kinerja di Beranda: judul berikon, isi, seluruh kartu bisa diketuk. */
export function KerangkaKartuKinerja({ judul, onBuka, children }: KerangkaKartuKinerjaProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${judul}, buka rincian penilaian`}
      onPress={onBuka}
      style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm`}
    >
      <View style={tw`flex-row items-center mb-3`}>
        <Award size={UKURAN_IKON_JUDUL} color={WARNA_JUDUL} />
        <Text style={tw`flex-1 font-bold text-gray-900 ml-2`}>{judul}</Text>
        <ChevronRight size={UKURAN_IKON_BUKA} color={WARNA_ABU} />
      </View>
      {children}
    </TouchableOpacity>
  );
}
