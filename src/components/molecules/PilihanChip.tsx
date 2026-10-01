import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTemaPersona } from '@/theme';

/** Satu opsi chip. */
export interface OpsiChip<T extends string> {
  nilai: T;
  label: string;
}

interface PilihanChipProps<T extends string> {
  opsi: readonly OpsiChip<T>[];
  terpilih: T | null;
  onPilih: (nilai: T) => void;
}

/** Deretan chip pilihan tunggal. */
export function PilihanChip<T extends string>({ opsi, terpilih, onPilih }: PilihanChipProps<T>) {
  const { tw } = useTemaPersona();
  return (
    <View style={tw`flex-row flex-wrap -m-1`}>
      {opsi.map((pilihan) => {
        const isTerpilih = pilihan.nilai === terpilih;
        return (
          <TouchableOpacity
            key={pilihan.nilai}
            accessibilityRole="button"
            accessibilityLabel={pilihan.label}
            accessibilityState={{ selected: isTerpilih }}
            onPress={() => onPilih(pilihan.nilai)}
            style={tw`m-1 px-3 py-2 rounded-full border ${isTerpilih ? 'bg-utama-kuat border-utama-kuat' : 'bg-white border-gray-300'}`}
          >
            <Text style={tw`text-sm ${isTerpilih ? 'text-white font-semibold' : 'text-gray-700'}`}>
              {pilihan.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
