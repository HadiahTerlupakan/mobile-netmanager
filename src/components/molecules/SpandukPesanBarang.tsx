import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, Info, RefreshCw } from 'lucide-react-native';
import tw from 'twrnc';

interface SpandukPesanBarangProps {
  judul: string;
  pesan: string;
  /** `galat` = gagal dimuat (merah), `info` = datanya memang kosong (kuning). */
  nada?: 'galat' | 'info';
  onCobaLagi?: () => void;
}

/**
 * Spanduk kecil di bawah kotak pilihan gudang/barang. Tanpa ini, daftar yang
 * gagal dimuat (mis. akun belum diberi site) tampil kosong begitu saja dan
 * staf tidak tahu kenapa tidak ada pilihan.
 */
export function SpandukPesanBarang({ judul, pesan, nada = 'galat', onCobaLagi }: SpandukPesanBarangProps) {
  const isGalat = nada === 'galat';
  const Ikon = isGalat ? AlertTriangle : Info;

  return (
    <View
      accessibilityRole="alert"
      style={tw`mt-2 p-3 rounded-lg border ${isGalat ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}
    >
      <View style={tw`flex-row items-start`}>
        <Ikon size={18} color={isGalat ? '#b91c1c' : '#a16207'} />
        <View style={tw`flex-1 ml-2`}>
          <Text style={tw`font-bold text-sm ${isGalat ? 'text-red-800' : 'text-yellow-900'}`}>{judul}</Text>
          <Text style={tw`text-sm mt-0.5 ${isGalat ? 'text-red-800' : 'text-yellow-900'}`}>{pesan}</Text>
        </View>
      </View>
      {onCobaLagi && (
        <TouchableOpacity
          onPress={onCobaLagi}
          accessibilityRole="button"
          accessibilityLabel="Coba muat lagi"
          style={tw`mt-2 self-start flex-row items-center bg-red-600 px-3 py-2 rounded-lg`}
        >
          <RefreshCw size={14} color="white" />
          <Text style={tw`text-white font-bold text-sm ml-2`}>Coba Lagi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
