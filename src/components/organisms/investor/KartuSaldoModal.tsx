import React from 'react';
import { Text, View } from 'react-native';

import { useTemaPersona } from '@/theme';
import { formatRupiah } from '@/utils/investor';

interface KartuSaldoModalProps {
  /** Total modal investor di semua proyek (dasar bagi hasil per proyek). */
  modalDiProyek: string;
  jumlahProyek: number;
  uangDiterima: number;
  siapDibayar: number;
}

/** Kartu utama Beranda investor: modal di proyek, uang yang sudah diterima, dan yang siap dibayar. */
export function KartuSaldoModal({ modalDiProyek, jumlahProyek, uangDiterima, siapDibayar }: KartuSaldoModalProps) {
  const { tw } = useTemaPersona();
  return (
    <View style={tw`bg-utama-kuat rounded-2xl p-5`}>
      <Text style={tw`text-sm text-utama-muda`}>Modal saya di proyek</Text>
      <Text style={tw`text-3xl font-bold text-white mt-1`}>{formatRupiah(modalDiProyek)}</Text>
      <Text style={tw`text-sm text-utama-muda mt-1`}>Ikut di {jumlahProyek} proyek</Text>
      <View style={tw`flex-row mt-4 pt-4 border-t border-utama-terang`}>
        <View style={tw`flex-1 pr-2`}>
          <Text style={tw`text-xs text-utama-muda`}>Uang sudah saya terima</Text>
          <Text style={tw`text-base font-bold text-white mt-0.5`}>{formatRupiah(uangDiterima)}</Text>
        </View>
        <View style={tw`flex-1 pl-2`}>
          <Text style={tw`text-xs text-utama-muda`}>Siap dibayar ke saya</Text>
          <Text style={tw`text-base font-bold text-white mt-0.5`}>{formatRupiah(siapDibayar)}</Text>
        </View>
      </View>
    </View>
  );
}
