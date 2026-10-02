import React from 'react';
import { Text, View } from 'react-native';

import { useTemaPersona } from '@/theme';
import type { SaldoInvestor } from '@/types/investor';
import { formatPersen, formatRupiah } from '@/utils/investor';

interface KartuSaldoModalProps {
  saldo: SaldoInvestor;
  bagiHasilSiapDibayar: number;
}

/** Kartu utama Beranda investor: modal yang ditanam, bagian kepemilikan, dan uang masuk. */
export function KartuSaldoModal({ saldo, bagiHasilSiapDibayar }: KartuSaldoModalProps) {
  const { tw } = useTemaPersona();
  return (
    <View style={tw`bg-utama-kuat rounded-2xl p-5`}>
      <Text style={tw`text-sm text-utama-muda`}>Modal saya</Text>
      <Text style={tw`text-3xl font-bold text-white mt-1`}>{formatRupiah(saldo.totalDeposit)}</Text>
      <Text style={tw`text-sm text-utama-muda mt-1`}>
        Bagian saya di usaha ini: {formatPersen(saldo.ownershipPercent)}
      </Text>
      <View style={tw`flex-row mt-4 pt-4 border-t border-utama-terang`}>
        <View style={tw`flex-1 pr-2`}>
          <Text style={tw`text-xs text-utama-muda`}>Uang sudah saya terima</Text>
          <Text style={tw`text-base font-bold text-white mt-0.5`}>{formatRupiah(saldo.totalPayout)}</Text>
        </View>
        <View style={tw`flex-1 pl-2`}>
          <Text style={tw`text-xs text-utama-muda`}>Bagi hasil siap dibayar</Text>
          <Text style={tw`text-base font-bold text-white mt-0.5`}>{formatRupiah(bagiHasilSiapDibayar)}</Text>
        </View>
      </View>
    </View>
  );
}
