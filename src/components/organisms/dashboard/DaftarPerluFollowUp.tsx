import { BellRing, CheckCircle2, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { KartuBagian, LencanaJudul } from '@/components/molecules/KartuBagian';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';

import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import type { ProspekPerluFollowUp } from '@/types/presurvei';
import { formatDate } from '@/utils/date';

interface DaftarPerluFollowUpProps {
  prospek: ProspekPerluFollowUp[];
  onBuka: (id: string) => void;
}


/** Huruf awal nama prospek untuk avatar ringkas. */
function hurufAwal(nama: string): string {
  return nama.trim().charAt(0).toUpperCase() || '?';
}

/** Prospek aktif yang paling lama tidak disentuh (maks. 5, dari server). */
export function DaftarPerluFollowUp({ prospek, onBuka }: DaftarPerluFollowUpProps) {
  const { tw } = useTemaPersona();
  return (
    <KartuBagian
      judul="Perlu di-follow-up"
      ikon={BellRing}
      kanan={prospek.length > 0 ? <LencanaJudul teks={`${prospek.length} prospek`} nada="bahaya" /> : null}
    >
      {prospek.length === 0 ? (
        <View style={tw`flex-row items-center rounded-xl bg-emerald-50 px-3 py-3`}>
          <CheckCircle2 size={18} color="#059669" />
          <Text style={tw`text-sm text-emerald-700 ml-2`}>Tidak ada prospek yang menunggu.</Text>
        </View>
      ) : null}
      {prospek.map((item, indeks) => (
        <TouchableOpacity
          key={item.id}
          accessibilityRole="button"
          onPress={() => onBuka(item.id)}
          style={tw`flex-row items-center py-3 ${indeks < prospek.length - 1 ? 'border-b border-gray-100' : ''}`}
        >
          <View style={tw`w-9 h-9 rounded-full bg-utama-sangat-muda items-center justify-center mr-3`}>
            <Text style={tw`text-sm font-bold text-utama-kuat`}>{hurufAwal(item.nama)}</Text>
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-sm font-semibold text-gray-900`}>{item.nama}</Text>
            <Text style={tw`text-xs text-gray-500 mt-0.5`}>
              {`${LABEL_STATUS_PROSPEK[item.status]} · terakhir ${formatDate(item.sentuhanTerakhir, 'dd MMM')}`}
            </Text>
          </View>
          <ChevronRight size={18} color={DESAIN_PREMIUM.ikonNetral} />
        </TouchableOpacity>
      ))}
    </KartuBagian>
  );
}
