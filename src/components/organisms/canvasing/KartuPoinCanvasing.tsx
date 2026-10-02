import { CheckCircle2, Hourglass, TrendingUp, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { BilahKemajuan } from '@/components/molecules/BilahKemajuan';
import { KartuHeroGradien } from '@/components/molecules/KartuHeroGradien';
import { DESAIN_PREMIUM, GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';

const PERSEN_PENUH = 100;
const UKURAN_IKON = 14;

export interface RingkasanCanvasing {
  poin: number;
  jumlahPengajuan: number;
  target: number;
  disetujui: number;
  /** Persen pengajuan yang disetujui (0–100). */
  tingkatBerhasil: number;
  menunggu: number;
}

function AngkaKecil({ ikon: Ikon, label, nilai }: { ikon: LucideIcon; label: string; nilai: string }) {
  const { warna } = useTemaPersona();
  return (
    <View style={tw`flex-1`} accessible accessibilityLabel={`${label}: ${nilai}`}>
      <View style={tw`flex-row items-center`}>
        <Ikon size={UKURAN_IKON} color={warna.utamaGaris} />
        <Text style={[tw`text-[11px] ml-1`, { color: warna.utamaGaris }]}>{label}</Text>
      </View>
      <Text style={[tw`text-lg font-bold text-white mt-0.5`, GAYA_ANGKA_TABULAR]}>{nilai}</Text>
    </View>
  );
}

/** Kartu sorotan Canvasing: total poin, progres target pengajuan, dan tiga angka ringkas. */
export function KartuPoinCanvasing({ ringkasan }: { ringkasan: RingkasanCanvasing }) {
  const { warna } = useTemaPersona();
  const persen = ringkasan.target > 0 ? Math.min((ringkasan.jumlahPengajuan / ringkasan.target) * PERSEN_PENUH, PERSEN_PENUH) : 0;
  return (
    <KartuHeroGradien>
      <Text style={[tw`text-xs font-semibold uppercase tracking-wider`, { color: warna.utamaGaris }]}>Total poin</Text>
      <View style={tw`flex-row items-baseline mt-1`}>
        <Text style={[tw`text-4xl font-bold`, GAYA_ANGKA_TABULAR, { color: DESAIN_PREMIUM.aksenEmas }]}>
          {ringkasan.poin}
        </Text>
        <Text style={[tw`text-sm font-semibold ml-1.5`, { color: warna.utamaGaris }]}>poin</Text>
      </View>

      <View style={tw`mt-5`}>
        <View style={tw`flex-row justify-between mb-2`}>
          <Text style={[tw`text-xs`, { color: warna.utamaGaris }]}>Target pengajuan bulan ini</Text>
          <Text style={[tw`text-xs font-semibold text-white`, GAYA_ANGKA_TABULAR]}>
            {`${ringkasan.jumlahPengajuan} / ${ringkasan.target} · ${Math.round(persen)}%`}
          </Text>
        </View>
        <BilahKemajuan persen={persen} warnaIsi={DESAIN_PREMIUM.aksenEmas} warnaLatar={DESAIN_PREMIUM.garisDiAtasGelap} />
      </View>

      <View style={[tw`flex-row mt-5 pt-4 border-t`, { borderColor: DESAIN_PREMIUM.garisDiAtasGelap }]}>
        <AngkaKecil ikon={CheckCircle2} label="Disetujui" nilai={String(ringkasan.disetujui)} />
        <AngkaKecil ikon={TrendingUp} label="Tingkat berhasil" nilai={`${ringkasan.tingkatBerhasil}%`} />
        <AngkaKecil ikon={Hourglass} label="Menunggu" nilai={String(ringkasan.menunggu)} />
      </View>
    </KartuHeroGradien>
  );
}
