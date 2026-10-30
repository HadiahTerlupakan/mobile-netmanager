import { Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { useBalasTiketPelanggan } from '@/hooks/queries/useTiketPelanggan';
import type { StatusTiket } from '@/types/portalPelanggan';

const BALASAN_MAKS = 2000;
const UKURAN_IKON_KIRIM = 20;
/** gray-400 */
const WARNA_PLACEHOLDER = '#9ca3af';

interface KotakBalasTiketProps {
  idTiket: string;
  status: StatusTiket;
}

/** Kotak balas di bawah layar detail tiket yang masih terbuka. */
export function KotakBalasTiket({ idTiket, status }: KotakBalasTiketProps) {
  const [pesan, setPesan] = useState('');
  const balas = useBalasTiketPelanggan(idTiket, () => setPesan(''));
  const isBolehKirim = pesan.trim().length > 0 && !balas.isPending;

  return (
    <View style={tw`flex-row items-end p-3 bg-white border-t border-gray-100`}>
      <TextInput
        accessibilityLabel="Balasan tiket"
        value={pesan}
        onChangeText={setPesan}
        placeholder={status === 'WAITING_CUSTOMER' ? 'Tim dukungan menunggu balasan Anda…' : 'Ketik balasan…'}
        placeholderTextColor={WARNA_PLACEHOLDER}
        multiline
        maxLength={BALASAN_MAKS}
        style={tw`flex-1 max-h-28 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900`}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Kirim balasan"
        accessibilityState={{ disabled: !isBolehKirim }}
        disabled={!isBolehKirim}
        onPress={() => balas.mutate(pesan.trim())}
        style={tw`ml-2 w-11 h-11 rounded-full items-center justify-center ${isBolehKirim ? 'bg-teal-600' : 'bg-gray-300'}`}
      >
        {balas.isPending ? <ActivityIndicator size="small" color="white" /> : <Send size={UKURAN_IKON_KIRIM} color="white" />}
      </TouchableOpacity>
    </View>
  );
}
