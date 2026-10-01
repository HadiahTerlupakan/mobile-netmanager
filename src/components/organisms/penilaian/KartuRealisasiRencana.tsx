import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { RealisasiRencanaPenilaian } from '@/types/penilaian';

interface KartuRealisasiRencanaProps {
  rencana: RealisasiRencanaPenilaian;
}

/** Satu kolom angka rekap. */
function KolomRekap({ jumlah, label, warna }: { jumlah: number; label: string; warna: string }) {
  return (
    <View style={tw`flex-1 items-center`}>
      <Text style={tw`text-xl font-bold ${warna}`}>{jumlah}</Text>
      <Text style={tw`text-xs text-gray-500 mt-0.5`}>{label}</Text>
    </View>
  );
}

/** Rekap realisasi rencana kunjungan periode: tepat waktu, terlambat, terlewat. */
export function KartuRealisasiRencana({ rencana }: KartuRealisasiRencanaProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-3 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-3`}>Realisasi rencana kunjungan</Text>
      <View style={tw`flex-row`}>
        <KolomRekap jumlah={rencana.tepatWaktu} label="Tepat waktu" warna="text-emerald-600" />
        <KolomRekap jumlah={rencana.terlambat} label="Terlambat" warna="text-amber-600" />
        <KolomRekap jumlah={rencana.terlewat} label="Terlewat" warna="text-rose-600" />
      </View>
    </View>
  );
}
