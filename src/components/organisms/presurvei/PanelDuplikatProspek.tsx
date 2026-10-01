import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { useTemaPersona } from '@/theme';
import type { PilihanDuplikat } from '@/hooks/presurvei/useFormTambahProspek';

interface PanelDuplikatProspekProps {
  duplikat: PilihanDuplikat;
  isMenyimpan: boolean;
}

/**
 * Pilihan saat nomor HP sudah tercatat: pakai data lama (hanya bila milik
 * sendiri), tetap simpan sebagai baru, atau batal. Menggantikan tombol simpan.
 */
export function PanelDuplikatProspek({ duplikat, isMenyimpan }: PanelDuplikatProspekProps) {
  const { tw } = useTemaPersona();
  const isSibuk = isMenyimpan || duplikat.isMemuat;
  return (
    <View testID="panel-duplikat-prospek">
      <Text accessibilityLiveRegion="polite" style={tw`text-base font-semibold text-gray-900 mb-3`}>
        {duplikat.teks}
      </Text>
      {duplikat.isBolehDipakai ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Pakai yang sudah ada"
          accessibilityState={{ disabled: isSibuk, busy: duplikat.isMemuat }}
          disabled={isSibuk}
          onPress={duplikat.pakaiYangAda}
          style={tw`rounded-xl min-h-12 py-3 mb-2 items-center justify-center ${isSibuk ? 'bg-gray-400' : 'bg-utama-kuat'}`}
        >
          {duplikat.isMemuat ? <ActivityIndicator color="white" /> : <Text style={tw`text-white text-base font-bold`}>Pakai yang sudah ada</Text>}
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: isSibuk }}
        disabled={isSibuk}
        onPress={duplikat.tetapSimpanBaru}
        style={tw`rounded-xl min-h-12 py-3 mb-2 items-center justify-center border-2 ${isSibuk ? 'border-gray-300' : 'border-utama'}`}
      >
        <Text style={tw`text-base font-bold ${isSibuk ? 'text-gray-400' : 'text-utama-gelap'}`}>
          {isMenyimpan ? 'Menyimpan…' : 'Tetap simpan sebagai baru'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        disabled={isSibuk}
        onPress={duplikat.batal}
        style={tw`rounded-xl min-h-12 py-3 items-center justify-center`}
      >
        <Text style={tw`text-base font-semibold text-gray-700`}>Batal</Text>
      </TouchableOpacity>
    </View>
  );
}
