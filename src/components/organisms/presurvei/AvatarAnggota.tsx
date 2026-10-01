import React from 'react';
import { Text, View } from 'react-native';

import { useTemaPersona } from '@/theme';
import { hurufAwalNama } from '@/utils/presurvei/timRencana';

/** Ukuran avatar: kecil untuk baris ringkas, sedang untuk kepala bagian/daftar. */
export type UkuranAvatar = 'kecil' | 'sedang';

const GAYA_UKURAN: Record<UkuranAvatar, { lingkar: string; teks: string }> = {
  kecil: { lingkar: 'w-7 h-7', teks: 'text-xs' },
  sedang: { lingkar: 'w-9 h-9', teks: 'text-sm' },
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
    <View style={tw`${gaya.lingkar} rounded-full bg-utama-sangat-muda items-center justify-center mr-3`}>
      <Text style={tw`${gaya.teks} font-bold text-utama-kuat`}>{hurufAwalNama(nama)}</Text>
    </View>
  );
}
