import { Bell } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

const UKURAN_IKON = 24;
const BATAS_ANGKA_LENCANA = 99;

interface TombolLoncengProps {
  jumlah: number;
  onTekan: () => void;
  warna: string;
}

/** Lonceng dengan lencana jumlah belum dibaca; sumber angkanya urusan pemanggil. */
export function TombolLonceng({ jumlah, onTekan, warna }: TombolLoncengProps) {
  return (
    <TouchableOpacity
      onPress={onTekan}
      accessibilityRole="button"
      accessibilityLabel={jumlah > 0 ? `Notifikasi, ${jumlah} belum dibaca` : 'Notifikasi'}
      style={tw`relative p-2`}
    >
      <Bell size={UKURAN_IKON} color={warna} />
      {jumlah > 0 && (
        <View style={tw`absolute -top-0 -right-0 bg-red-500 rounded-full min-w-5 h-5 items-center justify-center px-1`}>
          <Text style={tw`text-white text-xs font-bold`}>{jumlah > BATAS_ANGKA_LENCANA ? `${BATAS_ANGKA_LENCANA}+` : jumlah}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
