import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

const UKURAN_IKON_KEMBALI = 24;
const WARNA_IKON_KEMBALI = '#111827';
const PERLUASAN_SENTUH = { top: 12, bottom: 12, left: 12, right: 12 };

interface KepalaLayarProps {
  judul: string;
  /** Nonaktifkan tombol kembali, mis. selama menyimpan yang akan menutup layar. */
  isKembaliNonaktif?: boolean;
}

/**
 * Kepala layar penuh: tombol kembali + judul. Judul memakai sisa lebar dan
 * dikunci satu baris — tanpa itu Android bisa memecah kata terakhir ke baris
 * kedua yang terpotong (terjadi pada "Tambah Prospek").
 */
export function KepalaLayar({ judul, isKembaliNonaktif = false }: KepalaLayarProps) {
  const router = useRouter();
  return (
    <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Kembali"
        accessibilityState={{ disabled: isKembaliNonaktif }}
        disabled={isKembaliNonaktif}
        hitSlop={PERLUASAN_SENTUH}
        onPress={() => router.back()}
      >
        <ChevronLeft size={UKURAN_IKON_KEMBALI} color={WARNA_IKON_KEMBALI} />
      </TouchableOpacity>
      <Text numberOfLines={1} style={tw`ml-2 flex-1 text-lg font-bold text-gray-900`}>
        {judul}
      </Text>
    </View>
  );
}
