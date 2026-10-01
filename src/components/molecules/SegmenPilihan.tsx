import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { OpsiChip } from './PilihanChip';

interface SegmenPilihanProps<T extends string> {
  opsi: readonly OpsiChip<T>[];
  terpilih: T;
  onPilih: (nilai: T) => void;
}

/** Kontrol segmen selebar kontainer: satu pilihan aktif ditandai pil putih. */
export function SegmenPilihan<T extends string>({ opsi, terpilih, onPilih }: SegmenPilihanProps<T>) {
  return (
    <View style={tw`flex-row bg-gray-100 rounded-xl p-1`}>
      {opsi.map((pilihan) => {
        const isTerpilih = pilihan.nilai === terpilih;
        return (
          <TouchableOpacity
            key={pilihan.nilai}
            accessibilityRole="button"
            accessibilityLabel={pilihan.label}
            accessibilityState={{ selected: isTerpilih }}
            onPress={() => onPilih(pilihan.nilai)}
            style={tw`flex-1 items-center py-2 rounded-lg ${isTerpilih ? 'bg-white shadow-sm' : ''}`}
          >
            <Text style={tw`text-sm ${isTerpilih ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>
              {pilihan.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
