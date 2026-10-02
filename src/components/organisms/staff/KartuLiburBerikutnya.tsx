import { ChevronRight, PartyPopper } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuBagian } from '@/components/molecules/KartuBagian';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import type { HariLibur } from '@/utils/berandaStaff';
import { formatDate } from '@/utils/date';

interface KartuLiburBerikutnyaProps {
  libur: HariLibur;
  sisaHari: number;
  onBuka: () => void;
}

function teksSisa(sisaHari: number): string {
  return sisaHari === 1 ? 'Besok' : `${sisaHari} hari lagi`;
}

/** Libur terdekat: tanggal, nama, jenis, dan hitung mundur; ketuk membuka kalender libur. */
export function KartuLiburBerikutnya({ libur, sisaHari, onBuka }: KartuLiburBerikutnyaProps) {
  const { tw: twTema } = useTemaPersona();
  return (
    <KartuBagian judul="Libur berikutnya" ikon={PartyPopper}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${libur.name}, ${teksSisa(sisaHari)}, buka kalender libur`}
        onPress={onBuka}
        style={tw`flex-row items-center`}
      >
        <View style={twTema`w-14 h-14 rounded-xl bg-utama-sangat-muda items-center justify-center mr-3`}>
          <Text style={twTema`text-xl font-bold text-utama-kuat`}>{formatDate(libur.date, 'd')}</Text>
          <Text style={twTema`text-[10px] font-semibold uppercase text-utama-kuat`}>{formatDate(libur.date, 'MMM')}</Text>
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`text-sm font-semibold text-slate-900`}>{libur.name}</Text>
          <Text style={tw`text-xs text-slate-500 mt-0.5`}>
            {`${libur.isNational ? 'Libur nasional' : 'Cuti bersama'} · ${formatDate(libur.date, 'EEEE')}`}
          </Text>
        </View>
        <Text style={twTema`text-xs font-semibold text-utama-kuat mr-1`}>{teksSisa(sisaHari)}</Text>
        <ChevronRight size={16} color={DESAIN_PREMIUM.ikonNetral} />
      </TouchableOpacity>
    </KartuBagian>
  );
}
