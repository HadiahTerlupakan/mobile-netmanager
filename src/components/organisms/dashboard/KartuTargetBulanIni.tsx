import { Target } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { BilahKemajuan } from '@/components/molecules/BilahKemajuan';
import { KartuBagian } from '@/components/molecules/KartuBagian';
import { GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';

import type { TargetBulanIni } from '@/types/presurvei';
import { barisTargetBeranda, TEKS_TARGET_BELUM_DITETAPKAN } from '@/utils/presurvei/berandaSales';

interface KartuTargetBulanIniProps {
  target: TargetBulanIni | null;
}

/** Target bulan ini vs realisasi; target kosong ditulis apa adanya, bukan 0%. */
export function KartuTargetBulanIni({ target }: KartuTargetBulanIniProps) {
  const { tw, warna } = useTemaPersona();
  const daftar = barisTargetBeranda(target);
  return (
    <KartuBagian judul="Target bulan ini" ikon={Target}>
      {daftar === null ? (
        <View style={tw`rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3`}>
          <Text style={tw`text-sm text-slate-500 text-center`}>{TEKS_TARGET_BELUM_DITETAPKAN}</Text>
        </View>
      ) : (
        daftar.map((baris) => (
          <View key={baris.label} testID="baris-target" style={tw`mb-3`}>
            <View style={tw`flex-row justify-between items-baseline mb-1.5`}>
              <Text style={tw`text-sm text-slate-600`}>{baris.label}</Text>
              <Text style={[tw`text-sm font-bold text-slate-900`, GAYA_ANGKA_TABULAR]}>{baris.teks}</Text>
            </View>
            <BilahKemajuan
              testID="bilah-target"
              persen={baris.persen}
              warnaIsi={warna.utama}
              warnaLatar={warna.utamaSangatMuda}
            />
          </View>
        ))
      )}
    </KartuBagian>
  );
}
