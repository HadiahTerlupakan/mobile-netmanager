import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { BilahKemajuan } from '@/components/molecules/BilahKemajuan';
import { useTemaPersona } from '@/theme';
import { hitungPersenKemajuan, labelKemajuanTandaTangan } from '@/utils/pengesahan/tampilanPengesahan';

/** slate-100 */
const WARNA_LATAR_BILAH = '#f1f5f9';
const TINGGI_BILAH = 6;

interface KemajuanTandaTanganProps {
  jumlahSelesai: number;
  jumlahPenandaTangan: number;
  /** Teks tambahan di belakang kemajuan, mis. batas berlaku. */
  keterangan?: string | null;
}

/** Bilah kemajuan tanda tangan + teks "x dari y sudah tanda tangan". */
export function KemajuanTandaTangan({ jumlahSelesai, jumlahPenandaTangan, keterangan }: KemajuanTandaTanganProps) {
  const { warna } = useTemaPersona();
  const teks = [labelKemajuanTandaTangan(jumlahSelesai, jumlahPenandaTangan), keterangan].filter(Boolean).join(' · ');
  return (
    <View>
      <BilahKemajuan
        persen={hitungPersenKemajuan(jumlahSelesai, jumlahPenandaTangan)}
        warnaIsi={warna.utamaKuat}
        warnaLatar={WARNA_LATAR_BILAH}
        tinggi={TINGGI_BILAH}
      />
      <Text style={tw`text-xs text-slate-500 mt-1.5`} numberOfLines={1}>{teks}</Text>
    </View>
  );
}
