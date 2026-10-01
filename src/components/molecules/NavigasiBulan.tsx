import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

const UKURAN_IKON_NAVIGASI = 20;
const WARNA_IKON_AKTIF = '#374151';
const WARNA_IKON_NONAKTIF = '#d1d5db';
const MUNDUR_SEBULAN = -1;
const MAJU_SEBULAN = 1;

interface NavigasiBulanProps {
  label: string;
  isBolehMaju: boolean;
  onGeser: (jumlahBulan: number) => void;
}

/** Navigasi per bulan; tombol maju terkunci bila `isBolehMaju` false (bulan berjalan). */
export function NavigasiBulan({ label, isBolehMaju, onGeser }: NavigasiBulanProps) {
  return (
    <View style={tw`flex-row items-center justify-between mb-2`}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Bulan sebelumnya" onPress={() => onGeser(MUNDUR_SEBULAN)} style={tw`p-2`}>
        <ChevronLeft size={UKURAN_IKON_NAVIGASI} color={WARNA_IKON_AKTIF} />
      </TouchableOpacity>
      <Text style={tw`font-semibold text-gray-900`}>{label}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Bulan berikutnya"
        accessibilityState={{ disabled: !isBolehMaju }}
        disabled={!isBolehMaju}
        onPress={() => onGeser(MAJU_SEBULAN)}
        style={tw`p-2`}
      >
        <ChevronRight size={UKURAN_IKON_NAVIGASI} color={isBolehMaju ? WARNA_IKON_AKTIF : WARNA_IKON_NONAKTIF} />
      </TouchableOpacity>
    </View>
  );
}
