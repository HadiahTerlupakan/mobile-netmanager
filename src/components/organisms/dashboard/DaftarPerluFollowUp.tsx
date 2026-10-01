import { BellRing, CheckCircle2, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import type { ProspekPerluFollowUp } from '@/types/presurvei';
import { formatDate } from '@/utils/date';

interface DaftarPerluFollowUpProps {
  prospek: ProspekPerluFollowUp[];
  onBuka: (id: string) => void;
}

const WARNA_ABU = '#9ca3af';

/** Huruf awal nama prospek untuk avatar ringkas. */
function hurufAwal(nama: string): string {
  return nama.trim().charAt(0).toUpperCase() || '?';
}

/** Prospek aktif yang paling lama tidak disentuh (maks. 5, dari server). */
export function DaftarPerluFollowUp({ prospek, onBuka }: DaftarPerluFollowUpProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm`}>
      <View style={tw`flex-row items-center justify-between mb-2`}>
        <View style={tw`flex-row items-center`}>
          <BellRing size={18} color="#111827" />
          <Text style={tw`font-bold text-gray-900 ml-2`}>Perlu di-follow-up</Text>
        </View>
        {prospek.length > 0 ? (
          <View style={tw`bg-rose-50 rounded-full px-2.5 py-1`}>
            <Text style={tw`text-[11px] font-semibold text-rose-600`}>{`${prospek.length} prospek`}</Text>
          </View>
        ) : null}
      </View>
      {prospek.length === 0 ? (
        <View style={tw`flex-row items-center rounded-xl bg-emerald-50 px-3 py-3 mt-1`}>
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
          <View style={tw`w-9 h-9 rounded-full bg-blue-50 items-center justify-center mr-3`}>
            <Text style={tw`text-sm font-bold text-blue-600`}>{hurufAwal(item.nama)}</Text>
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-sm font-semibold text-gray-900`}>{item.nama}</Text>
            <Text style={tw`text-xs text-gray-500 mt-0.5`}>
              {`${LABEL_STATUS_PROSPEK[item.status]} · terakhir ${formatDate(item.sentuhanTerakhir, 'dd MMM')}`}
            </Text>
          </View>
          <ChevronRight size={18} color={WARNA_ABU} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
