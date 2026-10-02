import { X } from 'lucide-react-native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { TeksKesalahan } from '@/components/atoms/TeksKesalahan';
import { useTemaPersona } from '@/theme';

const UKURAN_IKON_HAPUS_FOTO = 12;
const WARNA_IKON_HAPUS_FOTO = '#ffffff';

/** Satu tombol penambah foto, mis. "Kamera" atau "Galeri". */
export interface TombolTambahFoto {
  label: string;
  onTekan: () => void;
}

interface BlokFotoProps {
  judul: string;
  fotoLokal: readonly string[];
  jumlahMaks: number;
  tombolTambah: readonly TombolTambahFoto[];
  onHapus: (uri: string) => void;
  petunjuk?: string;
  kesalahan?: string;
  /** Tandai "(wajib diisi)" merah seperti judul isian lain. */
  isWajib?: boolean;
}

/** Kartu foto formulir: pratinjau dengan tombol hapus, penghitung, dan tombol tambah sampai batas. */
export function BlokFoto({ judul, fotoLokal, jumlahMaks, tombolTambah, onHapus, petunjuk, kesalahan, isWajib }: BlokFotoProps) {
  const { tw } = useTemaPersona();
  const isPenuh = fotoLokal.length >= jumlahMaks;
  return (
    <KartuFormulir>
      <Text style={tw`font-bold text-gray-900 ${petunjuk ? '' : 'mb-2'}`}>
        {`${judul} (${fotoLokal.length}/${jumlahMaks}) `}
        {isWajib ? <Text style={tw`text-red-600`}>(wajib diisi)</Text> : null}
      </Text>
      {petunjuk ? <Text style={tw`text-xs text-gray-500 mb-2`}>{petunjuk}</Text> : null}
      <View style={tw`flex-row flex-wrap`}>
        {fotoLokal.map((uri, indeks) => (
          <View key={uri} style={tw`w-20 h-20 mr-2 mb-2 rounded-lg overflow-hidden`}>
            <Image source={{ uri }} style={tw`w-full h-full`} />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Hapus foto ${indeks + 1}`}
              onPress={() => onHapus(uri)}
              style={tw`absolute top-1 right-1 bg-black/60 rounded-full p-1`}
            >
              <X size={UKURAN_IKON_HAPUS_FOTO} color={WARNA_IKON_HAPUS_FOTO} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      {!isPenuh ? (
        <View style={tw`flex-row mt-1`}>
          {tombolTambah.map((tombol, indeks) => (
            <TouchableOpacity
              key={tombol.label}
              accessibilityRole="button"
              onPress={tombol.onTekan}
              style={tw`flex-1 ${indeks > 0 ? 'ml-2' : ''} border border-dashed border-utama-lembut rounded-xl py-3 items-center`}
            >
              <Text style={tw`text-utama-kuat font-semibold`}>{tombol.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <TeksKesalahan pesan={kesalahan} />
    </KartuFormulir>
  );
}
