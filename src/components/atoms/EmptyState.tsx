import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { useTemaPersona } from '@/theme';

const UKURAN_IKON = 28;

interface EmptyStateProps {
  ikon: LucideIcon;
  judul: string;
  pesan?: string;
  /** Ajakan bertindak, mis. "Catat kegiatan". */
  aksi?: { label: string; onTekan: () => void };
}

/** Keadaan kosong: ikon bertema persona dalam lingkaran, judul, pesan, ajakan bertindak opsional. */
export function EmptyState({ ikon: Ikon, judul, pesan, aksi }: EmptyStateProps) {
  const { tw: twTema, warna } = useTemaPersona();
  return (
    <View style={tw`items-center px-8 py-12`}>
      <View style={twTema`w-16 h-16 rounded-2xl bg-utama-sangat-muda items-center justify-center mb-4`}>
        <Ikon size={UKURAN_IKON} color={warna.utamaKuat} />
      </View>
      <Text style={tw`text-base font-bold text-slate-900 text-center`}>{judul}</Text>
      {pesan ? <Text style={tw`text-sm text-slate-500 text-center mt-1.5 leading-5`}>{pesan}</Text> : null}
      {aksi ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={aksi.label}
          onPress={aksi.onTekan}
          style={twTema`mt-5 px-5 py-2.5 rounded-full bg-utama-sangat-muda`}
        >
          <Text style={twTema`text-sm font-semibold text-utama-kuat`}>{aksi.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
