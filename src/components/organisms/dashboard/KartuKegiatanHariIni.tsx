import { ClipboardList, type LucideIcon, MapPin, MessageCircle, SearchCheck } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { RekapKegiatanHariIni } from '@/utils/presurvei/berandaSales';

interface KartuKegiatanHariIniProps {
  rekap: RekapKegiatanHariIni;
  jumlahMenunggu: number;
}

interface StatistikKegiatan {
  label: string;
  nilai: number;
  ikon: LucideIcon;
  latar: string;
  warnaTeks: string;
  warnaIkon: string;
}

const UKURAN_IKON_STAT = 16;

/** Jumlah kegiatan hari ini dan yang masih menunggu kirim. */
export function KartuKegiatanHariIni({ rekap, jumlahMenunggu }: KartuKegiatanHariIniProps) {
  const statistik: StatistikKegiatan[] = [
    { label: 'Kunjungan', nilai: rekap.kunjungan, ikon: MapPin, latar: 'bg-blue-50', warnaTeks: 'text-blue-600', warnaIkon: '#2563eb' },
    { label: 'Survei', nilai: rekap.survei, ikon: SearchCheck, latar: 'bg-emerald-50', warnaTeks: 'text-emerald-600', warnaIkon: '#059669' },
    { label: 'Telepon/Chat', nilai: rekap.teleponChat, ikon: MessageCircle, latar: 'bg-violet-50', warnaTeks: 'text-violet-600', warnaIkon: '#7c3aed' },
  ];
  const isAdaMenunggu = jumlahMenunggu > 0;
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm`}>
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <View style={tw`flex-row items-center`}>
          <ClipboardList size={18} color="#111827" />
          <Text style={tw`font-bold text-gray-900 ml-2`}>Hari ini</Text>
        </View>
        <View style={tw`rounded-full px-2.5 py-1 ${isAdaMenunggu ? 'bg-amber-50' : 'bg-gray-100'}`}>
          <Text style={tw`text-[11px] font-semibold ${isAdaMenunggu ? 'text-amber-700' : 'text-gray-500'}`}>
            {`Menunggu kirim: ${jumlahMenunggu}`}
          </Text>
        </View>
      </View>
      <View style={tw`flex-row`}>
        {statistik.map((item, indeks) => {
          const Ikon = item.ikon;
          return (
            <View
              key={item.label}
              accessible
              accessibilityLabel={`${item.label}: ${item.nilai}`}
              style={tw`flex-1 items-center rounded-xl py-3 ${item.latar} ${indeks > 0 ? 'ml-2' : ''}`}
            >
              <Ikon size={UKURAN_IKON_STAT} color={item.warnaIkon} />
              <Text style={tw`text-2xl font-bold mt-1 ${item.warnaTeks}`}>{String(item.nilai)}</Text>
              <Text style={tw`text-[10px] uppercase font-bold text-gray-500 mt-0.5`}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
