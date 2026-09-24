import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { formatDate, isSameDay } from '@/utils/date';

/** Ukuran dan warna ikon navigasi tanggal. */
const UKURAN_IKON_NAVIGASI = 20;
const WARNA_IKON_NAVIGASI_AKTIF = '#374151';
const WARNA_IKON_NAVIGASI_NONAKTIF = '#d1d5db';

interface NavigasiTanggalProps {
  tanggal: Date;
  onGeser: (jumlahHari: number) => void;
}

/** Navigasi per hari; tidak bisa maju melewati hari ini. */
export function NavigasiTanggal({ tanggal, onGeser }: NavigasiTanggalProps) {
  const isHariIni = isSameDay(tanggal, new Date());
  return (
    <View style={tw`flex-row items-center justify-between px-4 mb-3`}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Hari sebelumnya" onPress={() => onGeser(-1)} style={tw`p-2`}>
        <ChevronLeft size={UKURAN_IKON_NAVIGASI} color={WARNA_IKON_NAVIGASI_AKTIF} />
      </TouchableOpacity>
      <Text style={tw`font-semibold text-gray-900`}>{isHariIni ? 'Hari ini' : formatDate(tanggal, 'dd MMM yyyy')}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Hari berikutnya"
        accessibilityState={{ disabled: isHariIni }}
        disabled={isHariIni}
        onPress={() => onGeser(1)}
        style={tw`p-2`}
      >
        <ChevronRight
          size={UKURAN_IKON_NAVIGASI}
          color={isHariIni ? WARNA_IKON_NAVIGASI_NONAKTIF : WARNA_IKON_NAVIGASI_AKTIF}
        />
      </TouchableOpacity>
    </View>
  );
}
