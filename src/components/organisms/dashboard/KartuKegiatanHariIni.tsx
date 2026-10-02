import { ClipboardList, type LucideIcon, MapPin, MessageCircle, SearchCheck } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { KartuBagian, LencanaJudul } from '@/components/molecules/KartuBagian';
import { GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';
import type { RekapKegiatanHariIni } from '@/utils/presurvei/berandaSales';

interface KartuKegiatanHariIniProps {
  rekap: RekapKegiatanHariIni;
  jumlahMenunggu: number;
}

const UKURAN_IKON_STAT = 16;

/** Jumlah kegiatan hari ini dan yang masih menunggu kirim. */
export function KartuKegiatanHariIni({ rekap, jumlahMenunggu }: KartuKegiatanHariIniProps) {
  const { tw: twTema, warna } = useTemaPersona();
  const statistik: { label: string; nilai: number; ikon: LucideIcon }[] = [
    { label: 'Kunjungan', nilai: rekap.kunjungan, ikon: MapPin },
    { label: 'Survei', nilai: rekap.survei, ikon: SearchCheck },
    { label: 'Telepon/Chat', nilai: rekap.teleponChat, ikon: MessageCircle },
  ];
  return (
    <KartuBagian
      judul="Hari ini"
      ikon={ClipboardList}
      kanan={
        <LencanaJudul teks={`Menunggu kirim: ${jumlahMenunggu}`} nada={jumlahMenunggu > 0 ? 'peringatan' : 'netral'} />
      }
    >
      <View style={tw`flex-row`}>
        {statistik.map((item, indeks) => {
          const Ikon = item.ikon;
          return (
            <View
              key={item.label}
              accessible
              accessibilityLabel={`${item.label}: ${item.nilai}`}
              style={twTema`flex-1 rounded-xl py-3 px-3 bg-utama-sangat-muda ${indeks > 0 ? 'ml-2' : ''}`}
            >
              <Ikon size={UKURAN_IKON_STAT} color={warna.utamaKuat} />
              <Text style={[tw`text-2xl font-bold text-slate-900 mt-2`, GAYA_ANGKA_TABULAR]}>{String(item.nilai)}</Text>
              <Text style={tw`text-[11px] font-medium text-slate-500`}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </KartuBagian>
  );
}
