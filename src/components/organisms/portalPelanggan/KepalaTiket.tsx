import { useRouter } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { labelKategoriTiket, STATUS_TIKET_DITUTUP, tampilanStatusTiket } from '@/constants/tiketPelanggan';
import type { DetailTiket } from '@/types/portalPelanggan';

const UKURAN_IKON = 24;
const UKURAN_IKON_TUTUP = 14;
/** gray-800 */
const WARNA_IKON = '#1f2937';
/** gray-500 */
const WARNA_IKON_TUTUP = '#6b7280';

interface KepalaTiketProps {
  tiket: DetailTiket;
  onTutupTiket: () => void;
}

/** Kepala detail tiket: subjek, nomor, status, kategori, dan tombol tutup selama tiket belum ditutup. */
export function KepalaTiket({ tiket, onTutupTiket }: KepalaTiketProps) {
  const router = useRouter();
  const status = tampilanStatusTiket(tiket.status);
  return (
    <View style={tw`bg-white border-b border-gray-100 px-4 pt-3 pb-3`}>
      <View style={tw`flex-row items-center`}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={tw`mr-3`}>
          <ArrowLeft size={UKURAN_IKON} color={WARNA_IKON} />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          <Text numberOfLines={1} style={tw`text-base font-bold text-gray-900`}>{tiket.subject}</Text>
          <Text style={tw`text-xs font-mono text-gray-500`}>#{tiket.ticketNumber}</Text>
        </View>
      </View>
      <View style={tw`flex-row items-center justify-between mt-3`}>
        <View style={tw`flex-row items-center`}>
          <View style={tw`px-2 py-1 rounded-full mr-2 ${status.warnaLatar}`}>
            <Text style={tw`text-xs font-bold ${status.warnaTeks}`}>{status.label}</Text>
          </View>
          <Text style={tw`text-xs text-gray-500`}>{labelKategoriTiket(tiket.category)}</Text>
        </View>
        {tiket.status !== STATUS_TIKET_DITUTUP ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tutup Tiket" onPress={onTutupTiket} style={tw`flex-row items-center px-2 py-1`}>
            <X size={UKURAN_IKON_TUTUP} color={WARNA_IKON_TUTUP} />
            <Text style={tw`text-xs font-medium text-gray-500 ml-1`}>Tutup Tiket</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
