import React from 'react';
import { Text, View } from 'react-native';

import { useTemaPersona } from '@/theme';
import { hurufAwalNama } from '@/utils/presurvei/timRencana';

/** Ukuran avatar: mini di dalam kartu rencana, kecil untuk baris ringkas, sedang untuk kepala bagian/daftar. */
export type UkuranAvatar = 'mini' | 'kecil' | 'sedang';

const GAYA_UKURAN: Record<UkuranAvatar, { lingkar: string; teks: string; jarak: string }> = {
  mini: { lingkar: 'w-5 h-5', teks: 'text-[10px]', jarak: 'mr-1.5' },
  kecil: { lingkar: 'w-7 h-7', teks: 'text-xs', jarak: 'mr-3' },
  sedang: { lingkar: 'w-9 h-9', teks: 'text-sm', jarak: 'mr-3' },
};

interface AvatarAnggotaProps {
  nama: string | null;
  ukuran?: UkuranAvatar;
}

/** Lingkaran berisi huruf awal nama anggota tim. */
export function AvatarAnggota({ nama, ukuran = 'sedang' }: AvatarAnggotaProps) {
  const { tw } = useTemaPersona();
  const gaya = GAYA_UKURAN[ukuran];
  return (
    <View style={tw`${gaya.lingkar} ${gaya.jarak} rounded-full bg-utama-sangat-muda items-center justify-center`}>
      <Text style={tw`${gaya.teks} font-bold text-utama-kuat`}>{hurufAwalNama(nama)}</Text>
    </View>
  );
}
