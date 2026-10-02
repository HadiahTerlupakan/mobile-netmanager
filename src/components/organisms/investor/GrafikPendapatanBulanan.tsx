import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { useTemaPersona } from '@/theme';
import { formatRupiahRingkas } from '@/utils/investor';

export interface BatangBulanan {
  kunci: string;
  /** Label singkat di bawah batang, mis. "Sep". */
  label: string;
  pendapatan: number;
  /** Bagian investor (bagi hasil + modal kembali) bulan itu. */
  bagianSaya: number;
}

interface GrafikPendapatanBulananProps {
  /** Urut dari bulan terlama ke terbaru. */
  batang: BatangBulanan[];
}

const TINGGI_GRAFIK = 120;
const TINGGI_MINIMUM_BATANG = 4;

/**
 * Grafik batang pendapatan proyek per bulan; bagian investor ditumpuk dengan
 * warna lebih pekat di dasar batang. Dibuat dari View biasa (tanpa pustaka grafik).
 */
export function GrafikPendapatanBulanan({ batang }: GrafikPendapatanBulananProps) {
  const { warna } = useTemaPersona();
  const tertinggi = Math.max(1, ...batang.map((item) => item.pendapatan));

  return (
    <View style={tw`bg-white rounded-2xl p-4 border border-slate-200/70`}>
      <View style={tw`flex-row items-center justify-between mb-4`}>
        <Text style={tw`text-xs font-medium text-slate-500`}>Tertinggi {formatRupiahRingkas(tertinggi)}</Text>
        <View style={tw`flex-row items-center`}>
          <View style={[tw`w-2.5 h-2.5 rounded-sm mr-1`, { backgroundColor: warna.utamaGaris }]} />
          <Text style={tw`text-[11px] text-slate-500 mr-3`}>Pendapatan</Text>
          <View style={[tw`w-2.5 h-2.5 rounded-sm mr-1`, { backgroundColor: warna.utamaKuat }]} />
          <Text style={tw`text-[11px] text-slate-500`}>Bagian saya</Text>
        </View>
      </View>
      <View style={[tw`flex-row items-end justify-around`, { height: TINGGI_GRAFIK }]}>
        {batang.map((item) => {
          const tinggi = Math.max(TINGGI_MINIMUM_BATANG, (item.pendapatan / tertinggi) * TINGGI_GRAFIK);
          const tinggiBagian = item.pendapatan > 0 ? Math.min(tinggi, (item.bagianSaya / item.pendapatan) * tinggi) : 0;
          return (
            <View
              key={item.kunci}
              accessibilityLabel={`${item.label}: pendapatan ${formatRupiahRingkas(item.pendapatan)}`}
              style={[tw`w-7 rounded-t-md overflow-hidden justify-end`, { height: tinggi, backgroundColor: warna.utamaGaris }]}
            >
              <View style={{ height: tinggiBagian, backgroundColor: warna.utamaKuat }} />
            </View>
          );
        })}
      </View>
      <View style={tw`flex-row justify-around mt-2 pt-2 border-t border-slate-100`}>
        {batang.map((item) => (
          <Text key={item.kunci} style={tw`w-10 text-center text-[11px] text-slate-500`}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
