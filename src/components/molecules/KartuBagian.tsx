import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { useTemaPersona } from '@/theme';

const UKURAN_IKON = 16;

interface KartuBagianProps {
  judul: string;
  ikon: LucideIcon;
  /** Elemen di kanan judul, mis. lencana jumlah. */
  kanan?: React.ReactNode;
  children: React.ReactNode;
}

/** Kartu putih premium: ikon bertema persona, judul, lencana kanan, lalu isi. */
export function KartuBagian({ judul, ikon: Ikon, kanan, children }: KartuBagianProps) {
  const { tw: twTema, warna } = useTemaPersona();
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-3 border border-slate-200/70`}>
      <View style={tw`flex-row items-center mb-3`}>
        <View style={twTema`w-8 h-8 rounded-lg bg-utama-sangat-muda items-center justify-center mr-2.5`}>
          <Ikon size={UKURAN_IKON} color={warna.utamaKuat} />
        </View>
        <Text style={tw`flex-1 text-[15px] font-bold text-slate-900`}>{judul}</Text>
        {kanan}
      </View>
      {children}
    </View>
  );
}

/** Lencana kecil di kanan judul kartu; `nada` memberi warna makna. */
export function LencanaJudul({ teks, nada = 'netral' }: { teks: string; nada?: 'peringatan' | 'bahaya' | 'netral' }) {
  const gaya = {
    peringatan: { latar: 'bg-amber-50', teks: 'text-amber-700' },
    bahaya: { latar: 'bg-rose-50', teks: 'text-rose-600' },
    netral: { latar: 'bg-slate-100', teks: 'text-slate-500' },
  }[nada];
  return (
    <View style={tw`rounded-full px-2.5 py-1 ${gaya.latar}`}>
      <Text style={tw`text-[11px] font-semibold ${gaya.teks}`}>{teks}</Text>
    </View>
  );
}
