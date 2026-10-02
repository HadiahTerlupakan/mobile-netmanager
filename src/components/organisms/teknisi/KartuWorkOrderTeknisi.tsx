import { ArrowRight, ClipboardList } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuHeroGradien } from '@/components/molecules/KartuHeroGradien';
import { DESAIN_PREMIUM, GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';

const UKURAN_IKON = 16;

export interface RingkasanWorkOrderTeknisi {
  ditugaskan: number;
  /** Tiket terbuka yang boleh diambil teknisi. */
  tersedia: number;
  selesaiHariIni: number;
  selesaiMinggu: number;
  selesaiBulan: number;
}

function AngkaSelesai({ label, nilai }: { label: string; nilai: number }) {
  const { warna } = useTemaPersona();
  return (
    <View style={tw`flex-1`} accessible accessibilityLabel={`Selesai ${label}: ${nilai}`}>
      <Text style={[tw`text-[11px]`, { color: warna.utamaGaris }]}>{label}</Text>
      <Text style={[tw`text-xl font-bold text-white mt-0.5`, GAYA_ANGKA_TABULAR]}>{nilai}</Text>
    </View>
  );
}

/**
 * Kartu sorotan Beranda teknisi: WO yang ditugaskan, tiket yang bisa
 * diambil, tombol ke daftar WO, dan tiket selesai hari ini/minggu/bulan.
 */
export function KartuWorkOrderTeknisi({ ringkasan, onBuka }: { ringkasan: RingkasanWorkOrderTeknisi; onBuka: () => void }) {
  const { warna } = useTemaPersona();
  return (
    <KartuHeroGradien>
      <View style={tw`flex-row items-start`}>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-xs font-semibold uppercase tracking-wider`, { color: warna.utamaGaris }]}>
            Work order saya
          </Text>
          <Text style={[tw`text-4xl font-bold text-white mt-1`, GAYA_ANGKA_TABULAR]}>{ringkasan.ditugaskan}</Text>
          <Text style={[tw`text-sm mt-1`, { color: warna.utamaGaris }]}>
            {ringkasan.tersedia > 0 ? (
              <Text style={[tw`font-semibold`, { color: DESAIN_PREMIUM.aksenEmas }]}>{`${ringkasan.tersedia} tiket`}</Text>
            ) : (
              '0 tiket'
            )}
            {' tersedia untuk diambil'}
          </Text>
        </View>
        <View style={[tw`w-11 h-11 rounded-xl items-center justify-center`, { backgroundColor: DESAIN_PREMIUM.garisDiAtasGelap }]}>
          <ClipboardList size={20} color="#ffffff" />
        </View>
      </View>

      <View style={[tw`mt-5 pt-4 border-t`, { borderColor: DESAIN_PREMIUM.garisDiAtasGelap }]}>
        <Text style={[tw`text-xs mb-2`, { color: warna.utamaGaris }]}>Tiket selesai</Text>
        <View style={tw`flex-row`}>
          <AngkaSelesai label="Hari ini" nilai={ringkasan.selesaiHariIni} />
          <AngkaSelesai label="Minggu ini" nilai={ringkasan.selesaiMinggu} />
          <AngkaSelesai label="Bulan ini" nilai={ringkasan.selesaiBulan} />
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Lihat work order"
        onPress={onBuka}
        activeOpacity={0.85}
        style={tw`flex-row items-center justify-center bg-white rounded-xl py-3.5 mt-5`}
      >
        <Text style={[tw`font-bold mr-1.5`, { color: warna.utamaKuat }]}>Lihat work order</Text>
        <ArrowRight size={UKURAN_IKON} color={warna.utamaKuat} />
      </TouchableOpacity>
    </KartuHeroGradien>
  );
}
