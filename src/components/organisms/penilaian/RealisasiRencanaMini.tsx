import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { RealisasiRencanaPenilaian } from '@/types/penilaian';

interface RealisasiRencanaMiniProps {
  rencana: RealisasiRencanaPenilaian;
}

/** Satu angka berwarna dengan keterangan pendek. */
function AngkaMini({ jumlah, keterangan, warna }: { jumlah: number; keterangan: string; warna: string }) {
  return (
    <Text style={tw`text-[11px] text-gray-500 mr-2`}>
      <Text style={tw`font-semibold ${warna}`}>{jumlah}</Text>
      {` ${keterangan}`}
    </Text>
  );
}

/** Rekap realisasi rencana satu baris: tepat · telat · terlewat (untuk daftar anggota). */
export function RealisasiRencanaMini({ rencana }: RealisasiRencanaMiniProps) {
  return (
    <View
      accessibilityLabel={`Rencana: ${rencana.tepatWaktu} tepat waktu, ${rencana.terlambat} terlambat, ${rencana.terlewat} terlewat`}
      style={tw`flex-row items-center mt-0.5`}
    >
      <AngkaMini jumlah={rencana.tepatWaktu} keterangan="tepat" warna="text-emerald-600" />
      <AngkaMini jumlah={rencana.terlambat} keterangan="telat" warna="text-amber-600" />
      <AngkaMini jumlah={rencana.terlewat} keterangan="terlewat" warna="text-rose-600" />
    </View>
  );
}
