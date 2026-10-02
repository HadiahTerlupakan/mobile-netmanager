import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

const UKURAN_IKON_KEMBALI = 22;
/** slate-900: senada dengan judul. */
const WARNA_IKON_KEMBALI = '#0f172a';

interface KepalaLayarDaftarProps {
  judul: string;
  /** Baris kedua, mis. jumlah data atau penjelasan singkat layar. */
  subjudul: string;
}

/**
 * Kepala layar daftar bergaya premium (tanpa latar): tombol kembali, judul
 * besar, dan subjudul. Dipakai layar daftar yang dibuka dari menu cepat.
 */
export function KepalaLayarDaftar({ judul, subjudul }: KepalaLayarDaftarProps) {
  const router = useRouter();
  return (
    <View style={tw`flex-row items-center px-4 pt-3 pb-2`}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={tw`p-2 -ml-2 mr-1`}>
        <ArrowLeft size={UKURAN_IKON_KEMBALI} color={WARNA_IKON_KEMBALI} />
      </TouchableOpacity>
      <View style={tw`flex-1`}>
        <Text style={tw`text-2xl font-bold text-slate-900`}>{judul}</Text>
        <Text style={tw`text-sm text-slate-500 mt-0.5`}>{subjudul}</Text>
      </View>
    </View>
  );
}
