import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface KartuCheckoutKedaluwarsaProps {
  onPilihMetode: () => void;
}

/**
 * Pengganti instruksi bayar yang lewat batas waktunya: nomor VA, kode, atau
 * QRIS lama ditolak gateway, jadi tidak ditampilkan lagi.
 */
export function KartuCheckoutKedaluwarsa({ onPilihMetode }: KartuCheckoutKedaluwarsaProps) {
  return (
    <View>
      <Text style={tw`text-sm text-gray-700`}>
        Instruksi pembayaran ini sudah tidak berlaku. Pilih metode pembayaran untuk membuat yang baru.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onPilihMetode}
        style={tw`bg-teal-600 mt-4 py-3 rounded-xl items-center`}
      >
        <Text style={tw`text-white font-bold`}>Pilih Metode Lagi</Text>
      </TouchableOpacity>
    </View>
  );
}
