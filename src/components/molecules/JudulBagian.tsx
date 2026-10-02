import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { useTemaPersona } from '@/theme';

interface JudulBagianProps {
  judul: string;
  /** Teks tautan di kanan, mis. "Lihat semua". */
  aksi?: { label: string; onTekan: () => void };
}

/** Judul bagian layar investor dengan tautan opsional di kanan. */
export function JudulBagian({ judul, aksi }: JudulBagianProps) {
  const { tw: twTema } = useTemaPersona();
  return (
    <View style={tw`flex-row items-center justify-between mt-7 mb-3`}>
      <Text style={tw`flex-1 mr-3 text-base font-bold text-slate-900`}>{judul}</Text>
      {aksi ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={aksi.label} onPress={aksi.onTekan}>
          <Text style={twTema`text-sm font-semibold text-utama-kuat`}>{aksi.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
