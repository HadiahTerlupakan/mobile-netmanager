import { X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

const UKURAN_IKON_TUTUP = 18;
/** amber-800 */
const WARNA_IKON_TUTUP = '#92400e';

interface SpandukPesanLoginProps {
  pesan: string;
  onTutup: () => void;
}

/** Alasan sesi berakhir atau login ditolak; tetap tampil sampai ditutup, tidak hilang seperti toast. */
export function SpandukPesanLogin({ pesan, onTutup }: SpandukPesanLoginProps) {
  return (
    <View accessibilityRole="alert" style={tw`w-full max-w-sm flex-row items-start rounded-xl border border-amber-200 bg-amber-50 p-3 mb-6`}>
      <Text style={tw`flex-1 text-sm text-amber-900`}>{pesan}</Text>
      <TouchableOpacity onPress={onTutup} accessibilityRole="button" accessibilityLabel="Tutup pesan" style={tw`ml-2`}>
        <X size={UKURAN_IKON_TUTUP} color={WARNA_IKON_TUTUP} />
      </TouchableOpacity>
    </View>
  );
}
