import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTemaPersona } from '@/theme';
import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import type { LayarFormRencana as LogikaLayarFormRencana } from '@/hooks/presurvei/useLayarFormRencana';
import { FormRencana } from './FormRencana';
import { PilihProspekModal } from './PilihProspekModal';

/** Alasan tombol simpan nonaktif saat offline. */
export const TEKS_RENCANA_BUTUH_ONLINE =
  'Menyimpan rencana butuh koneksi internet. Sambungkan internet lalu coba lagi.';

interface LayarFormRencanaProps {
  judul: string;
  labelSimpan: string;
  layar: LogikaLayarFormRencana;
  /** Blok tambahan di atas form, mis. pemilih sales di layar Tugaskan. */
  kepalaForm?: React.ReactNode;
}

/** Kerangka layar buat/ubah/tugaskan rencana: kepala, form, pemilih prospek, dan tombol simpan (online saja). */
export function LayarFormRencana({ judul, labelSimpan, layar, kepalaForm }: LayarFormRencanaProps) {
  const { tw } = useTemaPersona();
  const [isPilihProspekTerbuka, setIsPilihProspekTerbuka] = useState(false);
  const isBolehSimpan = layar.isOnline && !layar.isMenyimpan;

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <KepalaLayar judul={judul} />
      <ScrollView contentContainerStyle={tw`p-4 pb-40`} keyboardShouldPersistTaps="handled">
        {kepalaForm}
        <FormRencana form={layar.form} hariIni={layar.hariIni} onBukaPilihProspek={() => setIsPilihProspekTerbuka(true)} />
      </ScrollView>
      <View style={tw`absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100`}>
        {!layar.isOnline ? <Text style={tw`text-xs text-amber-700 mb-2`}>{TEKS_RENCANA_BUTUH_ONLINE}</Text> : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !isBolehSimpan }}
          disabled={!isBolehSimpan}
          onPress={layar.simpan}
          style={tw`rounded-xl py-3 items-center ${isBolehSimpan ? 'bg-utama-kuat' : 'bg-gray-400'}`}
        >
          <Text style={tw`text-white font-bold`}>{layar.isMenyimpan ? 'Menyimpan…' : labelSimpan}</Text>
        </TouchableOpacity>
      </View>
      {isPilihProspekTerbuka ? (
        <PilihProspekModal
          onTutup={() => setIsPilihProspekTerbuka(false)}
          onPilih={(prospek) => {
            layar.form.pilihProspek(prospek);
            setIsPilihProspekTerbuka(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
