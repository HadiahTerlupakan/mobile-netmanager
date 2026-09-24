import { X } from 'lucide-react-native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { TeksKesalahan } from '@/components/atoms/TeksKesalahan';
import { JUMLAH_FOTO_KEGIATAN_MAKS } from '@/constants/presurvei';

/** Ukuran dan warna ikon hapus foto. */
const UKURAN_IKON_HAPUS_FOTO = 12;
const WARNA_IKON_HAPUS_FOTO = '#ffffff';

interface BlokFotoBuktiProps {
  fotoLokal: readonly string[];
  kesalahan?: string;
  onTambah: () => void;
  onHapus: (uri: string) => void;
}

/** Foto bukti kegiatan lapangan: minimal satu, maksimal enam, dari kamera. */
export function BlokFotoBukti({ fotoLokal, kesalahan, onTambah, onHapus }: BlokFotoBuktiProps) {
  const isPenuh = fotoLokal.length >= JUMLAH_FOTO_KEGIATAN_MAKS;
  return (
    <KartuFormulir>
      <Text style={tw`font-bold text-gray-900 mb-2`}>
        {`Foto bukti (${fotoLokal.length}/${JUMLAH_FOTO_KEGIATAN_MAKS})`}
      </Text>
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
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onTambah}
          style={tw`mt-1 border border-dashed border-blue-400 rounded-xl py-3 items-center`}
        >
          <Text style={tw`text-blue-600 font-semibold`}>Ambil Foto</Text>
        </TouchableOpacity>
      ) : null}
      <TeksKesalahan pesan={kesalahan} />
    </KartuFormulir>
  );
}
