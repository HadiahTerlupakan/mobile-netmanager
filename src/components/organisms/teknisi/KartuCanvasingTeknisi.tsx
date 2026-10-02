import { ChevronRight, Megaphone } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuBagian, LencanaJudul } from '@/components/molecules/KartuBagian';
import { DESAIN_PREMIUM, GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';

export interface RingkasanCanvasingTeknisi {
  disetujui: number;
  selesaiHariIni: number;
  selesaiMinggu: number;
  selesaiBulan: number;
}

/** Canvasing teknisi (yang role-nya berizin canvasing): pengajuan disetujui dan selesai per periode. */
export function KartuCanvasingTeknisi({ ringkasan, onBuka }: { ringkasan: RingkasanCanvasingTeknisi; onBuka: () => void }) {
  const { tw: twTema } = useTemaPersona();
  const periode = [
    { label: 'Hari ini', nilai: ringkasan.selesaiHariIni },
    { label: 'Minggu ini', nilai: ringkasan.selesaiMinggu },
    { label: 'Bulan ini', nilai: ringkasan.selesaiBulan },
  ];
  return (
    <KartuBagian
      judul="Canvasing"
      ikon={Megaphone}
      kanan={<LencanaJudul teks={`${ringkasan.disetujui} disetujui`} />}
    >
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Buka canvasing" onPress={onBuka} activeOpacity={0.7}>
        <Text style={tw`text-xs text-slate-500 mb-2`}>Canvasing selesai</Text>
        <View style={tw`flex-row items-center`}>
          {periode.map((item, indeks) => (
            <View
              key={item.label}
              accessible
              accessibilityLabel={`Canvasing selesai ${item.label}: ${item.nilai}`}
              style={twTema`flex-1 rounded-xl py-2.5 px-3 bg-utama-sangat-muda ${indeks > 0 ? 'ml-2' : ''}`}
            >
              <Text style={[tw`text-lg font-bold text-slate-900`, GAYA_ANGKA_TABULAR]}>{item.nilai}</Text>
              <Text style={tw`text-[11px] text-slate-500`}>{item.label}</Text>
            </View>
          ))}
          <ChevronRight size={18} color={DESAIN_PREMIUM.ikonNetral} style={tw`ml-1`} />
        </View>
      </TouchableOpacity>
    </KartuBagian>
  );
}
