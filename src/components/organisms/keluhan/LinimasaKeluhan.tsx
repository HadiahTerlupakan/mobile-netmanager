import { Check } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { useTemaPersona } from '@/theme';
import type { LangkahKeluhan } from '@/utils/keluhan/langkahKeluhan';

const UKURAN_TITIK = 22;

/** Linimasa vertikal penanganan keluhan; langkah aktif berikutnya ditebalkan. */
export function LinimasaKeluhan({ langkah }: { langkah: LangkahKeluhan[] }) {
  const { warna } = useTemaPersona();
  const indeksAktif = langkah.findIndex((item) => !item.isSelesai);

  return (
    <View>
      {langkah.map((item, indeks) => {
        const isTerakhir = indeks === langkah.length - 1;
        const isAktif = indeks === indeksAktif;
        return (
          <View key={item.kunci} style={tw`flex-row`} accessibilityLabel={`${item.judul}${item.isSelesai ? ', selesai' : ''}`}>
            <View style={tw`items-center mr-3`}>
              <View
                style={[
                  tw`rounded-full items-center justify-center border-2`,
                  { width: UKURAN_TITIK, height: UKURAN_TITIK },
                  item.isSelesai
                    ? { backgroundColor: warna.utamaKuat, borderColor: warna.utamaKuat }
                    : { backgroundColor: 'white', borderColor: isAktif ? warna.utamaKuat : '#cbd5e1' },
                ]}
              >
                {item.isSelesai ? <Check size={12} color="white" strokeWidth={3} /> : null}
              </View>
              {isTerakhir ? null : (
                <View style={[tw`w-0.5 flex-1 my-0.5`, { backgroundColor: item.isSelesai ? warna.utamaKuat : '#e2e8f0' }]} />
              )}
            </View>
            <View style={tw`flex-1 ${isTerakhir ? '' : 'pb-4'}`}>
              <Text style={tw`text-sm ${item.isSelesai || isAktif ? 'font-bold text-slate-900' : 'text-slate-400'}`}>{item.judul}</Text>
              {item.keterangan ? <Text style={tw`text-xs text-slate-500 mt-0.5`}>{item.keterangan}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
