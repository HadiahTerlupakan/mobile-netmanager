import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { Skeleton } from '@/components/atoms/Skeleton';
import { PilihanMetodeBayar, type MetodeBayar } from '@/components/organisms/tagihan/PilihanMetodeBayar';

const TINGGI_SKELETON = 50;
const SUDUT_SKELETON = 12;

/** Daftar metode bayar beserta keadaan muatnya. */
export interface StatusDaftarMetode {
  metode: MetodeBayar[] | undefined;
  isGagal: boolean;
  onMuatUlang: () => void;
}

interface DaftarMetodeBayarProps {
  daftar: StatusDaftarMetode;
  kodeTerpilih: string;
  onPilih: (kode: string) => void;
}

function GalatMetode({ onMuatUlang }: Pick<StatusDaftarMetode, 'onMuatUlang'>) {
  return (
    <View style={tw`bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex-row items-center`}>
      <Text style={tw`flex-1 text-red-700 text-sm`}>Metode pembayaran gagal dimuat.</Text>
      <TouchableOpacity accessibilityRole="button" onPress={onMuatUlang} style={tw`px-3 py-1.5 bg-red-600 rounded-lg`}>
        <Text style={tw`text-white font-bold text-xs`}>Coba Lagi</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Pilihan metode bayar; galat bisa dimuat ulang, daftar kosong diberi tahu. */
export function DaftarMetodeBayar({ daftar, kodeTerpilih, onPilih }: DaftarMetodeBayarProps) {
  if (daftar.metode?.length) return <PilihanMetodeBayar metode={daftar.metode} kodeTerpilih={kodeTerpilih} onPilih={onPilih} />;
  if (daftar.metode) {
    return <Text style={tw`text-gray-500 text-sm mb-4`}>Tidak ada metode pembayaran tersedia.</Text>;
  }
  if (daftar.isGagal) return <GalatMetode onMuatUlang={daftar.onMuatUlang} />;
  return (
    <View style={tw`gap-2 mb-4`}>
      <Skeleton height={TINGGI_SKELETON} borderRadius={SUDUT_SKELETON} />
      <Skeleton height={TINGGI_SKELETON} borderRadius={SUDUT_SKELETON} />
    </View>
  );
}
