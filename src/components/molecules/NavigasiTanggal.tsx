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
  /** Boleh maju melewati hari ini (agenda rencana); bawaan false untuk riwayat kegiatan. */
  isBolehMasaDepan?: boolean;
}

/** Navigasi per hari; tidak bisa maju melewati hari ini kecuali `isBolehMasaDepan`. */
export function NavigasiTanggal({ tanggal, onGeser, isBolehMasaDepan = false }: NavigasiTanggalProps) {
  const isHariIni = isSameDay(tanggal, new Date());
  const isMajuTerkunci = isHariIni && !isBolehMasaDepan;
  return (
    <View style={tw`flex-row items-center justify-between px-4 mb-3`}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Hari sebelumnya" onPress={() => onGeser(-1)} style={tw`p-2`}>
        <ChevronLeft size={UKURAN_IKON_NAVIGASI} color={WARNA_IKON_NAVIGASI_AKTIF} />
      </TouchableOpacity>
      <Text style={tw`font-semibold text-gray-900`}>{isHariIni ? 'Hari ini' : formatDate(tanggal, 'dd MMM yyyy')}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Hari berikutnya"
        accessibilityState={{ disabled: isMajuTerkunci }}
        disabled={isMajuTerkunci}
        onPress={() => onGeser(1)}
        style={tw`p-2`}
      >
        <ChevronRight
          size={UKURAN_IKON_NAVIGASI}
          color={isMajuTerkunci ? WARNA_IKON_NAVIGASI_NONAKTIF : WARNA_IKON_NAVIGASI_AKTIF}
        />
      </TouchableOpacity>
    </View>
  );
}
