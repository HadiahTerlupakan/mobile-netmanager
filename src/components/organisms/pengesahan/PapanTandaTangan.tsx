import React, { useRef } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import tw from 'twrnc';

import { useGoresanTandaTangan } from '@/hooks/pengesahan/useGoresanTandaTangan';
import { useTemaPersona } from '@/theme';
import { tangkapTandaTangan } from '@/utils/pengesahan/tangkapTandaTangan';
import { presentAppError } from '@/utils/errorPresenter';

const WARNA_TINTA = '#0f172a';
const TEBAL_TINTA = 2.5;

interface PapanTandaTanganProps {
  isMengirim: boolean;
  /** Dipanggil dengan data URL PNG tanda tangan. */
  onSimpan: (dataUrl: string) => void;
  /** Dipanggil saat "Simpan" ditekan tetapi kotak masih kosong. */
  onKosong: () => void;
}

/**
 * Kotak tanda tangan berlatar putih dengan tombol Hapus dan Simpan. Dibangun
 * dari react-native-svg dan react-native-view-shot yang sudah terpasang, jadi
 * tidak menambah dependensi (aman dikirim lewat OTA).
 */
export function PapanTandaTangan({ isMengirim, onSimpan, onKosong }: PapanTandaTanganProps) {
  const { warna } = useTemaPersona();
  const refKotak = useRef<View>(null);
  const { daftarGoresan, panHandlers, isKosong, hapus } = useGoresanTandaTangan();

  const simpan = async () => {
    if (isKosong) return onKosong();
    try {
      onSimpan(await tangkapTandaTangan(refKotak));
    } catch (error) {
      presentAppError(error, { screen: 'TandaTanganPengesahan', source: 'capture' });
    }
  };

  return (
    <View style={tw`flex-1`}>
      <View style={tw`flex-1 m-4 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300`}>
        <View ref={refKotak} collapsable={false} style={tw`flex-1 bg-white`} {...panHandlers}>
          <Svg style={tw`absolute inset-0`} width="100%" height="100%">
            {daftarGoresan.map((goresan, indeks) => (
              <Path key={indeks} d={goresan} stroke={WARNA_TINTA} strokeWidth={TEBAL_TINTA} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            ))}
          </Svg>
        </View>
      </View>
      <Text style={tw`text-xs text-slate-500 text-center -mt-2 mb-3`}>Tanda tangani di dalam kotak di atas</Text>
      <View style={tw`flex-row px-4 pb-4`}>
        <TouchableOpacity accessibilityRole="button" disabled={isMengirim} onPress={hapus} style={tw`flex-1 mr-2 rounded-xl py-3 items-center border border-slate-200 bg-white`}>
          <Text style={tw`font-semibold text-slate-700`}>Hapus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: isMengirim }}
          disabled={isMengirim}
          onPress={simpan}
          style={[tw`flex-1 rounded-xl py-3 items-center`, { backgroundColor: warna.utamaKuat }]}
        >
          {isMengirim ? <ActivityIndicator size="small" color="white" /> : <Text style={tw`font-bold text-white`}>Simpan tanda tangan</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
